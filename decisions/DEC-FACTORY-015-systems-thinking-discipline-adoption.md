---
id: DEC-FACTORY-015-systems-thinking-discipline-adoption
spec: specs/0009-factory-dev-control-plane/
requirement: R-FACTORY-RUN-EVIDENCE-032
date: 2026-05-29
status: approved
reversible: true
amends: DEC-FACTORY-014-procurement-negotiation-lab-chaos-test-suite
decision: |
  procurement-negotiation-lab adopts the systems-thinking discipline
  amended into the cross-repo schemas by DEC-CDCP-020 in athena-site.
  Four coupled changes land together as the smallest closure that
  binds cache, readme, validator, and demonstration:

  1. The three cached schemas
     (`ops/schemas-cache/decision.schema.json`,
     `ops/schemas-cache/dream-output.schema.json`,
     `ops/schemas-cache/run.schema.json`) refresh to athena-site's
     post-DEC-CDCP-020 bytes. The four optional fields
     (`systems_map`, `transferable_principle`,
     `falsification_test`, `adoption_ladder`) are now part of the
     locally enforced contract.
     `python scripts/check_schema_cache_freshness.py` exits 0.

  2. `AGENTS.md` carries a top-level "Systems-thinking discipline
     (per DEC-CDCP-020)" section that names the four fields with
     their roles plus the 30-day warning-to-failure ratchet. The
     section sits after the existing boundary rules so the
     contributor reads the discipline before opening a new DEC.

  3. `scripts/validate_decisions.py` gains a non-fatal warning
     branch: for every DEC with `status: approved`, the validator
     collects the missing fields among the four and prints them to
     stderr under the prefix `validate_decisions: systems-thinking
     discipline warnings (non-fatal; see DEC-CDCP-020)`. The
     warning does not change the exit code. A future amendment DEC
     ratchets warnings to failures after the 30-day adoption
     window.

  4. The three most recent factory DECs (DEC-FACTORY-012,
     DEC-FACTORY-013, DEC-FACTORY-014) carry the four fields with
     substantive content. The retrofit puts the discipline on real
     decisions instead of leaving it as an aspirational readme
     item.

  This DEC populates the four fields on itself so the discipline is
  self-applying: the adoption DEC is the first new DEC in the repo
  that opts into the schema and the validator at the same time.
