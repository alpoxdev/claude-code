# Hermes Artifact Routing

Read this rule for every Hermes Agent Maker request before building a normalized spec.

## `classifyRequest`

Classify each requested deliverable, not the request as a whole:

| User goal | Route | Result |
|---|---|---|
| Reusable agent skill package | `skill` | A marked directory with paired `SKILL.md` and `SKILL.ko.md`, a `references/` detail file, and an output template. |
| Hermes-specific plugin | `native-plugin` | A marked directory with `plugin.yaml`, `__init__.py`, `schemas.py`, and `tools.py`; deterministic `register(ctx)` and validating handlers; no secret values. |
| Cross-runtime agent plugin | `portable-plugin` | A marked directory with pinned v1.0.0 portable files that also pass the Hermes subset. |
| Deterministic artifact generator | `skill` or `native-plugin` | Route by the artifact being generated: instructions become a `skill`, executable registration becomes a `native-plugin`. |
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
4. Keep valid routes as one ordered composite request; each route gets its own normalized spec and its own generator run, executed in the stated order.
5. Resolve missing values from context first. Ask only about a fork that context genuinely cannot settle, then continue through the remaining routes without re-asking.

Example: “스킬과 portable plugin을 만들고 Discord에 연결해 줘” becomes `skill`, `portable-plugin`, and an excluded Discord portion. Generate both artifacts and state plainly that the Discord part is out of scope.

## `resolveSpecValues`

A `NormalizedArtifactSpec` needs `kind`, `mode`, `summary`, `target`, `template_version`, plus `name` for the three directory kinds. Derive each value instead of interviewing the user:

| Value | How to resolve |
|---|---|
| Artifact kind | Take it from the request wording; for a plugin whose form is unstated, see the rule below. |
| Mode | Manifest field, not a CLI flag; use `"apply"` by default, `"preview"` only under the preview rule. |
| Plugin form | Choose `native-plugin` when the request needs Python tools, hooks, commands, or Hermes registration. Choose `portable-plugin` when the request emphasizes cross-runtime reuse or instruction-only packaging. State the choice and its consequence in one sentence; ask only when both readings stay equally plausible. |
| Target | Fixed for `soul`, `agents`, `user-draft`, and `memory-draft`. For directory kinds, derive a workspace-relative path from the package name, defaulting to `<name>` at the workspace root unless the user named a location. |
| Name | Lowercase kebab-case derived from the user's wording. |
| Summary | One plain sentence describing what the artifact is for, drawn from the request. It must not contain install, credential, gateway, Discord, or network terms; the schema and generator both reject those. |
| Overwrite | Set `overwrite: true` only when the user asked to replace an existing artifact this generator owns. Never set it to work around `E_TARGET_EXISTS` on an unfamiliar path. |

When the user asks to apply an existing `USER.md` or `MEMORY.md`, explain: “USER와 MEMORY는 안전을 위해 draft만 만들 수 있습니다. 제안 문서로 만들겠습니다.” Then route to the corresponding draft and generate it.

Never request credentials, never infer a plugin form silently when the consequence is material, and never pass natural language directly to the generator.

## Route completion boundary

Routing authorizes generation. Once every required value is known, normalize the strict JSON and run the generator in `apply` mode; no approval step stands between routing and writing. Use `preview` first only when the run would overwrite an existing artifact or touch an unfamiliar target, and report the change-set in that case. An existing target still stays unchanged unless the spec sets `overwrite: true` and the ownership marker validates, as defined in [`write-safety.md`](write-safety.md).
