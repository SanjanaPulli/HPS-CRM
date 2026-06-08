// NEW FILE: server/controllers/notifications_c.js
const prisma = require('../prismaClient')

const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        target: 'admin'
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    res.json(notifications)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: 'Failed to fetch notifications'
    })
  }
}

// GET /api/notifications/employee/:empId
const getEmployeeNotifications = async (req, res) => {
  try {
    const { empId } = req.params
    const notifications = await prisma.notification.findMany({
      where: { target: empId },
      orderBy: { createdAt: 'desc' },
      take: 30
    })
    res.json({ notifications })
  } catch (error) {
    console.error('Employee notifications error:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
}

module.exports = { getAdminNotifications, getEmployeeNotifications }
