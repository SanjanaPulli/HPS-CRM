require('dotenv').config()
const prisma = require('./prismaClient')


async function fix() {
  const records = await prisma.attendance.findMany()
  
  for (const r of records) {
    const data = {}
    
    if (r.checkInTime) {
      data.checkInTime = new Date(new Date(r.checkInTime).getTime() - 5.5 * 60 * 60 * 1000)
    }
    if (r.checkOutTime) {
      data.checkOutTime = new Date(new Date(r.checkOutTime).getTime() - 5.5 * 60 * 60 * 1000)
    }
    if (r.timestamp) {
      data.timestamp = new Date(new Date(r.timestamp).getTime() - 5.5 * 60 * 60 * 1000)
    }

    if (Object.keys(data).length > 0) {
      await prisma.attendance.update({ where: { id: r.id }, data })
      console.log(`Fixed record ${r.id} — ${r.empId}`)
    }
  }

  console.log('Done!')
  await prisma.$disconnect()
}

fix()