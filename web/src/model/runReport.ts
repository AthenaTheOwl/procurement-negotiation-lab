import type { AlgorithmResult, Frontier, LabScenario, TransferRow } from "./types";
import { RUN_REPORT_SCHEMA_VERSION, type RunReport } from "./runReportSchema";
import { runDecoyAudit } from "./decoys";
import type { DecoyAuditResult } from "./types";
import {
  algorithmResults,
  frontier,
  labTakeaway,
  multiPartyLedger,
  multiPartyWelfare,
  transferLedger,
} from "./simulation";

export interface AssembleReportInput {
  scenario: LabScenario;
  auditMode: boolean;
  label?: string;
  notes?: string;
}

export function generateRunId(): string {
  // small, dependency-free uuid v4 substitute (not cryptographic)
  const random = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `run-${Date.now().toString(36)}-${random()}${random()}`;
}

export function assembleReport(input: AssembleReportInput): RunReport {
  const { scenario, auditMode } = input;
  const runs = algorithmResults(scenario);
  const takeaway = labTakeaway(scenario);
  const ledger = transferLedger(scenario);
  const welfare = multiPartyWelfare(scenario);
  const multiRows = multiPartyLedger(scenario);
  const fr = frontier(scenario, takeaway.bestMechanism.id, scenario.epsilon);
  const audit: DecoyAuditResult[] | undefined = auditMode ? runDecoyAudit(scenario) : undefined;
  const reliabilityByAgent: Record<string, number> = {
    [scenario.buyerAgentId]: scenario.buyerReliability,
    [scenario.supplierAgentId]: scenario.supplierReliability,
  };
  const id = generateRunId();
  const timestamp = new Date().toISOString();
  const label =
    input.label ??
    `${scenario.presetId} · ${scenario.infoMode} · α=${scenario.alpha.toFixed(2)} · ε=${scenario.epsilon.toFixed(2)}`;
  const report: RunReport = {
    schemaVersion: RUN_REPORT_SCHEMA_VERSION,
    id,
    timestamp,
    label,
    scenario: scenarioAsRecord(scenario),
    parameters: {
      alpha: scenario.alpha,
      epsilon: scenario.epsilon,
      auditMode,
      splitRule: scenario.splitRule ?? "proportional",
    },
    reliabilityByAgent,
    algorithmResults: runs as AlgorithmResult[],
    frontier: fr as Frontier,
    decoyAudit: audit,
    computed: {
      coordinationGap: takeaway.coordinationGap,
      bestNonOracle: takeaway.bestMechanism.id,
      bestNonOracleGap: takeaway.bestMechanism.oracleGap,
      transferLedger: ledger as TransferRow[],
      multiPartyLedger: multiRows,
      totalOutside: welfare.totalOutside,
      surplus: welfare.surplus,
    },
    provenance: scenario.provenance ?? { source: "synthetic", citations: [] },
    notes: input.notes,
  };
  return report;
}

function scenarioAsRecord(scenario: LabScenario): Record<string, unknown> {
  return { ...scenario } as Record<string, unknown>;
}

export function reportLabelFromScenario(scenario: LabScenario): string {
  const audit = "auditMode" in scenario ? "" : "";
  return `${scenario.presetId} · ${scenario.infoMode}${audit}`;
}
