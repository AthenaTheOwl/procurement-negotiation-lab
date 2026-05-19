import { describe, expect, it } from "vitest";
import {
  appendRound,
  applyAccept,
  decodeSession,
  encodeSession,
  isDealClosed,
  latestOfferFor,
  newSession,
  type RoundRecord,
} from "./negotiationSession";

const baseRound: RoundRecord = {
  role: "buyer",
  offer: { q: 400, unitPrice: 80, note: "opening offer" },
  at: "2026-05-19T08:00:00.000Z",
};

describe("negotiationSession", () => {
  it("newSession produces a session with empty history and no accepts", () => {
    const s = newSession();
    expect(s.history.length).toBe(0);
    expect(s.buyerAccepted).toBe(false);
    expect(s.supplierAccepted).toBe(false);
    expect(s.sessionId.length).toBeGreaterThan(0);
  });

  it("encode + decode round-trips state", () => {
    const s = appendRound(newSession(), baseRound);
    const url = encodeSession(s);
    const back = decodeSession(url);
    expect(back).toEqual(s);
  });

  it("rejects tampered version", () => {
    const bad = btoa(
      JSON.stringify({ ...newSession(), v: 99 }),
    ).replace(/=+$/, "");
    expect(decodeSession(bad)).toBeNull();
  });

  it("rejects malformed history items", () => {
    const bad = btoa(
      JSON.stringify({
        ...newSession(),
        history: [{ role: "hacker", offer: {}, at: "" }],
      }),
    ).replace(/=+$/, "");
    expect(decodeSession(bad)).toBeNull();
  });

  it("appendRound caps history length", () => {
    let s = newSession();
    for (let i = 0; i < 40; i += 1) {
      s = appendRound(s, { ...baseRound, offer: { ...baseRound.offer, q: i } });
    }
    expect(s.history.length).toBeLessThanOrEqual(24);
    // most recent round is the one with the highest q
    expect(s.history[s.history.length - 1].offer.q).toBe(39);
  });

  it("applyAccept marks the right party", () => {
    const s = applyAccept(newSession(), "buyer");
    expect(s.buyerAccepted).toBe(true);
    expect(s.supplierAccepted).toBe(false);
  });

  it("isDealClosed only true when both accept", () => {
    let s = newSession();
    expect(isDealClosed(s)).toBe(false);
    s = applyAccept(s, "buyer");
    expect(isDealClosed(s)).toBe(false);
    s = applyAccept(s, "supplier");
    expect(isDealClosed(s)).toBe(true);
  });

  it("latestOfferFor returns the most recent offer for a role", () => {
    let s = newSession();
    s = appendRound(s, baseRound);
    s = appendRound(s, {
      role: "supplier",
      offer: { q: 300, unitPrice: 110, note: "counter" },
      at: "2026-05-19T08:01:00.000Z",
    });
    s = appendRound(s, {
      ...baseRound,
      offer: { ...baseRound.offer, q: 380 },
      at: "2026-05-19T08:02:00.000Z",
    });
    expect(latestOfferFor(s, "buyer")?.q).toBe(380);
    expect(latestOfferFor(s, "supplier")?.q).toBe(300);
  });

  it("latestOfferFor returns null when no offer from that role", () => {
    const s = appendRound(newSession(), baseRound);
    expect(latestOfferFor(s, "supplier")).toBeNull();
  });
});
