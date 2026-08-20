# Hermes Artifact Routing

모든 Hermes Agent Maker 요청에서 질문하거나 manifest를 만들기 전에 이 규칙을 읽습니다.

## `classifyRequest`

요청 전체가 아니라 요청한 산출물마다 분류합니다:

| User goal | Route | Result |
|---|---|---|
| 재사용할 agent skill package | `skill` | 짝인 `SKILL.md`, `SKILL.ko.md`와 필요한 package resource만 있는 marked directory입니다. |
| Hermes 전용 plugin | `native-plugin` | native manifest, registration, schema, handler file이 있는 marked directory입니다. secret value는 넣지 않습니다. |
| 여러 runtime에서 쓸 agent plugin | `portable-plugin` | 고정된 v1.0.0 portable file과 Hermes subset을 모두 통과하는 marked directory입니다. |
| 결정적인 artifact generator | `skill` 또는 `native-plugin` | 생성 대상 artifact에 따라 route하고 normalized intent에 `artifact:generator`를 유지합니다. |
| workspace 정체성과 말투 | `soul` | workspace-local `SOUL.md`만 만듭니다. |
| repository agent guidance | `agents` | workspace-local `AGENTS.md`만 만듭니다. |
| 제안할 USER 정보 | `user-draft` | workspace-local `USER.md.draft.md`만 만듭니다. active USER memory가 아닙니다. |
| 제안할 지속 MEMORY 정보 | `memory-draft` | workspace-local `MEMORY.md.draft.md`만 만듭니다. active MEMORY memory가 아닙니다. |

다음 요청은 route하지 않습니다: Hermes 설치, update, login, profile/trust 변경, plugin install/enable/remove, gateway, Discord, bot, adapter, network service, credential/token/private key/`.env` 처리, schema 가져오기, 외부 전송. 쉬운 한국어로 말합니다: “이 작업은 Hermes artifact 생성 범위가 아닙니다. 설치·활성화·연결·비밀값 처리는 여기서 하지 않습니다.” 제외된 작업을 다른 route의 우회 artifact로 만들지 않습니다.

Discord는 맥락으로 언급될 수 있지만 output, configuration, code, template, route, validation 대상이 아닙니다.

## `splitCompositeRequest`

1. 사용자가 말한 순서대로 요청 artifact를 각각 뽑습니다.
2. `classifyRequest`로 artifact마다 분류합니다.
3. 제외된 부분은 다른 route로 바꾸지 않고 거절합니다.
4. 유효 route는 순서 있는 하나의 composite request로 유지합니다. 각 route는 normalized spec과 preview entry를 따로 가지며 approval은 완전한 순서 change set에 묶입니다.
5. 순서 있는 route 전체에서 첫 번째로 빠진 결정 하나만 묻습니다. 답 뒤에 다시 분류하고 필요할 때만 다음 결정 하나를 묻습니다.

예: “스킬과 portable plugin을 만들고 Discord에 연결해 줘”는 `skill`, `portable-plugin`, 제외된 Discord 부분이 됩니다. plugin 형식이 이미 말되지 않았다면 먼저 portable 결과를 설명하고 형식을 묻습니다. Discord configuration은 절대 묻지 않습니다.

## `collectOneMissingDecision`

strict `NormalizedArtifactSpec`을 만들 때 필요한 경우에만 결정이 빠진 것입니다: artifact kind, plugin form, local relative target, package name, artifact intent/content, 또는 local contract가 요구하는 explicit target mode입니다. 사용자가 이미 준 값은 사용하고 다시 묻지 않습니다.

짧고 쉬운 한국어 질문 하나만 한 뒤 기다립니다. 다음 형식을 우선합니다:

| Missing decision | Ask |
|---|---|
| Artifact kind | “무엇을 만들까요? skill, plugin, SOUL.md, AGENTS.md, USER draft, MEMORY draft 중 하나를 골라 주세요.” |
| Plugin form | 먼저 설명합니다: “native-plugin은 Hermes 전용입니다. portable-plugin은 다른 도구와 함께 쓸 수 있지만 고정된 v1.0.0 규칙과 Hermes subset 검증을 통과해야 합니다.” 다음에 묻습니다: “어느 형식으로 만들까요: native-plugin 또는 portable-plugin?” |
| Target | “어느 workspace 상대 경로에 만들까요? 예: `tools/my-agent`” |
| Name | “artifact 이름을 알려 주세요. 소문자 kebab-case 이름을 써 주세요.” |
| Intent/content | “이 artifact가 해야 할 일을 한 문장으로 알려 주세요.” |

질문을 합치지 않고, 설명 없는 전문 용어를 쓰지 않으며, native/portable을 추측하지 않고, credential을 요구하지 않습니다. 기존 `USER.md` 또는 `MEMORY.md` apply를 요청하면 이렇게 설명합니다: “USER와 MEMORY는 안전을 위해 draft만 만들 수 있습니다. 제안 문서로 만들겠습니다.” 그 뒤 active-memory 권한을 묻지 않고 해당 draft로 route합니다.

## Route completion boundary

Routing은 write 권한이 아닙니다. 필요한 결정이 모두 정해진 뒤 strict JSON으로 normalize하고, 모든 file을 preview한 뒤, preview에 묶인 명시적 approval을 요청합니다. fully owned directory를 포함한 기존 file은 그 승인 전까지 바꾸지 않습니다. 요청, preview, target, template version, 현재 preimage가 바뀌면 새 preview와 approval이 필요합니다.
