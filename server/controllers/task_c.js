const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')
const path = require('path')
const fs = require('fs')

// ─── Helper: fetch employee with projects+tasks+documents ──────────────────
const getEmpWithProjects = (empId) => prisma.employee.findUnique({
  where: { empId },
  select: {
    empId: true, name: true, position: true, department: true,
    teamLead: true, dailyWorkStatus: true, photo: true,
    projects: {
      orderBy: { createdAt: 'desc' },
      include: {
        documents: { orderBy: { createdAt: 'asc' } },
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: { documents: { orderBy: { createdAt: 'asc' } } }
        }
      }
    }
  }
})

// GET /api/tasks/:empId
const getEmployeeTaskData = async (req, res) => {
  try {
    const data = await getEmpWithProjects(req.params.empId)
    if (!data) return res.status(404).json({ error: 'Employee not found' })
    res.json(data)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch task data' })
  }
}

// GET /api/tasks — all employees (admin task view)
const getAllTaskData = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        empId: true, name: true, position: true, department: true,
        teamLead: true, dailyWorkStatus: true, photo: true,
        projects: {
          include: {
            tasks: true   // stripped down — no documents
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    res.json(employees)
  } catch (err) {
    console.error(err)  // ← make sure this is here so error prints
    res.status(500).json({ error: 'Failed to fetch all task data' })
  }
}

// GET /api/tasks/team/:tlName
const getTeamMembers = async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.tlName).trim()
    const members = await prisma.employee.findMany({
      where: { teamLead: { equals: name, mode: 'insensitive' } },
      select: {
        empId: true, name: true, position: true, department: true,
        dailyWorkStatus: true, photo: true,
        projects: {
          orderBy: { createdAt: 'desc' },
          include: {
            documents: { orderBy: { createdAt: 'asc' } },
            tasks: {
              orderBy: { createdAt: 'asc' },
              include: { documents: { orderBy: { createdAt: 'asc' } } }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    res.json(members)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch team members' })
  }
}

// POST /api/tasks/projects
// POST /api/tasks/projects
const createProject = async (req, res) => {
  try {
    console.log('createProject hit', req.body, 'files:', req.files)
    const { empId, name, status = 'Not Started', assignedBy } = req.body
    if (!empId || !name) return res.status(400).json({ error: 'empId and name are required' })

    const emp = await prisma.employee.findUnique({ where: { empId }, select: { name: true } })
    if (!emp) return res.status(404).json({ error: 'Employee not found' })

    const project = await prisma.project.create({
      data: { empId, name, status, assignedBy: assignedBy || 'Admin' },
      include: { documents: true, tasks: { include: { documents: true } } }
    })

    // ── Attach uploaded docs if any ───────────────────────────────
    if (req.files && req.files.length > 0) {
      await Promise.all(req.files.map(file =>
        prisma.projectDocument.create({
          data: {
            projectId: project.id,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: assignedBy || 'Admin'
          }
        })
      ))
    }
    // ─────────────────────────────────────────────────────────────

    const finalProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: { documents: true, tasks: { include: { documents: true } } }
    })

    await logActivity({
      empId, employeeName: emp.name,
      action: 'Project Assigned', category: 'task',
      details: `"${name}" assigned by ${assignedBy || 'Admin'}${req.files?.length ? ` with ${req.files.length} document(s)` : ''}`
    })

    await prisma.notification.create({
      data: {
        message: `You've been assigned a new project: "${name}"`,
        type: 'info', target: empId, isRead: false, createdAt: new Date()
      }
    })

    res.status(201).json(finalProject)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create project' })
  }
}

// PATCH /api/tasks/projects/:id
const updateProject = async (req, res) => {
  try {
    const { name, status, assignedBy } = req.body
    const project = await prisma.project.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(status && { status }),
        ...(assignedBy && { assignedBy })
      },
      include: { documents: true, tasks: { include: { documents: true } } }
    })

    await logActivity({
      empId: project.empId, employeeName: assignedBy || 'Admin',
      action: 'Project Updated', category: 'task',
      details: `"${project.name}" → status: ${project.status}`
    })

    res.json(project)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' })
  }
}

// DELETE /api/tasks/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { empId: true, name: true, documents: true }
    })

    // Delete physical files
    if (project?.documents?.length) {
      project.documents.forEach(doc => {
        const filePath = path.join(__dirname, '..', 'uploads', doc.filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      })
    }

    await prisma.project.delete({ where: { id: parseInt(req.params.id) } })

    await logActivity({
      empId: project?.empId, employeeName: 'Admin',
      action: 'Project Deleted', category: 'task',
      details: `"${project?.name}" deleted`
    })

    res.json({ message: 'Project deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' })
  }
}

