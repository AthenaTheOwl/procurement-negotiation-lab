/**
 * learnProgress (mobile) — shared shape with apps/web/src/state, backed
 * by AsyncStorage. Same JSON on disk so a future account-sync layer
 * could push state across devices.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

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

export async function loadProgress(): Promise<LearnProgress> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw);
    if (!isValidProgress(parsed)) return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export async function saveProgress(progress: LearnProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore — AsyncStorage failures shouldn't crash the app
  }
}

export async function clearProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function markComplete(
  previous: LearnProgress,
  level: LevelId,
): LearnProgress {
  const alreadyDone = level <= previous.highest_completed;
  const next: LearnProgress = {
    highest_completed: Math.max(
      previous.highest_completed,
      level,
    ) as CompletedThrough,
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

export function canEnter(progress: LearnProgress, level: LevelId): boolean {
  if (level === 1) return true;
  return progress.highest_completed >= level - 1;
}

export function nextUnlocked(progress: LearnProgress): LevelId {
  const candidate = (progress.highest_completed + 1) as LevelId;
  if (candidate > TOTAL_LEVELS) return TOTAL_LEVELS;
  return candidate;
}
