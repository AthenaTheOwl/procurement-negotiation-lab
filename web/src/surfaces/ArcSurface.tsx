import { useEffect, useMemo, useReducer } from "react";
import type { Dispatch } from "react";
import { arcSteps, type ArcStep } from "../data/arc";
import { scenarioPresets } from "../data/scenarios";
import { compileFormula } from "../model/formula";
import { runDecoyAudit } from "../model/decoys";
import {
  algorithmResults,
  effectiveCapacity,
  frontier,
  informationSweep,
  labTakeaway,
  makeScenario,
  transferLedger,
} from "../model/simulation";
import type { AlgorithmResult, LabScenario } from "../model/types";

const authoredFormulaKey = "procurement-lab-authored-formula";
const defaultFormula = "100 * min(q, demand) - unit_price * q - 500 * risk_score";
const allowedFormulaVars = ["q", "demand", "unit_price", "risk_score", "capacity", "lead_time", "volatility"];
const caseIds = ["joint-exists-admm-converges", "joint-exists-admm-oscillates", "joint-does-not-exist"];

interface ArcSurfaceProps {
  onOpenLab: () => void;
}

interface ArcState {
  currentStep: number;
  scenario: LabScenario;
  privacyModeIndex: number;
  formula: string;
  scenarioJson: string;
  jointCaseId: string;
  splitRule: "proportional" | "equal";
  copyStatus: string;
  alpha: number;
  epsilon: number;
  showDecoys: boolean;
}

type ArcAction =
  | { type: "go"; step: number }
  | { type: "next" }
  | { type: "back" }
  | { type: "privacy"; index: number }
  | { type: "formula"; formula: string }
  | { type: "reset-formula" }
  | { type: "scenario"; scenario: LabScenario }
  | { type: "scenario-json"; value: string }
  | { type: "joint-case"; id: string }
  | { type: "split"; rule: "proportional" | "equal" }
  | { type: "copy-status"; value: string }
  | { type: "alpha"; value: number }
  | { type: "epsilon"; value: number }
  | { type: "show-decoys"; value: boolean };

function initialArcState(): ArcState {
  const scenario = makeScenario();
  const formula = localStorage.getItem(authoredFormulaKey) ?? defaultFormula;
  return {
    currentStep: 0,
    scenario,
    privacyModeIndex: 4,
    formula,
    scenarioJson: JSON.stringify(scenario, null, 2),
    jointCaseId: caseIds[0],
    splitRule: "proportional",
    copyStatus: "",
    alpha: scenario.alpha,
    epsilon: scenario.epsilon,
    showDecoys: false,
  };
}

function reducer(state: ArcState, action: ArcAction): ArcState {
  switch (action.type) {
    case "go":
      return { ...state, currentStep: clamp(action.step, 0, arcSteps.length - 1) };
    case "next":
      return { ...state, currentStep: clamp(state.currentStep + 1, 0, arcSteps.length - 1) };
    case "back":
      return { ...state, currentStep: clamp(state.currentStep - 1, 0, arcSteps.length - 1) };
    case "privacy":
      return { ...state, privacyModeIndex: action.index };
    case "formula":
      return { ...state, formula: action.formula };
    case "reset-formula":
      return { ...state, formula: defaultFormula };
    case "scenario":
      return { ...state, scenario: action.scenario, scenarioJson: JSON.stringify(action.scenario, null, 2) };
    case "scenario-json":
      return { ...state, scenarioJson: action.value };
    case "joint-case":
      return { ...state, jointCaseId: action.id };
    case "split":
      return { ...state, splitRule: action.rule };
    case "copy-status":
      return { ...state, copyStatus: action.value };
    case "alpha":
      return { ...state, alpha: action.value, scenario: makeScenario({ ...state.scenario, alpha: action.value }) };
    case "epsilon":
      return { ...state, epsilon: action.value, scenario: makeScenario({ ...state.scenario, epsilon: action.value }) };
    case "show-decoys":
      return { ...state, showDecoys: action.value };
    default:
      return state;
  }
}

