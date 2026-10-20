/**
 * Confusion pairs: two items a learner repeatedly mixes up (e.g. two
 * similar-looking characters). Detected from wrong answers that are the
 * correct answer for another item, and remediated through targeted practice.
 */

export const REMEDIATION_STATUSES = ["open", "improving", "resolved"] as const;
export type RemediationStatus = (typeof REMEDIATION_STATUSES)[number];

export interface ConfusionPairState {
  itemA: string;
  itemB: string;
  errorCount: number;
  /** Correct answers on either item since the last confusion. */
  correctSinceError: number;
  lastSeenAt: Date;
  status: RemediationStatus;
}

export interface ConfusionPolicy {
  /** Errors before a pair is worth targeted practice. */
  minErrorsToRemediate: number;
  /** Correct answers on the pair's items, after the last error, to consider it resolved. */
  correctToResolve: number;
}

export const DEFAULT_CONFUSION_POLICY: ConfusionPolicy = { minErrorsToRemediate: 2, correctToResolve: 4 };

/** Pairs are unordered; store them with a stable order. */
export function pairKey(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function recordConfusion(
  previous: ConfusionPairState | null,
  a: string,
  b: string,
  at: Date,
): ConfusionPairState {
  const [itemA, itemB] = pairKey(a, b);
  return {
    itemA,
    itemB,
    errorCount: (previous?.errorCount ?? 0) + 1,
    correctSinceError: 0,
    lastSeenAt: at,
    status: "open",
  };
}

export function recordPairSuccess(
  previous: ConfusionPairState,
  policy: ConfusionPolicy = DEFAULT_CONFUSION_POLICY,
): ConfusionPairState {
  const correctSinceError = previous.correctSinceError + 1;
  const status: RemediationStatus = correctSinceError >= policy.correctToResolve ? "resolved" : "improving";
  return { ...previous, correctSinceError, status };
}

export function needsRemediation(
  pair: Pick<ConfusionPairState, "errorCount" | "status">,
  policy: ConfusionPolicy = DEFAULT_CONFUSION_POLICY,
): boolean {
  return pair.status !== "resolved" && pair.errorCount >= policy.minErrorsToRemediate;
}
