const cron = require('node-cron')
const prisma = require('./prismaClient')

const startScheduler = () => {
   cron.schedule('0 17 * * *', async () => {
    console.log('Running end-of-day absent check...')

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get all employees
      const employees = await prisma.employee.findMany()

      for (const employee of employees) {
        // Check if already has attendance today
        const existing = await prisma.attendance.findFirst({
          where: {
            empId: employee.empId,
            timestamp: { gte: today }
          }
        })

        if (!existing) {
          // Check if on approved leave today
          const onLeave = await prisma.leaveRequest.findFirst({
            where: {
              empId: employee.empId,
              status: 'Approved',
              date: { gte: today }
            }
          })

          // Mark as absent or on leave
          await prisma.attendance.create({
            data: {
              empId: employee.empId,
              status: onLeave ? 'On Leave' : 'Absent'
            }
          })

          console.log(`Marked ${employee.empId} as ${onLeave ? 'On Leave' : 'Absent'}`)
        }
      }

      console.log('End-of-day check complete!')
    } catch (error) {
      console.error('Scheduler error:', error)
    }
  })

  // Auto check-out at 6:00 PM (18:00) IST
  cron.schedule('0 18 * * *', async () => {
    console.log('Running auto check-out at 6:00 PM...')
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Find all check-ins for today that do not have a check-out time
      const records = await prisma.attendance.findMany({
        where: {
          timestamp: { gte: today },
          checkInTime: { not: null },
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

      const autoCheckOutTime = new Date()
      autoCheckOutTime.setHours(18, 0, 0, 0) // 6:00 PM local time

      for (const record of records) {
        const checkIn = new Date(record.checkInTime)
        const diffMs = autoCheckOutTime - checkIn
        const hoursWorked = Math.max(0, diffMs / (1000 * 60 * 60))
        const overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)

        await prisma.attendance.update({
          where: { id: record.id },
          data: {
            checkOutTime: autoCheckOutTime,
            hoursWorked,
            overtimeMinutes
          }
        })
        console.log(`Auto checked-out employee ${record.empId}. Hours worked: ${hoursWorked.toFixed(2)}h`)
      }
      console.log('Auto check-out process completed!')
    } catch (error) {
      console.error('Auto check-out scheduler error:', error)
    }
  })

  console.log('Scheduler started — runs daily at 5:00 PM and 6:00 PM')
}

module.exports = startScheduler