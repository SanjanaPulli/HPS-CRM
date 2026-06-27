const prisma = require('../prismaClient')
const { generateBarcodeId } = require('../barcodeHelper')
const logActivity = require('../utils/activityLogger')
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../utils/auth')

const getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany()
    res.json(employees)
  } catch (error) {
    console.error('Get all employees error:', error)
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
}

const getEmployeeById = async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { empId: req.params.empId },
      include: { shift: true }
    })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employee' })
  }
}

const createEmployee = async (req, res) => {
  try {
    const {
      empId, name, position, department, email,
      contact, joiningDate, salary,
      teamLead, dailyWorkStatus,
      photo, password, shiftId,
      leaveBalanceCL, leaveBalanceSL
    } = req.body

    const barcodeId = generateBarcodeId(empId)
    const employee = await prisma.employee.create({
      data: {
        empId, name, position, department, email,
        contact, joiningDate, salary,
        teamLead, dailyWorkStatus,
        photo, barcodeId,
        password: password || 'hps@1234',
        shiftId: shiftId ? parseInt(shiftId) : null,
        leaveBalanceCL: leaveBalanceCL !== undefined ? parseFloat(leaveBalanceCL) : 12.0,
        leaveBalanceSL: leaveBalanceSL !== undefined ? parseFloat(leaveBalanceSL) : 10.0
      }
    })
    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Employee Created',
      category: 'EMPLOYEE',
      details: `${employee.name} was added to the system`
    })
    res.status(201).json({ employee, barcodeId })
  } catch (error) {
    console.error('Create employee error:', error)
    res.status(500).json({ error: 'Failed to create employee' })
  }
}

const updateEmployee = async (req, res) => {
  try {
    const {
      name, position, department, email,
      contact, joiningDate, salary,
      teamLead, dailyWorkStatus, photo,
      shiftId, leaveBalanceCL, leaveBalanceSL
    } = req.body

    const employee = await prisma.employee.update({
      where: { empId: req.params.empId },
      data: {
        name, position, department, email,
        contact, joiningDate, salary,
        teamLead, dailyWorkStatus, photo,
        shiftId: shiftId !== undefined ? (shiftId ? parseInt(shiftId) : null) : undefined,
        leaveBalanceCL: leaveBalanceCL !== undefined ? parseFloat(leaveBalanceCL) : undefined,
        leaveBalanceSL: leaveBalanceSL !== undefined ? parseFloat(leaveBalanceSL) : undefined
      }
    })
    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Employee Updated',
      category: 'EMPLOYEE',
      details: 'Employee profile updated'
    })
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' })
  }
}

const deleteEmployee = async (req, res) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { empId: req.params.empId }
    })

    await prisma.employee.delete({
      where: { empId: req.params.empId }
    })

    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Employee Deleted',
      category: 'EMPLOYEE',
      details: `${employee.name} was removed`
    })

    res.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete employee' })
  }
}

const loginEmployee = async (req, res) => {
  try {
    const { empId, password } = req.body

    console.time('findEmployee')
    const employee = await prisma.employee.findUnique({
      where: { empId },
      include: { shift: true }
    })
    console.timeEnd('findEmployee')

    if (!employee)
      return res.status(404).json({ error: 'Employee not found' })

    if (employee.position === 'Innovation Manager') {
      return res.status(403).json({ error: 'Manager must login through the admin portal' })
    }

    if (employee.password !== password)
      return res.status(401).json({ error: 'Invalid credentials' })

    console.time('activityLog')
    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Employee Login',
      category: 'AUTH',
      details: 'Logged into CRM'
    })
    console.timeEnd('activityLog')

    const { password: _, ...employeeData } = employee

    const token = jwt.sign(
      { id: employee.id, empId: employee.empId, role: 'employee', name: employee.name },
      JWT_SECRET,
      { expiresIn: '12h' }
    )

    res.json({
      message: 'Login successful',
      employee: employeeData,
      token
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to login' })
  }
}

const updateWorkStatus = async (req, res) => {
  try {
    const { dailyWorkStatus } = req.body
    if (!dailyWorkStatus || dailyWorkStatus.trim() === '') {
      return res.status(400).json({ error: 'Work status cannot be empty' })
    }
    const employee = await prisma.employee.update({
      where: { empId: req.params.empId },
      data: { dailyWorkStatus: dailyWorkStatus.trim() }
    })
    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Work Status Updated',
      category: 'WORK',
      details: dailyWorkStatus
    })
    res.json({ message: 'Work status updated successfully', dailyWorkStatus: employee.dailyWorkStatus })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update work status' })
  }
}


// ✅ NEW — toggle attendance leader
const toggleAttendanceLeader = async (req, res) => {
  try {
    const { isAttendanceLeader } = req.body
    const employee = await prisma.employee.update({
      where: { empId: req.params.empId },
      data: { isAttendanceLeader: Boolean(isAttendanceLeader) }
    })
    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: isAttendanceLeader
        ? 'Attendance Leader Assigned'
        : 'Attendance Leader Removed',
      category: 'EMPLOYEE',
      details: null
    })
    res.json({
      message: `${employee.name} is ${isAttendanceLeader ? 'now' : 'no longer'} an attendance leader`,
      employee
    })
  } catch (error) {
    console.error('Toggle leader error:', error)
    res.status(500).json({ error: 'Failed to update leader status' })
  }
}

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const { empId } = req.params

    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    if (employee.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    if (!newPassword || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    await prisma.employee.update({
      where: { empId },
      data: { password: newPassword.trim() }
    })

    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Password Changed',
      category: 'AUTH',
      details: null
    })

    res.json({ message: `Password changed successfully for ${employee.name}` })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Failed to change password' })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body
    const { empId } = req.params

    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    await prisma.employee.update({
      where: { empId },
      data: { password: newPassword || 'hps@1234' }
    })

    await logActivity({
      empId: employee.empId,
      employeeName: employee.name,
      action: 'Password Reset',
      category: 'AUTH',
      details: 'Reset by Admin'
    })
    await prisma.notification.create({
      data: {
        message: 'Your password has been reset by Admin',
        type: 'warning',
        target: employee.empId,
        isRead: false,
        createdAt: new Date()
      }
    })

    res.json({ message: `Password reset successfully for ${employee.name}` })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to reset password' })
  }
}

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
  updateWorkStatus,
  toggleAttendanceLeader,
  changePassword,
  resetPassword,
}