// POST /api/tasks/projects/:id/tasks
// POST /api/tasks/projects/:id/tasks
const createTask = async (req, res) => {
  try {
     console.log('createTask hit', req.body, 'files:', req.files) 
    const projectId = parseInt(req.params.id)
    const { title, description, status = 'Not Started', priority = 'medium', assignedBy, dueDate } = req.body
    if (!title) return res.status(400).json({ error: 'Title is required' })

    const project = await prisma.project.findUnique({
      where: { id: projectId }, select: { empId: true, name: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const task = await prisma.task.create({
      data: {
        projectId, empId: project.empId, title,
        description: description || null,
        status, priority,
        assignedBy: assignedBy || 'Admin',
        dueDate: dueDate ? new Date(dueDate) : null
      },
      include: { documents: true }
    })

    // ── Attach uploaded docs if any ───────────────────────────────
    if (req.files && req.files.length > 0) {
      await Promise.all(req.files.map(file =>
        prisma.taskDocument.create({
          data: {
            taskId: task.id,
            filename: file.filename,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            uploadedBy: assignedBy || 'Admin'
          }
        })
      ))
    }
    // ─────────────────────────────────────────────────────────────

    const finalTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: { documents: true }
    })

    await logActivity({
      empId: project.empId, employeeName: assignedBy || 'Admin',
      action: 'Task Added', category: 'task',
      details: `"${title}" added to project "${project.name}"${req.files?.length ? ` with ${req.files.length} document(s)` : ''}`
    })

    await prisma.notification.create({
      data: {
        message: `New task assigned: "${title}"`,
        type: 'info', target: project.empId, isRead: false, createdAt: new Date()
      }
    })

    res.status(201).json(finalTask)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create task' })
  }
}
// PATCH /api/tasks/tasks/:id
const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, assignedBy, dueDate } = req.body
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assignedBy && { assignedBy }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
      },
      include: { documents: true }
    })
    res.json(task)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task' })
  }
}

// PATCH /api/tasks/tasks/:id/status
const updateTaskStatus = async (req, res) => {
  try {
    const { status, updatedByName } = req.body
    const task = await prisma.task.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { documents: true }
    })

    await logActivity({
      empId: task.empId, employeeName: updatedByName || 'Employee',
      action: 'Task Status Updated', category: 'task',
      details: `Task "${task.title}" → ${status}`
    })

    res.json(task)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task status' })
  }
}

// DELETE /api/tasks/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { title: true, empId: true, documents: true }
    })

    // Delete physical files
    if (task?.documents?.length) {
      task.documents.forEach(doc => {
        const filePath = path.join(__dirname, '..', 'uploads', doc.filename)
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
      })
    }

    await prisma.task.delete({ where: { id: parseInt(req.params.id) } })

    await logActivity({
      empId: task?.empId, employeeName: 'Admin',
      action: 'Task Deleted', category: 'task',
      details: `"${task?.title}" deleted`
    })

    res.json({ message: 'Task deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task' })
  }
}

// PATCH /api/tasks/:empId/workstatus
const updateWorkStatus = async (req, res) => {
  try {
    const { dailyWorkStatus } = req.body
    const emp = await prisma.employee.update({
      where: { empId: req.params.empId },
      data: { dailyWorkStatus }
    })
    await logActivity({
      empId: emp.empId, employeeName: emp.name,
      action: 'EOD Status Updated', category: 'task',
      details: `"${dailyWorkStatus}"`
    })
    res.json(emp)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update work status' })
  }
}

// ── Document handlers ─────────────────────────────────────────────────────────

// POST /api/tasks/projects/:id/documents
const uploadProjectDocuments = async (req, res) => {
  try {
    const projectId = parseInt(req.params.id)
    const { uploadedBy } = req.body

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files uploaded' })

    const project = await prisma.project.findUnique({
      where: { id: projectId }, select: { id: true, name: true, empId: true }
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const docs = await Promise.all(req.files.map(file =>
      prisma.projectDocument.create({
        data: {
          projectId,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: uploadedBy || 'Unknown'
        }
      })
    ))

    await logActivity({
      empId: project.empId, employeeName: uploadedBy || 'Unknown',
      action: 'Document Uploaded', category: 'task',
      details: `${req.files.length} file(s) uploaded to project "${project.name}"`
    })

    res.status(201).json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to upload documents' })
  }
}

// DELETE /api/tasks/documents/project/:docId
const deleteProjectDocument = async (req, res) => {
  try {
    const doc = await prisma.projectDocument.findUnique({
      where: { id: parseInt(req.params.docId) }
    })
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const filePath = path.join(__dirname, '..', 'uploads', doc.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await prisma.projectDocument.delete({ where: { id: doc.id } })

    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
}

// POST /api/tasks/tasks/:id/documents
const uploadTaskDocuments = async (req, res) => {
  try {
    const taskId = parseInt(req.params.id)
    const { uploadedBy } = req.body

    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: 'No files uploaded' })

    const task = await prisma.task.findUnique({
      where: { id: taskId }, select: { id: true, title: true, empId: true }
    })
    if (!task) return res.status(404).json({ error: 'Task not found' })

    const docs = await Promise.all(req.files.map(file =>
      prisma.taskDocument.create({
        data: {
          taskId,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          uploadedBy: uploadedBy || 'Unknown'
        }
      })
    ))

    await logActivity({
      empId: task.empId, employeeName: uploadedBy || 'Unknown',
      action: 'Document Uploaded', category: 'task',
      details: `${req.files.length} file(s) uploaded to task "${task.title}"`
    })

    res.status(201).json(docs)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to upload documents' })
  }
}

// DELETE /api/tasks/documents/task/:docId
const deleteTaskDocument = async (req, res) => {
  try {
    const doc = await prisma.taskDocument.findUnique({
      where: { id: parseInt(req.params.docId) }
    })
    if (!doc) return res.status(404).json({ error: 'Document not found' })

    const filePath = path.join(__dirname, '..', 'uploads', doc.filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await prisma.taskDocument.delete({ where: { id: doc.id } })

    res.json({ message: 'Document deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete document' })
  }
}

module.exports = {
  getAllTaskData, getEmployeeTaskData, getTeamMembers,
  createProject, updateProject, deleteProject,
  createTask, updateTask, updateTaskStatus, deleteTask,
  updateWorkStatus,
  uploadProjectDocuments, deleteProjectDocument,
  uploadTaskDocuments, deleteTaskDocument
}