require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { AsyncLocalStorage } = require('async_hooks')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('./prismaClient')
const { JWT_SECRET, verifyAdmin } = require('./utils/auth')

const asyncLocalStorage = new AsyncLocalStorage()
global.asyncLocalStorage = asyncLocalStorage

const employeeRoutes     = require('./routes/emp_r')
const attendanceRoutes   = require('./routes/attendence_r')
const leaveRoutes        = require('./routes/leave_r')
const notificationRoutes = require('./routes/notifications_r')
const announcementRoutes = require('./routes/announcement_r')
const settingsRouter     = require('./routes/settings_r')
const activityRoutes     = require('./routes/activity_r')
const startScheduler     = require('./scheduler')
const logActivity        = require('./utils/activityLogger')
const holidayRoutes       = require('./routes/holiday_r')
const shiftRoutes         = require('./routes/shift_r')
const assetRoutes         = require('./routes/asset_r')
const documentRoutes      = require('./routes/document_r')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

app.use((req, res, next) => {
  const adminName = req.headers['x-admin-name'] || 'Admin'
  asyncLocalStorage.run({ adminName }, () => {
    next()
  })
})

// ── Static file serving for uploads ──────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })
app.use('/uploads', express.static(uploadsDir))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/employees',     employeeRoutes)
app.use('/api/attendance',    attendanceRoutes)
app.use('/api/leave',         leaveRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/settings',      settingsRouter)
app.use('/api/activity',      activityRoutes)
app.use('/api/holidays',       holidayRoutes)
app.use('/api/shifts',         shiftRoutes)
app.use('/api/assets',         assetRoutes)
app.use('/api/documents',      documentRoutes)
app.get('/', (req, res) => res.send('HPS Attendance Server is running!'))

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  console.time('adminLogin')
  const { username, password } = req.body

  try {
    console.time('adminLookup')
    const user = await prisma.admin.findUnique({
      where: { username: username.toLowerCase().trim() }
    })
    console.timeEnd('adminLookup')

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name, empId: user.role === 'manager' ? 'HPS250025' : null },
        JWT_SECRET,
        { expiresIn: '12h' }
      )

      await logActivity({
        empId: null,
        employeeName: user.name,
        action: 'Admin Login',
        category: 'AUTH',
        details: `"${user.name}" logged into the admin portal`
      })

      res.json({
        message: 'Login successful',
        name: user.name,
        role: user.role,
        empId: user.role === 'manager' ? 'HPS250025' : null,
        token
      })
    } else {
      await logActivity({
        empId: null,
        employeeName: 'Unknown',
        action: 'Admin Login Failed',
        category: 'AUTH',
        details: `Failed login attempt for username "${username}"`
      })
      res.status(401).json({ message: 'Invalid credentials' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error during login' })
  }
  console.timeEnd('adminLogin')
})

// PATCH /api/admin/password
app.patch('/api/admin/password', async (req, res) => {
  const { currentPassword, newPassword, username } = req.body
  const targetUsername = (username || 'satheesh').toLowerCase().trim()

  try {
    const user = await prisma.admin.findUnique({
      where: { username: targetUsername }
    })
    if (!user) return res.status(404).json({ error: 'Account not found' })

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Current password is incorrect' })

    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters' })

    const hashedNew = await bcrypt.hash(newPassword, 10)
    await prisma.admin.update({
      where: { username: targetUsername },
      data: { password: hashedNew }
    })

    await logActivity({
      empId: null,
      employeeName: user.name,
      action: 'Admin Password Changed',
      category: 'AUTH',
      details: `${user.name} account password updated`
    })

    res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update password' })
  }
})

// GET /api/admin - List admin accounts (restricted to primary admin)
app.get('/api/admin', verifyAdmin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only primary admin can list admin accounts' })
  }
  try {
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true
      }
    })
    res.json(admins)
  } catch (err) {
    console.error('Failed to list admins:', err)
    res.status(500).json({ error: 'Failed to fetch admin accounts' })
  }
})

// POST /api/admin/create - Create a new admin/manager account (restricted to primary admin)
app.post('/api/admin/create', verifyAdmin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Only primary admin can create new admin accounts' })
  }

  const { username, password, name, role } = req.body

  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Username, password, and name are required.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }

  const normalizedUsername = username.toLowerCase().trim()

  try {
    const existing = await prisma.admin.findUnique({
      where: { username: normalizedUsername }
    })
    if (existing) {
      return res.status(400).json({ error: 'An admin account with this username already exists.' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const newAdmin = await prisma.admin.create({
      data: {
        username: normalizedUsername,
        password: hashedPassword,
        name: name.trim(),
        role: role || 'admin'
      }
    })

    await logActivity({
      empId: null,
      employeeName: req.user.name,
      action: 'Admin Account Created',
      category: 'AUTH',
      details: `Created admin account "${newAdmin.name}" with role "${newAdmin.role}"`
    })

    res.status(201).json({
      message: 'Admin account created successfully',
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        createdAt: newAdmin.createdAt
      }
    })
  } catch (err) {
    console.error('Failed to create admin:', err)
    res.status(500).json({ error: 'Internal server error during account creation' })
  }
})

// DELETE /api/admin/:id - Delete an admin account (restricted to primary admin)
app.delete('/api/admin/:id', verifyAdmin, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid admin ID' })
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' })
  }

  try {
    const target = await prisma.admin.findUnique({ where: { id } })
    if (!target) return res.status(404).json({ error: 'Admin account not found' })

    if (target.username === 'satheesh') {
      return res.status(400).json({ error: 'Super admin account cannot be deleted' })
    }

    await prisma.admin.delete({ where: { id } })

    await logActivity({
      empId: null,
      employeeName: req.user.name,
      action: 'Admin Account Deleted',
      category: 'AUTH',
      details: `Deleted admin account "${target.name}" (${target.username})`
    })

    res.json({ message: 'Admin account deleted successfully' })
  } catch (err) {
    console.error('Failed to delete admin:', err)
    res.status(500).json({ error: 'Failed to delete admin account' })
  }
})

const seedAdmins = async () => {
  try {
    const adminPass = await bcrypt.hash('9246615251', 10)
    const managerPass = await bcrypt.hash('6301890502', 10)

    await prisma.admin.upsert({
      where: { username: 'satheesh' },
      update: { password: adminPass, name: 'Satheesh', role: 'admin' },
      create: { username: 'satheesh', password: adminPass, name: 'Satheesh', role: 'admin' }
    })

    await prisma.admin.upsert({
      where: { username: 'sowsheel' },
      update: { password: managerPass, name: 'Sowsheel', role: 'manager' },
      create: { username: 'sowsheel', password: managerPass, name: 'Sowsheel', role: 'manager' }
    })

    // Clean up old default admins
    await prisma.admin.deleteMany({
      where: {
        username: {
          in: ['admin', 'manager']
        }
      }
    })

    console.log('Admin & Manager accounts seeded/updated successfully in DB.')
  } catch (err) {
    console.error('Failed to seed admins:', err)
  }
}

// TEMPORARY - timezone debug, remove after checking
console.log('Server timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone)
console.log('Current time:', new Date().toString())
console.log('UTC time:', new Date().toUTCString())

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server running on port ${PORT}`)
  await seedAdmins()
  startScheduler()
})