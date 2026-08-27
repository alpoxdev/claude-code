# Autoresearch Safety and Observability

> 영어판: [`safety-and-observability.md`](safety-and-observability.md)

Autoresearch loop는 명시적인 authority, ownership, evidence boundary 안에서만 반복할 수 있다. Capability는 authorization이 아니며 rollback 동사 하나가 reversibility의 증거도 아니다.

## 1. Workspace identity and ownership

Baseline 전에 다음을 기록한다.

- stable repository/workspace identity and canonical root
- immutable starting state and current retained ref/snapshot
- run ID and artifact directory
- owned and excluded paths/resources
- pre-existing staged, unstaged, untracked, relevant ignored state
- active operation/lock state

Dirty tree를 acknowledge한 것은 observation을 허용할 뿐 mutation을 허용하지 않는다. 기존 path는 controlling request가 exact path를 명시적으로 할당하지 않는 한 사용자 소유다. Ownership이 겹치거나 불확실하면 original workspace를 read-only로 두고 owned scratch worktree, clone, container, content snapshot을 사용한다.

Write/delete 전에 real path와 symlink를 resolve한다. Ownership 밖 target은 safety stop이다.

## 2. Git isolation facts and policy

- Linked worktree는 working file, index, `HEAD`가 분리되지만 대부분의 ref, 기본 repository config, hook, remote, object database를 공유한다. 유용한 isolation이지만 security boundary가 아니다.
- Retained mutating work에는 unique run-owned branch/ref를 사용하고 other-worktree branch safeguard를 우회하지 않는다.
- Detached `HEAD`는 read-only inspection 또는 intentionally disposable experiment에 허용된다. Retained state가 unreachable해지기 전에 run-owned named ref 또는 immutable content snapshot으로 anchor하고 검증한다.
- Shared ref, common config, hook, remote, stash, maintenance state는 명시적으로 scope에 포함되고 별도 checkpoint가 없으면 수정하지 않는다.
- Commit은 index를 기록하지 whole workspace를 기록하지 않는다. Plain patch도 staged, untracked, ignored, binary, mode, symlink, submodule, external state를 빠뜨릴 수 있다. Checkpoint coverage를 선언한다.

