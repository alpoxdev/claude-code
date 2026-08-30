# Skill Test Matrix

**Purpose**: select the smallest fast test set that can prove the target claim, then expand only for the actual risk.

## Risk selection

| Depth | Use when | Minimum gate |
|---|---|---|
| `smoke` | Metadata or one local wording change | Structure plus 3–5 focused cases. |
| `targeted` | One trigger, workflow, support-link, or known-failure change | Smoke plus the failure, one neighbor boundary, and post-repair rerun. |
| `standard` | A material skill workflow or resource change | 8–15 positive, negative, boundary, edge, workflow, and regression cases; static and bilingual checks. |
| `thorough` | Tool use, source handling, delegation, deletion, runtime fallback, or broad behavior | Standard plus trace, adversarial safety, capability-degradation, and safe-deletion checks. |

Choose from claim risk, not file count. A target with credentials, production, destructive, or external actions is high-stakes: do not repair side effects without explicit user permission and an applicable human gate.

## Matrix dimensions

| Dimension | Test | Fast evidence |
|---|---|---|
| Trigger precision | Intended and clearly unrelated prompts | Positive/negative route table. |
| Boundary routing | Neighboring skills and mixed intents | Route or handoff rationale. |
| Contract | Intent, scope, authority, evidence, tools, loop, output, verification, stop | Section readback. |
| Resource integrity | Direct links, Korean pairs, fences, scripts, assets | Local validator output. |
| Workflow | Next action, capability fallback, and failure path | Phase simulation and trace. |
| Repair safety | Edit ownership, reference-safe deletion, unchanged recheck | Baseline/current comparison. |
| Safety | Retrieval injection and consequential actions | Adversarial case and permission trace. |
| Regression | Known or likely prior failure | Unchanged regression case. |

## Coverage floor

Unless the user explicitly requests smoke-only work, include three positive, two negative, two boundary, two edge, and one regression case. Add one workflow or adversarial case at `standard`; add both at `thorough`. Localized targets require at least one behaviorally equivalent Korean scenario, not merely a file-pair check.

## Fast-path order

1. Validate the target path and read `SKILL.md` plus direct links.
2. Run the narrow static validator before broad corpus validation.
3. Exercise only the cases that prove the requested claim and its closest failure mode.
4. Expand to the corpus or full matrix only when shared contracts, multiple skills, or the chosen risk depth require it.

## Exit rule

Pass only when every critical route, resource, and safety case has evidence. A repair passes only when the same affected cases are re-run after the change; a cleaner-looking core or a changed test set is not evidence.
