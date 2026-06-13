const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

const employeeRoutes     = require('./routes/emp_r')
const attendanceRoutes   = require('./routes/attendence_r')
const leaveRoutes        = require('./routes/leave_r')
const notificationRoutes = require('./routes/notifications_r')
const announcementRoutes = require('./routes/announcement_r')
const settingsRouter     = require('./routes/settings_r')
const activityRoutes     = require('./routes/activity_r')
const startScheduler     = require('./scheduler')
const logActivity        = require('./utils/activityLogger')

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())

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

app.get('/', (req, res) => res.send('HPS Attendance Server is running!'))

// ── In-memory admin accounts ───────────────────────────────────────────────
const adminAccounts = [
  {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: 'Admin'
  },
  {
    username: 'manager',
    password: 'manager123',
    name: 'Manager'
  }
]

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body
  const user = adminAccounts.find(
    a => a.username === username && a.password === password
  )
  if (user) {
    await logActivity({
      empId: null, employeeName: user.name,
      action: 'Admin Login', category: 'AUTH',
      details: `"${user.name}" logged into the admin portal`
    })
    res.json({ message: 'Login successful', name: user.name })
  } else {
    await logActivity({
      empId: null, employeeName: 'Unknown',
      action: 'Admin Login Failed', category: 'AUTH',
      details: `Failed login attempt for username "${username}"`
    })
    res.status(401).json({ message: 'Invalid credentials' })
  }
})

// PATCH /api/admin/password
app.patch('/api/admin/password', async (req, res) => {
  const { currentPassword, newPassword, username } = req.body
  const user = adminAccounts.find(a => a.username === (username || 'admin'))
  if (!user) return res.status(404).json({ error: 'Account not found' })
  if (currentPassword !== user.password)
    return res.status(401).json({ error: 'Current password is incorrect' })
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  user.password = newPassword
  await logActivity({
    empId: null, employeeName: user.name,
    action: 'Admin Password Changed', category: 'AUTH',
    details: `${user.name} account password updated`
  })
  res.json({ message: 'Password updated' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  startScheduler()
})