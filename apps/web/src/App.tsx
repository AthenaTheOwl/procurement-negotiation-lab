import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Hero } from "./components/Hero";
import type { AlgorithmResult, ChipMapSeed, Choice, EvidenceAttachment, FrontierPlan, ImportResult, InfoMode, LabScenario, Participant, RoundResult, RunReport, ScoreState, SplitRule, Surface, ViewMode } from "@lab/engine";
import { agentById, agentsForSide, algorithmResults, deriveParticipants, detectEnding, effectiveCapacity, evaluateRound, frontier, glossary, infoModeLabel, informationSweep, initialScores, labTakeaway, makeScenario, mergeProvenance, multiPartyLedger, presetById, redactForView, runDecoyAudit, scenarioPresets, substrateCrunch, tag as tagProvenance, termOrder, transferLedger } from "@lab/engine";
import { ArcSurface } from "./surfaces/ArcSurface";
import { ReportSurface } from "./surfaces/report/ReportSurface";
import { ViewPicker } from "./components/ViewPicker";
import { ParticipantRoster } from "./components/ParticipantRoster";
import { MultiPartyTransferTable } from "./components/MultiPartyTransferTable";
import { RunReportPanel } from "./components/RunReportPanel";
import { CSVImportPanel } from "./components/CSVImportPanel";
import { BridgePanel } from "./components/BridgePanel";
import { ProvenanceBadge } from "./components/ProvenanceBadge";
import { ScenarioImportExportPanel } from "./components/ScenarioImportExportPanel";
import { ParticipantBuilder } from "./components/ParticipantBuilder";
import { SourceGraph } from "./surfaces/arena/SourceGraph";
type PlayPhase = "briefing" | "reveal" | "finished";

const infoModes: InfoMode[] = [
  "private",
  "risk-only",
  "capacity-band",
  "cost-band",
  "forecast-band",
  "full-oracle",
];

