# Hermes Agent Kanban

> 영어판: [`KANBAN.md`](KANBAN.md)
>
> **조사일:** 2026-08-24, Hermes Agent 공식 문서만 근거로 삼았다. 아래 **사실**은 문서화된 Kanban 동작이고, **권고**는 운영 조언이다. 명령, 설정, 기본값, dashboard surface는 버전에 따라 달라질 수 있으므로 자동화 전에는 `hermes kanban --help`와 연결된 공식 reference를 확인한다.

## 1차 출처

- [Kanban — Multi-Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban)
- [Kanban Tutorial](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-tutorial)
- [Kanban worker lanes](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-worker-lanes)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)

## Kanban이란 무엇인가

**사실:** Hermes Kanban은 이름 있는 Hermes profile들을 조정하는 durable SQLite-backed task board다. 기본 board는 `~/.hermes/kanban.db`에, 추가 board는 `~/.hermes/kanban/boards/<slug>/kanban.db`에 저장된다. Task, comment, dependency, run, event, handoff는 부모 session context의 일시적 내용이 아니라 durable state다.

**사실:** 세 surface가 같은 board별 database를 사용한다.

| 행위자 | Surface | 용도 |
| --- | --- | --- |
| 사람, script, cron | `hermes kanban …`, `/kanban …`, dashboard | 작업 생성, 검사, routing, 감독 |
| Dispatcher가 spawn한 worker | 전용 `kanban_*` tool | 배정된 task 읽기, heartbeat, handoff, review, complete, block |
| Orchestrator profile | `kanban` toolset | 작업 분해, child 생성/link, graph routing |

**사실 — interface를 섞지 않는다:** Spawned worker는 `hermes kanban`을 shell에서 실행하지 않고 `kanban_show`, `kanban_complete` 같은 tool을 사용한다. Dispatcher는 그 worker에 `HERMES_KANBAN_TASK`, `HERMES_KANBAN_BOARD`, DB, workspace, run, claim-lock, profile, 선택적 tenant 값을 설정한다. 일반 chat session에는 profile이 `kanban` toolset을 명시적으로 켜지 않는 한 Kanban tool schema가 없다.

## Kanban을 고를 때

| `delegate_task`를 쓸 때 | Kanban을 쓸 때 |
| --- | --- |
| 부모가 계속하기 전에 짧은 child 답 하나가 필요할 때 | 작업이 agent 또는 사람 경계를 넘을 때 |
| 부모와 child가 한 live context에서 안전하게 join될 때 | Process restart 또는 context compression을 넘어 살아야 할 때 |
| 익명 one-shot subagent 하나면 충분할 때 | Persistent identity/memory를 가진 named profile이 필요할 때 |
| Durable audit trail·후속 routing이 필요 없을 때 | Dependency, review, retry, human unblock, 과거 검사 필요 |

**사실:** `delegate_task`는 fork-and-join RPC 스타일 호출이고 Kanban은 peer가 읽을 수 있는 durable queue와 state machine이다. Kanban worker도 내부적으로 `delegate_task`를 쓸 수 있다.

**권고:** 하룻밤 넘게 멈출 수 있거나, 내일 다른 역할이 이어받을 수 있거나, 운영자가 부모 transcript를 복구하지 않고도 무슨 일이 있었는지 알아야 하는 workflow에는 Kanban을 쓴다.

## 핵심 모델

**사실:** Task는 title, 선택 body, assignee profile 하나, 선택 tenant, 선택 idempotency key, 선택 priority/workspace/model/skills, parent/child link, comment, run, event를 가진다. 문서화된 핵심 lifecycle은 `triage → todo → ready → running → review | blocked | done | archived`이고 CLI는 시간 지연/follow-up용 `schedule`도 제공한다.

