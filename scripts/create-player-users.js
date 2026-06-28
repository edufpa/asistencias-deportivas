/**
 * Crea usuario PARENT por jugador: {documentId}@waterpolo.com / 12345
 * Uso: node scripts/create-player-users.js
 */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PASSWORD = "12345";

function playerEmail(documentId) {
  const dni = String(documentId).trim().replace(/\s/g, "");
  return `${dni}@waterpolo.com`.toLowerCase();
}

function playerDisplayName(p) {
  const parts = [p.paternalLastName, p.maternalLastName?.trim(), p.firstName].filter(Boolean);
  return parts.join(" ");
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const players = await prisma.player.findMany({
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
  });

  console.log(`👥 Jugadores en base: ${players.length}`);

  let created = 0;
  let updated = 0;
  let linked = 0;
  const skipped = [];

  for (const player of players) {
    const email = playerEmail(player.documentId);
    if (!email || email === "@waterpolo.com") {
      skipped.push({ name: playerDisplayName(player), reason: "Sin DNI válido" });
      continue;
    }

    const name = playerDisplayName(player);
    const existing = await prisma.user.findUnique({ where: { email } });

    let userId;
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash,
          role: "PARENT",
          accountStatus: "APPROVED",
        },
      });
      userId = existing.id;
      updated++;
      console.log(`  ↻ Actualizado: ${email}`);
    } else {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "PARENT",
          accountStatus: "APPROVED",
        },
      });
      userId = user.id;
      created++;
      console.log(`  + Creado: ${email}`);
    }

    const link = await prisma.userPlayer.findUnique({
      where: { userId_playerId: { userId, playerId: player.id } },
    });

    if (!link) {
      await prisma.userPlayer.create({
        data: { userId, playerId: player.id },
      });
      linked++;
    }
  }

  console.log(`\n✅ Listo: ${created} creados, ${updated} actualizados, ${linked} vínculos nuevos`);
  console.log(`🔑 Contraseña para todos: ${PASSWORD}`);

  if (skipped.length > 0) {
    console.log(`\n⚠️  Omitidos (${skipped.length}):`);
    for (const s of skipped) console.log(`  - ${s.name}: ${s.reason}`);
  }
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
