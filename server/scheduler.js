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

  console.log('Scheduler started — runs daily at 5:00 PM')
}

module.exports = startScheduler