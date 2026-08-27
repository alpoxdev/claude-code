# Autoresearch Config and Metrics

> 영어판: [`config-and-metrics.md`](config-and-metrics.md)

Config 품질은 iteration을 비교할 수 있는지, “개선”이 의도한 결과를 뜻하는지를 결정한다. Universal rule은 특정 통계값이나 command layout이 아니라 metric class에 맞춘 사전 정의된 falsifiable decision contract다.

## 1. Required config fields

| Field | 필수 내용 |
|---|---|
| Goal | Outcome/question, success predicate, terminal condition |
| Scope | Owned include/exclude path와 protected state |
| Metric | Profile, name/type/unit, direction 또는 comparator, workload/population, result schema |
| Acceptance | `improved`, `tie`, `inconclusive`, `regressed` rule과 secondary criterion |
| Verify | Procedure identity, expected typed result, timeout, failure classification |
| Guard | Mandatory predicate, baseline status, timeout, fail-closed behavior |
| Evidence | Raw observation, aggregate/verdict, 관련 confounder, artifact identity |
| Budget | Iteration과 적용 가능한 wall-time/cost/resource bound |
| Stop | Goal, plateau/failure, safety, interrupt behavior |
| Authorization | Local/external action, credential/data policy, approval boundary |

Metric runner, parser, workload, rubric, fixture, guard definition은 writable optimization scope 밖에 두거나 candidate 전후 hash로 검증한다.

## 2. Measurement profiles

Warmup, repeat, aggregation, judging 방식을 정하기 전에 profile을 선택한다.

| Profile | 최소 계약 |
|---|---|
| `exact-deterministic` | Valid observation 하나로 충분할 수 있다. 예상치 못한 variation은 조사할 error다. |
| `cold-start` | Startup/cache state를 보존한다. Warmup은 estimand를 무효화한다. Trial 사이 reset/isolation을 정의한다. |
| `noisy-performance` | Estimand, independent replicate, comparison order, aggregation/statistical method, practical effect 또는 tie band, uncertainty/stability evidence, inconclusive state를 정의한다. |
| `stochastic-model` | 관련 platform/software/data identity와 randomness control을 기록한다. Across-run variance가 decision에 영향을 주면 independent run/seed를 사용한다. Fixed seed 하나는 variance estimate가 아니다. |
| `subjective-judge` | Rubric과 item을 고정하고 judge provenance, counterbalanced presentation, raw judgment, tie/abstain/invalid/disagreement escalation을 정의한다. |

다음 기법은 conditional이지 runtime-neutral requirement가 아니다.

- Warmup은 declared steady-state estimand에만 사용한다.
- Repeat count는 observed noise, target resolution, budget, method로 정하며 profile 전체에 하나의 `N`을 강제하지 않는다.
- Aggregation은 estimand에 맞춘다. 정당한 lower-bound model은 minimum, robust center는 median, expected cost는 mean, 또는 domain-specific percentile/verdict를 쓴다.
- Independent trial이 temporal drift에 교란될 수 있으면 candidate/frontier 순서를 randomize하거나 interleave한다. State carry-over가 workload를 바꾸면 interleave하지 않는다.
- CPU affinity/isolation, frequency control, GC control은 optional noise mitigation이다. 주장하려는 workload를 보존할 때만 사용한다.

Noisy claim은 raw valid observation을 보존하고 method에 맞는 stability/uncertainty를 보고한다. Statistical significance만으로 keep하지 않는다. Universal nonzero threshold도 잘못이다. Task-specific effect, tie, 또는 exact monotonic rule을 선언한다.

## 3. Adaptive optimization and multiple objectives

하나의 benchmark에서 winner를 반복 선택하면 개별 estimate가 정밀해도 evaluator에 overfit할 수 있다.

- Adaptive reuse가 중요하면 iteration에는 development metric을 쓰고 finalist 또는 제한된 cadence에는 immutable confirmation set을 사용한다.
- Holdout의 상세 failure를 loop에 다시 주입하지 않는다.
- 관련 tool, model, data, workload, parser, environment identity가 바뀌면 re-baseline한다.
- Multi-objective result의 모든 component를 보고한다.

