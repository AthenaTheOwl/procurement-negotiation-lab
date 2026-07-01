# Factory gap register — end to end, grounded in code + data

Built 2026-06-21 from a stage-by-stage read of the real pipeline (8 agents over
the actual code) cross-checked against the metrics ledger and defect log. 55 gaps
found (27 high), with **one root cause that drives the rework, plus five clusters
that let slop ship.** This document is structured
so the fixes that kill the most rework come first.

## The root cause: a split definition-of-done

The factory defines "done" in two places that are never synced:

- The **typed contract** — `expected_artifacts`, `module_map` + `public_interfaces`,
  `first_user_action`, the active files (PRODUCT_BRIEF / SYSTEM_MAP / STATUS),
  STATUS's three section headings, `blast_radius`. This is what the GATE, PLAN
  validator, and REVIEW stages enforce.
- The free-text **`goal`** — the only thing the PLAN and IMPLEMENT prompts ever
  see. `pipeline.py` builds the implement prompt as
  `IMPLEMENT_PROMPT.format(goal, plan, cwd)`. None of the typed contract is
  injected.

So **the implementer is graded on a checklist it is never shown.** It omits
artifacts it was never told to make, the presence gate catches them, and a full
patch round re-creates a requirement that was declared upstream the whole time.

### The data says this is ~90% of the rework

From the defect log, the round-0 gate failures by family:

| Missing on round 0 | Rows | Share of round-0 failures |
|---|---|---|
| module-source `.py` files (declared in `module_map`, never shown to implementer) | 62 | 25% |
| PRODUCT_BRIEF.md + SYSTEM_MAP.md (+ contract-presence) | 75 | 30% |
| data-ledger `*.jsonl` | 37 | 15% |
| specs/0002-design quad (requirements/design/tasks/acceptance) | 32 | 13% |
| reports glob | 14 | 6% |

That is ~89% of round-0 failures, all the same shape: **a contract artifact the
task declared but the prompt never communicated.** The 42% rework rate is, in the
main, one avoidable communication gap.

## Rework-killer (do this first): sync the contract into the prompts + self-gate

Three moves, in order:

1. **`Task.to_implement_brief()`** — serialize the full typed definition-of-done
   into a CONTRACT block: every `expected_artifacts` path, every module source +
   `public_interface` signature, the active files, the literal
   `STATUS_REQUIRED_SECTIONS`, the `first_user_action`, the `blast_radius`
   allowed/forbidden paths.
2. **Inject it into PLAN_PROMPT and IMPLEMENT_PROMPT** so the agent sees the exact
   checklist the gate will enforce. (Plan agent: confirm the create-list covers
   it. Implement agent: produce all of it.)
3. **Self-gate before handoff** — add a "run `task.all_gates()` yourself and only
   declare done when they pass" step to the implement prompt. Round 0 then
   produces what round 1 currently produces.

Expected impact: most of the 42% collapses, because ~90% of it is artifacts the
implementer simply never knew were required. This is the single highest-impact
change in the factory.

Also: **`spec_tasks.py` emits no contract fields at all** — spec-driven tasks have
a structurally weaker definition-of-done than template tasks. Make it emit the
same contract scaffold templates do.

## The slop register: five clusters that let bad output ship

Rework wastes rounds; these let non-functional output through *all* the rounds.
Every one is the same meta-pattern — **a gate checks PRESENCE where it should
check BEHAVIOR.**

### 1. Gates verify files exist, not that they work
- `public_interfaces` are declared but **never verified** — a 1-byte file with the
  right name passes. Stub code ships. → **interface gate**: import each
  `module.source`, assert each declared symbol exists with a compatible signature.
- `first_user_action` is **never executed in the gate** (it lives in the
  out-of-band `validate_first_actions.py` that doesn't run in the pipeline). Broken
  commands ship. → run it in-gate (uv sync + the literal command, assert exit 0).
- expected-artifact non-empty is satisfied by **any byte** — thin/stub/ornamental
  data passes. → content-shape assertions: jsonl reports parse + have ≥N rows;
  STATUS sections have non-empty bullet bodies.

### 2. Review is neither independent nor behavioral
- Default `reviewers=['claude_code']` is the **same worker family as the
  implementer** — not cross-model review. → default the reviewer to a different
  model than the implementer; refuse same-family self-review.
- `persona_reviews` (architecture, security) are parsed and validated but
  **never consumed** in `pipeline.py` (0 occurrences). → wire them into the
  reviewer loop, or delete the dead config.
- REVIEW_PROMPT feeds the reviewer **only `git diff --stat`** (filenames + counts),
  not the diff content or gate stdout. The reviewer is blind. → inline the real
  diff (token-budgeted) + failing-gate output.
- REVIEW_PROMPT says **"bias toward CLEAN"** and its CLEAN criteria are
  presence/scope only. → require a per-acceptance-criterion behavioral check: name
  the diff lines that satisfy each criterion.

### 3. The verdict fails OPEN
- `_combined_review_status` defaults to **CLEAN** when the review is
  unparseable/headerless and no blocking keyword fires. Ambiguity ships. → invert:
  ambiguous/unparseable review = NEEDS_PATCH or escalate. Fail closed.

### 4. Triage gates nothing
- Triage is classified **after the PR is already opened** (33 lines too late). →
  compute triage *before* the push/PR block; HOLD = don't push.
- The done-path triage call doesn't receive the real signals (no-op diff, sensitive
  disclosure). → plumb them in.
