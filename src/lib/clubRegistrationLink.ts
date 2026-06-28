import { prisma } from "@/lib/prisma";
import { buildRegistrationUrl } from "@/lib/registration";

const CLUB_LINK_ID = "club";

export async function getOrCreateClubRegistrationLink() {
  return prisma.clubRegistrationLink.upsert({
    where: { id: CLUB_LINK_ID },
    create: { id: CLUB_LINK_ID },
    update: {},
  });
}

export async function getClubRegistrationUrl(origin?: string) {
  const link = await getOrCreateClubRegistrationLink();
  return {
    token: link.token,
    url: buildRegistrationUrl(link.token, origin),
    updatedAt: link.updatedAt,
  };
}

export async function regenerateClubRegistrationLink() {
  const { randomUUID } = await import("crypto");
  return prisma.clubRegistrationLink.upsert({
    where: { id: CLUB_LINK_ID },
    create: { id: CLUB_LINK_ID, token: randomUUID() },
    update: { token: randomUUID() },
  });
}

export async function isValidClubRegistrationToken(token: string): Promise<boolean> {
  const link = await prisma.clubRegistrationLink.findUnique({ where: { token } });
  return !!link;
}
