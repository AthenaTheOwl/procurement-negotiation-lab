import params from "../weighted_nash_params.json";
import { compileFormula } from "./formula";

export type NashRole =
  | "buyer"
  | "supplier"
  | "packager"
  | "logistics"
  | "distributor"
  | "custom";

export type NashConvergence =
  | "converged"
  | "oscillating"
  | "not_converged"
  | "no_deal";

export type NashInformationMode =
  | "private"
  | "risk_only"
  | "capacity_band"
  | "cost_band"
  | "forecast_band"
  | "full_oracle";

export type MechanismFailureReason =
  | "no_feasible_allocation"
  | "batna_floor_unreachable"
  | "capacity_exceeded"
  | "dealbreaker_conflict"
  | "private_mode_unsupported";

export interface NashProduct {
  id: string;
  name: string;
  demand_mean: number;
  demand_std: number;
  unit_value: number;
}

export interface NashParticipant {
  id: string;
  name: string;
  role: NashRole;
  utility_formula: string;
  parameters: Record<string, number>;
  outside_option: number;
}

export interface NashScenario {
  id: string;
  title: string;
  n_periods: number;
  currency?: "USD";
  products: NashProduct[];
  participants: NashParticipant[];
  capacity: Record<string, number>;
  risk_score: number;
  evidence_ids?: string[];
}

export interface IterationRecord {
  iteration: number;
  quantities: Record<string, number[]>;
  consensus: number[];
  residual: number;
  price_signal: number;
}

export interface UtilityLedger {
  local: Record<string, number>;
  outside_options: Record<string, number>;
  global_utility: number;
  feasible: boolean;
}

export interface MechanismFailure {
  reason: MechanismFailureReason;
  note: string;
}

export interface PartyLeakage {
  party_id: string;
  epsilon_bound: number;
  epsilon_measured: number;
  round_count: number;
  message_log_hash: string;
  sufficiency_note: string;
}

export interface AggregateLeakage {
  max_epsilon_measured: number;
  max_epsilon_bound: number;
  all_within_bound: boolean;
}

export interface LeakageReport {
  protocol_version: string;
  run_id: string;
  seed: number;
  round_count: number;
  per_party: PartyLeakage[];
  aggregate: AggregateLeakage;
}

export interface WeightedNashAlgorithmRun {
  scenario_id: string;
  algorithm: string;
  information_mode: NashInformationMode;
  convergence: NashConvergence;
  iterations: IterationRecord[];
  ledger: UtilityLedger;
  transfer: null;
  runtime_ms: number;
  final_residual: number;
  utility_gap_vs_oracle: number | null;
  leakage_report: LeakageReport | null;
  failure: MechanismFailure | null;
}

export interface WeightedNashSolution {
  allocation: number[];
  nash_product: number;
  feasible: boolean;
  reason?: MechanismFailureReason;
}

export interface ProtocolMessage {
  round_seq: number;
  party_id: string;
  direction: number[];
  step_proposal: number;
  protocol_version: string;
}

export interface ProtocolOutcome {
  final_allocation: number[];
  rounds_used: number;
  converged: boolean;
  leakage_report: LeakageReport;
  final_residual: number;
}

export const WEIGHTED_NASH_PARAMS = params;
export const NASH_QUANTIZATION_LEVELS = params.nash_quantization_levels;
export const TIE_BREAK_TOLERANCE = params.tie_break_tolerance;
export const PLAINTEXT_NUMERICAL_TOLERANCE = params.plaintext_numerical_tolerance;
export const PROTOCOL_NUMERICAL_TOLERANCE = params.protocol_numerical_tolerance;
export const PROTOCOL_VERSION = params.protocol_version;
export const LEAKAGE_SUFFICIENCY_NOTE = params.leakage_sufficiency_note;

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export function computeSha256(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const paddedLength = (((bytes.length + 9 + 63) >> 6) << 6);
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high);
  view.setUint32(paddedLength - 4, low);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, "0")).join("");
}

