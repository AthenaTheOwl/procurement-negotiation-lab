/**
 * streak — daily-learn streak counter, localStorage-backed.
 *
 * Rules:
 *   - touchStreak() bumps the streak by 1 if the last touch was
 *     yesterday (calendar-day diff = 1), keeps it the same if it was
 *     today, and resets to 1 if there is a 2+ day gap.
 *   - loadStreak() reads + lazy-decays the streak: if the last touch
 *     was more than one calendar day ago, the streak shows 0.
 *
 * "Calendar day" is the user's local timezone, since the lab is
 * client-side. Anonymously stored.
 */

const STORAGE_KEY = "proc-lab.streak";

export interface Streak {
  current: number;
  longest: number;
  lastTouchedISO: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof globalThis === "undefined") return null;
  return (globalThis as { localStorage?: StorageLike }).localStorage ?? null;
}

function dayDiff(aISO: string, bISO: string): number {
  const a = new Date(aISO);
  const b = new Date(bISO);
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((dayB - dayA) / 86_400_000);
}

export function emptyStreak(): Streak {
  return { current: 0, longest: 0, lastTouchedISO: new Date(0).toISOString() };
}

function readRaw(): Streak {
  const store = getStorage();
  if (!store) return emptyStreak();
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return emptyStreak();
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.current === "number" &&
      typeof parsed.longest === "number" &&
      typeof parsed.lastTouchedISO === "string"
    ) {
      return parsed as Streak;
    }
  } catch {
    // fall through
  }
  return emptyStreak();
}

function write(value: Streak): void {
  const store = getStorage();
  if (!store) return;
  store.setItem(STORAGE_KEY, JSON.stringify(value));
}

/**
 * Read the streak, applying lazy decay if the last touch is older
 * than 1 calendar day. Does not write.
 */
export function loadStreak(now: Date = new Date()): Streak {
  const raw = readRaw();
  if (!raw.lastTouchedISO) return raw;
  const diff = dayDiff(raw.lastTouchedISO, now.toISOString());
  if (diff > 1) {
    return { ...raw, current: 0 };
  }
  return raw;
}

/**
 * Mark today as visited. Returns the updated streak.
 */
export function touchStreak(now: Date = new Date()): Streak {
  const raw = readRaw();
  const todayISO = now.toISOString();
  if (raw.current === 0) {
    const updated: Streak = {
      current: 1,
      longest: Math.max(raw.longest, 1),
      lastTouchedISO: todayISO,
    };
    write(updated);
    return updated;
  }
  const diff = dayDiff(raw.lastTouchedISO, todayISO);
  if (diff === 0) {
    return raw; // already counted today; don't double-touch
  }
  const nextCurrent = diff === 1 ? raw.current + 1 : 1;
  const updated: Streak = {
    current: nextCurrent,
    longest: Math.max(raw.longest, nextCurrent),
    lastTouchedISO: todayISO,
  };
  write(updated);
  return updated;
}

export function clearStreak(): void {
  const store = getStorage();
  if (!store) return;
  store.removeItem(STORAGE_KEY);
}
