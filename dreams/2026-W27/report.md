# dream 2026-W27

Late reconstruction from the `learning.dream-orchestrator.backfill`
role, generated on 2026-07-05 for the 2026-06-29 through
2026-07-05 lookback window.

## subject

W27 mostly completed the factory behavioral-contract campaign, but
the procurement product finally moved again with an explainable
mechanism selector and benchmark scorecard. The dream cadence is
being restored late.

## retrospect

The week began with factory contracts. Commit `19b9400` injected the
typed contract into planning and implementation prompts. Commit
`1a681b5` added behavioral contract leaf validators. Commit `a7a303d`
wired behavioral gates and the learning loop, while `ceaf2f6`,
`5aabb34`, and `247eb71` tightened independent review, persona
wiring, and fail-closed triage. The FAC-012 fixes on 2026-06-30
(`418b625`, `13e7066`) repaired the first-action gate's `uv`
interpreter path. On 2026-07-01, `4027540` added content-hardening
gates for tool-markup, secrets, and does-something checks, with
`f6a9a37` recording FAC-015.

The product-side exception is important because it breaks the long
factory-only stretch. Commit `f45b5ef` added an explainable mechanism
selector to the SDK on 2026-07-02. Commit `b46d31c` and merge
`b400ca2` then added the cross-scenario mechanism benchmark scorecard
on 2026-07-05. Those are procurement-facing mechanism-comparison
improvements, and they should anchor the next normal weekly pass.

The process lesson is separate. The README claimed a weekly Friday
dream cadence, but before this backfill the `dreams/` folder only
held W21 and W22. W23 through W27 were missing, and the Published
table did not even list the existing W22 entry. This report restores
the artifact trail, but it does not erase the lapse.

## candidate index

| File | Mode | Shape | Direction |
|---|---|---|---|
| `candidates/backlog-001-restore-weekly-retro-cadence.md` | architecture_drift_detection | `backlog_item` | restore |

Total: 1 candidate. It is human-gated and should be routed as process
debt, not product debt.

## next pass

The next non-backfill dream should run on its normal cadence and
start from the mechanism selector plus benchmark scorecard. It should
not keep carrying the factory backfill as the main story unless the
factory again consumes the week's development work.
