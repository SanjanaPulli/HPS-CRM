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
        const clientIp = req.headers['cf-connecting-ip'] ||
                         req.headers['x-real-ip'] ||
                         req.headers['x-forwarded-for'] ||
                         req.socket.remoteAddress ||
                         ''
        const allowed = officeSettings.allowedIps.split(',').map(ip => ip.trim())
        if (allowed.some(ip => clientIp.includes(ip))) {
          isAllowed = true
        }
      }

      // Check if employee has approved WFH or On Duty request for today to bypass geofencing
      if (!isAllowed) {
        const nowCheck = new Date()
        const checkStart = getISTDayStart(nowCheck)
        const checkEnd   = new Date(checkStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        const bypassRequest = await prisma.leaveRequest.findFirst({
          where: {
            empId,
            status: 'Approved',
            type: { in: ['WFH', 'On Duty'] },
            OR: [
              {
                fromDate: { lte: checkEnd },
                toDate: { gte: checkStart }
              },
              {
                date: {
                  gte: checkStart,
                  lte: checkEnd
                }
              }
            ]
          }
        })
        if (bypassRequest) {
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
        type: 'Leave',
        isHalfDay: false,
        OR: [
          {
            fromDate: { lte: todayEnd },
            toDate: { gte: todayStart }
          },
          {
            date: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        ]
      }
    })
    if (onLeave) {
      return res.status(400).json({ error: 'Employee is on approved leave today' })
    }

    // Find existing record for today — check both checkInTime and timestamp
    const existing = await prisma.attendance.findFirst({
      where: {
        empId,
        OR: [
          { checkInTime: { gte: todayStart, lt: todayEnd } },
          { timestamp: { gte: todayStart, lt: todayEnd } }
        ]
      }
    })

    // ── CHECK-OUT ────────────────────────────────────────────────────────────
    if (existing && existing.checkInTime) {
      if (existing.checkOutTime && !isAutoCheckoutTime(existing.checkOutTime)) {
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

    let attendance;
    if (existing) {
      attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          checkInTime: now
        }
      })
    } else {
      attendance = await prisma.attendance.create({
        data: {
          empId,
          status,
          checkInTime: now,
          timestamp: todayStart
        }
      })
    }

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

