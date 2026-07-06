export function formatPlayerName(p: {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
}): string {
  const maternal = p.maternalLastName?.trim();
  return maternal
    ? `${p.paternalLastName}, ${p.firstName} ${maternal}`
    : `${p.paternalLastName}, ${p.firstName}`;
}
