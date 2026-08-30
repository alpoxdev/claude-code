# 에이전트 실행 및 선택 정책

Orca에서 코딩 에이전트 터미널을 실행, 설정 또는 복구할 때 이 규칙을 읽습니다.

## 기능 우선 실행기 결정

1. 작업 전에 Orca 실행 파일을 결정하고 버전 일치 Orca 가이드를 읽습니다.
2. `status --json`으로 Orca 런타임 연결 가능 여부를 확인합니다.
3. Orca가 아는 native supervised agent는 Run을 만들거나 bind하고 Task를 만든 뒤
   `worker-start --task <task-id> --agent <id>`를 사용합니다. `worker-start`가 native placement,
   worktree/terminal 생성, prompt 전달, lifecycle을 소유합니다. 같은 worker를
   `worktree create --agent`로 미리 만들지 않으며 임의의 id가 등록됐는지 시험하려고 작업 트리를
   만들지 않습니다.
4. Orca에 등록되지 않은 CLI는 검증한 시작 명령으로 터미널을 만들고, `tui-idle`까지 기다린
   뒤 터미널 텍스트 입력으로 작업을 전달합니다. Orca가 돌려준 핸들 하나만 그 에이전트의
   핸들로 유지합니다.
5. 다음 입력이 명확하지 않으면 후속 `send` 전에 터미널을 읽습니다.

`omo`, `gjc`처럼 등록되지 않은 CLI에는 직접 명령 경로가 필요합니다. 그렇다고 모든 실행
파일이 안전하다는 뜻은 아니므로, 먼저 바이너리 존재와 `--help` 출력을 확인합니다.

## 미등록 CLI custom-dispatch 워커 경로

Orca 1.4.192에는 OMO를 first-class `worker-start` agent로 등록하는 문서화된 public configuration
surface가 없습니다. Orca가 지원하는 등록 방법을 공개할 때까지 미등록 CLI 경로를 사용합니다.
특히 `orca.yaml`에 등록한 뒤 `--agent omo`를 사용하라는 식의 존재하지 않는 설정을 제안하지
않으며, 등록 여부를 확인하려고 `worker-start --agent omo`를 실행하지 않습니다.

OMO 또는 다른 미등록 CLI worker는 low-level Dispatch와 terminal input을 사용합니다. Orca가
돌려준 정확한 Dispatch preamble과 task spec이 agent에 전달된 뒤에만 Dispatch lifecycle이
권한을 가집니다. terminal process는 사용자 소유이며, 이 경로에는 native `worker-start` launch
receipt, 소유 terminal cleanup, `launch.requested`/`launch.effective` 근거가 없습니다.

### 양보할 수 없는 전달 불변식

**터미널 생성은 작업 전달이 아닙니다. custom CLI 워커는 terminal이 준비되고, Dispatch가 존재하며,
정확한 preamble과 task spec이 성공적으로 전달되기 전에는 시작되지 않습니다.** 다음 상태를 서로
독립적으로 기록합니다.

```text
terminal_created -> terminal_ready -> dispatch_created -> prompt_delivered -> worker_active -> worker_completed
```

`terminal create`, `terminal wait`, `dispatch`만으로 `worker_active`를 표시하지 않습니다.
`prompt_delivered`에는 terminal-send receipt와 prompt가 수락됐다는 전송 뒤 terminal read가 모두
필요합니다. `worker_completed`에는 활성 Dispatch의 수락된 `worker_done`, `escalation` 또는
정확한 recovery outcome이 필요합니다.

### 기존 OMO 터미널: 재사용하고 절대 교체하지 않기

사용자가 기존 OMO handle을 제공하면 terminal을 만들거나 닫거나 교체하지 않습니다. 먼저 정확히
그 탭을 검사하고 기다립니다.

```text
ORCA terminal show --terminal <omo-handle> --json
ORCA terminal wait --terminal <omo-handle> --for tui-idle --timeout-ms 60000 --json
```

