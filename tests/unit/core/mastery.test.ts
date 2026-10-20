import { describe, expect, it } from "vitest";
import {
  accuracy,
  applyAttempt,
  currentMasteryState,
  EMPTY_MASTERY,
  type MasteryRecord,
} from "@/core/mastery";
import { LeitnerScheduler, type ReviewState } from "@/core/review";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-01-01T09:00:00Z");
const scheduler = new LeitnerScheduler();

function run(answers: { correct: boolean; at: Date }[]) {
  let record: MasteryRecord = EMPTY_MASTERY;
  let review: ReviewState | null = null;
  for (const a of answers) {
    const outcome = { correct: a.correct, score: a.correct ? 1 : 0, at: a.at };
    review = scheduler.next(review, outcome);
    record = applyAttempt(record, outcome, review);
  }
  return { record, review: review! };
}

describe("mastery", () => {
  it("is not started without evidence", () => {
    expect(EMPTY_MASTERY.state).toBe("not_started");
    expect(accuracy(EMPTY_MASTERY)).toBeNull();
  });

  it("does not reach proficiency by cramming in one session", () => {
    const answers = Array.from({ length: 10 }, (_, i) => ({
      correct: true,
      at: new Date(t0.getTime() + i * 60_000),
    }));
    expect(run(answers).record.state).toBe("practicing");
  });

  it("reaches proficient and mastered only through spaced, on-time recall", () => {
    const answers: { correct: boolean; at: Date }[] = [{ correct: true, at: t0 }];
    let { review } = run(answers);
    const states: string[] = [];
    for (let i = 0; i < 5; i++) {
      answers.push({ correct: true, at: review.dueAt });
      const r = run(answers);
      review = r.review;
      states.push(r.record.state);
    }
    expect(states).toContain("proficient");
    expect(states.at(-1)).toBe("mastered");
  });

  it("marks an established item as needing review after a miss", () => {
    const answers: { correct: boolean; at: Date }[] = [{ correct: true, at: t0 }];
    for (let i = 0; i < 3; i++) answers.push({ correct: true, at: run(answers).review.dueAt });
    expect(run(answers).record.state).toBe("proficient");
    answers.push({ correct: false, at: run(answers).review.dueAt });
    expect(run(answers).record.state).toBe("needs_review");
  });

  it("decays an established item to needs_review when long overdue", () => {
    const answers: { correct: boolean; at: Date }[] = [{ correct: true, at: t0 }];
    for (let i = 0; i < 3; i++) answers.push({ correct: true, at: run(answers).review.dueAt });
    const { record, review } = run(answers);
    expect(currentMasteryState(record, review, review.dueAt)).toBe("proficient");
    const later = new Date(review.dueAt.getTime() + (review.intervalDays + 1) * DAY);
    expect(currentMasteryState(record, review, later)).toBe("needs_review");
  });
});
