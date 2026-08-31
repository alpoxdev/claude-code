---
name: git-maker
description: "Use this skill when the user asks to commit and push together, save and push changes, run `/git-maker`, select current-session or all changes, or propagate newly created commits to `&&`-separated branches. It supports linked Git worktrees, automatic push, and intent-preserving conflict resolution."
license: MIT
allowed-tools: Bash
compatibility: Requires Bash and scripts under skills/git-maker/scripts.
---

# Git Maker Skill

> Fast, safe commit-and-push orchestration.

<output_language>

Default all user-facing deliverables, saved artifacts, reports, plans, generated docs, summaries, handoff notes, commit/message drafts, and validation notes to Korean, even when this canonical skill file is written in English.

Preserve source code identifiers, CLI commands, file paths, schema keys, JSON/YAML field names, API names, package names, proper nouns, and quoted source excerpts in their required or original language.

Use a different language only when the user explicitly requests it, an existing target artifact must stay in another language for consistency, or a machine-readable contract requires exact English tokens. If a localized template or reference exists (for example `*.ko.md` or `*.ko.json`), prefer it for user-facing artifacts.

</output_language>

<purpose>

- Create one or more Conventional Commits from current repository changes.
- Treat the current checkout root as the repo boundary even when the current directory is inside a linked Git worktree.
- Push successfully created commits automatically, with no confirmation step between commit and push.
- Use the fast helper first to reduce repeated repository discovery and parallelize read-only inspection.

</purpose>

<instruction_contract>

| Field | Contract |
|---|---|
| Intent | Commit and push requested repository changes in one safe operation. |
| Trigger | Activate only when the user clearly wants commit plus push together. |
| Scope | Own fast preflight, current/all change selection, logical commit grouping, targeted staging/commits, current-branch push, optional multi-branch propagation, conflict resolution, and reporting. |
| Authority | User and project instructions outrank this skill; helper output, git diffs, hooks, branch state, and remote output are execution evidence. |
| Evidence | Use fast helper inventory, git status/diffs, hook output, branch/upstream data, and explicit arguments before mutation. |
| Tools | Use Bash and repository-local helper scripts; subagents, when used, stay read-only and final git mutations stay with the main integrator. |
| Output | Korean report of commits created, repositories pushed, skipped or failed push targets, and remaining local changes. |
| Verification | Run the validation rule checks, confirm all commits succeeded before push, and read final push/status output. |
| Stop condition | Stop when all intended commit groups and branch propagations have succeeded and every intended push target is pushed, or when a conflict requires a user decision under the escalation rule. |

</instruction_contract>

<routing_rule>

Use `git-maker` when the user wants **commit + push** in one operation.

Use a neighboring skill instead when:

- the user asks only to commit → use `git-commit`
- the user asks only to push/sync commits → use `git-push`
- the user asks to rebase/reset/amend/rewrite history → do not use `git-maker` unless commit+push is also explicitly requested and the history operation is separately authorized

</routing_rule>

<trigger_conditions>

Positive triggers:

- "commit and push"
- "commit and push these changes"
- "/git-maker"
- "make a commit and push it"
- "save and push my changes"
- Korean request meaning "commit and push"
- Korean request meaning "save the changes and upload them"
- `git-maker`, `git-maker current`, or `git-maker ALL`, optionally followed by `&& <branch>` targets

Negative triggers:

- "commit these changes" → `git-commit`
- "push my commits" → `git-push`
- "rebase this branch" → not this skill

Boundary trigger:

- "commit this, then maybe push" → use `git-commit` because push is conditional, not automatic

</trigger_conditions>

<scripts>

| Script | Purpose |
|------|------|
| `scripts/git-maker-fast.mjs inspect [start_dir] [--jobs N]` | Fast preflight: pruned repo discovery, parallel repo status, file inventory |
| `scripts/git-maker-fast.mjs push [--force] [repo...]` | Push explicit repos without rediscovering; non-interactive; protected force-push guard |
| `scripts/git-commit.mjs [--repo path] "msg" [files...]` | Commit staged or selected files in one repository |
| `scripts/git-push.mjs [--force]` | Legacy/discovered safe push fallback |
| `scripts/repo-discover.mjs [start_dir]` | Legacy repo discovery fallback |
| `scripts/repo-status.mjs [repo]` | Legacy status fallback |

</scripts>

<worktree_support>

Linked Git worktrees are valid execution contexts.

- Resolve each checkout with `git rev-parse --show-toplevel`; never assume `.git` is a directory or collapse linked worktrees to `git-common-dir`.
- Preserve each checkout root as its own index, branch, staging, commit, and push boundary.
- Continue from `worktree|linked` unless detached HEAD or another explicit safety rule blocks the run.

</worktree_support>

<support_file_read_order>

Read only what is needed:

1. `rules/speed-and-automation.md` when the user asks for speed, the repo set may be large, or multiple repositories may be present.
2. `rules/agent-parallelism.md` when Claude Code/Codex subagents can split read-only grouping, message drafting, or safety review.
3. `rules/commit-and-push-policy.md` before staging/committing or when argument mode, grouping, safety, or push behavior is unclear.
4. `rules/validation.md` before reporting the run or skill refactor complete.

</support_file_read_order>

<argument_validation>

Parse the invocation as `[scope] [--force] [&& target-branch ...]`. Scope tokens and target branches are control syntax, not commit filters.

