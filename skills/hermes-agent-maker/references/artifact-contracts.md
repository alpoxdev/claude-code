# Hermes Agent Maker Artifact Contracts

> Korean mirror: [`artifact-contracts.ko.md`](artifact-contracts.ko.md).  
> Sources: [Hermes context files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files), [personality](https://hermes-agent.nousresearch.com/docs/user-guide/features/personality), [memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), [plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins), [plugin authoring](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins), and [creating skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills). Local evidence: `instructions/cli/hermes-agent/`.

Use one `kind` only: `skill`, `native-plugin`, `portable-plugin`, `soul`, `agents`, `user-draft`, or `memory-draft`. Interpret requests in the skill; the generator receives only normalized data and static local templates. Writes are direct and transactional: a new target is created, and an existing target is replaced only on explicit user request with `overwrite: true`. A directory kind (`skill`, `native-plugin`, `portable-plugin`) additionally requires a validated `.hermes-agent-maker/ownership.json` marker. A fixed single-file kind (`soul`, `agents`, `user-draft`, `memory-draft`) carries no ownership claim: the generator only requires the existing target to be a regular, non-symlink file, so a hand-authored file at that path is replaceable under `overwrite: true`.

## Output contracts

| Kind | Required output | Boundary |
| --- | --- | --- |
| `skill` | A target directory containing paired `SKILL.md` and `SKILL.ko.md`, `references/procedure.md`, and `templates/output.md`. | Instruction/workflow package, not executable integration. Frontmatter carries `name`, `description`, `version`, `platforms`, and `metadata.hermes.tags`. |
| `native-plugin` | A target directory with `plugin.yaml`, `__init__.py`, `schemas.py`, and `tools.py`. | Native Hermes plugin: `register(ctx)` performs deterministic startup registration; schemas are model-facing and handlers validate inputs and return expected failures safely. No credentials or network/startup side effects. |
| `portable-plugin` | A target directory with `plugin.json` and `skills/<name>/SKILL.md`; optional `mcp/<name>.json`. | Validate against local pinned Agent Plugins v1.0.0 material first, then the Hermes subset in `portable-agent-plugins-v1.md`. It is not a native Python plugin. |
| `soul` | Workspace-local `SOUL.md`. | Identity, tone, communication, uncertainty, and cross-project posture only. Never write `$HERMES_HOME/SOUL.md`; exclude repository paths, commands, temporary tasks, secrets, and safety overrides. |
| `agents` | Workspace-local `AGENTS.md`. | Project architecture, conventions, scope, safety, and verification guidance only. Do not duplicate a competing `.hermes.md` context type or place durable persona here. |
| `user-draft` | Workspace-local `USER.md.draft.md`. | A compact proposal of stable user preferences plus Hermes memory-tool application guidance. Never write active `$HERMES_HOME/memories/USER.md`. |
| `memory-draft` | Workspace-local `MEMORY.md.draft.md`. | A compact proposal of durable environment facts/corrections plus application guidance. Never write active `$HERMES_HOME/memories/MEMORY.md`. |

## Skill package rules

`SKILL.md` states when to use the skill, a numbered procedure, pitfalls, and a verification step. Reference support files through `${HERMES_SKILL_DIR}` so they resolve inside the installed skill directory. Keep `references/` for load-on-demand detail and `templates/` for repeatable output shapes; Hermes copies only `SKILL.md` and the files it explicitly references from `references/`, `templates/`, `scripts/`, `assets/`, and `examples/`.

Declare platform and capability conditions narrowly. A mistaken `requires_toolsets`/`requires_tools` entry hides an otherwise valid skill. Use `required_environment_variables` only for secrets and `metadata.hermes.config` only for non-secret preferences; never embed a value in frontmatter.

## Native plugin rules

`plugin.yaml` declares identity/version and accurately declares provided tools/hooks; `manifest_version: 2` enables the extended field set. `__init__.py` exposes `register(ctx)`. Register tools with documented `ctx.register_tool(...)`, hooks with `ctx.register_hook(...)`, and packaged skills with `ctx.register_skill` only when present. Keep imports and registration deterministic; defer credential reads, network access, background work, and mutations to handlers. Use documented APIs, accept additive hook keyword arguments, and never silently approve actions.

Model-facing schemas state purpose, inputs, and limits. Handlers validate untrusted arguments, bound work, return a JSON string for both success and expected failure, redact sensitive output, and do not use `eval` on model or user input. Native capabilities and required environment variables must be explicit; missing required variables disable the plugin. Declared Python dependencies are not auto-installed.

## Context boundaries

Hermes independently loads instance-owned `SOUL.md`; it selects one project-context type by priority rather than merging all types. `AGENTS.md` is project guidance and may be discovered from the Git root through the working directory. `USER.md` and `MEMORY.md` are Hermes-managed, frozen session snapshots; changes reliably affect a new session. Their default limits are 1,375 and 2,200 characters respectively.

Drafts must say what is proposed, avoid secrets and transient logs, and require the user to apply the content through Hermes's memory tooling. They are review artifacts, not active runtime memory.

## Common prohibitions

Generated artifacts must not contain credentials, tokens, private keys, `.env` values, install/enable/remove instructions, gateway or Discord integration, external transmission, or dynamic schema retrieval. Do not create a plugin when a skill is sufficient; do not claim native hooks, commands, providers, permissions, provenance, or sandboxing for a portable package.

## Authoring checklist

1. Route to exactly one kind; for an unspecified plugin kind, choose from the request and state the consequence in one sentence.
2. Produce English/Korean pairs for user-facing package documents.
3. Write directly with the generator; use `preview` only to show a risky change-set to the user. A preview only renders the artifact and diffs it against the current tree; it never checks ownership, writability, or apply-eligibility, so a successful preview never implies `apply` will succeed.
4. Overwrite an existing target only on explicit user request, with `overwrite: true`. For a directory kind, this additionally requires a validated ownership marker. For a fixed single-file kind (`soul`, `agents`, `user-draft`, `memory-draft`), the target only has to be a regular, non-symlink file — a hand-authored file is replaceable.
5. For portable output, run the offline v1.0.0 contract before Hermes subset policy; never fetch a schema or contact a server.
6. Read the written tree back and confirm it matches the apply receipt.
