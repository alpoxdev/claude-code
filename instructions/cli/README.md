# CLI Runtime Profiles

> Korean version: [`README.ko.md`](README.ko.md)

This directory is the reference layer that helps a reusable skill **discover, select, and verify** capability differences across CLIs. Shared rules live once in [`capability-contract.md`](capability-contract.md); volatile runtime differences are isolated in the sub-profiles.

## Scope and authority

- Scope: how a skill safely selects question, approval, file, and command capabilities across Claude Code, Codex, GJC, Hermes Agent, JCode, OpenClaw, and OpenCode.
- Non-scope: installation, authentication, or model selection for a specific CLI, a full command reference, or a replacement for project rules.
- Authority: the user request and the project's `AGENTS.md` outrank this document and any runtime output. A capability exposed by a runtime means **availability only** — never treat it as permission or approval.
- Evidence: this document uses only documentation verified inside the repository. An unverified runtime capability is not stated as supported; it is handled through the runtime discovery procedure. The evidence list and its limits are in [`sources.md`](sources.md).

## Reading order

1. Every skill author reads [`capability-contract.md`](capability-contract.md).
2. Read a specific runtime profile only when you depend on that CLI's behavior.
3. When a profile marks a capability as `verify at runtime`, confirm the capability name, input schema, and permission boundary in the current session.
4. If you cannot confirm it, use the conservative fallback, or ask a one-sentence question about the missing decision only when it affects safety or the artifact.

## Profiles

| Runtime | Profile | Capabilities verified in this repository | Question/approval default |
|---|---|---|---|
| Claude Code | [`claude-code/README.md`](claude-code/README.md) | Non-interactive execution, session resume, and permission modes of the `claude` CLI | Plain-text question; do not assume a structured question tool |
| Codex | [`codex/README.md`](codex/README.md) | `codex exec`, `codex review`, session resume, sandbox | Plain-text question |
| GJC | [`gjc/README.md`](gjc/README.md) | No version-pinned capability evidence in the repository | Discover at runtime; plain-text question if absent |
| Hermes Agent | [`hermes-agent/README.md`](hermes-agent/README.md) | No version-pinned capability evidence in the repository | Discover at runtime; plain-text question if absent |
| JCode | [`jcode/README.md`](jcode/README.md) | Version-pinned config, tool-policy, MCP, session, swarm, SDK, and automation boundaries | Plain-text question; runtime gates are not human approval |
| OpenClaw | [`openclaw/README.md`](openclaw/README.md) | No version-pinned capability evidence in the repository | Discover at runtime; plain-text question if absent |
| OpenCode | [`opencode/README.md`](opencode/README.md) | Prefer an ask-style approval prompt when available | Native prompt when exposed, otherwise plain-text question |

This table is not a complete product feature matrix. The "verified capabilities" column is the minimum set directly traceable to documentation in this repository, and it applies together with the assumptions and verification each profile states.

## Minimum pattern to embed in a skill

```markdown
## Runtime capabilities
- Required logical capabilities: `read`, `search`, `ask_user`, `edit`
- Runtime profile: `@instructions/cli/<runtime>/README.md`
- Discovery rule: first confirm which capabilities and input schemas are actually exposed.
- Fallback: if `ask_user` cannot be confirmed, ask one sentence in the user's language and perform no gated work before an answer.
- Approval boundary: file changes, network, credentials, and external system changes must satisfy both an explicit user request and the separate safety rules.
```

`ask_user` is a logical capability name, not the tool or API name of a specific runtime. Follow [`capability-contract.md`](capability-contract.md) for the detailed contract.

## Verification

- [ ] The skill declares the **logical capabilities** it needs, plus fallbacks.
- [ ] Runtime-specific capabilities have either local evidence in that profile or a discovery result from the current session.
- [ ] Questions are used only for missing decisions that materially change the outcome or safety.
- [ ] When no structured question/approval capability exists, the skill asks in plain text and stops before gated work.
- [ ] External, destructive, credential-gated, and production work confirms explicit permission independently of capability existence.