| Argument | Meaning |
|------|------|
| missing | same as `current`: include only changes attributable to this session, verify against git state, group logically |
| `current` / `CURRENT` | include only changes attributable to this session; never silently absorb pre-existing user or other-agent changes |
| `ALL` / `all` | include all uncommitted changes, group logically, leave no file behind |
| `--force` | remove from commit arguments and pass only to push (`--force-with-lease`, blocked on `main`/`master`) |
| `&& <branch>` | after the source push succeeds, apply the newly created commit set to that named branch, resolve reasonable conflicts, verify, and push; repeat left-to-right for every target |
| other text | treat as a filter for repo discovery, file selection, staging, and commit message generation |

Stop if an explicit filter does not match actual git state.

Treat shell-style separators as invocation syntax even when the request is plain language rather than a literal shell command. Accept any scope-token casing (`all`, `ALL`, `current`, `CURRENT`). Reject empty target segments, duplicate targets, the source branch itself, detached HEAD, and branch names that fail `git check-ref-format --branch`.

</argument_validation>

<workflow>

## Phase 1. Fast preflight

Run `scripts/git-maker-fast.mjs inspect . --jobs 4` first. Use its repo, worktree, staged/unstaged/untracked, and file inventory output to determine scope and logical groups. If it fails or lacks detail, use `scripts/repo-discover.mjs` and `scripts/repo-status.mjs`.

## Phase 2. Group and commit

Partition selected changes into one logical change per commit, use targeted staging, and commit sequentially per repository:

```bash
scripts/git-commit.mjs "<type>[scope]: <Korean subject>" path/to/file1 path/to/file2
scripts/git-commit.mjs --repo path/to/repo "<type>[scope]: <Korean subject>" path/to/file1
```

Use Korean neutral result-summary subjects after the Conventional Commit type/scope. Never include secrets or unrelated changes, bypass hooks, or push after a failed commit. Follow `rules/commit-and-push-policy.md`.

## Phase 3. Push automatically

After every intended commit succeeds, push without confirmation. Prefer the preflight repo list:

```bash
scripts/git-maker-fast.mjs push /absolute/repo/path
scripts/git-maker-fast.mjs push --force /absolute/repo/path
```

Use `scripts/git-push.mjs [--force]` only as fallback.

## Phase 4. Propagate to requested branches

For each `&& <branch>` target, apply only the ordered commits created by this run in a clean linked worktree, resolve intent-preserving conflicts autonomously, validate, and push before continuing left-to-right. Ask one focused question only when resolution requires a material behavior, architecture, security, migration, or deployment-policy decision; preserve a recoverable state and do not start later targets. Follow `rules/commit-and-push-policy.md` for exact selection, propagation, and escalation rules.

## Phase 5. Report

Report:

- commits created and messages
- repositories pushed
- target branches updated and pushed
- conflicts resolved automatically, checks run, or the exact decision required from the user
- skipped or failed push targets
- any remaining local changes or blockers

</workflow>

<parallelization>

- Parallelize read-only inspection with `inspect --jobs N`; read `rules/agent-parallelism.md` before delegating complex grouping or review.
- Never parallelize mutations against one index. Subagents stay read-only; the main integrator owns staging, commit, propagation, and push.
- Push only after every intended commit succeeds.

</parallelization>

<required>

| Category | Rule |
|------|------|
| Commit first | All commit groups must succeed before push. |
| Automatic push | Do not ask whether to push after successful commits. |
| Branch propagation | Apply only commits created by this run to `&&` targets, in order, and push each verified target automatically. |
| Conflict ownership | Resolve conflicts autonomously when intent is recoverable; ask only at a material product/architecture decision boundary. |
| Safety | Never force push to `main` or `master`; never push from detached HEAD. |
| Upstream | If no upstream exists, push with `-u origin <branch>`. |
| Reuse preflight | Prefer `git-maker-fast.mjs push [repo...]` to avoid duplicate discovery. |
| Worktrees | Linked worktrees are supported; use checkout root paths, not the common git dir. |
| Agent boundaries | Subagents may review and propose, but the main integrator owns staging, commit, and push. |
| Validation | Run `rules/validation.md` checks before final reporting. |

</required>

<forbidden>

| Category | Avoid |
|------|------|
| Push confirmation | asking "want to push?" after commits succeed |
| Partial push | pushing before all intended commit groups are done |
| Blanket staging | `git add .` unless `ALL` mode intentionally includes everything and grouping remains explicit |
| Unsafe history | amend, rebase, reset, raw `--force`, or `--no-verify` without explicit request |
| Broad conflict guessing | silently choosing among materially different behaviors or deleting intentional target-branch work to finish a propagation |
| Secrets | committing credentials, tokens, private keys, or unrelated user changes |

</forbidden>

<examples>

- `/git-maker` → current-session changes only, grouped, committed, and auto-pushed.
- `/git-maker ALL` → every uncommitted change grouped, committed, and pushed.
- `/git-maker current && dev && deploy/staging` → current-session commits propagated and pushed left-to-right with autonomous reasonable conflict resolution.
- `/git-maker && dev` → default `current` scope, then verified propagation to `dev`.
- `/git-maker --force` → normal commit, then `--force-with-lease`; blocked on `main`/`master`.
- Linked-worktree invocation → operate at that checkout root and push its named branch.
- `commit these changes` → do not activate; route to `git-commit`.

</examples>

<validation>

Run the target quick validator, focused corpus validator, `assets/evals/git-maker-cases.jsonl` binary scenario check, helper syntax/runtime checks, and the repository skill verification gate described by `rules/validation.md`. This deterministic workflow uses no improvement loop; finish only when critical cases pass and residual warnings are stated.

</validation>