- INVESTIGATE still ships a `done` PR. → open as draft / do-not-merge, require a
  human ack.

### 5. Blast-radius runs too late
- The forbidden-path / scope check runs once, after the full implement loop. An
  agent that edits forbidden scaffold churns rounds first. → run it inside the
  implement loop, right after each impl run, and feed violations back.

## The compounding fix: close the learning loop

Right now the defect log and metrics rollup are **never injected into any prompt**
(0 sites). The factory re-makes the same mistakes every run — the same
PRODUCT_BRIEF/SYSTEM_MAP/specs omissions, batch after batch. The loop is open.

→ Before the round-0 implement prompt, read the top-N recurring `gate_or_finding`
entries from the defect log (and the rollup's gate-failure distribution) and inject
them as "the most common misses on this kind of task — do not repeat them." Now the
factory gets better the more it runs, instead of stamping the same 42% forever. This
is what turns the metrics ledger from a scoreboard into a feedback controller.

## The restructured pipeline

```
NOW:    goal --> plan --> implement(goal,plan) --> gate(typed contract) --> review(diff --stat) --> triage(after PR) --> merge
                                   ^ blind to the contract                    ^ blind to the diff      ^ too late

AFTER:  goal + CONTRACT BRIEF --> plan(confirms create-list) --> implement(sees contract, self-gates) -->
        gate(behavioral: runs first-action, verifies interfaces, checks content shape) -->
        review(cross-model, sees real diff + gate output, fails closed) -->
        triage(before PR, real signals) --> merge
        + learning loop: recurring defects injected into the next round-0 prompt
```

## The fix sequence (by measured impact)

1. **Contract brief into PLAN + IMPLEMENT prompts** + **self-gate before handoff**.
   Kills ~90% of the rework. (rework)
2. **Close the learning loop** — recurring defects feed the round-0 prompt. Makes
   #1 compound. (rework, compounding)
3. **Behavioral gates** — run first_user_action in-gate, interface gate, content-
   shape assertions. Kills the ornamental/stub/broken-command slop. (slop)
4. **Review hardening** — cross-model default, feed the real diff, fail closed,
   wire or cut persona_reviews. (slop)
5. **Triage before PR** + INVESTIGATE = draft. (slop)
6. **spec_tasks.py emits the contract** + **blast-radius inside the loop**. (both)

Items 1-2 are the rework story (raise the honest clean rate above 58%). Items 3-5
are the slop story (stop shipping non-functional output). Item 6 closes the
structural holes.

The one-line diagnosis: **the factory grades work against a contract it never hands
the worker, and checks that files exist instead of that they run.** Fix those two
and the 42% rework and the slop both fall out of the same change.

## Empirical validation (2026-06-30): the run that proved #1 and named the next two gates

After the campaign shipped, a real run on a fresh repo (`hbm-supply-tracker`, an
HBM supply-backing report) exercised the rebuilt pipeline end to end.

**The rework-killer worked.** The implementer produced every contract artifact on
round 0 — PRODUCT_BRIEF / SYSTEM_MAP / STATUS, the package, the report, the specs
quad, tests — zero missing-artifact rework. The dominant historical failure (the
PRODUCT_BRIEF/SYSTEM_MAP/module-source omissions, ~90% of the old 42%) did not
recur. Fix #1 is confirmed against live output, not just unit tests.

**The run also surfaced an env bug the gate-runner hid (FAC-011/FAC-012).** The
first-action gate kept failing "No module named uv" — not the repo's fault. The
factory runs *inside* the project `.venv` (it launches under `uv run`), and that
interpreter has no `uv` module and no uv on PATH, so the generated `python -m uv`
gate cmd and `shutil.which("uv")` both resolved to nothing. Fix: resolve uv via the
`UV` env var `uv run` exports, normalized at the one gate-runner chokepoint. Two
"blocked" outcomes were this bug, not factory slop — the kind of false negative a
first real run exists to find.

**Then an adversarial pass audited the clean output** — six dimensions
(does-something, test-bite, cold-reader, adversary, maintainer, disclosure/voice),
each finding refuted-by-default before it counted. Result: **4 confirmed, 6
refuted.** The refutes mattered — two test-bite findings died because their mutation
proofs didn't reproduce (they missed that `validate` checks against a git-tracked
golden fixture, which *is* an external oracle). Four dimensions came back fully
clean: **does-something, cold-reader, maintainer, disclosure/voice** — the contract
brief + existing behavioral gates already cover those.

