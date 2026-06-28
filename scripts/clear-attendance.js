require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [records, sessions] = await prisma.$transaction([
    prisma.attendanceRecord.deleteMany({}),
    prisma.attendanceSession.deleteMany({}),
  ]);

  console.log(`Eliminados ${records.count} registros de asistencia`);
  console.log(`Eliminadas ${sessions.count} sesiones de asistencia`);
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
