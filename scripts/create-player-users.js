/**
 * Vincula usuarios PARENT ({documentId}@waterpolo.com) con jugadores por DNI.
 * Uso: node scripts/create-player-users.js
 */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const {
  DEFAULT_PLAYER_ACCOUNT_PASSWORD,
  syncAllPlayerUserLinks,
} = require("./player-user-link");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await syncAllPlayerUserLinks(prisma, { createUserIfMissing: true });
  console.log(`👥 Jugadores en base: ${result.players}`);
  console.log(`✅ Vinculados: ${result.linked}`);
  console.log(`+ Usuarios creados: ${result.userCreated}`);
  console.log(`↻ Usuarios actualizados: ${result.userUpdated}`);
  console.log(`⚠️  Sin vincular: ${result.skipped}`);
  console.log(`🔑 Contraseña cuenta jugador: ${DEFAULT_PLAYER_ACCOUNT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
