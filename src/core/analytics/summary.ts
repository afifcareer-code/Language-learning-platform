import { MASTERY_STATES, type MasteryState } from "../mastery/mastery";

export type MasteryDistribution = Record<MasteryState, number>;

/** Count items in each mastery state. Items without a record count as not started. */
export function masteryDistribution(
  states: readonly MasteryState[],
  totalItems: number = states.length,
): MasteryDistribution {
  const dist = Object.fromEntries(MASTERY_STATES.map((s) => [s, 0])) as MasteryDistribution;
  for (const s of states) dist[s] += 1;
  dist.not_started += Math.max(0, totalItems - states.length);
  return dist;
}

/** Accuracy over a set of attempts, or null when there is no evidence. */
export function attemptAccuracy(attempts: readonly { correct: boolean }[]): number | null {
  if (attempts.length === 0) return null;
  return attempts.filter((a) => a.correct).length / attempts.length;
}
