const prisma = require('../prismaClient')
const logActivity = require('../utils/activityLogger')

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    let settings = await prisma.officeSetting.findFirst()
    if (!settings) {
      settings = await prisma.officeSetting.create({ data: {} })
    }
    res.json(settings)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
}

// PATCH /api/settings
const updateSettings = async (req, res) => {
  try {
    const {
      checkInTime,
      checkOutTime,
      lateAfter,
      halfDayBefore,
      workingDays,
      officeName,
      officeAddress,
      officePhone,
      officeEmail,
    } = req.body

    const timeFields = { checkInTime, checkOutTime, lateAfter, halfDayBefore }
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/
    for (const [key, val] of Object.entries(timeFields)) {
      if (val && !timeRegex.test(val)) {
        return res.status(400).json({ error: `Invalid time format for ${key}. Use HH:MM (24hr).` })
      }
    }

    const existing = await prisma.officeSetting.findFirst()

    let settings
    if (existing) {
      settings = await prisma.officeSetting.update({
        where: { id: existing.id },
        data: {
          ...(checkInTime   !== undefined && { checkInTime }),
          ...(checkOutTime  !== undefined && { checkOutTime }),
          ...(lateAfter     !== undefined && { lateAfter }),
          ...(halfDayBefore !== undefined && { halfDayBefore }),
          ...(workingDays   !== undefined && { workingDays }),
          ...(officeName    !== undefined && { officeName }),
          ...(officeAddress !== undefined && { officeAddress }),
          ...(officePhone   !== undefined && { officePhone }),
          ...(officeEmail   !== undefined && { officeEmail }),
        },
      })
    } else {
      settings = await prisma.officeSetting.create({
        data: {
          checkInTime:   checkInTime   || '09:30',
          checkOutTime:  checkOutTime  || '17:30',
          lateAfter:     lateAfter     || '10:15',
          halfDayBefore: halfDayBefore || '13:00',
          workingDays:   workingDays   || 'Mon,Tue,Wed,Thu,Fri,Sat',
          officeName:    officeName    || 'HPS Pvt Ltd',
          officeAddress: officeAddress || '',
          officePhone:   officePhone   || '',
          officeEmail:   officeEmail   || '',
        },
      })
    }

    // Build a human-readable summary of what changed
    const changed = []
    if (checkInTime)   changed.push(`Check-in: ${checkInTime}`)
    if (lateAfter)     changed.push(`Late after: ${lateAfter}`)
    if (checkOutTime)  changed.push(`Check-out: ${checkOutTime}`)
    if (workingDays)   changed.push(`Working days: ${workingDays}`)
    if (officeName)    changed.push(`Office: ${officeName}`)
    if (officeAddress) changed.push(`Address updated`)
    if (officePhone)   changed.push(`Phone: ${officePhone}`)
    if (officeEmail)   changed.push(`Email: ${officeEmail}`)

    await logActivity({
      empId: null,
      employeeName: 'Admin',
      action: 'Settings Updated',
      category: 'ADMIN',
      details: changed.length > 0 ? changed.join(' · ') : 'Office settings saved'
    })

    res.json({ message: 'Settings saved successfully', settings })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
}

module.exports = { getSettings, updateSettings }