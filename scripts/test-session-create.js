require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const sessionDate = "2026-06-27";
  const sessionType = "TURNO_MANANA";
  const category = "SUB16";

  const admin = await prisma.user.findFirst({ where: { email: "admin@asistencias.com" } });
  console.log("Admin user:", admin?.id, admin?.role);

  const existing = await prisma.attendanceSession.findUnique({
    where: {
      category_sessionDate_sessionType: {
        category,
        sessionDate: new Date(sessionDate),
        sessionType,
      },
    },
  });
  console.log("Existing session:", existing);

  const all = await prisma.attendanceSession.findMany({
    where: { category, sessionType },
    orderBy: { sessionDate: "desc" },
    take: 5,
  });
  console.log(
    "Recent SUB16 TURNO_MANANA sessions:",
    all.map((s) => ({
      id: s.id,
      sessionDate: s.sessionDate.toISOString(),
      split: s.sessionDate.toISOString().split("T")[0],
    }))
  );

  if (!admin) return;

  try {
    const created = await prisma.attendanceSession.create({
      data: {
        category,
        sessionDate: new Date(sessionDate),
        sessionType,
        createdById: admin.id,
      },
    });
    console.log("Created:", created.id);
    await prisma.attendanceSession.delete({ where: { id: created.id } });
    console.log("Cleaned up test session");
  } catch (e) {
    console.error("Create error:", e.code, e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
