const express = require('express')
const router = express.Router()
const {
  getAnnouncementsForEmployee,
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement
} = require('../controllers/announcement_c')

router.get('/', getAllAnnouncements)
router.get('/employee/:empId', getAnnouncementsForEmployee)
router.post('/', createAnnouncement)
router.delete('/:id', deleteAnnouncement)

module.exports = router