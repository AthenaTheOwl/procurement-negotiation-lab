import {
  decodeSession,
  type NegotiationRole,
  type NegotiationState,
  type Offer,
  type RoundRecord,
} from "./negotiationSession";
import {
  runWeightedNashBounded,
  runWeightedNashPlaintext,
  type LeakageReport,
  type NashInformationMode,
  type NashParticipant,
  type NashScenario,
  type WeightedNashAlgorithmRun,
} from "../model/weightedNash";

export const NEGOTIATION_CONTRACT_VERSION = 2;
export const NEGOTIATION_URL_PARAM = "neg";
export const LEGACY_NEGOTIATION_URL_PARAM = "n";

export type NegotiationMechanismId =
  | "weighted_nash_bounded"
  | "weighted_nash_plaintext";

export const FUNCTIONAL_NEGOTIATION_MECHANISMS: Array<{
  id: NegotiationMechanismId;
  label: string;
  privacyMode: NashInformationMode;
  description: string;
}> = [
  {
    id: "weighted_nash_bounded",
    label: "Weighted-Nash bounded leakage",
    privacyMode: "private",
    description: "Runs the bounded-leakage preference-private weighted-Nash protocol.",
  },
  {
    id: "weighted_nash_plaintext",
    label: "Weighted-Nash plaintext",
    privacyMode: "full_oracle",
    description: "Runs the full-preference weighted-Nash reference solver.",
  },
];

export interface ParticipationReport {
  party_id: string;
  role: NegotiationRole;
  utility: number;
  outside_option: number;
  no_worse_off: boolean;
}

export interface NegotiationEngineResponse {
  mechanism_id: NegotiationMechanismId;
  privacy_mode: NashInformationMode;
  proposed_offer: Offer;
  consensus_quantity: number;
  convergence: WeightedNashAlgorithmRun["convergence"];
  global_utility: number;
  final_residual: number;
  leakage_report: LeakageReport | null;
  participation: ParticipationReport[];
  source_run: WeightedNashAlgorithmRun;
}

export interface NegotiationSurfaceStateV2 {
  v: typeof NEGOTIATION_CONTRACT_VERSION;
  sessionId: string;
  mechanismId: NegotiationMechanismId;
  privacyMode: NashInformationMode;
  history: RoundRecord[];
  buyerAccepted: boolean;
  supplierAccepted: boolean;
  engineResponse: NegotiationEngineResponse | null;
}

export type DecodeSurfaceStateResult =
  | { ok: true; state: NegotiationSurfaceStateV2; translatedFromLegacy: boolean }
  | { ok: false; reason: string };

const MAX_HISTORY = 24;

function binaryFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function bytesFromBinary(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncode(input: string): string {
  if (typeof btoa === "function" && typeof TextEncoder === "function") {
    const bytes = new TextEncoder().encode(input);
    return btoa(binaryFromBytes(bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  if (typeof atob === "function" && typeof TextDecoder === "function") {
    return new TextDecoder().decode(bytesFromBinary(atob(padded + padding)));
  }
  return Buffer.from(padded + padding, "base64").toString("utf-8");
}

export function newSurfaceState(
  overrides: Partial<NegotiationSurfaceStateV2> = {},
): NegotiationSurfaceStateV2 {
  const base: NegotiationSurfaceStateV2 = {
    v: NEGOTIATION_CONTRACT_VERSION,
    sessionId: Math.random().toString(36).slice(2, 12),
    mechanismId: "weighted_nash_bounded",
    privacyMode: "private",
    history: [],
    buyerAccepted: false,
    supplierAccepted: false,
    engineResponse: null,
  };
  return normalizeSurfaceState({ ...base, ...overrides });
}

export function encodeSurfaceState(state: NegotiationSurfaceStateV2): string {
  return base64UrlEncode(JSON.stringify(compactSurfaceState(normalizeSurfaceState(state))));
}

export function decodeSurfaceState(encoded: string): DecodeSurfaceStateResult {
  try {
    const parsed = JSON.parse(base64UrlDecode(encoded));
    if (!isRecord(parsed)) {
      return { ok: false, reason: "decoded payload is not an object" };
    }
    if (parsed.v !== NEGOTIATION_CONTRACT_VERSION) {
      return { ok: false, reason: "unknown negotiation contract version" };
    }
    const validation = validateSurfaceStateShape(parsed);
    if (!validation.ok) {
      return validation;
    }
    return {
      ok: true,
      state: normalizeSurfaceState(validation.state),
      translatedFromLegacy: false,
    };
  } catch {
    return { ok: false, reason: "invalid base64 or JSON payload" };
  }
}

export function legacySessionToSurfaceState(
  legacy: NegotiationState,
  mechanismId: NegotiationMechanismId = "weighted_nash_bounded",
): NegotiationSurfaceStateV2 {
  return normalizeSurfaceState({
    v: NEGOTIATION_CONTRACT_VERSION,
    sessionId: legacy.sessionId,
    mechanismId,
    privacyMode: privacyModeForMechanism(mechanismId),
    history: legacy.history,
    buyerAccepted: legacy.buyerAccepted,
    supplierAccepted: legacy.supplierAccepted,
    engineResponse: null,
  });
}

export function decodeLegacySessionToSurfaceState(
  encoded: string,
): DecodeSurfaceStateResult {
  const legacy = decodeSession(encoded);
  if (!legacy) {
    return { ok: false, reason: "invalid legacy negotiation session" };
  }
  return {
    ok: true,
    state: legacySessionToSurfaceState(legacy),
    translatedFromLegacy: true,
  };
}

export function decodeNegotiationFromURLSearch(search: string): DecodeSurfaceStateResult | null {
  const params = new URLSearchParams(search);
  const encodedV2 = params.get(NEGOTIATION_URL_PARAM);
  if (encodedV2) {
    return decodeSurfaceState(encodedV2);
  }
  const legacy = params.get(LEGACY_NEGOTIATION_URL_PARAM);
  if (legacy) {
    return decodeLegacySessionToSurfaceState(legacy);
  }
  return null;
}

export function withMechanism(
  state: NegotiationSurfaceStateV2,
  mechanismId: NegotiationMechanismId,
): NegotiationSurfaceStateV2 {
  return normalizeSurfaceState({
    ...state,
    mechanismId,
    privacyMode: privacyModeForMechanism(mechanismId),
    engineResponse: null,
  });
}

export function appendSurfaceRound(
  state: NegotiationSurfaceStateV2,
  round: RoundRecord,
): NegotiationSurfaceStateV2 {
  return normalizeSurfaceState({
    ...state,
    history: [...state.history, round].slice(-MAX_HISTORY),
    buyerAccepted: false,
    supplierAccepted: false,
    engineResponse: null,
  });
}

export function applySurfaceAccept(
  state: NegotiationSurfaceStateV2,
  role: NegotiationRole,
): NegotiationSurfaceStateV2 {
  return normalizeSurfaceState({
    ...state,
    buyerAccepted: role === "buyer" ? true : state.buyerAccepted,
    supplierAccepted: role === "supplier" ? true : state.supplierAccepted,
  });
}

export function runSurfaceEngine(
  state: NegotiationSurfaceStateV2,
): NegotiationSurfaceStateV2 {
  const normalized = normalizeSurfaceState(state);
  if (normalized.history.length === 0) {
    return { ...normalized, engineResponse: null };
  }
  const scenario = scenarioFromSurfaceState(normalized);
  const run = normalized.mechanismId === "weighted_nash_plaintext"
    ? runWeightedNashPlaintext(scenario, { informationMode: "full_oracle" })
    : runWeightedNashBounded(scenario, {
      informationMode: "private",
      runId: `surface-${normalized.sessionId}`,
    });
  const response = responseFromRun(normalized, run);
  return { ...normalized, engineResponse: response };
}

export function scenarioFromSurfaceState(state: NegotiationSurfaceStateV2): NashScenario {
  const buyerOffer = latestSurfaceOfferFor(state, "buyer");
  const supplierOffer = latestSurfaceOfferFor(state, "supplier");
  const demand = Math.max(1, buyerOffer?.q ?? supplierOffer?.q ?? 500);
  const capacity = Math.max(1, supplierOffer?.q ?? Math.round(demand * 1.2));
  const unitPrice = Math.max(1, averageDefined([buyerOffer?.unitPrice, supplierOffer?.unitPrice]) ?? 80);
  const productId = "surface-allocation";
  const buyer: NashParticipant = {
    id: "buyer",
    name: "Buyer",
    role: "buyer",
    utility_formula:
      "service_level_value * min(q, demand) " +
      "- unit_price * q " +
      "- shortage_penalty * max(demand - q, 0) " +
      "- inventory_penalty * max(q - demand, 0)",
    parameters: {
      service_level_value: unitPrice * 1.45,
      unit_price: unitPrice,
      shortage_penalty: unitPrice * 0.9,
      inventory_penalty: Math.max(1, unitPrice * 0.05),
    },
    outside_option: 0,
  };
  const supplier: NashParticipant = {
    id: "supplier",
    name: "Supplier",
    role: "supplier",
    utility_formula:
      "revenue_per_unit * q " +
      "- production_cost * q " +
      "- holding_cost * max(q - demand, 0) " +
      "- stockout_penalty * max(demand - q, 0) " +
      "- risk_premium * risk_score * q",
    parameters: {
      revenue_per_unit: unitPrice,
      production_cost: unitPrice * 0.63,
      holding_cost: Math.max(1, unitPrice * 0.04),
      stockout_penalty: Math.max(1, unitPrice * 0.08),
      risk_premium: Math.max(1, unitPrice * 0.1),
    },
    outside_option: 0,
  };
  return {
    id: `surface-${state.sessionId}`,
    title: "NegotiateSurface weighted-Nash round",
    n_periods: 1,
    currency: "USD",
    products: [{
      id: productId,
      name: "Negotiated capacity",
      demand_mean: demand,
      demand_std: Math.max(0, demand * 0.12),
      unit_value: unitPrice * 1.45,
    }],
    participants: [buyer, supplier],
    capacity: { [productId]: capacity },
    risk_score: 0,
    evidence_ids: [`session:${state.sessionId}`],
  };
}

export function latestSurfaceOfferFor(
  state: NegotiationSurfaceStateV2,
  role: NegotiationRole,
): Offer | null {
  for (let i = state.history.length - 1; i >= 0; i -= 1) {
    if (state.history[i].role === role) {
      return state.history[i].offer;
    }
  }
  return null;
}

export function isFunctionalMechanism(value: string): value is NegotiationMechanismId {
  return FUNCTIONAL_NEGOTIATION_MECHANISMS.some((mechanism) => mechanism.id === value);
}

export function privacyModeForMechanism(mechanismId: NegotiationMechanismId): NashInformationMode {
  return mechanismId === "weighted_nash_plaintext" ? "full_oracle" : "private";
}

function responseFromRun(
  state: NegotiationSurfaceStateV2,
  run: WeightedNashAlgorithmRun,
): NegotiationEngineResponse {
  const consensus = Math.max(0, Math.round(run.iterations.at(-1)?.consensus[0] ?? 0));
  const latestBuyer = latestSurfaceOfferFor(state, "buyer");
  const latestSupplier = latestSurfaceOfferFor(state, "supplier");
  const unitPrice = Math.round(averageDefined([latestBuyer?.unitPrice, latestSupplier?.unitPrice]) ?? 80);
  return {
    mechanism_id: state.mechanismId,
    privacy_mode: state.privacyMode,
    proposed_offer: {
      q: consensus,
      unitPrice,
      note: run.failure
        ? `No deal: ${run.failure.reason}`
        : `${state.mechanismId} suggests q=${consensus} with ${state.privacyMode} information.`,
    },
    consensus_quantity: consensus,
    convergence: run.convergence,
    global_utility: run.ledger.global_utility,
    final_residual: run.final_residual,
    leakage_report: run.leakage_report,
    participation: Object.entries(run.ledger.local).map(([party_id, utility]) => ({
      party_id,
      role: party_id === "buyer" ? "buyer" : "supplier",
      utility,
      outside_option: run.ledger.outside_options[party_id] ?? 0,
      no_worse_off: utility >= (run.ledger.outside_options[party_id] ?? 0),
    })),
    source_run: run,
  };
}

function compactSurfaceState(state: NegotiationSurfaceStateV2): NegotiationSurfaceStateV2 {
  return {
    ...state,
    history: state.history.slice(-MAX_HISTORY),
  };
}

function normalizeSurfaceState(state: NegotiationSurfaceStateV2): NegotiationSurfaceStateV2 {
  const mechanismId = isFunctionalMechanism(state.mechanismId)
    ? state.mechanismId
    : "weighted_nash_bounded";
  return {
    ...state,
    v: NEGOTIATION_CONTRACT_VERSION,
    mechanismId,
    privacyMode: privacyModeForMechanism(mechanismId),
    history: state.history.slice(-MAX_HISTORY),
  };
}

function validateSurfaceStateShape(value: Record<string, unknown>): DecodeSurfaceStateResult {
  if (typeof value.sessionId !== "string") {
    return { ok: false, reason: "sessionId missing" };
  }
  if (typeof value.mechanismId !== "string" || !isFunctionalMechanism(value.mechanismId)) {
    return { ok: false, reason: "unknown mechanism id" };
  }
  if (!Array.isArray(value.history)) {
    return { ok: false, reason: "history missing" };
  }
  if (value.history.length > MAX_HISTORY) {
    return { ok: false, reason: "history too large" };
  }
  if (!value.history.every(isRoundRecord)) {
    return { ok: false, reason: "invalid round history" };
  }
  if (typeof value.buyerAccepted !== "boolean" || typeof value.supplierAccepted !== "boolean") {
    return { ok: false, reason: "acceptance fields missing" };
  }
  return { ok: true, state: value as unknown as NegotiationSurfaceStateV2, translatedFromLegacy: false };
}

function isRoundRecord(value: unknown): value is RoundRecord {
  if (!isRecord(value)) {
    return false;
  }
  const offer = value.offer;
  return (
    (value.role === "buyer" || value.role === "supplier")
    && isRecord(offer)
    && typeof offer.q === "number"
    && Number.isFinite(offer.q)
    && typeof offer.unitPrice === "number"
    && Number.isFinite(offer.unitPrice)
    && typeof offer.note === "string"
    && typeof value.at === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function averageDefined(values: Array<number | undefined>): number | null {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (present.length === 0) {
    return null;
  }
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
