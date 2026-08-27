# Autoresearch Core Loop

> Korean version: [`core-loop.ko.md`](core-loop.ko.md)

The core loop produces comparable attempts and a trustworthy frontier. A passing command alone is not enough: the run must bind the hypothesis, owned change, measurement contract, guard, decision, restoration, and cleanup evidence.

## 1. Loop contract

| Stage | Required state transition |
|---|---|
| Preflight | Freeze effective config, authority, run ID, ownership, relevant confounders, budgets, and procedure identities. |
| Baseline | Bind an immutable starting snapshot to valid metric and guard evidence. |
| Hypothesis | Select one falsifiable logical change derived from the current frontier. |
| Checkpoint | Persist the candidate and its owned diff before execution without advancing the frontier. |
| Verify | Produce typed metric or judge evidence using the configured measurement profile. |
| Guard | Evaluate each mandatory non-compensable constraint. |
| Decide | Classify `keep`, `tie`, `discard`, `inconclusive`, or a typed error. |
| Restore | For non-keep, compare-before-restore only the experiment-owned candidate state. |
| Record | Atomically finalize evidence, result row/event, frontier, cleanup, and rollback receipt. |
| Stop/Handoff | Apply goal, budget, plateau/failure, safety, and interrupt rules; publish resumable state only when revalidation is possible. |

One writer owns a mutable workspace. Concurrent runs use distinct run IDs, workspaces, and retained refs/snapshots. Linked worktrees still share repository state; see [`safety-and-observability.md`](safety-and-observability.md).

## 2. Iteration identity and atomic change

Each iteration binds at least:

```yaml
RunId: "run-opaque-id"
Iteration: 7
HypothesisId: "reduce-query-allocation"
FrontierId: "immutable-snapshot-id"
OwnedPaths: ["src/query/**"]
CandidateSnapshot: "content-addressed-id"
```

Rules:

- “Atomic” means one falsifiable hypothesis, not one file, command, or commit.
- Before Verify, assert that every changed path is owned, in scope, and attributable to the hypothesis.
- Pre-existing and concurrent user changes remain user-owned. If an owned path diverges from the expected post-mutation state, stop instead of overwriting it.
- Candidate fixes after a crash are new iterations unless the retry is a predeclared infrastructure-only retry of the identical candidate and environment.
- A commit may be a candidate snapshot only when commits are explicitly authorized and isolated from user history. Otherwise use a coverage-declared content snapshot or patch package.

## 3. Baseline, frontier, and comparison

The baseline is the initial immutable state plus its valid evidence. The frontier is the latest accepted immutable state. Every candidate names the frontier from which it was derived.

For each frontier preserve:

- snapshot identity and digest
- metric definition, raw observations, aggregate/verdict, and producing procedure
- mandatory guard definition and result
- relevant configuration/environment identity
- accepted iteration and decision evidence

Do not compare a noisy candidate to a stale single baseline. Use the profile in [`config-and-metrics.md`](config-and-metrics.md): exact deterministic checks may need one valid observation; noisy, stochastic, cold-start, and subjective evaluations require their declared comparison design.

## 4. Decision model

The keep invariant is:

```text
keep = trustworthy_execution
  AND valid_metric_or_judgment
  AND acceptance_rule_passes
  AND every_mandatory_guard == pass
  AND scope_and_ownership_valid
  AND cleanup_complete
```

| Outcome | Frontier | Required action |
|---|---|---|
| `keep` | Advance to candidate | Persist accepted evidence and new frontier identity. |
| `tie` | Unchanged | Record the configured tie rule; keep only if a predeclared secondary criterion independently wins. |
| `discard` | Unchanged | Restore the owned candidate to the frontier and verify a restoration receipt. |
| `inconclusive` | Unchanged | Preserve raw evidence; do not convert uncertainty into a win. |
| `patch-no-op` | Unchanged | Record that no owned diff exists. |
| `metric-error` / invalid / NaN | Unchanged | Fail closed; preserve parser/raw evidence. |
| `guard-failed` / `guard-error` | Unchanged | Preserve diagnostic metric if valid, but never keep. |
| `candidate-crash` / `timeout` / `signaled` / OOM | Unchanged | Record typed procedure outcome, cleanup, and rollback. |
| `infra-flake` | Unchanged | Retry only under the predeclared identical-candidate policy. |
| `hook-blocked` / `safety-stop` | Unchanged | Use another path only if already authorized and in scope; otherwise stop. |
| `cleanup-error` / `rollback-error` | Unchanged | Block keep and automatic resume. |

Exit code, metric parsing, guard failure, timeout, signal, and infrastructure failure are different states. A parseable partial stdout value does not make an interrupted procedure successful.

## 5. Stop and terminalization

Predeclare applicable stop rules:

- goal predicate satisfied
- maximum iterations
- maximum wall time, cost, or resource budget
- plateau over accepted frontier values using a defined cadence and acceptance rule
- repeated invalid-run or infrastructure-failure limit
- no in-scope falsifiable hypothesis remains
- Verify or Guard is no longer trustworthy
- scope, ownership, authorization, or safety boundary would be crossed
- user interrupt

Every terminal path must:

1. leave no unfinished candidate promoted to frontier;
2. finish or report rollback and cleanup;
3. atomically record the stop reason and last finalized iteration;
4. persist frontier and decisive evidence identities;
5. publish `handoff.json` only as `resumable` when mandatory revalidation can succeed, otherwise mark `manual_recovery` or `non_resumable`.

## 6. Output and evidence

Minimum output directory:

```text
autoresearch/{mode}-{run_id}/
├── events.jsonl
├── results.tsv
├── summary.md
├── handoff.json
├── environment.json
├── artifacts.manifest.json
└── raw/
```

`results.tsv` is an index, not the complete evidence record. Recommended core columns:

```tsv
run_id iteration hypothesis_id frontier_id candidate_id outcome metric_summary guard_summary evidence_ref description
```

Exact commands, exit codes, signals, timeouts, and durations are required for process procedures when material. Human, model, rubric, API, and panel judges use typed procedure outcomes instead. Never persist full environments or secrets; record only allowlisted outcome-affecting inputs and redacted identities.

A resumable handoff binds schema/generation, run and workspace identity, immutable frontier, explicit candidate state, cursor, effective config, relevant environment, metric/guard evidence, artifacts, ownership, cleanup, rollback, redaction status, and mandatory resume checks. Missing state is not inferred.
