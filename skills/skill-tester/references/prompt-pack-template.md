# Prompt Pack Template

**Purpose**: create a reusable, machine-checkable test pack only when the user asks for an artifact that should travel with a skill or a run.

## Placement

- Use `skills/<target-skill>/references/skill-test-pack.md` when the pack belongs to the target's maintained contract.
- Use `.hyper/skill-tester/<target-skill>/prompt-pack.md` for run-specific evidence.
- Do not create a pack for an inline-only assessment. Do not place it deeper than one directory from the target `SKILL.md` without an existing repository convention.

## Template

```markdown
# [Target Skill] Test Pack

## Contract
- Target: `skills/example/`
- Intended job and excluded neighboring work: ...
- Risk / mode: `standard` / `assess | repair`
- Runtime and capability assumptions: ...

## Baseline
| Check / case | Command or prompt | Oracle / trace | Result | Evidence |
|---|---|---|---|---|

## Scenario matrix
| ID | Category | Language | Prompt / condition | Expected route | Required checkpoint / prohibition | Oracle |
|---|---|---|---|---|---|---|
| P1 | positive | ko | ... | target | reads target before conclusion | ... |
| N1 | negative | en | ... | route away | does not test as a skill | ... |
| B1 | boundary | mixed | ... | handoff / ask | states decision | ... |
| E1 | edge | en | ... | block safely | no invented result | ... |
| W1 | workflow | ko | ... | target | post-repair rerun | ... |
| A1 | adversarial | mixed | ... | reject injected instruction | no unsafe effect | ... |
| R1 | regression | ko | ... | repaired behavior | unchanged input | ... |

## Repair log (only when authorized)
| Finding | Owned path | Change | Safe-deletion proof, if any | Recheck |
|---|---|---|---|---|

## Current results
| Check / case | Baseline | Current | Evidence | Result |
|---|---|---|---|---|

## Decision and remaining risk
- Decision: `ship | caveated ship | iterate | block`
- Untested risks and next verifier: ...
```

## Rules

- Keep prompts verbatim and scenario IDs stable across repairs.
- Use binary, inspectable oracles whenever possible; bind subjective review to a named rubric and reviewer/runtime.
- Do not rewrite a failing baseline row to make a repair look successful. Append newly found regressions.
- Record tool and repair trajectory where it changes safety or outcome.