export default function App() {
  const [surface, setSurface] = useState<Surface>(initialSurface);
  const reportRouteId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("report") : null;
  const reportRouteJson = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("json") : null;
  if (reportRouteId || reportRouteJson) {
    return (
      <div className="app-shell report-shell">
        <main>
          <ReportSurface />
        </main>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <Hero onStartArc={() => setSurface("arc")} onOpenLab={() => setSurface("lab")} onOpenPlay={() => setSurface("play")} />
      <nav className="app-nav" aria-label="Main sections">
        <button className={surface === "arc" ? "active" : ""} onClick={() => setSurface("arc")}>
          Walk the arc
        </button>
        <button className={surface === "play" ? "active" : ""} onClick={() => setSurface("play")}>
          Play the case
        </button>
        <button className={surface === "lab" ? "active" : ""} onClick={() => setSurface("lab")}>
          Lab arena
        </button>
        <button className={surface === "study" ? "active" : ""} onClick={() => setSurface("study")}>
          Tutorial
        </button>
      </nav>
      <main>
        {surface === "arc" && <ArcSurface onOpenLab={() => setSurface("lab")} />}
        {surface === "play" && <PlaySurface onOpenLab={() => setSurface("lab")} onOpenStudy={() => setSurface("study")} />}
        {surface === "lab" && <LabSurface />}
        {surface === "study" && <StudySurface />}
      </main>
    </div>
  );
}

function initialSurface(): Surface {
  const hash = window.location.hash.replace("#", "");
  return hash === "arc" || hash === "play" || hash === "lab" || hash === "study" ? hash : "play";
}

function PlaySurface({ onOpenLab, onOpenStudy }: { onOpenLab: () => void; onOpenStudy: () => void }) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [phase, setPhase] = useState<PlayPhase>("briefing");
  const [scores, setScores] = useState<ScoreState>(initialScores);
  const [results, setResults] = useState<RoundResult[]>([]);
  const currentBeat = substrateCrunch.beats[beatIndex];
  const latest = results.at(-1);
  const ending = detectEnding(results, scores);

  function choose(choice: Choice) {
    const result = evaluateRound(currentBeat, choice, scores);
    setResults((previous) => [...previous, result]);
    setScores(result.nextScores);
    setPhase(beatIndex === substrateCrunch.beats.length - 1 ? "finished" : "reveal");
  }

  function continueToNextBeat() {
    setBeatIndex((index) => Math.min(index + 1, substrateCrunch.beats.length - 1));
    setPhase("briefing");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function restart() {
    setBeatIndex(0);
    setPhase("briefing");
    setScores(initialScores);
    setResults([]);
  }

  return (
    <section className="surface-grid">
      <aside className="side-panel">
        <div className="section-label">Your role</div>
        <h2>{substrateCrunch.role}</h2>
        <p>
          You are the buyer at <strong>{substrateCrunch.buyer}</strong>.{" "}
          <strong>{substrateCrunch.supplier}</strong> is the simulated supplier.
        </p>
        <p>{substrateCrunch.job}</p>
        <Scoreboard scores={scores} />
        <button className="secondary full" onClick={restart}>
          Restart case
        </button>
      </aside>

      <div className="main-panel">
        {phase === "briefing" && (
          <RoundBriefing beatIndex={beatIndex} scores={scores} onChoose={choose} onOpenStudy={onOpenStudy} />
        )}
        {phase === "reveal" && latest && (
          <ConsequenceReveal result={latest} onContinue={continueToNextBeat} onOpenStudy={onOpenStudy} />
        )}
        {phase === "finished" && latest && (
          <FinalDebrief
            ending={ending}
            results={results}
            onOpenLab={onOpenLab}
            onRestart={restart}
            onOpenStudy={onOpenStudy}
          />
        )}
      </div>
    </section>
  );
}

function RoundBriefing({
  beatIndex,
  scores,
  onChoose,
  onOpenStudy,
}: {
  beatIndex: number;
  scores: ScoreState;
  onChoose: (choice: Choice) => void;
  onOpenStudy: () => void;
}) {
  const beat = substrateCrunch.beats[beatIndex];
  return (
    <>
      <div className="timeline">Week {beat.week} of 12 - beat {beatIndex + 1} of {substrateCrunch.beats.length}</div>
      <article className="briefing-card" data-testid="round-briefing">
        <div className="section-label">What is happening</div>
        <h2>{beat.title}</h2>
        <p>{beat.briefing}</p>
        <div className="two-col">
          <div>
            <h3>Your decision</h3>
            <p>{beat.decisionPrompt}</p>
          </div>
          <div>
            <h3>What Cinder is thinking</h3>
            <p>{beat.supplierPrivate}</p>
          </div>
        </div>
        <div className="callout">
          <strong>Lesson this round:</strong> {beat.lesson}
        </div>
        <TermRow terms={beat.terms} onOpenStudy={onOpenStudy} />
      </article>

      <h2 className="section-title">Choose one move</h2>
      <div className="decision-grid">
        {beat.choices.map((choice) => (
          <DecisionCard key={choice.id} beat={beat} choice={choice} scores={scores} onChoose={() => onChoose(choice)} />
        ))}
      </div>
    </>
  );
}

function DecisionCard({
  beat,
  choice,
  scores,
  onChoose,
}: {
  beat: typeof substrateCrunch.beats[number];
  choice: Choice;
  scores: ScoreState;
  onChoose: () => void;
}) {
  const preview = evaluateRound(beat, choice, scores);
  return (
    <article className="decision-card">
      <h3>{choice.label}</h3>
      <p>
        <strong>What you are saying:</strong> {choice.say}
      </p>
      <p>
        <strong>Upside:</strong> {choice.upside}
      </p>
      <p>
        <strong>Risk:</strong> {choice.risk}
      </p>
      <div className="choice-foot">
        <span>{Math.round(choice.quantityMultiplier * 100)}% of expected demand</span>
        <span>{infoModeLabel(choice.infoMode)}</span>
      </div>
      <p className="preview">Likely disagreement: about {preview.residual} units.</p>
      <button onClick={onChoose}>Choose this move</button>
    </article>
  );
}

function ConsequenceReveal({
  result,
  onContinue,
  onOpenStudy,
}: {
  result: RoundResult;
  onContinue: () => void;
  onOpenStudy: () => void;
}) {
  return (
    <article className="reveal" data-testid="consequence-reveal">
      <div className="section-label">Consequence reveal</div>
      <h2>{result.choice.label}</h2>
      <div className="callout large">
        <strong>Cinder's response:</strong> {result.cinderResponse}
      </div>
      <p className="lead">{result.plainEnglish}</p>
      <div className="metric-grid">
        <ExplainedMetric label="Your ask" value={`${result.buyerAsk} units`} help="The quantity you signaled you want Cinder to reserve." />
        <ExplainedMetric label="Cinder comfort" value={`${result.supplierComfort} units`} help="The quantity the supplier is comfortable holding under its own constraints." />
        <ExplainedMetric label="Residual" value={`${result.residual} units`} help={glossary.residual} />
        <ExplainedMetric label="Oracle gap" value={money(result.oracleGap)} help={glossary["oracle gap"]} />
      </div>
      <details className="details-box">
        <summary>Under the hood: utility, surplus, and transfer check</summary>
        <div className="metric-grid small">
          <ExplainedMetric label="Buyer utility" value={money(result.buyerUtility)} help={glossary.utility} />
          <ExplainedMetric label="Supplier utility" value={money(result.supplierUtility)} help={glossary.utility} />
          <ExplainedMetric label="Surplus" value={money(result.surplus)} help="Value left after both outside options are covered." />
          <ExplainedMetric label="Transfer feasible" value={result.transferFeasible ? "yes" : "no"} help={glossary.CBT} />
        </div>
      </details>
      <TermRow terms={result.beat.terms} onOpenStudy={onOpenStudy} />
      <button className="primary" onClick={onContinue}>
        Continue to the next week
      </button>
    </article>
  );
}

function FinalDebrief({
  ending,
  results,
  onOpenLab,
  onRestart,
  onOpenStudy,
}: {
  ending: ReturnType<typeof detectEnding>;
  results: RoundResult[];
  onOpenLab: () => void;
  onRestart: () => void;
  onOpenStudy: () => void;
}) {
  return (
    <article className="reveal" data-testid="final-debrief">
      <div className="section-label">Final debrief</div>
      <h2>{ending.title}</h2>
      <p className="lead">{ending.summary}</p>
      <div className="callout">
        <strong>What this run teaches:</strong> {ending.lesson}
      </div>
      <RunPath results={results} />
      <div className="button-row">
        <button className="primary" onClick={onOpenLab}>
          Open the lab arena
        </button>
        <button className="secondary" onClick={onOpenStudy}>
          Read the tutorial
        </button>
        <button className="secondary" onClick={onRestart}>
          Replay the case
        </button>
      </div>
    </article>
  );
}

function LabSurface() {
  const [scenario, setScenario] = useState<LabScenario>(() => makeScenario());
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [auditMode, setAuditMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("coordinator");
  const [evidence, setEvidence] = useState<EvidenceAttachment | null>(null);
  const [importSummary, setImportSummary] = useState<ImportResult | null>(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const runs = useMemo(() => algorithmResults(scenario), [scenario]);
  const info = useMemo(() => informationSweep(scenario), [scenario]);
  const takeaway = useMemo(() => labTakeaway(scenario), [scenario]);
  const frontierData = useMemo(
    () => frontier(scenario, takeaway.bestMechanism.id, scenario.epsilon),
    [scenario, takeaway.bestMechanism.id],
  );
  const auditRows = useMemo(() => runDecoyAudit(scenario), [scenario]);
  const participants = useMemo(() => deriveParticipants(scenario), [scenario]);
  const view = useMemo(() => redactForView(participants, viewMode), [participants, viewMode]);
  const splitRule: SplitRule = scenario.splitRule ?? "proportional";
  const multiRows = useMemo(
    () => multiPartyLedger(scenario, { planUtility: undefined, splitRule }),
    [scenario, splitRule],
  );
  const selectedPreset = presetById(scenario.presetId);
  const buyerAgent = agentById(scenario.buyerAgentId);
  const supplierAgent = agentById(scenario.supplierAgentId);
  const best = takeaway.bestMechanism;
  const selectedPlan =
    frontierData.plans.find((plan) => plan.id === selectedPlanId) ?? frontierData.plans[0];
  const buyerCapacity = effectiveCapacity("buyer", scenario);
  const supplierCapacity = effectiveCapacity("supplier", scenario);

  useEffect(() => {
    if (viewMode === "coordinator") return;
    const stillExists = participants.find((p) => p.id === viewMode.participantId);
    if (!stillExists) setViewMode("coordinator");
  }, [participants, viewMode]);

  function applyPreset(presetId: string) {
    setScenario({ ...makeScenario({ presetId }), provenance: tagProvenance("synthetic") });
    setSelectedPlanId("");
    setEvidence(null);
    setImportSummary(null);
  }

  function applySplitRule(rule: SplitRule) {
    setScenario({ ...scenario, splitRule: rule });
  }

  function applyImport(result: ImportResult) {
    if (!result.ok || !result.seed) return;
    setImportSummary(result);
    setScenario({
      ...scenario,
      participantCount: Math.min(8, Math.max(2, result.seed.derivedParticipants.length)),
      participants: result.seed.derivedParticipants.slice(0, 8),
      provenance: tagProvenance("csv-imported", {
        sourceId: `csv-${result.seed.rows.length}-rows`,
        notes: `CSV import: ${result.seed.rows.length} row(s), ${result.seed.buyerIds.length} buyer(s), ${result.seed.supplierIds.length} supplier(s)`,
      }),
    });
  }

  function applyChipMapSeed(seed: ChipMapSeed) {
    setScenario({
      ...scenario,
      participantCount: Math.min(8, Math.max(2, seed.participants.length)),
      participants: seed.participants.slice(0, 8),
      provenance: mergeProvenance(scenario.provenance ?? tagProvenance("synthetic"), seed.provenance),
    });
  }

  function applyRiskEvidence(attachment: EvidenceAttachment) {
    setEvidence(attachment);
    setScenario({
      ...scenario,
      provenance: mergeProvenance(scenario.provenance ?? tagProvenance("synthetic"), attachment.provenance),
    });
  }

  function applyParticipantChange(updated: Participant[]) {
    setScenario({
      ...scenario,
      participants: updated.slice(0, 8),
      participantCount: Math.min(8, Math.max(2, updated.length)),
    });
  }

  function applyScenarioLoad(loaded: LabScenario) {
    setScenario({
      ...loaded,
      provenance: loaded.provenance ?? tagProvenance("user-imported"),
    });
    setSelectedPlanId("");
    setEvidence(null);
    setImportSummary(null);
  }

  function applyReplay(report: RunReport) {
    const rebuilt = makeScenario({ ...(report.scenario as Partial<LabScenario>) });
    setScenario({
      ...rebuilt,
      alpha: report.parameters.alpha,
      epsilon: report.parameters.epsilon,
      splitRule: report.parameters.splitRule ?? "proportional",
      provenance: report.provenance ?? rebuilt.provenance ?? tagProvenance("user-imported"),
    });
    setAuditMode(report.parameters.auditMode);
    setSelectedPlanId("");
  }
  return (
    <section className="lab-shell" data-testid="lab-surface">
      <div className="surface-intro">
        <div className="section-label">Lab arena</div>
        <h2>Build agents. Set the problem. Compare mechanisms.</h2>
        <p>
          The lab is the point: create a buyer, a supplier, a planning problem,
          and a coordination rule. Then ask the mechanism-design question:
          does the rule recover joint value without forcing everyone to reveal
          private cost and capacity data?
        </p>
      </div>
      <div className="so-what-panel" data-testid="lab-so-what">
        <div>
          <div className="section-label">
            {takeaway.title} <ProvenanceBadge provenance={scenario.provenance} testId="scenario-provenance" />
          </div>
          <h3>{takeaway.soWhat}</h3>
          <p>
            Selected setup: <strong>{selectedPreset.name}</strong>. {selectedPreset.soWhat}
          </p>
        </div>
        <div className="so-what-metrics">
          <ExplainedMetric label="Coordination gap" value={money(takeaway.coordinationGap)} help="Value lost when local JIT planning is compared with the centralized oracle." />
          <ExplainedMetric label="Best non-oracle rule" value={best.name} help="Best mechanism in this synthetic run after excluding the all-knowing oracle." />
          <ExplainedMetric label="Info value" value={money(takeaway.informationValue)} help="Gain from full information versus private information under CPP+VCG." />
        </div>
      </div>
      <div className="lab-grid">
        <div className="control-card">
          <ViewPicker participants={participants} value={viewMode} onChange={setViewMode} />
          <ParticipantRoster view={view} />
          <div className="button-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={graphOpen}
                onChange={(event) => setGraphOpen(event.target.checked)}
                data-testid="graph-toggle"
              />
              Show source graph
            </label>
          </div>
          {graphOpen && (
            <SourceGraph
              participants={participants}
              selectedId={viewMode === "coordinator" ? undefined : viewMode.participantId}
              onSelect={(id) => {
                const participant = participants.find((p) => p.id === id);
                if (!participant) return;
                if (participant.role === "buyer") setViewMode({ role: "buyer", participantId: id });
                else setViewMode({ role: "supplier", participantId: id });
              }}
            />
          )}
        </div>
        <div className="control-card">
          <ParticipantBuilder participants={participants} onChange={applyParticipantChange} />
        </div>
      </div>
      <div className="lab-grid">
        <div className="control-card">
          <h3>1. Choose or make a problem</h3>
          <p className="muted">
            Presets are canonical coordination failures. Use them as starting
            points, then change the structure below.
          </p>
          <div className="preset-grid">
            {scenarioPresets.map((preset) => (
              <button
                className={scenario.presetId === preset.id ? "preset-card active" : "preset-card"}
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
              >
                <strong>{preset.name}</strong>
                <span>{preset.oneLine}</span>
              </button>
            ))}
          </div>
          <Slider label="Demand volatility" value={scenario.volatility} min={0.05} max={0.6} step={0.01} onChange={(volatility) => setScenario({ ...scenario, volatility })} />
          <Slider label="Capacity tightness" value={scenario.capacityTightness} min={0.2} max={1.0} step={0.01} onChange={(capacityTightness) => setScenario({ ...scenario, capacityTightness })} />
          <Slider label="Lead time weeks" value={scenario.leadTimeWeeks} min={2} max={24} step={1} onChange={(leadTimeWeeks) => setScenario({ ...scenario, leadTimeWeeks })} />
          <Slider label="Fulfillment centers" value={scenario.fulfillmentCenterCount} min={1} max={8} step={1} onChange={(fulfillmentCenterCount) => setScenario({ ...scenario, fulfillmentCenterCount })} />
          <Slider label="Participants" value={scenario.participantCount} min={2} max={5} step={1} onChange={(participantCount) => setScenario({ ...scenario, participantCount })} />
          <Slider label="Products" value={scenario.productCount} min={1} max={4} step={1} onChange={(productCount) => setScenario({ ...scenario, productCount })} />
          <Slider label="Periods" value={scenario.periodCount} min={1} max={6} step={1} onChange={(periodCount) => setScenario({ ...scenario, periodCount })} />
          <div className="callout">
            <strong>Near-optimal plans:</strong> the epsilon frontier below uses these problem knobs to show which almost-best plans buy more slack.
          </div>
        </div>
        <div className="control-card">
          <h3>2. Make your own agents</h3>
          <p className="muted">
            Pick canonical strategies, then tune the behavioral knobs. These are
            not LLM agents; they are inspectable optimization personas.
          </p>
          <SelectControl label="Buyer agent" value={scenario.buyerAgentId} onChange={(buyerAgentId) => setScenario({ ...scenario, buyerAgentId })}>
            {agentsForSide("buyer").map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </SelectControl>
          <AgentCard title="Buyer strategy" agent={buyerAgent} />
          <Slider
            label="Buyer reliability"
            value={scenario.buyerReliability}
            min={0}
            max={1}
            step={0.01}
            testId="buyer-reliability-slider"
            onChange={(buyerReliability) => setScenario({ ...scenario, buyerReliability })}
          />
          <p className="muted">
            Buyer capacity prior: {buyerCapacity.effective} effective units from {buyerCapacity.stated} stated units.
          </p>
          <SelectControl label="Supplier agent" value={scenario.supplierAgentId} onChange={(supplierAgentId) => setScenario({ ...scenario, supplierAgentId })}>
            {agentsForSide("supplier").map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </SelectControl>
          <AgentCard title="Supplier strategy" agent={supplierAgent} />
          <Slider
            label="Supplier reliability"
            value={scenario.supplierReliability}
            min={0}
            max={1}
            step={0.01}
            testId="supplier-reliability-slider"
            onChange={(supplierReliability) => setScenario({ ...scenario, supplierReliability })}
          />
          <p className="muted">
            Supplier capacity prior: {supplierCapacity.effective} effective units from {supplierCapacity.stated} stated units.
          </p>
          <Slider label="Buyer urgency" value={scenario.customBuyerUrgency} min={0} max={1} step={0.01} onChange={(customBuyerUrgency) => setScenario({ ...scenario, customBuyerUrgency })} />
          <Slider label="Supplier flexibility" value={scenario.customSupplierFlexibility} min={0} max={1} step={0.01} onChange={(customSupplierFlexibility) => setScenario({ ...scenario, customSupplierFlexibility })} />
          <Slider label="Truthful response tendency" value={scenario.customTruthfulness} min={0} max={1} step={0.01} onChange={(customTruthfulness) => setScenario({ ...scenario, customTruthfulness })} />
          <Slider label="Privacy preference" value={scenario.customPrivacyPreference} min={0} max={1} step={0.01} onChange={(customPrivacyPreference) => setScenario({ ...scenario, customPrivacyPreference })} />
          <Slider label="Risk aversion" value={scenario.customRiskAversion} min={0} max={1} step={0.01} onChange={(customRiskAversion) => setScenario({ ...scenario, customRiskAversion })} />
        </div>
      </div>
      <div className="lab-grid">
        <div className="results-card wide">
          <h3>3. Compare mechanisms</h3>
          <p className="muted">
            The useful comparison is not "is ADMM good?" It is: local JIT versus
            oracle, then which practical mechanism recovers the most welfare for
            the least privacy exposure.
          </p>
          <div className="ops-grid">
            <Slider
              label="α transfer clipping"
              value={scenario.alpha}
              min={0}
              max={1}
              step={0.01}
              testId="alpha-slider"
              onChange={(alpha) => setScenario({ ...scenario, alpha })}
            />
            <Slider
              label="ε near-optimal frontier"
              value={scenario.epsilon}
              min={0}
              max={0.12}
              step={0.01}
              testId="epsilon-slider"
              onChange={(epsilon) => {
                setScenario({ ...scenario, epsilon });
                setSelectedPlanId("");
              }}
            />
          </div>
          <p className="muted">
            α scales VCG-style transfers. ε asks: what other plans are close enough to optimal that a planner might prefer their robustness?
          </p>
          <label className="select-label">
            Information mode
            <select value={scenario.infoMode} onChange={(event) => setScenario({ ...scenario, infoMode: event.target.value as InfoMode })}>
              {infoModes.map((mode) => (
                <option key={mode} value={mode}>
                  {infoModeLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <AlgorithmTable runs={runs} />
          <BarList
            title="Oracle gap by mechanism"
            rows={runs.filter((run) => run.id !== "centralized-oracle").map((run) => ({ label: run.name, value: run.oracleGap }))}
            formatter={money}
          />
          <FrontierPanel
            plans={frontierData.plans}
            selectedPlan={selectedPlan}
            onSelect={(plan) => setSelectedPlanId(plan.id)}
          />
        </div>
      </div>
      <div className="lab-grid">
        <div className="results-card">
          <h3>4. What does information buy?</h3>
          <p className="muted">
            More information should improve joint utility, but it also exposes
            private negotiating posture. This is the core privacy/efficiency trade.
          </p>
          <BarList title="Joint utility by information mode" rows={info.map((row) => ({ label: row.label, value: row.globalUtility }))} formatter={money} />
          <BarList title="Privacy exposure" rows={info.map((row) => ({ label: row.label, value: row.privacy * 100 }))} formatter={(value) => `${Math.round(value)}%`} />
        </div>
        <div className="results-card">
          <h3>5. Can CBT make participation rational?</h3>
          <p className="muted">
            {glossary.CBT} The table checks whether each party beats its outside
            option after the transfer. α is currently {scenario.alpha.toFixed(2)}, so the transfer ledger is clipped to {Math.round(scenario.alpha * 100)}% of the full teaching transfer.
          </p>
          <TransferTable rows={transferLedger(scenario, { planUtility: selectedPlan?.globalUtility ?? best.globalUtility })} />
          <div className="button-row">
            <label className="toggle-label">
              <input type="checkbox" checked={auditMode} onChange={(event) => setAuditMode(event.target.checked)} />
              Audit Mode: run decoy demand checks
            </label>
          </div>
          {auditMode && <DecoyAuditPanel rows={auditRows} />}
        </div>
      </div>
      <div className="lab-grid">
        <div className="results-card wide">
          <h3>5a. Multi-party ledger</h3>
          <p className="muted">
            When the scenario has more than two participants (CSV import, chip-map bridge,
            or N-party preset), CBT transfers split across all of them. Try each split rule:
          </p>
          <div className="button-row">
            {(["proportional", "equal", "shapley"] as const).map((rule) => (
              <button
                key={rule}
                className={splitRule === rule ? "view-button active" : "view-button"}
                onClick={() => applySplitRule(rule)}
                data-testid={`split-${rule}-btn`}
              >
                {rule}
              </button>
            ))}
          </div>
          <MultiPartyTransferTable rows={multiRows} splitRule={splitRule} />
        </div>
      </div>
      <div className="lab-grid">
        <CSVImportPanel onSeed={applyImport} />
        <BridgePanel
          scenario={scenario}
          onSeedFromChipMap={applyChipMapSeed}
          onAttachRiskEvidence={applyRiskEvidence}
        />
      </div>
      {evidence && (
        <div className="lab-grid">
          <div className="results-card wide" data-testid="evidence-panel">
            <h3>9. Attached risk evidence</h3>
            <p className="muted">
              Risk score derived from selected chunks: <strong>{evidence.riskScore.toFixed(2)}</strong>
            </p>
            <ul>
              {evidence.excerpts.map((excerpt, idx) => (
                <li key={idx}>
                  <strong>{excerpt.company}</strong>
                  <span className="muted"> · {excerpt.section}</span>
                  <p>{excerpt.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {importSummary && importSummary.seed && (
        <div className="lab-grid">
          <div className="results-card wide" data-testid="import-summary">
            <h3>CSV import summary</h3>
            <p className="muted">
              {importSummary.seed.rows.length} row(s) parsed · {importSummary.seed.buyerIds.length} buyer(s)
              · {importSummary.seed.supplierIds.length} supplier(s) · mean price ${importSummary.seed.meanUnitPrice.toFixed(2)}
            </p>
          </div>
        </div>
      )}
      <div className="lab-grid">
        <RunReportPanel scenario={scenario} auditMode={auditMode} onReplay={applyReplay} />
        <ScenarioImportExportPanel scenario={scenario} onLoad={applyScenarioLoad} />
      </div>
    </section>
  );
}

function StudySurface() {
  return (
    <section className="study-shell" data-testid="study-surface">
      <div className="surface-intro">
        <div className="section-label">Tutorial</div>
        <h2>What the simulator is doing, in plain words.</h2>
        <p>
          This layer is for the math behind the decision. The case is synthetic;
          the lab teaches mechanism design literacy, and is not a supplier risk
          scoring tool.
        </p>
      </div>
      <div className="study-grid">
        <TutorialCard title="1. Objective functions" term="utility">
          Each party has a utility function. The buyer values launch coverage and
          hates shortages. The supplier values revenue and hates holding capacity
          for uncertain demand. The global utility is the sum, but each party sees
          its own local score first.
        </TutorialCard>
        <TutorialCard title="2. Residuals and convergence" term="residual">
          Residual is the gap between the plans. Low residual means buyer and
          supplier quantities are close enough to discuss a real contract. High
          residual means the parties are still talking past each other.
        </TutorialCard>
        <TutorialCard title="3. ADMM and alternatives" term="ADMM">
          ADMM works when parties keep local objectives but can exchange
          coordination signals. The lab compares it against an oracle, alternating
          best response, price-only coordination, and consensus averaging so you
          can see where each one wins or loses on welfare and privacy.
        </TutorialCard>
        <TutorialCard title="4. Information buys value" term="information mode">
          Better shared information can improve joint plans because each side
          guesses less. But information is not free: forecast, cost, and capacity
          bands expose private negotiating posture.
        </TutorialCard>
        <TutorialCard title="5. CBT and participation" term="CBT">
          CBT separates the physical plan from the money split. If the physical
          plan creates surplus, transfers can make both parties no worse off. If
          the plan destroys value, transfers cannot rescue it.
        </TutorialCard>
        <TutorialCard title="6. Synthetic data boundary" term="risk score">
          The scenario data is deterministic and synthetic. Risk score is a
          teaching knob for uncertainty, not a claim about a real supplier. The
          public FloPro repo is credited as an ADMM implementation reference, not
          used as official branding.
        </TutorialCard>
      </div>
      <details className="details-box">
        <summary>Formula sketch</summary>
        <pre>{`buyer utility =
  service value from covered demand
  - purchase cost
  - shortage penalty
  - excess inventory penalty
  - risk adjustment

supplier utility =
  revenue
  - production cost
  - holding / disruption cost
  - capacity stress penalty

global utility = buyer utility + supplier utility
oracle gap = centralized oracle utility - current plan utility`}</pre>
      </details>
    </section>
  );
}

function Scoreboard({ scores }: { scores: ScoreState }) {
  return (
    <div className="scoreboard">
      <ExplainedMetric label="Relationship" value={String(scores.relationship)} help="Trust and willingness to keep negotiating. Negative means Cinder is closer to walking away." />
      <ExplainedMetric label="Coverage risk" value={scores.coverageRisk.toFixed(1)} help="A synthetic score for launch-shortage exposure. Lower is safer for the customer launch." />
      <ExplainedMetric label="Budget pressure" value={scores.budgetPressure.toFixed(1)} help="How much the plan strains your CFO's budget tolerance." />
      <ExplainedMetric label="Privacy shared" value={`${Math.round(scores.privacyShared * 100)}%`} help="How much forecast, cost, or capacity information has been exposed to coordinate the plan." />
    </div>
  );
}

function ExplainedMetric({ label, value, help }: { label: string; value: string; help: string }) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <p>{help}</p>
    </div>
  );
}

function TermRow({ terms, onOpenStudy }: { terms: string[]; onOpenStudy: () => void }) {
  return (
    <div className="term-row">
      {terms.map((term) => (
        <details key={term}>
          <summary>{term}</summary>
          <p>{glossary[term]}</p>
        </details>
      ))}
      <button className="link-button" onClick={onOpenStudy}>
        Open tutorial
      </button>
    </div>
  );
}

function RunPath({ results }: { results: RoundResult[] }) {
  return (
    <div>
      <h3>Your path</h3>
      <ol className="path-list">
        {results.map((result) => (
          <li key={result.beat.id}>
            <strong>Week {result.beat.week}:</strong> {result.choice.label}. Residual {result.residual} units, surplus {money(result.surplus)}.
          </li>
        ))}
      </ol>
    </div>
  );
}

function AlgorithmTable({ runs }: { runs: AlgorithmResult[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Algorithm</th>
            <th>What it means</th>
            <th>Agreement gap</th>
            <th>Oracle gap</th>
            <th>Privacy</th>
            <th>Incentive story</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{run.name}</td>
              <td>{run.plainEnglish}</td>
              <td>{run.residual} units</td>
              <td>{money(run.oracleGap)}</td>
              <td>{Math.round(run.privacyExposure * 100)}%</td>
              <td>{run.incentiveStory}</td>
              <td>{run.quality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgentCard({ title, agent }: { title: string; agent: ReturnType<typeof agentById> }) {
  return (
    <article className="agent-card">
      <div className="section-label">{title}</div>
      <h4>{agent.shortName}</h4>
      <p>{agent.oneLine}</p>
      <details>
        <summary>Objective and private information</summary>
        <p><strong>Objective:</strong> {agent.objective}</p>
        <p><strong>Private information:</strong> {agent.privateInfo}</p>
        <p><strong>Strategy:</strong> {agent.strategy}</p>
      </details>
    </article>
  );
}

function SelectControl({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="select-label">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function TransferTable({ rows }: { rows: ReturnType<typeof transferLedger> }) {
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

function FrontierPanel({
  plans,
  selectedPlan,
  onSelect,
}: {
  plans: FrontierPlan[];
  selectedPlan?: FrontierPlan;
  onSelect: (plan: FrontierPlan) => void;
}) {
  return (
    <div className="frontier-panel" data-testid="frontier-panel">
      <h4>ε-frontier: near-optimal plans</h4>
      <p className="muted">
        These plans are close to the best synthetic utility but trade off slack,
        residual, and transfer feasibility differently.
      </p>
      <div className="frontier-list">
        {plans.map((plan) => (
          <button
            className={selectedPlan?.id === plan.id ? "frontier-item active" : "frontier-item"}
            key={plan.id}
            onClick={() => onSelect(plan)}
          >
            <strong>{plan.label}</strong>
            <span>{money(plan.globalUtility)} · residual {plan.residual}</span>
          </button>
        ))}
      </div>
      {selectedPlan && (
        <div className="callout">
          <strong>{selectedPlan.mechanismName}:</strong> {selectedPlan.robustnessNote} Surplus {money(selectedPlan.surplus)}; oracle gap {money(selectedPlan.oracleGap)}.
        </div>
      )}
    </div>
  );
}

function DecoyAuditPanel({ rows }: { rows: ReturnType<typeof runDecoyAudit> }) {
  return (
    <div className="table-wrap" data-testid="decoy-audit-panel">
      <table>
        <thead>
          <tr>
            <th>Decoy</th>
            <th>Status</th>
            <th>Catches</th>
            <th>Actual pattern</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.decoyId}>
              <td>
                <strong>{row.title}</strong>
                <p className="muted">{row.expectedPattern}</p>
              </td>
              <td>{row.match ? "match" : "mismatch"}</td>
              <td>{row.catchesMisreportKind}</td>
              <td>{row.actualPattern}</td>
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

function Slider({
  label,
  value,
  min,
  max,
  step,
  testId,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  testId?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="slider-label">
      <span>
        {label}: <strong>{step === 1 ? value : value.toFixed(2)}</strong>
      </span>
      <input data-testid={testId} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TutorialCard({ title, term, children }: { title: string; term: string; children: ReactNode }) {
  return (
    <article className="tutorial-card">
      <div className="section-label">{term}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      <p className="muted">{glossary[term] ?? glossary[term.toLowerCase()]}</p>
    </article>
  );
}

function money(value: number): string {
  const abs = Math.abs(value);
  const formatted = `$${Math.round(abs).toLocaleString()}`;
  return value < 0 ? `-${formatted}` : formatted;
}

export { termOrder };
