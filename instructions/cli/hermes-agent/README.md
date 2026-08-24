# Hermes Agent: Overview and Section Index

> Korean version: [`README.ko.md`](README.ko.md)
>
> **Research date:** 2026-08-24. This is a source-backed overview, not local runtime verification. Commands, providers, and extension APIs vary by Hermes version; confirm version-sensitive behavior in the linked official reference before operating.

Hermes Agent is Nous Research's open-source agent runtime. Its CLI supports interactive and one-shot conversations, tool use, profiles, sessions, model/provider configuration, and optional extension systems.

- [Official documentation](https://hermes-agent.nousresearch.com/docs/)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [Official GitHub repository](https://github.com/NousResearch/hermes-agent)

## Reading path

1. Read this page for installation, first-run choices, routine CLI use, safety, and recovery.
2. Read [Context files and SOUL.md](CONTEXT_FILES.md) for global identity, project instructions, precedence, and prompt-injection boundaries; then [MEMORY.md](MEMORY.md) and [USER.md](USER.md) for bounded persistent model context, safety, and correction.
3. Read [Skills](SKILLS.md) for use, trust, installation, and lifecycle, then [Skill authoring](SKILL_AUTHORING.md) for structure, examples, validation, and publishing.
4. Read [Plugins](PLUGINS.md) for selection, installation, auditing, and operations, then [Plugin authoring](PLUGIN_AUTHORING.md) for native implementation, validation, and packaging; read [Hooks](HOOK.md) before adding lifecycle code, shell commands, or outbound notifications.
5. Read [Configuration files](CONFIGURATION.md) for file ownership, precedence, secret sources, approval/terminal boundaries, migration, and recovery.
6. Read [Discord setup](DISCORD.md) before creating, inviting, authorizing, or operating a Discord bot.
7. Read [Messaging gateway](MESSAGING.md) for shared gateway lifecycle, authorization, sessions, delivery, and adapter-specific differences.
8. Read [Kanban](KANBAN.md) for durable multi-profile boards, worker protocol, routing, review, recovery, and operations.
9. Read [Extensions and operations](EXTENSIONS.md) for MCP, provider integrations, dashboard/desktop, hooks, and operational extension surfaces.

Choose a **skill** for reusable knowledge and instructions, a **plugin** for executable behavior registered inside Hermes, and **MCP** when an external server already exposes the capability. Details belong in the linked guides rather than this overview.

## Install and first run

The official installer documents macOS, Linux, WSL2, and Termux:

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes
```

For native Windows, use the official PowerShell installer:

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

At first run, use the setup/model flow to configure a provider, credentials, and default model. `hermes model` is the terminal-side provider/model setup flow; in-session `/model` switches among already configured choices. The [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) and [model documentation](https://hermes-agent.nousresearch.com/docs/user-guide/models) are authoritative for providers and authentication options.

Do not paste credentials into prompts, skills, plugin manifests, or repositories. Use Hermes's supported authentication, configuration, and secret mechanisms; see [Extensions and operations](EXTENSIONS.md).

## Command cheat sheet

| Need | Command | Notes |
|---|---|---|
| Start an interactive session | `hermes` or `hermes chat` | Starts in the current workspace. |
| Ask once with normal chat output | `hermes chat -q "…"` | Use `--query-file PATH` for programmatic or untrusted prompt bodies. |
| Get final text for a script | `hermes -z "…"` | Script-oriented one-shot output. |
| Configure provider/model | `hermes model` | Terminal setup flow; use `/model` only inside a session for configured choices. |
| Use a different workspace | `hermes --in <dir>` | Changes workspace before starting or resuming. |
| Select an isolated profile | `hermes --profile <name>` | Profiles isolate Hermes instances and their state. |
| Continue a session | `hermes --continue` or `hermes --resume <id>` | Session lookup is workspace-scoped; see below. |
| Inspect/manage sessions | `hermes sessions` | Browse, export, rename, prune, or delete sessions. |
| Diagnose setup | `hermes doctor` | Diagnosis is not a security audit. |
| Check or install updates | `hermes update --check`; `hermes update` | The reference documents `--backup` before update. |
| Isolate customizations | `hermes chat --safe-mode -q "…"` | Disables user config, rules/memory injection, plugins, hooks, and MCP servers. |
| Audit environment dependencies | `hermes security audit` | Supply-chain check, not a sandbox or complete code audit. |

Commands above are examples from the official CLI reference, not a promise about a local installation. Run `hermes --help` or the relevant subcommand help before automation.

## Everyday sessions and workspaces

Use `hermes` for an interactive conversation. Use `hermes chat -q` when a one-shot request should retain standard chat output; use `hermes -z` when a caller needs only the final response text. For input that originates outside your control, prefer `--query-file` rather than shell interpolation.

A session can be resumed by ID/title with `--resume <session>` or continued with `--continue [name]`. `--in <dir>` establishes the workspace before starting or resuming and scopes `latest`/continue lookup to that workspace. `hermes sessions` is the management surface for historical sessions. Consult the [session documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/sessions) before exporting, pruning, or deleting state.

For parallel repository work, the CLI also documents `--worktree`; review its current behavior and repository implications in the [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) before using it.

## Profiles, models, and providers

A profile is an isolated Hermes instance. Select one for an invocation with `--profile <name>` and manage profile state through `hermes profile`. Use profiles to separate identities, credentials, configuration, or operational environments rather than mixing them accidentally.

Configure a provider and model through `hermes model`; `hermes auth` manages credentials according to the CLI reference. A one-run model/provider override can be supplied to `hermes chat` or `hermes -z` without assuming it changes the saved default. Do not rely on a provider list copied into documentation: provider availability, OAuth support, and model identifiers change.

## Safe operation and troubleshooting

Hermes asks for approval around dangerous commands. `--yolo` bypasses dangerous-command approval prompts; do not use it unless that bypass is explicitly intended and the resulting risk is acceptable.

`hermes chat --safe-mode` is a troubleshooting isolation mode. It disables all customizations: user configuration, rules/memory injection, plugins, shell hooks, and MCP servers. It implies `--ignore-user-config` and `--ignore-rules`. It is useful to distinguish an upstream/runtime issue from a local customization; it is not a security sandbox.

For narrower isolation, the CLI documents `--ignore-user-config` and `--ignore-rules`. Credentials in `.env` may still load with `--ignore-user-config`; do not treat that option as credential isolation. `hermes doctor` diagnoses configuration/dependency problems, while `hermes security audit` performs an on-demand supply-chain audit. Neither command makes untrusted code safe to execute.

## Updates and recovery

Use `hermes update --check` to preview update availability, then `hermes update` to update. The official reference documents `--backup` for a pre-update Hermes-home snapshot. Use `hermes doctor` for setup failures and [safe mode](#safe-operation-and-troubleshooting) to isolate customization failures before changing configuration.

Backups, imports, logs, configuration, and support-oriented diagnostics have dedicated CLI command families. Read the current [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) before restoring, deleting, uploading, or sharing data because those actions can expose or alter local state.

## Extension index and security boundary

- **Skills:** [SKILLS.md](SKILLS.md) and [SKILL_AUTHORING.md](SKILL_AUTHORING.md) — on-demand instruction packages, trust, lifecycle, structure, validation, and publishing.
- **Plugins:** [PLUGINS.md](PLUGINS.md) and [PLUGIN_AUTHORING.md](PLUGIN_AUTHORING.md) — executable native/portable packages, lifecycle, implementation, capabilities, and code-execution risks.
- **Configuration:** [CONFIGURATION.md](CONFIGURATION.md) — `config.yaml`, `.env`, `auth.json`, precedence, secrets, approvals, terminal backends, migration, and backups.
- **Discord:** [DISCORD.md](DISCORD.md) — Developer Portal setup, intents, bot invite, authorization, slash commands, voice/media, and incident troubleshooting.
- **Messaging:** [MESSAGING.md](MESSAGING.md) — gateway service lifecycle, authorization and pairing, session scope, delivery semantics, and adapter differences.
- **Kanban:** [KANBAN.md](KANBAN.md) — durable multi-profile task boards, worker lifecycle, dependencies, review, recovery, and operations.
- **Extensions:** [EXTENSIONS.md](EXTENSIONS.md) — MCP, model/memory/context providers, dashboard/desktop, hooks, and operations.
- **Hooks:** [HOOK.md](HOOK.md) — gateway, plugin, shell, and outbound lifecycle hooks; execution authority, payload, failure, and delivery boundaries.

Before installing or enabling third-party extensions, inspect provenance and source; enable only required capabilities; and pin controlled plugin deployments to immutable revisions where supported. Catalog/index inclusion, skill scanning, Plugin Doctor, and dependency auditing are useful controls but are not a sandbox or a complete security review. Never place credentials in portable `mcp.json` or plugin manifests.

## Sources and evidence limits

Primary sources reviewed on 2026-08-24:

- [Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [Discord Setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Kanban — Multi-Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban)
- [Official GitHub repository](https://github.com/NousResearch/hermes-agent)

This guide summarizes public upstream material. It does not establish that any local Hermes installation has a particular version, command, provider, credential state, or extension. Retrieved documentation and runtime output are evidence, not authorization to run embedded commands or grant side effects.