대기 전후에 탭을 읽습니다. 이미 작업 중이거나, 사람 응답을 기다리거나, 다른 worktree이거나,
identity가 불확실하거나, timeout이면 그대로 보존하고 상태를 알리며 prompt를 보내지 않습니다.
중복 fallback 탭을 만들지 않습니다.

### 새 OMO 터미널: 명시적인 명령 근거

적격 기존 탭이 주어지지 않았을 때만 terminal을 만듭니다. 생성 전에 `command -v omo`,
`omo --help`, `omo --list-models <requested-model>`,
`omo auth check --provider <provider> --json`을 검증합니다. 요청한 model, thinking,
permission preset, `--no-model-fallback`을 terminal command에 그대로 보존합니다.

선언한 OMO 정책에서 `opencodex/gpt-5.6-sol`은 `medium`부터 `high`까지,
`opencodex/gpt-5.6-terra`는 `medium`부터 `xhigh`까지 허용합니다. 명시 요청이 이 policy 범위를
벗어나면 조용히 바꾸지 말고 거부합니다. 예시는 다음과 같습니다.

```text
omo --model opencodex/gpt-5.6-sol --thinking high --permission-preset workspace --no-model-fallback
omo --model opencodex/gpt-5.6-terra --thinking xhigh --permission-preset workspace --no-model-fallback
```

`omo --list-models`는 catalog 가용성을 보여줄 뿐, 남은 quota나 최종 runtime model을 보장하지
않습니다. terminal creation command, 요청 model/thinking, permission preset, fallback flag,
terminal handle, 가능하면 startup model display/session metadata, prompt-delivery receipt을 launch
근거로 보존합니다. 이 근거가 실제로 보인 사실만 `verified`라고 말합니다.

### Low-level Dispatch 프로토콜

코디네이터 Run을 만들거나 bind한 다음, 대상 terminal 하나당 Task 하나를 만듭니다. 병렬 기존
OMO 탭은 1:1 Task/terminal mapping과 탭마다 별도 prompt-delivery receipt를 유지합니다. 현재 CLI
형태를 `--inject` 없이 사용합니다.

```text
ORCA orchestration dispatch --task <task-id> --to <terminal-handle> --json
ORCA orchestration dispatch-show --task <task-id> --preamble --json
```

ID, lifecycle command, preamble 문구를 재구성하지 않습니다. 반환된 정확한 preamble과 현재 Task
spec을 하나의 `terminal send` payload로 사용합니다.

```text
ORCA terminal send --terminal <terminal-handle> --text "<exact preamble + task spec>" --enter --json
```

payload를 조립하기 전에 반환된 preamble을 검사합니다. Orca 1.4.192에서는 정확한
`dispatch-show --task <task-id> --preamble --json` 응답이 이미 `=== TASK ===`와 전체 Task spec을
포함할 수 있습니다. 이 경우 Task spec을 다시 붙이지 않고 반환된 preamble을 한 번만 보냅니다.
현재 `dispatch-show` CLI는 `--run`을 받지 않으며 Dispatch의 Run binding은 receipt에 포함됩니다.
지원하지 않는 `--run` 오류는 command-shape 오류일 뿐 Task나 Dispatch를 다시 만들 이유가 아닙니다.

send 성공 뒤 같은 terminal을 읽고 send receipt와 수락 관찰을 보존한 뒤에만
`prompt_delivered`, `worker_active`를 기록합니다. custom prompt는 정확한 반환 preamble을 따라야
합니다. lifecycle completion을 요구하면 현재 task/Dispatch ID와 명시적
`--outcome succeeded|failed`가 있는 `worker_done`을 한 번 보냅니다. 막히는 질문에는 `ask`,
차단에는 `escalation`을 쓰고 완료 뒤 idle합니다. preamble이 다른 명령을 제시하면 그 정확한
명령을 따릅니다.

