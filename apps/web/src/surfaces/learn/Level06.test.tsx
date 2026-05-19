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
});
