# 쓰기 안전 계약

생성기를 실행할 때마다 이 규칙을 적용합니다. 생성기는 엄격한 정규화 JSON과 로컬 정적 asset만 받습니다. 자연어를 해석하지 않습니다.

## 쉬운 말로 정리한 안전 규칙

- **생성기는 바로 씁니다.** 승인 봉투, preview digest, 확인 질문이 필요 없습니다. 정규화된 spec이 완성되면 곧바로 `apply`를 실행합니다.
- **새 대상은 언제나 안전하게 씁니다.** 대상 경로가 없으면 상위 디렉터리를 만들고 한 번의 transaction으로 artifact를 씁니다.
- **기존 대상은 실수로 건드리지 않습니다.** `overwrite: true`가 없으면 `E_TARGET_EXISTS`로 멈추고 아무것도 바꾸지 않습니다.
- **기존 디렉터리는 소유 증명이 필요합니다.** `overwrite: true`가 있어도, 유효한 `.hermes-agent-maker/ownership.json` marker가 그 root의 모든 파일을 이 생성기가 만들었다고 증명해야 교체합니다. 그 외에는 `E_UNOWNED_ROOT`로 멈춥니다.
- **실패는 복구 대상이지 마법이 아닙니다.** 단일 파일 교체는 같은 디렉터리 안의 atomic rename을 씁니다. 디렉터리 transaction은 프로세스 내 실패에 대해 atomic하고 journal로 중단 복구가 가능하지만 **crash-atomic은 아닙니다**. 상태가 모호하면 증거를 보존하고 멈춥니다. 추측하거나 지우지 않습니다.

결과와 질문은 쉬운 한국어로 보고합니다. 비밀값을 요구하거나 노출하지 않습니다.

## preview는 도움이 될 때 쓰고, 관문으로 쓰지 않습니다

`mode: "preview"`는 전체 순서 change-set을 렌더링하고 아무것도 쓰지 않습니다. 덮어쓰기, 낯선 대상, 큰 복합 요청처럼 위험한 실행을 사용자에게 보여줄 때 씁니다. 이는 보고용 편의 기능이며, `apply` 전에 preview를 승인받아야 하는 것은 아닙니다.

## 금지 경계

Discord artifact, credential, token, 개인 키, `.env` 파일, 설치/활성화/제거 동작, Hermes login·profile·trust 상태, gateway, bot, adapter, 외부 전송, 네트워크 fetch, 동적 schema 조회를 만들거나 바꾸는 요청은 렌더링도 쓰기도 하지 않고 거절합니다. `user-draft`와 `memory-draft`는 제안 문서만 만들고 USER나 MEMORY를 활성화하지 않습니다.

## Apply 판단표

| 조건 | 결과 |
| --- | --- |
| 대상 없음 | 상위 디렉터리 생성 후 stage, 검증, commit |
| `overwrite: true` 없이 대상 존재 | `E_TARGET_EXISTS`; 쓰기 없음 |
| 유효한 ownership marker가 있고 `overwrite: true`인 디렉터리 대상 | stage, 검증, journal, commit |
| 기존 디렉터리에 유효한 ownership marker 없음 | `E_UNOWNED_ROOT`; 쓰기 없음 |
| marker가 있지만 형식 오류·불일치·트리와 어긋남 | `E_MARKER` 또는 `E_UNOWNED_ROOT`; 쓰기 없음 |
| 심볼릭 링크, 특수 파일, containment 이탈, lock 충돌 | 거절; 쓰기 없음 |
| journal이 다른 artifact 소유 | `E_FOREIGN_TRANSACTION`; 쓰기 없음 |
| 복구 상태 모호 | 증거 보존 후 차단 |
| `mode: "preview"` | 전체 순서 change-set 보고; 쓰기 없음 |