const isAutoCheckoutTime = (dateVal) => {
  if (!dateVal) return false
  const d = new Date(dateVal)
  const istMs = d.getTime() + (5.5 * 60 * 60 * 1000)
  const istDate = new Date(istMs)
  return istDate.getUTCHours() === 18 &&
         istDate.getUTCMinutes() === 0 &&
         istDate.getUTCSeconds() === 0 &&
         istDate.getUTCMilliseconds() === 0
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

  const [allEmployees, leaves, records, settings] = await Promise.all([
    prisma.employee.findMany(),
    prisma.leaveRequest.findMany({
      where: { status: 'Approved' }
    }),
    prisma.attendance.findMany({
      where: {
        OR: [
          { checkInTime: { gte: start, lt: end } },
          { timestamp: { gte: start, lt: end } }
        ]
      },
      include: { employee: true }
    }),
    prisma.officeSetting.findFirst()
  ])

  const employees = allEmployees.filter(emp => {
    if (emp.position && emp.position.toLowerCase().includes('intern')) {
      if (emp.endDate) {
        const empEndStr = toISTDateString(new Date(emp.endDate))
        if (date > empEndStr) {
          return false
        }
      }
    }
    return true
  })

  const leavesOnDate = leaves.filter(l => isLeaveCoveringDate(l, date))

  const lateAfter    = settings?.lateAfter    || '10:15'
  const checkOutTime = settings?.checkOutTime || '17:30'
  const checkInTime  = settings?.checkInTime  || '09:30'

  const [lh, lm] = lateAfter.split(':').map(Number)
  const [oh, om] = checkOutTime.split(':').map(Number)
  const [ih, im] = checkInTime.split(':').map(Number)

  const shiftStartMins = ih * 60 + im
  const shiftEndMins   = oh * 60 + om
  const standardHours  = (shiftEndMins - shiftStartMins) / 60

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

    let checkOutTime = record ? record.checkOutTime : null
    let hoursWorked = record ? record.hoursWorked : null
    let overtimeMinutes = record ? record.overtimeMinutes : null

    if (record && record.checkInTime && !checkOutTime) {
      const limit = new Date(date + 'T18:00:00+05:30')
      const now = new Date()
      if (now >= limit) {
        checkOutTime = limit
        const checkIn = new Date(record.checkInTime)
        const diffMs = limit.getTime() - checkIn.getTime()
        const calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60))
        hoursWorked = Math.round(calculatedHours * 100) / 100
        overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)
      }
    }

    return {
      id: record ? record.id : `temp-${emp.empId}`,
      empId: emp.empId,
      status: status,
      timestamp: record ? record.timestamp : null,
      checkInTime: record ? record.checkInTime : null,
      checkOutTime: checkOutTime,
      hoursWorked: hoursWorked,
      overtimeMinutes: overtimeMinutes,
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

    const [allRecords, leaves, settings] = await Promise.all([
      prisma.attendance.findMany({
        include: { employee: true },
        orderBy: [
          { timestamp: 'desc' },
          { checkInTime: 'desc' }
        ]
      }),
      prisma.leaveRequest.findMany({
        where: { status: 'Approved' }
      }),
      prisma.officeSetting.findFirst()
    ])

    const lateAfter    = settings?.lateAfter    || '10:15'
    const checkOutTime = settings?.checkOutTime || '17:30'
    const checkInTime  = settings?.checkInTime  || '09:30'

    const [lh, lm] = lateAfter.split(':').map(Number)
    const [oh, om] = checkOutTime.split(':').map(Number)
    const [ih, im] = checkInTime.split(':').map(Number)

    const shiftStartMins = ih * 60 + im
    const shiftEndMins   = oh * 60 + om
    const standardHours  = (shiftEndMins - shiftStartMins) / 60

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

      let checkOutTime = record.checkOutTime
      let hoursWorked = record.hoursWorked
      let overtimeMinutes = record.overtimeMinutes

      if (record.checkInTime && !checkOutTime) {
        const limit = new Date(recordDateStr + 'T18:00:00+05:30')
        const now = new Date()
        if (now >= limit) {
          checkOutTime = limit
          const checkIn = new Date(record.checkInTime)
          const diffMs = limit.getTime() - checkIn.getTime()
          const calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60))
          hoursWorked = Math.round(calculatedHours * 100) / 100
          overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)
        }
      }

      return {
        ...record,
        status,
        checkOutTime,
        hoursWorked,
        overtimeMinutes
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
    const [records, leaves, settings] = await Promise.all([
      prisma.attendance.findMany({
        where:   { empId: req.params.empId },
        orderBy: [
          { timestamp: 'desc' },
          { checkInTime: 'desc' }
        ]
      }),
      prisma.leaveRequest.findMany({
        where: { empId: req.params.empId, status: 'Approved' }
      }),
      prisma.officeSetting.findFirst()
    ])

    const lateAfter    = settings?.lateAfter    || '10:15'
    const checkOutTime = settings?.checkOutTime || '17:30'
    const checkInTime  = settings?.checkInTime  || '09:30'

    const [lh, lm] = lateAfter.split(':').map(Number)
    const [oh, om] = checkOutTime.split(':').map(Number)
    const [ih, im] = checkInTime.split(':').map(Number)

    const shiftStartMins = ih * 60 + im
    const shiftEndMins   = oh * 60 + om
    const standardHours  = (shiftEndMins - shiftStartMins) / 60

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

      let checkOutTime = record.checkOutTime
      let hoursWorked = record.hoursWorked
      let overtimeMinutes = record.overtimeMinutes

      if (record.checkInTime && !checkOutTime) {
        const limit = new Date(recordDateStr + 'T18:00:00+05:30')
        const now = new Date()
        if (now >= limit) {
          checkOutTime = limit
          const checkIn = new Date(record.checkInTime)
          const diffMs = limit.getTime() - checkIn.getTime()
          const calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60))
          hoursWorked = Math.round(calculatedHours * 100) / 100
          overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)
        }
      }

      return {
        ...record,
        status,
        checkOutTime,
        hoursWorked,
        overtimeMinutes
      }
    })

    res.json(resolved)
  } catch (error) {
    console.error('getAttendanceByEmployee error:', error)
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
}


