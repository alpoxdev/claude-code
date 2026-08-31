# Validation

Run these checks before declaring `git-maker` changes complete or before reporting a fast-path run as successful.

## Skill Quality Checks

- Description says this skill commits and pushes together, and distinguishes it from `git-commit` and `git-push`.
- At least 3 positive trigger examples exist.
- At least 2 negative trigger examples exist.
- At least 1 boundary example exists.
- Core `SKILL.md` stays lean and points directly to rules/scripts without duplicating them.
- Script additions are justified by deterministic speed or safety improvements.
- Agent parallelism guidance is isolated in `rules/agent-parallelism.md` and not duplicated in the core.
- Worktree guidance is explicit: linked worktrees are valid contexts, checkout roots stay separate, and `.git` is not assumed to be a directory.
- Missing arguments and `current`/`CURRENT` select current-session changes; `all`/`ALL` select every uncommitted change.
- `&&` propagation syntax is defined for all scope modes and validates every target before mutation.
- Conflict handling defaults to autonomous intent-preserving resolution with a material-decision escalation boundary.

## Runtime Checks

- `node --check scripts/git-maker-fast.mjs` passes from the skill root, or `node --check skills/git-maker/scripts/git-maker-fast.mjs` passes from the repository root.
- `scripts/git-maker-fast.mjs inspect . --jobs 2` emits `repos|begin`, `repo-status|begin`, and file inventory blocks.
- A local linked-worktree fixture, when practical, shows `worktree|linked` and a `repo|...` path at the linked checkout root.
- Push helper is not tested against a real remote unless the user asked to push; use local fixtures when validating behavior.
- Commit phase still uses targeted staging and one logical change per commit.
- Commit subjects read like neutral Conventional Commit summaries, not Korean command-style imperatives.
- Push phase is automatic only after all commit groups succeed.
- Force push remains blocked for `main` and `master`.
- If subagents were used, their work was read-only and final git mutations stayed with the main integrator.
- A local multi-branch fixture verifies that only commits created by the run reach each target, in left-to-right order.
- A local conflict fixture verifies one mechanical conflict is resolved and validated without asking, while an intentionally ambiguous behavior conflict triggers one focused question before later targets.

## Readback Checks

Read as:

1. a trigger model: the skill activates on commit+push, not commit-only or push-only.
2. a rushed operator: the fastest safe command is obvious.
3. a commit reviewer: generated Korean subjects look like concise change/result summaries, not instructions.
4. a maintainer: future speed rules belong in `rules/speed-and-automation.md`; durable commit policy belongs in `rules/commit-and-push-policy.md`; subagent lane rules belong in `rules/agent-parallelism.md`.
5. a branch operator: `/git-maker && dev`, `/git-maker CURRENT && dev && deploy/staging`, and `/git-maker all && dev` have unambiguous scope and propagation behavior.