export function ArcSurface({ onOpenLab }: ArcSurfaceProps) {
  const [state, dispatch] = useReducer(reducer, undefined, initialArcState);
  const step = arcSteps[state.currentStep];

  useEffect(() => {
    localStorage.setItem(authoredFormulaKey, state.formula);
  }, [state.formula]);

  return (
    <section className="arc-shell" data-testid="arc-surface">
      <div className="arc-layout">
        <aside className="arc-progress" aria-label="Arc steps">
          <div className="section-label">Guided arc</div>
          <h2>From local plans to a mechanism</h2>
          <ol>
            {arcSteps.map((arcStep, index) => (
              <li key={arcStep.id}>
                <button className={index === state.currentStep ? "active" : ""} onClick={() => dispatch({ type: "go", step: index })}>
                  <span>{index + 1}</span>
                  {arcStep.title.replace(/^\d+\.\s*/, "")}
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <article className="arc-card">
          <div className="arc-card-head">
            <div>
              <div className="section-label">Step {state.currentStep + 1} of {arcSteps.length}</div>
              <h2>{step.title}</h2>
              <p>{step.thesis}</p>
            </div>
            <button className="secondary" onClick={onOpenLab}>
              Open in Lab
            </button>
          </div>

          <StepBody step={step} state={state} dispatch={dispatch} />

          <div className="arc-nav">
            <button className="secondary" disabled={state.currentStep === 0} onClick={() => dispatch({ type: "back" })}>
              Back
            </button>
            <button className="primary" disabled={state.currentStep === arcSteps.length - 1} onClick={() => dispatch({ type: "next" })}>
              Next
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function StepBody({ step, state, dispatch }: { step: ArcStep; state: ArcState; dispatch: Dispatch<ArcAction> }) {
  switch (step.id) {
    case "gap":
      return <CoordinationGapStep scenario={state.scenario} />;
    case "privacy":
      return <PrivacyStep state={state} dispatch={dispatch} />;
    case "truth":
      return <TruthStep state={state} dispatch={dispatch} />;
    case "admm":
      return <AdmmStep scenario={state.scenario} />;
    case "algorithms":
      return <AlgorithmsStep scenario={state.scenario} />;
    case "author":
      return <AuthorStep state={state} dispatch={dispatch} />;
    case "joint-cases":
      return <JointCasesStep state={state} dispatch={dispatch} />;
    case "cbt":
      return <CbtStep scenario={state.scenario} splitRule={state.splitRule} dispatch={dispatch} />;
  }
}

function CoordinationGapStep({ scenario }: { scenario: LabScenario }) {
  const runs = algorithmResults(scenario);
  const jit = runs.find((run) => run.id === "jit-baseline") ?? runs[0];
  const oracle = runs.find((run) => run.id === "centralized-oracle") ?? runs[0];
  const takeaway = labTakeaway(scenario);
  return (
    <div className="arc-widget" data-testid="arc-step-gap">
      <div className="callout large">{takeaway.soWhat}</div>
      <MetricGrid
        rows={[
          ["Local JIT utility", money(jit.globalUtility), "What the buyer gets by planning locally."],
          ["Oracle utility", money(oracle.globalUtility), "The all-knowing benchmark."],
          ["Coordination gap", money(takeaway.coordinationGap), "The so-what number on the landing page."],
          ["Best non-oracle rule", takeaway.bestMechanism.name, "Best implementable mechanism in this run."],
        ]}
      />
    </div>
  );
}

function PrivacyStep({ state, dispatch }: { state: ArcState; dispatch: Dispatch<ArcAction> }) {
  const sweep = informationSweep(state.scenario);
  const selected = sweep[state.privacyModeIndex] ?? sweep[0];
  const supplierCapacity = effectiveCapacity("supplier", state.scenario);
  return (
    <div className="arc-widget" data-testid="arc-step-privacy">
      <div className="callout">
        <strong>Reliability prior:</strong> privacy does not mean believing every stated number. Here, Cinder states {supplierCapacity.stated} units, but a {Math.round(supplierCapacity.reliability * 100)}% reliability prior makes the planner treat it as {supplierCapacity.effective} effective units.
      </div>
      <label className="slider-label">
        <span>
          Information shared: <strong>{selected.label}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={sweep.length - 1}
          step={1}
          value={state.privacyModeIndex}
          onChange={(event) => dispatch({ type: "privacy", index: Number(event.target.value) })}
        />
      </label>
      <BarList
        title="Utility rises, privacy exposure rises too"
        rows={sweep.map((row) => ({ label: row.label, value: row.globalUtility }))}
        formatter={money}
      />
      <MetricGrid
        rows={[
          ["Selected utility", money(selected.globalUtility), "Joint utility under the selected information mode."],
          ["Privacy exposure", `${Math.round(selected.privacy * 100)}%`, "A teaching proxy for how much sensitive posture is exposed."],
          ["Residual", `${selected.residual} units`, "Remaining disagreement between buyer ask and supplier comfort."],
        ]}
      />
    </div>
  );
}

function TruthStep({ state, dispatch }: { state: ArcState; dispatch: Dispatch<ArcAction> }) {
  const runs = algorithmResults(state.scenario);
  const rows = ["price-only", "cpp-vcg"].map((id) => runs.find((run) => run.id === id)).filter(Boolean) as AlgorithmResult[];
  const clippedRows = transferLedger(state.scenario, { alpha: state.alpha });
  return (
    <div className="arc-widget" data-testid="arc-step-truth">
      <div className="callout">
        <strong>α clipping:</strong> full VCG transfer has the clean truth-telling story. A smaller α bounds spend, but weakens the dominant-strategy guarantee. That is an operational design choice, not just a math tweak.
      </div>
      <ScenarioSlider
        label="α transfer clipping"
        value={state.alpha}
        min={0}
        max={1}
        step={0.01}
        onChange={(value) => dispatch({ type: "alpha", value })}
      />
      <AlgorithmMiniTable runs={rows} />
      <TransferMiniTable rows={clippedRows} />
    </div>
  );
}

function AdmmStep({ scenario }: { scenario: LabScenario }) {
  const admm = algorithmResults(scenario).find((run) => run.id === "cpp-admm") ?? algorithmResults(scenario)[0];
  const residualPath = Array.from({ length: 8 }, (_, index) =>
    Math.max(0, Math.round(admm.residual * Math.pow(0.72, index) + (admm.convergence === "oscillating" ? (index % 2) * 45 : 0))),
  );
  return (
    <div className="arc-widget" data-testid="arc-step-admm">
      <MetricGrid
        rows={[
          ["Convergence", admm.convergence, "Whether the update path settles, stalls, or oscillates."],
          ["Iterations", String(admm.iterations), "How many coordination rounds the protocol needs."],
          ["Final residual", `${admm.residual} units`, "Disagreement left at the end."],
        ]}
      />
      <BarList
        title="Residual path"
        rows={residualPath.map((value, index) => ({ label: `iter ${index + 1}`, value }))}
        formatter={(value) => `${value} units`}
      />
    </div>
  );
}

function AlgorithmsStep({ scenario }: { scenario: LabScenario }) {
  const rows = algorithmResults(scenario).filter((run) =>
    ["cpp-admm", "alternating-best-response", "price-only", "consensus-averaging"].includes(run.id),
  );
  return (
    <div className="arc-widget" data-testid="arc-step-algorithms">
      <AlgorithmMiniTable runs={rows} />
    </div>
  );
}

function AuthorStep({ state, dispatch }: { state: ArcState; dispatch: Dispatch<ArcAction> }) {
  const sample = {
    q: Math.round(state.scenario.demand * 0.92),
    demand: state.scenario.demand,
    unit_price: 56,
    risk_score: state.scenario.volatility,
    capacity: Math.round(state.scenario.demand * (1.18 - state.scenario.capacityTightness * 0.32)),
    lead_time: state.scenario.leadTimeWeeks,
    volatility: state.scenario.volatility,
  };
  const formulaResult = useMemo(() => {
    try {
      const compiled = compileFormula(state.formula, allowedFormulaVars);
      return { value: compiled.evaluate(sample), error: "" };
    } catch (error) {
      return { value: 0, error: error instanceof Error ? error.message : String(error) };
    }
  }, [sample.capacity, sample.demand, sample.lead_time, sample.q, sample.risk_score, sample.volatility, state.formula]);
  const decoyRows = useMemo(() => runDecoyAudit(state.scenario), [state.scenario]);

  function updateScenario(overrides: Partial<LabScenario>) {
    dispatch({ type: "scenario", scenario: makeScenario({ ...state.scenario, ...overrides }) });
  }

  async function copyScenario() {
    const value = JSON.stringify(state.scenario, null, 2);
    try {
      await navigator.clipboard?.writeText(value);
      dispatch({ type: "copy-status", value: "Scenario JSON copied." });
    } catch {
      dispatch({ type: "copy-status", value: "Copy unavailable here; select the JSON text below." });
    }
  }

  function loadScenario() {
    try {
      const parsed = JSON.parse(state.scenarioJson) as Partial<LabScenario>;
      dispatch({ type: "scenario", scenario: makeScenario(parsed) });
      dispatch({ type: "copy-status", value: "Loaded scenario JSON." });
    } catch {
      dispatch({ type: "copy-status", value: "Invalid JSON. Keep the saved object shape intact." });
    }
  }

  return (
    <div className="arc-widget" data-testid="arc-step-author">
      <label className="formula-label">
        Utility formula
        <textarea value={state.formula} onChange={(event) => dispatch({ type: "formula", formula: event.target.value })} />
      </label>
      <div className={formulaResult.error ? "formula-error" : "formula-result"}>
        {formulaResult.error ? formulaResult.error : `Sample utility: ${money(formulaResult.value)}`}
      </div>
      <div className="button-row">
        <button className="secondary" onClick={() => dispatch({ type: "reset-formula" })}>
          Reset formula
        </button>
        <button className="secondary" onClick={() => dispatch({ type: "show-decoys", value: !state.showDecoys })}>
          Test against decoys
        </button>
      </div>
      {state.showDecoys && (
        <div className="table-wrap" data-testid="arc-decoy-results">
          <table>
            <thead>
              <tr>
                <th>Decoy</th>
                <th>Status</th>
                <th>Why it matters</th>
              </tr>
            </thead>
            <tbody>
              {decoyRows.map((row) => (
                <tr key={row.decoyId}>
                  <td>{row.title}</td>
                  <td>{row.match ? "match" : "mismatch"}</td>
                  <td>{row.catchesMisreportKind}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="three-col">
        <ScenarioSlider label="Volatility" value={state.scenario.volatility} min={0.05} max={0.7} step={0.01} onChange={(volatility) => updateScenario({ volatility })} />
        <ScenarioSlider label="Capacity tightness" value={state.scenario.capacityTightness} min={0.1} max={0.98} step={0.01} onChange={(capacityTightness) => updateScenario({ capacityTightness })} />
        <ScenarioSlider label="Lead time" value={state.scenario.leadTimeWeeks} min={4} max={24} step={1} onChange={(leadTimeWeeks) => updateScenario({ leadTimeWeeks })} />
      </div>
      <div className="two-col">
        <label className="formula-label">
          Scenario JSON
          <textarea value={state.scenarioJson} onChange={(event) => dispatch({ type: "scenario-json", value: event.target.value })} />
        </label>
        <div>
          <button className="secondary full" onClick={copyScenario}>
            Save as JSON
          </button>
          <button className="secondary full" onClick={loadScenario}>
            Load JSON
          </button>
          <p className="muted">{state.copyStatus}</p>
        </div>
      </div>
    </div>
  );
}

function JointCasesStep({ state, dispatch }: { state: ArcState; dispatch: Dispatch<ArcAction> }) {
  const scenario = makeScenario({ presetId: state.jointCaseId, alpha: state.alpha, epsilon: state.epsilon });
  const preset = scenarioPresets.find((item) => item.id === state.jointCaseId) ?? scenarioPresets[0];
  const runs = algorithmResults(scenario).filter((run) => ["cpp-admm", "alternating-best-response", "cpp-vcg"].includes(run.id));
  const best = runs.find((run) => run.id === "cpp-vcg") ?? runs[0];
  const frontierData = frontier(scenario, best.id, state.epsilon);
  const selectedFrontierPlan = frontierData.plans[0];
  const ledger = transferLedger(scenario, { planUtility: selectedFrontierPlan?.globalUtility ?? best.globalUtility });
  const feasible = ledger.every((row) => row.noWorseOff) && best.feasible;
  return (
    <div className="arc-widget" data-testid="arc-step-joint-cases">
      <div className="tab-row" role="tablist" aria-label="Joint optimum cases">
        {caseIds.map((id) => {
          const tabPreset = scenarioPresets.find((item) => item.id === id);
          return (
            <button key={id} role="tab" className={id === state.jointCaseId ? "active" : ""} onClick={() => dispatch({ type: "joint-case", id })}>
              {tabPreset?.name ?? id}
            </button>
          );
        })}
      </div>
      <div className="callout">
        <strong>{preset.name}:</strong> {preset.soWhat}
      </div>
      <ScenarioSlider
        label="ε near-optimal frontier"
        value={state.epsilon}
        min={0}
        max={0.12}
        step={0.01}
        onChange={(value) => dispatch({ type: "epsilon", value })}
      />
      <p className="muted">
        ε controls how many almost-best plans you are willing to inspect. The lesson: the highest utility plan is not always the most robust plan.
      </p>
      <AlgorithmMiniTable runs={runs} />
      <BarList
        title="Near-optimal plan frontier"
        rows={frontierData.plans.map((plan) => ({ label: plan.label, value: plan.globalUtility }))}
        formatter={money}
      />
      <p className={feasible ? "formula-result" : "formula-error"}>
        CBT feasibility: {feasible ? "feasible - every party clears its outside option." : "not feasible - the plan does not create enough surplus to make every party whole."}
      </p>
    </div>
  );
}

function CbtStep({ scenario, splitRule, dispatch }: { scenario: LabScenario; splitRule: "proportional" | "equal"; dispatch: Dispatch<ArcAction> }) {
  const best = labTakeaway(scenario).bestMechanism;
  const rows = transferRows(best.globalUtility, splitRule);
  return (
    <div className="arc-widget" data-testid="arc-step-cbt">
      <div className="button-row">
        <button className={splitRule === "proportional" ? "active" : "secondary"} onClick={() => dispatch({ type: "split", rule: "proportional" })}>
          Proportional split
        </button>
        <button className={splitRule === "equal" ? "active" : "secondary"} onClick={() => dispatch({ type: "split", rule: "equal" })}>
          Equal split
        </button>
      </div>
      <TransferMiniTable rows={rows} />
    </div>
  );
}

function MetricGrid({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="metric-grid">
      {rows.map(([label, value, help]) => (
        <div className="metric" key={label}>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
          <p>{help}</p>
        </div>
      ))}
    </div>
  );
}

function AlgorithmMiniTable({ runs }: { runs: AlgorithmResult[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>Convergence</th>
            <th>Iterations</th>
            <th>Runtime</th>
            <th>Residual</th>
            <th>Oracle gap</th>
            <th>Plain-English read</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{run.name}</td>
              <td>{run.convergence}</td>
              <td>{run.iterations}</td>
              <td>{run.runtimeMs} ms</td>
              <td>{run.residual} units</td>
              <td>{money(run.oracleGap)}</td>
              <td>{run.plainEnglish}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferMiniTable({ rows }: { rows: TransferRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Party</th>
            <th>Before transfer</th>
            <th>Outside option</th>
            <th>Transfer</th>
            <th>After transfer</th>
            <th>No worse off?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
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
    </div>
  );
}

function BarList({
  title,
  rows,
  formatter,
}: {
  title: string;
  rows: Array<{ label: string; value: number }>;
  formatter: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="bar-list">
      <h4>{title}</h4>
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <span>{row.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }} />
          </div>
          <strong>{formatter(row.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function ScenarioSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-label">
      <span>
        {label}: <strong>{step === 1 ? value : value.toFixed(2)}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

type TransferRow = ReturnType<typeof transferLedger>[number];

function transferRows(globalUtility: number, splitRule: "proportional" | "equal"): TransferRow[] {
  const baseRows = transferLedger(globalUtility);
  if (splitRule === "proportional") {
    return baseRows;
  }
  const buyer = baseRows[0];
  const supplier = baseRows[1];
  const surplus = globalUtility - buyer.outsideOption - supplier.outsideOption;
  const half = surplus > 0 ? surplus / 2 : 0;
  return [
    {
      ...buyer,
      transfer: half - Math.max(0, buyer.utilityBeforeTransfer - buyer.outsideOption),
      utilityAfterTransfer: buyer.outsideOption + half,
      noWorseOff: surplus > 0,
    },
    {
      ...supplier,
      transfer: half - Math.max(0, supplier.utilityBeforeTransfer - supplier.outsideOption),
      utilityAfterTransfer: supplier.outsideOption + half,
      noWorseOff: surplus > 0,
    },
  ];
}

function money(value: number): string {
  const abs = Math.abs(value);
  const formatted = `$${Math.round(abs).toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
