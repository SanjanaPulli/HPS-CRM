const prisma = require('../prismaClient')

const getActivities = async (req, res) => {
  try {
    const { category, from, to, search } = req.query

    const where = {}

    // Category filter
    if (category && category !== 'ALL') {
      where.category = category
    }

    // Date range filter — 'from' and 'to' are ISO date strings (YYYY-MM-DD)
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        // Include the full 'to' day until 23:59:59
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    // Optional server-side search (employee name / action / details)
    if (search) {
      where.OR = [
        { employeeName: { contains: search, mode: 'insensitive' } },
        { action:       { contains: search, mode: 'insensitive' } },
        { details:      { contains: search, mode: 'insensitive' } },
        { empId:        { contains: search, mode: 'insensitive' } },
      ]
    }

    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500, // cap at 500 so the frontend never chokes
    })

    res.json(activities)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch activity logs' })
  }
}

module.exports = { getActivities }