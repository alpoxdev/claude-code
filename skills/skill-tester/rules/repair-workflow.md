# Repair Workflow

**Purpose**: keep test-and-repair work narrow, reversible where possible, and proven by the same evaluation that exposed the defect.

## Permission and ownership gate

Edit only when the user explicitly asks to fix, strengthen, add, edit, prune, or delete. Before any edit, record the target skill root and prove each writable file is one of:

- its `SKILL.md` or localized sibling;
- a direct or transitively necessary support file inside that target skill;
- a requested target-local eval artifact; or
- a minimal resource newly required to close a measured gap.

Do not edit neighboring skills, shared instructions, application code, generated files, or external systems. Hand broad architecture, naming, or package redesign to `skill-maker` after recording the findings.

## Baseline -> repair -> recheck

1. Capture static output and affected scenario results before editing.
2. Classify the smallest root cause and name the target-owned file that can repair it.
3. Apply one coherent repair set; do not mix opportunistic cleanup into it.
4. Re-run the unchanged affected static checks and scenarios.
5. Keep the change only if critical guards pass and no new regression appears. Otherwise stop, preserve evidence, and report `iterate` or `block`.

## Safe addition and edit

- Add a rule, reference, fixture, or deterministic helper only when it has a clear owner, load condition, and verifier.
- Keep trigger, authority, side-effect, loop, and stop rules discoverable from `SKILL.md`.
- Preserve machine-readable formats and bilingual semantic parity; add the Korean Markdown sibling for every materially changed Markdown file.
- Never use a repair to weaken a failing test, remove a guard, or rename a failure as a caveat.

## Safe deletion gate

Deletion is allowed only when all conditions hold:

1. The user explicitly requested pruning or deletion, or approved a repair that names the obsolete file.
2. The file is inside the target skill's proven ownership and is not user work outside the task.
3. Search and direct-link inspection show no remaining in-scope consumer, or the same repair resolves every consumer first.
4. The deletion does not erase required baseline evidence, a shipped compatibility contract, a generated source of truth, or an unreviewed external consumer.
5. Post-deletion link, structure, and affected behavior checks pass.

If any condition is unknown, preserve the file and report it as a candidate; do not delete on inference alone.

For a non-keep candidate, issue a **compare-before-restore** receipt: restore only run-owned paths to their recorded preimage after confirming each current value still matches the candidate postimage. Stop on an unexpected postimage instead of overwriting it.

## Stop and handoff

Stop after one repair cycle. Hand to `skill-maker` for a new skill, resource redesign, or broad package refactor; hand to `autoresearch-skill` for a bounded metric experiment. Block when the target, ownership, permission, or required verification capability remains unavailable.
