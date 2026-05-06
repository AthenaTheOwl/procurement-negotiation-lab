# tutorial

## objective functions

The buyer and supplier each optimize local utility in dollars. The buyer values
fulfilled demand and pays for quantity, shortages, holding, and risk. The
supplier earns revenue and pays unit cost, cancellation exposure, capacity
overruns, and risk.

## solver setup

The hosted demo uses a pure-Python bounded-search reference implementation so
Streamlit Community Cloud can run it without commercial solver setup. FloPro is
credited as the public ADMM implementation reference and can be used locally in
future phases.

## ADMM mechanics

Each iteration:

1. buyer solves local utility plus proximity penalty
2. supplier solves local utility plus proximity penalty
3. the system computes consensus quantity
4. price-like dual signals update
5. residual measures disagreement

Small residual means the agents are near agreement. High global utility means
the agreement is good. Those are related but not the same.

## certainty in long-lead planning

Long lead times make uncertainty expensive. A firm commitment reserves capacity
but creates cancellation exposure. A soft commitment preserves optionality but
may not reserve enough capacity. Forecast sharing can improve joint utility, but
it exposes private demand information.
