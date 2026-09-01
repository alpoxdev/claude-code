# CLI 런타임 프로필

> 영어판: [`README.md`](README.md)

이 디렉터리는 재사용 가능한 skill이 CLI별 기능 차이를 **발견·선택·검증**하도록 돕는 참조 계층이다. 공통 규칙은 [`capability-contract.ko.md`](capability-contract.ko.md)에 한 번만 두고, 변동 가능한 런타임 차이는 하위 프로필에 격리한다.

## 범위와 권한

- 범위: Claude Code, Codex, GJC, Hermes Agent, JCode, OpenClaw, OpenCode에서 skill이 질문·승인·파일·명령 기능을 안전하게 선택하는 방법.
- 비범위: 특정 CLI의 설치, 인증, 모델 선택, 전체 명령 레퍼런스, 프로젝트 규칙의 대체.
- 권한: 사용자 요청과 프로젝트의 `AGENTS.md`가 이 문서 및 런타임 출력보다 우선한다. 런타임이 노출한 기능은 **사용 가능성**만 뜻하며 권한이나 승인으로 간주하지 않는다.
- 근거: 이 문서는 저장소 안에서 확인된 문서만 사용한다. 검증하지 못한 런타임 기능은 지원 사실로 쓰지 않고 런타임 발견 절차로 처리한다. 근거 목록과 한계는 [`sources.ko.md`](sources.ko.md)에 있다.

## 읽는 순서

1. 모든 skill 작성자는 [`capability-contract.ko.md`](capability-contract.ko.md)를 읽는다.
2. 특정 CLI 동작에 의존할 때만 해당 런타임 프로필을 읽는다.
3. 프로필이 기능을 `런타임 확인`으로 표시하면 현재 세션에서 기능 이름, 입력 스키마, 권한 경계를 확인한다.
4. 확인할 수 없으면 보수적 fallback을 사용하거나, 안전·산출물에 영향을 주는 누락 결정만 한 문장으로 질문한다.

## 프로필

| 런타임 | 프로필 | 저장소에서 확인된 기능 | 질문·승인 기본값 |
|---|---|---|---|
| Claude Code | [`claude-code/README.ko.md`](claude-code/README.ko.md) | `claude` CLI의 비대화형 실행·세션 재개·권한 모드 | 구조화 질문 도구를 가정하지 않고 평문 질문 |
| Codex | [`codex/README.ko.md`](codex/README.ko.md) | `codex exec`, `codex review`, 세션 재개, sandbox | 평문 질문 |
| GJC | [`gjc/README.ko.md`](gjc/README.ko.md) | 저장소 내 버전 고정 기능 근거 없음 | 런타임 발견 후, 없으면 평문 질문 |
| Hermes Agent | [`hermes-agent/README.ko.md`](hermes-agent/README.ko.md) | 저장소 내 버전 고정 기능 근거 없음 | 런타임 발견 후, 없으면 평문 질문 |
| JCode | [`jcode/README.ko.md`](jcode/README.ko.md) | 버전 고정된 config·tool policy·MCP·session·swarm·SDK·automation 경계 | 평문 질문, 런타임 gate를 사용자 승인으로 간주하지 않음 |
| OMO | [`omo/README.ko.md`](omo/README.ko.md) | 로컬 Orca 감독 reporter가 preamble에 묶인 Dispatch에서만 best-effort status/heartbeat 직접 메일 전송 | 현재 Dispatch context가 완전하지 않으면 reporter 메일 없음. 복구·cleanup은 coordinator 소유 |
| OpenClaw | [`openclaw/README.ko.md`](openclaw/README.ko.md) | 저장소 내 버전 고정 기능 근거 없음 | 런타임 발견 후, 없으면 평문 질문 |
| OpenCode | [`opencode/README.ko.md`](opencode/README.ko.md) | ask 스타일 승인 프롬프트를 사용할 수 있을 때 우선 | 기능 노출 시 native prompt, 아니면 평문 질문 |

이 표는 완전한 제품 기능표가 아니다. 각 행의 “확인된 기능”은 이 저장소 문서로 직접 추적되는 최소 집합이며, 프로필이 명시한 전제와 검증을 함께 따른다.

## Skill에 넣는 최소 패턴

```markdown
## 런타임 기능
- 필요한 논리 기능: `read`, `search`, `ask_user`, `edit`
- 런타임 프로필: `@instructions/cli/<runtime>/README.md`
- 발견 규칙: 실제로 노출된 기능과 입력 스키마를 먼저 확인한다.
- fallback: `ask_user`를 확인할 수 없으면 사용자 언어로 한 문장 질문 후, 답변 전에는 gated 작업을 수행하지 않는다.
- 승인 경계: 파일 변경, 네트워크, 자격 증명, 외부 시스템 변경은 사용자의 명시적 요청과 별도 안전 규칙을 함께 만족해야 한다.
```

`ask_user`는 논리 기능 이름이며, 특정 런타임의 도구/API 이름이 아니다. 세부 계약은 [`capability-contract.ko.md`](capability-contract.ko.md#사용자-질문과-승인-계약)을 따른다.

## 검증

- [ ] skill이 필요한 **논리 기능**과 fallback을 선언한다.
- [ ] 런타임 고유 기능은 해당 프로필의 로컬 근거 또는 현재 세션의 발견 결과가 있다.
- [ ] 질문은 결과나 안전을 실질적으로 바꾸는 누락 결정에만 사용한다.
- [ ] 구조화 질문/승인 기능이 없을 때 평문 질문 후 gated 작업을 멈춘다.
- [ ] 외부·파괴적·자격 증명·production 작업은 기능 존재와 별개로 명시적 권한을 확인한다.
