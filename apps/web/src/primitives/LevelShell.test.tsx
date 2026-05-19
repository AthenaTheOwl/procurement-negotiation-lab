import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { LevelShell } from "./LevelShell";

afterEach(() => {
  cleanup();
});

describe("LevelShell", () => {
  it("renders title, stakes, and progress dots", () => {
    render(
      <LevelShell
        level={3}
        total={8}
        completedThrough={2}
        title="A level title"
        stakes="One sentence on why this matters"
      >
        <div>stage content</div>
      </LevelShell>,
    );
    expect(screen.getByText("A level title")).toBeTruthy();
    expect(screen.getByText("One sentence on why this matters")).toBeTruthy();
    expect(screen.getByText("stage content")).toBeTruthy();
    expect(screen.getByTestId("progress-dots")).toBeTruthy();
  });

  it("fires onContinue when the button is clicked", () => {
    const onContinue = vi.fn();
    render(
      <LevelShell
        level={1}
        total={8}
        completedThrough={0}
        title="t"
        stakes="s"
        onContinue={onContinue}
      >
        <div />
      </LevelShell>,
    );
    fireEvent.click(screen.getByTestId("level-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("disables continue when continueDisabled is true", () => {
    const onContinue = vi.fn();
    render(
      <LevelShell
        level={1}
        total={8}
        completedThrough={0}
        title="t"
        stakes="s"
        continueDisabled
        onContinue={onContinue}
      >
        <div />
      </LevelShell>,
    );
    const button = screen.getByTestId("level-continue") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("renders the reveal panel when reveal is provided", () => {
    render(
      <LevelShell
        level={1}
        total={8}
        completedThrough={0}
        title="t"
        stakes="s"
        reveal={<span>reveal text</span>}
      >
        <div />
      </LevelShell>,
    );
    expect(screen.getByTestId("level-reveal")).toBeTruthy();
    expect(screen.getByText("reveal text")).toBeTruthy();
  });

  it("does not render the reveal panel when reveal is undefined", () => {
    render(
      <LevelShell
        level={1}
        total={8}
        completedThrough={0}
        title="t"
        stakes="s"
      >
        <div />
      </LevelShell>,
    );
    expect(screen.queryByTestId("level-reveal")).toBeNull();
  });

  it("calls onOpenSandbox / onOpenHome via the corner links", () => {
    const onOpenSandbox = vi.fn();
    const onOpenHome = vi.fn();
    render(
      <LevelShell
        level={1}
        total={8}
        completedThrough={0}
        title="t"
        stakes="s"
        onOpenSandbox={onOpenSandbox}
        onOpenHome={onOpenHome}
      >
        <div />
      </LevelShell>,
    );
    fireEvent.click(screen.getByLabelText("Sandbox"));
    fireEvent.click(screen.getByLabelText("Home"));
    expect(onOpenSandbox).toHaveBeenCalled();
    expect(onOpenHome).toHaveBeenCalled();
  });
});
