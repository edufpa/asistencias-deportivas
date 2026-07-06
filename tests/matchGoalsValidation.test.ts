import { describe, it, expect } from "node:test";
import assert from "node:assert";
import { sumPlayerGoals, validateMatchGoalsAgainstScore } from "../src/lib/matchGoalsValidation";

describe("matchGoalsValidation", () => {
  it("suma goles de todas las filas", () => {
    assert.strictEqual(
      sumPlayerGoals([
        { goals: 2 },
        { goals: 1 },
        { goals: 0 },
      ]),
      3
    );
  });

  it("rechaza cuando los goles superan el marcador", () => {
    const err = validateMatchGoalsAgainstScore([{ goals: 3 }, { goals: 2 }], 4);
    assert.ok(err?.includes("5"));
    assert.ok(err?.includes("4"));
  });

  it("permite cuando los goles son iguales al marcador", () => {
    assert.strictEqual(validateMatchGoalsAgainstScore([{ goals: 2 }, { goals: 2 }], 4), null);
  });

  it("no valida si no hay marcador", () => {
    assert.strictEqual(validateMatchGoalsAgainstScore([{ goals: 10 }], null), null);
  });
});
