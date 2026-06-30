const prisma = require('./prismaClient')
const { generateBarcodeId } = require('./barcodeHelper')

const employees = [
  { empId: 'HPS250025', name: 'SOWSHEEL PATNANA',        position: 'Innovation Manager',        department: 'Engineering' },
  { empId: 'HPS250026', name: 'K. V RAHUL VARMA',        position: 'UI/UX Designer',            department: 'HR' },
  { empId: 'HPS250027', name: 'CH PRUDHVI RAJ',          position: 'Computer Research Analyst',  department: 'Sales' },
  { empId: 'HPS250028', name: 'PALAKONDA ASWINSAI',      position: 'Tech Lead',                 department: 'Marketing' },
  { empId: 'HPS250029', name: 'SUTHAPALLI THANUSRI',     position: 'Product Designer',          department: 'Finance' },
  { empId: 'HPS260032', name: 'VIVEK VARDHAN VANDANA',   position: 'Associate SDE',             department: 'Engineering' },
  { empId: 'HPS260033', name: 'SAGARIKA KUMARI SWAIN',   position: 'SDE Intern',                department: 'IT' },
  { empId: 'HPS260034', name: 'J HARIKA',                position: 'SDE Intern',                department: 'HR' },
  { empId: 'HPS260035', name: 'VANA BHARGAV PRASAD',     position: 'Associate SDE',             department: 'Sales' },
  { empId: 'HPS260036', name: 'AMRUTHA ADABALA',         position: 'SDE Intern',                department: 'Marketing' },
  { empId: 'HPS260037', name: 'SANJANA PULLI',           position: 'SDE Intern',                department: 'Engineering' },
]

async function main() {
  console.log('🌱 Seeding employees...\n')

  for (const emp of employees) {
    const barcodeId = generateBarcodeId(emp.empId)

    const result = await prisma.employee.upsert({
      where: { empId: emp.empId },
      update: {
        name: emp.name,
        position: emp.position,
        department: emp.department,
        barcodeId,
      },
      create: {
        empId: emp.empId,
        name: emp.name,
        position: emp.position,
        department: emp.department,
        barcodeId,
        password: 'hps@1234',
        salary: 'Not Disclosed',
      },
    })

    console.log(` ${result.empId} — ${result.name} (${result.position}) | Barcode: ${barcodeId}`)
  }

  console.log('\n🎉 Done! All employees seeded.')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())