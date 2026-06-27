const express = require('express')
const router = express.Router()
const {
  submitLeave,
  getAllLeaves,
  getLeaveByEmployee,
  updateLeaveStatus,
  deleteLeave
} = require('../controllers/leave_c')
const { verifyAdmin, verifySelfOrAdmin } = require('../utils/auth')

router.post('/', verifySelfOrAdmin, submitLeave)
router.get('/', verifyAdmin, getAllLeaves)
router.get('/:empId', verifySelfOrAdmin, getLeaveByEmployee)
router.put('/:id', verifyAdmin, updateLeaveStatus)
router.delete('/:id', verifyAdmin, deleteLeave)

module.exports = router
