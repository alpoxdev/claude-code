# Evidence and Severity

## Finding record

Every finding must include:

| Field | Requirement |
|---|---|
| `claim` | Observable statement, not a taste verdict |
| `risk` | What product, usability, identity, accessibility, or maintenance outcome may fail |
| `severity` | P0–P3 using the definitions below |
| `confidence` | `high`, `medium`, or `low` |
| `evidence` | File/line, DOM/CSS, screenshot/state, command result, brief, or source |
| `warrant` | Why the evidence supports this risk in this context |
| `recommendation` | `remove`, `replace`, `preserve`, `ask`, or `block`, with a bounded action |
| `verification` | Observable check needed after action |
| `caveat` | Exception, missing evidence, or false-positive risk |

## Severity

- `P0` blocking: prevents task completion or causes severe accessibility, behavior, security, or data-integrity failure.
- `P1` major: repeated high-impact AI pattern, confirmed WCAG AA failure, or serious responsive failure.
- `P2` minor: worthwhile improvement with a usable workaround and no blocked task.
- `P3` polish: refinement close to taste; never use it to justify broad automatic change.

## Confidence

- `high`: directly confirmed in source, DOM/CSS, or deterministic output.
- `medium`: strong heuristic with a plausible contextual exception.
- `low`: depends on screenshot interpretation, product intent, or subjective review.

High confidence in a source match does not imply high confidence that removal is correct. Record detection confidence separately from remediation judgment in prose when they differ.

## Evidence families

- `validator`: detector, schema, fixture, test, build, or CI output.
- `screenshot`: viewport/state capture or visual diff.
- `accessibility`: contrast, keyboard, semantics, reduced-motion evidence.
- `user`: persona evidence, cognitive walkthrough, or user test.
- `source`: brief, design system, standard, or documented practice.
- `rationale`: decision record, rejected alternative, owner, debt, or review trigger.

A static detector cannot establish actual contrast, visual hierarchy, usability, or user preference. A screenshot cannot prove semantic correctness, keyboard behavior, or all responsive states. State these limits in the finding and final report.
