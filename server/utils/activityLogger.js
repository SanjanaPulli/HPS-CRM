const prisma = require('../prismaClient')

const logActivity = async ({
  empId = null,
  employeeName = null,
  action,
  category,
  details = null
}) => {
  try {
    let finalEmployeeName = employeeName;
    if (!employeeName || employeeName === 'Admin' || employeeName === 'Admin/Manager') {
      const store = global.asyncLocalStorage ? global.asyncLocalStorage.getStore() : null;
      if (store && store.adminName) {
        finalEmployeeName = store.adminName;
      }
    }

    let finalDetails = details;
    if (details && typeof details === 'string') {
      const store = global.asyncLocalStorage ? global.asyncLocalStorage.getStore() : null;
      if (store && store.adminName) {
        finalDetails = details
          .replace('Actioned by: Admin/Manager', `Actioned by: ${store.adminName}`)
          .replace('Actioned by: Admin', `Actioned by: ${store.adminName}`);
      }
    }

    await prisma.activityLog.create({
      data: {
        empId,
        employeeName: finalEmployeeName,
        action,
        category,
        details: finalDetails
      }
    })
  } catch (error) {
    console.error('Activity Logger Error:', error)
  }
}

module.exports = logActivity