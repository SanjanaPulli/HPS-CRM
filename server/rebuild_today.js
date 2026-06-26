require('dotenv').config()
const prisma = require('./prismaClient')

async function rebuildTodayAttendance() {
  console.log('Starting today\'s specific attendance rebuild based on manual admin logs...')

  // 1. Define start/end boundary of today in IST matching 2026-06-26
  const startToday = new Date('2026-06-26T00:00:00+05:30')
  const endToday   = new Date('2026-06-26T23:59:59+05:30')

  // Clear existing attendance records for today ONLY
  const deleted = await prisma.attendance.deleteMany({
    where: {
      checkInTime: {
        gte: startToday,
        lt: endToday
      }
    }
  })
  console.log(`Deleted ${deleted.count} existing records for today (2026-06-26) to prepare for clean sync.`)

  // 2. We define the check-ins based exactly on the original timeline screenshot:
  // - Amrutha Adabala (HPS260036) Check-In: 09:40:38 am -> Status: Present
  // - CH PRUDHVI RAJ (HPS250027) Check-In: 09:41:29 am -> Status: Present (Edited to Present)
  // - Palakonda Aswinsai (HPS250028) Check-In: 09:41:46 am -> Status: Present (Edited to Present)
  // - SOWSHEEL PATNANA (HPS250025) Check-In: 09:42:03 am -> Status: Present
  // - SUTHAPALLI THANUSRI (HPS250029) Check-In: 09:42:12 am -> Status: Present (Edited to Present)
  // - SAGARIKA KUMARI SWAIN (HPS260033) Check-In: 09:43:02 am -> Status: Present (Edited to Present)
  // - K. V RAHUL VARMA (HPS250026) Check-In: 10:20:10 am -> Status: Late (Edited to Late)
  // - Dipika Reddy Ragipindi (HPS260038) Approved WFH -> Status: WFH (Leave table covers this)
  // - G. Sai Srujana (HPS260039) Approved WFH -> Status: WFH (Leave table covers this)
  // - Sanjana Pulli (HPS260037) Approved WFH -> Status: WFH (Leave table covers this)

  const originalCheckIns = [
    { empId: 'HPS260036', timeStr: '09:40:38', status: 'Present' },
    { empId: 'HPS250027', timeStr: '09:41:29', status: 'Present' },
    { empId: 'HPS250028', timeStr: '09:41:46', status: 'Present' },
    { empId: 'HPS250025', timeStr: '09:42:03', status: 'Present' },
    { empId: 'HPS250029', timeStr: '09:42:12', status: 'Present' },
    { empId: 'HPS260033', timeStr: '09:43:02', status: 'Present' },
    { empId: 'HPS250026', timeStr: '10:20:10', status: 'Late' }
  ]

  for (const c of originalCheckIns) {
    const checkInDateTime = new Date(`2026-06-26T${c.timeStr}+05:30`)
    
    // Default check-out time based on your screenshots is 01:53 pm (13:53:00 IST)
    const checkOutDateTime = new Date('2026-06-26T13:53:00+05:30')
    const diffMs = checkOutDateTime.getTime() - checkInDateTime.getTime()
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
    const standardHours = 8
    const overtimeMinutes = Math.round((hoursWorked - standardHours) * 60)

    await prisma.attendance.create({
      data: {
        empId: c.empId,
        status: c.status,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
        timestamp: checkInDateTime,
        hoursWorked: hoursWorked,
        overtimeMinutes: overtimeMinutes
      }
    })
    console.log(`Successfully restored check-in & check-out logs for ${c.empId} (Status: ${c.status})`)
  }

  console.log('Today\'s records successfully rebuilt from original times!')
}

rebuildTodayAttendance()
  .catch(e => console.error('Rebuild failed:', e))
  .finally(() => prisma.$disconnect())
