import type { RunReport } from "./runReportSchema";

function money(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = `$${abs.toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function toMarkdown(report: RunReport): string {
  const scenario = report.scenario as Record<string, unknown>;
  const presetId = String(scenario.presetId ?? "scenario");
  const infoMode = String(scenario.infoMode ?? "n/a");
  const lines: string[] = [];
  lines.push(`# Run report — ${presetId}`);
  lines.push("");
  lines.push(`**${report.timestamp}** — ${report.label}`);
  lines.push("");
  lines.push("## Setup");
  lines.push(`- Preset: \`${presetId}\``);
  lines.push(`- Information mode: \`${infoMode}\``);
  lines.push(
    `- α = ${report.parameters.alpha.toFixed(2)}, ε = ${report.parameters.epsilon.toFixed(2)}, audit mode ${report.parameters.auditMode ? "on" : "off"}, split rule \`${report.parameters.splitRule ?? "proportional"}\``,
  );
  lines.push("");
  const reliabilities = Object.entries(report.reliabilityByAgent)
    .map(([agentId, value]) => `${agentId}=${value.toFixed(2)}`)
    .join(", ");
  if (reliabilities) {
    lines.push(`- Reliability priors: ${reliabilities}`);
    lines.push("");
  }
  lines.push("## Mechanisms");
  lines.push("");
  lines.push("| Mechanism | Global utility | vs oracle | Privacy | Quality |");
  lines.push("|---|---|---|---|---|");
  for (const run of report.algorithmResults) {
    lines.push(
      `| ${run.name} | ${money(run.globalUtility)} | ${money(run.oracleGap)} | ${pct(run.privacyExposure)} | ${run.quality} |`,
    );
  }
  lines.push("");
  lines.push("## Headline");
  lines.push("");
  lines.push(
    `**Coordination gap: ${money(report.computed.coordinationGap)}** — recovered by \`${report.computed.bestNonOracle}\` (oracle gap ${money(report.computed.bestNonOracleGap)}).`,
  );
  lines.push("");
  lines.push("## Transfer ledger");
  lines.push("");
  lines.push("| Party | Before | Outside | Transfer | After | No worse off? |");
  lines.push("|---|---|---|---|---|---|");
  for (const row of report.computed.transferLedger) {
    lines.push(
      `| ${row.party} | ${money(row.utilityBeforeTransfer)} | ${money(row.outsideOption)} | ${money(row.transfer)} | ${money(row.utilityAfterTransfer)} | ${row.noWorseOff ? "yes" : "no"} |`,
    );
  }
  lines.push("");
  lines.push("## What this teaches");
  lines.push("");
  lines.push(teachingTemplate(report));
  lines.push("");
  if (report.notes) {
    lines.push("## Notes");
    lines.push("");
    lines.push(report.notes);
    lines.push("");
  }
  lines.push("---");
  lines.push("");
  lines.push(
    `[Open the lab](https://procurement-negotiation-lab.vercel.app/) · [Reproduce this run](#reproduce)`,
  );
  lines.push("");
  lines.push("<details>");
  lines.push("<summary>↓ reproduce this run</summary>");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(report, null, 2));
  lines.push("```");
  lines.push("");
  lines.push("</details>");
  return lines.join("\n");
}

function teachingTemplate(report: RunReport): string {
  const admm = report.algorithmResults.find((r) => r.id === "cpp-admm");
  const altBR = report.algorithmResults.find((r) => r.id === "alternating-best-response");
  const oracleFeasible = (report.computed.surplus ?? 0) > 0;
  if (!oracleFeasible) {
    return (
      "The operational plan does not produce enough joint value for CBT transfers to make every party " +
      "no worse off. CBT can split surplus; it cannot manufacture surplus."
    );
  }
  if (admm && admm.convergence === "converged" && admm.oracleGap < 1500) {
    return (
      "CPP/ADMM recovers most of the centralized-oracle welfare while exposing less private cost data " +
      "than the oracle. Truthful local responses to the coordinator's prices are the attractive strategy here."
    );
  }
  if (admm && admm.convergence === "oscillating" && altBR && altBR.convergence === "converged") {
    return (
      "ADMM oscillates on this instance, but alternating best response converges. Mechanism choice is " +
      "instance-dependent: the best protocol is not always the most theoretically powerful one."
    );
  }
  if (report.parameters.auditMode && (report.decoyAudit?.some((row) => !row.match) ?? false)) {
    return (
      "Audit Mode caught a mismatch between the agent's stated demand and its behavior on decoy curves. " +
      "Mechanism design solves the negotiation; auditing keeps the inputs to the mechanism honest."
    );
  }
  return (
    "The selected mechanism trades privacy exposure for joint welfare. Compare the oracle-gap column with " +
    "the privacy column to see what each protocol costs you on each axis."
  );
}