Multi-objective comparator 하나를 미리 선언한다.

- **Lexicographic**: mandatory priority order.
- **Scalarized**: fixed unit/normalization/weight. Critical safety/correctness guard를 compensable score에 넣지 않는다.
- **Pareto**: declared selection rule 아래 non-dominated candidate를 보존한다.

Comparator가 없는 mixed lower/higher metric은 metric이 아니다.

## 4. Metric and guard result channels

Metric과 guard는 논리적으로 독립된 acceptance channel이지만 별도 process invocation이 필요하지는 않다. 하나의 verifier를 사용할 때는 structured result가 execution status, metric status/value, 모든 mandatory guard의 `pass`, `fail`, `error` status를 구분해야 한다.

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

Invariant:

- Metric improvement는 failed, errored, missing, malformed mandatory guard를 상쇄하지 못한다.
- Guard pass를 score나 process exit만으로 추론하지 않는다.
- Invalid schema, missing field, non-finite metric, interruption, timeout, infrastructure failure는 keep을 차단하고 distinct error로 남긴다.
- Guard failure 뒤 valid diagnostic metric을 보존할 수는 있지만 candidate는 keep하지 않는다.
- Shell pipeline이 불가피하면 모든 stage status를 저장하고 failure propagation을 켠다. Failed producer의 값을 accept하지 않는다.
- Exit `0`은 configured verifier가 성공적으로 완료됐다는 뜻이지 candidate가 개선됐다는 뜻이 아니다. Harness가 evidence를 frontier와 비교한다.

Isolation이 더 단순하면 separate metric/guard command도 유효하다. One combined verifier는 expensive run 하나가 같은 snapshot에 대해 두 channel을 모두 만들 때 유용하다.

## 5. Guard design

Mandatory guard는 optimization 전 baseline과 keep 전 candidate에서 실행한다.

각 guard는 다음을 선언한다.

- stable ID and purpose
- procedure/check identity and expected evidence
- baseline result
- pass/fail/error semantics
- timeout and resource bound
- hard threshold or predicate

Deleted/skipped test, changed fixture/workload, sample-count drift, verifier tampering, retry laundering을 탐지한다. Silent retry로 failure를 pass로 바꾸지 않는다.

## 6. Subjective goals

Subjective quality에 invented scalar를 억지로 붙이지 않는다. Representative item과 anchor, weight, critical veto를 가진 locked rubric을 사용한다.

필수 reliability control:

- Candidate identity, author/model, branch, score history, 불필요한 presentation metadata를 숨긴다.
- Position bias가 중요하면 item order를 randomize하고 pairwise candidate를 A/B와 B/A 순서 모두에서 평가한다.
- `tie`, `abstain`, `invalid`, `inconclusive`를 지원하며 winner를 강제하지 않는다.
- Judgment에 영향을 주는 judge family/provider/model/prompt/rubric version과 decoding parameter를 기록한다.
- 같은 model을 여러 번 호출한 것은 repeated measure이지 independent judge가 아니다. 실제 independence basis를 기록한다.
- 각 raw judgment와 aggregation input을 보존한다. Majority뿐 아니라 agreement/order consistency를 보고한다.
- 사전 정의한 cadence 또는 threshold로 model/panel judgment를 blinded human label에 calibration한다. Low-agreement 또는 order-inconsistent case는 escalate한다.
- Self-judgment를 식별한다. Self-judgment는 independent-judge guard를 만족하지 못한다.

“같은 candidate가 3회 연속 승리” 같은 streak rule은 삭제한다. Convergence는 defined window에서 predeclared practically meaningful validation improvement가 더 없고 reliability control이 계속 통과하는 상태다.

이 계약의 주요 methodological reference는 [Google Benchmark](https://google.github.io/benchmark/user_guide.html), [Go benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat), [NIST randomized block designs](https://www.itl.nist.gov/div898/handbook/pri/section3/pri332.htm), [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices), [MT-Bench judge-bias study](https://proceedings.neurips.cc/paper_files/paper/2023/hash/91f18a1287b398d378ef22505bf41832-Abstract-Datasets_and_Benchmarks.html)다.
