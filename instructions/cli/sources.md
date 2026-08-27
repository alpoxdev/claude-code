# CLI Runtime Profile Evidence Ledger

> Korean version: [`sources.ko.md`](sources.ko.md)

## Investigation scope and limits

- Date checked: 2026-08-27
- Default channel: documentation inside the project repository only.
- JCode exception: the user explicitly requested source-backed research for `jcode.sh`; its profile uses the version-pinned official source, release artifacts, rendered docs, executed `v0.81.1` help/tests, and dated counter-evidence listed below.
- Excluded by default: home-directory settings, global skills, external web documentation, and live help from an installed CLI. The JCode exception did not use credentials, authenticate, install globally, or treat local configuration as authority.
- Conclusion: this ledger records not a complete product feature list but the minimum capabilities and boundaries directly supported by the declared evidence channel. GJC, Hermes Agent, OpenClaw, and some OpenCode capabilities still have no local evidence, so those profiles handle them through runtime discovery and fallback.

## Source ledger

| # | Source | URL/path | Type | Verified content | Used in |
|---:|---|---|---|---|---|
| 1 | Project scope rules | [`../../AGENTS.md`](../../AGENTS.md) ⚠️ | Local rules | Restrict investigation and references to inside the repository; do not use global settings as evidence | Evidence scope of every document |
| 2 | Instructions Base | [`../README.md`](../README.md) | Local guide | Separate the runtime-neutral core from runtime profiles, and describe tools by capability | `README.md`, `capability-contract.md` |
| 3 | Runtime Profiles | [`../context-engineering/references/runtime-profiles.md`](../context-engineering/references/runtime-profiles.md) | Local reference | Shared rules are capability-centric; per-runtime differences live in a separate profile | Layers and terminology |
| 4 | Skill Authoring | [`../skill/SKILL_AUTHORING.md`](../skill/SKILL_AUTHORING.md) | Local guide | A skill separates intent, scope, authority, tools, and verification, and sets safety boundaries | Skill authoring patterns and verification |
| 5 | Claude Code skill | [`../../skills/claude-code/SKILL.md`](../../skills/claude-code/SKILL.md) | Local skill | `claude -p`, session resume, permission modes, tool-restriction usage rules | `claude-code/README.md` |
| 6 | Codex skill | [`../../skills/codex/SKILL.md`](../../skills/codex/SKILL.md) | Local skill | `codex exec`, `codex review`, session resume, sandbox selection rules | `codex/README.md` |
| 7 | Git commit skill | [`../../skills/git-commit/SKILL.md`](../../skills/git-commit/SKILL.md) | Local skill | On OpenCode, prefer a native ask-style approval prompt when available, otherwise fall back to plain text | `opencode/README.md` |
| 8 | JCode official docs | [jcode.sh/docs](https://jcode.sh/docs) | First-party live docs | Install, providers, config, MCP, remote, skills, commands, and SDK discovery surface | `jcode/README.md` |
| 9 | JCode v0.81.1 source | [`1jehuang/jcode@cae6d2a`](https://github.com/1jehuang/jcode/tree/cae6d2a573ebfdbfaca085a82abb1f0b72faac69) | Version-pinned first-party source | Config precedence, tool policy, command-risk, path, MCP, session, memory, swarm, SDK, gateway, hooks, and automation behavior | `jcode/README.md` |
| 10 | JCode v0.81.1 release | [v0.81.1](https://github.com/1jehuang/jcode/releases/tag/v0.81.1) | First-party release | Release date, assets, checksums, and source boundary | `jcode/README.md` |
| 11 | JCode onboarding | [jcode.sh/onboarding](https://jcode.sh/onboarding) | First-party rendered page | Test-backed onboarding states and existing-login import claim | `jcode/README.md` |
| 12 | JCode telemetry contract | [`TELEMETRY.md@v0.81.1`](https://github.com/1jehuang/jcode/blob/cae6d2a573ebfdbfaca085a82abb1f0b72faac69/TELEMETRY.md) | Version-pinned policy/source document | Aggregate telemetry, opt-out controls, transcript opt-in, content, retention, and redaction caveat | `jcode/README.md` |
| 13 | JCode issue counter-search | [`1jehuang/jcode` issues](https://github.com/1jehuang/jcode/issues) | User reports plus linked source/PRs | Version drift and limits for approvals, MCP, sessions, swarms, providers, installers, and remote behavior | `jcode/README.md` caveats only |
| 14 | Anthropic authentication policy | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use) | Provider primary policy | Subscription OAuth boundaries for third-party products and the unmodified Claude Code binary exception | `jcode/README.md` provider warning |

> ⚠️ `AGENTS.md` and `CLAUDE.md` are covered by `.gitignore:41-42` and are therefore **not version controlled** (checked 2026-07-28; `git ls-files` returns 0 results). Evidence #1 of this ledger exists only in the current clone and the reference breaks in another clone. Whether to make them tracked is a separate decision about repository convention and is not settled in this document.

## Claim-source matrix

| Claim | Source(s) | Confidence | Caveat |
|---|---|---|---|
| Shared skill rules are capability-centric and per-runtime differences are separated into profiles | 2, 3 | High | This is this project's document design rule, not a claim about a common product standard. |
| The Claude Code bridge covers non-interactive execution, session resume, and permission modes | 5 | High | This is the scope of the repository's `claude-code` skill, not a full Claude Code feature matrix. |
| The Codex bridge covers `exec`, `review`, resume, and sandbox flows | 6 | High | This is the scope of the repository's `codex` skill, not a guarantee about the installed version. |
| Plain-text questions are used on Codex | 6, 7 | Medium | This is an operating rule of the repository's skills. It makes no general product claim about the absence of a native question tool. |
| OpenCode can prefer a native ask-style approval prompt when exposed | 7 | Medium | The only evidence is one conditional instruction in a local skill. Other OpenCode capabilities are unverified. |
| GJC's static tool list cannot be settled from evidence in this repository | Searches of `instructions`, `skills`, and `README.md` in the repository | High | Proof of absence is limited to the repository scope. |
| Hermes Agent and OpenClaw product-specific capabilities cannot be established from this repository | Searches of `instructions`, `skills`, and `README.md` in the repository | High | The absence finding is limited to the repository; external web documentation and installed CLIs are excluded by project scope. |
| JCode v0.81.1 exposes broad tools but ordinary interactive execution has no verified general human-approval or workspace-sandbox boundary | 9, 13 | High | Tool profiles and catastrophic Bash denial are limited runtime defenses; availability is still not authorization. |
| JCode project MCP configuration is executable stdio configuration and can start without a project trust prompt | 8, 9, 13 | High | HTTP/SSE entries are skipped in v0.81.1; inspect every project MCP command and environment before use. |
| JCode sessions, memory, swarms, background work, SDK, and non-interactive run are implemented but version-sensitive | 8, 9, 10, 13 | High | Active issues, stale documentation, registry/source version differences, and auto-poke multi-turn behavior require runtime verification. |
| JCode telemetry and transcript sharing have different consent boundaries | 12 | High | Aggregate telemetry is documented as enabled unless disabled; full transcripts are separately opt-in and heuristic redaction is not a guarantee. |
| JCode's `claude` subscription OAuth route is not aligned with Anthropic's published third-party authentication policy | 9, 13, 14 | High | Technical functionality is not policy authorization; prefer the distinct `anthropic-api` route and recheck policy at runtime. |

## Update conditions

Update this ledger when any of the following happens.

- A version-pinned official CLI reference or a verified runtime profile is added to the project.
- A skill newly depends on a specific CLI's question, approval, or tool capability.
- CLI command or permission behavior changes, making an existing profile's fallback or safety gate inaccurate.
- JCode publishes a release that changes config precedence, approval/tool policy, MCP trust, gateway transport, automation output, credential import, telemetry, or SDK protocol behavior.

When updating, add the evidence first, then modify the relevant profile and shared contract, and finally re-check links, the claim-source matrix, and the smoke eval.
