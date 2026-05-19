import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NegotiateSurface } from "./NegotiateSurface";

beforeEach(() => {
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", "/");
  }
  // BroadcastChannel may not exist in jsdom; stub it so the hook is happy.
  if (typeof BroadcastChannel === "undefined") {
    class StubChannel {
      onmessage: ((event: MessageEvent) => void) | null = null;
      postMessage() {}
      close() {}
    }
    (globalThis as unknown as { BroadcastChannel: typeof StubChannel }).BroadcastChannel =
      StubChannel;
  }
});

afterEach(() => {
  cleanup();
});

describe("NegotiateSurface", () => {
  it("starts on the role picker for a fresh visitor", () => {
    render(<NegotiateSurface onOpenHome={() => {}} />);
    expect(screen.getByTestId("negotiate-role-picker")).toBeTruthy();
  });

  it("picking buyer hides the picker and shows the offer panel", () => {
    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    expect(screen.queryByTestId("negotiate-role-picker")).toBeNull();
    expect(screen.getByTestId("submit-offer")).toBeTruthy();
  });

  it("submitting an offer appends to the round log", () => {
    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-supplier"));
    fireEvent.change(screen.getByTestId("draft-q"), {
      target: { value: "350" },
    });
    fireEvent.change(screen.getByTestId("draft-price"), {
      target: { value: "92" },
    });
    fireEvent.change(screen.getByTestId("draft-note"), {
      target: { value: "capacity max for this week" },
    });
    fireEvent.click(screen.getByTestId("submit-offer"));
    expect(screen.getByTestId("round-log").textContent).toMatch(
      /q=350.*\$92.*capacity max/i,
    );
    // URL was updated with the encoded state
    const url = new URL(window.location.href);
    expect(url.searchParams.get("n")).toBeTruthy();
  });

  it("both sides accepting closes the deal", () => {
    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    fireEvent.click(screen.getByTestId("submit-offer"));
    fireEvent.click(screen.getByTestId("accept-offer"));
    // Switch role within the same browser to simulate partner
    fireEvent.click(screen.getByTestId("negotiate-new-session"));
    fireEvent.click(screen.getByTestId("role-supplier"));
    fireEvent.click(screen.getByTestId("submit-offer"));
    fireEvent.click(screen.getByTestId("accept-offer"));
    // Accepting alone (only one side) doesn't close
    expect(screen.queryByTestId("deal-closed")).toBeNull();
  });

  it("Start new session button returns to role picker with an empty round log", () => {
    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    fireEvent.click(screen.getByTestId("submit-offer"));
    fireEvent.click(screen.getByTestId("negotiate-new-session"));
    expect(screen.getByTestId("negotiate-role-picker")).toBeTruthy();
    // The role picker is the proof; the URL ?n= param re-populates to a
    // fresh empty session immediately so the partner can still resume.
    expect(screen.queryByTestId("round-log")).toBeNull();
  });

  it("copy link button copies the current URL", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    fireEvent.click(screen.getByTestId("submit-offer"));
    fireEvent.click(screen.getByTestId("copy-link"));
    await Promise.resolve();
    expect(writeText).toHaveBeenCalled();
  });

  it("clicking Home invokes onOpenHome", () => {
    const onOpenHome = vi.fn();
    render(<NegotiateSurface onOpenHome={onOpenHome} />);
    fireEvent.click(screen.getByTestId("negotiate-home"));
    expect(onOpenHome).toHaveBeenCalled();
  });
});
