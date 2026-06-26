const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const { getDocuments, createDocument, deleteDocument } = require('../controllers/document_c')
const { verifyAdmin } = require('../utils/auth')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

const upload = multer({ storage })

router.get('/:empId', getDocuments)
router.post('/', upload.single('file'), createDocument) // upload is done by employees or admin
router.delete('/:id', verifyAdmin, deleteDocument)

module.exports = router
