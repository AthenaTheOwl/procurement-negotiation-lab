import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  CONVERGENCE_GUIDES,
  CONVERGENCE_METHODS,
  DEFAULT_CONSENSUS_CONFIG,
  DEFAULT_CONSENSUS_VENDORS,
  simulateConvergence,
  type ConsensusConfig,
  type ConvergenceMethod,
} from "@lab/engine";

const METHOD_LABEL: Record<ConvergenceMethod, string> = {
  "consensus-admm": "Consensus / ADMM",
  "damped-averaging": "Damped averaging",
  "price-tatonnement": "Price clearing",
  lagrangian: "Shadow-price loop",
};

const METHOD_COPY: Record<ConvergenceMethod, string> = {
  "consensus-admm":
    "Each vendor solves a local problem against a shared plan and a dual term; the coordinator averages messages.",
  "damped-averaging":
    "The coordinator moves partway toward the proposal average each round, trading speed for stability.",
  "price-tatonnement":
    "The coordinator changes a posted price until supply moves toward the target demand.",
  lagrangian:
    "A shadow price rises or falls with the shared capacity gap, then vendors respond privately.",
};

const INPUT_HELP: Record<keyof ConsensusConfig, string> = {
  method: "Choose the convergence protocol.",
  targetDemand: "Total units the coordinator needs across vendors. This is the shared constraint every method is trying to clear.",
  initialTarget: "The first per-vendor quantity sent before anyone responds. Bad guesses usually take more rounds to settle.",
  rho: "ADMM penalty weight. Higher rho pulls vendors harder toward consensus but can over-dampen private preferences.",
  alpha: "Damping fraction for fixed-point averaging. Lower alpha moves slowly and steadily; higher alpha moves fast and can overshoot.",
  eta: "Price/shadow-price step size. Larger eta makes prices react harder to shortage or excess supply.",
  maxRounds: "Hard stop before falling back to a menu or manual decision.",
  epsilon: "Residual tolerance. Once proposals are this close, the protocol calls the SKU-week plan converged.",
  initialPrice: "Starting posted price for price-clearing methods. It shapes early vendor quantity responses.",
};

