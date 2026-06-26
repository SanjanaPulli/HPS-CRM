const express = require('express')
const router = express.Router()
const {
  getAllShifts,
  createShift,
  updateShift,
  deleteShift
} = require('../controllers/shift_c')
const { verifyAdmin } = require('../utils/auth')

router.get('/', verifyAdmin, getAllShifts)
router.post('/', verifyAdmin, createShift)
router.put('/:id', verifyAdmin, updateShift)
router.delete('/:id', verifyAdmin, deleteShift)

module.exports = router
