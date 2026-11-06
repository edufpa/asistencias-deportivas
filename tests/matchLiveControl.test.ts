import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLiveBoard,
  FOUL_OUT_THRESHOLD,
  type LiveEventRecord,
} from "../src/lib/matchLiveControl";

function ev(
  partial: Partial<LiveEventRecord> &
    Pick<LiveEventRecord, "id" | "team" | "capNumber" | "eventType">
): LiveEventRecord {
  return {
    quarter: 1,
    undone: false,
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("matchLiveControl", () => {
  it("counts goals on the scoreboard by team", () => {
    const board = buildLiveBoard([
      ev({ id: "1", team: "BLUE", capNumber: 14, eventType: "GOAL" }),
      ev({ id: "2", team: "BLUE", capNumber: 7, eventType: "GOAL" }),
      ev({ id: "3", team: "WHITE", capNumber: 4, eventType: "GOAL" }),
    ]);
    assert.equal(board.blue.score, 2);
    assert.equal(board.white.score, 1);
    assert.equal(board.blue.caps[13].goals, 1);
  });

  it("counts expulsion and penalty toward foul-out at 3", () => {
    const board = buildLiveBoard([
      ev({ id: "1", team: "WHITE", capNumber: 10, eventType: "EXPULSION" }),
      ev({ id: "2", team: "WHITE", capNumber: 10, eventType: "PENALTY" }),
      ev({ id: "3", team: "WHITE", capNumber: 10, eventType: "EXPULSION" }),
    ]);
    const cap = board.white.caps[9];
    assert.equal(cap.foulCount, FOUL_OUT_THRESHOLD);
    assert.equal(cap.fouledOut, true);
    assert.equal(cap.expulsions, 2);
    assert.equal(cap.penalties, 1);
  });

  it("ignores undone events", () => {
    const board = buildLiveBoard([
      ev({ id: "1", team: "BLUE", capNumber: 1, eventType: "GOAL", undone: true }),
      ev({ id: "2", team: "BLUE", capNumber: 1, eventType: "GOAL" }),
    ]);
    assert.equal(board.blue.score, 1);
  });
});
