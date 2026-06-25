require('dotenv').config();
const prisma = require('./prismaClient');
async function main() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  console.log('--- LATEST 20 ACTIVITY LOGS ---');
  console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
