import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PredictReveal } from "./PredictReveal";

afterEach(() => cleanup());

function renderHarness(initialLive = 50, truth = 100) {
  let live = initialLive;
  const onReveal = vi.fn();
  const view = render(
    <PredictReveal
      liveValue={live}
      truth={truth}
      renderValue={(v) => <span>{v}</span>}
      insight="great work"
      onReveal={onReveal}
    />,
  );
  return { view, onReveal };
}

describe("PredictReveal", () => {
  it("shows reveal button before reveal", () => {
    renderHarness();
    expect(screen.getByTestId("predict-reveal-button")).toBeTruthy();
    expect(screen.queryByTestId("predict-reveal-compare")).toBeNull();
  });

  it("after reveal, shows guess and truth side by side", () => {
    const { onReveal } = renderHarness(42, 425);
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    expect(onReveal).toHaveBeenCalledWith(42);
    expect(screen.getByTestId("predict-reveal-guess").textContent).toBe("42");
    expect(screen.getByTestId("predict-reveal-truth").textContent).toBe("425");
  });

  it("renders the insight blurb after reveal", () => {
    renderHarness();
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    expect(screen.getByTestId("predict-reveal-insight").textContent).toContain(
      "great work",
    );
  });

  it("when disabled, click does not fire onReveal", () => {
    const onReveal = vi.fn();
    render(
      <PredictReveal
        liveValue={1}
        truth={2}
        renderValue={(v) => <span>{v}</span>}
        insight="x"
        onReveal={onReveal}
        disabled
      />,
    );
    fireEvent.click(screen.getByTestId("predict-reveal-button"));
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("honors a custom reveal label and testId", () => {
    render(
      <PredictReveal
        liveValue={"a"}
        truth={"b"}
        renderValue={(v) => <span>{v}</span>}
        insight="x"
        revealLabel="Show me"
        testId="lvl2-reveal"
      />,
    );
    expect(screen.getByTestId("lvl2-reveal")).toBeTruthy();
    expect(screen.getByTestId("predict-reveal-button").textContent).toBe(
      "Show me",
    );
  });
});
