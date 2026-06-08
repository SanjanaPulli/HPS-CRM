// ── Proprietary checksum algorithm ──────────────────────────
// This makes the barcode unique to HPS system only
// External scanners can read the barcode but our system
// will reject it if the checksum doesn't match

const SECRET_KEY = 42 // change this to any number — keep it secret

const generateChecksum = (empId) => {
  let sum = 0
  for (let i = 0; i < empId.length; i++) {
    sum += empId.charCodeAt(i) * (i + 1)
  }
  return (sum * SECRET_KEY) % 1000
}

const generateBarcodeId = (empId) => {
  const checksum = generateChecksum(empId)
  return `${empId}-${checksum}`
}

const validateBarcodeId = (barcodeId) => {
  const parts = barcodeId.split('-')
  if (parts.length !== 2) return false
  const empId = parts[0]
  const checksum = parseInt(parts[1])
  return generateChecksum(empId) === checksum
}

module.exports = {
  generateBarcodeId,
  validateBarcodeId
}