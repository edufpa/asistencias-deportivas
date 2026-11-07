export const LIVE_CAP_NUMBERS = Array.from({ length: 15 }, (_, i) => i + 1);
export const FOUL_OUT_THRESHOLD = 3;
export const LIVE_QUARTERS = [1, 2, 3, 4] as const;

export type LiveTeam = "BLUE" | "WHITE";
export type LiveEventType = "GOAL" | "EXPULSION" | "PENALTY";

export type LiveEventRecord = {
  id: string;
  team: LiveTeam;
  capNumber: number;
  eventType: LiveEventType;
  quarter: number;
  undone: boolean;
  createdAt: string | Date;
  createdBy?: { id: string; name: string } | null;
};

export type CapLiveState = {
  capNumber: number;
  goals: number;
  expulsions: number;
  penalties: number;
  /** Expulsión + penal cuentan hacia las 3 faltas */
  foulCount: number;
  fouledOut: boolean;
};

export type TeamLiveState = {
  team: LiveTeam;
  score: number;
  caps: CapLiveState[];
};

export type MatchLiveBoard = {
  blue: TeamLiveState;
  white: TeamLiveState;
  events: LiveEventRecord[];
};

export function emptyCapState(capNumber: number): CapLiveState {
  return {
    capNumber,
    goals: 0,
    expulsions: 0,
    penalties: 0,
    foulCount: 0,
    fouledOut: false,
  };
}

export function buildTeamState(
  team: LiveTeam,
  events: LiveEventRecord[]
): TeamLiveState {
  const caps = LIVE_CAP_NUMBERS.map(emptyCapState);
  let score = 0;

  for (const event of events) {
    if (event.undone || event.team !== team) continue;
    const cap = caps[event.capNumber - 1];
    if (!cap) continue;

    if (event.eventType === "GOAL") {
      cap.goals += 1;
      score += 1;
    } else if (event.eventType === "EXPULSION") {
      cap.expulsions += 1;
    } else if (event.eventType === "PENALTY") {
      cap.penalties += 1;
    }

    cap.foulCount = cap.expulsions + cap.penalties;
    cap.fouledOut = cap.foulCount >= FOUL_OUT_THRESHOLD;
  }

  return { team, score, caps };
}

export function buildLiveBoard(events: LiveEventRecord[]): MatchLiveBoard {
  const active = events.filter((e) => !e.undone);
  return {
    blue: buildTeamState("BLUE", active),
    white: buildTeamState("WHITE", active),
    events: [...events].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  };
}

export function isValidCapNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 15
  );
}

export function isValidLiveTeam(value: unknown): value is LiveTeam {
  return value === "BLUE" || value === "WHITE";
}

export function isValidLiveEventType(value: unknown): value is LiveEventType {
  return value === "GOAL" || value === "EXPULSION" || value === "PENALTY";
}

export function isValidQuarter(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 4
  );
}

export const LIVE_EVENT_LABELS: Record<LiveEventType, string> = {
  GOAL: "Gol",
  EXPULSION: "Expulsión",
  PENALTY: "Penal",
};

export const LIVE_TEAM_LABELS: Record<LiveTeam, string> = {
  BLUE: "Azul",
  WHITE: "Blanco",
};