| 개념 | 의미 |
| --- | --- |
| Board | Database, log, workspace, attachment root를 따로 가진 hard-isolated project/domain queue |
| Task | Durable card 하나. 수명 중 worker run이 여러 번일 수 있음 |
| Link | Parent → child dependency. Parent가 완료되면 대기 child가 `todo`에서 `ready`로 승격 |
| Comment | Durable human/agent handoff. Claim 시 worker context에 포함 |
| Run | Outcome, profile, timestamp, log path, summary, metadata를 담은 worker attempt 하나 |
| Tenant | Board 안의 soft namespace. Filter에는 유용하지만 board 수준 security boundary는 아님 |

**사실:** Board가 hard isolation boundary다. Worker는 `HERMES_KANBAN_BOARD`를 상속하고 Kanban tool은 그 board만 읽는다. Board 사이 link는 거부된다. Tenant는 board 내부 task data를 scope할 뿐 security isolation으로 취급하면 안 된다.

## 설정과 첫 task

```bash
# `init`은 idempotent이고 다른 Kanban CLI action도 자동 초기화한다.
hermes kanban init

# Gateway가 기본 dispatcher를 host한다.
hermes gateway start

# 사람 또는 automation이 card를 만든다.
hermes kanban create "Research customer churn" \
  --assignee researcher \
  --body "Return a cited one-page analysis and named follow-up risks."

# 사람 surface에서 검사·관찰한다.
hermes kanban list
hermes kanban watch
hermes kanban stats
```

**사실:** Gateway-embedded dispatcher가 기본값(`kanban.dispatch_in_gateway: true`)이고 기본 60초마다 board를 sweep한다. Gateway가 내려가 있으면 `ready` 작업은 그대로 대기한다. `hermes kanban daemon`은 deprecated다. 같은 database에서 embedded dispatcher와 함께 실행하면 claim race가 생길 수 있어 지원하지 않는다.

```yaml
# ~/.hermes/config.yaml
kanban:
  dispatch_in_gateway: true       # 기본값
  dispatch_interval_seconds: 60   # 기본값
  review_dispatch: true           # 기본값: 배정 reviewer가 bundled sdlc-review를 사용
```

**권고:** Database마다 dispatcher는 하나만 운영한다. Legacy standalone daemon을 두 번째 "backup" dispatcher로 쓰지 않는다.

## Board와 resolution

```bash
hermes kanban boards list
hermes kanban boards create product-api \
  --name "Product API" --description "Service delivery" --switch
hermes kanban --board product-api create "Add health check" --assignee backend
hermes kanban boards switch product-api
hermes kanban boards show
hermes kanban boards rm product-api          # 복구 가능한 archive
hermes kanban boards rm product-api --delete # 영구 삭제
```

**사실:** Board resolution 우선순위는 explicit `--board <slug>`, `HERMES_KANBAN_BOARD`, `~/.hermes/kanban/current`, `default` 순이다. Slug는 소문자 영숫자, hyphen, underscore를 허용하고 1–64자이며 영숫자로 시작해야 한다. 대문자 입력은 자동 소문자화되고 path-like 값은 거부된다.

**사실:** `boards rm`은 기본으로 non-default board를 `boards/_archived/<slug>-<timestamp>/`로 archive한다. `--delete`는 hard-delete이며 `default` board는 이 명령으로 제거할 수 없다.

## 작업 생성, link, routing

```bash
SCHEMA=$(hermes kanban create "Design auth schema" \
  --assignee backend --tenant auth --priority 2 --json | jq -r .id)

API=$(hermes kanban create "Implement auth API" \
  --assignee backend --tenant auth --parent "$SCHEMA" --json | jq -r .id)

hermes kanban create "Test auth API" \
  --assignee qa --tenant auth --parent "$API" \
  --body "Cover success, wrong password, expired token, and concurrent refresh."
```

**사실:** 미완료 parent가 있는 child는 `todo`에 있고 모든 parent가 `done`이면 dispatcher가 `ready`로 승격한다. `hermes kanban link <parent> <child>`는 같은 board dependency를 추가하며 cycle을 거부한다. 이미 완료된 parent의 child는 즉시 `ready`에 들어갈 수 있다.