function numberValue(value: string, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function money(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function units(value: number): string {
  return Math.round(value).toLocaleString();
}

export function ConvergencePlayground() {
  const [config, setConfig] = useState<ConsensusConfig>(
    DEFAULT_CONSENSUS_CONFIG,
  );
  const result = useMemo(
    () => simulateConvergence(DEFAULT_CONSENSUS_VENDORS, config),
    [config],
  );
  const latest = result.rounds[result.rounds.length - 1];
  const update = (patch: Partial<ConsensusConfig>) =>
    setConfig((prev) => ({ ...prev, ...patch }));

  const shell: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "var(--space-5, 24px)",
  };
  const headerGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(280px, 0.85fr)",
    gap: "var(--space-4, 16px)",
  };
  const panel: CSSProperties = {
    background: "var(--neutral-bg, #f7f7f4)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-4, 16px)",
  };
  const methodGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "var(--space-2, 8px)",
  };
  const methodButton = (method: ConvergenceMethod): CSSProperties => ({
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    background:
      config.method === method ? "var(--role-coordinator, #6d54ff)" : "white",
    color: config.method === method ? "white" : "var(--neutral-fg, #1c1c1f)",
    padding: "var(--space-3, 12px)",
    textAlign: "left",
    cursor: "pointer",
    minHeight: "92px",
  });
  const metricGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const metric: CSSProperties = {
    ...panel,
    background: "white",
  };
  const label: CSSProperties = {
    color: "var(--neutral-fg-soft, #5b5b62)",
    fontSize: "var(--type-1, 0.85rem)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };
  const inputGrid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "var(--space-3, 12px)",
  };
  const inputStyle: CSSProperties = {
    width: "100%",
    border: "1px solid var(--neutral-line, #e3e3df)",
    borderRadius: "var(--radius-tile, 12px)",
    padding: "var(--space-2, 8px)",
  };
  const table: CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "var(--type-1, 0.9rem)",
  };
  const cell: CSSProperties = {
    padding: "var(--space-2, 8px)",
    borderBottom: "1px solid var(--neutral-line, #e3e3df)",
    textAlign: "right",
  };

  return (
    <div style={shell} data-testid="convergence-playground">
      <div style={headerGrid}>
        <div>
          <h2 style={{ margin: 0, fontSize: "var(--type-4, 1.3rem)" }}>
            Per-product convergence
          </h2>
          <p
            style={{
              margin: "var(--space-2, 8px) 0 0 0",
              color: "var(--neutral-fg-soft, #5b5b62)",
            }}
          >
            Compare lightweight ways to align SKU-week quantities when each
            vendor keeps its cost model private.
          </p>
        </div>
        <div style={panel}>
          <div style={label}>messages crossing the trust boundary</div>
          <div
            style={{
              display: "flex",
              gap: "var(--space-2, 8px)",
              flexWrap: "wrap",
              marginTop: "var(--space-2, 8px)",
            }}
          >
            {result.messagesShared.map((message) => (
              <span
                key={message}
                style={{
                  background: "white",
                  borderRadius: "var(--radius-pill, 999px)",
                  border: "1px solid var(--neutral-line, #e3e3df)",
                  padding: "var(--space-1, 4px) var(--space-2, 8px)",
                }}
              >
                {message}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={methodGrid}>
        {CONVERGENCE_METHODS.map((method) => (
          <button
            key={method}
            type="button"
            style={methodButton(method)}
            onClick={() => update({ method })}
            data-testid={`convergence-method-${method}`}
          >
            <strong>{METHOD_LABEL[method]}</strong>
            <span
              style={{
                display: "block",
                marginTop: "var(--space-1, 4px)",
                fontSize: "var(--type-1, 0.85rem)",
                opacity: 0.85,
              }}
            >
              {METHOD_COPY[method]}
            </span>
          </button>
        ))}
      </div>

      <div style={inputGrid}>
        {[
          ["targetDemand", "total demand"],
          ["initialTarget", "initial per-vendor target"],
          ["rho", "rho / penalty"],
          ["alpha", "damping alpha"],
          ["eta", "step size"],
          ["maxRounds", "max rounds"],
          ["epsilon", "stop tolerance"],
          ["initialPrice", "initial price"],
        ].map(([key, text]) => (
          <label key={key} style={{ display: "flex", flexDirection: "column" }}>
            <span style={label}>{text}</span>
            <input
              type="number"
              step={key === "rho" || key === "alpha" || key === "eta" ? 0.05 : 10}
              min={key === "alpha" ? 0.01 : 0}
              max={key === "alpha" ? 1 : undefined}
              value={config[key as keyof ConsensusConfig] as number}
              onChange={(event) =>
                update({
                  [key]: numberValue(
                    event.target.value,
                    config[key as keyof ConsensusConfig] as number,
                  ),
                } as Partial<ConsensusConfig>)
              }
              style={inputStyle}
              data-testid={`convergence-input-${key}`}
            />
            <span
              style={{
                marginTop: "var(--space-1, 4px)",
                color: "var(--neutral-fg-soft, #5b5b62)",
                fontSize: "var(--type-1, 0.85rem)",
                lineHeight: 1.35,
              }}
            >
              {INPUT_HELP[key as keyof ConsensusConfig]}
            </span>
          </label>
        ))}
      </div>

      <div style={metricGrid}>
        <div style={metric}>
          <div style={label}>final per-vendor target</div>
          <strong
            style={{ fontSize: "var(--type-4, 1.3rem)" }}
            data-testid="convergence-final-consensus"
          >
            {units(result.finalConsensus)}
          </strong>
        </div>
        <div style={metric}>
          <div style={label}>final residual</div>
          <strong
            style={{ fontSize: "var(--type-4, 1.3rem)" }}
            data-testid="convergence-final-residual"
          >
            {units(result.finalResidual)}
          </strong>
        </div>
        <div style={metric}>
          <div style={label}>rounds</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }}>
            {result.rounds.length}
          </strong>
        </div>
        <div style={metric}>
          <div style={label}>posted price</div>
          <strong style={{ fontSize: "var(--type-4, 1.3rem)" }}>
            {money(result.finalPrice)}
          </strong>
        </div>
      </div>

      <div style={panel}>
        <strong>{result.converged ? "Converged" : "Fallback ready"}</strong>
        <p style={{ margin: "var(--space-1, 4px) 0 0 0" }}>
          {result.privacyNote}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 0.8fr)",
          gap: "var(--space-4, 16px)",
        }}
      >
        <div style={panel}>
          <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
            Round log
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={table}>
              <thead>
                <tr>
                  {["round", "target", "supply", "gap", "residual", "dual"].map(
                    (heading) => (
                      <th key={heading} style={cell}>
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {result.rounds.map((round) => (
                  <tr key={round.round} data-testid={`convergence-round-${round.round}`}>
                    <td style={cell}>{round.round}</td>
                    <td style={cell}>{units(round.consensus)}</td>
                    <td style={cell}>{units(round.totalSupply)}</td>
                    <td style={cell}>{units(round.demandGap)}</td>
                    <td style={cell}>{units(round.primalResidual)}</td>
                    <td style={cell}>{units(round.dualResidual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={panel}>
          <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
            Latest vendor messages
          </h3>
          {latest?.proposals.map((proposal) => (
            <div
              key={proposal.vendorId}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "var(--space-2, 8px)",
                padding: "var(--space-2, 8px) 0",
                borderBottom: "1px solid var(--neutral-line, #e3e3df)",
              }}
              data-testid={`convergence-proposal-${proposal.vendorId}`}
            >
              <span>{proposal.name}</span>
              <strong>{units(proposal.proposal)}</strong>
              <span style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
                message {units(proposal.message)} / dual {units(proposal.dual)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
          One-shot menu fallback
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "var(--space-3, 12px)",
          }}
        >
          {result.fallbackMenu.map((option) => (
            <div
              key={option.id}
              style={{ ...metric, background: "white" }}
              data-testid={`convergence-menu-${option.id}`}
            >
              <strong>{option.label}</strong>
              <div style={{ marginTop: "var(--space-2, 8px)" }}>
                {units(option.quantity)} units / {money(option.unitPrice)} / unit
              </div>
              <div style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
                {option.flexPercent}% flex / ${option.penaltyPerLateDay}/day
              </div>
              <p style={{ marginBottom: 0 }}>{option.note}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontSize: "var(--type-3, 1.05rem)" }}>
          Method map
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-3, 12px)",
          }}
        >
          {CONVERGENCE_GUIDES.map((guide) => (
            <div
              key={guide.id}
              style={{ ...metric, background: "white" }}
              data-testid={`convergence-guide-${guide.id}`}
            >
              <strong>{guide.label}</strong>
              <p style={{ marginBottom: "var(--space-1, 4px)" }}>
                {guide.bestFor}
              </p>
              <span style={{ color: "var(--neutral-fg-soft, #5b5b62)" }}>
                {guide.tradeoff}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
