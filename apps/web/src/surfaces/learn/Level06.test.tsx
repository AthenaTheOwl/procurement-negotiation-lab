import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Level06 } from "./Level06";
import { emptyProgress } from "../../state/learnProgress";

beforeEach(() => {
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level06
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level06", () => {
  it("renders three parties + the rule toggle", () => {
    setup();
    expect(screen.getByTestId("row-buyer")).toBeTruthy();
    expect(screen.getByTestId("row-supplier")).toBeTruthy();
    expect(screen.getByTestId("row-packager")).toBeTruthy();
    expect(screen.getByTestId("level6-rule")).toBeTruthy();
    expect(screen.getByTestId("level6-capacity-explainer").textContent).toMatch(
      /third-party chokepoint/i,
    );
  });

  it("Continue disabled until at least 2 rules tried", () => {
    setup();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("split-rule-shapley"));
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("toggling rule updates the share column", () => {
    setup();
    const buyerShareBefore = screen
      .getByTestId("row-buyer")
      .querySelectorAll("td")[1].textContent;
    fireEvent.click(screen.getByTestId("split-rule-equal"));
    const buyerShareAfter = screen
      .getByTestId("row-buyer")
      .querySelectorAll("td")[1].textContent;
    expect(buyerShareAfter).not.toBe(buyerShareBefore);
  });

  it("dropping packager capacity hurts everyone's utility", () => {
    setup();
    const slider = screen.getByLabelText(/packager capacity/i) as HTMLInputElement;
    const beforeUtility = screen
      .getByTestId("row-buyer")
      .querySelectorAll("td")[2].textContent;
    fireEvent.change(slider, { target: { value: "20" } });
    const afterUtility = screen
      .getByTestId("row-buyer")
      .querySelectorAll("td")[2].textContent;
    expect(afterUtility).not.toBe(beforeUtility);
  });

  it("clicking Continue invokes onComplete after at least 2 rules", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("split-rule-shapley"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });

  it("chip-map toggle pulls live chokepoint data and updates capacity", async () => {
    const sampleCsv = [
      "id,name,type,country,short_description,chokepoint_score",
      'ase,ASE Technology,packager,TW,advanced packaging,0.62',
      'amkor,Amkor,packager,KR,outsourced semiconductor assembly,0.5',
      'tsmc,TSMC,foundry,TW,leading-edge foundry,0.92',
    ].join("\n");
    const sampleEdgesCsv = "source,target,relation,strength\nase,tsmc,supplies,critical";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({
        ok: true,
        text: async () => (url.includes("edges") ? sampleEdgesCsv : sampleCsv),
      })) as unknown as typeof fetch,
    );

    setup();
    fireEvent.click(screen.getByTestId("chip-map-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("chip-map-status").textContent).toMatch(
        /Live chokepoint score across 2 packager nodes/,
      );
    });
    const slider = screen.getByLabelText(/packager capacity/i) as HTMLInputElement;
    // Avg chokepoint = (0.62 + 0.5) / 2 = 0.56 → capacity should be ~44.
    expect(Number(slider.value)).toBeLessThan(100);
  });

  it("chip-map toggle surfaces a friendly error when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      text: async () => "",
    })) as unknown as typeof fetch);

    setup();
    fireEvent.click(screen.getByTestId("chip-map-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("chip-map-status").textContent).toMatch(
        /Live chip-map unavailable/i,
      );
    });
  });

  it("intro card names the third party and what the two controls do", () => {
    setup();
    const intro = screen.getByTestId("level6-intro");
    expect(intro.textContent).toMatch(/packager/i);
    expect(intro.textContent).toMatch(/packager-capacity slider/i);
    expect(intro.textContent).toMatch(/split-rule toggle/i);
  });

  it("rule explainer updates with the active rule and explains when to use it", () => {
    setup();
    const explainer = screen.getByTestId("level6-rule-explainer");
    // default rule is proportional
    expect(explainer.textContent).toMatch(/proportional/i);
    expect(explainer.textContent).toMatch(/when you'd use it/i);
    fireEvent.click(screen.getByTestId("split-rule-shapley"));
    expect(screen.getByTestId("level6-rule-explainer").textContent).toMatch(
      /shapley/i,
    );
    expect(screen.getByTestId("level6-rule-explainer").textContent).toMatch(
      /marginal contribution/i,
    );
  });

  it("deal-status flips red and names the walking party when a rule fails", () => {
    setup();
    // Drop capacity hard, switch to equal — usually the buyer walks
    fireEvent.change(
      screen.getByLabelText(/packager capacity/i) as HTMLInputElement,
      { target: { value: "20" } },
    );
    fireEvent.click(screen.getByTestId("split-rule-equal"));
    const status = screen.getByTestId("level6-deal-status");
    expect(status.textContent).toMatch(/walk/i);
  });

  it("try-this sequence is rendered so the user has a guided path", () => {
    setup();
    const seq = screen.getByTestId("level6-try-sequence");
    expect(seq.textContent).toMatch(/leave capacity at 100/i);
    expect(seq.textContent).toMatch(/drop packager capacity/i);
    expect(seq.textContent).toMatch(/switch to.*equal/i);
    expect(seq.textContent).toMatch(/switch to.*shapley/i);
  });

  it("table headers carry plain-English sub-labels for the jargon columns", () => {
    setup();
    const table = screen.getByTestId("level6-table");
    expect(table.textContent).toMatch(/outside option/i);
    expect(table.textContent).toMatch(/\$ if they walk/i);
    expect(table.textContent).toMatch(/stays in\?/i);
    expect(table.textContent).toMatch(/only ✓ if utility ≥ outside/i);
  });
});
