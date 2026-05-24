# decoy demand library

The lab's Audit Mode uses deterministic decoy scenarios to catch strategy
patterns that a clean VCG story can hide. These are teaching probes, not
production fraud models.

## Why decoys exist

The guided arc teaches that CPP + VCG can compute an efficient plan with less
direct disclosure than a centralized oracle. The operational problem runs
deeper: what do you do when a vendor's response pattern looks strategic,
inconsistent, or too convenient?

Decoys are small known-answer cases. A configured agent is run against each
case and the app reports whether the behavior matches the expected pattern.
The goal is not to accuse an agent. The goal is to make pilot governance
visible.

## Decoys

| Decoy | Expected pattern | Catches |
|---|---|---|
| cheap-routing-known | CPP + VCG should beat price-only when routing economics matter. | FC-bias or routing-cost misreporting |
| fragile-supplier-known | Effective supplier capacity should fall below stated capacity. | Reliability-prior bypass attempts |
| repeated high-quote pattern | Low truthfulness plus high privacy should create a warning pattern. | Coordinated quote shading or collusive price posture |
| missing-capacity-pattern | Effective supplier capacity should be lower than expected demand. | Capacity overpromise |
| reliability-mismatch | Long lead time and high volatility should not carry a perfect reliability assumption. | Inconsistent self-reported reliability |

## Reading the result

`match` means the configured agent behaved in the expected direction for that
decoy. `mismatch` means the agent response deserves inspection. A mismatch can
be benign; the app deliberately avoids turning decoys into accusations.

## Boundary

All decoy data is synthetic and deterministic. No public procurement data, real
vendor data, or Amazon internal data is used.
