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
  getMyTeam,
} = require('../controllers/emp_c')

const { verifyAdmin, verifyUser, verifySelfOrAdmin } = require('../utils/auth')

router.get('/', verifyAdmin, getAllEmployees)
router.get('/my-team', verifyUser, getMyTeam)
router.get('/:empId', verifySelfOrAdmin, getEmployeeById)
router.post('/', verifyAdmin, createEmployee)
router.post('/login', loginEmployee)
router.put('/:empId', verifyAdmin, updateEmployee)
router.delete('/:empId', verifyAdmin, deleteEmployee)
router.patch('/:empId/workstatus', verifySelfOrAdmin, updateWorkStatus)
router.patch('/:empId/leader', verifyAdmin, toggleAttendanceLeader)
router.patch('/:empId/password', verifySelfOrAdmin, changePassword)
router.patch('/:empId/reset-password', verifyAdmin, resetPassword)


module.exports = router