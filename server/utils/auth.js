const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'hps_secret_key_2026'

const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Access denied: Token missing' })

    const decoded = jwt.verify(token, JWT_SECRET)
    req.admin = decoded
    next()
  } catch (err) {
    res.status(403).json({ error: 'Access denied: Invalid or expired token' })
  }
}

module.exports = { verifyAdmin, JWT_SECRET }