export function evaluateParticipantUtility(
  participant: NashParticipant,
  scenario: NashScenario,
  quantityVector: number[],
): number {
  if (quantityVector.length !== scenario.n_periods) {
    throw new Error(`quantityVector length ${quantityVector.length} != n_periods ${scenario.n_periods}`);
  }

  const product = scenario.products[0];
  if (!product) {
    throw new Error("scenario must include at least one product");
  }
  const baseNamespace: Record<string, number> = {
    demand: product.demand_mean,
    demand_mean: product.demand_mean,
    demand_std: product.demand_std,
    unit_value: product.unit_value,
    risk_score: scenario.risk_score,
    capacity: scenario.capacity[product.id] ?? Number.MAX_SAFE_INTEGER,
    n_periods: scenario.n_periods,
    ...participant.parameters,
  };
  const compiled = compileFormula(participant.utility_formula);

  if (scenario.n_periods === 1) {
    return compiled.evaluate({ ...baseNamespace, q: quantityVector[0] });
  }

  let total = 0;
  for (let t = 0; t < scenario.n_periods; t += 1) {
    total += compiled.evaluate({ ...baseNamespace, q: quantityVector[t], t });
  }
  return total;
}

export function buildWeightedNashLedger(
  scenario: NashScenario,
  quantities: Record<string, number[]>,
): UtilityLedger {
  const local: Record<string, number> = {};
  const outside_options: Record<string, number> = {};
  let feasible = true;

  for (const participant of scenario.participants) {
    const qVec = quantities[participant.id];
    if (!qVec) {
      throw new Error(`missing quantity for participant ${participant.id}`);
    }
    local[participant.id] = evaluateParticipantUtility(participant, scenario, qVec);
    outside_options[participant.id] = participant.outside_option;
  }

  const product = scenario.products[0];
  const cap = product ? scenario.capacity[product.id] ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
  for (const participant of scenario.participants) {
    if (participant.role === "supplier") {
      const qVec = quantities[participant.id] ?? [];
      if (qVec.some((q) => q > cap + 1e-6)) {
        feasible = false;
        break;
      }
    }
  }

  const global_utility = Object.values(local).reduce((sum, value) => sum + value, 0);
  return { local, outside_options, global_utility, feasible };
}

export function computeNashProduct(
  scenario: NashScenario,
  allocation: number[],
  weights: Record<string, number> = defaultWeights(scenario),
): number {
  let product = 1.0;
  for (const party of scenario.participants) {
    const utility = evaluateParticipantUtility(party, scenario, allocation);
    const gain = Math.max(0, utility - party.outside_option);
    const alpha = weights[party.id] ?? 1.0;
    if (gain === 0 && alpha > 0) {
      return 0;
    }
    product *= gain ** alpha;
  }
  return product;
}

export function plaintextArgmax(
  scenario: NashScenario,
  options: { weights?: Record<string, number>; upperBound?: number } = {},
): WeightedNashSolution {
  const weights = options.weights ?? defaultWeights(scenario);
  const upperBound = options.upperBound ?? upperBoundForScenario(scenario);
  if (scenario.n_periods !== 1) {
    return { allocation: [0], nash_product: 0, feasible: false, reason: "no_feasible_allocation" };
  }
  if (upperBound <= 0) {
    return { allocation: [0], nash_product: 0, feasible: false, reason: "capacity_exceeded" };
  }

  const grid = Array.from({ length: NASH_QUANTIZATION_LEVELS }, (_, i) => (
    upperBound * i / (NASH_QUANTIZATION_LEVELS - 1)
  ));

  let bestProduct = -1;
  let bestAllocation: number[] | null = null;
  let anyFeasible = false;
  for (const q of grid) {
    const allocation = [q];
    const nashProduct = computeNashProduct(scenario, allocation, weights);
    if (nashProduct > 0) {
      anyFeasible = true;
    }
    if (nashProduct > bestProduct + TIE_BREAK_TOLERANCE) {
      bestProduct = nashProduct;
      bestAllocation = allocation;
    }
  }

  if (!anyFeasible || !bestAllocation) {
    return {
      allocation: [grid[0] ?? 0],
      nash_product: 0,
      feasible: false,
      reason: "batna_floor_unreachable",
    };
  }

  return { allocation: bestAllocation, nash_product: bestProduct, feasible: true };
}

