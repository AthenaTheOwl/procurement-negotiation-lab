# formula language

Arena formulas are math expressions over numeric variables. They are not Python
programs.

Allowed:

- arithmetic: `+`, `-`, `*`, `/`, `%`, `**`
- comparisons and ternaries: `a if condition else b`
- boolean `and` / `or`
- functions: `abs`, `min`, `max`, `sqrt`, `log`, `exp`, `floor`, `ceil`, `clamp`

Rejected:

- imports
- attributes
- indexing
- lambdas
- comprehensions
- assignments
- function definitions
- arbitrary Python execution

Useful variables:

- `quantity`
- `demand`
- `price`
- `unit_value`
- `unit_cost`
- `capacity`
- `risk_score`
- `shortage_penalty`
- `holding_cost`
- `cancellation_penalty`
- `risk_penalty`
- `lead_time_weeks`
- `uncertainty`

Example buyer utility:

```text
unit_value * min(quantity, demand)
- price * quantity
- shortage_penalty * max(demand - quantity, 0)
- holding_cost * max(quantity - demand, 0)
- risk_penalty * risk_score * quantity
```