The 4 confirmed defects fall into exactly two classes the quality roadmap predicted
the current gates would miss — now with mutation evidence:

### FAC-013 — test-bite gate (the roadmap's named #1 weakness, now with a repro)
The factory's own output shipped self-confirming tests. `test_scoring.py`
regenerated its expected rows from the engine under test, so a consistently-wrong
formula passed green: perturbing the tooling weight `0.25 → 0.30` left
`test_scoring.py` + `test_cli.py` at "4 passed". A whole branch of the
limiting-constraint classifier (`wafer`) was never exercised — flipping
`return "wafer"` to `"packaging"` kept the suite green.
→ **Gate:** a light mutation pass — perturb a constant/operator in each
module-map source, re-run the repo's tests, and require that **at least one test
fails**. A module whose mutation leaves the suite green has no test that pins its
behavior. (Verified the fix direction in-repo: adding literal-value assertions made
the `0.25→0.30` mutation fail, as it should.)

### FAC-014 — unhappy-path error gate (the adversary persona as a check)
`validate --report <dir>` and `report --output <dir>` escaped as raw `OSError`
tracebacks: the handler caught `(ReportValidationError, ValueError)`, but
`PermissionError` / `IsADirectoryError` are `OSError`, not `ValueError`, so a
realistic path mistake crashed instead of erroring cleanly.
→ **Gate:** run the first action against a deliberately bad target (a directory
where a file is expected, a non-existent path) and assert a **clean error + a
non-zero exit, with no traceback on stderr**. Pairs with a log-hygiene grep for
bare `except:` / `except Exception: pass`.

Both are the same meta-principle as the rest of this register: **check behavior,
not presence** — here, that the tests *bite* and that failure paths *fail cleanly*.
The clean four dimensions say the factory now produces real, readable,
audience-safe code that does something; these two gates close the gap between
"passes its own tests" and "its tests are worth passing."

Implementation status, 2026-06-30: FAC-013 and FAC-014 now run as typed
contract gates. Task YAML can set `test_bite` and `unhappy_path_actions`;
`scripts/factory/contract.py` mutates declared Python module sources and
requires configured tests to fail, then runs configured bad-input commands and
requires clean non-zero exits with no traceback. The data-report and
product-control-plane templates enable both gates by default.

### FAC-015 — content-hardening gate (the portfolio sweep found the class)

Applying FAC-013/014 across the portfolio surfaced a class none of them catch:
**9 repos shipped READMEs ending in Claude tool-call XML (`</content></invoke>`)**,
8 of them past *green test suites* — because no test reads the README. Same shape
as ornamental output (exits 0, prints nothing) and leaked secrets: a defect the
repo's own tests structurally cannot see.
→ **Gate** (`scripts/factory/content_gates.py`, wired into `_run_contract_gates`):
- `validate_no_tool_markup` — repo-wide `git ls-files` scan for tool-call XML +
  template residue in any committed text file.
- `validate_disclosure` — secret shapes (openai/aws/github/google/slack keys,
  private-key blocks, inline `api_key=`). Narrowed to zero-false-positive: a
  marketing-word check was built and **removed** after validating 100% FP on this
  portfolio ("operating leverage", AGENTS.md quoting the banned list). Voice stays
  with the per-repo `voice_lint`.
- `validate_does_something` — the first action must produce *structured* output, not
  just exit 0.

The meta-lesson, and why this is factory-enforced not test-delegated: **"tests pass"
≠ "no defects."** 8 of the 9 corrupted repos had green suites. A content gate must
run regardless of the generated repo's own (possibly weak) tests. Validated: 10 unit
tests, detection proven against a corrupted `main`, zero findings across all 43
current branches, no false positive on the pilot. Ships a `main` runner so the same
checks sweep existing repos.
