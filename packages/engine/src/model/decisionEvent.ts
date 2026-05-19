import type { LabScenario, MechanismId } from "./types";

export type DecisionEvent =
  | { kind: "scenario.loaded"; at: string; scenarioPresetId: string; source: "preset" | "import" | "csv" | "bridge" | "replay" }
  | { kind: "scenario.parameter-changed"; at: string; field: keyof LabScenario | string; previous: unknown; next: unknown }
  | { kind: "view.switched"; at: string; from: string; to: string }
  | { kind: "algorithm.compared"; at: string; mechanismIds: MechanismId[] }
  | { kind: "transfer.computed"; at: string; splitRule: string; totalTransfer: number }
  | { kind: "export.issued"; at: string; format: "json" | "markdown"; reportId: string }
  | { kind: "replay.loaded"; at: string; reportId: string; mismatch: boolean }
  | { kind: "bridge.fetched"; at: string; bridgeId: "chip-map" | "supplier-risk"; success: boolean }
  | { kind: "csv.imported"; at: string; rowCount: number; errorCount: number };

export interface DecisionEventLog {
  events: DecisionEvent[];
}

const MAX_EVENTS = 200;

export function createLog(): DecisionEventLog {
  return { events: [] };
}

export function appendEvent(log: DecisionEventLog, event: DecisionEvent): DecisionEventLog {
  const events = [...log.events, event];
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  return { events };
}

export function now(): string {
  return new Date().toISOString();
}

export function eventKindCounts(log: DecisionEventLog): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of log.events) {
    counts[event.kind] = (counts[event.kind] ?? 0) + 1;
  }
  return counts;
}
