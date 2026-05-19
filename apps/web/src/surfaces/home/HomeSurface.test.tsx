import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { HomeSurface } from "./HomeSurface";
import {
  clearProgress,
  markComplete,
  emptyProgress,
  saveProgress,
} from "../../state/learnProgress";

beforeEach(() => {
  clearProgress();
});

afterEach(() => {
  cleanup();
  clearProgress();
});

describe("HomeSurface", () => {
  it('renders "Start playing" CTA for a fresh visitor', () => {
    render(<HomeSurface onStartPlaying={() => {}} onOpenSandbox={() => {}} />);
    const cta = screen.getByTestId("home-start-cta");
    expect(cta.textContent).toContain("Start playing");
  });

  it("renders the Sandbox link in nav and as a CTA button", () => {
    render(<HomeSurface onStartPlaying={() => {}} onOpenSandbox={() => {}} />);
    expect(screen.getByTestId("home-sandbox-link")).toBeTruthy();
    expect(screen.getByTestId("home-sandbox-cta")).toBeTruthy();
  });

  it("calls onStartPlaying(1) for a fresh visitor", () => {
    const onStartPlaying = vi.fn();
    render(
      <HomeSurface
        onStartPlaying={onStartPlaying}
        onOpenSandbox={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("home-start-cta"));
    expect(onStartPlaying).toHaveBeenCalledWith(1);
  });

  it("shows continue + reset for a returning visitor", () => {
    saveProgress(markComplete(emptyProgress(), 3));
    render(<HomeSurface onStartPlaying={() => {}} onOpenSandbox={() => {}} />);
    const cta = screen.getByTestId("home-start-cta");
    expect(cta.textContent).toContain("Continue at Level 4");
    expect(screen.getByTestId("home-restart-cta")).toBeTruthy();
    expect(screen.getByTestId("home-reset-progress")).toBeTruthy();
  });

  it("calls onStartPlaying with next-unlocked level for returning visitor", () => {
    saveProgress(markComplete(emptyProgress(), 2));
    const onStartPlaying = vi.fn();
    render(
      <HomeSurface
        onStartPlaying={onStartPlaying}
        onOpenSandbox={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("home-start-cta"));
    expect(onStartPlaying).toHaveBeenCalledWith(3);
  });

  it("restart CTA goes to Level 1 regardless of progress", () => {
    saveProgress(markComplete(emptyProgress(), 4));
    const onStartPlaying = vi.fn();
    render(
      <HomeSurface
        onStartPlaying={onStartPlaying}
        onOpenSandbox={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId("home-restart-cta"));
    expect(onStartPlaying).toHaveBeenCalledWith(1);
  });

  it("reset progress clears state and re-renders fresh", () => {
    saveProgress(markComplete(emptyProgress(), 3));
    render(<HomeSurface onStartPlaying={() => {}} onOpenSandbox={() => {}} />);
    expect(screen.getByTestId("home-reset-progress")).toBeTruthy();
    fireEvent.click(screen.getByTestId("home-reset-progress"));
    expect(screen.queryByTestId("home-reset-progress")).toBeNull();
    expect(screen.getByTestId("home-start-cta").textContent).toContain("Start playing");
  });

  it("calls onOpenSandbox from both nav link and CTA", () => {
    const onOpenSandbox = vi.fn();
    render(
      <HomeSurface onStartPlaying={() => {}} onOpenSandbox={onOpenSandbox} />,
    );
    fireEvent.click(screen.getByTestId("home-sandbox-link"));
    fireEvent.click(screen.getByTestId("home-sandbox-cta"));
    expect(onOpenSandbox).toHaveBeenCalledTimes(2);
  });
});
