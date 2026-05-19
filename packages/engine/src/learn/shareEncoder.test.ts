import { describe, expect, it } from "vitest";
import {
  SHARE_VERSION,
  decodeParticipant,
  encodeParticipant,
} from "./shareEncoder";

const baseline = {
  role: "buyer" as const,
  formula: "service_value * min(q, demand) - unit_cost * q",
  params: {
    urgency: 0.6,
    flexibility: 0.5,
    truthfulness: 0.7,
    privacyPreference: 0.6,
    riskAversion: 0.6,
  },
};

describe("shareEncoder", () => {
  it("round-trips a participant", () => {
    const encoded = encodeParticipant(baseline);
    const decoded = decodeParticipant(encoded);
    expect(decoded).toEqual({ v: SHARE_VERSION, ...baseline });
  });

  it("clamps params outside [0, 1]", () => {
    const encoded = encodeParticipant({
      ...baseline,
      params: { ...baseline.params, urgency: 5, riskAversion: -1 },
    });
    const decoded = decodeParticipant(encoded);
    expect(decoded?.params.urgency).toBe(1);
    expect(decoded?.params.riskAversion).toBe(0);
  });

  it("returns null on invalid base64", () => {
    expect(decodeParticipant("not real base64!!@#")).toBeNull();
  });

  it("returns null when version mismatches", () => {
    const evil = btoa(
      JSON.stringify({ ...baseline, v: 99 }),
    ).replace(/=+$/, "");
    expect(decodeParticipant(evil)).toBeNull();
  });

  it("returns null on unknown role (defense against tampered URL)", () => {
    const evil = btoa(
      JSON.stringify({ v: SHARE_VERSION, ...baseline, role: "hacker" }),
    ).replace(/=+$/, "");
    expect(decodeParticipant(evil)).toBeNull();
  });

  it("returns null when params are missing keys", () => {
    const evil = btoa(
      JSON.stringify({
        v: SHARE_VERSION,
        role: "buyer",
        formula: "x",
        params: { urgency: 0.5 },
      }),
    ).replace(/=+$/, "");
    expect(decodeParticipant(evil)).toBeNull();
  });

  it("truncates very long formulas to 2000 chars", () => {
    const long = "x".repeat(5000);
    const encoded = encodeParticipant({ ...baseline, formula: long });
    const decoded = decodeParticipant(encoded);
    expect(decoded?.formula.length).toBe(2000);
  });
});