**사실:** `--idempotency-key`는 automation create를 deduplicate한다. 같은 key로 다시 생성하면 duplicate 대신 기존 task를 반환한다.

**사실 — 문서화된 충돌:** Feature guide는 `hermes kanban schedule <id> --at <ISO8601>`를 task의 `scheduled_at` 시간을 설정하는 명령으로 문서화하지만, CLI reference는 `schedule <id> "<reason>"`가 작업을 `scheduled` status로 옮긴다고 설명한다. 전용 feature guide의 `--at` 형식을 사용하고 설치 버전의 signature는 `hermes kanban --help`로 확인한다. 추정한 `scheduled` status를 자동화하지 않는다.

**사실:** 사람/automation의 핵심 operation에는 `list`, `show`, `assign`, `link`, `unlink`, `claim`, `comment`, `complete`, `block`, `request-review`, `request-changes`, `reopen-review`, `schedule`, `unblock`, `archive`, `tail`, `runs`, `dispatch`, `context`, `specify`, `decompose`, `gc`, board 명령이 있다. 설치된 flag는 `hermes kanban --help`로 확인한다.

## Workspace와 attachment

| Workspace 형식 | 동작 | 완료 뒤 보존 |
| --- | --- | --- |
| `scratch`(기본) | Board workspace root 아래 새 temporary directory | 아니오. 선언한 completion artifact는 먼저 durable attachment storage로 복사 |
| `worktree` | `.worktrees/<task-id>/` 아래 git worktree | 예 |
| `worktree:<path>` | 고정한 worktree path | 예 |
| `dir:<absolute-path>` | 기존 trusted local directory | 예 |

**사실:** `dir:`에는 absolute path가 필요하다. 임의 dispatcher CWD에서 relative path를 해석하면 모호하고 confused-deputy escape가 되므로 dispatch 때 거부한다. `dir:` path는 single-host/local-user 모델 안에서는 그 외에 trusted다. Worker는 운영자와 같은 user identity로 실행된다.

**사실:** Scratch는 의도적으로 ephemeral이다. `kanban_complete(artifacts=[...])`는 선언한 파일을 cleanup 전 durable task attachment storage로 복사한다. 선언한 scratch artifact가 없으면 worker가 경로를 바로잡도록 task가 in-flight로 남는다. Workspace 전체를 확인 가능하게 남겨야 하면 `worktree`나 `dir:`을 쓴다.

**사실:** Dashboard upload와 tool attachment는 task별 25 MB 제한이며 local worker context에는 absolute path가 온다. Remote terminal backend는 그 path를 읽기 전에 board attachment directory를 sandbox에 mount해야 한다.

**권고:** Code change에는 `worktree`, 의도적으로 공유하는 trusted workspace에는 absolute `dir:`, 선언 deliverable만 충분한 일회성 조사/변환에는 scratch를 쓴다.

## Worker protocol과 handoff

**사실:** Spawned worker는 `KANBAN_GUIDANCE` system-prompt block을 자동으로 받아 lifecycle에 별도 profile skill 설치가 필요 없다. 정상 worker는 정확히 하나의 lifecycle operation으로 run을 끝낸다.

| Tool | 결과 |
| --- | --- |
| `kanban_complete(summary=..., metadata=...)` | Task가 `done`에 도달 |
| `kanban_request_review(summary=..., metadata=..., reviewer=...)` | 같은 card가 `review`에 진입 |
| `kanban_block(reason=...)` | 실제 외부/사람 해결을 기다리며 `blocked`에 진입 |

**사실:** Worker는 처음 `kanban_show()`를 쓰고 `$HERMES_KANBAN_WORKSPACE`에서 작업하며 긴 작업 중 `kanban_heartbeat()`를 호출한 뒤 complete 또는 block한다. Worker가 task가 running인 채 정상 종료되면 Hermes는 protocol violation을 기록하고 complete/block nudge를 최대 두 번 넣은 뒤, 무한 loop 대신 bounded retry와 auto-block을 적용한다.

