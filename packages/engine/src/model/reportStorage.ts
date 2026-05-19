import type { RunReport } from "./runReportSchema";
import { runReportSchema } from "./runReportSchema";

export const STORAGE_PREFIX = "procurement-lab.runs.";
export const INDEX_KEY = `${STORAGE_PREFIX}__index`;
export const MAX_RUNS = 20;

export interface RunReportSummary {
  id: string;
  timestamp: string;
  label: string;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function storage(): StorageLike | null {
  if (typeof globalThis === "undefined") return null;
  const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
  return candidate ?? null;
}

function readIndex(): RunReportSummary[] {
  const ls = storage();
  if (!ls) return [];
  const raw = ls.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RunReportSummary =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as RunReportSummary).id === "string" &&
        typeof (entry as RunReportSummary).timestamp === "string" &&
        typeof (entry as RunReportSummary).label === "string",
    );
  } catch {
    return [];
  }
}

function writeIndex(summaries: RunReportSummary[]): void {
  const ls = storage();
  if (!ls) return;
  ls.setItem(INDEX_KEY, JSON.stringify(summaries));
}

export function saveRun(report: RunReport): void {
  const ls = storage();
  if (!ls) return;
  const key = `${STORAGE_PREFIX}${report.id}`;
  ls.setItem(key, JSON.stringify(report));
  const summary: RunReportSummary = {
    id: report.id,
    timestamp: report.timestamp,
    label: report.label,
  };
  let index = readIndex().filter((entry) => entry.id !== report.id);
  index.unshift(summary);
  if (index.length > MAX_RUNS) {
    const overflow = index.slice(MAX_RUNS);
    for (const entry of overflow) {
      ls.removeItem(`${STORAGE_PREFIX}${entry.id}`);
    }
    index = index.slice(0, MAX_RUNS);
  }
  writeIndex(index);
}

export function listRuns(): RunReportSummary[] {
  return readIndex();
}

export function loadRun(id: string): RunReport | null {
  const ls = storage();
  if (!ls) return null;
  const raw = ls.getItem(`${STORAGE_PREFIX}${id}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = runReportSchema.safeParse(parsed);
    if (result.success) return result.data;
    return null;
  } catch {
    return null;
  }
}

export function deleteRun(id: string): void {
  const ls = storage();
  if (!ls) return;
  ls.removeItem(`${STORAGE_PREFIX}${id}`);
  const remaining = readIndex().filter((entry) => entry.id !== id);
  writeIndex(remaining);
}

export function clearAll(): void {
  const ls = storage();
  if (!ls) return;
  const index = readIndex();
  for (const entry of index) {
    ls.removeItem(`${STORAGE_PREFIX}${entry.id}`);
  }
  ls.removeItem(INDEX_KEY);
}
