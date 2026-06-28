import { toDateOnlyString } from "@/lib/sessionDate";

type EvalWithDate = { evalDate: Date | string };

export function serializeEvaluation<T extends EvalWithDate>(ev: T): T & { evalDate: string } {
  return {
    ...ev,
    evalDate: toDateOnlyString(ev.evalDate) ?? String(ev.evalDate),
  };
}

export function serializeEvaluations<T extends EvalWithDate>(items: T[]): (T & { evalDate: string })[] {
  return items.map(serializeEvaluation);
}
