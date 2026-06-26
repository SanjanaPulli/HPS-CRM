const prisma = require('../prismaClient')
const fs = require('fs')
const path = require('path')

const getDocuments = async (req, res) => {
  const { empId } = req.params
  try {
    const docs = await prisma.document.findMany({
      where: { empId }
    })
    res.json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
}

const createDocument = async (req, res) => {
  const { empId, docType } = req.body
  if (!empId || !docType) {
    // delete file if uploaded but missing fields
    if (req.file) {
      try { fs.unlinkSync(req.file.path) } catch {}
    }
    return res.status(400).json({ error: 'empId and docType are required' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { empId } })
    if (!employee) {
      try { fs.unlinkSync(req.file.path) } catch {}
      return res.status(404).json({ error: 'Employee not found' })
    }

    const fileUrl = `/uploads/${req.file.filename}`
    const document = await prisma.document.create({
      data: {
        empId,
        docType,
        fileName: req.file.originalname,
        fileUrl
      }
    })
    res.status(201).json(document)
  } catch (err) {
    console.error(err)
    try { fs.unlinkSync(req.file.path) } catch {}
    res.status(500).json({ error: 'Failed to save document' })
  }
}

const deleteDocument = async (req, res) => {
  const { id } = req.params
  try {
    const doc = await prisma.document.findUnique({ where: { id: parseInt(id) } })
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    // Try deleting physical file
    const filePath = path.join(__dirname, '..', doc.fileUrl)
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (e) {
      console.error('Failed to delete physical file:', e)
    }

    await prisma.document.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Document deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete document' })
  }
}

module.exports = {
  getDocuments,
  createDocument,
  deleteDocument
}
