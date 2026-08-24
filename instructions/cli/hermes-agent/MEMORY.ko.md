# Hermes Agent `MEMORY.md`

> 영어판: [`MEMORY.md`](MEMORY.md)
>
> **조사일:** 2026-08-24. 공식 Hermes Agent 문서와 first-party 저장소를 근거로 삼았다. 아래 **사실**은 해당 근거를 추적하고, **권고**는 Hermes 보장이 아닌 이 안내서의 운영 정책이다. 버전 의존적인 설정과 tool 동작은 운영 전에 연결된 공식 reference에서 다시 확인한다.

## 1차 출처

- [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- [Which File Does What](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what)
- [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Context Files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files)

## 목적과 경계

**사실:** `MEMORY.md`는 오래 유지할 환경 사실, project convention, workflow lesson, 재사용할 운영 지식을 위한 Hermes의 agent-managed note store다. 사용자 선호 profile은 [`USER.md`](USER.ko.md)에 둔다. 이 파일은 project instruction, agent identity, transcript recall도 대체하지 않는다.

| 필요 | 알맞은 표면 |
| --- | --- |
| Project rule, 명령, architecture | `AGENTS.md`, `.hermes.md` 또는 다른 project context file |
| Agent identity와 지속되는 persona | `SOUL.md` |
| 사용자 선호와 소통 기대 | `USER.md` |
| 지속되는 agent 운영 메모 | `MEMORY.md` |
| 이전 대화의 세부 내용 | 보존된 session과 `session_search` |

**사실:** 표준 위치는 `$HERMES_HOME/memories/MEMORY.md`다. Default profile에서는 보통 `~/.hermes/memories/MEMORY.md`가 되지만 named/custom profile은 각자 `HERMES_HOME`을 가진다. Default path를 보편 경로로 표현하지 않는다.

## 수명주기와 용량

**사실:** Hermes는 session 시작 시 frozen memory snapshot을 system prompt에 넣는다. 허용된 write는 즉시 disk에 저장되고 tool response는 live state를 보여 주지만, 이미 만들어진 prompt는 session 중간에 바뀌지 않는다. Fresh session은 보통 저장된 memory를 읽지만, resume 또는 restart가 기존 session snapshot을 갱신한다고 약속하지 않는다.

**사실:** 문서화된 기본 `memory.memory_char_limit`은 2,200자다(약 800 token은 추정치일 뿐). 값은 설정할 수 있다. `add` 또는 더 긴 `replace`가 한도를 넘으면 error가 나며 Hermes는 auto-compact하거나 조용히 항목을 버리지 않는다. 완전히 같은 항목 추가는 성공하는 no-op다.

**권고:** 문자 한도를 security/retention 한도로 보지 말고 8–15개의 짧은 항목을 유지한다. 꽉 차기 전에 겹치는 사실을 통합하고, custom limit은 설치된 Hermes version에서 확인한다.

## 저장할 내용

**권고:** 다음 session에도 유용하고, 구체적이며, 다시 찾기 어렵거나 비용이 큰 사실만 넣는다.

- Secret이 아닌 안정적인 workspace/toolchain 사실과 test/format convention.
- 반복되는 workflow 제약과 검증된 tool workaround.
- 같은 실수를 막는 짧은 lesson.
- 수정 가능하도록 provenance가 있는 공개·안정 project 사실.

일시적인 task state, raw log, 전체 transcript, generated dump, 복사한 code, `SOUL.md`나 project context가 이미 다루는 사실은 넣지 않는다. 이전 대화의 세부 내용은 memory에 복사하지 말고 session search를 사용한다.

## 안전과 신뢰 경계

**사실:** `MEMORY.md`는 secret store가 아니라 profile-scoped persistent model context다. Model prompt에 들어가며 remote model을 쓰면 설정된 provider가 그 prompt를 처리한다. 보존된 session, external memory provider, profile export, backup은 별도의 disclosure/retention 표면이다.

**사실:** Hermes는 문서화된 memory 경로로 허용한 entry에서 알려진 prompt-injection, credential exfiltration, SSH backdoor, invisible Unicode pattern을 scan한다. 이는 defense in depth이며 내용의 안전성, 기밀성, 완전성, 신뢰성을 증명하지 않는다. 공식 문서는 direct edit, import, restore, external-provider content를 매 startup마다 전체 scan한다고 보장하지 않는다.

**권고:** Credential, token, cookie, private key, recovery material, 민감한 개인정보/제3자 정보, 악용 가능한 infrastructure detail, 검토하지 않은 지시문을 절대 저장하지 않는다. 필요하면 검토한 사실을 중립적으로 요약하고 provenance는 memory 밖에 보관한다. Web page, email, repository, tool, 다른 agent, provider에서 온 내용은 검토 전까지 신뢰하지 않는다.

## 작성과 정정

**사실:** Memory tool은 `add`, `replace`, `remove`를 제공하며 `memory`와 `user` target을 가진다. `replace`와 `remove`에는 고유한 old-text substring이 필요하다. Agent는 background review를 포함해 기본적으로 자동 write할 수 있으며, `memory.write_approval: true`는 기본값이 아닌 선택적 operator control이다.

**권고:** Generated inference에 human review가 필요하면 write approval을 켜고, 설치된 Hermes의 memory control로 pending change를 검토한다. 오래되거나 틀린 항목은 즉시 수정/삭제한다. Hermes home/profile 하나에는 writer agent 하나만 둔다. Trust domain을 분리하려면 profile을 나누고, 의도적으로 공유할 때만 external memory를 설정한다.

## 개인정보와 삭제

**권고:** 삭제를 완전한 privacy erase로 보지 않는다. 항목 삭제는 이 built-in store만 바꾸며, 현재 session에 이미 전송된 frozen prompt, retained session history, provider copy, external-provider data, export, backup은 별도 검토가 필요하다. Profile은 Hermes state를 분리할 뿐 OS account나 사람별 confidentiality boundary가 아니다. 한 사람용 profile이라도 `MEMORY.md`에는 민감한 내용을 넣지 않는다.

## 검증

1. Memory를 edit/automation하기 전 active `HERMES_HOME`과 profile을 확인한다.
2. Entry가 agent note인지 `USER.md`/`SOUL.md`/project context/session history 대상인지 확인한다.
3. Secret, 민감 정보, 신뢰하지 않는 directive, 오래된 사실이 없는지 검토한다.
4. Prompt context 반영을 믿기 전 fresh test session을 시작하고 resume 동작은 version-sensitive로 취급한다.
5. Hermes upgrade 후 [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) reference를 다시 확인한다.
