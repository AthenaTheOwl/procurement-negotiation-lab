// learnProgress (mobile) tests — exercise the same shape + helpers as
// the web build. AsyncStorage is mocked by jest-expo by default.

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

import {
  TOTAL_LEVELS,
  canEnter,
  emptyProgress,
  markComplete,
  nextUnlocked,
  setLastSeen,
  type LevelId,
} from "./learnProgress";

describe("learnProgress (mobile)", () => {
  it("emptyProgress starts at 0 highest_completed, last_seen=1", () => {
    const p = emptyProgress();
    expect(p.highest_completed).toBe(0);
    expect(p.last_seen_level).toBe(1);
  });

  it("markComplete bumps highest_completed and sets last_seen_level = level+1", () => {
    const after = markComplete(emptyProgress(), 1);
    expect(after.highest_completed).toBe(1);
    expect(after.last_seen_level).toBe(2);
    expect(after.completion_timestamps[1]).toBeDefined();
  });

  it("markComplete is idempotent for re-completion of the same level", () => {
    const first = markComplete(emptyProgress(), 1);
    const second = markComplete(first, 1);
    expect(second.completion_timestamps[1]).toBe(first.completion_timestamps[1]);
  });

  it("canEnter blocks levels beyond the next unlocked", () => {
    const p = emptyProgress();
    expect(canEnter(p, 1)).toBe(true);
    expect(canEnter(p, 2)).toBe(false);
    const after = markComplete(p, 1);
    expect(canEnter(after, 2)).toBe(true);
  });

  it("nextUnlocked returns level (highest_completed + 1) clamped", () => {
    expect(nextUnlocked(emptyProgress())).toBe(1);
    const after = markComplete(emptyProgress(), TOTAL_LEVELS as LevelId);
    expect(nextUnlocked(after)).toBe(TOTAL_LEVELS);
  });

  it("setLastSeen updates only last_seen_level", () => {
    const after = setLastSeen(emptyProgress(), 3);
    expect(after.last_seen_level).toBe(3);
    expect(after.highest_completed).toBe(0);
  });
});
