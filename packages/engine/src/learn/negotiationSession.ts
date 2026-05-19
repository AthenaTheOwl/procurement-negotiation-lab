/**
 * negotiationSession — encode/decode a two-party negotiation state.
 *
 * Each "turn" is encoded into a URL fragment. The two browsers
 * exchange links (or share a BroadcastChannel when they're on the
 * same machine). No server.
 *
 * State carries: session id, the last offer from each side, a small
 * round history, and whether either side has accepted.
 */

const SESSION_VERSION = 1;

export type NegotiationRole = "buyer" | "supplier";

export interface Offer {
  q: number;
  unitPrice: number;
  note: string;
}

export interface RoundRecord {
  role: NegotiationRole;
  offer: Offer;
  at: string; // ISO timestamp
}

export interface NegotiationState {
  v: typeof SESSION_VERSION;
  sessionId: string;
  history: RoundRecord[];
  buyerAccepted: boolean;
  supplierAccepted: boolean;
}

function base64UrlEncode(input: string): string {
  if (typeof btoa === "function") {
    return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
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

export function newSession(): NegotiationState {
  return {
    v: SESSION_VERSION,
    sessionId: Math.random().toString(36).slice(2, 12),
    history: [],
    buyerAccepted: false,
    supplierAccepted: false,
  };
}

export function encodeSession(state: NegotiationState): string {
  // Cap history length to keep URLs reasonable.
  const compact: NegotiationState = {
    ...state,
    history: state.history.slice(-12),
  };
  return base64UrlEncode(JSON.stringify(compact));
}

const MAX_HISTORY = 24;

function isOffer(value: unknown): value is Offer {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.q === "number" &&
    Number.isFinite(v.q) &&
    typeof v.unitPrice === "number" &&
    Number.isFinite(v.unitPrice) &&
    typeof v.note === "string"
  );
}

function isRoundRecord(value: unknown): value is RoundRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (v.role === "buyer" || v.role === "supplier") &&
    isOffer(v.offer) &&
    typeof v.at === "string"
  );
}

export function decodeSession(encoded: string): NegotiationState | null {
  try {
    const json = base64UrlDecode(encoded);
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    if (parsed.v !== SESSION_VERSION) return null;
    if (typeof parsed.sessionId !== "string") return null;
    if (!Array.isArray(parsed.history)) return null;
    if (parsed.history.length > MAX_HISTORY) return null;
    if (!parsed.history.every(isRoundRecord)) return null;
    if (typeof parsed.buyerAccepted !== "boolean") return null;
    if (typeof parsed.supplierAccepted !== "boolean") return null;
    return {
      v: SESSION_VERSION,
      sessionId: parsed.sessionId,
      history: parsed.history.slice(-MAX_HISTORY),
      buyerAccepted: parsed.buyerAccepted,
      supplierAccepted: parsed.supplierAccepted,
    };
  } catch {
    return null;
  }
}

export function appendRound(
  state: NegotiationState,
  round: RoundRecord,
): NegotiationState {
  return {
    ...state,
    history: [...state.history, round].slice(-MAX_HISTORY),
  };
}

export function applyAccept(
  state: NegotiationState,
  role: NegotiationRole,
): NegotiationState {
  if (role === "buyer") return { ...state, buyerAccepted: true };
  return { ...state, supplierAccepted: true };
}

export function isDealClosed(state: NegotiationState): boolean {
  return state.buyerAccepted && state.supplierAccepted;
}

export function latestOfferFor(
  state: NegotiationState,
  role: NegotiationRole,
): Offer | null {
  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    if (state.history[i].role === role) return state.history[i].offer;
  }
  return null;
}