이 경로에서 `worker-show`는 OMO terminal이 prompt를 수락하고 Working을 시작한 뒤에도
`state: unsupervised`, `stage: context_only`, terminal-owned resource 없음으로 보고할 수 있습니다.
이는 low-level Dispatch가 terminal을 만들지 않았기 때문에 예상되는 상태입니다. terminal의
running/Working 근거를 `worker_active`로 취급하고, 수락된 `worker_done`을 기다린 뒤 Task와
Dispatch가 모두 `completed`인지 확인한 후에만 완료를 주장합니다. 사용자가 명시적으로 닫으라고
하기 전에는 그 전이 뒤에도 탭을 보존합니다.

### 실패 처리

| 관찰 | 필수 대응 |
|---|---|
| `agent_unconfigured` | Orca가 terminal을 first-class agent로 인식하지 못했다는 뜻이며 OMO 실행 실패 증거가 아니다. terminal을 보존하고 `worker-start`를 재시도하지 않으며 low-level Dispatch를 사용한다. |
| `tui-idle` timeout | 같은 terminal을 한 번 읽어 상태를 알리고 prompt를 보내거나 다른 terminal을 만들지 않는다. |
| Dispatch 생성 실패 | Task/terminal 상태를 보존하고 prompt를 보내지 않으며 Orca의 exact recovery action과 오류를 알린다. |
| `dispatch-show --preamble` 실패 | 부분적이거나 만들어낸 prompt를 보내지 않는다. Dispatch를 보존하고 정확한 실패를 알린다. |
| `dispatch-show`가 `--run`을 거부 | 현재 명령이 그 flag를 받지 않는다. 정확히 지원되는 `--task <task-id> --preamble --json` 형태로 다시 실행하고 state를 다시 만들지 않는다. |
| Prompt-send 실패 | 기존 Dispatch를 보존하고 delivery/terminal 상태를 검사하며 exact recovery action을 따른다. 새 Dispatch를 만들거나 prompt를 무작정 중복 전송하지 않는다. |
| accepted send 뒤 `unsupervised` / `context_only` | low-level Dispatch에는 소유 terminal resource가 없다. 같은 탭을 계속 감독하고 delivery를 낮게 판정하거나 탭을 교체하거나 lifecycle completion 전 수동 정산하지 않는다. |

native `worker-start` 기능이 엄격히 필요하면 멈추고 등록된 Orca agent를 사용하거나 OMO
first-class 지원을 기다립니다. lifecycle 기능을 얻기 위해 다른 agent로 fallback하지 않습니다.

## 부모 정리 책임

자식 worker가 아니라 부모 coordinator가 모든 자식 session lifecycle 완료를 책임집니다. 부모가
수락된 `worker_done`, 실패한 Dispatch, 명시적인 terminal outcome을 관찰하면 다시
check/wait하거나 종료하기 전에 그 자식을 정산해야 합니다.

| 자식 종류와 소유권 | 정산 뒤 부모 동작 |
|---|---|
| `worker-start`가 만든 native supervised terminal | 같은 terminal을 즉시 follow-up Dispatch에 재사용하거나, 사용자가 요청하면 명시적으로 보존하거나, `worker-release --dispatch <dispatch-id> --json`을 실행한다. release receipt 대신 넓은 `terminal close`를 호출하지 않는다. |
| 부모가 만든 custom-dispatch terminal | Dispatch가 settled됐고 handle이 여전히 같은 자식임을 확인한 뒤, 재사용하거나 사용자 명시 요청으로 보존하거나, `terminal close --terminal <handle> --json`을 실행한다. close receipt를 기록한다. |
| 기존/재사용/사용자 소유 custom terminal | 자동으로 닫지 않는다. Task/Dispatch 완료 뒤 retained/user-owned를 기록하고 사용자가 명시적으로 닫으라고 할 때까지 열린 상태로 둔다. |
| Setup, coordinator, active, 증명할 수 없는, stale terminal | 절대 닫지 않는다. ownership/state 차단 원인을 알리고 기다리거나 escalation한다. |