export function runWeightedNashPlaintext(
  scenario: NashScenario,
  options: {
    informationMode?: NashInformationMode;
    maxIter?: number;
    tolerance?: number;
  } = {},
): WeightedNashAlgorithmRun {
  const started = performanceNow();
  const informationMode = options.informationMode ?? "full_oracle";

  if (scenario.n_periods !== 1) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.plaintext,
      informationMode,
      reason: "no_feasible_allocation",
      note: "weighted_nash v1 supports n_periods=1 only",
      runtimeMs: elapsedMs(started),
    });
  }
  if (scenario.participants.length > 2) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.plaintext,
      informationMode,
      reason: "no_feasible_allocation",
      note: "weighted_nash v1 supports 2 participants only; N>=3 lands in W4",
      runtimeMs: elapsedMs(started),
    });
  }

  const solution = plaintextArgmax(scenario);
  const runtimeMs = elapsedMs(started);
  if (!solution.feasible) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.plaintext,
      informationMode,
      reason: solution.reason ?? "no_feasible_allocation",
      note: "no allocation puts every party above their BATNA",
      runtimeMs,
    });
  }

  const quantities = Object.fromEntries(
    scenario.participants.map((p) => [p.id, [...solution.allocation]]),
  );
  const ledger = buildWeightedNashLedger(scenario, quantities);
  return {
    scenario_id: scenario.id,
    algorithm: params.mechanism_identifiers.plaintext,
    information_mode: informationMode,
    convergence: "converged",
    iterations: [{
      iteration: 0,
      quantities,
      consensus: [...solution.allocation],
      residual: 0,
      price_signal: 0,
    }],
    ledger,
    transfer: null,
    runtime_ms: runtimeMs,
    final_residual: 0,
    utility_gap_vs_oracle: null,
    leakage_report: null,
    failure: null,
  };
}

export function runWeightedNashBounded(
  scenario: NashScenario,
  options: {
    informationMode?: NashInformationMode;
    maxIter?: number;
    tolerance?: number;
    runId?: string;
  } = {},
): WeightedNashAlgorithmRun {
  const started = performanceNow();
  const informationMode = options.informationMode ?? "private";

  if (scenario.n_periods !== 1) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.bounded_leakage,
      informationMode,
      reason: "no_feasible_allocation",
      note: "weighted_nash_bounded v1 supports n_periods=1 only",
      runtimeMs: elapsedMs(started),
    });
  }
  if (scenario.participants.length > 2) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.bounded_leakage,
      informationMode,
      reason: "no_feasible_allocation",
      note: "weighted_nash_bounded v1 supports 2 participants only; N>=3 lands in W4",
      runtimeMs: elapsedMs(started),
    });
  }
  if (informationMode !== "private") {
    const run = runWeightedNashPlaintext(scenario, { informationMode });
    return { ...run, algorithm: params.mechanism_identifiers.bounded_leakage };
  }

  const upperBound = upperBoundForScenario(scenario);
  const outcome = runBoundedLeakageProtocol(scenario, {
    weights: defaultWeights(scenario),
    initialAllocation: [upperBound / 2],
    upperBound,
    runId: options.runId ?? "run-wnash-ts",
  });
  const quantities = Object.fromEntries(
    scenario.participants.map((p) => [p.id, [...outcome.final_allocation]]),
  );
  const ledger = buildWeightedNashLedger(scenario, quantities);
  const anyBelowBatna = scenario.participants.some(
    (p) => ledger.local[p.id] < p.outside_option - 1e-6,
  );
  const runtimeMs = elapsedMs(started);

  if (anyBelowBatna) {
    return failureRun(scenario, {
      name: params.mechanism_identifiers.bounded_leakage,
      informationMode,
      reason: "batna_floor_unreachable",
      note: "bounded-leakage protocol converged but at least one party falls below outside_option in the final allocation",
      runtimeMs,
      leakageReport: outcome.leakage_report,
    });
  }

  return {
    scenario_id: scenario.id,
    algorithm: params.mechanism_identifiers.bounded_leakage,
    information_mode: informationMode,
    convergence: outcome.converged ? "converged" : "not_converged",
    iterations: [{
      iteration: outcome.rounds_used,
      quantities,
      consensus: [...outcome.final_allocation],
      residual: outcome.final_residual,
      price_signal: 0,
    }],
    ledger,
    transfer: null,
    runtime_ms: runtimeMs,
    final_residual: outcome.final_residual,
    utility_gap_vs_oracle: null,
    leakage_report: outcome.leakage_report,
    failure: null,
  };
}

