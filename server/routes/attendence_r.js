const express = require('express')
const router = express.Router()
const {
  markAttendance,
  getTodayAttendance,
  getAllAttendance,
  getAttendanceByEmployee
} = require('../controllers/attendence_c')

// ── ADD THIS ──
const prisma = require('../prismaClient')

router.post('/scan', markAttendance)
router.get('/today', getTodayAttendance)
router.get('/', getAllAttendance)

// ── Edit attendance record ──
router.patch('/:id', async (req, res) => {
  const { status, checkInTime, checkOutTime, hoursWorked } = req.body
  try {
    const updated = await prisma.attendance.update({
      where: { id: Number(req.params.id) },
      data: {
        status,
        checkInTime:  checkInTime  ? new Date(checkInTime)  : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        hoursWorked:  hoursWorked  ?? undefined,
      }
    })
    res.json(updated)
  } catch (err) {
    console.error('Failed to update attendance:', err)
    res.status(500).json({ error: err.message })
  }
})


router.get('/:empId', getAttendanceByEmployee)

module.exports = router