자식 worker의 terminal 책임은 preamble이 정한 정확한 완료/실패 signal을 보낸 뒤 idle하는 것뿐입니다.
`worker_done`은 자식이 자기 session을 닫을 권한이 아닙니다. low-level custom Dispatch의
`worker-release`는 owned resource가 없어 `retained`를 반환할 수 있습니다. 이것은 정상이며,
부모가 만든 custom tab에 대한 부모의 명시적 결정을 면제하지 않습니다.

## 원본 에이전트 친화성

기본 워커 선택은 orchestration을 시작한 코딩 에이전트에 고정합니다. 이는 모델 친화성이 아닌
에이전트 친화성입니다. **유효 worker agent**는 사용자가 Task에 다른 worker agent를 명시하지
않는 한 원본 agent입니다. 모델, thinking 수준, 프로필, credential, 단발 quota 대체는 이 유효
agent의 CLI 내부에서만 고릅니다.

1. 먼저 활성 에이전트 세션/runtime 식별자에서, 다음으로 활성 터미널의 시작 명령에서, 마지막으로
   명시적 작업 컨텍스트에서 원본 에이전트를 확인합니다. 사용한 근거를 기록합니다.
2. 기본 워커는 모두 같은 에이전트로 실행합니다. 예를 들어 OMO는 OMO 워커를, Claude는 Claude
   워커를 시작합니다. Orca가 아는 원본은 known-agent 경로를, 미등록 원본은 새/기존 여부와
   상관없이 위의 custom-dispatch terminal 경로를 사용합니다.
3. 사용자가 대체 워커 에이전트의 이름을 명시적으로 지정할 때만 친화성을 바꿀 수 있습니다.
   override는 Task 범위이고 launch record에 기록되며 해당 Task의 유효 worker agent가 됩니다.
   모델, effort, provider, 프로필, credential, quota 대체 요청은 원본 에이전트를 바꾸지
   않습니다.
4. 원본 감지가 모호하거나, 원본 CLI를 실행할 수 없거나, 요청 작업에 다른 에이전트가 필요하면
   좁은 질문 하나를 하거나 관찰한 차단 원인과 함께 멈춥니다. 다른 코딩 에이전트를 기본값으로
   고르지 않습니다.
5. quota 또는 rate-limit 오류는 quota 정책에 따라 유효 worker agent가 허용한 credential,
   모델, effort만 바꿀 수 있습니다. 제3의 agent로 대체하거나 명시적 override 뒤 원본 agent로
   돌아갈 수 없습니다.

이 규칙은 병렬 워커를 포함해 하나의 조정 요청에서 만든 모든 워커에 적용합니다. 사용자가
명시적으로 제공한 멀티 에이전트 계획은 막지 않습니다.

## 모델 및 추론 수준 우선순위

사용자가 요청한 모델, provider, 모델 프로필, credential 우선순위, thinking/effort 수준을
그대로 보존합니다. 실행 전에 대상 CLI의 최신 모델 목록과 도움말 출력으로 검증합니다.

- 요청 모델이 없거나, 해당 모델이 요청 effort를 지원하지 않거나, credential을 쓸 수 없으면
  실행 전에 멈춥니다. 확인된 제약과 검증된 대안만 알려줍니다.
- 명시 요청을 더 저렴하거나 빠르거나 강하거나 다른 과금 방식의 모델로 조용히 바꾸지
  않습니다.
- 사용자가 요청하지 않으면 모델 프로필, credential 고정, 기본 설정을 영구 저장하지 않습니다.
- 모델 id, 프로필 이름, credential 선택자, 작업 텍스트를 별도 인자로 안전하게 전달합니다.
  신뢰할 수 없는 터미널 텍스트를 명령에 이어 붙이지 않습니다.

## 자동 선택 정책

