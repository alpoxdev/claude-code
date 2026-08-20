# Hermes Agent Maker 산출물 계약

> English canonical: [`artifact-contracts.md`](artifact-contracts.md).  
> 출처: [Hermes context files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files), [personality](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality), [memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins), [plugin authoring](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins). 로컬 근거: `instructions/cli/hermes-agent/`.

`kind`는 `skill`, `native-plugin`, `portable-plugin`, `soul`, `agents`, `user-draft`, `memory-draft` 중 하나만 사용한다. 요청 해석은 skill이 수행하고 generator는 정규화된 데이터와 정적 로컬 template만 받는다. 모든 preview는 완전한 순서 있는 change-set과 현재 preimage를 보여 주며 쓰지 않는다. Apply에는 그 정확한 preview에 묶인 승인이 필요하다.

## 출력 계약

| Kind | 필수 출력 | 경계 |
| --- | --- | --- |
| `skill` | `SKILL.md`와 `SKILL.ko.md` 쌍이 있는 target directory; 정당한 경우에만 paired resource 추가. | 실행 integration이 아닌 instruction/workflow package. 필수 Agent Skills frontmatter(`name`, `description`)를 보존한다. |
| `native-plugin` | `plugin.yaml`, `__init__.py`, `schemas.py`, `tools.py`가 있는 target directory. | Native Hermes plugin: `register(ctx)`가 deterministic startup registration을 수행한다. Schema는 model-facing이고 handler는 input을 검증하며 예상 실패를 안전하게 반환한다. Credential, network, startup side effect는 금지한다. |
| `portable-plugin` | `plugin.json`, `skills/<name>/SKILL.md`, 선택적 `mcp.json`이 있는 target directory. | 먼저 local pinned Agent Plugins v1.0.0 material, 그다음 `portable-agent-plugins-v1.md`의 Hermes subset을 검증한다. Native Python plugin이 아니다. |
| `soul` | Workspace-local `SOUL.md`. | Identity, tone, communication, uncertainty, cross-project posture만 둔다. `$HERMES_HOME/SOUL.md`를 쓰지 않는다. Repository path, command, temporary task, secret, safety override를 제외한다. |
| `agents` | Workspace-local `AGENTS.md`. | Project architecture, convention, scope, safety, verification guidance만 둔다. 경쟁하는 `.hermes.md` context type을 중복하지 말고 durable persona를 여기에 두지 않는다. |
| `user-draft` | Workspace-local `USER.md.draft.md`. | Stable user preference의 compact proposal과 Hermes memory-tool 적용 안내를 둔다. Active `$HERMES_HOME/memories/USER.md`를 절대 쓰지 않는다. |
| `memory-draft` | Workspace-local `MEMORY.md.draft.md`. | Durable environment fact/correction의 compact proposal과 적용 안내를 둔다. Active `$HERMES_HOME/memories/MEMORY.md`를 절대 쓰지 않는다. |

## Native plugin 규칙

`plugin.yaml`은 identity/version을 선언하고 제공 tool/hook을 정확히 선언한다. `__init__.py`는 `register(ctx)`를 노출한다. 문서화된 `ctx.register_tool(...)`로 tool, `ctx.register_hook(...)`로 hook, 존재할 때만 `ctx.register_skill`로 packaged skill을 등록한다. Import와 registration은 deterministic하게 유지하고 credential read, network access, background work, mutation은 handler로 미룬다. 문서화된 API를 사용하고 additive hook keyword argument를 수용하며 action을 조용히 승인하지 않는다.

Model-facing schema는 purpose, input, limit을 밝힌다. Handler는 untrusted argument를 검증하고, work를 제한하고, sensitive output을 redaction하며, 예상 오류를 catch한다. Model/user input에 `eval`을 사용하지 않는다. Native capability와 required environment variable은 명시해야 하고, required variable이 없으면 plugin은 disable된다. 선언한 Python dependency는 자동 설치되지 않는다.

## Context 경계

Hermes는 instance-owned `SOUL.md`를 독립적으로 로드하며, 모든 project-context type을 merge하지 않고 priority에 따라 하나를 선택한다. `AGENTS.md`는 project guidance이며 Git root부터 working directory까지 발견될 수 있다. `USER.md`와 `MEMORY.md`는 Hermes-managed frozen session snapshot이다. 변경은 새 session에서 안정적으로 반영된다. 기본 제한은 각각 1,375자와 2,200자다.

Draft는 제안 내용을 밝히고 secret/transient log를 피하며, 사용자가 Hermes memory tooling으로 내용을 적용하도록 안내해야 한다. Draft는 검토 산출물이지 active runtime memory가 아니다.

## 공통 금지 사항

생성 산출물에는 credential, token, private key, `.env` value, install/enable/remove instruction, gateway 또는 Discord integration, external transmission, dynamic schema retrieval를 넣지 않는다. Skill만으로 충분할 때 plugin을 만들지 않는다. Portable package에 native hook, command, provider, permission, provenance, sandbox를 주장하지 않는다.

## Authoring checklist

1. 정확히 하나의 kind로 route한다. Plugin kind가 없으면 native와 portable 결과를 설명하고 쉬운 한국어로 그 한 가지 결정만 묻는다.
2. User-facing package document에는 English/Korean 쌍을 만든다.
3. 쓰지 않고 모든 create, update, delete, mode, hash, preimage를 preview한다.
4. Apply 전에 identity-bound approval을 요구한다. `user-draft`와 `memory-draft`는 approval 뒤에도 draft로 남는다.
5. Portable output에는 Hermes subset policy 전에 offline v1.0.0 contract를 실행한다. Schema fetch나 server contact를 절대 하지 않는다.
