export const TRANSFER_METHODS = [
  "surplus-share",
  "marginal-externality",
  "two-part-tariff",
  "vcg-style",
] as const;

export type TransferMethod = (typeof TRANSFER_METHODS)[number];

export interface TransferPricingScenario {
  method: TransferMethod;
  units: number;
  vendorIncrementalCost: number;
  platformBenefit: number;
  networkCongestionCost: number;
  splitAlpha: number;
  capacityShadowPricePerUnit: number;
  serviceCreditPerUnit: number;
  timingPremiumPerUnit: number;
  congestionChargePerUnit: number;
  markdownRiskChargePerUnit: number;
}

export interface TransferComponent {
  id:
    | "capacity"
    | "service"
    | "timing"
    | "congestion"
    | "markdown"
    | "fixed-surplus";
  label: string;
  amount: number;
  note: string;
}

export interface TransferPricingResult {
  method: TransferMethod;
  welfareSurplus: number;
  acceptanceMin: number;
  acceptanceMax: number;
  feasible: boolean;
  selectedTransfer: number;
  unitTransfer: number;
  vendorNetGain: number;
  platformNetGain: number;
  budgetBalanced: boolean;
  components: TransferComponent[];
  explanation: string;
  guardrail: string;
}

export const DEFAULT_TRANSFER_SCENARIO: TransferPricingScenario = {
  method: "surplus-share",
  units: 1000,
  vendorIncrementalCost: 4000,
  platformBenefit: 11000,
  networkCongestionCost: 2000,
  splitAlpha: 0.5,
  capacityShadowPricePerUnit: 0.18,
  serviceCreditPerUnit: 0.11,
  timingPremiumPerUnit: 0.07,
  congestionChargePerUnit: 0.04,
  markdownRiskChargePerUnit: 0.03,
};

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number, fallback: number): number {
  return Math.max(0, finite(value, fallback));
}

function positive(value: number, fallback: number): number {
  return Math.max(1, finite(value, fallback));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function methodTransfer(
  method: TransferMethod,
  min: number,
  max: number,
  surplus: number,
  alpha: number,
): number {
  if (surplus <= 0 || max < min) return 0;
  if (method === "marginal-externality") {
    return min + surplus / 2;
  }
  if (method === "two-part-tariff") {
    return min + clamp(alpha, 0, 1) * surplus;
  }
  if (method === "vcg-style") {
    return max;
  }
  return min + clamp(alpha, 0, 1) * surplus;
}

function methodExplanation(method: TransferMethod): string {
  if (method === "marginal-externality") {
    return "Prices the operational move by the external benefit it creates, then splits the surplus inside the acceptance interval.";
  }
  if (method === "two-part-tariff") {
    return "Keeps the unit signal close to scarcity cost and uses a fixed credit to divide the remaining surplus.";
  }
  if (method === "vcg-style") {
    return "Uses the outside-party externality as the reference payment. It is clean in theory and harder to explain commercially.";
  }
  return "Compensates the harmed party for cost, then shares the remaining real surplus by policy.";
}

export function evaluateTransferPricing(
  scenario: Partial<TransferPricingScenario> = {},
): TransferPricingResult {
  const cfg: TransferPricingScenario = {
    ...DEFAULT_TRANSFER_SCENARIO,
    ...scenario,
  };
  const units = positive(cfg.units, DEFAULT_TRANSFER_SCENARIO.units);
  const vendorCost = nonNegative(
    cfg.vendorIncrementalCost,
    DEFAULT_TRANSFER_SCENARIO.vendorIncrementalCost,
  );
  const platformBenefit = nonNegative(
    cfg.platformBenefit,
    DEFAULT_TRANSFER_SCENARIO.platformBenefit,
  );
  const congestionCost = nonNegative(
    cfg.networkCongestionCost,
    DEFAULT_TRANSFER_SCENARIO.networkCongestionCost,
  );
  const splitAlpha = clamp(finite(cfg.splitAlpha, 0.5), 0, 1);
  const welfareSurplus = platformBenefit - vendorCost - congestionCost;
  const acceptanceMin = vendorCost;
  const acceptanceMax = Math.max(0, platformBenefit - congestionCost);
  const feasible = welfareSurplus > 0 && acceptanceMax >= acceptanceMin;
  const rawTransfer = methodTransfer(
    cfg.method,
    acceptanceMin,
    acceptanceMax,
    welfareSurplus,
    splitAlpha,
  );
  const selectedTransfer = feasible
    ? clamp(rawTransfer, acceptanceMin, acceptanceMax)
    : 0;

  const signalComponents: TransferComponent[] = [
    {
      id: "capacity",
      label: "capacity",
      amount: nonNegative(cfg.capacityShadowPricePerUnit, 0) * units,
      note: "Scarce node or lane capacity gets a positive shadow price.",
    },
    {
      id: "service",
      label: "service",
      amount: nonNegative(cfg.serviceCreditPerUnit, 0) * units,
      note: "Avoided stockout or service failure becomes a credit.",
    },
    {
      id: "timing",
      label: "timing",
      amount: nonNegative(cfg.timingPremiumPerUnit, 0) * units,
      note: "Earlier or more reliable arrival gets a timing premium.",
    },
    {
      id: "congestion",
      label: "congestion",
      amount: -nonNegative(cfg.congestionChargePerUnit, 0) * units,
      note: "Overloaded nodes charge the plan for operational disruption.",
    },
    {
      id: "markdown",
      label: "markdown risk",
      amount: -nonNegative(cfg.markdownRiskChargePerUnit, 0) * units,
      note: "Excess inventory risk reduces the operational credit.",
    },
  ];
  const unitSignal = signalComponents.reduce((sum, item) => sum + item.amount, 0);
  const fixedSurplus =
    cfg.method === "two-part-tariff" ? selectedTransfer - unitSignal : 0;
  const components =
    cfg.method === "two-part-tariff"
      ? [
          ...signalComponents,
          {
            id: "fixed-surplus" as const,
            label: "fixed surplus",
            amount: fixedSurplus,
            note: "Fixed credit keeps surplus sharing separate from marginal operating signals.",
          },
        ]
      : [
          {
            id: "fixed-surplus" as const,
            label: "settlement transfer",
            amount: selectedTransfer,
            note: "Single transfer chosen from the positive-surplus acceptance interval.",
          },
        ];

  const vendorNetGain = selectedTransfer - vendorCost;
  const platformNetGain = platformBenefit - congestionCost - selectedTransfer;
  const vendorTransfer = selectedTransfer;
  const platformTransfer = -selectedTransfer;
  const budgetBalanced = Math.abs(vendorTransfer + platformTransfer) < 0.01;
  const guardrail = feasible
    ? "Positive real surplus. Transfers may allocate the gain, but they do not create it."
    : "Do not use a transfer to make a negative-welfare plan look attractive.";

  return {
    method: cfg.method,
    welfareSurplus: round(welfareSurplus),
    acceptanceMin: round(acceptanceMin),
    acceptanceMax: round(acceptanceMax),
    feasible,
    selectedTransfer: round(selectedTransfer),
    unitTransfer: round(selectedTransfer / units),
    vendorNetGain: round(vendorNetGain),
    platformNetGain: round(platformNetGain),
    budgetBalanced,
    components: components.map((component) => ({
      ...component,
      amount: round(component.amount),
    })),
    explanation: methodExplanation(cfg.method),
    guardrail,
  };
}
