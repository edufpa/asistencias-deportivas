type NameParts = {
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string | null;
};

export function formatPlayerName(p: NameParts): string {
  const maternal = p.maternalLastName?.trim();
  return maternal
    ? `${p.paternalLastName}, ${p.firstName} ${maternal}`
    : `${p.paternalLastName}, ${p.firstName}`;
}

export function json(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
