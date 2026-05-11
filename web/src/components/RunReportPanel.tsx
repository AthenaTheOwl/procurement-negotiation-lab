import { useEffect, useState } from "react";
import type { LabScenario } from "../model/types";
import { assembleReport } from "../model/runReport";
import { toMarkdown } from "../model/reportMarkdown";
import { parseRunReport, type RunReport } from "../model/runReportSchema";
import { deleteRun, listRuns, loadRun, saveRun, type RunReportSummary } from "../model/reportStorage";

interface RunReportPanelProps {
  scenario: LabScenario;
  auditMode: boolean;
  onReplay: (report: RunReport) => void;
}

export function RunReportPanel({ scenario, auditMode, onReplay }: RunReportPanelProps) {
  const [pasted, setPasted] = useState("");
  const [savedRuns, setSavedRuns] = useState<RunReportSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackKind, setFeedbackKind] = useState<"info" | "error">("info");

  useEffect(() => {
    setSavedRuns(listRuns());
  }, []);

  function flash(message: string, kind: "info" | "error" = "info") {
    setFeedback(message);
    setFeedbackKind(kind);
    window.setTimeout(() => setFeedback(null), 3500);
  }

  async function handleExportJson() {
    try {
      const report = assembleReport({ scenario, auditMode });
      const json = JSON.stringify(report, null, 2);
      saveRun(report);
      setSavedRuns(listRuns());
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(json);
        flash(`Run ${report.id.slice(-6)} copied to clipboard and saved to ledger.`);
      } else {
        flash(`Run ${report.id.slice(-6)} saved to ledger; clipboard unavailable.`);
      }
    } catch (error) {
      flash(`Export failed: ${(error as Error).message}`, "error");
    }
  }

  async function handleExportMarkdown() {
    try {
      const report = assembleReport({ scenario, auditMode });
      const md = toMarkdown(report);
      saveRun(report);
      setSavedRuns(listRuns());
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(md);
        flash(`Markdown copied to clipboard (run ${report.id.slice(-6)}).`);
      } else {
        flash(`Markdown ready; clipboard unavailable.`);
      }
    } catch (error) {
      flash(`Export failed: ${(error as Error).message}`, "error");
    }
  }

  function handleReplay() {
    const result = parseRunReport(pasted.trim());
    if (!result.ok) {
      const summary = result.errors
        .slice(0, 3)
        .map((err) => `${err.path}: ${err.message}`)
        .join("; ");
      flash(`Replay failed — ${summary}`, "error");
      return;
    }
    onReplay(result.data);
    flash(`Replayed run ${result.data.id.slice(-6)}.`);
  }

  function handleLoadFromLedger(id: string) {
    const report = loadRun(id);
    if (!report) {
      flash("Could not load that run.", "error");
      return;
    }
    onReplay(report);
    flash(`Loaded run ${id.slice(-6)} from ledger.`);
  }

  function handleDeleteFromLedger(id: string) {
    deleteRun(id);
    setSavedRuns(listRuns());
  }

  return (
    <div className="results-card" data-testid="run-report-panel">
      <h3>6. Export and replay</h3>
      <p className="muted">
        Capture this Lab run as a typed JSON report or as a markdown summary. Replay a prior
        run by pasting its JSON or picking from the ledger below.
      </p>
      <div className="button-row">
        <button className="primary" onClick={handleExportJson} data-testid="export-json-btn">
          Export run JSON
        </button>
        <button className="secondary" onClick={handleExportMarkdown} data-testid="export-markdown-btn">
          Export markdown
        </button>
      </div>
      {feedback && (
        <p className={feedbackKind === "error" ? "callout warn" : "callout"}>{feedback}</p>
      )}
      <label className="select-label">
        Replay JSON
        <textarea
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          rows={5}
          placeholder='paste a run report JSON here'
          data-testid="replay-textarea"
        />
      </label>
      <div className="button-row">
        <button onClick={handleReplay} disabled={pasted.trim().length === 0} data-testid="replay-btn">
          Load pasted run
        </button>
      </div>
      <div className="callout">
        <strong>Run ledger</strong> — last {savedRuns.length} runs (cap 20).
        {savedRuns.length === 0 && <p className="muted">No runs saved yet.</p>}
      </div>
      {savedRuns.length > 0 && (
        <ul className="ledger-list" data-testid="ledger-list">
          {savedRuns.map((run) => (
            <li key={run.id}>
              <strong>{run.label}</strong>
              <span className="muted"> · {run.timestamp.slice(0, 19).replace("T", " ")}</span>
              <div className="button-row inline">
                <button
                  className="link-button"
                  onClick={() => handleLoadFromLedger(run.id)}
                  data-testid={`load-${run.id}`}
                >
                  load
                </button>
                <a
                  className="link-button"
                  href={`?report=${encodeURIComponent(run.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  data-testid={`open-${run.id}`}
                >
                  open as page
                </a>
                <button
                  className="link-button"
                  onClick={() => handleDeleteFromLedger(run.id)}
                >
                  delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
