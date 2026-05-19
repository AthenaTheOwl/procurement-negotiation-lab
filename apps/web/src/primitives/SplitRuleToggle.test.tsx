import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SplitRuleToggle } from "./SplitRuleToggle";

afterEach(() => cleanup());

describe("SplitRuleToggle", () => {
  it("renders all three rules", () => {
    render(<SplitRuleToggle value="proportional" onChange={() => {}} />);
    expect(screen.getByTestId("split-rule-proportional")).toBeTruthy();
    expect(screen.getByTestId("split-rule-equal")).toBeTruthy();
    expect(screen.getByTestId("split-rule-shapley")).toBeTruthy();
  });

  it("marks the current rule as aria-checked", () => {
    render(<SplitRuleToggle value="equal" onChange={() => {}} />);
    const pill = screen.getByTestId("split-rule-equal");
    expect(pill.getAttribute("aria-checked")).toBe("true");
  });

  it("clicking a rule fires onChange with that rule", () => {
    const onChange = vi.fn();
    render(<SplitRuleToggle value="proportional" onChange={onChange} />);
    fireEvent.click(screen.getByTestId("split-rule-shapley"));
    expect(onChange).toHaveBeenCalledWith("shapley");
  });

  it("disabled blocks clicks", () => {
    const onChange = vi.fn();
    render(
      <SplitRuleToggle value="equal" onChange={onChange} disabled />,
    );
    fireEvent.click(screen.getByTestId("split-rule-shapley"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
