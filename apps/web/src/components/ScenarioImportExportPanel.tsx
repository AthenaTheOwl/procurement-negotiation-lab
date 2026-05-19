import { useState } from "react";
import type { LabScenario } from "@lab/engine";
import { SCHEMA_VERSION, migrateScenario } from "@lab/engine";
interface ScenarioImportExportPanelProps {
  scenario: LabScenario;
  onLoad: (scenario: LabScenario) => void;
}

export function ScenarioImportExportPanel({ scenario, onLoad }: ScenarioImportExportPanelProps) {
  const [pasted, setPasted] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errors, setErrors] = useState<Array<{ path: string; message: string }>>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  function flash(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 3500);
  }

  async function handleCopy() {
    const out = {
      ...scenario,
      schemaVersion: SCHEMA_VERSION,
    };
    const json = JSON.stringify(out, null, 2);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(json);
        flash(`Scenario JSON (${json.length} chars) copied to clipboard.`);
        return;
      } catch (cause) {
        flash(`Copy failed: ${(cause as Error).message}`);
        return;
      }
    }
    flash("Clipboard unavailable; falling back to inline JSON below.");
    setPasted(json);
  }

  function handleLoad() {
    setErrors([]);
    setWarnings([]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(pasted.trim());
    } catch (cause) {
      setErrors([{ path: "$", message: `not valid JSON: ${(cause as Error).message}` }]);
      return;
    }
    const result = migrateScenario(parsed);
    if (!result.ok || !result.data) {
      setErrors(result.errors ?? [{ path: "$", message: "unknown error" }]);
      setWarnings(result.warnings);
      return;
    }
    setWarnings(result.warnings);
    onLoad(result.data as unknown as LabScenario);
    flash(`Scenario loaded (migrated from ${result.fromVersion} to ${result.toVersion}).`);
  }

  return (
    <div className="results-card" data-testid="scenario-io-panel">
      <h3>10. Scenario JSON · import + export</h3>
      <p className="muted">
        Round-trip the entire scenario as a JSON blob. The schema is versioned at <code>{SCHEMA_VERSION}</code>;
        older shapes are migrated automatically with a clear warning per defaulted field.
      </p>
      <div className="button-row">
        <button className="primary" onClick={handleCopy} data-testid="scenario-copy-btn">
          Copy scenario as JSON
        </button>
      </div>
      <label className="select-label">
        Paste a scenario JSON
        <textarea
          value={pasted}
          onChange={(event) => setPasted(event.target.value)}
          rows={6}
          placeholder='paste a scenario JSON object here'
          data-testid="scenario-paste-textarea"
        />
      </label>
      <div className="button-row">
        <button onClick={handleLoad} disabled={pasted.trim().length === 0} data-testid="scenario-load-btn">
          Validate + load
        </button>
      </div>
      {feedback && <p className="callout">{feedback}</p>}
      {warnings.length > 0 && (
        <div className="callout" data-testid="scenario-warnings">
          <strong>{warnings.length} warning(s) during migration:</strong>
          <ul>
            {warnings.slice(0, 6).map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div className="callout warn" data-testid="scenario-errors">
          <strong>{errors.length} error(s):</strong>
          <ul>
            {errors.slice(0, 6).map((error, idx) => (
              <li key={idx}><code>{error.path || "$"}</code>: {error.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
