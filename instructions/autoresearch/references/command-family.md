# Autoresearch Command Family

> Korean version: [`command-family.ko.md`](command-family.ko.md)

This document maps command-shaped upstream examples into runtime-neutral archetypes. It does not promise that every runtime exposes the same command name, syntax, hooks, or artifact set.

## Shared contract

Every archetype declares Goal, Scope, Verify/Evidence, Guard, Budget, Stop, and Authorization. A mutating loop follows:

```text
Preflight -> Baseline -> Hypothesis -> Checkpoint -> Verify -> Guard
-> Decide -> Restore if needed -> Record -> Stop/Handoff
```

The bare-command upstream surface may route among classic config-driven execution, goal-directed orchestration, and guided setup. Only archetypes with a trustworthy predicate loop automatically; subjective or terminal tasks may be single-pass or human-gated.

## Plan

Use for a broad goal that needs decomposition and measurable selection.

- Compare bounded plan candidates against one locked rubric or metric.
- Keep decision rationale and rejected alternatives.
- A plan does not authorize implementation or side effects.

## Debug

Use when the cause is unknown.

- Hypothesis -> minimal probe -> evidence -> keep/discard hypothesis.
- Preserve crash/timeout/parser/infra outcomes separately.
- A code fix is a new iteration after root-cause evidence, not an in-place rewrite of the failed probe.

## Fix

Use when a failure is reproducible.

- Pin the failing behavior first.
- Make one falsifiable change.
- Require the regression proof and mandatory guards to pass before keep.

## Reason

Use when the deliverable is a decision rather than code.

- Generate alternatives, assumptions, counterexamples, and disconfirming evidence.
- Lock decision criteria before ranking.
- Record unresolved uncertainty; do not manufacture a winner.

## Probe

Use for bounded feasibility or data gathering.

- Keep the probe reversible and isolated.
- Separate observed capability from production readiness.
- Promote retained findings into project-owned tests, docs, or a follow-up plan.

## Learn

Use to extract a reusable pattern from repeated evidence.

- Require more than one independent case or label the result provisional.
- Record scope and counterexamples.
- Do not turn one repository-specific incident into a universal rule.

## Predict

Use when a forecast can be scored later.

- Predeclare horizon, outcome schema, scoring rule, and resolution source.
- Timestamp predictions before outcomes are known.
- Never edit a forecast after resolution evidence appears.

## Improve

Use for an existing artifact with a faithful evaluator.

- Preserve baseline behavior and target one measured weakness.
- Treat style/quality scores as profile-specific evidence, not inherently objective numbers.
- Use an untouched confirmation set when repeated adaptation can overfit the evaluator.

## Scenario

Use when a seed feature, flow, or failure domain needs systematic edge-case coverage.

```text
seed -> coverage dimensions -> generate -> classify new/extension/duplicate
-> log -> saturation check -> repeat
```

- Bound dimensions and iterations.
- Stop at declared saturation or budget.
- Scenario discovery is not proof that implementation handles the scenario. Convert retained scenarios into project-owned tests or acceptance checks.

## Iteration analytics

Use to analyze `results.tsv` or equivalent recorded evidence.

- Detect trend, plateau, crash clusters, invalid runs, and promising hypotheses.
- Do not relabel previously finalized outcomes.
- Distinguish this local/upstream TSV analyzer from behavioral evals and from the legacy OpenAI Evals platform.

## Behavioral evals

Use when artifacts or agent traces need outcome, process, style, and efficiency evaluation.

- Lock cases, checks/rubrics, judge identities, and aggregation before candidates.
- Preserve trace/tool-call/handoff evidence when process is part of the claim.
- Apply the metric/judge reliability contract in [`config-and-metrics.md`](config-and-metrics.md).

## Regression

Use to test whether a changed state turns a green baseline red.

- Evaluate base and candidate in isolated owned state.
- Malformed, truncated, missing, or invalid evidence fails closed.
- List unavailable dimensions explicitly.
- Never report `STABLE` when no dimension produced an evaluable baseline.

## Security

Default to read-only review and proof. A finding is not authorization to fix, disclose, exploit, transmit, or access production.

- Pin trust boundaries and threat model.
- Separate verification from remediation.
- Route credentials, sensitive data, disclosure, and external actions through controlling authorization rules.

## Ship

Treat Ship as readiness verification followed by a separate finalization gate.

1. Run project-defined checks and inspect artifacts.
2. Report blockers and residual risk.
3. Stop before deploy, publish, push, release, destructive rollback, credential use, or production mutation unless the exact action is explicitly authorized.
4. Verify target identity and outcome after an authorized finalization action.

Repository override: an upstream `--auto` flag is not user approval.

## Handoff and chaining

Do not assume every command writes a handoff. In the pinned upstream v2.2.2 surface, chain commands write `handoff.json` and downstream commands consume it. Local runtimes may use different artifacts.

A handoff is automatically resumable only when it satisfies [`core-loop.md`](core-loop.md) and [`safety-and-observability.md`](safety-and-observability.md). A summary filename without immutable frontier, explicit candidate, evidence, ownership, cleanup, redaction, and revalidation state is not a resume contract.

## Sources

> Sources checked 2026-08-27. Upstream behavior is described at release v2.2.2, commit `050e30dc4ba0974b03f2873111b9901ec3211390`.

- [v2.2.2 release](https://github.com/uditgoenka/autoresearch/releases/tag/v2.2.2)
- [Pinned root skill and router](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/SKILL.md)
- [Pinned scenario archetype](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/scenario.md)
- [Pinned regression archetype](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/regression.md)
- [Pinned chains and handoff behavior](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/guide/chains-and-combinations.md)
- [OpenAI skill evaluation guidance](https://developers.openai.com/blog/eval-skills)
