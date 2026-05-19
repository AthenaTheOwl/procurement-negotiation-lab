import { useEffect, useMemo, useState } from "react";
import type { RunReport } from "@lab/engine";
import { loadRun, parseRunReport, toMarkdown } from "@lab/engine";
import { ProvenanceBadge } from "../../components/ProvenanceBadge";

function money(value: number): string {
  const abs = Math.abs(Math.round(value));
  const formatted = `$${abs.toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function readQuery(): { id?: string; json?: string } {
  if (typeof window === "undefined") return {};
  try {
    const search = window.location.search.replace(/^\?/, "");
    const params = new URLSearchParams(search);
    return { id: params.get("report") ?? undefined, json: params.get("json") ?? undefined };
  } catch {
    return {};
  }
}

export function ReportSurface() {
  const query = useMemo(readQuery, []);
  const [report, setReport] = useState<RunReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.id) {
      const loaded = loadRun(query.id);
      if (loaded) {
        setReport(loaded);
      } else {
        setError(`Run ${query.id} not found in this browser's ledger.`);
      }
      return;
    }
    if (query.json) {
      try {
        const decoded = decodeURIComponent(query.json);
        const parsed = parseRunReport(decoded);
        if (parsed.ok) {
          setReport(parsed.data);
        } else {
          setError(parsed.errors.map((err) => `${err.path}: ${err.message}`).join("; "));
        }
      } catch (cause) {
        setError((cause as Error).message);
      }
      return;
    }
    setError("No report id or json supplied. Use /?report=<id> or /?json=<encoded>.");
  }, [query.id, query.json]);

  if (error) {
    return (
      <section className="report-surface" data-testid="report-surface-error">
        <h1>Report unavailable</h1>
        <p>{error}</p>
        <a href="/">Open the lab</a>
      </section>
    );
  }
  if (!report) {
    return (
      <section className="report-surface" data-testid="report-surface-loading">
        <p>Loading run report…</p>
      </section>
    );
  }
  const scenario = report.scenario as Record<string, unknown>;
  const presetId = String(scenario.presetId ?? "scenario");
  const infoMode = String(scenario.infoMode ?? "n/a");
  const md = toMarkdown(report);
  return (
    <section className="report-surface" data-testid="report-surface">
      <header className="report-header">
        <div className="section-label">
          Run report
          <ProvenanceBadge provenance={report.provenance} testId="report-provenance" />
        </div>
        <h1>{presetId}</h1>
        <p className="muted">{report.timestamp} · {report.label}</p>
      </header>

      <div className="report-headline">
        <div className="report-metric">
          <span className="report-metric-label">Coordination gap</span>
          <span className="report-metric-value">{money(report.computed.coordinationGap)}</span>
        </div>
        <div className="report-metric">
          <span className="report-metric-label">Best non-oracle</span>
          <span className="report-metric-value">{report.computed.bestNonOracle}</span>
        </div>
        <div className="report-metric">
          <span className="report-metric-label">Oracle gap</span>
          <span className="report-metric-value">{money(report.computed.bestNonOracleGap)}</span>
        </div>
      </div>

      <section className="report-card">
        <h2>Setup</h2>
        <ul>
          <li>Preset: <code>{presetId}</code></li>
          <li>Information mode: <code>{infoMode}</code></li>
          <li>α = {report.parameters.alpha.toFixed(2)}, ε = {report.parameters.epsilon.toFixed(2)}, audit {report.parameters.auditMode ? "on" : "off"}, split rule <code>{report.parameters.splitRule ?? "proportional"}</code></li>
          {Object.entries(report.reliabilityByAgent).map(([agentId, value]) => (
            <li key={agentId}>{agentId}: reliability {value.toFixed(2)}</li>
          ))}
        </ul>
      </section>

      <section className="report-card">
        <h2>Mechanisms</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Mechanism</th>
              <th>Global utility</th>
              <th>Oracle gap</th>
              <th>Privacy</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {report.algorithmResults.map((run) => (
              <tr key={run.id}>
                <td>{run.name}</td>
                <td>{money(run.globalUtility)}</td>
                <td>{money(run.oracleGap)}</td>
                <td>{pct(run.privacyExposure)}</td>
                <td>{run.quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="report-card">
        <h2>Transfer ledger</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Party</th>
              <th>Before</th>
              <th>Outside</th>
              <th>Transfer</th>
              <th>After</th>
              <th>OK?</th>
            </tr>
          </thead>
          <tbody>
            {report.computed.transferLedger.map((row) => (
              <tr key={row.party}>
                <td>{row.party}</td>
                <td>{money(row.utilityBeforeTransfer)}</td>
                <td>{money(row.outsideOption)}</td>
                <td>{money(row.transfer)}</td>
                <td>{money(row.utilityAfterTransfer)}</td>
                <td>{row.noWorseOff ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {report.notes && (
        <section className="report-card">
          <h2>Notes</h2>
          <p>{report.notes}</p>
        </section>
      )}

      <footer className="report-footer">
        <a href="/">Open the lab</a>
        <details>
          <summary>Reproduce this run (paste the JSON)</summary>
          <pre>{JSON.stringify(report, null, 2)}</pre>
        </details>
        <details>
          <summary>Markdown version</summary>
          <pre>{md}</pre>
        </details>
      </footer>
    </section>
  );
}
