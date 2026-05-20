import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level10 } from "./Level10";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: {
  onComplete?: () => void;
  onOpenSandbox?: () => void;
} = {}) {
  return render(
    <Level10
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
      onOpenSandbox={overrides.onOpenSandbox}
    />,
  );
}

describe("Level10", () => {
  it("renders the three menu options and the resolved SKU model", () => {
    setup();
    expect(screen.getByTestId("menu-option-A")).toBeTruthy();
    expect(screen.getByTestId("menu-option-B")).toBeTruthy();
    expect(screen.getByTestId("menu-option-C")).toBeTruthy();
    expect(screen.getByTestId("selected-model").textContent).toContain(
      "vendor-123.sku-001.abe8.w22.v4",
    );
  });

  it("updates the fast option fee when capacity scarcity changes", () => {
    setup();
    const before = screen.getByTestId("option-A-fee").textContent;
    fireEvent.change(screen.getByTestId("capacity-signal"), {
      target: { value: "0.35" },
    });
    expect(screen.getByTestId("option-A-fee").textContent).not.toBe(before);
  });

  it("falls back to the category model for category scope", () => {
    setup();
    fireEvent.click(screen.getByTestId("scope-category"));
    expect(screen.getByTestId("selected-model").textContent).toContain(
      "category.electronics.flex-window.v2",
    );
  });

  it("certification displays checks and unlocks Continue", () => {
    setup();
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      true,
    );
    fireEvent.click(screen.getByTestId("certify-model"));
    expect(screen.getByTestId("certification-results").textContent).toContain(
      "Pass",
    );
    expect(screen.getByTestId("cleared-agreement").textContent).toContain(
      "selected_option",
    );
    expect((screen.getByTestId("level-continue") as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it("Continue calls onComplete and opens Sandbox after certification", () => {
    const onComplete = vi.fn();
    const onOpenSandbox = vi.fn();
    setup({ onComplete, onOpenSandbox });
    fireEvent.click(screen.getByTestId("certify-model"));
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onComplete).toHaveBeenCalled();
    expect(onOpenSandbox).toHaveBeenCalled();
  });
});