alternatives:
  - label: refresh the schemas-cache only and defer AGENTS.md
      plus the validator change
    rejected_because: |
      Refreshing the cache without updating AGENTS.md leaves
      contributors with no signal that the new fields exist; the
      schema would be the only place the discipline lives. Without
      the validator warning, the schema is silently optional and
      the discipline never accrues. The four changes are coupled:
      the cache is the contract, the readme is the announcement,
      the validator is the enforcement nudge, and the retrofit is
      the demonstration. Splitting them across four DECs would
      burn three commits on a single coherent adoption move.
  - label: ship the validator warning as a hard failure on day one
    rejected_because: |
      The cross-repo discipline is one day old in athena-site. The
      schema landed with `minLength: 10` on the three string fields
      so authors who try to fake it with empty strings still fail
      validation, but the fields themselves are optional. Failing
      every existing DEC missing the fields would force a 33-DEC
      retrofit before any contributor could commit anything else.
      The 30-day warning window matches DEC-CDCP-020's bootstrap-
      friendly framing; the failure ratchet lands as a follow-up
      amendment DEC once the warning signal stabilizes.
  - label: retrofit every DEC in the repo, not just the most
      recent three
    rejected_because: |
      A 33-DEC retrofit conflates two contracts in one DEC: the
      adoption move (cache + readme + validator) and the historical
      cleanup (every prior DEC's four fields). Mixing them would
      stall the adoption move behind a multi-hour content task and
      blur the rollback (reverting the adoption would also revert
      arbitrary historical content). The most-recent-three retrofit
      shows the discipline working on live decisions and lets the
      historical cleanup land in batches under their own DECs.
  - label: copy DEC-CDCP-020's adoption_ladder verbatim instead of
      naming this repo's specifics
    rejected_because: |
      DEC-CDCP-020's adoption_ladder is the portfolio-wide ladder:
      schemas amended -> validators warn -> warning ratchets to
      failure -> 90-day amendment audit. This DEC's ladder is the
      per-repo ladder: cache refreshed -> AGENTS.md updated -> new
      DECs populate organically -> validator fails on missing
      fields. The two ladders compose (this repo's full_adoption
      coincides with the portfolio's ratchet), but they are not the
      same artifact. Copying the cross-repo ladder verbatim would
      hide the per-repo enforcement boundary.
rationale: |
  This DEC amends DEC-FACTORY-014. The factory passes have built up a
  validator chain (DEC-FACTORY-007 emission, DEC-FACTORY-008
  cross-checks, DEC-FACTORY-009 replay command, DEC-FACTORY-010
  portable URIs, DEC-FACTORY-011 CI, DEC-FACTORY-012 determinism,
  DEC-FACTORY-013 thread_id capture, DEC-FACTORY-014 chaos suite).
  Every layer hardened the run-evidence contract. The remaining gap
  is on the decision artifact itself: DECs in this repo do not yet
  carry the four systems-thinking fields, so a reader cannot tell
  from the DEC alone what underlying mechanism it touches or what
  would falsify it.

  DEC-CDCP-020 amended the cross-repo schemas to make the four
  fields optional but recommended. This DEC closes the loop in
  procurement-negotiation-lab: refresh the cache, name the
  discipline in AGENTS.md, wire the validator warning, and put the
  discipline on the three most recent DECs.

  The closing pattern matches every prior cross-repo schema move
  this repo has adopted: schemas land in athena-site, the local
  cache refreshes, AGENTS.md names the boundary, validators wire
  the enforcement, and a self-applying adoption DEC closes the
  loop. Future cross-repo schema landings can follow the same
  four-step pattern.

  Reversibility is high. The cache refresh is a byte-for-byte
  revert if athena-site rolls DEC-CDCP-020 back. The AGENTS.md
  section is a single-paragraph drop. The validator warning is a
  ten-line block in `main()` that does not change exit codes. The
  three retrofitted DECs each have an isolated four-field block in
  their front-matter; reverting drops the block and leaves the rest
  of the DEC untouched. No production code, no schema authoring, no
  CI workflow changes.
evidence:
  - kind: spec
    ref: specs/0009-factory-dev-control-plane/requirements.md
  - kind: decision
    ref: decisions/DEC-FACTORY-014-procurement-negotiation-lab-chaos-test-suite.md
  - kind: decision
    ref: decisions/DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix.md
  - kind: decision
    ref: decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md
  - kind: doc
    ref: ops/schemas-cache/decision.schema.json
  - kind: doc
    ref: ops/schemas-cache/dream-output.schema.json
  - kind: doc
    ref: ops/schemas-cache/run.schema.json
  - kind: doc
    ref: AGENTS.md
  - kind: doc
    ref: scripts/validate_decisions.py
rollback: |
  Revert the three cached schemas in `ops/schemas-cache/` to their
  pre-refresh bytes. Drop the "Systems-thinking discipline (per
  DEC-CDCP-020)" section from `AGENTS.md`. Drop the warning branch
  in `scripts/validate_decisions.py::main` (the block that walks
  the four field names on `status: approved` DECs and appends to
  `warnings`) along with the stderr write that fires when
  `warnings` is non-empty. Drop the four-field blocks from
  DEC-FACTORY-012, DEC-FACTORY-013, and DEC-FACTORY-014's
  front-matter. Drop `R-FACTORY-RUN-EVIDENCE-032..035` from
  `requirements.md`, the matching rows from `traceability.md`, and
  the Pass N task block from `tasks.md`. The DEC-FACTORY-014 chain
  remains untouched.
owner: control.coordinator
systems_map: |
  Per-repo adoption of cross-repo control-plane discipline; the
  schema cache is the contract, AGENTS.md is the readme, validator
  is the enforcement, retrofit is the demonstration. The four
  changes compose into the smallest closure that turns a portfolio-
  wide schema amendment into a locally enforced norm.
transferable_principle: |
  Any cross-repo schema discipline lands via (cache -> AGENTS.md ->
  validator -> retrofit) — the same four-step pattern applies to
  future portfolio-wide schemas. The schema is the contract; the
  readme is the announcement; the validator is the nudge; the
  retrofit is the demonstration.
falsification_test: |
  If new DECs in this repo over the next 30 days populate the four
  fields at less than 20% rate despite the validator warning, the
  discipline is not taking hold — escalate via an amendment DEC
  (either pause the ratchet or strengthen the AGENTS.md signal).
adoption_ladder:
  minimum_viable: |
    Cache refreshed; validator emits warnings on missing fields;
    exit code stays 0.
  mid_adoption: |
    AGENTS.md updated; new DECs populate the fields organically;
    the three most recent DECs retrofit as the demonstration.
  full_adoption: |
    Validator fails on missing fields (via amendment DEC after the
    30-day window); at least 80% of historical DECs retrofitted;
    the four fields are part of the standard DEC review checklist.
  monitoring_signals:
    - "new-DEC field-population rate per week"
    - "validate_decisions warning count trend on main"
    - "historical-DEC retrofit progress per pass"
---

## decision

procurement-negotiation-lab adopts the systems-thinking discipline
amended into the cross-repo schemas by DEC-CDCP-020 in athena-site.
Four coupled changes land together: the three cached schemas
refresh to athena-site's post-DEC-CDCP-020 bytes; `AGENTS.md` gains
a "Systems-thinking discipline (per DEC-CDCP-020)" section that
names the four fields and the 30-day warning-to-failure ratchet;
`scripts/validate_decisions.py` emits a non-fatal warning when an
approved DEC is missing any of the four fields; and the three most
recent factory DECs (DEC-FACTORY-012, DEC-FACTORY-013,
DEC-FACTORY-014) carry the four fields with substantive content.

This DEC populates the four fields on itself so the discipline is
self-applying.

## alternatives

- Refresh the schemas-cache only and defer the readme plus
  validator change: rejected because the four changes are coupled;
  splitting them would burn three commits on a single coherent
  adoption move with no clear contributor signal in between.
- Ship the validator warning as a hard failure on day one:
  rejected because the cross-repo discipline is one day old; the
  30-day warning window matches DEC-CDCP-020's bootstrap framing
  and avoids a 33-DEC retrofit blocker.
- Retrofit every DEC in the repo, not just the most recent three:
  rejected because a 33-DEC retrofit conflates the adoption move
  with the historical cleanup; the most-recent-three retrofit puts
  the discipline on live decisions and lets the historical cleanup
  land in batches.
- Copy DEC-CDCP-020's adoption_ladder verbatim: rejected because
  the cross-repo ladder and the per-repo ladder are different
  artifacts that compose; copying would hide the per-repo
  enforcement boundary.

## rationale

This DEC amends DEC-FACTORY-014. Every prior factory pass hardened
the run-evidence contract on the production surface. The remaining
gap is on the decision artifact itself: DECs in this repo do not
yet carry the four systems-thinking fields, so a reader cannot tell
from the DEC alone what mechanism it touches or what would
falsify it.

DEC-CDCP-020 amended the cross-repo schemas to make the four
fields optional but recommended. This DEC closes the loop locally:
cache, readme, validator, retrofit. Future cross-repo schema
landings can follow the same four-step pattern.

Reversibility is high. The cache refresh is a byte-for-byte revert,
the AGENTS.md section is a single-paragraph drop, the validator
warning is a ten-line block, and the retrofitted DECs each have an
isolated four-field block.

## evidence

- `specs/0009-factory-dev-control-plane/requirements.md` adds
  `R-FACTORY-RUN-EVIDENCE-032..035`.
- `decisions/DEC-FACTORY-014-procurement-negotiation-lab-chaos-test-suite.md`
  is the parent DEC.
- `decisions/DEC-FACTORY-013-factory-thread-id-capture-and-timestamp-fix.md`
  and
  `decisions/DEC-FACTORY-012-procurement-negotiation-lab-replay-determinism-test.md`
  are the other two retrofitted DECs.
- `ops/schemas-cache/decision.schema.json`,
  `ops/schemas-cache/dream-output.schema.json`, and
  `ops/schemas-cache/run.schema.json` mirror athena-site's
  post-DEC-CDCP-020 bytes.
- `AGENTS.md` carries the "Systems-thinking discipline (per
  DEC-CDCP-020)" section.
