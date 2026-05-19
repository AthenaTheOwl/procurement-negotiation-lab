import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearStreak, emptyStreak, loadStreak, touchStreak } from "./streak";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  clearStreak();
});

describe("streak", () => {
  it("emptyStreak is current=0 longest=0", () => {
    const s = emptyStreak();
    expect(s.current).toBe(0);
    expect(s.longest).toBe(0);
  });

  it("touchStreak from empty sets current to 1", () => {
    const s = touchStreak(new Date("2026-05-19T08:00:00Z"));
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
  });

  it("touching the same day twice does not double-count", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    const s = touchStreak(new Date("2026-05-19T20:00:00Z"));
    expect(s.current).toBe(1);
  });

  it("touching the next day increments the streak", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    const s = touchStreak(new Date("2026-05-20T08:00:00Z"));
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it("touching after a 2-day gap resets current to 1; longest persists", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    touchStreak(new Date("2026-05-20T08:00:00Z"));
    touchStreak(new Date("2026-05-21T08:00:00Z"));
    const s = touchStreak(new Date("2026-05-25T08:00:00Z"));
    expect(s.current).toBe(1);
    expect(s.longest).toBe(3);
  });

  it("loadStreak lazily decays current to 0 if last touch was >1 day ago", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    const stale = loadStreak(new Date("2026-05-25T08:00:00Z"));
    expect(stale.current).toBe(0);
    expect(stale.longest).toBe(1); // longest preserved
  });

  it("loadStreak returns current as-is when last touch was today or yesterday", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    const today = loadStreak(new Date("2026-05-19T22:00:00Z"));
    expect(today.current).toBe(1);
    const yesterday = loadStreak(new Date("2026-05-20T08:00:00Z"));
    expect(yesterday.current).toBe(1);
  });

  it("clearStreak resets the storage", () => {
    touchStreak(new Date("2026-05-19T08:00:00Z"));
    clearStreak();
    expect(loadStreak(new Date("2026-05-19T08:00:00Z"))).toEqual(emptyStreak());
  });
});
