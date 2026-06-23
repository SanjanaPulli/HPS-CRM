const prisma = require('../prismaClient')
const { validateBarcodeId } = require('../barcodeHelper')
const logActivity = require('../utils/activityLogger')

// Standard shift: 9:30 AM to 5:30 PM IST = 8 hours
const getOfficeSettings = async () => {
  const settings = await prisma.officeSetting.findFirst()
  const lateAfter    = settings?.lateAfter    || '10:00'
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

const getISTDate = () => new Date()

const markAttendance = async (req, res) => {
  try {
    console.log('SCAN RECEIVED - barcodeId:', req.body.barcodeId)
    console.log('SPLIT empId:', req.body.barcodeId?.split('-')[0])
    const { barcodeId } = req.body

    if (!validateBarcodeId(barcodeId)) {
      return res.status(400).json({ error: 'Invalid barcode — not a valid HPS ID' })
    }

    const empId = barcodeId.split('-')[0]
    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    const now = new Date()
    const ist = getISTDate()

    const istOffset   = 5.5 * 60 * 60 * 1000
    const istNow      = new Date(now.getTime() + istOffset)
    const istMidnight = new Date(istNow)
    istMidnight.setUTCHours(0, 0, 0, 0)
    const todayStart  = new Date(istMidnight.getTime() - istOffset)
    const todayEnd    = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

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

    // Find existing record for today
    const existing = await prisma.attendance.findFirst({
      where: { empId, timestamp: { gte: todayStart } }
    })

    // ── CHECK-OUT ────────────────────────────────────────────────────────────
    if (existing) {
      // Already fully checked out
      if (existing.checkOutTime) {
        return res.status(400).json({
          error: 'Already checked in AND out today',
          employee,
          attendance: existing
        })
      }

      // Calculate hours worked
      const checkIn     = new Date(existing.checkInTime || existing.timestamp)
      const checkOut    = getISTDate()
      const diffMs       = checkOut - checkIn
      const hoursWorked  = diffMs / (1000 * 60 * 60)
      const { standardHours } = await getOfficeSettings()
      const overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)

      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          checkOutTime:    checkOut,
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
    const hour         = ist.getHours()
    const min          = ist.getMinutes()
    const totalMinutes = hour * 60 + min
    const { lateHour, lateMin, standardHours } = await getOfficeSettings()
    const isLate = totalMinutes >= lateHour * 60 + lateMin
    const status       = isLate ? 'Late' : 'Present'

    const attendance = await prisma.attendance.create({
      data: {
        empId,
        status,
        checkInTime: getISTDate(),
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

const getTodayAttendance = async (req, res) => {
  try {
    // IST midnight = UTC 18:30 previous day
    const now = new Date()
    const istOffset = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffset)
    const istMidnight = new Date(istNow)
    istMidnight.setUTCHours(0, 0, 0, 0)
    const todayStartUTC = new Date(istMidnight.getTime() - istOffset)
    const todayEndUTC   = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000)

    const records = await prisma.attendance.findMany({
      where:   { timestamp: { gte: todayStartUTC, lt: todayEndUTC } },
      include: { employee: true },
      orderBy: { timestamp: 'desc' }
    })
    res.json(records)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today attendance' })
  }
}

const getAllAttendance = async (req, res) => {
  try {
    const { date } = req.query
    let where = {}
    if (date) {
      const startUTC = new Date(date + 'T00:00:00+05:30')
      const endUTC   = new Date(date + 'T23:59:59+05:30')
      where = { timestamp: { gte: startUTC, lte: endUTC } }
    }
    const records = await prisma.attendance.findMany({
      where,
      include: { employee: true },
      orderBy: { timestamp: 'desc' }
    })
    res.json(records)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
}



const getAttendanceByEmployee = async (req, res) => {
  try {
    const records = await prisma.attendance.findMany({
      where:   { empId: req.params.empId },
      orderBy: { timestamp: 'desc' }
    })
    res.json(records)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' })
  }
}

module.exports = {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee
}