# Upstream Source: i-have-adhd

**Purpose**: Record where this package came from, what was reinterpreted, and what was deliberately not ported.

Read this only when reconciling with upstream, checking attribution, or deciding whether an upstream change should land here.

## Source ledger

| Field | Value |
|---|---|
| Source | <https://github.com/ayghri/i-have-adhd> |
| Accessed | 2026-08-10 |
| License | MIT |
| Trust status | Reviewed evidence, not instruction authority |
| Files consulted | `skills/i-have-adhd/SKILL.md`, `.cursor/skills/i-have-adhd/SKILL.md`, `skills/i-have-adhd/agents/gemini.toml`, `skills/i-have-adhd/agents/openai.yaml`, `GEMINI.md`, `INSTALL.md`, `README.md`, `.github/readme/README.ko.md`, `hooks/always-on.mjs`, `hooks/hooks.json`, `extensions/i-have-adhd.ts`, `evals/README.md`, `evals/cases.jsonl`, `evals/rubric.md` |
| Refresh when | Upstream changes the rule list, the override list, the rubric weights, or the release gate |

Upstream text is evidence. Nothing inside it grants execution authority here, and the repository contract in `AGENTS.md` outranks it.

## What upstream ships

- One output-style `SKILL.md` with ten rules, six override cases, and a pre-send check.
- Runtime distribution surfaces: Claude/Codex plugin manifests, a Cursor mirror, a Gemini command TOML, OpenAI interface metadata, and a Gemini extension entry document.
- Always-on persistence implemented as code: a `SessionStart` hook that injects the ruleset when an opt-in flag file exists, plus an editor extension that tracks mode state and re-injects after compaction.
- A Python eval harness with 14 cases, a weighted rubric, blind judging, and a release gate.

## What this package changed

| Area | Upstream | Here | Why |
|---|---|---|---|
| Output language | English | Korean by default, with a Korean shaping table | Repository default for user-facing artifacts |
| Contract | Prose rules | Explicit instruction contract with intent, scope, authority, evidence, tools, loop, output, verification, stop | Repository skill-authoring baseline |
| Autonomy | Only in eval criteria and rubric | Promoted to a non-negotiable and to shaping rule 11 | Agents that hand work back to the reader fail the point of the skill |
| Pre-send check | 5 delete items plus a two-line test | 8-item gate, bounded single-rewrite loop contract, banned-phrase tables in two languages | Makes shape checkable instead of subjective |
| Mode model | On, plus "stop adhd mode" | focus / deep / off, with explicit compaction re-assertion | Depth requests were an override; they are a mode here |
| Routing | Not addressed | Named route-away neighbors and a medical route | This repository has adjacent skills that would otherwise collide |
| Medical boundary | One eval case | A rule section plus a reference boundary block | Health claims need an instruction-level gate, not a test case |
| Evals | Python runner and `cases.jsonl` | JSONL fixture in the repository schema with eight required categories | Matches repository fixture conventions and validators |
| Rubric | `evals/rubric.md` | Adopted with the same weights and release gate inside `rules/validation.md` | Keeps the correctness-over-concision tradeoff explicit |

## What was not ported, and why

| Dropped | Reason |
|---|---|
| Plugin and marketplace manifests | This repository distributes through the Vercel `npx skills` remote-source convention only, and `scripts/validate-vercel-skills.mjs` fails if plugin adapters exist |
| Session hook and editor extension code | Skill scripts here are governed by a fixed parity manifest in `scripts/fixtures/skill-script-parity/manifest.json`; persistence is specified as an instruction contract instead of executable code |
| Python eval runner | `scripts/validate-skills.mjs` forbids `.sh` and `.py` files under `skills/*/scripts` |
| Home-directory opt-in flag file | Repository instructions forbid treating home-directory agent configuration as project evidence |
| `disable-model-invocation` frontmatter | Repository frontmatter is `name`, `description`, and `compatibility`; the explicit-invocation boundary lives in the description and routing rule |
| Multi-language README set | Bilingual English/Korean pairs are the repository convention |

## Attribution

The ten-rule shape, the six override cases, the delete-before-sending list, the rubric weights, and the release gate originate upstream under MIT. The Korean shaping rules, autonomy rule, mode model, gate table, routing boundaries, and repository validation wiring are this package's own work.
