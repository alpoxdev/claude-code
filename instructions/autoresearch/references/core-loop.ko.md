# Autoresearch Core Loop

> 영어판: [`core-loop.md`](core-loop.md)

Core loop는 비교 가능한 시도와 신뢰할 수 있는 frontier를 만든다. Command 하나가 통과한 것만으로는 부족하다. Run은 hypothesis, owned change, measurement contract, guard, decision, restoration, cleanup evidence를 함께 묶어야 한다.

## 1. Loop contract

| Stage | 필수 상태 전환 |
|---|---|
| Preflight | Effective config, authority, run ID, ownership, 관련 confounder, budget, procedure identity를 고정한다. |
| Baseline | Immutable 시작 snapshot을 유효한 metric과 guard evidence에 연결한다. |
| Hypothesis | 현재 frontier에서 파생된 falsifiable logical change 하나를 선택한다. |
| Checkpoint | Frontier를 전진시키지 않은 채 실행 전 candidate와 owned diff를 저장한다. |
| Verify | 설정한 measurement profile로 typed metric 또는 judge evidence를 만든다. |
| Guard | 각 mandatory non-compensable constraint를 평가한다. |
| Decide | `keep`, `tie`, `discard`, `inconclusive` 또는 typed error로 분류한다. |
| Restore | Keep이 아니면 experiment-owned candidate 상태만 compare-before-restore한다. |
| Record | Evidence, result row/event, frontier, cleanup, rollback receipt를 atomic하게 확정한다. |
| Stop/Handoff | Goal, budget, plateau/failure, safety, interrupt rule을 적용하고 revalidation이 가능할 때만 resumable state를 공개한다. |

Mutable workspace 하나는 writer 하나가 소유한다. Concurrent run은 서로 다른 run ID, workspace, retained ref/snapshot을 사용한다. Linked worktree도 repository state를 공유한다. [`safety-and-observability.ko.md`](safety-and-observability.ko.md)를 참고한다.

## 2. Iteration identity and atomic change

각 iteration은 최소한 다음을 묶는다.

```yaml
RunId: "run-opaque-id"
Iteration: 7
HypothesisId: "reduce-query-allocation"
FrontierId: "immutable-snapshot-id"
OwnedPaths: ["src/query/**"]
CandidateSnapshot: "content-addressed-id"
```

규칙:

- “Atomic”은 파일, command, commit 하나가 아니라 falsifiable hypothesis 하나를 뜻한다.
- Verify 전에 모든 changed path가 owned, in-scope, hypothesis-attributable인지 확인한다.
- 기존 사용자 변경과 concurrent user change는 사용자 소유다. Owned path가 기대한 post-mutation state와 달라지면 덮어쓰지 말고 중단한다.
- Crash 뒤 candidate fix는 새 iteration이다. 단, 같은 candidate/environment로 수행하는 사전 정의된 infrastructure-only retry는 예외다.
- Commit은 commit이 명시적으로 승인되고 user history와 분리됐을 때만 candidate snapshot으로 사용할 수 있다. 그렇지 않으면 coverage를 선언한 content snapshot 또는 patch package를 사용한다.

## 3. Baseline, frontier, and comparison

Baseline은 initial immutable state와 valid evidence다. Frontier는 가장 최근 accepted immutable state다. 모든 candidate는 파생된 frontier를 명시한다.

각 frontier에는 다음을 보존한다.

- snapshot identity and digest
- metric definition, raw observation, aggregate/verdict, producing procedure
- mandatory guard definition and result
- relevant configuration/environment identity
- accepted iteration and decision evidence

Noisy candidate를 오래된 single baseline과 비교하지 않는다. [`config-and-metrics.ko.md`](config-and-metrics.ko.md)의 profile을 사용한다. Exact deterministic check는 valid observation 하나로 충분할 수 있지만 noisy, stochastic, cold-start, subjective evaluation은 선언한 comparison design을 따라야 한다.

## 4. Decision model

Keep invariant:

```text
keep = trustworthy_execution
  AND valid_metric_or_judgment
  AND acceptance_rule_passes
  AND every_mandatory_guard == pass
  AND scope_and_ownership_valid
  AND cleanup_complete
```

| Outcome | Frontier | 필수 조치 |
|---|---|---|
| `keep` | Candidate로 전진 | Accepted evidence와 새 frontier identity를 저장한다. |
| `tie` | 유지 | 설정한 tie rule을 기록한다. Predeclared secondary criterion이 독립적으로 이긴 경우에만 keep할 수 있다. |
| `discard` | 유지 | Owned candidate를 frontier로 복원하고 restoration receipt를 검증한다. |
| `inconclusive` | 유지 | Raw evidence를 보존하고 uncertainty를 win으로 바꾸지 않는다. |
| `patch-no-op` | 유지 | Owned diff가 없음을 기록한다. |
| `metric-error` / invalid / NaN | 유지 | Fail closed하고 parser/raw evidence를 보존한다. |
| `guard-failed` / `guard-error` | 유지 | Diagnostic metric이 유효하면 보존하되 keep하지 않는다. |
| `candidate-crash` / `timeout` / `signaled` / OOM | 유지 | Typed procedure outcome, cleanup, rollback을 기록한다. |
| `infra-flake` | 유지 | Predeclared identical-candidate policy에서만 retry한다. |
| `hook-blocked` / `safety-stop` | 유지 | 이미 승인되고 scope 안인 다른 path만 사용할 수 있으며 아니면 중단한다. |
| `cleanup-error` / `rollback-error` | 유지 | Keep과 automatic resume를 차단한다. |

Exit code, metric parse, guard failure, timeout, signal, infrastructure failure는 서로 다른 state다. Interrupted procedure의 stdout에서 값 일부를 parse할 수 있어도 성공이 아니다.

## 5. Stop and terminalization

적용할 stop rule을 미리 선언한다.

- goal predicate satisfied
- maximum iterations
- maximum wall time, cost, or resource budget
- defined cadence와 acceptance rule을 사용하는 accepted frontier value의 plateau
- repeated invalid-run 또는 infrastructure-failure limit
- in-scope falsifiable hypothesis가 남지 않음
- Verify 또는 Guard를 더는 신뢰할 수 없음
- scope, ownership, authorization, safety boundary를 넘어야 함
- user interrupt

모든 terminal path는 다음을 수행해야 한다.

1. unfinished candidate를 frontier로 올리지 않는다.
2. rollback과 cleanup을 완료하거나 실패를 보고한다.
3. stop reason과 last finalized iteration을 atomic하게 기록한다.
4. frontier와 decisive evidence identity를 저장한다.
5. Mandatory revalidation을 통과할 수 있을 때만 `handoff.json`을 `resumable`로 공개하고, 아니면 `manual_recovery` 또는 `non_resumable`로 표시한다.

## 6. Output and evidence

최소 output directory:

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

`results.tsv`는 index이지 complete evidence record가 아니다. 권장 core column:

```tsv
run_id iteration hypothesis_id frontier_id candidate_id outcome metric_summary guard_summary evidence_ref description
```

Exact command, exit code, signal, timeout, duration은 process procedure에서 필요하고 material할 때 기록한다. Human, model, rubric, API, panel judge는 typed procedure outcome을 사용한다. Full environment나 secret을 저장하지 않고 allowlisted outcome-affecting input과 redacted identity만 기록한다.

Resumable handoff는 schema/generation, run/workspace identity, immutable frontier, explicit candidate state, cursor, effective config, relevant environment, metric/guard evidence, artifact, ownership, cleanup, rollback, redaction status, mandatory resume check를 묶는다. 빠진 state를 추론하지 않는다.
