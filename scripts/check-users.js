const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

prisma.user.findMany({ select: { id: true, email: true, name: true } })
  .then(users => { console.log('Users:', JSON.stringify(users)); })
  .catch(e => { console.error('Error:', e.message); })
  .finally(() => prisma.$disconnect());
