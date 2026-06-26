const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

prisma.$connect()
  .then(() => console.log('✅ Prisma connected via adapter'))
  .catch(err => console.error('❌ Prisma connection error', err))

module.exports = prisma