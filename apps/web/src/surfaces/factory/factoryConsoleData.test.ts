import { describe, expect, it } from "vitest";
import {
  factoryConsoleFixture,
  normalizeFactoryConsoleData,
} from "./factoryConsoleData";

describe("normalizeFactoryConsoleData", () => {
  it("selects the awaiting checkpoint task as the active task", () => {
    const model = normalizeFactoryConsoleData(factoryConsoleFixture);

    expect(model.activeTask.id).toBe("example-with-checkpoint");
    expect(model.activeTask.statusLabel).toBe("Awaiting approval");
    expect(model.activeTask.checkpointLabel).toBe("plan review");
  });

  it("returns only the active task artifacts in round order", () => {
    const model = normalizeFactoryConsoleData(factoryConsoleFixture);

    expect(model.artifacts).toHaveLength(1);
    expect(model.artifacts[0].taskId).toBe(model.activeTask.id);
    expect(model.artifacts[0].kind).toBe("plan");
  });

  it("summarizes the SDK run report without copying its schema", () => {
    const model = normalizeFactoryConsoleData(factoryConsoleFixture);

    expect(model.reportSummary.id).toBe("run-factory-console-demo");
    expect(model.reportSummary.scenarioId).toBe("substrate-crunch");
    expect(model.reportSummary.algorithmCount).toBeGreaterThan(1);
    expect(model.replayHref).toContain("?json=");
    expect(model.replayJson).toContain("Factory console replay");
  });

  it("counts event kinds across the fixture", () => {
    const model = normalizeFactoryConsoleData(factoryConsoleFixture);

    expect(model.eventCounts["checkpoint.paused"]).toBe(1);
    expect(model.eventCounts["task.done"]).toBe(1);
  });
});
