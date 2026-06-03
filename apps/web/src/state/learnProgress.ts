/**
 * learnProgress — gated progression state for the learn surface.
 *
 * Backed by localStorage on web. Mobile uses the same shape under
 * AsyncStorage. The two backends speak the same JSON, so a user could
 * (in principle) sync state if we ever add accounts.
 */

const STORAGE_KEY = "proc-lab.learnProgress";
export const TOTAL_LEVELS = 12;
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type CompletedThrough = 0 | LevelId;

export interface LearnProgress {
  highest_completed: CompletedThrough;
  completion_timestamps: Partial<Record<LevelId, string>>;
  last_seen_level: LevelId;
}

export function emptyProgress(): LearnProgress {
  return {
    highest_completed: 0,
    completion_timestamps: {},
    last_seen_level: 1,
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  return candidate ?? null;
}

function isValidProgress(value: unknown): value is LearnProgress {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.highest_completed === "number" &&
    v.highest_completed >= 0 &&
    v.highest_completed <= TOTAL_LEVELS &&
    typeof v.completion_timestamps === "object" &&
    v.completion_timestamps !== null &&
    typeof v.last_seen_level === "number" &&
    v.last_seen_level >= 1 &&
    v.last_seen_level <= TOTAL_LEVELS
  );
}

export function loadProgress(): LearnProgress {
  const store = getStorage();
  if (!store) return emptyProgress();
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return emptyProgress();
  try {
    const parsed = JSON.parse(raw);
    if (!isValidProgress(parsed)) return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: LearnProgress): void {
  const store = getStorage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function clearProgress(): void {
  const store = getStorage();
  if (!store) return;
  store.removeItem(STORAGE_KEY);
}

export function markComplete(
  previous: LearnProgress,
  level: LevelId,
): LearnProgress {
  // Re-completing a level is a no-op (no rollback of timestamp).
  const alreadyDone = level <= previous.highest_completed;
  const next: LearnProgress = {
    highest_completed: Math.max(previous.highest_completed, level) as CompletedThrough,
    completion_timestamps: { ...previous.completion_timestamps },
    last_seen_level: Math.min(TOTAL_LEVELS, level + 1) as LevelId,
  };
  if (!alreadyDone) {
    next.completion_timestamps[level] = new Date().toISOString();
  }
  return next;
}

export function setLastSeen(
  previous: LearnProgress,
  level: LevelId,
): LearnProgress {
  return { ...previous, last_seen_level: level };
}

/** Returns true if the user is allowed to navigate to the given level. */
export function canEnter(progress: LearnProgress, level: LevelId): boolean {
  // Level 1 is always reachable. Level N requires level N-1 completed.
  if (level === 1) return true;
  return progress.highest_completed >= level - 1;
}

/** Highest level the user can currently enter. */
export function nextUnlocked(progress: LearnProgress): LevelId {
  const candidate = (progress.highest_completed + 1) as LevelId;
  if (candidate > TOTAL_LEVELS) return TOTAL_LEVELS;
  return candidate;
}
