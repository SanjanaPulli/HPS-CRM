require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { AsyncLocalStorage } = require('async_hooks')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('./prismaClient')
const { JWT_SECRET } = require('./utils/auth')

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
  const targetUsername = (username || 'admin').toLowerCase().trim()

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

const seedAdmins = async () => {
  try {
    const count = await prisma.admin.count()
    if (count === 0) {
      const adminPass = await bcrypt.hash('admin123', 10)
      const managerPass = await bcrypt.hash('manager123', 10)
      await prisma.admin.createMany({
        data: [
          { username: 'admin', password: adminPass, name: 'Admin', role: 'admin' },
          { username: 'manager', password: managerPass, name: 'Manager', role: 'manager' }
        ]
      })
      console.log('✅ Admin & Manager accounts seeded successfully in DB.')
    }
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