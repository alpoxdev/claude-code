# Hermes Agent `USER.md`

> Korean version: [`USER.ko.md`](USER.ko.md)
>
> **Research date:** 2026-08-24, against official Hermes Agent documentation and the first-party repository. **Facts** below trace to those sources. **Recommendations** are this guide's operating policy, not Hermes guarantees. Verify version-sensitive configuration and tool behavior in the linked official reference before operating.

## Primary sources

- [Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)
- [Which File Does What](https://hermes-agent.nousresearch.com/docs/user-guide/which-file-does-what)
- [Profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles)
- [Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions)
- [Profile Distributions](https://hermes-agent.nousresearch.com/docs/user-guide/profile-distributions)
- [FAQ](https://hermes-agent.nousresearch.com/docs/reference/faq)

## Purpose and boundary

**Fact:** `USER.md` is Hermes-managed profile context about a user: stable identity details, communication preferences, expectations, workflow habits, and technical skill level. It is not an agent persona, project instruction file, session transcript, or security tier. The semantic split is:

| Need | Correct surface |
| --- | --- |
| User's stable preferences and expectations | `USER.md` |
| Agent environment facts and learned workarounds | [`MEMORY.md`](MEMORY.md) |
| Agent identity and voice | `SOUL.md` |
| Repository instructions and architecture | `AGENTS.md`, `.hermes.md`, or project context files |
| Prior conversation detail | retained sessions and `session_search` |

**Fact:** The canonical path is `$HERMES_HOME/memories/USER.md`. `~/.hermes/memories/USER.md` is the default-profile shorthand, not a universal location. A profile can serve multiple interactions or users, so this file is not a confidential, per-person record.

## Lifecycle and capacity

**Fact:** Hermes injects a frozen `USER.md` snapshot into the system prompt at session start. A successful write persists immediately and tool feedback is live, but the existing prompt does not update in place. A fresh session normally loads the persisted profile; no promise should be made about reload behavior for a resumed or restarted continuing session.

**Fact:** The documented default `memory.user_char_limit` is 1,375 characters (about 500 tokens, an estimate), and is configurable. Hermes rejects overflow rather than auto-compacting. Exact duplicate additions are successful no-ops.

**Recommendation:** Keep about 5–10 concise, durable facts. Prefer direct, user-correctable statements over inferred labels. Test custom limits and target routing on the deployed Hermes version before depending on them.

## What belongs here

**Recommendation:** Store only non-sensitive, durable preferences that improve later interactions, such as:

- Preferred name, stable role, and coarse timezone when genuinely useful.
- Desired response depth, language, formatting, accessibility, and communication style.
- Stable workflow habits, technical skill level, and specific behaviors to avoid.
- Expectations that are clearly attributable and easy for the user to correct.

Do not use `USER.md` for project/tool facts, agent lessons, persona instructions, one-off task state, raw logs, full conversation details, vague inferences, or content that can be cheaply rediscovered. Keep history in retained sessions instead of copying it into always-on profile context.

## Consent, accuracy, and correction

**Fact:** Hermes manages both built-in memory targets through its memory tool and can save facts automatically by default, including from background review. `memory.write_approval: true` can gate writes on supported surfaces; it is an optional operator policy, not a default consent guarantee.

**Recommendation:** Treat every profile assertion as correctable. Do not record an agent inference as a user-confirmed identity fact. Enable approval when review is needed, inspect staged or pending changes with the installed Hermes controls, and remove stale, disputed, or no-longer-needed entries promptly.

## Safety, privacy, and sharing

**Fact:** `USER.md` is persistent profile-scoped model context, not a secret vault. It can be included in a model prompt, profile exports, and backups; external memory providers and retained sessions add separate data flows. Hermes documents pattern-based scanning for memory entries accepted through its memory path, but does not promise encryption at rest, complete erasure, comprehensive scan coverage for every ingestion path, or provider-specific retention guarantees.

**Recommendation:** Never store passwords, API keys, tokens, cookies, private keys, recovery codes, financial/health/legal identifiers, precise location, confidential third-party information, private infrastructure details, or copied instructions from untrusted content. Use an approved secret-management and privacy process instead. Scan results, redaction, command approval, and profile separation are defense-in-depth controls, not confidentiality guarantees.

**Recommendation:** Keep shared-profile content especially minimal. Hermes profiles isolate Hermes state, not the operating-system account or all participants in a shared gateway. Before exporting or sharing a profile, inspect the archive: filename-based credential exclusions do not make memories, sessions, or persona content safe to distribute.

## Deletion and validation

**Recommendation:** Deleting a `USER.md` entry removes that built-in record only. Separately assess the current frozen prompt, retained sessions, external provider data, profile exports, backups, and the remote model provider's applicable policies.

Before relying on an entry:

1. Confirm the active profile and `$HERMES_HOME`.
2. Confirm the fact is stable, non-sensitive, necessary, and belongs in `USER.md`.
3. Confirm its wording is attributable and user-correctable rather than an unreviewed inference.
4. Review generated or automatic changes before adopting them for a sensitive workflow.
5. Start a fresh test session to observe injected context; treat resume behavior as version-sensitive.
