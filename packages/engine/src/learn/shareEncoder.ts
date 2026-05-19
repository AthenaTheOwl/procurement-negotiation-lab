/**
 * shareEncoder — encode/decode a Level-8 participant so it can travel
 * in a URL.
 *
 * Format: base64url(JSON({ v, role, formula, params })). v is the
 * version field; decoders ignore any payload whose v doesn't match.
 * The encoder strips parameters outside the AgentParameters shape so a
 * tampered share URL can't smuggle extra fields into the level.
 */

import type { AgentParameters, ParticipantRole } from "../model/types";

export const SHARE_VERSION = 1;

export interface SharedParticipant {
  v: typeof SHARE_VERSION;
  role: ParticipantRole;
  formula: string;
  params: AgentParameters;
}

const ROLE_VALUES: ParticipantRole[] = [
  "buyer",
  "supplier",
  "packager",
  "logistics",
  "distributor",
  "coordinator",
];

const PARAM_KEYS: (keyof AgentParameters)[] = [
  "urgency",
  "flexibility",
  "truthfulness",
  "privacyPreference",
  "riskAversion",
];

function base64UrlEncode(input: string): string {
  if (typeof btoa === "function") {
    return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  // Node fallback
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  if (typeof atob === "function") {
    return atob(padded + padding);
  }
  return Buffer.from(padded + padding, "base64").toString("utf-8");
}

export function encodeParticipant(payload: {
  role: ParticipantRole;
  formula: string;
  params: AgentParameters;
}): string {
  const clean: SharedParticipant = {
    v: SHARE_VERSION,
    role: payload.role,
    formula: payload.formula.slice(0, 2000),
    params: {
      urgency: clamp01(payload.params.urgency),
      flexibility: clamp01(payload.params.flexibility),
      truthfulness: clamp01(payload.params.truthfulness),
      privacyPreference: clamp01(payload.params.privacyPreference),
      riskAversion: clamp01(payload.params.riskAversion),
    },
  };
  return base64UrlEncode(JSON.stringify(clean));
}

export function decodeParticipant(encoded: string): SharedParticipant | null {
  try {
    const json = base64UrlDecode(encoded);
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.v !== SHARE_VERSION) return null;
    if (!ROLE_VALUES.includes(parsed.role)) return null;
    if (typeof parsed.formula !== "string") return null;
    if (typeof parsed.params !== "object" || parsed.params === null) return null;
    for (const key of PARAM_KEYS) {
      if (typeof parsed.params[key] !== "number") return null;
    }
    return {
      v: SHARE_VERSION,
      role: parsed.role,
      formula: parsed.formula.slice(0, 2000),
      params: {
        urgency: clamp01(parsed.params.urgency),
        flexibility: clamp01(parsed.params.flexibility),
        truthfulness: clamp01(parsed.params.truthfulness),
        privacyPreference: clamp01(parsed.params.privacyPreference),
        riskAversion: clamp01(parsed.params.riskAversion),
      },
    };
  } catch {
    return null;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}
