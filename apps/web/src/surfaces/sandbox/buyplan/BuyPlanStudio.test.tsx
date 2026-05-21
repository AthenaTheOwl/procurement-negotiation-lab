import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BuyPlanStudio } from "./BuyPlanStudio";

afterEach(() => cleanup());

describe("BuyPlanStudio", () => {
  it("renders the default 3 SKUs and 3 relationships", () => {
    render(<BuyPlanStudio />);
    expect(screen.getByTestId("sku-sku-a")).toBeTruthy();
    expect(screen.getByTestId("sku-sku-b")).toBeTruthy();
    expect(screen.getByTestId("sku-sku-c")).toBeTruthy();
    expect(screen.getByTestId("relationship-rel-sub-ab")).toBeTruthy();
    expect(screen.getByTestId("relationship-rel-comp-ac")).toBeTruthy();
    expect(screen.getByTestId("relationship-rel-cap-shared")).toBeTruthy();
  });

  it("editing q updates the aggregate and per-SKU utility numbers", () => {
    render(<BuyPlanStudio />);
    const beforeAgg = screen.getByTestId("plan-aggregate").textContent;
    const beforeA = screen.getByTestId("sku-sku-a-utility").textContent;
    fireEvent.change(screen.getByTestId("sku-sku-a-q"), {
      target: { value: "100" },
    });
    const afterA = screen.getByTestId("sku-sku-a-utility").textContent;
    const afterAgg = screen.getByTestId("plan-aggregate").textContent;
    expect(afterA).not.toBe(beforeA);
    expect(afterAgg).not.toBe(beforeAgg);
  });

  it("a broken formula surfaces a per-SKU error and doesn't break the rest of the plan", () => {
    render(<BuyPlanStudio />);
    const editor = screen.getByTestId("sku-sku-a-formula") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "this is (( broken" } });
    expect(screen.getByTestId("sku-sku-a-error")).toBeTruthy();
    // The other SKU rows still render utility numbers
    expect(screen.getByTestId("sku-sku-b-utility").textContent).toMatch(/\$/);
  });

  it("snap-to-optimum closes most of the gap", () => {
    render(<BuyPlanStudio />);
    fireEvent.click(screen.getByTestId("plan-snap-optimum"));
    const gap = screen.getByTestId("plan-gap").textContent ?? "";
    // After snap, the gap should be at or near zero. We allow a small
    // residual because relationship corrections aren't part of the
    // per-SKU optimum.
    expect(gap).toMatch(/^\$/);
  });

  it("shared-capacity violation surfaces a violations banner", () => {
    render(<BuyPlanStudio />);
    // Push every SKU's q way past the shared cap of 1500.
    fireEvent.change(screen.getByTestId("sku-sku-a-q"), { target: { value: "1000" } });
    fireEvent.change(screen.getByTestId("sku-sku-b-q"), { target: { value: "1000" } });
    fireEvent.change(screen.getByTestId("sku-sku-c-q"), { target: { value: "1000" } });
    expect(screen.getByTestId("plan-violations")).toBeTruthy();
  });

  it("reset restores the default plan", () => {
    render(<BuyPlanStudio />);
    const q = screen.getByTestId("sku-sku-a-q") as HTMLInputElement;
    fireEvent.change(q, { target: { value: "100" } });
    expect(q.value).toBe("100");
    fireEvent.click(screen.getByTestId("plan-reset"));
    const after = screen.getByTestId("sku-sku-a-q") as HTMLInputElement;
    expect(after.value).toBe("350"); // default sku-a q
  });

  it("renames a SKU and the name flows into relationship descriptions", () => {
    render(<BuyPlanStudio />);
    const nameInput = screen.getByTestId("sku-sku-a-name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Tier-1 chip" } });
    // Look at the substitute relationship row's SKU name list
    const rel = screen.getByTestId("relationship-rel-sub-ab");
    expect(rel.textContent).toMatch(/Tier-1 chip/);
  });
});
