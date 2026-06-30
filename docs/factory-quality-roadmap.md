# Factory quality roadmap — getting from "passes the gate" to "not slop"

Written 2026-06-21 after a session that shipped ~40 public repos through this
factory and then spent days finding the slop the gates let through. This is the
critical read on what's needed next, grounded in the failures we
observed, not a completeness wishlist.

## The reframe: full autonomy is the wrong near-term target

The factory is not ready for full autonomy, and chasing it now would produce more
slop, faster. The honest sequence is the same shape as anything else here:

`trustworthy supervised` → `measure it` → `earn autonomy one safe class at a time`

You earn autonomy on a class of work when the metrics ledger shows a high
first-attempt pass rate, escaped-defects near zero, and the behavioral gates green
— i.e. when a human spot-check would almost always agree with the gate. We are not
there. The metrics ledger (the instrument that tells us when we are) currently
reads **58% clean / 42% rework**. So the work is to raise that honestly, by
catching slop earlier, not to remove the human.

For the public repos the "danger classes" that stay human-gated aren't PHI or
money — they're **secrets, audience-neutrality (no employer / named-org
references), the author's voice, and sensitive disclosure.** We tripped every one
of those this session.

## The slop modes observed (the evidence)

Every quality failure this session had the same root: **a gate checked that an
artifact was PRESENT, not that a behavior WORKED.**

| Slop mode | What we saw | The present-check that missed it |
|---|---|---|
| Ornamental | app runs, does nothing usable (validate exits 0) | "reports/*.jsonl exists" |
| Looks-shipped | files there, the advertised command is broken (needs args, no `__main__`) | "README names a command" |
| Boots-not-usable | server starts, the UI renders blank (supplier-risk) | "streamlit_app.py exists" |
| Thin | one fixture, no real data, no second scenario | "an artifact exists" |
| Stale/weird docs | README says "scaffold, no implementation" when code is real | "README exists" |
| Self-confirming tests | tests assert shape, not correctness | "tests/ exists, pytest exits 0" |
| The metrics lie | factory reported 100% clean off blind event signals | nothing was measuring honestly |
| Disclosure slips | employer names, a named political org, in public copy | voice_lint didn't scan for them |

The meta-principle for everything below: **gates must verify behavior and outcome,
not artifact presence.** Every quality win we got (the first-action-runs gate, the
browser smoke, the interactivity bar, the metrics ledger reading the defect log)
was a behavioral check replacing a presence check.

## What to add — prioritized, tight, evidence-led

### 1. Behavioral gates (the highest-impact set)

These replace presence checks with outcome checks. Most we did by hand this
session; the work is to make them gates that run every time.

- **does-something gate**: the demo/show command must produce non-trivial,
  structured output (ranked rows, a real number, a verdict), measured — not "ok",
  not an empty table. Catches *ornamental*.
- **browser-smoke gate** (deployable apps): boot the app headless, assert it
  renders content + survives one user action, no console error, no stException.
  Catches *boots-not-usable*. (We built the one-off; promote it to a gate.)
- **cold-clone durability gate**: fresh clone → `uv sync` → run the first action →
  `pytest`, in a clean dir. Catches *looks-shipped* on a different machine. The
  thing we kept saying we'd do and didn't.
- **data-realism gate**: the committed artifact has > 1 row, no placeholder
  tokens, values in plausible ranges. Catches *thin*.
- **test-bite gate**: a heuristic (or light mutation test) that the tests
  exercise the real engine and assert a value — not just import-without-error.
  Catches *self-confirming tests*. This is the weakest spot; AI writes tests that
  pass by construction.
- **resolved_in_round closure**: mark a defect resolved when a re-run passes the
  gate it failed, so the metrics "escaped" count stops overcounting (currently 331
  is mostly un-closed defects, not shipped bugs). Honesty fix for the instrument.

### 2. A tight reviewer-persona set (~5, not 50)

The factory already has architecture + security personas and the Claude/Codex
cross-lane (independence is the point — never let the implementer self-review).
Add only personas that catch a slop mode above, each with a sharp single job:

