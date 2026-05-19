import { describe, it, expect, beforeEach } from "vitest";
import { makeScenario } from "./simulation";
import { assembleReport } from "./runReport";
import { parseRunReport, runReportSchema, RUN_REPORT_SCHEMA_VERSION } from "./runReportSchema";
import { toMarkdown } from "./reportMarkdown";
import { clearAll, listRuns, loadRun, saveRun, MAX_RUNS } from "./reportStorage";

describe("assembleReport", () => {
  it("produces a valid RunReport that parses against the schema", () => {
    const scenario = makeScenario();
    const report = assembleReport({ scenario, auditMode: false });
    expect(report.schemaVersion).toBe(RUN_REPORT_SCHEMA_VERSION);
    expect(report.id).toMatch(/^run-/);
    expect(report.algorithmResults.length).toBeGreaterThan(0);
    expect(runReportSchema.safeParse(report).success).toBe(true);
  });

  it("captures audit results when auditMode is on", () => {
    const scenario = makeScenario();
    const report = assembleReport({ scenario, auditMode: true });
    expect(report.parameters.auditMode).toBe(true);
    expect(report.decoyAudit).toBeDefined();
  });
});

describe("parseRunReport", () => {
  it("round-trips a serialized report", () => {
    const scenario = makeScenario();
    const report = assembleReport({ scenario, auditMode: false });
    const json = JSON.stringify(report);
    const result = parseRunReport(json);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(report.id);
    }
  });

  it("returns errors for invalid JSON", () => {
    const result = parseRunReport("{ not json");
    expect(result.ok).toBe(false);
  });
});

describe("toMarkdown", () => {
  it("emits a markdown document with run header and mechanism table", () => {
    const scenario = makeScenario();
    const report = assembleReport({ scenario, auditMode: false });
    const md = toMarkdown(report);
    expect(md).toMatch(/^# Run report/m);
    expect(md).toMatch(/Mechanisms/);
    expect(md).toMatch(/Headline/);
    expect(md).toMatch(/Coordination gap/);
  });
});

describe("reportStorage", () => {
  beforeEach(() => {
    clearAll();
  });

  it("save/list/load round-trip", () => {
    const scenario = makeScenario();
    const report = assembleReport({ scenario, auditMode: false });
    saveRun(report);
    const list = listRuns();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(report.id);
    const loaded = loadRun(report.id);
    expect(loaded?.id).toBe(report.id);
  });

  it("caps the ledger at MAX_RUNS", () => {
    const scenario = makeScenario();
    for (let i = 0; i < MAX_RUNS + 5; i += 1) {
      const report = assembleReport({ scenario, auditMode: false, label: `run #${i}` });
      saveRun(report);
    }
    const list = listRuns();
    expect(list.length).toBe(MAX_RUNS);
  });
});
