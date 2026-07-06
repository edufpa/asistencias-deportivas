import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(rootDir, ".env") });
config({ path: resolve(rootDir, ".env.local") });

function createPrismaClient() {
  const connectionString = (process.env.DATABASE_URL ?? "").replace(/\r?\n/g, "").trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL no está configurada. Define la variable en asistencias/.env");
  }

  const pool = new Pool({ connectionString, max: 3 });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = createPrismaClient();

export async function disconnectDb() {
  await prisma.$disconnect();
}
