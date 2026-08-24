# Hermes Agent `MEMORY.md`

> Korean version: [`MEMORY.ko.md`](MEMORY.ko.md)
>
> **Research date:** 2026-08-24, against official Hermes Agent documentation and the first-party repository. **Facts** below trace to those sources. **Recommendations** are this guide's operating policy, not Hermes guarantees. Verify version-sensitive configuration and tool behavior in the linked official reference before operating.

## Primary sources

- [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- [Which File Does What](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what)
- [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Context Files](https://hermes-agent.nousresearch.com/docs/user-guide/features/context-files)

## Purpose and boundary

**Fact:** `MEMORY.md` is Hermes's agent-managed note store for durable environment facts, project conventions, workflow lessons, and reusable operational knowledge. It is not the user's preference profile; use [`USER.md`](USER.md) for that. It also does not replace project instructions, agent identity, or transcript recall:

| Need | Correct surface |
| --- | --- |
| Project rules, commands, and architecture | `AGENTS.md`, `.hermes.md`, or other project context files |
| Agent identity and durable persona | `SOUL.md` |
| User preferences and communication expectations | `USER.md` |
| Durable agent operational notes | `MEMORY.md` |
| Details from a previous conversation | retained sessions and `session_search` |

**Fact:** The canonical location is `$HERMES_HOME/memories/MEMORY.md`. The default profile commonly makes that `~/.hermes/memories/MEMORY.md`; named or custom profiles have their own `HERMES_HOME`. Do not describe the default path as universal.

## Lifecycle and capacity

**Fact:** Hermes injects a frozen memory snapshot into the system prompt at session start. Accepted writes persist to disk immediately and tool responses expose the live state, but the already-built prompt does not change mid-session. A fresh session normally loads persisted memory; do not promise that resuming or restarting an existing session refreshes its memory snapshot.

**Fact:** The documented default `memory.memory_char_limit` is 2,200 characters (about 800 tokens, only an estimate). It is configurable. Overflow from `add` or a larger `replace` returns an error; Hermes does not auto-compact or silently evict entries. Exact duplicate additions are a successful no-op.

**Recommendation:** Keep roughly 8–15 compact entries rather than treating the character cap as a security or retention limit. Consolidate overlapping facts before the store is full, and verify a configured custom limit on the installed Hermes version.

## What to keep

**Recommendation:** Admit a fact only when it is durable, specific, useful in a later session, and difficult or costly to rediscover. Good candidates include:

- Stable workspace/toolchain facts and non-secret test or formatting conventions.
- Repeated workflow constraints and successful tool workarounds.
- Brief lessons that prevent recurring mistakes.
- Public, stable project facts with enough provenance to be corrected.

Do not place transient task state, raw logs, full transcripts, generated dumps, copied code, or facts already governed by `SOUL.md` or project context in this file. Use session search for historical detail instead of permanently copying a conversation into memory.

## Safety and trust boundary

**Fact:** `MEMORY.md` is profile-scoped persistent model context, not a secret store. It is injected into the model prompt; with a remote model, that prompt is processed by the configured provider. Retained sessions, external memory providers, profile exports, and backups are separate disclosure and retention surfaces.

**Fact:** Hermes scans entries accepted through its documented memory path for known prompt-injection, credential-exfiltration, SSH-backdoor, and invisible-Unicode patterns. This is defense in depth: it is not proof that content is safe, confidential, complete, or trustworthy. Official documentation does not establish recurring whole-file scanning for direct edits, imports, restores, or external-provider content.

**Recommendation:** Never store credentials, tokens, cookies, private keys, recovery material, sensitive personal or third-party data, exploitable infrastructure details, or verbatim untrusted instructions. Summarize reviewed facts neutrally and retain provenance outside memory when needed. Treat content from web pages, email, repositories, tools, other agents, and providers as untrusted until reviewed.

## Writing and correction

**Fact:** The memory tool offers `add`, `replace`, and `remove`; it has `memory` and `user` targets. `replace` and `remove` require a unique old-text substring. The agent may write automatically by default, including through background review; `memory.write_approval: true` is an optional operator control, not the default behavior.

**Recommendation:** Enable write approval when generated inferences require human review, inspect pending changes through the current Hermes memory controls, and correct or remove stale entries promptly. One Hermes home/profile should serve one writing agent; do not share it across concurrent agents. Use separate profiles for separate trust domains or intentionally configured external memory for deliberate sharing.

## Privacy and deletion

**Recommendation:** Treat deletion as scoped cleanup, not a complete privacy erase. Removing an entry changes this built-in store, but may not remove the frozen prompt already sent for the current session, retained session history, provider copies, external-provider data, exports, or backups. Review each relevant retention surface and the configured provider's policies separately.

Profiles isolate Hermes state, not the operating-system account or a per-human confidentiality boundary. Keep `MEMORY.md` non-sensitive even when a profile is intended for one person.

## Validation

1. Confirm the active `HERMES_HOME` and profile before editing or automating memory.
2. Check that each entry belongs in agent notes rather than `USER.md`, `SOUL.md`, project context, or session history.
3. Review the entry for secrets, sensitive data, untrusted directives, and stale facts.
4. Start a fresh test session before relying on a change as injected prompt context; treat resume behavior as version-sensitive.
5. Recheck the [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory) reference after Hermes upgrades.