- **Dogfooder** — runs it as a first-time user, does one real task, reports
  usable-or-ornamental. (Makes the interactivity wave a standing role.)
- **Cold reader** — reads ONLY the README and tries to run it blind; if they
  can't, the docs fail. (Makes the cold-clone test a persona judgment.)
- **Adversary** — tries the unhappy path: bad input, empty data, the second
  scenario. Finds missing error handling. (The adversarial-verify pattern from the
  research workflow, pointed at code.)
- **Maintainer** — would I extend this in six months? naming, structure, comment
  intent, dead scaffolding. (Catches inscrutable-but-passing code.)
- **Disclosure reviewer** — secrets, employer names, named orgs, voice. Public-
  copy safety. (Automatable as a gate too; see §5.)

Keep it to these. The session's own lesson (and the operating model) is ship a few
sharp roles per pass, not a 50-persona panel that dilutes signal.

### 3. A coding-style contract (yes — and enforced, not a vibes doc)

AI code often "works" and is unreadable. The contract, per template, enforced by a
ruff + mypy gate plus the Maintainer persona:

- Type hints on public interfaces; docstrings that say what a function is *for*,
  not what its signature already says.
- **Comment the WHY, not the WHAT.** No `# increment i`. Yes `# ERCOT reports
  energized MW lagging by a month, so we compare to last month's row`.
- Functions small enough to hold in your head; no 200-line god-functions the model
  emitted in one shot.
- Match the surrounding idiom (the same rule the voice work used for prose).
- No dead scaffolding, no commented-out code, no "# TODO: implement" left in a
  shipped repo.
- The AI tells to ban in code, like we banned them in prose: restating the
  signature in a comment, over-commenting the obvious, ceremonial docstrings on
  trivial helpers.

### 4. A logging contract (yes — this is a real gap, and it gates autonomy)

If the factory ever runs unattended, you debug failures from logs, not by
re-running. Today the generated repos mostly `print` or stay silent. The contract,
enforced by a `log-hygiene` gate that greps for the anti-patterns:

- Structured, leveled logging (error / warn / info), not bare `print`, on any
  non-trivial path.
- **No silent failure.** Ban bare `except:` / `except Exception: pass`. Every
  failure path emits an error that names the input and the expected-vs-actual.
- Error messages a stranger can act on: which file, which value, what was expected.
- Typed error categories where it makes sense (same idea as the factory's own
  stop-reason taxonomy) so failures are countable, not prose.
- This compounds with the metrics ledger: good logs → cleaner defect
  classification → a sharper "is the factory good" signal.

### 5. Public-repo guardrails as gates (we hit all of these by hand)

Promote the things we kept catching manually into the contract:

- **disclosure gate**: scan public copy for employer names (Amazon, Qualcomm, the
  FAANG+ list), named political orgs, and API-key shapes. We fixed the Hero, the
  profile, two essays, and a News-Bias hook one at a time — make it a gate.
- **voice gate**: extend the existing voice_lint with the README voice spec
  (register-aware: sober/dry-wit/playful), so a flat or template-residue README
  fails before merge.
- **first-action + STATUS-section + pyproject gates**: already in place; keep.

## What NOT to do

- Don't build the 6-persona panel as 50. Signal dilutes; the operator stops
  reading.
- Don't grant autonomy before the behavioral gates are good enough that the
  metrics ledger earns it on a class. Autonomy-first is the plan run backward.
- Don't add an orchestration framework. The kernel + workflows + typed task YAML
  are enough; this is all gates, personas, and contracts — typed artifacts on the
  control plane we have.

## The order

1. Close the instrument (resolved_in_round), so the metrics tell the truth.
2. Add the behavioral gates (does-something, browser-smoke, cold-clone, data-
   realism, test-bite) — these directly raise the honest clean rate.
3. Add the style + logging contracts and their gates.
4. Add the disclosure + voice gates (cheap, high-embarrassment-avoidance).
5. Add the 5 personas as standing review roles.
6. Re-measure. When a class of work runs green and the ledger agrees, earn
   supervised-light autonomy for that class only.

The single most important one is the **test-bite gate** — self-confirming tests
are how buggy-but-passing slop survives every other check.
