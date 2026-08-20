# Hermes Artifact Routing

Read this rule for every Hermes Agent Maker request before asking a question or creating a manifest.

## `classifyRequest`

Classify each requested deliverable, not the request as a whole:

| User goal | Route | Result |
|---|---|---|
| Reusable agent skill package | `skill` | A marked directory with paired `SKILL.md` and `SKILL.ko.md`, plus only justified package resources. |
| Hermes-specific plugin | `native-plugin` | A marked directory with native manifest, registration, schema, and handler files; no secret values. |
| Cross-runtime agent plugin | `portable-plugin` | A marked directory with pinned v1.0.0 portable files that also pass the Hermes subset. |
| Deterministic artifact generator | `skill` or `native-plugin` | Route by the artifact being generated; preserve `artifact:generator` in the normalized intent. |
| Workspace identity and tone | `soul` | Workspace-local `SOUL.md` only. |
| Repository agent guidance | `agents` | Workspace-local `AGENTS.md` only. |
| Proposed USER information | `user-draft` | Workspace-local `USER.md.draft.md` only; never active USER memory. |
| Proposed durable MEMORY information | `memory-draft` | Workspace-local `MEMORY.md.draft.md` only; never active MEMORY memory. |

Do not route these requests: Hermes install, update, login, profile/trust change, plugin install/enable/remove, gateway, Discord, bot, adapter, network service, credential/token/private-key/`.env` handling, schema fetching, or external transmission. Say in easy Korean: “이 작업은 Hermes artifact 생성 범위가 아닙니다. 설치·활성화·연결·비밀값 처리는 여기서 하지 않습니다.” Do not produce a workaround artifact for excluded work.

Discord may be mentioned as context, but it is never an output, configuration, code, template, route, or validation target.

## `splitCompositeRequest`

1. Extract each requested artifact in the order the user stated it.
2. Classify each artifact with `classifyRequest`.
3. Reject excluded portions without converting them into another route.
4. Keep valid routes as one ordered composite request. Each route receives its own normalized spec and preview entries; approval binds the complete ordered change set.
5. Ask for only the first missing decision across the ordered routes. After the answer, repeat classification and ask the next single missing decision only if needed.

Example: “스킬과 portable plugin을 만들고 Discord에 연결해 줘” becomes `skill`, `portable-plugin`, and an excluded Discord portion. First explain portable consequences and ask its form only if the plugin form was not already named; never ask about Discord configuration.

## `collectOneMissingDecision`

A decision is missing only when it is needed to build a strict `NormalizedArtifactSpec`: artifact kind, plugin form, local relative target, package name, artifact intent/content, or explicit target mode when the local contract requires it. Use known user-provided values; do not re-ask them.

Ask one short easy-Korean question, then wait. Prefer these forms:

| Missing decision | Ask |
|---|---|
| Artifact kind | “무엇을 만들까요? skill, plugin, SOUL.md, AGENTS.md, USER draft, MEMORY draft 중 하나를 골라 주세요.” |
| Plugin form | First explain: “native-plugin은 Hermes 전용입니다. portable-plugin은 다른 도구와 함께 쓸 수 있지만 고정된 v1.0.0 규칙과 Hermes subset 검증을 통과해야 합니다.” Then ask: “어느 형식으로 만들까요: native-plugin 또는 portable-plugin?” |
| Target | “어느 workspace 상대 경로에 만들까요? 예: `tools/my-agent`” |
| Name | “artifact 이름을 알려 주세요. 소문자 kebab-case 이름을 써 주세요.” |
| Intent/content | “이 artifact가 해야 할 일을 한 문장으로 알려 주세요.” |

Never combine questions, use unexplained jargon, infer native versus portable, or request credentials. When the user asks to apply an existing `USER.md` or `MEMORY.md`, explain: “USER와 MEMORY는 안전을 위해 draft만 만들 수 있습니다. 제안 문서로 만들겠습니다.” Then route to the corresponding draft without asking for active-memory permission.

## Route completion boundary

Routing does not authorize writes. After every required decision is known, normalize strict JSON, preview all files, and ask for explicit preview-bound approval. Existing files—including a fully owned directory—remain unchanged until that approval. A changed request, preview, target, template version, or current preimage requires a new preview and approval.
