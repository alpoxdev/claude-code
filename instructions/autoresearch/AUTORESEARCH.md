# Autoresearch Instructions

> Korean version: [`AUTORESEARCH.ko.md`](AUTORESEARCH.ko.md)

Autoresearch is a bounded improvement loop whose attempts are comparable, reversible within owned state, and auditable. It is not a synonym for “keep trying.” This document is a runtime-neutral design standard; it does not require installing or invoking an external autoresearch runtime.

## Core contract

| Primitive | Required rule |
|---|---|
| Goal | State the outcome or question and the stop predicate. |
| Scope | Declare owned paths/resources and exclusions. Treat pre-existing changes as user-owned unless explicitly assigned. |
| Metric | Define the measured outcome, direction, comparison rule, and evidence shape. |
| Verify | Run the faithful measurement or evaluation procedure. |
| Guard | Required for mutating loops. Keep it independent from the improvement decision; if no guard applies, record why. |
| Budget | Bound iterations and, where material, wall time, cost, or resources. |
| Log | Record every attempt, including invalid, blocked, failed, tied, and inconclusive outcomes. |
| Decision | Advance the frontier only when evidence satisfies the predeclared acceptance rule and every mandatory guard passes. |
| Recovery | Restore only experiment-owned candidate state from a coverage-declared checkpoint; never overwrite user-owned work. |
| Handoff | Persist enough typed state to stop safely and, when promised, resume after revalidation. |

One iteration tests one falsifiable hypothesis. A hypothesis may touch several files, but unrelated edits invalidate attribution.

## Evidence snapshot

> Sources checked 2026-08-27. Upstream behavior is pinned to the revisions below; floating repository pages are discovery aids, not evidence of a stable interface.

- [Karpathy `autoresearch` at `228791f`](https://github.com/karpathy/autoresearch/tree/228791fb499afffb54b46200aca536f79142f117) demonstrates a narrow research loop: the agent edits only `train.py`, trains for a fixed five-minute **training** budget excluding startup and compilation, minimizes `val_bpb`, and logs keep/discard/crash outcomes. Its approximately 12 experiments/hour and 100 overnight are estimates, not throughput guarantees. Results are platform-specific.
- [`uditgoenka/autoresearch` v2.2.2 at `050e30d`](https://github.com/uditgoenka/autoresearch/tree/050e30dc4ba0974b03f2873111b9901ec3211390) exposes 14 commands. Its nine named Claude Code hook programs cover defense-in-depth safety, context, lifecycle, quality, and notification; Codex and OpenCode do not have hook parity. Chain commands write `handoff.json`; iteration analysis uses `*-results.tsv`.
- [OpenAI skill evaluation guidance](https://developers.openai.com/blog/eval-skills) distinguishes outcome, process, style, and efficiency. These are evaluation dimensions, not a mandatory scalar score or a contract for the unrelated legacy OpenAI Evals platform.

Runtime invocation syntax is not portable:

- Claude Code: `/autoresearch` and `/autoresearch:<name>`
- OpenCode: `/autoresearch_<name>`
- Codex: `$autoresearch <subcommand>`, for example `$autoresearch debug`

These upstream interfaces are evidence and examples. Repository authority, safety rules, and explicit user instructions remain controlling.

## Base loop

1. **Preflight**: freeze effective config, authority, scope, ownership, relevant confounders, and budgets.
2. **Baseline**: run Verify and Guard against an immutable starting state. Stop if either procedure is untrustworthy.
3. **Hypothesis**: choose one falsifiable change and bind it to the current frontier.
4. **Checkpoint**: create an ownership-scoped, restoration-tested candidate snapshot. A commit is allowed only when explicitly authorized and must not rewrite user history.
5. **Execute**: run the declared procedure and preserve raw evidence.
6. **Guard**: evaluate mandatory non-compensable constraints.
7. **Decide**: keep, tie, discard, or mark inconclusive/error using the configured profile.
8. **Restore**: on non-keep, restore only owned candidate state and verify the restoration receipt.
9. **Record**: atomically persist the outcome, evidence identities, cleanup, and frontier state.
10. **Stop or continue**: enforce the goal predicate, budget, plateau/failure rules, user interrupt, and safety gates.

The detailed executable contract is in [`references/core-loop.md`](references/core-loop.md).

## Minimum configuration

```yaml
Goal: "Reduce p95 latency without changing responses"
Scope:
  Include: ["src/query/**"]
  Exclude: ["migrations/**", "secrets/**"]
Metric:
  Profile: "noisy-performance"
  Name: "p95_latency_ms"
  Direction: "lower_is_better"
  Decision: "predeclared paired comparison with inconclusive state"
Verify: "node scripts/measure-query.mjs --json"
Guard: "npm test && npm run typecheck"
Budget:
  MaxIterations: 12
Artifacts: "autoresearch/query-latency-{run_id}/"
SideEffects: "local-only"
```

Do not copy this measurement profile mechanically. Exact deterministic checks, cold-start measurements, noisy performance benchmarks, stochastic model runs, and subjective judges need different protocols. See [`references/config-and-metrics.md`](references/config-and-metrics.md).

## Command-family interpretation

The command family is a set of reusable loop archetypes, not one universal command namespace:

- Plan, Debug, Fix, Reason, Probe, Learn, Predict, Improve
- Scenario discovery and saturation
- Iteration analytics over recorded results
- Regression verification and security review
- Ship readiness and separately approved finalization
- Bare-command routing between classic, orchestrated, and guided setup modes

See [`references/command-family.md`](references/command-family.md). Scenario discovery does not prove implementation coverage; retained scenarios must become project-owned tests or acceptance checks.

## Safety and authority

- Normal scoped local reads, edits, and verification follow repository policy.
- Credential use, external data transmission, destructive actions, commits/releases, remote writes, deploy/publish/push, and production access require the authorization defined by the controlling instructions. An upstream `--auto` flag is not user approval.
- Network reads are not automatically safe: a request can exfiltrate repository or secret data. Use an explicit destination/data policy.
- A linked worktree isolates working files, index, and `HEAD`, but shares most refs, repository configuration by default, hooks, and the object database. It is not a security boundary.
- Detached `HEAD` is valid for read-only or intentionally disposable work. Retained state needs a verified run-owned ref or immutable snapshot.
- Irreversible external actions do not belong inside the iterative loop. Move an exact approved action to a separate finalization gate with target verification and post-checks.
- A metric improvement never compensates for a failed, unavailable, or malformed mandatory guard.

See [`references/safety-and-observability.md`](references/safety-and-observability.md).

## Related documents

- [`references/core-loop.md`](references/core-loop.md)
- [`references/config-and-metrics.md`](references/config-and-metrics.md)
- [`references/command-family.md`](references/command-family.md)
- [`references/safety-and-observability.md`](references/safety-and-observability.md)
- [`../context-engineering/CONTEXT_ENGINEERING.md`](../context-engineering/CONTEXT_ENGINEERING.md)
- [`../harness-engineering/HARNESS_ENGINEERING.md`](../harness-engineering/HARNESS_ENGINEERING.md)
- [`../validation/index.md`](../validation/index.md)
- [`../sourcing/reliable-search.md`](../sourcing/reliable-search.md)

Local research artifacts may exist in ignored runtime directories, but this document does not claim a specific cache path is ignored or portable. The pinned URLs and repository evidence above are the source record.
