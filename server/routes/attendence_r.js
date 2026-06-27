const express = require('express')
const router = express.Router()
const {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee,
  updateAttendance,
  deleteAttendance
} = require('../controllers/attendence_c')
const { verifyAdmin, verifySelfOrAdmin } = require('../utils/auth')

router.post('/scan', markAttendance)
router.get('/today', verifyAdmin, getTodayAttendance)
router.get('/', verifyAdmin, getAllAttendance)
router.get('/:empId', verifySelfOrAdmin, getAttendanceByEmployee)
router.put('/:id', verifyAdmin, updateAttendance)
router.delete('/:id', verifyAdmin, deleteAttendance)

module.exports = router