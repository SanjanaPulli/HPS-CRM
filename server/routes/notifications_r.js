// NEW FILE: server/routes/notifications_r.js
const express = require('express')
const router = express.Router()
const prisma = require('../prismaClient')
const { getAdminNotifications, getEmployeeNotifications } = require('../controllers/notifications_c')

router.get('/admin', getAdminNotifications)
router.get('/employee/:empId', getEmployeeNotifications)

router.patch('/:id/read', async (req, res) => {
  try {
    await prisma.notification.update({
      where: {
        id: Number(req.params.id)
      },
      data: {
        isRead: true
      }
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
