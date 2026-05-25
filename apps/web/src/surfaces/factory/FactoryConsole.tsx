import {
  normalizeFactoryConsoleData,
  type FactoryConsoleViewModel,
  type FactoryTaskStatus,
} from "./factoryConsoleData";

export interface FactoryConsoleProps {
  onOpenHome?: () => void;
  model?: FactoryConsoleViewModel;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatMoney(value: number): string {
  return money.format(Math.round(value));
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTime.format(date);
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function statusClass(status: FactoryTaskStatus): string {
  if (status === "awaiting_approval") return "factory-status-awaiting";
  return `factory-status-${status}`;
}

export function FactoryConsole({
  onOpenHome,
  model = normalizeFactoryConsoleData(),
}: FactoryConsoleProps) {
  const eventEntries = Object.entries(model.eventCounts).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  return (
    <main className="factory-console" data-testid="factory-console">
      <header className="factory-console-header">
        <div>
          <div className="section-label">Factory console</div>
          <h1>Development factory replay</h1>
          <p>
            Read-only evidence from the local factory subsystem. Agent execution is off in
            the browser.
          </p>
        </div>
        <div className="factory-console-actions">
          {onOpenHome && (
            <button type="button" className="secondary" onClick={onOpenHome}>
              Home
            </button>
          )}
          <a className="factory-link-button" href={model.replayHref}>
            Open replay report
          </a>
        </div>
      </header>

      <section className="factory-metrics" aria-label="Factory replay summary">
        <div>
          <span>Mode</span>
          <strong>Static replay</strong>
        </div>
        <div>
          <span>Tasks</span>
          <strong>{model.tasks.length}</strong>
        </div>
        <div>
          <span>Artifacts</span>
          <strong>
            {model.tasks.reduce((total, task) => total + task.artifactCount, 0)}
          </strong>
        </div>
        <div>
          <span>Source</span>
          <strong>{model.sourceLabel}</strong>
        </div>
      </section>

      <div className="factory-console-grid">
        <section className="factory-panel" data-testid="factory-task-state">
          <div className="factory-panel-header">
            <h2>Task state</h2>
            <span>{formatDate(model.generatedAt)}</span>
          </div>
          <div className="factory-task-list">
            {model.tasks.map((task) => (
              <article
                className="factory-task-row"
                data-testid={`factory-task-${task.id}`}
                key={task.id}
              >
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.id}</span>
                </div>
                <div className="factory-task-meta">
                  <span className={`factory-status ${statusClass(task.status)}`}>
                    {task.statusLabel}
                  </span>
                  <span>{task.currentStep}</span>
                  <span>{task.artifactCount} artifacts</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="factory-panel" data-testid="factory-checkpoint-state">
          <div className="factory-panel-header">
            <h2>Checkpoint interrupt</h2>
            <span>{model.activeTask.traceId}</span>
          </div>
          <div className="factory-active-task" data-testid="factory-active-task">
            <span>Active task</span>
            <strong>{model.activeTask.id}</strong>
            <p>
              {model.activeTask.statusLabel} at {model.activeTask.checkpointLabel}.
            </p>
          </div>
          <ul className="factory-event-list">
            {model.checkpoints.map((checkpoint) => (
              <li key={`${checkpoint.taskId}-${checkpoint.kind}-${checkpoint.at}`}>
                <strong>{checkpoint.kind}</strong>
                <span>
                  {checkpoint.checkpoint} at {formatDate(checkpoint.at)}
                </span>
                {checkpoint.artifactPath && <code>{checkpoint.artifactPath}</code>}
              </li>
            ))}
          </ul>
        </section>

        <section className="factory-panel factory-panel-wide" data-testid="factory-artifacts">
          <div className="factory-panel-header">
            <h2>Artifacts</h2>
            <span>{model.activeTask.id}</span>
          </div>
          <table className="factory-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Kind</th>
                <th>Path</th>
                <th>Size</th>
                <th>SHA1</th>
              </tr>
            </thead>
            <tbody>
              {model.artifacts.map((artifact) => (
                <tr key={`${artifact.taskId}-${artifact.round}-${artifact.kind}`}>
                  <td>{artifact.round}</td>
                  <td>{artifact.kind}</td>
                  <td>
                    <code>{artifact.path}</code>
                    <span>{artifact.summary}</span>
                  </td>
                  <td>{formatBytes(artifact.size)}</td>
                  <td>
                    <code>{artifact.sha1.slice(0, 10)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="factory-panel" data-testid="factory-run-report">
          <div className="factory-panel-header">
            <h2>Run report</h2>
            <span>{model.reportSummary.id}</span>
          </div>
          <dl className="factory-report-list">
            <div>
              <dt>Scenario</dt>
              <dd>{model.reportSummary.scenarioId}</dd>
            </div>
            <div>
              <dt>Coordination gap</dt>
              <dd>{formatMoney(model.reportSummary.coordinationGap)}</dd>
            </div>
            <div>
              <dt>Best non-oracle</dt>
              <dd>{model.reportSummary.bestNonOracle}</dd>
            </div>
            <div>
              <dt>Oracle gap</dt>
              <dd>{formatMoney(model.reportSummary.bestNonOracleGap)}</dd>
            </div>
            <div>
              <dt>Mechanisms</dt>
              <dd>{model.reportSummary.algorithmCount}</dd>
            </div>
          </dl>
          <details className="factory-json">
            <summary>Replay payload</summary>
            <pre>{model.replayJson}</pre>
          </details>
        </section>

        <section className="factory-panel" data-testid="factory-event-counts">
          <div className="factory-panel-header">
            <h2>Event counts</h2>
            <span>{model.activeTask.lastEventKind}</span>
          </div>
          <ul className="factory-event-counts">
            {eventEntries.map(([kind, count]) => (
              <li key={kind}>
                <span>{kind}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
