# Hermes Agent Plugins

> Korean version: [PLUGINS.ko.md](PLUGINS.ko.md)  
> Implementation guide: [PLUGIN_AUTHORING.md](PLUGIN_AUTHORING.md)  
> Research date: **2026-08-20**. Confirm behavior against the installed Hermes version before release.

## Scope and primary sources

This guide covers choosing, discovering, installing, operating, and securing Hermes plugins. For native manifests, `register(ctx)`, code, validation, packaging, and compatibility, read [Plugin authoring](PLUGIN_AUTHORING.md).

- [Plugins overview and lifecycle](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- [Hermes Agent repository](https://github.com/NousResearch/hermes-agent)
- [Agent Plugins v1 specification](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)

## Choose the smallest extension surface

| Need | Use | Do not use a native general plugin when |
|---|---|---|
| LLM-callable tools, Python hooks, slash commands, CLI subcommands, packaged skills | **Native plugin**: `plugin.yaml` + Python `register(ctx)` | The integration is only an external MCP server or a knowledge workflow. |
| Portable skills and a limited MCP package usable by Agent Plugins implementations | **Portable Agent Plugin v1**: `plugin.json`, `skills/`, optional `mcp.json` | You need Python handlers, hooks, commands, provider registration, or a sandbox. Hermes supports a subset, not full conformance. |
| Instructions/workflow, no executable integration | **Skill** | You need a runtime tool, credentialed API, or lifecycle behavior. |
| Existing external tool server | **MCP** in `mcp_servers` configuration | You need in-process Python behavior or Hermes lifecycle hooks. |
| TTS/STT or shell event command | Config-driven command provider or shell hook | A command template fully expresses the integration. |

**Recommendation:** make a standalone repository for a third-party product integration. This is an official coupling/maintenance boundary, not a quality judgment.

## Discovery and activation lifecycle

Native general plugins contain `plugin.yaml`, `__init__.py`, and `register(ctx)`. Hermes discovers bundled plugins, user plugins in `~/.hermes/plugins/`, trusted project plugins in `.hermes/plugins/` only when `HERMES_ENABLE_PROJECT_PLUGINS=true`, pip entry points, and Nix declarations. On a same-name collision, a later source replaces an earlier source.

General user plugins are **discovered but not executed** until listed in `plugins.enabled`; `plugins.disabled` wins on a conflict. Bundled platforms/backends and specialized provider discovery have separate selection rules, so the allow-list does not control every category.

```bash
# Installation does not imply execution.
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable calculator
hermes plugins disable calculator
hermes plugins remove calculator

# A reproducible install requires an immutable full 40-character commit.
hermes plugins install owner/repository \
  --ref 0123456789abcdef0123456789abcdef01234567
```

**Fact:** Hermes records source, revision, and pin status per profile. It rejects tags, branches, and abbreviated SHAs for a pin, and `plugins update` refuses to move a pinned plugin. Change a pin explicitly with `install ... --force --ref <new-full-sha>`.

**Recommendation:** inspect and pin the exact production revision, then treat an update as a code deployment. Community-index inclusion is metadata review, **not a code audit**.

## Provider and extension boundaries

Use the dedicated interface, not an ordinary tool, for these backends:

| Extension | Boundary and selection |
|---|---|
| Inference/model provider | Register `ProviderProfile` in `plugins/model-providers/<name>/`; user selects it with `--provider` or configuration. |
| Memory provider or context engine | Dedicated single-active-provider interface. |
| Gateway platform, image/video generation, browser, web search, secret source, dashboard auth | Their documented adapter/abstract-base-class interface and discovery path. |
| External tools | Configure MCP; Hermes discovers the server's tools. |

General plugins can coexist. Provider selection has different ownership and activation semantics; keep provider credentials, retries, settings, and capability behavior inside its provider interface.

## Portable Agent Plugins v1

Portable packages are compatibility packages, not native Python plugins:

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       └── SKILL.md
└── mcp.json
```

Hermes validates `plugin.json`, skill frontmatter, fixed component locations, MCP entries, resolved paths, and symlink containment locally; it does not fetch schemas while loading. Enabled packages can provide read-only namespaced skills through `skills_list` and `skill_view`, plus MCP. The namespace is deterministic (`agent-plugin-<slug>-<hash>`). `PLUGIN_ROOT` is the resolved package root; `PLUGIN_DATA` is Hermes-managed, profile-scoped writable storage.

The supported MCP subset is **stdio** and **Streamable HTTP**. Stdio uses one executable token plus separate arguments, never a shell. Streamable HTTP requires an absolute `http(s)` URL without userinfo or fragments; plain HTTP is restricted to localhost/loopback and headers do not cross cross-origin redirects. Legacy `sse` is reported then skipped. Invalid components are skipped independently when valid siblings exist.

Portable Agent Plugins v1 supplies no trust, permissions, provenance, or sandbox. Enabling one gives its instructions and local executable the same full-trust posture as any other installed plugin. Use portable packages for portable skills/MCP only; use native plugins for Python tools, hooks, slash/CLI commands, or provider integration.

## Operations and security

```bash
# Review discovery/load diagnostics and capability consent state.
HERMES_PLUGINS_DEBUG=1 hermes plugins list
hermes logs --level WARNING
hermes plugins capabilities calculator
```

Declare missing runtime credentials with `requires_env` in a native manifest. Installation prompts for absent values; a missing required variable disables the plugin rather than crashing Hermes. Do not store credentials in portable `mcp.json`, manifests, source, logs, package files, or plugin state.

Capabilities such as `tools.override`, host-LLM overrides, and gateway platform actions require declaration and consent. Hermes shows them during install/enable/update, records grants per plugin, and requires re-consent for new capabilities. A plugin must use `ctx.has_capability()` before accessing a privileged host surface.

**Critical fact:** capabilities are consent and audit controls, **not a sandbox**. A native plugin is in-process Python with the user's OS permissions and can ignore host gates, read accessible files, use the network, or spawn processes. Install and enable only trusted code. Prefer least privilege, explicit timeouts, input validation, output redaction, and a capability-free design where possible.

For authoring-specific Doctor behavior, debug details, and secure implementation patterns, see [Plugin authoring](PLUGIN_AUTHORING.md).
