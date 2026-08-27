# Validation Rules for Docs Maker

**Purpose**: Make completion claims evidence-backed instead of stylistic opinions.

## 1. Completion Contract

Every completion records:

```text
Claim → Risk → Evidence → Verification → Result → Caveat
```

`Result` is an inspected outcome, not a confidence statement. Decide `ship`, `iterate`, `caveated ship`, or `block`; never hide skipped checks, failed guards, or residual risk.

## 2. Risk Depth and Scope

Classify each material claim before selecting checks:

| Depth | Use when | Minimum evidence and gate |
|---|---|---|
| Low | Local wording or formatting with no behavioral, source, or side-effect change | Readback plus structural check |
| Medium | Workflow, instruction, link, schema, or portability behavior changes | Representative scenario, explicit oracle, and inspected result |
| High | External/current claims, tools, subagents, safety boundaries, consequential actions, or bounded loops | Normal, missing-capability/context, boundary, adversarial, and regression scenarios; output and trajectory checks |
| Critical | Production, destructive, credentialed, publication, deployment, or irreversible effects | Explicit authority, precondition/approval gate, independent evidence, and block on uncertainty |

For bulk or “all X” requests, search/glob the full candidate set, record include/exclude criteria, add or justify new candidates, rescan before completion, and report intentional exclusions.

Reject future source dates. Do not change `last_verified_at` or equivalent verification dates unless actually rechecked.

## 3. Evaluation Contract

For every medium-or-higher-risk claim, define:

| Element | Required meaning |
|---|---|
| Scenario | Input, context, capabilities, and relevant failure or adversarial condition |
| Oracle | Observable required and forbidden behavior; not self-grading |
| Runner | Who/what executes the scenario and with what capability limits |
| Judge | Deterministic check, qualified reviewer, or stated rubric that evaluates the oracle |
| Trace | Required execution trajectory evidence when tools, state, delegation, or side effects matter |
| Gate | Pass/fail threshold, keep/discard rule, and ship/iterate/caveated ship/block consequence |

Suitable verification remains claim-matched: structure uses heading/fence/link/readback checks; source claims use a ledger or claim-source matrix and current official evidence; prompt/instruction changes use smoke cases and known-failure readback; harness changes use tool, safety, context/state, and eval boundaries.

## 4. Trace Assertions

When agents, subagents, tools, or background workflows are documented, require relevant trajectory evidence:

- bounded objective, scope, output, and stop condition
- independent work or explicit sequencing; declared write ownership and no shared-resource conflicts
- least-privilege capability access and explicit unavailable-capability fallback, skip, or block path
- child evidence reporting, parent synthesis, and parent final verification
- approval/precondition gates for consequential side effects
- no loop, or observable feedback, metric/rubric, guard, bounded iterations, keep/discard rule, and stop condition

## 5. Smoke Eval Shape

Use compact cases at the selected risk depth:

```yaml
id: unique-case-id
risk: low|medium|high|critical
scenario:
  intent: user goal
  context: { files: [], sources: [], capabilities: [] }
  condition: normal|missing_context|boundary|adversarial|regression
oracle:
  must: [required behavior]
  must_not: [forbidden behavior]
runner: capability-limited executor
judge: deterministic check or stated rubric
trace: required trajectory evidence or none
gate: pass/fail and ship decision
```

The maintained regression surface is `../assets/evals/docs-maker.jsonl`. Run or manually exercise every changed behavior against that fixture before completion. Do not rewrite expected behavior merely to make a candidate pass; add newly observed failures as regression cases.

## 6. Readback and Bilingual Gate

Read the document as a new maintainer, an agent under context pressure, and a reviewer seeking stale, unsupported, mixed-concern, future-dated, or authority-conflicting claims. Fail when the validation path requires unrelated-file searching.

Check English/Korean mirrors for equivalent contract fields, route conditions, loop/runtime behavior, phase order, risk depth, gates, and representative behavioral cases—not file presence alone.

Compare `../assets/evals/docs-maker.jsonl` with `../assets/evals/docs-maker.ko.jsonl` by scenario type, expected route, required/forbidden behavior, trace, and gate. IDs and prose may be localized; behavioral coverage may not disappear.

## 7. Reviewer Quick Gate

Fail or block the document when any condition is true:

- canonical docs present fixed model literals or runtime-only syntax as universal
- provider-sensitive/current claims lack appropriate evidence, provenance, or non-future dates
- retrieved content, tool output, or subagent output is treated as instruction authority
- a required capability silently reduces requested scope, or consequential effects lack authority/gates
- a loop is unbounded, self-graded only, baseline-changing, or keeps a failed-guard result
- harness docs omit in-scope scenario/oracle/runner/judge/trace/gate coverage
- English/Korean mirrors expose incompatible behavioral contracts
