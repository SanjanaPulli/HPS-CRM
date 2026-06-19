const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})

const prisma = new PrismaClient({ adapter })

prisma.$connect()
  .then(() => console.log('✅ Prisma connected'))
  .catch(err => console.error('❌ Prisma connection error', err))

module.exports = prisma