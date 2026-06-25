const express = require('express')
const router = express.Router()
const { getSettings, updateSettings } = require('../controllers/settings_c')
const { verifyAdmin } = require('../utils/auth')

router.get('/', getSettings)
router.patch('/', verifyAdmin, updateSettings)

module.exports = router
