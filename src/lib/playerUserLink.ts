import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const DEFAULT_PLAYER_ACCOUNT_PASSWORD = "12345";

export function playerAccountEmail(documentId: string): string {
  const dni = documentId.trim().replace(/\s/g, "");
  return `${dni}@waterpolo.com`.toLowerCase();
}

export function playerDisplayName(player: {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
}): string {
  return [player.paternalLastName, player.maternalLastName?.trim(), player.firstName]
    .filter(Boolean)
    .join(" ");
}

type LinkResult = {
  linked: boolean;
  userId?: string;
  userCreated: boolean;
  userUpdated: boolean;
};

export async function linkPlayerToUserAccount(
  prisma: PrismaClient,
  player: {
    id: string;
    documentId: string;
    firstName: string;
    paternalLastName: string;
    maternalLastName?: string | null;
  },
  options: { createUserIfMissing?: boolean; password?: string } = {}
): Promise<LinkResult> {
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

export async function syncAllPlayerUserLinks(
  prisma: PrismaClient,
  options: { createUserIfMissing?: boolean; password?: string } = {}
) {
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