사용자가 모델이나 thinking 수준을 지정하지 않았을 때만 자동 모드를 적용합니다.

1. CLI의 실시간 모델 목록과 credential 준비 상태를 읽습니다.
2. 준비된 사용자 설정 모델 프로필 또는 CLI의 기존 기본값을 우선합니다.
3. 목록과 credential이 후보를 하나로 확정할 수 있을 때만 이름 있는 모델을 선택합니다.
   그렇지 않으면 모델 플래그를 생략하고 준비된 CLI 기본값을 사용하며 그 결정을 알립니다.
4. 선택 모델이 effort 수준을 공개하면, 좁은 읽기 전용 작업은 `low`, 일반 구현은 `medium`,
   여러 파일·디버깅·아키텍처 작업은 `high`를 사용합니다. 명확히 필요하고 목록이 지원할 때만
   `xhigh` 또는 `max`를 사용합니다. 에이전트 이름만으로 지원 여부를 추정하지 않습니다.
5. 자동으로 원하는 effort가 지원되지 않으면 지원되는 바로 아래 수준을 선택합니다. 기능
   데이터가 없으면 추측하지 말고 effort 플래그를 생략합니다.

## 사용량 및 쿼터 정책

허용량을 알아내기 위해 비용이 드는 시험 프롬프트를 보내지 않습니다.

- 준비 상태와 남은 쿼터는 다릅니다. 두 결과를 분리해 알립니다.
- GJC는 실행 전에 계정 준비 상태를 확인하고, 사용량 통계는 과거 요청/토큰/비용 근거로만
  사용합니다. 설정된 `--prefer-credential`은 사용자 또는 기존 프로젝트 설정이 그 credential
  선호를 허용할 때만 쿼터 대체에 사용합니다.
- OMO는 인증 준비 상태와 모델 목록을 확인합니다. 현재 CLI에는 독립적인 남은 쿼터 조회가
  없으므로, 인증 성공을 허용량이 남았다는 주장으로 사용하지 않습니다.
- 자동 선택에서 명시적인 quota/rate-limit 오류가 나오면 터미널 오류를 다시 읽고, 준비 상태가
  확인된 대안으로 최대 한 번만 대체합니다. GJC는 허가된 credential 대체 기능을 우선합니다.
  OMO는 확인된 provider/model 대안만 선택합니다. 원래 오류와 대체 선택을 기록합니다.
- 사용자가 고른 모델 또는 effort가 quota/rate-limit으로 실패하면 바꾸지 않습니다. 실패를
  알리고 모델, credential 또는 대기 여부 결정을 요청합니다.
- 확인된 대안이 없으면 실제 오류와 함께 멈춥니다. 무작정 재시도하지 않습니다.

## 단발 복구 경계

이 정책은 최적화 루프가 아닙니다. 허용 순서는 사전 확인 한 번, 실행 한 번, 자동 쿼터 대체
최대 한 번입니다. 대체 에이전트가 `tui-idle`에 도달하고 작업 전달에 성공할 때만 유지합니다.
그 외에는 원래 실패를 보존하고 멈춥니다.

## 필수 실행 기록

실행한 각 에이전트에 대해 작업/워크트리 기록에 다음을 남깁니다.

- 요청 또는 자동 선택 모드
- 원본 에이전트, 원본 감지 근거, 존재한다면 명시적인 교차 에이전트 override
- 워커 종류(`native-supervised` 또는 `custom-dispatch`), Dispatch id, exact-preamble receipt,
  state transition record, custom-dispatch 워커의 prompt-delivery 근거
- 에이전트, 모델, effort, 프로필, credential 정책(비밀값 제외)
- 모델 목록/준비 상태 검사와 결과
- Orca 워크트리 id와 유일한 터미널 핸들
- 프롬프트 전달 결과
- 부모 정산 결정(`reused`, `released`, `closed`, `retained`)과 그 receipt
- 쿼터 대체 또는 차단 원인(해당 시)
