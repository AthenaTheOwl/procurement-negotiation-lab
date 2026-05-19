import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Level07 } from "./Level07";
import { emptyProgress } from "../../state/learnProgress";

beforeEach(() => {
  // Wipe session cache between tests so the evidence toggle re-fetches.
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(overrides: { onComplete?: () => void } = {}) {
  return render(
    <Level07
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
    />,
  );
}

describe("Level07", () => {
  it("renders the honesty toggle starting OFF", () => {
    setup();
    const toggle = screen.getByTestId("honesty-toggle");
    expect(toggle.textContent).toBe("OFF");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
  });

  it("Continue disabled until the user toggles honesty", () => {
    setup();
    const cont = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("toggling on flips the indicator and reveal blurb appears", () => {
    setup();
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    expect(screen.getByTestId("honesty-toggle").textContent).toBe("ON");
    expect(screen.getByTestId("level7-reveal")).toBeTruthy();
  });

  it("summary updates after toggling honesty", () => {
    setup();
    const beforeText = screen.getByTestId("level7-summary").textContent;
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    const afterText = screen.getByTestId("level7-summary").textContent;
    expect(afterText).not.toBe(beforeText);
  });

  it("Continue invokes onComplete after honesty toggled", () => {
    const onComplete = vi.fn();
    setup({ onComplete });
    fireEvent.click(screen.getByTestId("honesty-toggle"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
  });

  it("evidence toggle pulls live filings from supplier-risk-rag-agent", async () => {
    const sampleJsonl = [
      JSON.stringify({
        cik: "0001046179",
        accession: "0001046179-23-000123",
        company: "Tower Semiconductor",
        section: "Item 1A. Risk Factors",
        text: "Concentration of revenue with key customers creates exposure to demand cycles in mobile and automotive end markets.",
      }),
      JSON.stringify({
        cik: "0000937966",
        accession: "0000937966-23-000456",
        company: "Applied Materials",
        section: "Item 1A. Risk Factors",
        text: "Export controls on advanced lithography may delay shipments to certain jurisdictions.",
      }),
    ].join("\n");
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      text: async () => sampleJsonl,
    })) as unknown as typeof fetch);

    setup();
    fireEvent.click(screen.getByTestId("evidence-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("evidence-0")).toBeTruthy();
    });
    expect(screen.getByTestId("evidence-0").textContent).toMatch(
      /Tower Semiconductor/,
    );
  });

  it("evidence toggle surfaces a friendly error when the fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      text: async () => "",
    })) as unknown as typeof fetch);

    setup();
    fireEvent.click(screen.getByTestId("evidence-toggle"));
    await waitFor(() => {
      expect(screen.getByTestId("evidence-error")).toBeTruthy();
    });
  });
});
