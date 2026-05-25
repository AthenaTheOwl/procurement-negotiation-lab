import { assembleReport, makeScenario, type RunReport } from "@lab/engine";

export type FactoryTaskStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "done"
  | "failed";

export interface FactoryTaskEvidence {
  id: string;
  title: string;
  specPath: string;
  status: FactoryTaskStatus;
  currentStep: string;
  traceId: string;
  awaitingCheckpoint: string | null;
  lastThreadId: string | null;
  lastRunId: string | null;
  updatedAt: string;
}

export interface FactoryArtifactEvidence {
  taskId: string;
  kind: string;
  round: number;
  path: string;
  sha1: string;
  size: number;
  summary: string;
}

export interface FactoryEventEvidence {
  taskId: string;
  kind: string;
  at: string;
  traceId: string;
  payload?: Record<string, string | number | boolean | null>;
}

export interface FactoryConsoleFixture {
  sourceLabel: string;
  generatedAt: string;
  tasks: FactoryTaskEvidence[];
  artifacts: FactoryArtifactEvidence[];
  events: FactoryEventEvidence[];
  runReport: RunReport;
}

export interface FactoryTaskView extends FactoryTaskEvidence {
  statusLabel: string;
  artifactCount: number;
  eventCount: number;
  checkpointLabel: string;
  lastEventKind: string;
}

export interface FactoryCheckpointView {
  taskId: string;
  kind: string;
  checkpoint: string;
  at: string;
  traceId: string;
  artifactPath: string | null;
}

export interface FactoryReportSummary {
  id: string;
  label: string;
  timestamp: string;
  scenarioId: string;
  coordinationGap: number;
  bestNonOracle: string;
  bestNonOracleGap: number;
  algorithmCount: number;
}

export interface FactoryConsoleViewModel {
  sourceLabel: string;
  generatedAt: string;
  tasks: FactoryTaskView[];
  activeTask: FactoryTaskView;
  artifacts: FactoryArtifactEvidence[];
  checkpoints: FactoryCheckpointView[];
  eventCounts: Record<string, number>;
  reportSummary: FactoryReportSummary;
  replayJson: string;
  replayHref: string;
}

const STATUS_LABELS: Record<FactoryTaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  awaiting_approval: "Awaiting approval",
  done: "Done",
  failed: "Failed",
};

const STATUS_ORDER: Record<FactoryTaskStatus, number> = {
  awaiting_approval: 0,
  running: 1,
  pending: 2,
  failed: 3,
  done: 4,
};

function buildReplayReport(): RunReport {
  const report = assembleReport({
    scenario: makeScenario({
      presetId: "substrate-crunch",
      alpha: 0.9,
      epsilon: 0.04,
      infoMode: "forecast-band",
    }),
    auditMode: false,
    label: "Factory console replay",
    notes: "Static fixture used by the factory console.",
  });
  return {
    ...report,
    id: "run-factory-console-demo",
    timestamp: "2026-05-25T12:00:00.000Z",
    label: "Factory console replay",
  };
}

