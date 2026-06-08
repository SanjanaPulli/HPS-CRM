const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')

// GET announcements for an employee (global + targeted to them)
const getAnnouncementsForEmployee = async (req, res) => {
  try {
    const { empId } = req.params
    const now = new Date()

    const all = await prisma.announcement.findMany({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: now } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const filtered = all.filter(a => {
      if (a.type === 'global') return true
      if (a.type === 'targeted' && a.targetEmpId) {
        const targets = a.targetEmpId.split(',').map(s => s.trim())
        return targets.includes(empId)
      }
      return false
    })

    res.json(filtered.slice(0, 10))
  } catch (error) {
    console.error('Get announcements error:', error)
    res.status(500).json({ error: 'Failed to fetch announcements' })
  }
}

// GET all announcements (admin)
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(announcements)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch announcements' })
  }
}

// POST create announcement
const createAnnouncement = async (req, res) => {
  try {
    const { title, body, type, targetEmpIds, priority, expiresAt } = req.body

    let targetEmpId = null
    if (type === 'targeted' && req.body.targetEmpIds) {
      targetEmpId = Array.isArray(req.body.targetEmpIds)
        ? req.body.targetEmpIds.join(',')
        : String(req.body.targetEmpIds)
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body,
        type,
        targetEmpId,
        priority,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    })

    const targetLabel = type === 'global'
      ? 'All employees'
      : `Targeted → ${targetEmpId || 'none'}`

    await logActivity({
      empId: null,
      employeeName: 'Admin',
      action: 'Announcement Created',
      category: 'ADMIN',
      details: `"${title}" · ${targetLabel} · Priority: ${priority || 'normal'}`
    })

    // Notify relevant employees
    try {
      let empIds = []

      if (type === 'global') {
        const all = await prisma.employee.findMany({ select: { empId: true } })
        empIds = all.map(e => e.empId)
      } else if (type === 'targeted' && targetEmpId) {
        empIds = targetEmpId.split(',').map(s => s.trim()).filter(Boolean)
      }

      if (empIds.length > 0) {
        await prisma.notification.createMany({
          data: empIds.map(id => ({
            message: `New announcement: ${title}`,
            type: 'info',
            target: id,
            isRead: false,
            createdAt: new Date()
          }))
        })
      }
    } catch (err) {
      console.error('Failed to create announcement notifications:', err)
    }

    res.status(201).json(announcement)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create announcement' })
  }
}

// DELETE announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const id = parseInt(req.params.id)

    // Fetch before delete so we can log the title
    const announcement = await prisma.announcement.findUnique({ where: { id } })

    await prisma.announcement.delete({ where: { id } })

    await logActivity({
      empId: null,
      employeeName: 'Admin',
      action: 'Announcement Deleted',
      category: 'ADMIN',
      details: announcement ? `"${announcement.title}" removed` : `ID ${id} removed`
    })

    res.json({ message: 'Announcement deleted' })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete announcement' })
  }
}

module.exports = {
  getAnnouncementsForEmployee,
  getAllAnnouncements,
  createAnnouncement,
  deleteAnnouncement
}