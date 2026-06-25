const express = require('express')
const router = express.Router()
const path = require('path')
const { execSync } = require('child_process')
const fs = require('fs')

const {
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
} = require('../controllers/emp_c')

const { verifyAdmin } = require('../utils/auth')

router.get('/', verifyAdmin, getAllEmployees)
router.get('/:empId', getEmployeeById)
router.post('/', verifyAdmin, createEmployee)
router.post('/login', loginEmployee)
router.put('/:empId', verifyAdmin, updateEmployee)
router.delete('/:empId', verifyAdmin, deleteEmployee)
router.patch('/:empId/workstatus', updateWorkStatus)
router.patch('/:empId/leader', verifyAdmin, toggleAttendanceLeader)
router.patch('/:empId/password', changePassword)
router.patch('/:empId/reset-password', verifyAdmin, resetPassword)


module.exports = router