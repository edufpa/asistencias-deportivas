import type { TestCategory } from "@prisma/client";

export type { TestCategory };

export const TEST_CATEGORIES: TestCategory[] = ["FUERZA", "NATACION", "ANTROPOMETRIA"];

export const TEST_CATEGORY_LABELS: Record<TestCategory, string> = {
  FUERZA: "Fuerza",
  NATACION: "Natación",
  ANTROPOMETRIA: "Antropometría",
};

export const TEST_CATEGORY_DESCRIPTIONS: Record<TestCategory, string> = {
  FUERZA: "Pesas, arranque, sentadilla y tests de potencia",
  NATACION: "Tiempos y pruebas acuáticas",
  ANTROPOMETRIA: "Peso corporal, grasa y medidas corporales",
};

export const TEST_CATEGORY_OPTIONS = TEST_CATEGORIES.map((value) => ({
  value,
  label: TEST_CATEGORY_LABELS[value],
  description: TEST_CATEGORY_DESCRIPTIONS[value],
}));

export function isTestCategory(value: string): value is TestCategory {
  return (TEST_CATEGORIES as readonly string[]).includes(value);
}

export function groupTestsByCategory<T extends { category?: TestCategory | null; name: string }>(
  tests: T[]
): { category: TestCategory; label: string; tests: T[] }[] {
  return TEST_CATEGORIES.map((category) => ({
    category,
    label: TEST_CATEGORY_LABELS[category],
    tests: tests
      .filter((t) => (t.category ?? "NATACION") === category)
      .sort((a, b) => a.name.localeCompare(b.name, "es")),
  })).filter((group) => group.tests.length > 0);
}
