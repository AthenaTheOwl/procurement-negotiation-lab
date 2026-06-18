import { describe, expect, it } from "vitest";
import {
  NASH_QUANTIZATION_LEVELS,
  PROTOCOL_VERSION,
  WEIGHTED_NASH_PARAMS,
  computeNashProduct,
  computeSha256,
  declaredExposureBitBound,
  declaredEpsilonBound,
  runTranscriptExposureProtocol,
  plaintextArgmax,
  runWeightedNashBounded,
  runWeightedNashPlaintext,
  type NashParticipant,
  type NashProduct,
  type NashScenario,
} from "./weightedNash";

const buyer: NashParticipant = {
  id: "buyer-northstar",
  name: "Northstar Substrates",
  role: "buyer",
  utility_formula:
    "service_level_value * min(q, demand) " +
    "- unit_price * q " +
    "- shortage_penalty * max(demand - q, 0) " +
    "- inventory_penalty * max(q - demand, 0)",
  parameters: {
    service_level_value: 100.0,
    unit_price: 50.0,
    shortage_penalty: 80.0,
    inventory_penalty: 5.0,
  },
  outside_option: 0.0,
};

const supplier: NashParticipant = {
  id: "supplier-cinder",
  name: "Cinder Lithography Services",
  role: "supplier",
  utility_formula:
    "revenue_per_unit * q " +
    "- production_cost * q " +
    "- holding_cost * max(q - demand, 0) " +
    "- stockout_penalty * max(demand - q, 0) " +
    "- risk_premium * risk_score * q",
  parameters: {
    revenue_per_unit: 50.0,
    production_cost: 30.0,
    holding_cost: 3.0,
    stockout_penalty: 6.0,
    risk_premium: 8.0,
  },
  outside_option: 0.0,
};

const product: NashProduct = {
  id: "ai-substrate-A",
  name: "AI accelerator substrate, generation A",
  demand_mean: 500.0,
  demand_std: 80.0,
  unit_value: 100.0,
};

function baseScenario(overrides: Partial<NashScenario> = {}): NashScenario {
  return {
    id: "substrate-crunch-base",
    title: "The Substrate Crunch - base case",
    n_periods: 1,
    currency: "USD",
    products: [product],
    participants: [buyer, supplier],
    capacity: { [product.id]: 800.0 },
    risk_score: 0.0,
    evidence_ids: [],
    ...overrides,
  };
}

describe("weighted-Nash TS mirror", () => {
  it("reads the DEC-NASH parameter mirror", () => {
    expect(NASH_QUANTIZATION_LEVELS).toBe(64);
    expect(WEIGHTED_NASH_PARAMS.step_quantization_levels).toBe(32);
    expect(PROTOCOL_VERSION).toBe("transcript-exposure/v1");
  });

  it("computes known SHA-256 vectors without Node crypto", () => {
    expect(computeSha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(computeSha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("matches the Python plaintext allocation on the canonical scenario", () => {
    const run = runWeightedNashPlaintext(baseScenario());
    expect(run.algorithm).toBe("weighted_nash_plaintext");
    expect(run.convergence).toBe("converged");
    expect(run.failure).toBeNull();
    expect(run.iterations[0].consensus[0]).toBeCloseTo(507.93650793650795, 9);
    expect(run.ledger.global_utility).toBeCloseTo(34698.41269841269, 8);
    expect(run.ledger.local["buyer-northstar"]).toBeCloseTo(24563.49206349206, 8);
    expect(run.ledger.local["supplier-cinder"]).toBeCloseTo(10134.920634920636, 8);
  });

  it("uses the same grid-search tie behavior as Python", () => {
    const solution = plaintextArgmax(baseScenario());
    expect(solution.feasible).toBe(true);
    expect(solution.allocation).toEqual([507.93650793650795]);
    expect(computeNashProduct(baseScenario(), solution.allocation)).toBeGreaterThan(0);
  });

  it("matches the Python transcript-exposure transcript on the canonical scenario", () => {
    const run = runWeightedNashBounded(baseScenario(), { runId: "run-wnash-ts-test" });
    expect(run.algorithm).toBe("weighted_nash_bounded");
    expect(run.convergence).toBe("converged");
    expect(run.failure).toBeNull();
    expect(run.leakage_report).not.toBeNull();
    expect(run.iterations[0].consensus[0]).toBeCloseTo(511.3782820150469, 9);
    expect(run.ledger.global_utility).toBeCloseTo(34567.62528342822, 8);
    expect(run.leakage_report?.round_count).toBe(5);
    expect(run.leakage_report?.aggregate.max_epsilon_measured).toBeCloseTo(32.92481250360578, 12);
    expect(run.leakage_report?.per_party.map((party) => party.message_log_hash)).toEqual([
      "9a9757b2d776ac6d5808733f34b3c4ade6505ff57e0cdec593435969c08b5196",
      "cf5c2a33ace736abfdd4289a1ff1f80075504ac3935dee51e9004ad9d47cff56",
    ]);
  });

  it("falls back to plaintext when disclosure-limiting mode is called outside private mode", () => {
    const run = runWeightedNashBounded(baseScenario(), { informationMode: "full_oracle" });
    expect(run.algorithm).toBe("weighted_nash_bounded");
    expect(run.leakage_report).toBeNull();
    expect(run.iterations[0].consensus[0]).toBeCloseTo(507.93650793650795, 9);
  });

  it("reports structured failure for N>=3 until the W4 lift lands", () => {
    const third: NashParticipant = {
      ...buyer,
      id: "extra-buyer",
      name: "Extra Buyer",
    };
    const run = runWeightedNashBounded(baseScenario({ participants: [buyer, supplier, third] }));
    expect(run.convergence).toBe("no_deal");
    expect(run.failure?.reason).toBe("no_feasible_allocation");
    expect(run.failure?.note).toContain("N>=3");
  });

  it("keeps the exposure-bit bound formula in sync with Python", () => {
    expect(declaredExposureBitBound(5, 1)).toBeCloseTo(32.92481250360578, 12);
    expect(declaredEpsilonBound(5, 1)).toBeCloseTo(32.92481250360578, 12);
  });

  it("keeps the old protocol helper as a compatibility alias", () => {
    const direct = runTranscriptExposureProtocol(baseScenario(), {
      weights: { "buyer-northstar": 1, "supplier-cinder": 1 },
      initialAllocation: [400],
      upperBound: 800,
      runId: "run-wnash-ts-alias",
    });
    expect(direct.leakage_report.protocol_version).toBe(PROTOCOL_VERSION);
  });
});
