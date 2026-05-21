/**
 * SandboxShell — top-level container for the procurement sandbox.
 *
 * Default tab: BuyPlanStudio — the new multi-SKU buy-plan workbench.
 * Classic tab: the legacy LabArena (SandboxApp), kept reachable so we
 * don't break the surfaces every existing essay / demo references.
 *
 * The legacy SandboxApp is lazy-loaded so its cytoscape + 1k-line
 * bundle only enters the bundle graph when the user clicks the
 * Classic tab.
 */

import { Suspense, lazy, useState } from "react";
import type { CSSProperties } from "react";
import { BuyPlanStudio } from "./buyplan/BuyPlanStudio";

const SandboxApp = lazy(() =>
  import("./SandboxApp").then((m) => ({ default: m.SandboxApp })),
);

type TabId = "buy-plan" | "classic";

export interface SandboxShellProps {
  /** Optional initial tab, useful for tests. */
  initialTab?: TabId;
}

export function SandboxShell({ initialTab = "buy-plan" }: SandboxShellProps) {
  const [tab, setTab] = useState<TabId>(initialTab);

  const shell: CSSProperties = {
    minHeight: "100vh",
    background: "var(--neutral-bg, #f7f7f4)",
    padding: "var(--space-4, 16px)",
  };
  const tabRow: CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto var(--space-4, 16px)",
    display: "flex",
    gap: "var(--space-2, 8px)",
    background: "var(--neutral-bg-2, #ffffff)",
    borderRadius: "var(--radius-pill, 999px)",
    padding: "var(--space-1, 4px)",
    border: "1px solid var(--neutral-line, #e3e3df)",
    width: "fit-content",
  };
  const tabBtn = (id: TabId): CSSProperties => ({
    background:
      tab === id
        ? "var(--role-coordinator, #6d54ff)"
        : "transparent",
    color: tab === id ? "white" : "var(--neutral-fg, #1c1c1f)",
    border: 0,
    padding: "var(--space-2, 8px) var(--space-5, 24px)",
    borderRadius: "var(--radius-pill, 999px)",
    fontWeight: 600,
    fontSize: "var(--type-2, 1rem)",
    cursor: "pointer",
  });
  const body: CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "var(--neutral-bg-2, #ffffff)",
    borderRadius: "var(--radius-card, 16px)",
    padding: "var(--space-5, 24px)",
    border: "1px solid var(--neutral-line, #e3e3df)",
  };

  return (
    <div style={shell} data-testid="sandbox-shell">
      <div style={tabRow} role="tablist" aria-label="Sandbox surface">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "buy-plan"}
          style={tabBtn("buy-plan")}
          onClick={() => setTab("buy-plan")}
          data-testid="sandbox-tab-buy-plan"
        >
          Buy plan
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "classic"}
          style={tabBtn("classic")}
          onClick={() => setTab("classic")}
          data-testid="sandbox-tab-classic"
        >
          Classic Lab Arena
        </button>
      </div>

      <div style={body} role="tabpanel">
        {tab === "buy-plan" && <BuyPlanStudio />}
        {tab === "classic" && (
          <Suspense
            fallback={
              <div data-testid="sandbox-classic-loading">
                Loading Classic Lab Arena…
              </div>
            }
          >
            <SandboxApp />
          </Suspense>
        )}
      </div>
    </div>
  );
}
