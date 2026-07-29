const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')

// Helper function to check if two leave requests conflict
const isConflict = (req1, req2) => {
  const start1 = new Date(req1.fromDate || req1.date).getTime()
  const end1 = new Date(req1.toDate || req1.fromDate || req1.date).getTime()
  const start2 = new Date(req2.fromDate || req2.date).getTime()
  const end2 = new Date(req2.toDate || req2.fromDate || req2.date).getTime()

  const overlapStart = Math.max(start1, start2)
  const overlapEnd = Math.min(end1, end2)

  if (overlapStart > overlapEnd) {
    return false // No date overlap
  }

  // Both are hourly permissions
  if (req1.type === 'Permission' && req2.type === 'Permission') {
    if (req1.fromTime && req1.toTime && req2.fromTime && req2.toTime) {
      const maxStart = req1.fromTime > req2.fromTime ? req1.fromTime : req2.fromTime
      const minEnd = req1.toTime < req2.toTime ? req1.toTime : req2.toTime
      return maxStart < minEnd
    }
    return true
  }

  // One is a Permission and the other is a full/half day leave
  if (req1.type === 'Permission' || req2.type === 'Permission') {
    return true
  }

  // Both are half day leaves
  if (req1.isHalfDay && req2.isHalfDay) {
    return req1.halfDaySession === req2.halfDaySession
  }

  // At least one is a full day/On Duty request
  return true
}

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

    const newReq = {
      date: new Date(primaryDate),
      fromDate: new Date(primaryDate),
      toDate: new Date(endDate),
      isHalfDay: Boolean(isHalfDay),
      halfDaySession: isHalfDay ? halfDaySession : null,
      type,
      fromTime,
      toTime
    }

    // Check for approved leaves overlapping with this date range
    const approvedLeaves = await prisma.leaveRequest.findMany({
      where: {
        empId,
        status: 'Approved',
        fromDate: { lte: newReq.toDate },
        toDate: { gte: newReq.fromDate }
      }
    })

    for (const existing of approvedLeaves) {
      if (isConflict(existing, newReq)) {
        return res.status(400).json({
          error: `This overlaps with your approved ${existing.type} request on this date.`
        })
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        empId,
        date:           newReq.date,
        fromDate:       newReq.fromDate,
        toDate:         newReq.toDate,
        isHalfDay:      newReq.isHalfDay,
        halfDaySession: newReq.halfDaySession,
        fromTime:       (type === 'Permission' || type === 'On Duty') ? fromTime : null,
        toTime:         (type === 'Permission' || type === 'On Duty') ? toTime : null,
        reason,
        type
      }
    })

    let dayLabel
    if (type === 'Permission') {
        dayLabel = `permission from ${fromTime} to ${toTime}`
    } else if (type === 'On Duty') {
      const diffDays = Math.floor((new Date(endDate) - new Date(primaryDate)) / (1000 * 60 * 60 * 24)) + 1
      dayLabel = `${diffDays} day${diffDays !== 1 ? 's' : ''} on duty`
    } else {
      const rawDays = Math.floor((new Date(endDate) - new Date(primaryDate)) / (1000 * 60 * 60 * 24)) + 1
      const diffDays = isHalfDay ? (rawDays * 0.5) : rawDays
      if (isHalfDay) {
        dayLabel = rawDays === 1
          ? `0.5 day (${halfDaySession} session)`
          : `${diffDays} days (${rawDays} half days, ${halfDaySession} session)`
      } else {
        dayLabel = `${diffDays} day${diffDays !== 1 ? 's' : ''}`
      }
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

    const currentLeave = await prisma.leaveRequest.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!currentLeave) return res.status(404).json({ error: 'Leave request not found' })

    const cleanReason = (currentLeave.reason || '').replace(/\n\[Actioned: (.+?) by (.+?)\]/g, '').trim()
    const updatedReason = `${cleanReason}\n[Actioned: ${new Date().toISOString()} by ${adminName}]`

    const leave = await prisma.leaveRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status, reason: updatedReason }
    })

    const employee = await prisma.employee.findUnique({ where: { empId: leave.empId } })

    const rawDays = Math.floor(
      (new Date(leave.toDate || leave.date) - new Date(leave.fromDate || leave.date))
      / (1000 * 60 * 60 * 24)
    ) + 1
    const diffDays = leave.isHalfDay ? (rawDays * 0.5) : rawDays

    // Log against the employee being actioned, but mention admin in details
    await logActivity({
      empId:        leave.empId,
      employeeName: employee?.name,
      action:       status === 'Approved' ? 'Leave Approved' : 'Leave Rejected',
      category:     'LEAVE',
      details: `${leave.type} — ${leave.isHalfDay ? `${diffDays} day(s) (${rawDays} half day(s))` : `${diffDays} day(s)`} | ${leave.reason} | Actioned by: ${adminName}`
    })

    // Also log against admin so it shows in their activity trail
    await logActivity({
      empId:        null,
      employeeName: adminName,
      action:       `${status === 'Approved' ? 'Approved' : 'Rejected'} Leave`,
      category:     'LEAVE',
      details:      `${employee?.name}'s ${leave.type} request (${leave.isHalfDay ? `${diffDays} day(s) (${rawDays} half day(s))` : `${diffDays} day(s)`})`
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