**사실:** 한 시간을 넘는 worker는 최소 한 시간마다 heartbeat해야 한다. Dispatcher 문서는 마지막 heartbeat가 한 시간 넘게 없는 경우 `kanban.dispatch_stale_timeout_seconds` 기본 4시간 뒤 reclaim한다고 한다. Worker-lane 계약은 별도로 dead PID만 reclaim하고 live worker claim은 연장하는 기본 15분 claim TTL을 문서화한다. 어느 설정도 작업을 보고하지 않아도 된다는 허가는 아니다.

```text
summary: 무엇을 변경하거나 결론냈는가
metadata: changed_files, verification, dependencies, retry_notes, residual_risk
```

**권고:** 다음 worker/reviewer가 무엇이 바뀌었는지, 어떻게 확인했는지, 무엇이 unblock/retry할 수 있는지, 어떤 risk가 남았는지 바로 답할 구조화된 handoff evidence를 남긴다. Task body, comment, summary, metadata, attachment에 secret, token, raw PII, log 전체를 넣지 않는다. Task row와 run history는 durable하다.

## Review, block, recovery

**사실:** Review는 block이 아니다. Same-card implementation은 `kanban_request_review`를 쓰고 reviewer는 `kanban_complete`로 승인, `kanban_request_changes`로 구체적 rework 요청, 실제 외부 escalation에서만 block한다. 다른 graph는 downstream review/QA card를 미리 만들어 implementation parent가 complete될 때 child가 승격되게 한다. 한 phase에 두 review 모델을 섞지 않는다.

**사실:** `kanban_block`은 dependency blocker를 dependency gating으로 되돌리고 `needs_input`, `capability`, `transient` blocker는 사람에게 드러낸다. `kanban_unblock`은 `triage`가 아니라 source phase(`review`, `ready`, 또는 parent가 열려 있으면 `todo`)로 복원한다. 같은 원인의 block/unblock이 반복되면 deterministic recurrence breaker(문서상 기본 `2`)가 `triage`로 보낸다.

**사실:** Dispatcher는 crashed worker를 reclaim하고 run history를 기록하며 연속 spawn failure 뒤 task를 auto-block한다. `kanban.failure_limit` 기본값은 `2`이고 task의 `--max-retries`가 있으면 그 값을 쓴다. Worker-lane 계약은 run별 wall-clock cap인 `max_runtime_seconds`, `kanban.stranded_threshold_seconds` 기본 30분을 넘는 ready task용 `hermes kanban diagnostics`도 문서화한다.

## Triage, decomposition, goal mode

**사실:** Triage card는 rough idea다. 기본 `kanban.auto_decompose: true`이면 dispatcher가 매 tick 최대 `kanban.auto_decompose_per_tick: 3`개 card에 built-in decomposer를 실행한다. `auxiliary.kanban_decomposer`, profile description, task graph를 사용한다. Manual mode에서는 `hermes kanban decompose <id>` 또는 dashboard/slash command action 전까지 triage에 남는다. `hermes kanban specify <id>`는 task 하나를 goal, approach, acceptance criteria로 다시 써 `todo`로 승격한다.

**사실:** `kanban.orchestrator_profile`은 fan-out 뒤 root owner를 정하며 built-in decomposer에 그 profile의 prompt/skill을 적재하지 않는다. LLM이 unknown profile을 고르면 문서화된 fallback은 `kanban.default_assignee`, 그 다음 active default profile이다. Profile description은 routing을 개선하고 orchestrator는 card를 만들기 전 가용 profile을 확인해야 한다.

**사실:** `--goal`은 card를 in-session goal loop로 실행한다. 보조 judge가 매 turn title/body acceptance criteria를 평가해 완료, task 자체 종료, turn budget까지 계속한다. `--goal-max-turns` 기본값은 `20`이며 소진되면 조용히 끝나지 않고 human review용 block이 된다. `/goal` engine은 공유하지만 `/goal` state는 공유하지 않는다.

**권고:** Profile 이름과 description이 정확해진 뒤에만 auto-decomposition을 쓴다. 독립 implementation card에는 worker가 sibling card를 볼 수 없으므로 shared design decision과 acceptance criteria를 모든 child body에 넣는다.

