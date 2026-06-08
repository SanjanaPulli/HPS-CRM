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
  updateProject,
  toggleAttendanceLeader,
  changePassword,
  resetPassword,
} = require('../controllers/emp_c')

router.get('/', getAllEmployees)
router.get('/:empId', getEmployeeById)
router.post('/', createEmployee)
router.post('/login', loginEmployee)
router.put('/:empId', updateEmployee)
router.delete('/:empId', deleteEmployee)
router.patch('/:empId/workstatus', updateWorkStatus)
router.patch('/:empId/project', updateProject)
router.patch('/:empId/leader', toggleAttendanceLeader)
router.patch('/:empId/password', changePassword)
router.patch('/:empId/reset-password', resetPassword)


module.exports = router