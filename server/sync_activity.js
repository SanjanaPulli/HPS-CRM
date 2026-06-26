require('dotenv').config()
const prisma = require('./prismaClient')

async function syncFromActivityLog() {
  console.log('Fetching Activity Logs...')
  const logs = await prisma.activityLog.findMany({
    where: {
      category: 'ATTENDANCE'
    },
    orderBy: {
      createdAt: 'asc'
    }
  })
  
  console.log(`Found ${logs.length} attendance logs. Processing...`)

  // Clear existing attendance records to rebuild from activity logs
  await prisma.attendance.deleteMany()
  console.log('Cleared active attendance table for rebuild.')

  const validEmpIds = new Set((await prisma.employee.findMany({ select: { empId: true } })).map(e => e.empId))

  for (const log of logs) {
    if (!log.empId || !log.action || !validEmpIds.has(log.empId)) continue

    const logDate = new Date(log.createdAt)
    const todayStart = new Date(logDate)
    todayStart.setUTCHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

    if (log.action === 'Check-In') {
      const status = log.details || 'Present'
      // Create new check-in
      await prisma.attendance.create({
        data: {
          empId: log.empId,
          status: status,
          checkInTime: logDate,
          timestamp: logDate
        }
      })
      console.log(`Synced Check-In for ${log.empId} at ${logDate.toISOString()}`)
    } else if (log.action === 'Check-Out') {
      // Find matching check-in on the same day
      const existing = await prisma.attendance.findFirst({
        where: {
          empId: log.empId,
          checkInTime: {
            gte: todayStart,
            lt: todayEnd
          }
        }
      })

      let hoursWorked = null
      let overtimeMinutes = null

      if (log.details) {
        // details format: "Worked 4.19h | OT: -228min"
        const hoursMatch = log.details.match(/Worked ([\d.]+)h/)
        const otMatch = log.details.match(/OT: (-?\d+)min/)
        if (hoursMatch) hoursWorked = parseFloat(hoursMatch[1])
        if (otMatch) overtimeMinutes = parseInt(otMatch[1])
      }

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkOutTime: logDate,
            hoursWorked: hoursWorked,
            overtimeMinutes: overtimeMinutes
          }
        })
        console.log(`Synced Check-Out for ${log.empId} at ${logDate.toISOString()}`)
      } else {
        // If check-out exists without check-in, create a record
        await prisma.attendance.create({
          data: {
            empId: log.empId,
            status: 'Present',
            checkInTime: new Date(logDate.getTime() - 8 * 60 * 60 * 1000), // dummy 8 hrs ago
            checkOutTime: logDate,
            timestamp: logDate,
            hoursWorked: hoursWorked,
            overtimeMinutes: overtimeMinutes
          }
        })
        console.log(`Synced Check-Out (no checkin) for ${log.empId} at ${logDate.toISOString()}`)
      }
    }
  }

  console.log('Sync finished successfully!')
}

syncFromActivityLog()
  .catch(e => console.error('Sync failed:', e))
  .finally(() => prisma.$disconnect())
