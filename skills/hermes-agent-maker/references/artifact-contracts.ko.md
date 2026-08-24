# Hermes Agent Maker Artifact 계약

> 영어 정본: [`artifact-contracts.md`](artifact-contracts.md).  
> 출처: [Hermes context files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files), [personality](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality), [memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins), [plugin authoring](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins), [creating skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills). 로컬 근거: `instructions/cli/hermes-agent/`.

`kind`는 `skill`, `native-plugin`, `portable-plugin`, `soul`, `agents`, `user-draft`, `memory-draft` 중 하나만 씁니다. 요청 해석은 스킬이 하고, 생성기는 정규화된 데이터와 로컬 정적 template만 받습니다. 쓰기는 직접적이고 transaction 방식입니다. 없는 대상은 만들고, 기존 대상은 사용자가 명시적으로 요청하고 `overwrite: true`일 때만 교체합니다. 디렉터리 kind(`skill`, `native-plugin`, `portable-plugin`)는 여기에 더해 검증된 `.hermes-agent-maker/ownership.json` marker가 필요합니다. 고정 단일 파일 kind(`soul`, `agents`, `user-draft`, `memory-draft`)는 소유권 주장이 없습니다. 생성기는 기존 대상이 일반 파일이고 symlink가 아니기만 요구하므로, 손으로 작성한 파일도 `overwrite: true`로 교체할 수 있습니다.

## 산출물 계약

| Kind | 필요한 출력 | 경계 |
| --- | --- | --- |
| `skill` | 짝을 이루는 `SKILL.md`와 `SKILL.ko.md`, `references/procedure.md`, `templates/output.md`를 담은 대상 디렉터리. | 실행 통합이 아니라 지침·워크플로 패키지입니다. frontmatter에 `name`, `description`, `version`, `platforms`, `metadata.hermes.tags`를 담습니다. |
| `native-plugin` | `plugin.yaml`, `__init__.py`, `schemas.py`, `tools.py`를 담은 대상 디렉터리. | Hermes 전용 plugin입니다. `register(ctx)`가 결정적으로 시작 시 등록하고, schema는 모델용이며, handler는 입력을 검증하고 예상 실패를 안전하게 돌려줍니다. credential이나 네트워크·시작 시 부수 효과는 없습니다. |
| `portable-plugin` | `plugin.json`과 `skills/<name>/SKILL.md`를 담은 대상 디렉터리. `mcp/<name>.json`은 선택. | 고정된 로컬 Agent Plugins v1.0.0 자료로 먼저 검증하고, 그다음 `portable-agent-plugins-v1.ko.md`의 Hermes subset으로 검증합니다. native Python plugin이 아닙니다. |
| `soul` | workspace 안의 `SOUL.md`. | 정체성, 말투, 소통, 불확실성 표현, 프로젝트 공통 태도만 담습니다. `$HERMES_HOME/SOUL.md`는 절대 쓰지 않으며 저장소 경로, 명령, 임시 과제, 비밀값, 안전 우회는 제외합니다. |
| `agents` | workspace 안의 `AGENTS.md`. | 프로젝트 구조, 관례, 범위, 안전, 검증 지침만 담습니다. 경쟁하는 `.hermes.md` context 유형을 중복하거나 지속 persona를 넣지 않습니다. |
| `user-draft` | workspace 안의 `USER.md.draft.md`. | 안정적인 사용자 선호의 간결한 제안과 Hermes memory 도구 적용 안내를 담습니다. 활성 `$HERMES_HOME/memories/USER.md`는 절대 쓰지 않습니다. |
| `memory-draft` | workspace 안의 `MEMORY.md.draft.md`. | 지속되는 환경 사실·교정의 간결한 제안과 적용 안내를 담습니다. 활성 `$HERMES_HOME/memories/MEMORY.md`는 절대 쓰지 않습니다. |

## Skill 패키지 규칙

`SKILL.md`는 언제 쓰는지, 번호가 매겨진 절차, 자주 하는 실수, 확인 방법을 담습니다. 보조 파일은 `${HERMES_SKILL_DIR}`로 참조해 설치된 스킬 디렉터리 안에서 해석되게 합니다. `references/`는 필요할 때 읽는 상세 정보에, `templates/`는 반복되는 출력 형태에 씁니다. Hermes는 `SKILL.md`와 그것이 명시적으로 참조하는 `references/`, `templates/`, `scripts/`, `assets/`, `examples/` 파일만 복사합니다.

