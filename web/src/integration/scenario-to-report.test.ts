import { describe, expect, it, beforeEach } from "vitest";
import { algorithmResults, makeScenario, multiPartyLedger } from "../model/simulation";
import { assembleReport } from "../model/runReport";
import { parseRunReport, runReportSchema } from "../model/runReportSchema";
import { clearAll, listRuns, loadRun, saveRun } from "../model/reportStorage";
import { deriveParticipants } from "../model/participants";
import { parseImport } from "../model/bridges/csvImport";
import { tag } from "../model/bridges/sourceProvenance";

describe("integration: scenario → algorithms → multi-party ledger → run report", () => {
  beforeEach(() => {
    clearAll();
  });

  it("a multi-party scenario flows from preset through ledger to a savable report", () => {
    const scenario = makeScenario({
      presetId: "advanced-packaging-bottleneck",
      splitRule: "shapley",
    });
    const participants = deriveParticipants(scenario);
    expect(participants.length).toBeGreaterThanOrEqual(3);
    const runs = algorithmResults(scenario);
    expect(runs.length).toBeGreaterThan(0);
    const rows = multiPartyLedger(scenario, { splitRule: "shapley" });
    expect(rows.length).toBe(participants.length);
    const report = assembleReport({ scenario, auditMode: false });
    expect(runReportSchema.safeParse(report).success).toBe(true);
    saveRun(report);
    const list = listRuns();
    expect(list[0].id).toBe(report.id);
    const loaded = loadRun(report.id);
    expect(loaded?.computed.bestNonOracle).toBe(report.computed.bestNonOracle);
  });

  it("export → parse → replay round-trip preserves identifiers and parameters", () => {
    const scenario = makeScenario({ presetId: "hyperscaler-surge", splitRule: "equal" });
    const report = assembleReport({ scenario, auditMode: true });
    const json = JSON.stringify(report);
    const parsed = parseRunReport(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.id).toBe(report.id);
      expect(parsed.data.parameters.splitRule).toBe("equal");
      expect(parsed.data.parameters.auditMode).toBe(true);
    }
  });
});

describe("integration: CSV import seeds a scenario whose report round-trips", () => {
  beforeEach(() => {
    clearAll();
  });

  it("CSV → derived participants → algorithms → run report", () => {
    const csv = `supplier_id,buyer_id,product_id,period,quantity,unit_price,capacity,reliability,outside_option
cinder,northstar,substrate-A,2026-Q1,420,118,600,0.92,5100
horizon,northstar,substrate-A,2026-Q1,280,124,450,0.88,4700
vela,northstar,substrate-A,2026-Q1,180,142,260,0.85,3600`;
    const result = parseImport(csv);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.seed) return;
    const scenario = makeScenario({
      participantCount: result.seed.derivedParticipants.length,
    });
    scenario.participants = result.seed.derivedParticipants;
    scenario.provenance = tag("csv-imported", { sourceId: `csv-${result.seed.rows.length}-rows` });
    const report = assembleReport({ scenario, auditMode: false });
    expect(report.provenance?.source).toBe("csv-imported");
    expect(report.computed.transferLedger.length).toBe(result.seed.derivedParticipants.length);
  });
});

describe("integration: provenance survives report round-trip", () => {
  beforeEach(() => {
    clearAll();
  });

  it("chip-map provenance is preserved through assembleReport → JSON → parseRunReport", () => {
    const scenario = makeScenario({ presetId: "advanced-packaging-bottleneck" });
    scenario.provenance = tag("chip-map", { sourceId: "tsmc", citations: [{ source: "chip-map", sourceId: "tsmc" }] });
    const report = assembleReport({ scenario, auditMode: false });
    const parsed = parseRunReport(JSON.stringify(report));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.provenance?.source).toBe("chip-map");
      expect(parsed.data.provenance?.citations.length).toBeGreaterThan(0);
    }
  });
});