export function runBoundedLeakageProtocol(
  scenario: NashScenario,
  args: {
    weights: Record<string, number>;
    initialAllocation: number[];
    upperBound: number;
    runId: string;
    seed?: number;
  },
): ProtocolOutcome {
  const seed = args.seed ?? 0;
  const nCoords = args.initialAllocation.length;
  let candidate = [...args.initialAllocation];
  const perPartyLogs = Object.fromEntries(
    scenario.participants.map((p) => [p.id, [] as ProtocolMessage[]]),
  );
  let converged = false;
  let roundsUsed = 0;
  let finalResidual = 0;

  for (let roundSeq = 0; roundSeq < params.max_rounds; roundSeq += 1) {
    roundsUsed = roundSeq + 1;
    const messages = scenario.participants.map((participant) => {
      const message: ProtocolMessage = {
        round_seq: roundSeq,
        party_id: participant.id,
        direction: partyGradientDirection(participant, scenario, candidate),
        step_proposal: partyStepProposal(roundSeq, args.upperBound),
        protocol_version: PROTOCOL_VERSION,
      };
      perPartyLogs[participant.id]?.push(message);
      return message;
    });

    if (messages.every((message) => message.direction.every((d) => d === 0))) {
      converged = true;
      finalResidual = 0;
      break;
    }

    const nextCandidate = aggregateNextCandidate(messages, candidate, args.weights, args.upperBound);
    finalResidual = Math.sqrt(
      nextCandidate.reduce((sum, q, index) => sum + (q - candidate[index]) ** 2, 0),
    );
    candidate = nextCandidate;
    if (finalResidual < params.convergence_tolerance) {
      converged = true;
      break;
    }
  }

  const epsilonBound = declaredEpsilonBound(roundsUsed, nCoords);
  const perParty: PartyLeakage[] = scenario.participants.map((participant) => {
    const log = perPartyLogs[participant.id] ?? [];
    const canonical = `[${log.map(protocolMessageCanonicalJson).join(",")}]`;
    return {
      party_id: participant.id,
      epsilon_bound: epsilonBound,
      epsilon_measured: epsilonBound,
      round_count: roundsUsed,
      message_log_hash: computeSha256(canonical),
      sufficiency_note: LEAKAGE_SUFFICIENCY_NOTE,
    };
  });
  const maxEpsilonMeasured = Math.max(...perParty.map((p) => p.epsilon_measured));
  const maxEpsilonBound = Math.max(...perParty.map((p) => p.epsilon_bound));
  return {
    final_allocation: candidate,
    rounds_used: roundsUsed,
    converged,
    final_residual: finalResidual,
    leakage_report: {
      protocol_version: PROTOCOL_VERSION,
      run_id: args.runId,
      seed,
      round_count: roundsUsed,
      per_party: perParty,
      aggregate: {
        max_epsilon_measured: maxEpsilonMeasured,
        max_epsilon_bound: maxEpsilonBound,
        all_within_bound: perParty.every((p) => p.epsilon_measured <= p.epsilon_bound),
      },
    },
  };
}

export function stepSize(roundSeq: number, upperBound: number): number {
  return (
    params.step_eta_0
    * params.step_scale_fraction
    * upperBound
    / (1 + roundSeq) ** params.step_beta
  );
}

export function quantizeStep(raw: number, etaMax: number): number {
  if (etaMax <= 0) {
    return 0;
  }
  const clipped = Math.max(-etaMax, Math.min(etaMax, raw));
  const nIntervals = params.step_quantization_levels - 1;
  const binIndex = Math.round((clipped + etaMax) / (2 * etaMax) * nIntervals);
  return (binIndex / nIntervals) * 2 * etaMax - etaMax;
}

