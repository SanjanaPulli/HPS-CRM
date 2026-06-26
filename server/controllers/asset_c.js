const prisma = require('../prismaClient')

const getAllAssets = async (req, res) => {
  const { empId } = req.query
  try {
    const assets = await prisma.asset.findMany({
      where: empId ? { empId } : {},
      include: {
        employee: {
          select: { name: true, department: true }
        }
      }
    })
    res.json(assets)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
}

const assignAsset = async (req, res) => {
  const { empId, name, serialNumber } = req.body
  if (!empId || !name || !serialNumber) {
    return res.status(400).json({ error: 'empId, asset name and serial number are required' })
  }
  try {
    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) return res.status(404).json({ error: 'Employee not found' })

    const asset = await prisma.asset.create({
      data: { empId, name, serialNumber, status: 'Assigned' }
    })
    res.status(201).json(asset)
  } catch (err) {
    console.error(err)
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'An asset with this serial number is already registered' })
    }
    res.status(500).json({ error: 'Failed to assign asset' })
  }
}

const returnAsset = async (req, res) => {
  const { id } = req.params
  try {
    const asset = await prisma.asset.update({
      where: { id: parseInt(id) },
      data: { status: 'Returned', returnedAt: new Date() }
    })
    res.json(asset)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to process asset return' })
  }
}

const deleteAsset = async (req, res) => {
  const { id } = req.params
  try {
    await prisma.asset.delete({
      where: { id: parseInt(id) }
    })
    res.json({ message: 'Asset deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete asset' })
  }
}

module.exports = {
  getAllAssets,
  assignAsset,
  returnAsset,
  deleteAsset
}
