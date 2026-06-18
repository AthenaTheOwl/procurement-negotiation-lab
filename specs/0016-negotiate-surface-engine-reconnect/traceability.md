# traceability: negotiate-surface engine reconnect

| Requirement | Tasks | Acceptance checks | Decision | Status |
|---|---|---|---|---|
| **R-NEGOTIATE-001** versioned surface engine contract (owner_role: engineering.implementation) | T-SPEC-0016-A, T-NEG-001 | `packages/engine/src/learn/negotiationContract.ts` plus tests; unknown versions and mechanism ids rejected | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | implemented |
| **R-NEGOTIATE-002** functional mechanism selector (owner_role: engineering.implementation) | T-NEG-002, T-NEG-004, T-MPC-INT-002 | Selector lists only functional mechanisms; selection changes output and survives URL copy | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | partial: weighted-Nash bounded/plaintext live |
| **R-NEGOTIATE-003** legacy URL translator (owner_role: engineering.implementation) | T-NEG-003 | v1 `?n=` links translate to v2 `?neg=`; invalid links fail closed | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | implemented |
| **R-NEGOTIATE-004** two-tab engine round trip (owner_role: science.proof-gate-runner) | T-NEG-002, T-NEG-005, T-MPC-INT-003 | Playwright two-tab copied-URL proof for transcript-exposure and MPC modes | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | partial: transcript-exposure Playwright proof live; MPC proof pending W5 |
| **R-NEGOTIATE-005** exposure and participation report in the UI (owner_role: science.proof-gate-runner) | T-NEG-002, T-LEARN-12, T-MPC-INT-002 | UI renders exposure bound or cryptographic parameter plus BATNA and participation status from engine response | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | partial: transcript-exposure report and Level 12 learning proof live; MPC pending W5 |
| **R-NEGOTIATE-006** mobile and SDK parity (owner_role: engineering.implementation) | T-MP-003, T-MOB-MP | SDK CLI and mobile fixtures match the web contract or a documented equivalent adapter | [DEC-NEGOTIATE-001](../../decisions/DEC-NEGOTIATE-001-versioned-surface-contract-before-engine-reconnect.md) | partial: SDK CLI covers N=3; mobile parity pending |

## Proof record

Spec 0016 ships with the W0 task rows completed and the W3/W4/W5 work
scheduled. The W0 proof is `python scripts/spec_check.py` plus
`python scripts/voice_lint.py`. The W3 contract proof is
`npm.cmd run test --workspace=@lab/engine -- negotiationContract`.
Product proof lands when W3 wires the contract into NegotiateSurface
and Playwright covers the copied-URL two-tab flow. The current
surface proof is
`npm.cmd run test --workspace=@lab/web -- NegotiateSurface`, which
covers v2 URL writes, legacy link translation, functional mechanism
selection, and exposure/participation rendering from engine responses.
The copied-URL browser proof is
`npm.cmd run smoke --workspace=@lab/web -- negotiate`, which opens
buyer and supplier pages, exchanges the encoded URL, runs
weighted-Nash bounded, and returns the supplier counterpacket to the
buyer tab.
The learning proof is `npm.cmd run test --workspace=@lab/web -- Level12`,
which covers the Level 12 weighted-Nash intro, BATNA framing, transcript-
exposure display, plaintext oracle contrast, and gated Continue
behavior.
The mobile learning-contract proof is
`npm.cmd run typecheck --workspace=@lab/mobile` plus
`npm.cmd run test --workspace=@lab/mobile -- --runInBand`; mobile now
has the same 12-level progression and Level 12 weighted-Nash intro.
`T-MOB-MP` remains open for true `N = 3` mobile fixture parity.
