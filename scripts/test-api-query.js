require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const tests = await prisma.test.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { evaluations: true } },
    },
  });
  console.log("OK", tests.length, "tests");
}

main()
  .catch((e) => {
    console.error("FAIL", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
