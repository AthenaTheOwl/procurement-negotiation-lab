import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level06 } from "./Level06";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

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
});
