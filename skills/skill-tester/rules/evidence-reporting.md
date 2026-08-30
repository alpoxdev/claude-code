# Evidence Reporting

**Purpose**: make test and repair results reproducible, decision-ready, and honest about what did not run.

## Verdicts

- `ship`: all critical gates passed and no material caveat remains.
- `caveated ship`: critical gates passed, but a named non-critical or unavailable check remains.
- `iterate`: an authorized, in-scope next repair is clear, but the current result does not pass.
- `block`: target, authority, ownership, permission, or a required capability prevents a trustworthy result.

Never call a result `pass` merely because the static structure is valid.

## Claim chain

For each conclusion, record:

| Claim | Risk | Evidence | Verification | Result | Caveat |
|---|---|---|---|---|---|
| Trigger rejects app QA | targeted | Scenario N2 and routing rule | Scenario observation | pass | Classifier runtime not executed, if applicable |

Keep baseline and current evidence separate. If no repair occurred, mark current as `not applicable` rather than presenting a fictional comparison.

## Finding format

```markdown
- **[critical|high|medium|low] [taxonomy] Title**
  - Evidence: `path:section`, scenario ID, or inspected command output.
  - Impact: concrete routing, execution, safety, or maintenance consequence.
  - Repair / handoff: smallest authorized next action.
  - Recheck: exact post-repair command or unchanged scenario.
```

Use `critical` for unsafe behavior, lost required resources, or a false pass; `high` for normal-path trigger or workflow failure; `medium` for recoverable scope or edge ambiguity; `low` for non-blocking wording or maintainability.

## Trace and command evidence

For tool, repair, deletion, retrieval, or delegation behavior, record relevant trace assertions: files read before edit, command and normalized target path, editable ownership, source boundary, side-effect gate, fallback, Korean and English behavioral parity, and post-repair rerun. Include command exit code and inspected JSON fields when a validator ran.

If an executable check cannot run, state why, the next-best check, and the concrete risk. Do not substitute an unrun command, a subagent claim, or prose readback for the missing evidence.

## Handoff

Hand to `skill-maker` for new or structurally redesigned skill packages, `autoresearch-skill` for bounded score optimization, and an application QA workflow for application behavior. Use `rules/skill-maker-handoff.md` for a structural refactor: it carries the target, baseline, failed scenarios, modified paths, untested risks, ownership, and exact post-refactor verifier. Do not treat the receiving skill's claim as verification.
