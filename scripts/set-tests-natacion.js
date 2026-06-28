require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.test.updateMany({
    data: { category: "NATACION" },
  });
  console.log(`Actualizados ${result.count} tests a categoría NATACION`);
  const tests = await prisma.test.findMany({ select: { id: true, name: true, category: true } });
  console.log(JSON.stringify(tests, null, 2));
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
