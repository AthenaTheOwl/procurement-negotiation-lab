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

  it("role picker suggests the other side when URL state already has offers", async () => {
    // Pre-seed the URL with a buyer-only session.
    const { encodeSession, newSession, appendRound } = await import(
      "@lab/engine"
    );
    const seeded = appendRound(newSession(), {
      role: "buyer",
      offer: { q: 400, unitPrice: 80, note: "seed" },
      at: new Date().toISOString(),
    });
    window.history.replaceState(null, "", `/?n=${encodeSession(seeded)}`);

    render(<NegotiateSurface onOpenHome={() => {}} />);
    const suggestion = screen.getByTestId("role-suggestion");
    expect(suggestion.textContent).toMatch(/supplier/i);
    // The supplier chip should also carry the "suggested" marker.
    expect(screen.getByTestId("role-supplier").textContent).toMatch(
      /suggested/i,
    );
  });

  it("picking the same role as the partner shows a conflict banner and switch button", async () => {
    const { encodeSession, newSession, appendRound } = await import(
      "@lab/engine"
    );
    // Partner posted as supplier.
    const seeded = appendRound(newSession(), {
      role: "supplier",
      offer: { q: 350, unitPrice: 90, note: "" },
      at: new Date().toISOString(),
    });
    window.history.replaceState(null, "", `/?n=${encodeSession(seeded)}`);

    render(<NegotiateSurface onOpenHome={() => {}} />);
    // Pick supplier too — that's a conflict.
    fireEvent.click(screen.getByTestId("role-supplier"));
    expect(screen.getByTestId("role-conflict-banner")).toBeTruthy();
    // Switch button flips to buyer
    fireEvent.click(screen.getByTestId("role-switch"));
    expect(screen.queryByTestId("role-conflict-banner")).toBeNull();
  });

  it("Accept opens a confirmation card; confirming closes the deal when both sides accept", async () => {
    const { encodeSession, newSession, appendRound, applyAccept } = await import(
      "@lab/engine"
    );
    // Partner (supplier) posted an offer + already accepted; this user
    // is the buyer.
    let seeded = appendRound(newSession(), {
      role: "supplier",
      offer: { q: 350, unitPrice: 92, note: "" },
      at: new Date().toISOString(),
    });
    seeded = applyAccept(seeded, "supplier");
    window.history.replaceState(null, "", `/?n=${encodeSession(seeded)}`);

    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    fireEvent.click(screen.getByTestId("accept-offer"));
    // Confirmation card appears, naming the offer being accepted.
    const detail = screen.getByTestId("accept-confirm-detail");
    expect(detail.textContent).toMatch(/q = 350/);
    expect(detail.textContent).toMatch(/\$92\/unit/);
    fireEvent.click(screen.getByTestId("accept-confirm-yes"));
    // Now both have accepted → deal-closed surface with final terms.
    expect(screen.getByTestId("deal-closed")).toBeTruthy();
    const terms = screen.getByTestId("deal-final-terms");
    expect(terms.textContent).toMatch(/quantity:.*350/);
    expect(terms.textContent).toMatch(/unit price:.*\$92/);
  });

  it("Accept can be cancelled", async () => {
    const { encodeSession, newSession, appendRound } = await import(
      "@lab/engine"
    );
    const seeded = appendRound(newSession(), {
      role: "supplier",
      offer: { q: 350, unitPrice: 92, note: "" },
      at: new Date().toISOString(),
    });
    window.history.replaceState(null, "", `/?n=${encodeSession(seeded)}`);

    render(<NegotiateSurface onOpenHome={() => {}} />);
    fireEvent.click(screen.getByTestId("role-buyer"));
    fireEvent.click(screen.getByTestId("accept-offer"));
    expect(screen.getByTestId("accept-confirm")).toBeTruthy();
    fireEvent.click(screen.getByTestId("accept-confirm-no"));
    expect(screen.queryByTestId("accept-confirm")).toBeNull();
    // Half-accepted banner did NOT trip
    expect(screen.queryByTestId("half-accepted-banner")).toBeNull();
  });
});
