const express = require('express')
const router = express.Router()
const {
  submitLeave,
  getAllLeaves,
  getLeaveByEmployee,
  updateLeaveStatus, deleteLeave
} = require('../controllers/leave_c')

router.post('/', submitLeave)
router.get('/', getAllLeaves)
router.get('/:empId', getLeaveByEmployee)
router.put('/:id', updateLeaveStatus)
router.delete('/:id', deleteLeave)

module.exports = router