- `scripts/validate_decisions.py` carries the warning branch.

## rollback

Revert the three cached schemas to their pre-refresh bytes. Drop
the AGENTS.md section. Drop the warning branch in
`scripts/validate_decisions.py::main` plus the stderr write. Drop
the four-field blocks from the three retrofitted DECs. Drop
`R-FACTORY-RUN-EVIDENCE-032..035` from `requirements.md`,
`traceability.md`, and `tasks.md`. The DEC-FACTORY-014 chain
remains untouched.

## coverage

This DEC resolves the following requirements added to spec
`0009-factory-dev-control-plane`:

- `R-FACTORY-RUN-EVIDENCE-032` `ops/schemas-cache/` mirrors
  athena-site's post-DEC-CDCP-020 bytes for the three amended
  schemas; `check_schema_cache_freshness.py` exits 0.
- `R-FACTORY-RUN-EVIDENCE-033` `AGENTS.md` names the
  systems-thinking discipline plus the 30-day ratchet.
- `R-FACTORY-RUN-EVIDENCE-034` `scripts/validate_decisions.py`
  emits a non-fatal warning for each approved DEC missing any of
  the four fields; exit code stays 0 when only warnings are
  present.
- `R-FACTORY-RUN-EVIDENCE-035` DEC-FACTORY-012, DEC-FACTORY-013,
  and DEC-FACTORY-014 carry the four fields with substantive
  content; `validate_decisions.py` emits no warning for these three
  DECs.