export const factoryConsoleFixture: FactoryConsoleFixture = {
  sourceLabel: "ops/factory-tasks/example-with-checkpoint.yaml",
  generatedAt: "2026-05-25T12:00:00.000Z",
  tasks: [
    {
      id: "example-with-checkpoint",
      title: "Add a single example test to scripts.factory",
      specPath: "specs/0009-factory-dev-control-plane/",
      status: "awaiting_approval",
      currentStep: "await:plan_review",
      traceId: "trace-example-checkpoint-2026-05-25",
      awaitingCheckpoint: "plan_review",
      lastThreadId: "tagged:stub-plan-example-with-checkpoint",
      lastRunId: "tagged:stub-run-example-with-checkpoint",
      updatedAt: "2026-05-25T12:00:00.000Z",
    },
    {
      id: "real-cli-smoke",
      title: "Add real CLI smoke test",
      specPath: "specs/0009-factory-dev-control-plane/",
      status: "done",
      currentStep: "push",
      traceId: "trace-real-cli-smoke-2026-05-24",
      awaitingCheckpoint: null,
      lastThreadId: "a18244d7-7b86-41d0-9f79-da946d05bc3b",
      lastRunId: "fbe57e64-5854-4e3b-a151-954d21c5bc42",
      updatedAt: "2026-05-24T18:40:00.000Z",
    },
  ],
  artifacts: [
    {
      taskId: "example-with-checkpoint",
      kind: "plan",
      round: 0,
      path: "ops/factory-artifacts/example-with-checkpoint/0-plan.txt",
      sha1: "3d6a1c0e7d18c22565b1a7c67d8a2d5501f09f31",
      size: 1284,
      summary: "Planner output waiting for human plan_review approval.",
    },
    {
      taskId: "real-cli-smoke",
      kind: "plan",
      round: 0,
      path: "ops/factory-artifacts/real-cli-smoke/0-plan.txt",
      sha1: "46b5710f203cf4d0d0915ef5dca6a58c8b1d1103",
      size: 3719,
      summary: "Claude CLI plan artifact captured with real session metadata.",
    },
    {
      taskId: "real-cli-smoke",
      kind: "gate-py-compile-smoke",
      round: 0,
      path: "ops/factory-artifacts/real-cli-smoke/0-gate-py-compile-smoke.txt",
      sha1: "a0a4d52a51f2228d63f3c5b0f84f359ec1aa302a",
      size: 96,
      summary: "py_compile gate passed for the smoke test file.",
    },
    {
      taskId: "real-cli-smoke",
      kind: "review",
      round: 0,
      path: "ops/factory-artifacts/real-cli-smoke/0-review.txt",
      sha1: "f8a08f30c51a6a7779b2f03610c9c44cc0a77ea2",
      size: 1809,
      summary: "Review artifact for the completed sample run.",
    },
  ],
  events: [
    {
      taskId: "example-with-checkpoint",
      kind: "task.started",
      at: "2026-05-25T11:58:10.000Z",
      traceId: "trace-example-checkpoint-2026-05-25",
      payload: { step: "plan" },
    },
    {
      taskId: "example-with-checkpoint",
      kind: "artifact.written",
      at: "2026-05-25T11:59:02.000Z",
      traceId: "trace-example-checkpoint-2026-05-25",
      payload: {
        kind: "plan",
        path: "ops/factory-artifacts/example-with-checkpoint/0-plan.txt",
      },
    },
    {
      taskId: "example-with-checkpoint",
      kind: "checkpoint.paused",
      at: "2026-05-25T12:00:00.000Z",
      traceId: "trace-example-checkpoint-2026-05-25",
      payload: {
        checkpoint: "plan_review",
        artifactPath: "ops/factory-artifacts/example-with-checkpoint/0-plan.txt",
      },
    },
    {
      taskId: "real-cli-smoke",
      kind: "gate.done",
      at: "2026-05-24T18:32:15.000Z",
      traceId: "trace-real-cli-smoke-2026-05-24",
      payload: { gate: "py-compile-smoke", ok: true },
    },
    {
      taskId: "real-cli-smoke",
      kind: "review.done",
      at: "2026-05-24T18:37:21.000Z",
      traceId: "trace-real-cli-smoke-2026-05-24",
      payload: { reviewer: "claude_code", status: "clean" },
    },
    {
      taskId: "real-cli-smoke",
      kind: "task.done",
      at: "2026-05-24T18:40:00.000Z",
      traceId: "trace-real-cli-smoke-2026-05-24",
      payload: { branch: "factory/real-cli-smoke" },
    },
  ],
  runReport: buildReplayReport(),
};

function labelCheckpoint(checkpoint: string | null): string {
  return checkpoint ? checkpoint.replaceAll("_", " ") : "None";
}

function payloadString(
  event: FactoryEventEvidence,
  key: string,
): string | null {
  const value = event.payload?.[key];
  return typeof value === "string" ? value : null;
}

function summarizeReport(report: RunReport): FactoryReportSummary {
  const scenarioId = String(report.scenario.presetId ?? "scenario");
  return {
    id: report.id,
    label: report.label,
    timestamp: report.timestamp,
    scenarioId,
    coordinationGap: report.computed.coordinationGap,
    bestNonOracle: report.computed.bestNonOracle,
    bestNonOracleGap: report.computed.bestNonOracleGap,
    algorithmCount: report.algorithmResults.length,
  };
}

export function normalizeFactoryConsoleData(
  fixture: FactoryConsoleFixture = factoryConsoleFixture,
): FactoryConsoleViewModel {
  const tasks = fixture.tasks
    .map((task) => {
      const taskArtifacts = fixture.artifacts.filter((artifact) => artifact.taskId === task.id);
      const taskEvents = fixture.events.filter((event) => event.taskId === task.id);
      const lastEvent = [...taskEvents].sort((a, b) => b.at.localeCompare(a.at))[0];
      return {
        ...task,
        statusLabel: STATUS_LABELS[task.status],
        artifactCount: taskArtifacts.length,
        eventCount: taskEvents.length,
        checkpointLabel: labelCheckpoint(task.awaitingCheckpoint),
        lastEventKind: lastEvent?.kind ?? "none",
      };
    })
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const activeTask = tasks[0];
  if (!activeTask) {
    throw new Error("factory console fixture must include at least one task");
  }

  const artifacts = fixture.artifacts
    .filter((artifact) => artifact.taskId === activeTask.id)
    .sort((a, b) => a.round - b.round || a.kind.localeCompare(b.kind));

  const checkpoints = fixture.events
    .filter((event) => event.kind.startsWith("checkpoint."))
    .map((event) => ({
      taskId: event.taskId,
      kind: event.kind,
      checkpoint: payloadString(event, "checkpoint") ?? "unknown",
      at: event.at,
      traceId: event.traceId,
      artifactPath: payloadString(event, "artifactPath"),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));

  const eventCounts = fixture.events.reduce<Record<string, number>>(
    (counts, event) => ({
      ...counts,
      [event.kind]: (counts[event.kind] ?? 0) + 1,
    }),
    {},
  );

  const compactJson = JSON.stringify(fixture.runReport);
  return {
    sourceLabel: fixture.sourceLabel,
    generatedAt: fixture.generatedAt,
    tasks,
    activeTask,
    artifacts,
    checkpoints,
    eventCounts,
    reportSummary: summarizeReport(fixture.runReport),
    replayJson: JSON.stringify(fixture.runReport, null, 2),
    replayHref: `/?json=${encodeURIComponent(compactJson)}`,
  };
}