export function declaredEpsilonBound(roundCount: number, nCoords: number): number {
  return roundCount * (nCoords * Math.log2(3) + Math.log2(params.step_quantization_levels));
}

export function partyGradientDirection(
  participant: NashParticipant,
  scenario: NashScenario,
  candidate: number[],
  epsilonForFiniteDiff = 1.0,
): number[] {
  return candidate.map((_, index) => {
    const plus = [...candidate];
    const minus = [...candidate];
    plus[index] = Math.max(0, plus[index] + epsilonForFiniteDiff);
    minus[index] = Math.max(0, minus[index] - epsilonForFiniteDiff);
    const diff = (
      evaluateParticipantUtility(participant, scenario, plus)
      - evaluateParticipantUtility(participant, scenario, minus)
    );
    if (diff > params.convergence_tolerance) {
      return 1;
    }
    if (diff < -params.convergence_tolerance) {
      return -1;
    }
    return 0;
  });
}

function partyStepProposal(roundSeq: number, upperBound: number): number {
  const eta = stepSize(roundSeq, upperBound);
  return quantizeStep(eta, eta);
}

function aggregateNextCandidate(
  messages: ProtocolMessage[],
  candidate: number[],
  weights: Record<string, number>,
  upperBound: number,
): number[] {
  const delta = Array.from({ length: candidate.length }, () => 0);
  for (const message of messages) {
    const weight = weights[message.party_id] ?? 1.0;
    for (let i = 0; i < candidate.length; i += 1) {
      delta[i] += weight * message.direction[i] * message.step_proposal;
    }
  }
  return candidate.map((q, index) => Math.max(0, Math.min(upperBound, q + delta[index])));
}

function protocolMessageCanonicalJson(message: ProtocolMessage): string {
  const direction = `[${message.direction.map((d) => String(d)).join(",")}]`;
  return (
    "{"
    + `"direction":${direction},`
    + `"party_id":${JSON.stringify(message.party_id)},`
    + `"protocol_version":${JSON.stringify(message.protocol_version)},`
    + `"round_seq":${message.round_seq},`
    + `"step_proposal":${pythonFloatJson(message.step_proposal)}`
    + "}"
  );
}

function pythonFloatJson(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("cannot canonicalize non-finite float");
  }
  if (Number.isInteger(value)) {
    return value.toFixed(1);
  }
  return JSON.stringify(value);
}

function defaultWeights(scenario: NashScenario): Record<string, number> {
  return Object.fromEntries(scenario.participants.map((participant) => [participant.id, 1.0]));
}

function upperBoundForScenario(scenario: NashScenario): number {
  const product = scenario.products[0];
  if (!product) {
    return 0;
  }
  const cap = scenario.capacity[product.id] ?? product.demand_mean * 2.0;
  return Math.max(cap, product.demand_mean * 1.5);
}

function failureRun(
  scenario: NashScenario,
  args: {
    name: string;
    informationMode: NashInformationMode;
    reason: MechanismFailureReason;
    note: string;
    runtimeMs: number;
    leakageReport?: LeakageReport | null;
  },
): WeightedNashAlgorithmRun {
  const zeroQuantities = Object.fromEntries(
    scenario.participants.map((p) => [p.id, Array.from({ length: scenario.n_periods }, () => 0)]),
  );
  return {
    scenario_id: scenario.id,
    algorithm: args.name,
    information_mode: args.informationMode,
    convergence: "no_deal",
    iterations: [{
      iteration: 0,
      quantities: zeroQuantities,
      consensus: Array.from({ length: scenario.n_periods }, () => 0),
      residual: 0,
      price_signal: 0,
    }],
    ledger: buildWeightedNashLedger(scenario, zeroQuantities),
    transfer: null,
    runtime_ms: args.runtimeMs,
    final_residual: 0,
    utility_gap_vs_oracle: null,
    leakage_report: args.leakageReport ?? null,
    failure: { reason: args.reason, note: args.note },
  };
}

function performanceNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function elapsedMs(started: number): number {
  return Math.max(0, performanceNow() - started);
}

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}