플랫폼과 capability 조건은 좁게 선언합니다. `requires_toolsets`/`requires_tools`를 잘못 쓰면 멀쩡한 스킬이 보이지 않게 됩니다. `required_environment_variables`는 비밀값에만, `metadata.hermes.config`는 비밀이 아닌 설정에만 씁니다. frontmatter에 값 자체를 넣지 않습니다.

## Native plugin 규칙

`plugin.yaml`은 신원과 버전을 선언하고 제공하는 tool·hook을 정확히 선언합니다. `manifest_version: 2`는 확장 필드를 켭니다. `__init__.py`는 `register(ctx)`를 노출합니다. tool은 문서화된 `ctx.register_tool(...)`로, hook은 `ctx.register_hook(...)`로 등록하고, 패키지 skill은 있을 때만 `ctx.register_skill`로 등록합니다. import와 등록은 결정적으로 유지하고 credential 읽기, 네트워크 접근, 백그라운드 작업, 변경은 handler로 미룹니다. 문서화된 API를 쓰고 hook의 추가 키워드 인자를 받아들이며, 동작을 말없이 승인하지 않습니다.

모델용 schema는 목적, 입력, 한계를 밝힙니다. handler는 신뢰할 수 없는 인자를 검증하고, 작업량을 제한하고, 성공과 예상 실패 모두 JSON 문자열로 돌려주고, 민감한 출력을 가리고, 모델이나 사용자 입력에 `eval`을 쓰지 않습니다. native capability와 필요한 환경 변수는 명시해야 하며, 필요한 변수가 없으면 plugin이 비활성화됩니다. 선언된 Python 의존성은 자동으로 설치되지 않습니다.

## Context 경계

Hermes는 인스턴스가 소유한 `SOUL.md`를 독립적으로 불러오고, 프로젝트 context는 모두 합치지 않고 우선순위로 한 유형만 고릅니다. `AGENTS.md`는 프로젝트 지침이며 Git 루트에서 작업 디렉터리까지 탐색됩니다. `USER.md`와 `MEMORY.md`는 Hermes가 관리하는 세션 고정 스냅샷이라 변경은 새 세션에서 확실히 반영됩니다. 기본 한도는 각각 1,375자와 2,200자입니다.

draft는 무엇을 제안하는지 밝히고, 비밀값과 일시적인 로그를 피하며, 사용자가 Hermes memory 도구로 직접 적용하도록 안내해야 합니다. 검토용 산출물이지 실행 중 memory가 아닙니다.

## 공통 금지

생성된 artifact에는 credential, token, 개인 키, `.env` 값, 설치·활성화·제거 지침, gateway나 Discord 연동, 외부 전송, 동적 schema 조회가 들어가면 안 됩니다. skill로 충분한데 plugin을 만들지 않고, portable 패키지에 native hook·command·provider·permission·provenance·sandbox가 있다고 주장하지 않습니다.

## 작성 점검표

1. 정확히 하나의 kind로 라우팅합니다. plugin 형식이 명시되지 않으면 요청에서 고르고 그 결과를 한 문장으로 말합니다.
2. 사용자용 패키지 문서는 영어와 한국어 짝으로 만듭니다.
3. 생성기로 바로 씁니다. `preview`는 위험한 change-set을 사용자에게 보여줄 때만 씁니다. preview는 artifact를 렌더링해 현재 트리와 비교만 할 뿐 소유권, 쓰기 가능 여부, apply 자격을 전혀 확인하지 않으므로 preview 성공이 `apply` 성공을 뜻하지 않습니다.
4. 기존 대상은 사용자가 명시적으로 요청할 때만 `overwrite: true`로 덮어씁니다. 디렉터리 kind는 여기에 더해 검증된 ownership marker가 필요합니다. 고정 단일 파일 kind(`soul`, `agents`, `user-draft`, `memory-draft`)는 기존 대상이 일반 파일이고 symlink가 아니면 되며, 손으로 작성한 파일도 교체할 수 있습니다.
5. portable 출력은 Hermes subset 정책보다 먼저 오프라인 v1.0.0 계약을 실행합니다. schema를 가져오거나 서버에 접속하지 않습니다.
6. 기록된 트리를 다시 읽어 apply 영수증과 일치하는지 확인합니다.
