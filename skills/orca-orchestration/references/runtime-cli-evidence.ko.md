# 에이전트 실행을 위한 런타임 CLI 근거

Orca 터미널에서 코딩 에이전트를 실행하거나 대상 CLI에 따라 모델, thinking, credential, quota
규칙이 달라질 때만 이 참조를 읽습니다.

## 근거 원장

| 출처 | 확인 버전/날짜 | 뒷받침하는 주장 | 주의점 |
|---|---|---|---|
| 로컬 `orca status --json`, `orca skills get orchestration --full`, `worker-start/dispatch/dispatch-show/terminal create/show/wait/send --help` | Orca 1.4.192, 2026-08-30 | native `worker-start --agent`는 설정된 TUI agent용이다. low-level Dispatch는 `--task`, `--to`를 받고 `dispatch-show --task --preamble`은 정확한 현재 preamble을 돌려준다. | Orca에 arbitrary-agent/template 등록 public surface가 관찰되지 않았다. OMO의 `worker-start --terminal`은 `agent_unconfigured`을 반환할 수 있으므로 재시도하지 않는다. |
| 로컬 `omo --version`, `omo --help` | OMO 5.0.0-0.beta.26, 2026-08-30 | OMO는 `--model`, `--thinking`, `--permission-preset`, `--no-model-fallback`을 공개한다. | 이번 재확인에서는 auth나 catalog 명령을 실행하지 않았다. help token은 모델 가용성, credential readiness, allowance, 실제 startup model을 증명하지 않는다. |
| 로컬 `gjc --version`, `gjc launch --help`, `gjc accounts --help` | GJC 0.15.6, 2026-08-30 | GJC는 `--model`, `--thinking`, `--smol`, `--slow`, `--plan`, `--mpreset`, `--credential`, `--prefer-credential`을 공개하고 account check를 제공한다. | 이번 재확인에서는 account나 model catalog probe를 실행하지 않았다. capability help는 credential readiness나 quota balance가 아니다. |
| 공식 Orca orchestration 문서와 [#14952](https://github.com/stablyai/orca/issues/14952) | 2026-08-30 조회 | 공개 문서는 native `worker-start`와 low-level Dispatch를 설명하고, issue는 custom/vendor agent 등록을 문서화한 것이 아니라 요청한다. | 보조 근거일 뿐이다. 설치된 runtime help와 관찰한 결과가 우선한다. |
| 실제 read-only OMO custom-dispatch run | Orca 1.4.192 / OMO beta 5.0.0-0.beta.26, 2026-08-30 | `omo --model opencodex/gpt-5.6-sol --thinking high --permission-preset workspace --no-model-fallback` terminal이 `tui-idle`에 도달했다. injection 없이 low-level Dispatch를 만들고 반환 preamble 4943 bytes를 수락했으며 OMO는 Working 뒤 수락된 `worker_done`을 보내 Task와 Dispatch를 완료했고 탭은 열린 상태로 남았다. | 한 번의 read-only run이다. 이후 Orca/OMO 버전에 적용하기 전 runtime 동작을 다시 확인한다. |

이 표는 로컬 명령 근거이며 credential 공개나 유료 요청 발생 권한이 아닙니다. 변동 가능한
플래그에 의존하기 전에는 `scripts/check-runtime-capabilities.mjs --json`을 실행하고 실제 task에
필요한 model/catalog/readiness 검사를 별도로 수행합니다. 스크립트의 version 값은 관찰값이지
pass/fail pin이 아닙니다. 명시한 명령을 재확인하지 않았다면 확인 날짜를 바꾸지 않습니다.

## Orca 패턴

별도 워크트리에서 Orca가 아는 에이전트를 실행할 때는 live CLI가 문서화한 agent-first 경로를
사용합니다.

```text
ORCA worktree create --name <task-name> --agent <known-agent> --prompt "<task>" --json
```

미등록 에이전트는 사용자가 적격 기존 terminal을 제공했다면 먼저 재사용하고, 그렇지 않을 때만
그 에이전트용 terminal을 정확히 하나 만듭니다. 각 placeholder는 검증한 값으로 바꾸며,
placeholder 자체를 복사하지 않습니다. terminal 생성은 작업 전달이 아니므로 아래
Dispatch/preamble/send 프로토콜을 완료하기 전에는 worker가 시작됐다고 주장하지 않습니다.

```text
ORCA worktree create --name <task-name> --no-parent --json
ORCA terminal create --worktree id:<repoId>::<worktreePath> --title <agent-title> --command "<validated-agent-command>" --json
ORCA terminal wait --terminal <handle> --for tui-idle --timeout-ms 60000 --json
ORCA orchestration task-create --spec "<task specification>" --json
ORCA orchestration dispatch --task <task-id> --to <handle> --json
ORCA orchestration dispatch-show --task <task-id> --preamble --json
ORCA terminal send --terminal <handle> --text "<exact preamble + task specification>" --enter --json
```

현재 워크트리에서는 워크트리 생성을 생략하고 터미널 생성에 `--worktree active`를 사용합니다.
시작 명령이 모델과 effort 플래그를 소유하고, 전달 텍스트는 셸 문법이 아닌 작업입니다.

## 미등록 OMO 터미널

Orca가 OMO를 first-class agent로 인식하지 않을 때는 일반 `worker-start` composition을 쓸 수
없습니다. Orca에는 OMO를 first-class worker-start agent로 등록하는 문서화된 public configuration
surface가 현재 없습니다. Orca가 지원하는 등록 mechanism을 공개할 때까지 미등록 CLI 경로를
사용합니다. 이 상태를 안 뒤에는 아래 명령을 어느 쪽도 사용하지 않습니다.

```text
ORCA orchestration worker-start --task <task_id> --worktree current --agent omo --json
ORCA orchestration worker-start --task <task_id> --terminal <omo-handle> --json
```

두 번째 형태는 `agent_unconfigured` / `Terminal ... is not running a recognized agent`로 실패할
수 있습니다. [`../rules/agent-selection.ko.md`](../rules/agent-selection.ko.md)의 custom-dispatch
순서를 사용합니다. 기존 탭이 주어지면 재사용하고, `--inject` 없이 dispatch하며,
`dispatch-show --preamble`으로 정확한 preamble을 가져오고, 그 preamble과 Task spec을 보내며,
Dispatch lifecycle signal을 기다립니다. 이 경로는 기존 OMO 탭을 보존하지만 native launch receipt나
`launch.requested/effective` 의미는 제공하지 않습니다.

현재 `dispatch-show` syntax는 `--task <task-id> --preamble --json`이며 `--run`을 넘기지 않습니다.
관찰한 run에서 반환 preamble은 이미 `=== TASK ===`와 완전한 Task specification을 포함했습니다.
두 번째 spec append가 필요하다고 추정하지 말고 반환 preamble을 정확히 한 번 보냅니다. accepted
delivery 뒤 `worker-show`는 `unsupervised/context_only`, `terminalResource: null`을, `worker-read`는
terminal `running`, liveness `live`를 보고했습니다. 이는 정상적인 low-level ownership입니다.
수락된 `worker_done`은 OMO 탭을 닫지 않고 Task와 Dispatch를 모두 `completed`로 전환했습니다.

`worker-release --dispatch <dispatch-id>`는 settled coordinator-owned native worker terminal만
닫습니다. settled low-level Dispatch에서는 retained/no owned resource를 보고하고 custom tab을 닫지
않습니다. 부모는 재사용, 명시적 보존, 검증된 부모 생성 custom terminal만
`terminal close --terminal <handle> --json`으로 닫는 것 중 하나를 결정해야 합니다. 관찰한 실제
사용자 소유 OMO 탭은 사용자가 닫으라고 할 때까지 열린 상태로 남아야 합니다.

## OMO 명령 구성

후보 모델은 `omo --list-models`로 검증합니다. provider는 사용 전에 확인합니다.

```text
omo auth check --provider <provider> --json
```

확인된 CLI의 유효 실행 형태는 다음과 같습니다.

```text
omo --model <provider/model-or-pattern> --thinking <off|minimal|low|medium|high|xhigh|max>
omo --model <provider/model-or-pattern>:<thinking>
```

생성 명령에서는 모델과 thinking 인자를 분리해 검사하기 쉬운 첫 번째 형태를 우선합니다. Orca
워크플로가 `tui-idle` 뒤에 정확한 Dispatch preamble과 Task spec을 보낼 때는 이 시작 명령에
초기 작업을 넣지 않습니다. 사용자가 workspace policy와 no fallback을 명시하면
`--permission-preset workspace --no-model-fallback`을 포함합니다. 이 스킬의 명시 OMO 정책에서
Sol은 `medium`-`high`, Terra는 `medium`-`xhigh`를 사용하며 이 범위 밖의 명시 요청은 거부합니다.

## GJC 명령 구성

후보는 `gjc --list-models`로 검증합니다. 출력에는 가능한 thinking 수준을 포함한
모델/provider 기능이 있습니다. provider를 선택하기 전에 계정 준비 상태를 확인합니다.

```text
gjc accounts check --json
gjc stats --json
```

확인된 CLI의 유효 실행 형태는 다음과 같습니다.

```text
gjc --model <model> --thinking <minimal|low|medium|high|xhigh|max>
gjc --mpreset <profile>
gjc --model <model> --smol <fast-model> --slow <reasoning-model> --plan <planning-model>
gjc --prefer-credential <authorized-selector>
```

`--default`는 모델 프로필을 영구 저장하므로, 사용자가 영구 기본값을 명시적으로 요청한 경우가
아니면 금지합니다. 계정 검사 실패나 API-key probe의 `unknown`은 유료 작업으로 provider를
시험할 권한이 아닙니다.

## 실패 분류

| 관찰 | 의미 | 필수 대응 |
|---|---|---|
| 바이너리가 없거나 help가 실패 | 대상 CLI를 안전하게 설정할 수 없다. | 에이전트 터미널을 만들기 전에 실제 오류와 함께 멈춘다. |
| 모델이 없거나 목록에 effort가 없음 | 요청 설정이 호환되지 않는다. | 명시 요청은 검증된 대안을 묻고, 자동 요청은 플래그 생략 또는 검증된 더 낮은 effort를 선택한다. |
| Credential `failed` 또는 `not_ready` | 인증을 사용할 수 없다. | 멈추거나 자동 모드에서 설정된 허용 provider만 고른다. |
| Credential `unknown` | 준비 상태를 측정할 수 없다. | 쿼터/준비 상태를 주장하지 않는다. 사용자가 시도를 허용하면 기존 기본값만 쓴다. |
| 터미널 quota/rate-limit 오류 | 실제 요청이 provider 허용량/속도 제한으로 거절됐다. | [`../rules/agent-selection.md`](../rules/agent-selection.md)의 단발 대체 경계를 따른다. |
| 기존 OMO terminal의 `agent_unconfigured` | Orca가 인식된 agent identity를 증명할 수 없어 native worker lifecycle을 붙일 수 없다. | `worker-start`를 재시도하거나 agent를 바꾸지 않는다. `--inject` 없는 custom Dispatch를 사용하거나 native lifecycle이 필요하면 차단한다. |
| Dispatch는 만들었지만 preamble을 가져올 수 없음 | Dispatch는 존재하지만 안전한 custom-worker prompt가 없다. | Dispatch와 terminal을 보존하고 부분 prompt를 보내지 않는다. Orca의 exact recovery action을 따른다. |
| Dispatch 뒤 prompt-send 실패 | delivery가 불명확하므로 다른 Dispatch나 duplicate prompt는 중복 작업을 만들 수 있다. | Dispatch를 보존하고 정확한 terminal/Dispatch 상태를 검사하며 반환된 recovery action을 따른다. |
| `tui-idle` 대기 시간 초과 | 에이전트가 프롬프트를 받을 준비가 안 됐다. | 해당 터미널 하나를 한 번 읽고 차단 원인을 알리며 무작정 전송하지 않는다. |
