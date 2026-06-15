const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')

// POST - submit leave request (employee)
const submitLeave = async (req, res) => {
  try {
    const {
      empId, date, fromDate, toDate,
      isHalfDay = false, halfDaySession = null,
      reason, type = 'Leave',
      fromTime = null, toTime = null,
    } = req.body

    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    const primaryDate = fromDate || date
    const endDate     = toDate || fromDate || date

    const requestedDate = new Date(primaryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    requestedDate.setHours(0, 0, 0, 0)
    if (requestedDate < today)
      return res.status(400).json({ error: 'Cannot apply for a past date' })

    const leave = await prisma.leaveRequest.create({
      data: {
        empId,
        date:           new Date(primaryDate),
        fromDate:       new Date(primaryDate),
        toDate:         new Date(endDate),
        isHalfDay:      Boolean(isHalfDay),
        halfDaySession: isHalfDay ? halfDaySession : null,
        reason,
        type,
        fromTime,
        toTime
      }
    })

    let dayLabel
    if (type === 'Permission') {
        dayLabel = `permission from ${fromTime} to ${toTime}`
    } else if (type === 'On Duty') {
      const diffDays = Math.floor((new Date(endDate) - new Date(primaryDate)) / (1000 * 60 * 60 * 24)) + 1
      dayLabel = `${diffDays} day${diffDays !== 1 ? 's' : ''} on duty`
    } else {
      const diffDays = isHalfDay
        ? 0.5
        : Math.floor((new Date(endDate) - new Date(primaryDate)) / (1000 * 60 * 60 * 24)) + 1
      dayLabel = isHalfDay
        ? `0.5 day (${halfDaySession} session)`
        : `${diffDays} day${diffDays !== 1 ? 's' : ''}`  
   }
    try {
      await prisma.notification.create({
        data: {
          message: `${employee.name} requested ${type} for ${dayLabel}`,
          type: 'warning', target: 'admin', isRead: false, createdAt: new Date()
        }
      })
    } catch (err) {
      console.error('Failed to create notification:', err)
    }

    await logActivity({
      empId,
      employeeName: employee.name,
      action: 'Leave Submitted',
      category: 'LEAVE',
      details: `${type} — ${dayLabel} | Reason: ${reason}`
    })

    res.status(201).json({ message: 'Leave request submitted!', leave })
  } catch (error) {
    console.error('Submit leave error:', error)
    res.status(500).json({ error: error.message })
  }
}

// GET - all leave requests (admin)
const getAllLeaves = async (req, res) => {
  try {
    const { type } = req.query
    const leaves = await prisma.leaveRequest.findMany({
      where: type ? { type } : undefined,
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leaves)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' })
  }
}

// GET - leave by employee
const getLeaveByEmployee = async (req, res) => {
  try {
    const { type } = req.query
    const leaves = await prisma.leaveRequest.findMany({
      where: type ? { empId: req.params.empId, type } : { empId: req.params.empId },
      orderBy: { createdAt: 'desc' }
    })
    res.json(leaves)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leave requests' })
  }
}

// PUT - approve or reject (admin)
// Pass adminName in the request body so it gets logged properly
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, adminName = 'Admin' } = req.body

    if (!['Approved', 'Rejected'].includes(status))
      return res.status(400).json({ error: 'Status must be Approved or Rejected' })

    const leave = await prisma.leaveRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status }
    })

    const employee = await prisma.employee.findUnique({ where: { empId: leave.empId } })

    const diffDays = leave.isHalfDay
      ? 0.5
      : Math.floor(
          (new Date(leave.toDate || leave.date) - new Date(leave.fromDate || leave.date))
          / (1000 * 60 * 60 * 24)
        ) + 1

    // Log against the employee being actioned, but mention admin in details
    await logActivity({
      empId:        leave.empId,
      employeeName: employee?.name,
      action:       status === 'Approved' ? 'Leave Approved' : 'Leave Rejected',
      category:     'LEAVE',
      details: `${leave.type} — ${leave.isHalfDay ? '0.5 day' : `${diffDays} day(s)`} | ${leave.reason} | Actioned by: ${adminName}`
    })

    // Also log against admin so it shows in their activity trail
    await logActivity({
      empId:        null,
      employeeName: adminName,
      action:       `${status === 'Approved' ? 'Approved' : 'Rejected'} Leave`,
      category:     'LEAVE',
      details:      `${employee?.name}'s ${leave.type} request (${leave.isHalfDay ? '0.5 day' : `${diffDays} day(s)`})`
    })

    await prisma.notification.create({
      data: {
        message: `Your ${leave.type} request has been ${status}`,
        type: status === 'Approved' ? 'success' : 'error',
        target: leave.empId,
        isRead: false,
        createdAt: new Date()
      }
    })

    res.json({ message: `Leave request ${status}`, leave })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update leave status' })
  }
}
const deleteLeave = async (req, res) => {
  try {
    await prisma.leaveRequest.delete({
      where: { id: parseInt(req.params.id) }
    })
    res.json({ message: 'Leave request deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete leave request' })
  }
}

module.exports = { submitLeave, getAllLeaves, getLeaveByEmployee, updateLeaveStatus, deleteLeave }