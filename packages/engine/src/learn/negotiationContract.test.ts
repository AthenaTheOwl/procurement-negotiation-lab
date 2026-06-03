import { describe, expect, it } from "vitest";
import {
  appendRound,
  applyAccept,
  encodeSession,
  newSession,
  type RoundRecord,
} from "./negotiationSession";
import {
  FUNCTIONAL_NEGOTIATION_MECHANISMS,
  NEGOTIATION_CONTRACT_VERSION,
  appendSurfaceRound,
  applySurfaceAccept,
  decodeLegacySessionToSurfaceState,
  decodeNegotiationFromURLSearch,
  decodeSurfaceState,
  encodeSurfaceState,
  latestSurfaceOfferFor,
  legacySessionToSurfaceState,
  newSurfaceState,
  runSurfaceEngine,
  withMechanism,
} from "./negotiationContract";

const buyerRound: RoundRecord = {
  role: "buyer",
  offer: { q: 420, unitPrice: 86, note: "opening offer" },
  at: "2026-06-03T12:00:00.000Z",
};

const supplierRound: RoundRecord = {
  role: "supplier",
  offer: { q: 360, unitPrice: 94, note: "capacity is tight" },
  at: "2026-06-03T12:01:00.000Z",
};

function encodeObject(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

describe("negotiation surface contract v2", () => {
  it("lists only mechanisms backed by engine paths", () => {
    expect(FUNCTIONAL_NEGOTIATION_MECHANISMS.map((m) => m.id)).toEqual([
      "weighted_nash_bounded",
      "weighted_nash_plaintext",
    ]);
  });

  it("round-trips v2 surface state", () => {
    const state = appendSurfaceRound(newSurfaceState({ sessionId: "s-v2" }), buyerRound);
    const decoded = decodeSurfaceState(encodeSurfaceState(state));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.translatedFromLegacy).toBe(false);
      expect(decoded.state.v).toBe(NEGOTIATION_CONTRACT_VERSION);
      expect(decoded.state.sessionId).toBe("s-v2");
      expect(decoded.state.history[0].offer.note).toBe("opening offer");
    }
  });

  it("rejects unknown contract versions", () => {
    const encoded = encodeObject({
      ...newSurfaceState(),
      v: 99,
    });
    expect(decodeSurfaceState(encoded)).toEqual({
      ok: false,
      reason: "unknown negotiation contract version",
    });
  });

  it("rejects unknown mechanism ids", () => {
    const encoded = encodeObject({
      ...newSurfaceState(),
      mechanismId: "weighted_nash_mpc",
    });
    expect(decodeSurfaceState(encoded)).toEqual({
      ok: false,
      reason: "unknown mechanism id",
    });
  });

  it("rejects invalid base64 payloads", () => {
    expect(decodeSurfaceState("not valid !!!")).toEqual({
      ok: false,
      reason: "invalid base64 or JSON payload",
    });
  });

  it("translates a legacy v1 session without losing state", () => {
    let legacy = appendRound(newSession(), buyerRound);
    legacy = appendRound(legacy, {
      ...supplierRound,
      offer: {
        ...supplierRound.offer,
        note: "capacity tight - supplier says yes",
      },
    });
    legacy = applyAccept(legacy, "supplier");

    const translated = legacySessionToSurfaceState(legacy);
    expect(translated.v).toBe(2);
    expect(translated.sessionId).toBe(legacy.sessionId);
    expect(translated.history).toEqual(legacy.history);
    expect(translated.supplierAccepted).toBe(true);
    expect(translated.mechanismId).toBe("weighted_nash_bounded");
    expect(translated.privacyMode).toBe("private");
  });

  it("decodes legacy ?n= links and marks the translation", () => {
    const legacy = appendRound(newSession(), buyerRound);
    const decoded = decodeLegacySessionToSurfaceState(encodeSession(legacy));
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.translatedFromLegacy).toBe(true);
      expect(decoded.state.history[0].offer.q).toBe(420);
    }
  });

  it("decodes URL search with v2 preferred over legacy", () => {
    const legacy = appendRound(newSession(), supplierRound);
    const v2 = newSurfaceState({ sessionId: "modern" });
    const result = decodeNegotiationFromURLSearch(
      `?n=${encodeSession(legacy)}&neg=${encodeSurfaceState(v2)}`,
    );
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.translatedFromLegacy).toBe(false);
      expect(result.state.sessionId).toBe("modern");
    }
  });

  it("fails closed for legacy unknown roles and oversized history", () => {
    const invalidRole = encodeObject({
      ...newSession(),
      history: [{ role: "broker", offer: buyerRound.offer, at: buyerRound.at }],
    });
    expect(decodeLegacySessionToSurfaceState(invalidRole)).toEqual({
      ok: false,
      reason: "invalid legacy negotiation session",
    });

    const oversized = encodeObject({
      ...newSession(),
      history: Array.from({ length: 25 }, () => buyerRound),
    });
    expect(decodeLegacySessionToSurfaceState(oversized)).toEqual({
      ok: false,
      reason: "invalid legacy negotiation session",
    });
  });

  it("runs bounded weighted-Nash and attaches leakage + participation reports", () => {
    let state = newSurfaceState({ sessionId: "engine" });
    state = appendSurfaceRound(state, buyerRound);
    state = appendSurfaceRound(state, supplierRound);

    const withEngine = runSurfaceEngine(state);
    expect(withEngine.engineResponse).not.toBeNull();
    expect(withEngine.engineResponse?.mechanism_id).toBe("weighted_nash_bounded");
    expect(withEngine.engineResponse?.proposed_offer.q).toBeGreaterThan(0);
    expect(withEngine.engineResponse?.leakage_report?.aggregate.all_within_bound).toBe(true);
    expect(withEngine.engineResponse?.participation.every((p) => p.no_worse_off)).toBe(true);
  });

  it("switches mechanism and runs plaintext without a leakage report", () => {
    let state = withMechanism(newSurfaceState({ sessionId: "plain" }), "weighted_nash_plaintext");
    state = appendSurfaceRound(state, buyerRound);
    const withEngine = runSurfaceEngine(state);
    expect(withEngine.engineResponse?.mechanism_id).toBe("weighted_nash_plaintext");
    expect(withEngine.engineResponse?.privacy_mode).toBe("full_oracle");
    expect(withEngine.engineResponse?.leakage_report).toBeNull();
  });

  it("latestSurfaceOfferFor returns the newest round for each role", () => {
    let state = appendSurfaceRound(newSurfaceState(), buyerRound);
    state = appendSurfaceRound(state, supplierRound);
    state = appendSurfaceRound(state, {
      ...buyerRound,
      offer: { ...buyerRound.offer, q: 450 },
    });
    expect(latestSurfaceOfferFor(state, "buyer")?.q).toBe(450);
    expect(latestSurfaceOfferFor(state, "supplier")?.q).toBe(360);
  });

  it("applySurfaceAccept marks each side without clearing engine response", () => {
    let state = runSurfaceEngine(appendSurfaceRound(newSurfaceState(), buyerRound));
    state = applySurfaceAccept(state, "buyer");
    expect(state.buyerAccepted).toBe(true);
    expect(state.engineResponse).not.toBeNull();
  });
});
