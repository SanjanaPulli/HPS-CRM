const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const {
  getAllTaskData, getEmployeeTaskData, getTeamMembers,
  createProject, updateProject, deleteProject,
  createTask, updateTask, updateTaskStatus, deleteTask,
  updateWorkStatus,
  uploadProjectDocuments, deleteProjectDocument,
  uploadTaskDocuments, deleteTaskDocument
} = require('../controllers/task_c')

// ── Multer setup ──────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`
    const ext = path.extname(file.originalname)
    cb(null, `${unique}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ]
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error(`File type not allowed: ${file.mimetype}`), false)
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } })

// ── Team + employee data ──────────────────────────────────────────────────────
router.get('/',                getAllTaskData)
router.get('/team/:tlName',    getTeamMembers)
router.get('/:empId',          getEmployeeTaskData)

// ── EOD ───────────────────────────────────────────────────────────────────────
router.patch('/:empId/workstatus', updateWorkStatus)

// ── Projects ──────────────────────────────────────────────────────────────────
router.post('/projects',           upload.array('files', 10), createProject)
router.patch('/projects/:id',      updateProject)
router.delete('/projects/:id',     deleteProject)

// ── Project documents ─────────────────────────────────────────────────────────
router.post('/projects/:id/documents',     upload.array('files', 10), uploadProjectDocuments)
router.delete('/documents/project/:docId', deleteProjectDocument)

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.post('/projects/:id/tasks',   upload.array('files', 10), createTask)
router.patch('/tasks/:id',           updateTask)
router.patch('/tasks/:id/status',    updateTaskStatus)
router.delete('/tasks/:id',          deleteTask)

// ── Task documents ────────────────────────────────────────────────────────────
router.post('/tasks/:id/documents',      upload.array('files', 10), uploadTaskDocuments)
router.delete('/documents/task/:docId',  deleteTaskDocument)

module.exports = router