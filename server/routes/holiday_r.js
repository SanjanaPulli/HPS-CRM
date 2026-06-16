const express = require('express')
const router = express.Router()
const { getHolidays, createHoliday, updateHoliday, deleteHoliday } = require('../controllers/holiday_c')

router.get('/',        getHolidays)
router.post('/',       createHoliday)
router.put('/:id',    updateHoliday)
router.delete('/:id', deleteHoliday)

module.exports = router