const express = require('express')
const router = express.Router()
const {
  getAnnouncementsForEmployee,
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement_c')
const { verifyAdmin } = require('../utils/auth')

router.get('/', getAllAnnouncements)
router.get('/employee/:empId', getAnnouncementsForEmployee)
router.post('/', verifyAdmin, createAnnouncement)
router.delete('/:id', verifyAdmin, deleteAnnouncement)

module.exports = router