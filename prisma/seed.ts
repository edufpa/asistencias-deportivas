import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@asistencias.com" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@asistencias.com",
      passwordHash: hash,
      role: "SUPER_ADMIN",
    },
  });

  console.log("✅ Usuario admin creado:", admin.email);
  console.log("🔑 Contraseña inicial: admin123");
  console.log("⚠️  IMPORTANTE: Cambiar la contraseña después del primer login.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
