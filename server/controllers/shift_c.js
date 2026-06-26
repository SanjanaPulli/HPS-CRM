const prisma = require('../prismaClient')

const getAllShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        _count: {
          select: { employees: true }
        }
      }
    })
    res.json(shifts)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch shifts' })
  }
}

const createShift = async (req, res) => {
  const { name, startTime, endTime } = req.body
  if (!name || !startTime || !endTime) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  try {
    const shift = await prisma.shift.create({
      data: { name, startTime, endTime }
    })
    res.status(201).json(shift)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create shift' })
  }
}

const updateShift = async (req, res) => {
  const { id } = req.params
  const { name, startTime, endTime } = req.body
  try {
    const shift = await prisma.shift.update({
      where: { id: parseInt(id) },
      data: { name, startTime, endTime }
    })
    res.json(shift)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update shift' })
  }
}

const deleteShift = async (req, res) => {
  const { id } = req.params
  try {
    // Check if there are employees assigned
    const count = await prisma.employee.count({
      where: { shiftId: parseInt(id) }
    })
    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete shift with assigned employees' })
    }
    await prisma.shift.delete({
      where: { id: parseInt(id) }
    })
    res.json({ message: 'Shift deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete shift' })
  }
}

module.exports = {
  getAllShifts,
  createShift,
  updateShift,
  deleteShift
}
