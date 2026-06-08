const prisma = require('../prismaClient')

const logActivity = async ({
  empId = null,
  employeeName = null,
  action,
  category,
  details = null
}) => {
  try {
    await prisma.activityLog.create({
      data: {
        empId,
        employeeName,
        action,
        category,
        details
      }
    })
  } catch (error) {
    console.error('Activity Logger Error:', error)
  }
}

module.exports = logActivity