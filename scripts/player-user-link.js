const bcrypt = require("bcryptjs");

const DEFAULT_PLAYER_ACCOUNT_PASSWORD = "12345";

function playerAccountEmail(documentId) {
  const dni = String(documentId).trim().replace(/\s/g, "");
  return `${dni}@waterpolo.com`.toLowerCase();
}

function playerDisplayName(player) {
  return [player.paternalLastName, player.maternalLastName?.trim(), player.firstName]
    .filter(Boolean)
    .join(" ");
}

async function linkPlayerToUserAccount(prisma, player, options = {}) {
  const email = playerAccountEmail(player.documentId);
  if (!email || email === "@waterpolo.com") {
    return { linked: false, userCreated: false, userUpdated: false };
  }

  const name = playerDisplayName(player);
  let user = await prisma.user.findUnique({ where: { email } });
  let userCreated = false;
  let userUpdated = false;

  if (!user) {
    if (!options.createUserIfMissing) {
      return { linked: false, userCreated: false, userUpdated: false };
    }
    const passwordHash = await bcrypt.hash(
      options.password ?? DEFAULT_PLAYER_ACCOUNT_PASSWORD,
      10
    );
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "PARENT",
        accountStatus: "APPROVED",
      },
    });
    userCreated = true;
  } else {
    const passwordHash = await bcrypt.hash(
      options.password ?? DEFAULT_PLAYER_ACCOUNT_PASSWORD,
      10
    );
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        role: "PARENT",
        accountStatus: "APPROVED",
        passwordHash,
      },
    });
    userUpdated = true;
  }

  const existing = await prisma.userPlayer.findUnique({
    where: { userId_playerId: { userId: user.id, playerId: player.id } },
  });

  if (!existing) {
    await prisma.userPlayer.create({
      data: { userId: user.id, playerId: player.id },
    });
  }

  return { linked: true, userId: user.id, userCreated, userUpdated };
}

async function syncAllPlayerUserLinks(prisma, options = {}) {
  const players = await prisma.player.findMany({
    orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
  });

  let linked = 0;
  let userCreated = 0;
  let userUpdated = 0;
  let skipped = 0;

  for (const player of players) {
    const result = await linkPlayerToUserAccount(prisma, player, options);
    if (result.linked) {
      linked++;
      if (result.userCreated) userCreated++;
      if (result.userUpdated) userUpdated++;
    } else {
      skipped++;
    }
  }

  return { players: players.length, linked, userCreated, userUpdated, skipped };
}

module.exports = {
  DEFAULT_PLAYER_ACCOUNT_PASSWORD,
  playerAccountEmail,
  playerDisplayName,
  linkPlayerToUserAccount,
  syncAllPlayerUserLinks,
};
