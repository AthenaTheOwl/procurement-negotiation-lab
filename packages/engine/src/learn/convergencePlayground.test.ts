import { describe, expect, it } from "vitest";
import {
  CONVERGENCE_GUIDES,
  CONVERGENCE_METHODS,
  simulateConvergence,
} from "./convergencePlayground";

describe("convergencePlayground", () => {
  it("ships stable interactive methods", () => {
    expect(CONVERGENCE_METHODS).toEqual([
      "consensus-admm",
      "damped-averaging",
      "price-tatonnement",
      "lagrangian",
    ]);
  });

  it("maps the non-ADMM convergence alternatives called out by the lab", () => {
    const ids = CONVERGENCE_GUIDES.map((guide) => guide.id);
    expect(ids).toContain("progressive-hedging");
    expect(ids).toContain("gossip");
    expect(ids).toContain("federated-averaging");
    expect(ids).toContain("projection");
    expect(ids).toContain("no-regret");
    expect(ids).toContain("bayesian");
    expect(ids).toContain("contract-menu");
  });

  it("ADMM returns rounds, residuals, and a one-shot fallback menu", () => {
    const result = simulateConvergence(undefined, {
      method: "consensus-admm",
      maxRounds: 5,
    });
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.finalResidual).toBeGreaterThanOrEqual(0);
    expect(result.messagesShared).toContain("x_i + u_i");
    expect(result.privacyNote).toMatch(/Raw costs and constraints stay local/);
    expect(result.fallbackMenu.map((option) => option.id)).toEqual([
      "fast-flexible",
      "balanced",
      "lean-firm",
    ]);
  });

  it("damped averaging moves the shared target toward vendor proposals", () => {
    const result = simulateConvergence(undefined, {
      method: "damped-averaging",
      initialTarget: 300,
      alpha: 0.5,
      maxRounds: 2,
    });
    expect(result.rounds[0].consensus).toBeGreaterThan(300);
  });

  it("price tatonnement raises price when total supply is short", () => {
    const result = simulateConvergence(undefined, {
      method: "price-tatonnement",
      initialPrice: 8,
      targetDemand: 2400,
      eta: 0.01,
      maxRounds: 3,
    });
    expect(result.finalPrice).toBeGreaterThan(8);
    expect(result.rounds[0].demandGap).toBeGreaterThan(0);
  });

  it("lagrangian updates expose the shared constraint gap without raw costs", () => {
    const result = simulateConvergence(undefined, {
      method: "lagrangian",
      targetDemand: 1800,
      maxRounds: 3,
    });
    expect(result.messagesShared).toContain("shadow price lambda");
    expect(result.rounds.some((round) => Math.abs(round.lambda) > 0)).toBe(true);
  });
});