const parseTimeStr = (timeStr) => {
  if (!timeStr) return null
  const clean = timeStr.trim().toLowerCase()
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/)
  if (!match) return null

  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const ampm = match[3]

  if (ampm === 'pm' && hours < 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0

  return { hours, minutes }
}

const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params
    const { status, checkInTimeStr, checkOutTimeStr, hoursWorked, overtimeMinutes, date } = req.body

    let existing = null
    let empId = null
    let baseDate = null

    if (id.startsWith('temp-')) {
      empId = id.replace('temp-', '')
      const dateStr = date || new Date().toISOString().split('T')[0]
      baseDate = new Date(dateStr + 'T00:00:00+05:30')
    } else {
      existing = await prisma.attendance.findUnique({
        where: { id: parseInt(id) },
        include: { employee: true }
      })
      if (!existing) return res.status(404).json({ error: 'Attendance record not found' })
      empId = existing.empId
      baseDate = existing.checkInTime || existing.timestamp || new Date()
    }

    const recordISTStr = toISTDateString(new Date(baseDate))
    const todayISTStr = toISTDateString(new Date())
    if (recordISTStr > todayISTStr) {
      return res.status(400).json({ error: 'Cannot edit attendance for future dates' })
    }

    const updateData = { status }

    const offset = 5.5 * 60 * 60 * 1000
    const localIST = new Date(new Date(baseDate).getTime() + offset)

    if (checkInTimeStr !== undefined) {
      if (checkInTimeStr === '' || checkInTimeStr === null) {
        updateData.checkInTime = null
      } else {
        const parsed = parseTimeStr(checkInTimeStr)
        if (!parsed) {
          return res.status(400).json({ error: 'Invalid check-in time format. Use HH:MM or HH:MM AM/PM' })
        }
        const newIST = new Date(Date.UTC(
          localIST.getUTCFullYear(),
          localIST.getUTCMonth(),
          localIST.getUTCDate(),
          parsed.hours,
          parsed.minutes,
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
        const parsed = parseTimeStr(checkOutTimeStr)
        if (!parsed) {
          return res.status(400).json({ error: 'Invalid check-out time format. Use HH:MM or HH:MM AM/PM' })
        }
        const newIST = new Date(Date.UTC(
          localIST.getUTCFullYear(),
          localIST.getUTCMonth(),
          localIST.getUTCDate(),
          parsed.hours,
          parsed.minutes,
          0,
          0
        ))
        updateData.checkOutTime = new Date(newIST.getTime() - offset)
      }
    }

    if (updateData.checkInTime !== undefined && updateData.checkInTime !== null) {
      const currentStatus = updateData.status || (existing ? existing.status : 'Absent')
      if (currentStatus === 'Absent') {
        updateData.status = 'Present'
      }
    }

    const finalCheckIn = updateData.checkInTime !== undefined ? updateData.checkInTime : (existing ? existing.checkInTime : null)
    const finalCheckOut = updateData.checkOutTime !== undefined ? updateData.checkOutTime : (existing ? existing.checkOutTime : null)

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

    let updated;
    let employeeName = 'Employee';

    if (existing) {
      employeeName = existing.employee.name
      updated = await prisma.attendance.update({
        where: { id: parseInt(id) },
        data: updateData
      })
    } else {
      const employee = await prisma.employee.findUnique({ where: { empId } })
      if (employee) employeeName = employee.name
      updated = await prisma.attendance.create({
        data: {
          empId,
          status: updateData.status,
          checkInTime: updateData.checkInTime,
          checkOutTime: updateData.checkOutTime,
          hoursWorked: updateData.hoursWorked,
          overtimeMinutes: updateData.overtimeMinutes,
          timestamp: baseDate
        }
      })
    }

    await logActivity({
      empId: null,
      employeeName: 'Admin/Manager',
      action: 'Attendance Edited',
      category: 'ATTENDANCE',
      details: `Edited record ID ${updated.id} of ${employeeName}. Status: ${status}`
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

    const baseDate = existing.checkInTime || existing.timestamp || new Date()
    const recordISTStr = toISTDateString(new Date(baseDate))
    const todayISTStr = toISTDateString(new Date())
    if (recordISTStr > todayISTStr) {
      return res.status(400).json({ error: 'Cannot delete attendance for future dates' })
    }

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

const checkScannerAccess = async (user) => {
  if (user.role === 'admin' || user.role === 'manager') return true
  if (user.empId) {
    const employee = await prisma.employee.findUnique({ where: { empId: user.empId } })
    return employee?.isAttendanceLeader === true
  }
  return false
}

const getEligibleEmployeesToday = async (req, res) => {
  try {
    if (!await checkScannerAccess(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Scanner access required' })
    }

    const now = new Date()
    const todayStart = getISTDayStart(now)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    // Fetch in parallel
    const [allEmployees, leavesToday, attendanceToday] = await Promise.all([
      prisma.employee.findMany({
        select: {
          empId: true,
          name: true,
          position: true,
          department: true,
          endDate: true
        }
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'Approved',
          OR: [
            {
              fromDate: { lt: todayEnd },
              toDate: { gte: todayStart }
            },
            {
              date: { gte: todayStart, lt: todayEnd }
            }
          ]
        }
      }),
      prisma.attendance.findMany({
        where: {
          checkInTime: { gte: todayStart, lt: todayEnd }
        }
      })
    ])

    const todayStr = toISTDateString(now)

    // Filter out completed interns
    const employees = allEmployees.filter(emp => {
      if (emp.position && emp.position.toLowerCase().includes('intern')) {
        if (emp.endDate) {
          const empEndStr = toISTDateString(new Date(emp.endDate))
          if (todayStr > empEndStr) {
            return false // internship completed before today
          }
        }
      }
      return true
    })

    const leaveEmpIds = new Set(leavesToday.map(l => l.empId))
    const checkedInEmpIds = new Set(attendanceToday.map(a => a.empId))

    // Filter employees:
    // - Not on approved leave
    // - Not checked in already
    const eligible = employees.filter(e => !leaveEmpIds.has(e.empId) && !checkedInEmpIds.has(e.empId))

    res.json(eligible)
  } catch (error) {
    console.error('getEligibleEmployeesToday error:', error)
    res.status(500).json({ error: 'Failed to fetch eligible employees' })
  }
}

const markAllPresentToday = async (req, res) => {
  try {
    if (!await checkScannerAccess(req.user)) {
      return res.status(403).json({ error: 'Forbidden: Scanner access required' })
    }

    const { empIds } = req.body
    if (!Array.isArray(empIds) || empIds.length === 0) {
      return res.status(400).json({ error: 'empIds array is required' })
    }

    const now = new Date()
    const todayStart = getISTDayStart(now)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    let count = 0
    for (const empId of empIds) {
      const existing = await prisma.attendance.findFirst({
        where: {
          empId,
          checkInTime: { gte: todayStart, lt: todayEnd }
        }
      })

      if (!existing) {
        const absentRecord = await prisma.attendance.findFirst({
          where: {
            empId,
            timestamp: { gte: todayStart, lt: todayEnd }
          }
        })

        if (absentRecord) {
          await prisma.attendance.update({
            where: { id: absentRecord.id },
            data: {
              status: 'Present',
              checkInTime: now,
              checkOutTime: null,
              hoursWorked: null,
              overtimeMinutes: null
            }
          })
        } else {
          await prisma.attendance.create({
            data: {
              empId,
              status: 'Present',
              checkInTime: now,
              timestamp: todayStart
            }
          })
        }

        const employee = await prisma.employee.findUnique({ where: { empId } })
        await logActivity({
          empId,
          employeeName: employee?.name || 'Employee',
          action: 'Mark Present (Bulk)',
          category: 'ATTENDANCE',
          details: 'Marked present via scanner terminal bulk option'
        })

        count++
      }
    }

    res.json({ message: `Successfully marked ${count} employees as present`, count })
  } catch (error) {
    console.error('markAllPresentToday error:', error)
    res.status(500).json({ error: 'Failed to mark employees present' })
  }
}

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee,
  updateAttendance,
  deleteAttendance,
  getEligibleEmployeesToday,
  markAllPresentToday
}