// server/routes/settings_r.js

const express = require('express')
const router = express.Router()
const { getSettings, updateSettings } = require('../controllers/settings_c')

router.get('/', getSettings)
router.patch('/', updateSettings)

module.exports = router
