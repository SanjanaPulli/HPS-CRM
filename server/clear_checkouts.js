require('dotenv').config()
const prisma = require('./prismaClient')

async function clearTodayCheckouts() {
  console.log('Clearing checkouts for today\'s specific attendance records...')

  const startToday = new Date('2026-06-26T00:00:00+05:30')
  const endToday   = new Date('2026-06-26T23:59:59+05:30')

  const updated = await prisma.attendance.updateMany({
    where: {
      checkInTime: {
        gte: startToday,
        lt: endToday
      }
    },
    data: {
      checkOutTime: null,
      hoursWorked: null,
      overtimeMinutes: null
    }
  })

  console.log(`Successfully cleared check-out times and hours for ${updated.count} attendance records today.`)
}

clearTodayCheckouts()
  .catch(e => console.error('Clear failed:', e))
  .finally(() => prisma.$disconnect())
