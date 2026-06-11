const prisma = require('../prismaClient')
const { validateBarcodeId } = require('../barcodeHelper')
const logActivity = require('../utils/activityLogger')

const createAnnouncement = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body)

    const { title, body, type, targetEmpIds, priority, expiresAt } = req.body
    res.status(200).json({
      message: 'createAnnouncement logged',
      data: { title, body, type, targetEmpIds, priority, expiresAt }
    })
  } catch (error) {
    console.error('createAnnouncement error:', error)
    res.status(500).json({ error: 'Failed to create announcement' })
  }
}

const markAttendance = async (req, res) => {
  try {
    const { barcodeId } = req.body
    if (!validateBarcodeId(barcodeId)) {
      return res.status(400).json({ error: 'Invalid barcode — not a valid HPS ID' })
    }
    const empId = barcodeId.split('-')[0]
    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.attendance.findFirst({
      where: { empId, timestamp: { gte: today } }
    })
    if (existing) return res.status(400).json({ error: 'Attendance already marked today', employee })

    const onLeave = await prisma.leaveRequest.findFirst({
      where: { empId, status: 'Approved', date: { gte: today } }
    })
    if (onLeave) return res.status(400).json({ error: 'Employee is on approved leave today' })

    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const totalMinutes = hour * 60 + minute

    const PRESENT_FROM = 9 * 60 + 30   // 9:30 AM
    const LATE_AFTER   = 10 * 60        // 10:00 AM

    const isLate = totalMinutes >= LATE_AFTER
    const status = isLate ? 'Late' : 'Present'

    const attendance = await prisma.attendance.create({ data: { empId, status } })

    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Attendance Marked',
      category: 'ATTENDANCE',
      details: status
    })

    res.status(201).json({
      message: isLate ? 'Attendance marked — Late!' : 'Attendance marked!',
      employee,
      attendance
    })
  } catch (error) {
    console.error('markAttendance error:', error)
    res.status(500).json({ error: 'Failed to mark attendance' })
  }
}

// ✅ NEW — today only
const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const records = await prisma.attendance.findMany({
      where: { timestamp: { gte: today } },
      include: { employee: true },
      orderBy: { timestamp: 'desc' }
    })
    res.json(records)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today attendance' })
  }
}

// GET all with optional date filter ?date=2026-05-29
const getAllAttendance = async (req, res) => {
  try {
    const { date } = req.query
    let where = {}
    if (date) {
      const start = new Date(date)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date)
      end.setHours(23, 59, 59, 999)
      where = { timestamp: { gte: start, lte: end } }
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
      where: { empId: req.params.empId },
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