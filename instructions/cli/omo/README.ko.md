# OMO 런타임 프로필

> 영어판: [`README.md`](README.md)

## 범위

이 프로필은 `~/.omo/agent/extensions/omo-supervision-reporter.ts`에 설치한 로컬 Orca 감독
reporter를 설명합니다. 새 OMO process가 Orca dispatched terminal 안에서 실행될 때만 적용합니다.
표준 OMO 기능도 아니고 다른 host나 OMO 설치를 설명하지도 않습니다.

공통 기능 규칙은 [`../capability-contract.ko.md`](../capability-contract.ko.md)를 따릅니다.

## 로컬 reporter 동작

reporter는 직접 Orca 메일 채널(channel A)을 씁니다. W1.8b에서 Orca Dispatch preamble에
`--from`, `--task-id`, `--dispatch-id`가 들어 있고 OMO 자식이 이 식별자로 수락된 lifecycle
메시지를 보낼 수 있음을 관찰했습니다. 따라서 상태 파일 relay인 channel B는 설치하지 않습니다.

reporter는 새 prompt마다 현재 preamble에서 세 식별자를 모두 읽습니다. 하나라도 없으면 아무
메일도 보내지 않고 이전 context를 비워 일반 사용자 turn이 stale Dispatch로 보고되는 일을 막습니다.

| 이벤트 | 직접 메일 동작 |
|---|---|
| `agent_start` | phase `active`인 `status`를 보내고 heartbeat 일정을 시작합니다. |
| tool 실행 시작/종료 | 최신 상태만 남기는 `status`를 보냅니다. |
| active 상태에서 5분마다 | phase `working`인 `heartbeat`를 최대 한 번 보냅니다. |
| `agent_settled` | heartbeat 일정을 멈추고 Dispatch context를 비웁니다. |

전송은 best effort입니다. reporter는 preamble의 sender, Task, Dispatch 식별자로
`orca orchestration send`를 실행합니다. 1초짜리 unref timeout과 최신 항목 하나만 보관하는
pending slot으로 수신자가 느리거나 실패해도 OMO를 막거나 오래된 보고가 쌓이지 않게 합니다.

reporter는 `worker_done`을 절대 보내지 않습니다. 전달된 Task preamble이 완료의 유일한 계약이며,
nudge, 교체, 정산, cleanup 결정은 coordinator가 계속 맡습니다.

## 설치와 검증

전역 OMO extension discovery는 `~/.omo/agent/extensions/`의 파일을 읽습니다. 새로 시작한 OMO
process만 reporter를 읽으므로 기존 OMO process는 새 session을 시작해야 합니다.

```text
node ~/.omo/agent/orca-pi-adapter/bin/orca-pi-doctor.mjs --json
```

정상 결과에는 관리하는 전역 extension으로 `omo-supervision-reporter.ts`가 보입니다. 그 뒤
짧은 Orca Dispatch를 만들고 exact preamble을 가져와 전달한 다음,
`orca orchestration check --run <run> --types status,heartbeat,worker_done --wait --json`으로
Task 자체의 완료 메시지보다 먼저 직접 메일을 관찰합니다.

## 한계와 coordinator 경계

- `--from`, `--task-id`, `--dispatch-id` 세 값이 모두 없으면 reporter는 메일을 보내지 않습니다.
- reporter는 worker stall을 판정하지 않고, nudge를 보내거나, 재디스패치하거나, `--retry-of`를
  시작하거나, terminal을 닫지 않습니다.
- status나 heartbeat는 생존 신호일 뿐 의미 있는 진행이나 완료를 증명하지 않습니다.
- 직접 메일 전달은 로컬 Orca/OMO 조합에서만 확인했습니다. 런타임을 올린 뒤에는 live preamble과
  명령 기능을 다시 확인합니다.
