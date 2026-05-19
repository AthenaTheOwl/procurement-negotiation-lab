import { describe, expect, it } from "vitest";
import { appendEvent, createLog, eventKindCounts, now } from "./decisionEvent";

describe("decisionEvent log", () => {
  it("appends events and computes kind counts", () => {
    let log = createLog();
    log = appendEvent(log, { kind: "scenario.loaded", at: now(), scenarioPresetId: "x", source: "preset" });
    log = appendEvent(log, { kind: "scenario.loaded", at: now(), scenarioPresetId: "y", source: "preset" });
    log = appendEvent(log, { kind: "view.switched", at: now(), from: "coordinator", to: "buyer" });
    expect(log.events).toHaveLength(3);
    const counts = eventKindCounts(log);
    expect(counts["scenario.loaded"]).toBe(2);
    expect(counts["view.switched"]).toBe(1);
  });

  it("caps the log at MAX_EVENTS", () => {
    let log = createLog();
    for (let i = 0; i < 250; i += 1) {
      log = appendEvent(log, {
        kind: "scenario.parameter-changed",
        at: now(),
        field: "alpha",
        previous: i - 1,
        next: i,
      });
    }
    expect(log.events.length).toBeLessThanOrEqual(200);
  });
});
