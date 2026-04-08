const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const NEW_PASSWORD = 'TestPass1234!';

async function main() {
  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  const user = await prisma.user.update({
    where: { email: 'site.eduardo@gmail.com' },
    data: { passwordHash: hash },
    select: { id: true, email: true, name: true }
  });
  console.log('Password reset for:', user);
  console.log('New password:', NEW_PASSWORD);
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
