const express = require('express')
const router = express.Router()
const {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee
} = require('../controllers/attendence_c')

router.post('/scan', markAttendance)
router.get('/today', getTodayAttendance)   // ✅ must be before /:empId
router.get('/', getAllAttendance)
router.get('/:empId', getAttendanceByEmployee)

module.exports = router