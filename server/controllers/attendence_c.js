const prisma = require('../prismaClient')
const { validateBarcodeId } = require('../barcodeHelper')
const logActivity = require('../utils/activityLogger')

// Calculate distance in meters using Haversine formula
const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3 // metres
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

// Standard shift: 9:30 AM to 5:30 PM IST = 8 hours
const getOfficeSettings = async () => {
  const settings = await prisma.officeSetting.findFirst()
  const lateAfter    = settings?.lateAfter    || '10:15'
  const checkOutTime = settings?.checkOutTime || '17:30'
  const checkInTime  = settings?.checkInTime  || '09:30'

  const [lh, lm] = lateAfter.split(':').map(Number)
  const [oh, om] = checkOutTime.split(':').map(Number)
  const [ih, im] = checkInTime.split(':').map(Number)

  const shiftStartMins = ih * 60 + im
  const shiftEndMins   = oh * 60 + om
  const standardHours  = (shiftEndMins - shiftStartMins) / 60

  return { lateHour: lh, lateMin: lm, standardHours }
}

// Returns IST midnight (00:00 IST) as a UTC Date for a given UTC Date
// IST = UTC+5:30, so IST midnight = UTC 18:30 previous day
const getISTDayStart = (utcDate) => {
  // Convert to IST by adding 5.5 hours
  const istMs = utcDate.getTime() + (5.5 * 60 * 60 * 1000)
  const istDate = new Date(istMs)
  // Get IST midnight by zeroing out hours/min/sec in IST
  const istMidnight = new Date(Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate(),
    0, 0, 0, 0
  ))
  // Convert IST midnight back to UTC (subtract 5.5 hours)
  return new Date(istMidnight.getTime() - (5.5 * 60 * 60 * 1000))
}

const markAttendance = async (req, res) => {
  try {
    console.log('SCAN RECEIVED - barcodeId:', req.body.barcodeId)
    console.log('SPLIT empId:', req.body.barcodeId?.split('-')[0])
    const { barcodeId, latitude, longitude } = req.body

    if (!validateBarcodeId(barcodeId)) {
      return res.status(400).json({ error: 'Invalid barcode — not a valid HPS ID' })
    }

    const empId = barcodeId.split('-')[0]
    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    // Geofencing verification
    const officeSettings = await prisma.officeSetting.findFirst()
    if (officeSettings && officeSettings.latitude && officeSettings.longitude) {
      const radius = officeSettings.radiusMeter || 100
      let isAllowed = false

      // Check office IP Wi-Fi network if allowedIps is set
      if (officeSettings.allowedIps) {
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || ''
        const allowed = officeSettings.allowedIps.split(',').map(ip => ip.trim())
        if (allowed.some(ip => clientIp.includes(ip))) {
          isAllowed = true
        }
      }

      if (!isAllowed) {
        if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
          return res.status(400).json({ error: 'Geofencing verification failed: Location access is required to scan.' })
        }
        const distance = getDistanceMeters(latitude, longitude, officeSettings.latitude, officeSettings.longitude)
        if (distance > radius) {
          return res.status(400).json({
            error: `Geofencing verification failed: You are ${Math.round(distance)} meters away. Must be within ${radius} meters of the office.`
          })
        }
      }
    }

    const now = new Date() // pure UTC, always

    // Today's start = IST midnight expressed as UTC
    const todayStart = getISTDayStart(now)
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Check approved leave
    const onLeave = await prisma.leaveRequest.findFirst({
      where: {
        empId,
        status: 'Approved',
        date: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    })
    if (onLeave) {
      return res.status(400).json({ error: 'Employee is on approved leave today' })
    }

    // Find existing record for today — use checkInTime range
    const existing = await prisma.attendance.findFirst({
      where: {
        empId,
        checkInTime: { gte: todayStart, lt: todayEnd }
      }
    })

    // ── CHECK-OUT ────────────────────────────────────────────────────────────
    if (existing) {
      if (existing.checkOutTime) {
        return res.status(400).json({
          error: 'Already checked in AND out today',
          employee,
          attendance: existing
        })
      }

      const checkIn     = new Date(existing.checkInTime)
      const checkOut    = now
      const diffMs      = checkOut - checkIn
      const hoursWorked = diffMs / (1000 * 60 * 60)

      if (hoursWorked < 3) {
        return res.status(400).json({
          error: `Minimum check-out gap is 3 hours. Checked in at ${checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}. Please try again later.`,
          employee,
          attendance: existing
        })
      }

      const { standardHours } = await getOfficeSettings()
      const overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)

      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime:    now,
          hoursWorked:     Math.round(hoursWorked * 100) / 100,
          overtimeMinutes: overtimeMinutes,
        }
      })

      await logActivity({
        empId:        employee.empId,
        employeeName: employee.name,
        action:       'Check-Out',
        category:     'ATTENDANCE',
        details:      `Worked ${hoursWorked.toFixed(2)}h | OT: ${overtimeMinutes}min`
      })

      return res.status(200).json({
        message:         'Checked out successfully',
        type:            'checkout',
        employee,
        attendance:      updated,
        hoursWorked:     Math.round(hoursWorked * 100) / 100,
        overtimeMinutes: overtimeMinutes
      })
    }

    // ── CHECK-IN ─────────────────────────────────────────────────────────────
    // Determine late/present using IST time
    const nowIST       = new Date(now.getTime() + 5.5 * 60 * 60 * 1000)
    const hour         = nowIST.getUTCHours()
    const min          = nowIST.getUTCMinutes()
    const totalMinutes = hour * 60 + min
    const { lateHour, lateMin } = await getOfficeSettings()
    const isLate = totalMinutes >= lateHour * 60 + lateMin
    const status = isLate ? 'Late' : 'Present'

    const attendance = await prisma.attendance.create({
      data: {
        empId,
        status,
        checkInTime: now, // pure UTC
      }
    })

    await logActivity({
      empId:        employee.empId,
      employeeName: employee.name,
      action:       'Check-In',
      category:     'ATTENDANCE',
      details:      status
    })

    return res.status(201).json({
      message:    isLate ? 'Checked in — Late!' : 'Checked in successfully',
      type:       'checkin',
      employee,
      attendance
    })

  } catch (error) {
    console.error('markAttendance error:', error)
    res.status(500).json({ error: 'Failed to mark attendance' })
  }
}

