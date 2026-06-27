const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'hps_secret_key_2026'

const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Access denied: Token missing' })

    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    req.user = decoded
    next()
  } catch (err) {
    res.status(403).json({ error: 'Access denied: Invalid or expired token' })
  }
}

const verifyUser = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Access denied: Token missing' })

    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    res.status(403).json({ error: 'Access denied: Invalid or expired token' })
  }
}

const verifySelfOrAdmin = (req, res, next) => {
  verifyUser(req, res, () => {
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      return next()
    }
    const requestedEmpId = req.params.empId || req.body.empId || req.query.empId
    if (requestedEmpId && req.user.empId === requestedEmpId) {
      return next()
    }
    return res.status(403).json({ error: 'Forbidden: You cannot access or modify other employees\' data' })
  })
}

module.exports = { verifyAdmin, verifyUser, verifySelfOrAdmin, JWT_SECRET }