## Dashboard와 운영

**사실:** `hermes dashboard`는 board 초기화 뒤 bundled Kanban dashboard plugin을 노출한다. Dashboard, CLI, slash command, worker tool은 모두 같은 `kanban_db` layer를 통해 쓴다. Dashboard는 status column, task drawer, attachment, dependency, comment, run history, filter, profile lane, dispatcher nudge를 보여 주며 destructive move는 confirmation을 요청한다.

**사실 — 문서화된 보안 충돌:** Dashboard REST 표는 plugin route가 dashboard ephemeral session token으로 보호된다고 하지만 security model은 dashboard HTTP authentication이 `/api/plugins/`를 명시적으로 건너뛴다고 한다. Kanban WebSocket만 ephemeral session token을 요구한다. Security model 설명을 기준으로 한다. Dashboard가 기본 localhost binding을 쓸 때도 plugin route는 host의 모든 process가 도달할 수 있다. Shared host에서 `hermes dashboard --host 0.0.0.0`를 실행하지 않는다. 도달 가능한 공격자는 collaboration surface를 읽고 task를 create, reassign, archive할 수 있다.

**사실:** Kanban task는 host에서 의도적으로 profile-agnostic이다. 어떤 profile로 dashboard를 열어도 모든 profile의 board task를 본다. Markdown renderer는 input을 escape하고 `http(s)`/`mailto:` link만 허용하며 `rel="noopener noreferrer"`를 쓴다. 이것이 task text를 신뢰할 수 있는 instruction으로 만들지는 않는다.

**사실:** Worker stdout/stderr는 board의 `logs/<task-id>.log` 아래에 있고 `task_runs`는 log path, 가능한 exit status, summary, metadata를 보존한다. `task_events`는 lifecycle transition을 보존한다. `hermes kanban show <id>`, `runs <id>`, `tail <id>`, dashboard로 검사한다.

## 한계와 지원하지 않는 가정

**사실:** External Codex, Claude Code, OpenCode, container runner, 그 밖의 non-Hermes worker lane은 내장된 paved integration이 아니다. Plugin이 `spawn_fn`을 공급할 수는 있지만 process, workspace, authentication, exit behavior, `kanban_complete`/`kanban_block` 계약의 mapping은 integration별 설계 작업이다.

**사실:** Kanban의 문서화된 모델은 single-host trusted-local-user다. Remote multi-tenant security service, sandbox, worker가 모든 local directory·mounted credential·remote backend resource에 접근할 수 있는 권한이 아니다.

**사실 — approval 주의:** 공식 자료는 Kanban 전용 approval gate를 문서화하지 않으며 dispatcher가 spawn한 non-interactive worker 안에서 일반 tool approval이 어떻게 동작하는지도 말하지 않는다. Unattended gateway, cron, Kanban worker에는 기본값 `false`인 `hard_stop_enabled: true`를 권장한다. 기록되지 않은 approval 동작을 auto-deny 또는 auto-approve라고 가정하지 않는다.

## 운영자 체크리스트

- [ ] Hard isolation boundary마다 board 하나를 고르고 tenant는 soft grouping에만 쓴다.
- [ ] 실행 가능한 card를 만들기 전에 assignee profile을 만들고 description을 쓴다.
- [ ] Board database마다 dispatcher 하나만 실행한다.
- [ ] Durable code/output에는 `worktree` 또는 trusted absolute `dir:`을 쓰고 scratch artifact는 명시적으로 선언한다.
- [ ] Acceptance criteria와 cross-worker design decision을 card body에 넣는다.
- [ ] 구조화된 completion metadata와 review handoff를 요구하고 durable board record에 secret/raw sensitive data를 두지 않는다.
- [ ] Unblock/retry 전 `list`, `show`, `runs`, `tail`, dashboard history를 확인한다.
- [ ] Upgrade 뒤 `hermes kanban --help`로 설치된 command와 flag를 확인한다.