const toISTDateString = (utcDate) => {
  const istDate = new Date(utcDate.getTime() + 5.5 * 60 * 60 * 1000)
  return `${istDate.getUTCFullYear()}-${String(istDate.getUTCMonth() + 1).padStart(2, '0')}-${String(istDate.getUTCDate()).padStart(2, '0')}`
}

const isLeaveCoveringDate = (leave, targetDateStr) => {
  const fromStr = toISTDateString(new Date(leave.fromDate || leave.date))
  const toStr = toISTDateString(new Date(leave.toDate || leave.fromDate || leave.date))
  return targetDateStr >= fromStr && targetDateStr <= toStr
}

const resolveAttendanceForDate = async (date) => {
  const start = new Date(date + 'T00:00:00+05:30')
  const end   = new Date(date + 'T23:59:59.999+05:30')

  const employees = await prisma.employee.findMany()
  const leaves = await prisma.leaveRequest.findMany({
    where: { status: 'Approved' }
  })
  const leavesOnDate = leaves.filter(l => isLeaveCoveringDate(l, date))

  const records = await prisma.attendance.findMany({
    where: { checkInTime: { gte: start, lt: end } },
    include: { employee: true }
  })

  return employees.map(emp => {
    const record = records.find(r => r.empId === emp.empId)
    const leave = leavesOnDate.find(l => l.empId === emp.empId)

    let status = 'Absent'
    if (leave) {
      if (leave.isHalfDay) {
        status = 'Half Day'
      } else {
        status = leave.type || 'Leave'
        if (status === 'On Leave') status = 'Leave'
      }
    } else if (record) {
      status = record.status
    }

    return {
      id: record ? record.id : `temp-${emp.empId}`,
      empId: emp.empId,
      status: status,
      timestamp: record ? record.timestamp : null,
      checkInTime: record ? record.checkInTime : null,
      checkOutTime: record ? record.checkOutTime : null,
      hoursWorked: record ? record.hoursWorked : null,
      overtimeMinutes: record ? record.overtimeMinutes : null,
      employee: emp
    }
  })
}

const getTodayAttendance = async (req, res) => {
  try {
    const now = new Date()
    const todayStr = toISTDateString(now)
    const resolved = await resolveAttendanceForDate(todayStr)
    res.json(resolved)
  } catch (error) {
    console.error('getTodayAttendance error:', error)
    res.status(500).json({ error: 'Failed to fetch today attendance' })
  }
}

const getAllAttendance = async (req, res) => {
  try {
    const { date } = req.query
    if (date) {
      const resolved = await resolveAttendanceForDate(date)
      return res.json(resolved)
    }

    const allRecords = await prisma.attendance.findMany({
      include: { employee: true },
      orderBy: { checkInTime: 'desc' }
    })

    const leaves = await prisma.leaveRequest.findMany({
      where: { status: 'Approved' }
    })

    const resolvedRecords = allRecords.map(record => {
      const recordDate = record.checkInTime || record.timestamp
      if (!recordDate) return record

      const recordDateStr = toISTDateString(recordDate)
      const leave = leaves.find(l => l.empId === record.empId && isLeaveCoveringDate(l, recordDateStr))

      let status = record.status
      if (leave) {
        if (leave.isHalfDay) {
          status = 'Half Day'
        } else {
          status = leave.type || 'Leave'
          if (status === 'On Leave') status = 'Leave'
        }
      }

      return {
        ...record,
        status
      }
    })

    res.json(resolvedRecords)
  } catch (error) {
    console.error('getAllAttendance error:', error)
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
}

const getAttendanceByEmployee = async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      where:   { empId: req.params.empId },
      orderBy: { checkInTime: 'desc' }
    })

    const leaves = await prisma.leaveRequest.findMany({
      where: { empId: req.params.empId, status: 'Approved' }
    })

    const resolved = records.map(record => {
      const recordDate = record.checkInTime || record.timestamp
      if (!recordDate) return record

      const recordDateStr = toISTDateString(recordDate)
      const leave = leaves.find(l => isLeaveCoveringDate(l, recordDateStr))

      let status = record.status
      if (leave) {
        if (leave.isHalfDay) {
          status = 'Half Day'
        } else {
          status = leave.type || 'Leave'
          if (status === 'On Leave') status = 'Leave'
        }
      }

      return {
        ...record,
        status
      }
    })

    res.json(resolved)
  } catch (error) {
    console.error('getAttendanceByEmployee error:', error)
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
}


