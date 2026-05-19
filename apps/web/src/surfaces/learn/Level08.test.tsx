import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Level08 } from "./Level08";
import { emptyProgress } from "../../state/learnProgress";

afterEach(() => cleanup());

function setup(overrides: {
  onComplete?: () => void;
  onOpenSandbox?: () => void;
} = {}) {
  return render(
    <Level08
      progress={emptyProgress()}
      onComplete={overrides.onComplete ?? (() => {})}
      onOpenSandbox={overrides.onOpenSandbox}
    />,
  );
}

describe("Level08", () => {
  it("renders five role chips and pre-fills the formula for the buyer role", () => {
    setup();
    expect(screen.getByTestId("role-chip-buyer")).toBeTruthy();
    expect(screen.getByTestId("role-chip-supplier")).toBeTruthy();
    expect(screen.getByTestId("role-chip-packager")).toBeTruthy();
    expect(screen.getByTestId("role-chip-logistics")).toBeTruthy();
    expect(screen.getByTestId("role-chip-distributor")).toBeTruthy();
    const editor = screen.getByTestId("formula-editor") as HTMLTextAreaElement;
    expect(editor.value).toMatch(/service_value/i);
  });

  it("switching role re-pins the formula textarea", () => {
    setup();
    const editor = screen.getByTestId("formula-editor") as HTMLTextAreaElement;
    const before = editor.value;
    fireEvent.click(screen.getByTestId("role-chip-supplier"));
    expect(editor.value).not.toBe(before);
  });

  it("invalid formula surfaces an error message without crashing", () => {
    setup();
    const editor = screen.getByTestId("formula-editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "this is ((not a real formula" } });
    expect(screen.getByTestId("formula-error")).toBeTruthy();
  });

  it("graduation card appears only after the user edits the formula or a parameter", () => {
    setup();
    expect(screen.queryByTestId("graduation-card")).toBeNull();
    const slider = screen.getByLabelText(/urgency/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.9" } });
    expect(screen.getByTestId("graduation-card")).toBeTruthy();
  });

  it("clicking Open Sandbox invokes onComplete then onOpenSandbox", () => {
    const onComplete = vi.fn();
    const onOpenSandbox = vi.fn();
    setup({ onComplete, onOpenSandbox });
    const slider = screen.getByLabelText(/urgency/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.9" } });
    fireEvent.click(screen.getByTestId("open-sandbox"));
    expect(onComplete).toHaveBeenCalled();
    expect(onOpenSandbox).toHaveBeenCalled();
  });

  it("help toggle reveals the variable cheat-sheet", () => {
    setup();
    expect(screen.queryByTestId("formula-help")).toBeNull();
    fireEvent.click(screen.getByTestId("formula-help-toggle"));
    expect(screen.getByTestId("formula-help")).toBeTruthy();
  });
});
