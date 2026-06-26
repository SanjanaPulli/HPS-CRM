const express = require('express')
const router = express.Router()
const {
  getAllAssets,
  assignAsset,
  returnAsset,
  deleteAsset
} = require('../controllers/asset_c')
const { verifyAdmin } = require('../utils/auth')

router.get('/', getAllAssets) // accessible by employees to see their assigned assets, or admin
router.post('/', verifyAdmin, assignAsset)
router.put('/:id/return', verifyAdmin, returnAsset)
router.delete('/:id', verifyAdmin, deleteAsset)

module.exports = router
