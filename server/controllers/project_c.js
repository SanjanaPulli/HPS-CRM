
const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')

const projectInclude = {
  members: {
    include: { employee: { select: { empId: true, name: true, position: true, department: true, photo: true } } }
  },
  teamLead: { select: { empId: true, name: true, position: true, photo: true } },
  tasks: { orderBy: { createdAt: 'desc' } },
  documents: true,
  employee: { select: { empId: true, name: true } },
}

// ── GET /api/projects ─────────────────────────────────────────────────────────
async function getAllProjects(req, res) {
  try {
    const projects = await prisma.project.findMany({
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json(projects)
  } catch (err) {
    console.error('getAllProjects:', err)
    res.status(500).json({ error: 'Failed to fetch projects' })
  }
}

// ── GET /api/projects/:id ─────────────────────────────────────────────────────
async function getProject(req, res) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: Number(req.params.id) },
      include: projectInclude,
    })
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json(project)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch project' })
  }
}

// ── POST /api/projects ────────────────────────────────────────────────────────
async function createProject(req, res) {
  try {
    const {
      name, description, status, priority,
      startDate, endDate, budget, category,
      teamLeadId, memberIds, assignedBy,
    } = req.body

    if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' })

    // empId: use teamLeadId if provided, else fall back to first member, else 'admin'
    const empId = teamLeadId || (memberIds?.[0]) || null
    if (!empId) return res.status(400).json({ error: 'At least a team lead or one member is required' })

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: status || 'Planning',
        priority: priority || 'medium',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        budget: budget?.trim() || null,
        category: category?.trim() || null,
        teamLeadId: teamLeadId || null,
        assignedBy: assignedBy || 'Admin',
        empId,
        members: {
          create: [
            ...(teamLeadId ? [{ empId: teamLeadId, role: 'lead' }] : []),
            ...(memberIds || [])
              .filter(id => id !== teamLeadId)
              .map(id => ({ empId: id, role: 'member' })),
          ]
        }
      },
      include: projectInclude,
    })

    await logActivity({
      empId: null, employeeName: 'Admin',
      action: 'Project Created', category: 'PROJECTS',
      details: `Project "${project.name}" created with ${project.members.length} member(s)`,
    })

    res.status(201).json(project)
  } catch (err) {
    console.error('createProject:', err)
    res.status(500).json({ error: 'Failed to create project' })
  }
}

// ── PATCH /api/projects/:id ───────────────────────────────────────────────────
async function updateProject(req, res) {
  try {
    const id = Number(req.params.id)
    const {
      name, description, status, priority, progress,
      startDate, endDate, budget, category,
      teamLeadId, memberIds, assignedBy,
    } = req.body

    // Rebuild members if memberIds sent
    const membersUpdate = memberIds !== undefined ? {
      deleteMany: {},
      create: [
        ...(teamLeadId ? [{ empId: teamLeadId, role: 'lead' }] : []),
        ...(memberIds || [])
          .filter(id => id !== teamLeadId)
          .map(id => ({ empId: id, role: 'member' })),
      ]
    } : undefined

    const data = {
      ...(name !== undefined        && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(status !== undefined      && { status }),
      ...(priority !== undefined    && { priority }),
      ...(progress !== undefined    && { progress: Number(progress) }),
      ...(startDate !== undefined   && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined     && { endDate: endDate ? new Date(endDate) : null }),
      ...(budget !== undefined      && { budget: budget?.trim() || null }),
      ...(category !== undefined    && { category: category?.trim() || null }),
      ...(teamLeadId !== undefined  && { teamLeadId: teamLeadId || null }),
      ...(membersUpdate             && { members: membersUpdate }),
    }

    const project = await prisma.project.update({
      where: { id },
      data,
      include: projectInclude,
    })

    await logActivity({
      empId: null, employeeName: assignedBy || 'Admin',
      action: 'Project Updated', category: 'PROJECTS',
      details: `Project "${project.name}" updated`,
    })

    res.json(project)
  } catch (err) {
    console.error('updateProject:', err)
    res.status(500).json({ error: 'Failed to update project' })
  }
}

// ── DELETE /api/projects/:id ──────────────────────────────────────────────────
async function deleteProject(req, res) {
  try {
    const id = Number(req.params.id)
    const project = await prisma.project.findUnique({ where: { id } })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    await prisma.project.delete({ where: { id } })

    await logActivity({
      empId: null, employeeName: 'Admin',
      action: 'Project Deleted', category: 'PROJECTS',
      details: `Project "${project.name}" deleted`,
    })

    res.json({ message: 'Project deleted' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' })
  }
}

// ── GET /api/projects/stats ───────────────────────────────────────────────────
async function getProjectStats(req, res) {
  try {
    const [total, byStatus, byPriority, recentActivity] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      prisma.project.groupBy({ by: ['priority'], _count: { id: true } }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }, take: 5,
        select: { id: true, name: true, status: true, progress: true, updatedAt: true },
      }),
    ])

    const tasks = await prisma.task.aggregate({ _count: { id: true } })
    const completedTasks = await prisma.task.count({ where: { status: 'Completed' } })

    res.json({
      total,
      byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count.id])),
      byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count.id])),
      totalTasks: tasks._count.id,
      completedTasks,
      recentActivity,
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
}

module.exports = { getAllProjects, getProject, createProject, updateProject, deleteProject, getProjectStats }