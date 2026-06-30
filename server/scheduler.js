const cron = require('node-cron')
const prisma = require('./prismaClient')

// Returns IST midnight (00:00 IST) as a UTC Date for a given UTC Date
const getISTDayStart = (utcDate) => {
  const istMs = utcDate.getTime() + (5.5 * 60 * 60 * 1000)
  const istDate = new Date(istMs)
  const istMidnight = new Date(Date.UTC(
    istDate.getUTCFullYear(),
    istDate.getUTCMonth(),
    istDate.getUTCDate(),
    0, 0, 0, 0
  ))
  return new Date(istMidnight.getTime() - (5.5 * 60 * 60 * 1000))
}

const startScheduler = () => {
  // End-of-day absent check at 5:00 PM IST
  cron.schedule('0 17 * * *', async () => {
    console.log('Running end-of-day absent check...')

    try {
      const now = new Date()
      const todayStart = getISTDayStart(now)
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

      // Get all employees
      const employees = await prisma.employee.findMany()

      for (const employee of employees) {
        // Check if already has attendance today
        const existing = await prisma.attendance.findFirst({
          where: {
            empId: employee.empId,
            checkInTime: { gte: todayStart, lt: todayEnd }
          }
        })

        if (!existing) {
          // Check if on approved leave today
          const onLeave = await prisma.leaveRequest.findFirst({
            where: {
              empId: employee.empId,
              status: 'Approved',
              date: { gte: todayStart, lt: todayEnd }
            }
          })

          // Mark as absent or on leave
          await prisma.attendance.create({
            data: {
              empId: employee.empId,
              status: onLeave ? 'On Leave' : 'Absent',
              checkInTime: null,
              checkOutTime: null,
              timestamp: todayStart
            }
          })

          console.log(`Marked ${employee.empId} as ${onLeave ? 'On Leave' : 'Absent'}`)
        }
      }

      console.log('End-of-day check complete!')
    } catch (error) {
      console.error('Scheduler error:', error)
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  })

  // Auto check-out at 6:00 PM (18:00) IST
  cron.schedule('0 18 * * *', async () => {
    console.log('Running auto check-out at 6:00 PM...')
    try {
      const now = new Date()
      const todayStart = getISTDayStart(now)
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

      // Find all check-ins for today that do not have a check-out time
      const records = await prisma.attendance.findMany({
        where: {
          checkInTime: { gte: todayStart, lt: todayEnd },
          checkOutTime: null
        }
      })

      console.log(`Found ${records.length} records to auto check-out.`)

      // Get office settings to compute overtime minutes correctly
      const settings = await prisma.officeSetting.findFirst()
      const checkInTimeStr = settings?.checkInTime || '09:30'
      const checkOutTimeStr = settings?.checkOutTime || '17:30'
      const [ih, im] = checkInTimeStr.split(':').map(Number)
      const [oh, om] = checkOutTimeStr.split(':').map(Number)
      const standardHours = ((oh * 60 + om) - (ih * 60 + im)) / 60

      // autoCheckOutTime is exactly 6:00 PM (18:00:00) IST today
      const autoCheckOutTime = new Date(todayStart.getTime() + 18 * 60 * 60 * 1000)

      for (const record of records) {
        const checkIn = new Date(record.checkInTime)
        const diffMs = autoCheckOutTime.getTime() - checkIn.getTime()
        const hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60))
        const overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            checkOutTime: autoCheckOutTime,
            hoursWorked: Math.round(hoursWorked * 100) / 100,
            overtimeMinutes
          }
        })
        console.log(`Auto checked-out employee ${record.empId}. Hours worked: ${hoursWorked.toFixed(2)}h`)
      }
      console.log('Auto check-out process completed!')
    } catch (error) {
      console.error('Auto check-out scheduler error:', error)
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  })

  console.log('Scheduler started — runs daily at 5:00 PM and 6:00 PM IST')
}

module.exports = startScheduler