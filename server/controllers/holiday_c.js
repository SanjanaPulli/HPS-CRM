const prisma = require('../prismaClient')

const getHolidays = async (req, res) => {
  try {
    const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } })
    res.json(holidays)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch holidays' })
  }
}

const createHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body
    if (!date || !name) return res.status(400).json({ error: 'Date and name are required' })
    const holiday = await prisma.holiday.create({
      data: { date: new Date(date), name, type: type || 'National' }
    })
    res.status(201).json(holiday)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create holiday' })
  }
}

const updateHoliday = async (req, res) => {
  try {
    const { date, name, type } = req.body
    const holiday = await prisma.holiday.update({
      where: { id: Number(req.params.id) },
      data: { date: new Date(date), name, type }
    })
    res.json(holiday)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update holiday' })
  }
}

const deleteHoliday = async (req, res) => {
  try {
    await prisma.holiday.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Holiday deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete holiday' })
  }
}

module.exports = { getHolidays, createHoliday, updateHoliday, deleteHoliday }