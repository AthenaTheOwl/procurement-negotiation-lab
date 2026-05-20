import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canEnter,
  clearProgress,
  emptyProgress,
  loadProgress,
  markComplete,
  nextUnlocked,
  saveProgress,
  setLastSeen,
  TOTAL_LEVELS,
} from "./learnProgress";

beforeEach(() => {
  clearProgress();
});
afterEach(() => {
  clearProgress();
});

describe("learnProgress", () => {
  it("returns empty progress when localStorage is fresh", () => {
    expect(loadProgress()).toEqual(emptyProgress());
  });

  it("round-trips through save + load", () => {
    const before = emptyProgress();
    const after = markComplete(before, 1);
    saveProgress(after);
    const loaded = loadProgress();
    expect(loaded.highest_completed).toBe(1);
    expect(loaded.completion_timestamps[1]).toBeTypeOf("string");
    expect(loaded.last_seen_level).toBe(2);
  });

  it("markComplete advances highest_completed monotonically", () => {
    let state = emptyProgress();
    state = markComplete(state, 3);
    expect(state.highest_completed).toBe(3);
    state = markComplete(state, 2);
    expect(state.highest_completed).toBe(3);
    state = markComplete(state, 5);
    expect(state.highest_completed).toBe(5);
  });

  it("does not overwrite a completion timestamp on re-completion", async () => {
    let state = emptyProgress();
    state = markComplete(state, 1);
    const firstStamp = state.completion_timestamps[1];
    await new Promise((resolve) => setTimeout(resolve, 5));
    state = markComplete(state, 1);
    expect(state.completion_timestamps[1]).toBe(firstStamp);
  });

  it("canEnter gates levels behind their predecessor", () => {
    const fresh = emptyProgress();
    expect(canEnter(fresh, 1)).toBe(true);
    expect(canEnter(fresh, 2)).toBe(false);
    const through2 = markComplete(markComplete(fresh, 1), 2);
    expect(canEnter(through2, 1)).toBe(true);
    expect(canEnter(through2, 2)).toBe(true);
    expect(canEnter(through2, 3)).toBe(true);
    expect(canEnter(through2, 4)).toBe(false);
  });

  it("nextUnlocked returns the lowest reachable level", () => {
    expect(nextUnlocked(emptyProgress())).toBe(1);
    const after1 = markComplete(emptyProgress(), 1);
    expect(nextUnlocked(after1)).toBe(2);
    let state = emptyProgress();
    for (let l = 1; l <= TOTAL_LEVELS; l += 1) {
      state = markComplete(state, l as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10);
    }
    expect(nextUnlocked(state)).toBe(TOTAL_LEVELS);
  });

  it("setLastSeen updates only the last_seen_level field", () => {
    const state = setLastSeen(emptyProgress(), 5);
    expect(state.last_seen_level).toBe(5);
    expect(state.highest_completed).toBe(0);
  });

  it("clearProgress wipes the store", () => {
    saveProgress(markComplete(emptyProgress(), 4));
    expect(loadProgress().highest_completed).toBe(4);
    clearProgress();
    expect(loadProgress()).toEqual(emptyProgress());
  });

  it("loadProgress falls back to empty on corrupt payload", () => {
    const store = globalThis.localStorage;
    store.setItem("proc-lab.learnProgress", "{ not json");
    expect(loadProgress()).toEqual(emptyProgress());
    store.setItem("proc-lab.learnProgress", JSON.stringify({ foo: "bar" }));
    expect(loadProgress()).toEqual(emptyProgress());
  });
});
