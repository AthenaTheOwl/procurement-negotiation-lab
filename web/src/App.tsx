import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { glossary, termOrder } from "./data/glossary";
import { substrateCrunch } from "./data/story";
import {
  algorithmResults,
  detectEnding,
  evaluateRound,
  infoModeLabel,
  informationSweep,
  initialScores,
  makeScenario,
  transferLedger,
} from "./model/simulation";
import type { AlgorithmResult, Choice, InfoMode, LabScenario, RoundResult, ScoreState, Surface } from "./model/types";

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
  const [surface, setSurface] = useState<Surface>("play");
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="eyebrow">procurement-negotiation-lab</div>
        <h1>A management simulator for long-lead buying decisions.</h1>
        <p>
          Play the fixed case first. Then use the lab to test algorithms,
          information sharing, and surplus transfers on the same problem.
        </p>
        <nav aria-label="Main sections">
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
      </header>
      <main>
        {surface === "play" && <PlaySurface onOpenLab={() => setSurface("lab")} onOpenStudy={() => setSurface("study")} />}
        {surface === "lab" && <LabSurface />}
        {surface === "study" && <StudySurface />}
      </main>
    </div>
  );
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
  const runs = useMemo(() => algorithmResults(scenario), [scenario]);
  const info = useMemo(() => informationSweep(scenario), [scenario]);
  const best = runs[0];
  return (
    <section className="lab-shell" data-testid="lab-surface">
      <div className="surface-intro">
        <div className="section-label">Lab arena</div>
        <h2>Freeze the case. Change the coordination rule.</h2>
        <p>
          The story taught the mechanics. The lab answers controlled questions:
          does ADMM actually beat simpler rules, what does more information buy,
          and can a transfer make both parties no worse off?
        </p>
      </div>
      <div className="lab-grid">
        <div className="control-card">
          <h3>Scenario knobs</h3>
          <Slider label="Demand volatility" value={scenario.volatility} min={0.05} max={0.6} step={0.01} onChange={(volatility) => setScenario({ ...scenario, volatility })} />
          <Slider label="Capacity tightness" value={scenario.capacityTightness} min={0.2} max={1.0} step={0.01} onChange={(capacityTightness) => setScenario({ ...scenario, capacityTightness })} />
          <Slider label="Participants" value={scenario.participantCount} min={2} max={5} step={1} onChange={(participantCount) => setScenario({ ...scenario, participantCount })} />
          <Slider label="Products" value={scenario.productCount} min={1} max={4} step={1} onChange={(productCount) => setScenario({ ...scenario, productCount })} />
          <Slider label="Periods" value={scenario.periodCount} min={1} max={6} step={1} onChange={(periodCount) => setScenario({ ...scenario, periodCount })} />
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
        </div>
        <div className="results-card">
          <h3>Algorithm comparison</h3>
          <p className="muted">Quality is measured against the centralized oracle, an all-knowing benchmark rather than a realistic negotiating party.</p>
          <AlgorithmTable runs={runs} />
          <BarList
            title="Oracle gap by algorithm"
            rows={runs.slice(1).map((run) => ({ label: run.name, value: run.oracleGap }))}
            formatter={money}
          />
        </div>
      </div>
      <div className="lab-grid">
        <div className="results-card">
          <h3>Value of information</h3>
          <p className="muted">More information usually improves joint value, but it also exposes more private planning data.</p>
          <BarList title="Joint utility by information mode" rows={info.map((row) => ({ label: row.label, value: row.globalUtility }))} formatter={money} />
          <BarList title="Privacy exposure" rows={info.map((row) => ({ label: row.label, value: row.privacy * 100 }))} formatter={(value) => `${Math.round(value)}%`} />
        </div>
        <div className="results-card">
          <h3>CBT and no-worse-off proof</h3>
          <p className="muted">{glossary.CBT}</p>
          <TransferTable rows={transferLedger(best.globalUtility)} />
        </div>
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
          This layer is for the math after you have seen the decision. The case
          is synthetic; the point is mechanism design literacy, not supplier risk scoring.
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
          ADMM is not automatically best. It is useful when parties keep local
          objectives but can exchange coordination signals. The lab compares it
          with an oracle, alternating best response, price-only coordination, and
          consensus averaging.
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
              <td>{run.quality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
