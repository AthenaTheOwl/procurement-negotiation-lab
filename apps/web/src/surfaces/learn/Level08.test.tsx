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

  it("clicking Open Sandbox invokes onComplete (advances to Level 9)", () => {
    const onComplete = vi.fn();
    const onOpenSandbox = vi.fn();
    setup({ onComplete, onOpenSandbox });
    const slider = screen.getByLabelText(/urgency/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "0.9" } });
    fireEvent.click(screen.getByTestId("open-sandbox"));
    expect(onComplete).toHaveBeenCalled();
    // Level 8 no longer routes directly to sandbox; that handoff is at Level 9.
    expect(onOpenSandbox).not.toHaveBeenCalled();
  });

  it("help toggle reveals the variable cheat-sheet", () => {
    setup();
    expect(screen.queryByTestId("formula-help")).toBeNull();
    fireEvent.click(screen.getByTestId("formula-help-toggle"));
    expect(screen.getByTestId("formula-help")).toBeTruthy();
  });

  it("share button copies a participant URL to clipboard", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    setup();
    fireEvent.click(screen.getByTestId("share-participant"));
    // writeText runs in a microtask; flush
    await Promise.resolve();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
    const call = writeText.mock.calls[0] as unknown as [string];
    expect(call[0]).toMatch(/\?p=[A-Za-z0-9_-]+#\/learn\/8$/);
  });

  it("hydrates state from a ?p=<encoded> URL on mount", () => {
    // Encode a custom participant in the URL before render
    const encoded =
      // ROT-via-engine: just rebuild the same shape we expect
      btoa(
        JSON.stringify({
          v: 1,
          role: "supplier",
          formula: "21 * q - 5 * max(0, 500 - q)",
          params: {
            urgency: 0.9,
            flexibility: 0.4,
            truthfulness: 0.7,
            privacyPreference: 0.5,
            riskAversion: 0.8,
          },
        }),
      )
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    window.history.replaceState(null, "", `/?p=${encoded}`);
    setup();
    const editor = screen.getByTestId("formula-editor") as HTMLTextAreaElement;
    expect(editor.value).toContain("21 * q");
    // graduation card appears immediately because hydration counts as an edit
    expect(screen.getByTestId("graduation-card")).toBeTruthy();
    // cleanup
    window.history.replaceState(null, "", "/");
  });
});
