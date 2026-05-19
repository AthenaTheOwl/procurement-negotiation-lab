import type { Participant, SplitRule, TransferRow } from "./types";

export interface MultiPartyTransferInput {
  participants: Participant[];
  globalUtility: number;
  alpha?: number;
  splitRule?: SplitRule;
  baselineShare?: (participant: Participant, index: number, total: number) => number;
}

export interface MultiPartyTransferRow extends TransferRow {
  participantId: string;
  role: Participant["role"];
  share: number;
}

const DEFAULT_BUYER_SHARE = 0.5;

function defaultBaselineShare(participant: Participant, index: number, total: number): number {
  if (total <= 1) return 1;
  const buyers = total > 1 ? 1 : 0;
  if (participant.role === "buyer") {
    return DEFAULT_BUYER_SHARE;
  }
  const supplierLikeCount = total - buyers;
  if (supplierLikeCount <= 0) return 1 / total;
  return (1 - DEFAULT_BUYER_SHARE) / supplierLikeCount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function multiPartyTransferLedger(input: MultiPartyTransferInput): MultiPartyTransferRow[] {
  const { participants, globalUtility } = input;
  const alpha = clamp(input.alpha ?? 1, 0, 1);
  const rule: SplitRule = input.splitRule ?? "proportional";
  const baseline = input.baselineShare ?? defaultBaselineShare;
  const total = participants.length;
  const shares = participants.map((p, i) => baseline(p, i, total));
  const shareSum = shares.reduce((sum, s) => sum + s, 0) || 1;
  const normalizedShares = shares.map((s) => s / shareSum);
  const beforeTransfers = normalizedShares.map((share) => globalUtility * share);
  const totalOutside = participants.reduce((sum, p) => sum + (p.outsideOption ?? 0), 0);
  const surplus = globalUtility - totalOutside;
  const transfers = computeTransfers({
    participants,
    beforeTransfers,
    surplus,
    rule,
    alpha,
    globalUtility,
  });
  return participants.map((participant, idx) => {
    const transfer = transfers[idx];
    const after = beforeTransfers[idx] + transfer;
    return {
      participantId: participant.id,
      role: participant.role,
      party: participant.name,
      utilityBeforeTransfer: beforeTransfers[idx],
      outsideOption: participant.outsideOption ?? 0,
      transfer,
      utilityAfterTransfer: after,
      noWorseOff: after >= (participant.outsideOption ?? 0),
      share: normalizedShares[idx],
    };
  });
}

function computeTransfers(args: {
  participants: Participant[];
  beforeTransfers: number[];
  surplus: number;
  rule: SplitRule;
  alpha: number;
  globalUtility: number;
}): number[] {
  const { participants, beforeTransfers, surplus, rule, alpha, globalUtility } = args;
  if (surplus <= 0) {
    return participants.map(() => 0);
  }
  const buyerCount = participants.filter((p) => p.role === "buyer").length;
  if (rule === "equal") {
    return equalSplit(participants, alpha, surplus);
  }
  if (rule === "proportional") {
    return proportionalSplit(participants, beforeTransfers, alpha, surplus, buyerCount);
  }
  return shapleySplit(participants, alpha, globalUtility);
}

function equalSplit(participants: Participant[], alpha: number, surplus: number): number[] {
  if (participants.length === 0) return [];
  const buyers = participants.filter((p) => p.role === "buyer").length;
  const others = participants.length - buyers;
  const buyerTransfer = surplus > 0 ? -surplus * 0.12 * alpha : 0;
  const perOther = others > 0 ? (-buyerTransfer) / others : 0;
  return participants.map((p) => (p.role === "buyer" ? buyerTransfer : perOther));
}

function proportionalSplit(
  participants: Participant[],
  beforeTransfers: number[],
  alpha: number,
  surplus: number,
  buyerCount: number,
): number[] {
  const transferPool = surplus * 0.12 * alpha;
  const buyerSlice = transferPool * 0.5;
  const buyerSliceTotal = buyerCount > 0 ? -buyerSlice : 0;
  const buyerSlicePerBuyer = buyerCount > 0 ? buyerSliceTotal / buyerCount : 0;
  const deficits = participants.map((p, i) => {
    const before = beforeTransfers[i];
    const outside = p.outsideOption ?? 0;
    return Math.max(0, outside - before);
  });
  const deficitTotal = deficits.reduce((sum, d) => sum + d, 0);
  const otherPoolReceived = transferPool + Math.abs(buyerSliceTotal);
  return participants.map((p, i) => {
    if (p.role === "buyer") {
      return buyerSlicePerBuyer;
    }
    if (deficitTotal > 0) {
      return otherPoolReceived * (deficits[i] / deficitTotal);
    }
    const others = participants.length - buyerCount;
    return others > 0 ? otherPoolReceived / others : 0;
  });
}

function shapleySplit(
  participants: Participant[],
  alpha: number,
  globalUtility: number,
): number[] {
  if (participants.length > 6) {
    // Shapley is O(2^n); for safety fall back to proportional behavior
    return participants.map(() => 0);
  }
  const v = (subset: number[]): number => coalitionValue(subset, participants, globalUtility);
  const phi = shapleyValues(participants.length, v);
  const totalOutside = participants.reduce((sum, p) => sum + (p.outsideOption ?? 0), 0);
  const surplus = Math.max(0, globalUtility - totalOutside);
  const transferPool = surplus * 0.12 * alpha;
  // each participant's share of pool is phi / sum(phi); buyer's transfer is negative
  const phiSum = phi.reduce((sum, value) => sum + value, 0) || 1;
  const shares = phi.map((value) => value / phiSum);
  return participants.map((p, i) => {
    if (p.role === "buyer") {
      return -transferPool * shares[i];
    }
    return transferPool * shares[i];
  });
}

function coalitionValue(
  subset: number[],
  participants: Participant[],
  globalUtility: number,
): number {
  if (subset.length === 0) return 0;
  const hasBuyer = subset.some((idx) => participants[idx].role === "buyer");
  const hasSupplyLike = subset.some((idx) =>
    ["supplier", "packager", "logistics", "distributor"].includes(participants[idx].role),
  );
  if (!hasBuyer || !hasSupplyLike) {
    // Coalition cannot transact: it gets only the sum of outside options
    return subset.reduce((sum, idx) => sum + (participants[idx].outsideOption ?? 0), 0);
  }
  const fraction = subset.length / participants.length;
  return globalUtility * fraction;
}

export function shapleyValues(n: number, value: (subset: number[]) => number): number[] {
  const result = new Array<number>(n).fill(0);
  const factorial = (k: number): number => {
    let acc = 1;
    for (let i = 2; i <= k; i += 1) acc *= i;
    return acc;
  };
  const nFact = factorial(n);
  for (let i = 0; i < n; i += 1) {
    let phi = 0;
    const others: number[] = [];
    for (let j = 0; j < n; j += 1) {
      if (j !== i) others.push(j);
    }
    const totalSubsets = 1 << others.length;
    for (let mask = 0; mask < totalSubsets; mask += 1) {
      const subset: number[] = [];
      for (let bit = 0; bit < others.length; bit += 1) {
        if (mask & (1 << bit)) subset.push(others[bit]);
      }
      const withI = subset.concat([i]);
      const marginal = value(withI) - value(subset);
      const s = subset.length;
      const weight = (factorial(s) * factorial(n - s - 1)) / nFact;
      phi += weight * marginal;
    }
    result[i] = phi;
  }
  return result;
}
