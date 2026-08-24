# Hermes Agent `USER.md`

> 영어판: [`USER.md`](USER.md)
>
> **조사일:** 2026-08-24. 공식 Hermes Agent 문서와 first-party 저장소를 근거로 삼았다. 아래 **사실**은 해당 근거를 추적하고, **권고**는 Hermes 보장이 아닌 이 안내서의 운영 정책이다. 버전 의존적인 설정과 tool 동작은 운영 전에 연결된 공식 reference에서 다시 확인한다.

## 1차 출처

- [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- [Which File Does What](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what)
- [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)
- [Profile Distributions](https://hermes-agent.nousresearch.com/docs/user-guide/profile-distributions)
- [FAQ](https://hermes-agent.nousresearch.com/docs/reference/faq)

## 목적과 경계

**사실:** `USER.md`는 사용자에 관한 Hermes-managed profile context다. 안정적인 identity detail, 소통 선호, 기대, workflow habit, technical skill level을 담는다. Agent persona, project instruction file, session transcript, security tier가 아니다.

| 필요 | 알맞은 표면 |
| --- | --- |
| 사용자의 안정적인 선호와 기대 | `USER.md` |
| Agent 환경 사실과 학습한 workaround | [`MEMORY.md`](MEMORY.ko.md) |
| Agent identity와 voice | `SOUL.md` |
| Repository instruction과 architecture | `AGENTS.md`, `.hermes.md` 또는 project context file |
| 이전 대화의 세부 내용 | 보존된 session과 `session_search` |

**사실:** 표준 경로는 `$HERMES_HOME/memories/USER.md`다. `~/.hermes/memories/USER.md`는 default-profile shorthand일 뿐 보편 경로가 아니다. Profile 하나는 여러 interaction 또는 user를 처리할 수 있으므로 이 파일을 기밀 개인 기록으로 취급하지 않는다.

## 수명주기와 용량

**사실:** Hermes는 session 시작 시 frozen `USER.md` snapshot을 system prompt에 넣는다. 성공한 write는 즉시 저장되고 tool feedback은 live지만, 기존 prompt는 그 자리에서 갱신되지 않는다. Fresh session은 보통 저장된 profile을 읽지만, resumed/restarted continuing session의 reload 동작은 약속하지 않는다.

**사실:** 문서화된 기본 `memory.user_char_limit`은 1,375자다(약 500 token은 추정치). 값은 설정할 수 있다. Hermes는 overflow를 auto-compact하지 않고 거절한다. 완전히 같은 항목 추가는 성공하는 no-op다.

**권고:** 5–10개의 짧고 지속되는 사실만 유지한다. 추론한 label 대신 사용자가 정정할 수 있는 직접 표현을 쓴다. Custom limit과 target routing은 배포한 Hermes version에서 검사한다.

## 저장할 내용

**권고:** 다음 session의 상호작용을 개선하는 non-sensitive, durable preference만 저장한다.

- 실제로 필요한 preferred name, stable role, coarse timezone.
- 원하는 응답 깊이, 언어, format, accessibility, 소통 방식.
- 안정적인 workflow habit, technical skill level, 피하고 싶은 구체적 행동.
- 출처가 분명하고 사용자가 쉽게 정정할 수 있는 기대.

Project/tool fact, agent lesson, persona instruction, one-off task state, raw log, 전체 대화 세부 내용, 모호한 inference, 쉽게 다시 찾을 수 있는 내용은 넣지 않는다. Always-on profile context에 history를 복사하지 말고 retained session을 사용한다.

## 동의, 정확성, 정정

**사실:** Hermes는 memory tool로 두 built-in target을 관리하며 background review를 포함해 기본적으로 fact를 자동 저장할 수 있다. `memory.write_approval: true`는 지원되는 표면에서 write를 gate할 수 있지만 기본 consent guarantee가 아닌 선택적 operator policy다.

**권고:** 모든 profile assertion을 정정 가능한 것으로 취급한다. Agent inference를 사용자가 확인한 identity fact처럼 기록하지 않는다. Review가 필요하면 approval을 켜고, 설치된 Hermes control에서 staged/pending change를 확인하며, 오래되었거나 다투는 항목은 즉시 삭제한다.

## 안전, 개인정보, 공유

**사실:** `USER.md`는 secret vault가 아니라 persistent profile-scoped model context다. Model prompt, profile export, backup에 포함될 수 있으며 external memory provider와 retained session은 별도 data flow를 더한다. Hermes는 문서화된 memory path로 허용한 entry의 pattern-based scan을 설명하지만 at-rest encryption, complete erasure, 모든 ingestion path의 완전한 scan, provider별 retention 보장을 약속하지 않는다.

**권고:** Password, API key, token, cookie, private key, recovery code, 금융/건강/법률 identifier, 정확한 위치, 제3자 기밀 정보, private infrastructure detail, 신뢰하지 않는 content에서 복사한 instruction은 절대 저장하지 않는다. 승인된 secret-management/privacy process를 사용한다. Scan result, redaction, command approval, profile separation은 confidentiality guarantee가 아닌 defense-in-depth control이다.

**권고:** Shared profile은 특히 최소 정보만 둔다. Hermes profile은 Hermes state를 분리할 뿐 OS account나 shared gateway의 모든 participant를 분리하지 않는다. Profile을 export/share하기 전에 archive를 확인한다. Filename 기반 credential exclusion이 memory, session, persona content를 안전하게 배포해 주지는 않는다.

## 삭제와 검증

**권고:** `USER.md` entry 삭제는 이 built-in record만 없앤다. 현재 frozen prompt, retained session, external-provider data, profile export, backup, remote model provider의 정책을 별도로 평가한다.

Entry를 신뢰하기 전 다음을 확인한다.

1. Active profile과 `$HERMES_HOME`을 확인한다.
2. 사실이 안정적이고 non-sensitive이며 필요하고 `USER.md`에 속하는지 확인한다.
3. 문구가 검토되지 않은 inference가 아니라 attribution 가능하고 사용자가 정정할 수 있는지 확인한다.
4. Sensitive workflow에서는 generated/automatic change를 채택하기 전에 검토한다.
5. Fresh test session을 시작해 injected context를 확인하고 resume behavior는 version-sensitive로 취급한다.
