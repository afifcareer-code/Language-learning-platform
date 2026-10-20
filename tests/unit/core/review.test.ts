import { describe, expect, it } from "vitest";
import { isDue, LeitnerScheduler, overdueRatio } from "@/core/review";

const DAY = 24 * 60 * 60 * 1000;
const t0 = new Date("2026-01-01T09:00:00Z");
const at = (days: number) => new Date(t0.getTime() + days * DAY);

describe("LeitnerScheduler", () => {
  const scheduler = new LeitnerScheduler([0.01, 1, 3, 7]);

  it("starts a correct first attempt in box 1", () => {
    const s = scheduler.next(null, { correct: true, score: 1, at: t0 });
    expect(s.stage).toBe(1);
    expect(s.dueAt).toEqual(at(1));
    expect(s.reviews).toBe(1);
  });

  it("starts an incorrect first attempt in box 0 without a lapse", () => {
    const s = scheduler.next(null, { correct: false, score: 0, at: t0 });
    expect(s.stage).toBe(0);
    expect(s.lapses).toBe(0);
  });

  it("promotes only when reviewed on or after the due date", () => {
    const s1 = scheduler.next(null, { correct: true, score: 1, at: t0 });
    const early = scheduler.next(s1, { correct: true, score: 1, at: at(0.5) });
    expect(early.stage).toBe(1);
    expect(early.dueAt).toEqual(s1.dueAt);
    const onTime = scheduler.next(early, { correct: true, score: 1, at: at(1) });
    expect(onTime.stage).toBe(2);
    expect(onTime.intervalDays).toBe(3);
  });

  it("drops to box 0 and counts a lapse on failure", () => {
    const s1 = scheduler.next(null, { correct: true, score: 1, at: t0 });
    const failed = scheduler.next(s1, { correct: false, score: 0, at: at(1) });
    expect(failed.stage).toBe(0);
    expect(failed.lapses).toBe(1);
  });

  it("caps at the last box", () => {
    let s = scheduler.next(null, { correct: true, score: 1, at: t0 });
    for (let i = 0; i < 10; i++) s = scheduler.next(s, { correct: true, score: 1, at: s.dueAt });
    expect(s.stage).toBe(3);
  });

  it("reports due and overdue state", () => {
    const s = { dueAt: at(1), intervalDays: 1 };
    expect(isDue(s, t0)).toBe(false);
    expect(isDue(s, at(1))).toBe(true);
    expect(overdueRatio(s, at(3))).toBeCloseTo(2);
  });
});
