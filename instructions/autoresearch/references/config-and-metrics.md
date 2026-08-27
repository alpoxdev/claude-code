# Autoresearch Config and Metrics

> Korean version: [`config-and-metrics.ko.md`](config-and-metrics.ko.md)

Config quality determines whether iterations are comparable and whether “better” means the intended outcome. The universal rule is not one statistic or command layout; it is a predeclared, falsifiable decision contract matched to the metric class.

## 1. Required config fields

| Field | Required content |
|---|---|
| Goal | Outcome/question, success predicate, and terminal condition |
| Scope | Owned include/exclude paths and protected state |
| Metric | Profile, name/type/unit, direction or comparator, workload/population, and result schema |
| Acceptance | `improved`, `tie`, `inconclusive`, `regressed` rule plus any secondary criterion |
| Verify | Procedure identity, expected typed result, timeout, and failure classification |
| Guard | Mandatory predicates, baseline status, timeout, and fail-closed behavior |
| Evidence | Raw observation, aggregate/verdict, relevant confounders, and artifact identities |
| Budget | Iteration and applicable wall-time/cost/resource bounds |
| Stop | Goal, plateau/failure, safety, and interrupt behavior |
| Authorization | Local/external actions, credentials/data policy, and approval boundaries |

The metric runner, parser, workload, rubric, fixtures, and guard definitions stay outside writable optimization scope or are hash-verified before and after each candidate.

## 2. Measurement profiles

Choose one profile before deciding warmup, repeats, aggregation, or judging.

| Profile | Minimum defensible contract |
|---|---|
| `exact-deterministic` | One valid observation may be enough. Unexpected variation is an error to investigate. |
| `cold-start` | Preserve startup/cache state; warmup would invalidate the estimand. Define reset/isolation between trials. |
| `noisy-performance` | Define estimand, independent replicate, comparison order, aggregation/statistical method, practical effect or tie band, uncertainty/stability evidence, and inconclusive state. |
| `stochastic-model` | Record relevant platform/software/data identity and randomness controls; use independent runs/seeds when across-run variance affects the decision. A fixed seed alone does not estimate variance. |
| `subjective-judge` | Lock rubric and items, identify judge provenance, counterbalance presentation, preserve raw judgments, and define tie/abstain/invalid/disagreement escalation. |

Conditional techniques are not runtime-neutral requirements:

- Warm up only for a declared steady-state estimand.
- Choose repeat count from observed noise, target resolution, budget, and method; do not impose one `N` across profiles.
- Choose aggregation by estimand: minimum for a justified lower-bound model, median for a robust center, mean for expected cost, or domain-specific percentile/verdict.
- Randomize or interleave candidate/frontier order when independent trials may be confounded by temporal drift. Do not interleave when state carry-over changes the workload.
- CPU affinity/isolation, frequency control, and GC control are optional noise mitigations. Use them only when they preserve the workload being claimed.

For noisy claims, preserve raw valid observations and report stability/uncertainty appropriate to the method. Statistical significance alone is not a keep rule; large samples can make operationally irrelevant effects detectable. A universal nonzero threshold is also wrong—declare a task-specific effect, tie, or exact monotonic rule.

## 3. Adaptive optimization and multiple objectives

Repeatedly selecting winners against one benchmark can overfit the evaluator even when individual estimates are precise.

- Use a development metric for iteration and an immutable confirmation set for finalists or at a bounded cadence when adaptive reuse is material.
- Do not feed detailed holdout failures back into the loop.
- Re-baseline when relevant tool, model, data, workload, parser, or environment identity changes.
- Report every component of a multi-objective result.

Predeclare one multi-objective comparator:

- **Lexicographic**: mandatory priority order.
- **Scalarized**: fixed units/normalization/weights; never include critical safety or correctness guards in a compensable score.
- **Pareto**: retain non-dominated candidates under a declared selection rule.

Mixed lower/higher metrics without a comparator are not a metric.

## 4. Metric and guard result channels

Metric and guard are logically independent acceptance channels, but they do not need separate process invocations. One verifier is valid when its structured result distinguishes execution status, metric status/value, and every mandatory guard's `pass`, `fail`, or `error` status.

```json
{
  "execution": {"status": "complete"},
  "metric": {"status": "ok", "name": "coverage_percent", "value": 91.4},
  "guards": [
    {"id": "critical_tests", "status": "pass"},
    {"id": "secret_leak", "status": "pass"}
  ]
}
```

Invariants:

- Metric improvement cannot compensate for a failed, errored, missing, or malformed mandatory guard.
- Guard pass is not inferred from the score or process exit alone.
- Invalid schema, missing fields, non-finite metrics, interruption, timeout, or infrastructure failure blocks keep and remains a distinct error.
- A diagnostic metric may be retained after guard failure, but the candidate is not kept.
- If a shell pipeline is unavoidable, capture every stage status and enable failure propagation. Never accept a value from a failed producer.
- Exit `0` means the configured verifier completed successfully, not that the candidate improved; the harness compares evidence to the frontier.

Separate metric/guard commands remain valid when isolation is simpler. A combined verifier is useful when one expensive run produces both channels against exactly the same snapshot.

## 5. Guard design

Run mandatory guards on the baseline before optimization and on each candidate before keep.

Each guard declares:

- stable ID and purpose
- procedure/check identity and expected evidence
- baseline result
- pass/fail/error semantics
- timeout and resource bound
- hard threshold or predicate

Detect deleted/skipped tests, changed fixtures/workloads, sample-count drift, verifier tampering, and retry laundering. No silent retry turns a failure into a pass.

## 6. Subjective goals

Do not force subjective quality into an invented scalar. Use representative items and a locked rubric with anchors, weights, and critical vetoes.

Required reliability controls:

- Hide candidate identity, author/model, branch, score history, and irrelevant presentation metadata.
- Randomize item order and evaluate pairwise candidates in both A/B and B/A order when position bias is relevant.
- Support `tie`, `abstain`, `invalid`, and `inconclusive`; never force a winner.
- Record judge family/provider/model/prompt/rubric versions and decoding parameters that affect judgment.
- Multiple calls to the same model are repeated measures, not independent judges. Record the actual independence basis.
- Preserve each raw judgment and the aggregation inputs. Report agreement/order consistency, not only majority.
- Calibrate model/panel judgments against blinded human labels at a predeclared cadence or threshold. Escalate low-agreement or order-inconsistent cases.
- Identify self-judgment. It cannot satisfy an independent-judge guard.

Delete streak rules such as “the same candidate wins three times.” Convergence means no predeclared practically meaningful validation improvement over a defined window, with reliability controls still passing.

Primary methodological references used for this contract include [Google Benchmark](https://google.github.io/benchmark/user_guide.html), [Go benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat), [NIST randomized block designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm), [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices), and the [MT-Bench judge-bias study](https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html).
