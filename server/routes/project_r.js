const express = require('express')
const router = express.Router()
const {
  getAllProjects, getProject,
  createProject, updateProject, deleteProject,
  getProjectStats,
} = require('../controllers/project_c')

router.get('/stats',  getProjectStats)   // must be before /:id
router.get('/',       getAllProjects)
router.get('/:id',    getProject)
router.post('/',      createProject)
router.patch('/:id',  updateProject)
router.delete('/:id', deleteProject)

module.exports = router