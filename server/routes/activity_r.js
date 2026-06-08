const express = require('express')
const router = express.Router()

const {
  getActivities
} = require('../controllers/activity_c')

router.get('/', getActivities)

module.exports = router