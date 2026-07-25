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

const performAbsentCheck = async (now) => {
  const todayStart = getISTDayStart(now)
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  // 1. Fetch office settings and check if today is a weekend
  const settings = await prisma.officeSetting.findFirst()
  const workingDaysStr = settings?.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat'
  
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const workingDayNums = workingDaysStr.split(',').map(d => dayMap[d.trim()]).filter(v => v !== undefined)
  
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000)
  const istDate = new Date(istMs)
  const dayOfWeek = istDate.getUTCDay()
  
  if (!workingDayNums.includes(dayOfWeek)) {
    console.log(`Skipping absent check: day is a weekend (${istDate.toUTCString()})`)
    return
  }

  // 2. Check if today is a holiday
  const holiday = await prisma.holiday.findFirst({
    where: {
      date: {
        gte: todayStart,
        lt: todayEnd
      }
    }
  })
  if (holiday) {
    console.log(`Skipping absent check: today is a holiday - ${holiday.name} (${istDate.toUTCString()})`)
    return
  }

  // 3. Process all employees
  const employees = await prisma.employee.findMany()

  for (const employee of employees) {
    // Check if employee already has attendance record for today (either check-in or timestamp)
    const existing = await prisma.attendance.findFirst({
      where: {
        empId: employee.empId,
        OR: [
          { checkInTime: { gte: todayStart, lt: todayEnd } },
          { timestamp: { gte: todayStart, lt: todayEnd } }
        ]
      }
    })

    if (!existing) {
      // Check if on approved leave today
      const onLeave = await prisma.leaveRequest.findFirst({
        where: {
          empId: employee.empId,
          status: 'Approved',
          OR: [
            {
              fromDate: { lt: todayEnd },
              toDate: { gte: todayStart }
            },
            {
              date: {
                gte: todayStart,
                lt: todayEnd
              }
            }
          ]
        }
      })

      // Mark as absent or actual leave type
      await prisma.attendance.create({
        data: {
          empId: employee.empId,
          status: onLeave ? (onLeave.type || 'On Leave') : 'Absent',
          checkInTime: null,
          checkOutTime: null,
          timestamp: todayStart
        }
      })

      console.log(`Marked ${employee.empId} as ${onLeave ? (onLeave.type || 'On Leave') : 'Absent'}`)
    }
  }
}

const backfillAbsentRecords = async () => {
  console.log('Running startup backfill for past finished days...')
  try {
    const oldestEmp = await prisma.employee.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!oldestEmp) {
      console.log('No employees found, skipping backfill.')
      return
    }

    const settings = await prisma.officeSetting.findFirst()
    const workingDaysStr = settings?.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat'
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
    const workingDayNums = workingDaysStr.split(',').map(d => dayMap[d.trim()]).filter(v => v !== undefined)

    const start = getISTDayStart(new Date(oldestEmp.createdAt))
    const now = new Date()
    const todayStart = getISTDayStart(now)

    let current = new Date(start.getTime())
    let count = 0

    while (current < todayStart) {
      const dayStart = new Date(current.getTime())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const istMs = dayStart.getTime() + (5.5 * 60 * 60 * 1000)
      const istDate = new Date(istMs)
      const dayOfWeek = istDate.getUTCDay()

      if (!workingDayNums.includes(dayOfWeek)) {
        current.setTime(current.getTime() + 24 * 60 * 60 * 1000)
        continue
      }

      // Check holiday
      const holiday = await prisma.holiday.findFirst({
        where: {
          date: { gte: dayStart, lt: dayEnd }
        }
      })
      if (holiday) {
        current.setTime(current.getTime() + 24 * 60 * 60 * 1000)
        continue
      }

      const employees = await prisma.employee.findMany()
      for (const employee of employees) {
        if (new Date(employee.createdAt) > dayEnd) {
          continue
        }

        const existing = await prisma.attendance.findFirst({
          where: {
            empId: employee.empId,
            OR: [
              { checkInTime: { gte: dayStart, lt: dayEnd } },
              { timestamp: { gte: dayStart, lt: dayEnd } }
            ]
          }
        })

        if (!existing) {
          // Check approved leave
          const onLeave = await prisma.leaveRequest.findFirst({
            where: {
              empId: employee.empId,
              status: 'Approved',
              OR: [
                {
                  fromDate: { lt: dayEnd },
                  toDate: { gte: dayStart }
                },
                {
                  date: { gte: dayStart, lt: dayEnd }
                }
              ]
            }
          })

          await prisma.attendance.create({
            data: {
              empId: employee.empId,
              status: onLeave ? (onLeave.type || 'On Leave') : 'Absent',
              checkInTime: null,
              checkOutTime: null,
              timestamp: dayStart
            }
          })
          count++
        }
      }

      current.setTime(current.getTime() + 24 * 60 * 60 * 1000)
    }

    if (count > 0) {
      console.log(`Startup backfill completed! Created ${count} absent/on-leave records.`)
    } else {
      console.log('Startup backfill completed! No records needed backfilling.')
    }
  } catch (error) {
    console.error('Error during startup backfill:', error)
  }
}

const startScheduler = () => {
  // End-of-day absent check at 11:59 PM IST
  cron.schedule('59 23 * * *', async () => {
    console.log('Running end-of-day absent check...')
    try {
      await performAbsentCheck(new Date())
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

  console.log('Scheduler started — runs daily at 6:00 PM (auto check-out) and 11:59 PM (absent check) IST')

  // Run startup backfill asynchronously so it doesn't block startup
  backfillAbsentRecords()
}

startScheduler.performAbsentCheck = performAbsentCheck
startScheduler.getISTDayStart = getISTDayStart
module.exports = startScheduler