const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params
    const { status, checkInTimeStr, checkOutTimeStr, hoursWorked, overtimeMinutes } = req.body

    const existing = await prisma.attendance.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true }
    })
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

    const updateData = { status }

    const baseDate = existing.checkInTime || existing.timestamp
    const offset = 5.5 * 60 * 60 * 1000
    const localIST = new Date(baseDate.getTime() + offset)

    if (checkInTimeStr !== undefined) {
      if (checkInTimeStr === '' || checkInTimeStr === null) {
        updateData.checkInTime = null
      } else {
        const [hours, minutes] = checkInTimeStr.split(':').map(Number)
        const newIST = new Date(Date.UTC(
          localIST.getUTCFullYear(),
          localIST.getUTCMonth(),
          localIST.getUTCDate(),
          hours,
          minutes,
          0,
          0
        ))
        updateData.checkInTime = new Date(newIST.getTime() - offset)
      }
    }

    if (checkOutTimeStr !== undefined) {
      if (checkOutTimeStr === '' || checkOutTimeStr === null) {
        updateData.checkOutTime = null
      } else {
        const [hours, minutes] = checkOutTimeStr.split(':').map(Number)
        const newIST = new Date(Date.UTC(
          localIST.getUTCFullYear(),
          localIST.getUTCMonth(),
          localIST.getUTCDate(),
          hours,
          minutes,
          0,
          0
        ))
        updateData.checkOutTime = new Date(newIST.getTime() - offset)
      }
    }

    const finalCheckIn = updateData.checkInTime !== undefined ? updateData.checkInTime : existing.checkInTime
    const finalCheckOut = updateData.checkOutTime !== undefined ? updateData.checkOutTime : existing.checkOutTime

    if (finalCheckIn && finalCheckOut) {
      const diffMs = finalCheckOut.getTime() - finalCheckIn.getTime()
      const calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60))

      updateData.hoursWorked = hoursWorked !== undefined && hoursWorked !== null
        ? parseFloat(hoursWorked)
        : Math.round(calculatedHours * 100) / 100

      const { standardHours } = await getOfficeSettings()
      const calculatedOT = Math.round((updateData.hoursWorked - standardHours) * 60)

      updateData.overtimeMinutes = overtimeMinutes !== undefined && overtimeMinutes !== null
        ? parseInt(overtimeMinutes)
        : calculatedOT
    } else {
      if (hoursWorked !== undefined) updateData.hoursWorked = hoursWorked === null ? null : parseFloat(hoursWorked)
      if (overtimeMinutes !== undefined) updateData.overtimeMinutes = overtimeMinutes === null ? null : parseInt(overtimeMinutes)
    }

    const updated = await prisma.attendance.update({
      where: { id: parseInt(id) },
      data: updateData
    })

    await logActivity({
      empId: null,
      employeeName: 'Admin/Manager',
      action: 'Attendance Edited',
      category: 'ATTENDANCE',
      details: `Edited record ID ${id} of ${existing.employee.name}. Status: ${status}`
    })

    res.json(updated)
  } catch (error) {
    console.error('Update attendance error:', error)
    res.status(500).json({ error: 'Failed to update attendance record' })
  }
}

const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params
    const existing = await prisma.attendance.findUnique({
      where: { id: parseInt(id) },
      include: { employee: true }
    })
    if (!existing) return res.status(404).json({ error: 'Attendance record not found' })

    await prisma.attendance.delete({
      where: { id: parseInt(id) }
    })

    await logActivity({
      empId: null,
      employeeName: 'Admin/Manager',
      action: 'Attendance Deleted',
      category: 'ATTENDANCE',
      details: `Deleted record ID ${id} of ${existing.employee.name}`
    })

    res.json({ message: 'Attendance record deleted' })
  } catch (error) {
    console.error('Delete attendance error:', error)
    res.status(500).json({ error: 'Failed to delete attendance record' })
  }
}

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee,
  updateAttendance,
  deleteAttendance
}