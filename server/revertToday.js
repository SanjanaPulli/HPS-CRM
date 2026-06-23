require('dotenv').config()
const prisma = require('./prismaClient')

async function revertToday() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const records = await prisma.attendance.findMany({
    where: { timestamp: { gte: todayStart, lte: todayEnd } }
  })

  for (const r of records) {
    const data = {}
    if (r.checkInTime)  data.checkInTime  = new Date(new Date(r.checkInTime).getTime()  + 5.5 * 60 * 60 * 1000)
    if (r.checkOutTime) data.checkOutTime = new Date(new Date(r.checkOutTime).getTime() + 5.5 * 60 * 60 * 1000)
    if (r.timestamp)    data.timestamp    = new Date(new Date(r.timestamp).getTime()    + 5.5 * 60 * 60 * 1000)

    if (Object.keys(data).length > 0) {
      await prisma.attendance.update({ where: { id: r.id }, data })
      console.log(`Reverted record ${r.id} — ${r.empId}`)
    }
  }

  console.log('Done!')
  await prisma.$disconnect()
}

revertToday()