공식 Git semantics: [`git-worktree`](https://git-scm.com/docs/git-worktree), [`git-reset`](https://git-scm.com/docs/git-reset), [`git-apply`](https://git-scm.com/docs/git-apply), [`git-checkout`](https://git-scm.com/docs/git-checkout#_detached_head).

## 3. Checkpoint and rollback

Checkpoint는 다음을 식별한다.

- base/frontier and candidate immutable state
- owned changed paths and refs
- 적용 가능한 tracked/staged/unstaged/untracked/binary/mode/symlink/submodule state coverage
- relevant non-Git files/resources and exclusions
- pre/post state fingerprint와 restoration procedure

Rollback은 run-owned candidate path/resource/ref만 recorded pre-iteration value로 복원하는 작업이다. **현재 값이 expected post-mutation state와 같을 때만** 실행하며 다르면 conflict로 중단한다.

Pre-existing/user-owned work를 자동으로 stash, clean, reset, restore, revert, commit, delete, overwrite하지 않는다. `reset --hard`, broad restore/checkout, `clean`, history-changing recovery는 applicable authorization 아래 explicitly owned disposable state에서만 유효할 수 있다. Command name 자체가 안전성을 만들지 않는다.

Restoration 뒤 frontier identity, preserved user-state fingerprint, candidate diff 부재, resource cleanup을 검증한다. Mismatch는 `rollback-error`이며 keep/resume를 막는다.

## 4. Authorization matrix

| Action class | Default |
|---|---|
| Task가 요청한 scoped local read/edit/verification | Repository policy 아래 허용 |
| Commit, release, push, deploy, publish, deletion, destructive rollback | Controlling explicit authorization 필요 |
| Credential, private data, external transmission, production access | Explicitly authorized and bounded가 아니면 거부 |
| Irreversible external mutation | Iterative loop 밖의 separately approved finalization gate 사용 |

Approval은 action, target, environment, argument, time-specific하다. Retry, changed argument, broader path, downstream command를 승인하지 않는다.

Network를 read/write만으로 분류하지 않는다. Outbound read request도 repository 또는 secret data를 전송할 수 있다. Destination, method/protocol, data class, read/write intent, ambient credential 사용 여부를 선언한다. `curl | sh`를 실행하지 말고 fetch, verify, inspect, execute를 별도 승인 단계로 나눈다.

Secret을 argv, prompt, log, artifact, patch, handoff, URL, raw environment dump에 넣지 않는다. Credential source class와 redaction status만 기록하고 값은 기록하지 않는다.

## 5. Locks, deadlines, and lifecycle

- Mutation ownership을 atomic하게 획득한다. Run ID와 fencing generation/epoch를 사용하며 PID나 hostname만으로 ownership을 증명하지 않는다.
- Foreign 또는 오래됐다는 이유만으로 lock을 삭제하지 않는다. Applicable lease/owner/resource check를 통과한 뒤에만 ownership을 break하고 decision을 기록한다.
- Procedure와 전체 run의 time/resource/output bound를 필요에 따라 정의한다.
- Owned process group, container, temp path, socket, port, worktree, ref를 생성 시 등록한다.
- Success, failure, signal, timeout, interrupt에서 resource를 reverse order로 정리하고 부재를 검증한다.
- Leaked resource는 `cleanup-error`이며 keep과 automatic resume를 막는다.

## 6. Typed procedure outcomes

Process procedure는 applicable argv 또는 script identity, cwd, timeout, start/end, exit code 또는 signal, typed outcome, sanitized evidence reference, cleanup을 기록한다. 하나의 numeric convention을 강제하지 말고 tool-established exit semantics를 보존한다.

Human, model, rubric, API, panel judge는 procedure definition, rubric/input identity, invocation outcome, raw observation ID, aggregation identity를 기록한다. Process exit code는 적용되지 않는다.

Common outcome은 구분해서 유지한다.

```text
completed
guard-failed
verifier-error
metric-error
timeout
signaled
blocked
inconclusive
cleanup-error
rollback-error
```

Non-successful 또는 incomplete procedure 뒤 parseable output은 diagnostic일 뿐이다. Acceptance evidence에 shell pipeline을 피하고, 불가피하면 각 stage result와 failure propagation을 저장한다.

## 7. Durable evidence

권장 artifact:

```text
events.jsonl                 # append-only state transitions
results.tsv                  # human-scannable index
summary.md                   # evidence-bound synthesis
handoff.json                 # atomic terminal/resume state
environment.json             # allowlisted outcome-affecting inputs
artifacts.manifest.json      # content identities and producers
raw/                         # sanitized procedure evidence
```

Resume-critical artifact는 canonical relative locator, media type, size, digest, producing run/iteration/procedure, material한 timestamp를 기록한다. Immutable/versioned artifact name을 사용하고 referenced artifact를 먼저 finalize한 뒤 monotonic generation/fencing check와 same-directory atomic replacement로 `handoff.json`을 publish한다.

Checksum은 integrity를 증명할 뿐 confidentiality나 producer trust를 증명하지 않는다. Redaction violation은 publication과 automatic resume를 차단한다.

## 8. Minimum resumable handoff

Automatic resume는 required/conditional state를 모두 요구한다.

```json
{
  "schema": {"name": "autoresearch-handoff", "version": "1.0"},
  "generation": 8,
  "run": {"id": "run-opaque-id", "checkpointed_at": "ISO-8601"},
  "terminal": {"status": "INTERRUPTED", "stop_reason": "user_interrupt"},
  "workspace": {"id": "stable-id", "expected_state": {"dirty": false}},
  "frontier": {"id": "frontier-7", "snapshot": {"kind": "git_commit", "digest": "..."}},
  "candidate": null,
  "cursor": {"last_finalized_iteration": 7, "next_iteration": 8},
  "config": {"artifact": "effective-config.json", "digest": "..."},
  "environment": {"policy": "declared-outcome-affecting-inputs", "digest": "..."},
  "metric": {"evidence": "metric-frontier-7"},
  "guard": {"evidence": "guard-frontier-7"},
  "ownership": {"state": "released"},
  "cleanup": {"status": "complete", "residual_resources": []},
  "rollback": {"required": false, "status": "not_needed"},
  "redaction": {"policy": "allowlist-and-sanitize-v1", "violations": []},
  "resume": {"mode": "revalidate_then_continue", "next_action": "select_hypothesis"}
}
```

Candidate가 있으면 base frontier, state, snapshot, changed path, recovery action을 기록한다. Dirty workspace가 expected면 각 path와 ownership을 inventory한다. Ownership이 held/unknown이면 lease locator와 fencing epoch를 기록한다. Rollback이 pending이면 target, scope, procedure, validation predicate를 기록한다.

Missing state를 합성하지 않는다. Unsupported schema 또는 decisive evidence 누락은 handoff를 `manual_recovery` 또는 `non_resumable`로 낮추고 reconstruction/re-baselining을 요구한다.

## 9. Mandatory resume checks

Mutation 전에:

1. schema와 conditional field를 validate한다.
2. resume-critical artifact digest를 검증한다.
3. 새 fencing epoch로 ownership을 획득하고 generation을 다시 읽는다.
4. path와 독립적으로 workspace identity를 resolve한다.
5. immutable frontier를 verify/materialize한다.
6. actual workspace/resource를 expected state와 비교한다.
7. unknown side effect를 replay하지 않고 candidate를 reconcile한다.
8. config와 declared environment identity를 다시 계산한다.
9. redaction에 unresolved violation이 없는지 확인한다.
10. frontier guard를 다시 실행하고 evidence가 stale, noisy, incompatible하면 remeasure한다.

Prior iteration이 finalized된 뒤에만 계속한다. Full SLSA provenance, workflow replay history, exhaustive host inventory, product-specific session state는 이 minimum runtime-neutral contract의 의도적인 범위 밖이다.
