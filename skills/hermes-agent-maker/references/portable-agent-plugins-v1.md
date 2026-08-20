# Portable Agent Plugins v1.0.0 Contract

> Korean mirror: [`portable-agent-plugins-v1.ko.md`](portable-agent-plugins-v1.ko.md).  
> Normative source, pinned: [Agent Plugins specification v1.0.0](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md). Hermes evidence: [Plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins), [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), and local `instructions/cli/hermes-agent/PLUGINS.md`.

## Two validation layers

Validate in this order, offline:

1. **Normative recognition:** recognize the component and transport shapes defined by the pinned Agent Plugins **v1.0.0** specification. Validate `plugin.json`, component locations, optional `mcp.json`, and referenced paths against the local pinned schemas/oracle.
2. **Hermes support policy:** accept only the narrower Hermes portable surface below. A normatively recognizable package can fail this layer. Do not claim Hermes is fully Agent Plugins conformant.

The pin is exactly v1.0.0. The generator reads only checked-in schemas/provenance and package files; it does not fetch remote schemas, resolve URLs, start MCP servers, or use credentials.

## Package shape

```text
plugin-root/
├── plugin.json
├── skills/
│   └── <skill-name>/
│       └── SKILL.md
└── mcp.json                 # optional
```

Paths must resolve inside the resolved plugin root. Reject absolute paths, parent traversal, symlink escape, and an invalid/missing referenced component. `PLUGIN_ROOT` is that resolved root; `PLUGIN_DATA` is Hermes-managed profile-scoped writable storage. Package content is not a place for secrets.

## Hermes portable subset

| Component | Normative recognition | Hermes generator policy |
| --- | --- | --- |
| `plugin.json` | Recognize and validate v1.0.0 plugin metadata. | Required; validate locally before any Hermes-specific rule. |
| Skills | Recognize skills at their fixed v1.0.0 locations. | Accept read-only packaged skills only; Hermes exposes enabled skills through namespaced skill discovery/viewing. |
| MCP `stdio` | Recognize the v1.0.0 stdio transport. | Accept. Command is one executable token with separate arguments; never a shell command. |
| MCP Streamable HTTP | Recognize the v1.0.0 Streamable HTTP transport. | Accept only an absolute `http(s)` URL with no userinfo or fragment. Plain HTTP is localhost/loopback-only. Headers must not cross cross-origin redirects. |
| MCP `sse` | Recognize it when valid under v1.0.0. | **Reject at Hermes subset validation.** Do not generate, accept, or silently downgrade it. |

Validation may report a normative `sse` component accurately, but subset failure is terminal for generated Hermes portable output. This differs from runtime diagnostics that may report and skip legacy SSE: authoring must reject it before output is accepted.

## Not portable-plugin behavior

A portable package does not provide native Python `register(ctx)`, Python tools/handlers, hooks, slash commands, CLI subcommands, provider registration, capability grants, trust, provenance enforcement, permissions, or sandboxing. Use a native Hermes plugin for those needs. Portable instructions and local executables retain full-trust risk; installation/enabling is a trust decision outside this generator.

## Authoring rules

- Keep plugin metadata and component paths deterministic and local.
- Add `mcp.json` only for a valid subset MCP server; do not embed secrets, tokens, `.env` values, or credential placeholders requiring a secret value in package output.
- Do not emit install, enable, remove, gateway, Discord, or remote-fetch behavior.
- Validate all recognized components independently for diagnostics, but reject the package when the requested generated component violates the Hermes subset.
- State supported Hermes behavior precisely: portable skills plus stdio/Streamable HTTP MCP only.

## Review checklist

1. Local provenance identifies the v1.0.0 source URL, retrieval date, and digest; no network access occurs during validation.
2. `plugin.json` and every local component pass the pinned v1.0.0 oracle.
3. Every resolved path remains under plugin root.
4. Every MCP entry is `stdio` or Streamable HTTP and meets its subset constraints.
5. No `sse` entry survives subset validation.
6. No native-only feature, credential, or external side effect is represented as portable behavior.
