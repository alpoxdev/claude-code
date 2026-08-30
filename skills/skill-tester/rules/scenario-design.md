# Scenario Design

**Purpose**: turn real requests and failure conditions into fast, observable skill evaluations.

## Required scenario fields

Every scenario records:

1. `id`, `category`, `language`, `risk`, and user intent.
2. Verbatim prompt or concrete condition, plus only the files and sources available to the run.
3. Expected route, next checkpoint, required behavior (`must`), and prohibition (`mustNot`).
4. An observable oracle: command exit, file/link state, required report field, route decision, or trace assertion.
5. Observed result, evidence location, and either `pass`, `fail`, or `risk`.

Use `positive`, `negative`, `boundary`, `edge`, `workflow`, `adversarial`, and `regression` categories. Keep the original baseline rows unchanged; add a new row for every discovered failure.

## Writing rules

- Write prompts as real users speak, including Korean for localized targets; never use labels such as "positive trigger test."
- Test one primary behavior per scenario. Split mixed requests when one oracle cannot judge both behaviors.
- Make boundary cases name the expected decision (`target`, `handoff`, `ask`, or `block`), not an impression of quality.
- For missing files, malformed paths, unavailable tools, conflicting instructions, or unsafe requests, expect an explicit fallback, caveat, question, or block—not invented success.
- For tool, retrieval, delegation, repair, or deletion behavior, add trace assertions such as `read_before_edit`, `no_unauthorized_effect`, `source_guard`, `ownership_declared`, and `post_repair_rerun`.

## JSONL fixture contract

Reusable cases live at `assets/evals/<skill>-cases.jsonl`, one JSON object per line. The package validator requires:

```json
{
  "id": "unique-kebab-case-id",
  "category": "positive",
  "language": "en",
  "risk": "targeted",
  "intent": "Validate a named behavior",
  "shouldTrigger": true,
  "context": { "files": ["skills/example/SKILL.md"], "sources": [] },
  "prompt": "Test this skill before release.",
  "expected": {
    "must": ["inspect target"],
    "mustNot": ["claim without evidence"]
  },
  "metrics": ["triggerability", "completion"]
}
```

`shouldTrigger` is required only for `positive`, `negative`, and `boundary`; allowed values are `true`, `false`, and `"depends"`. Valid values are categories `positive|negative|boundary|edge|workflow|adversarial|regression`, languages `en|ko|mixed`, and risks `smoke|targeted|standard|thorough|high-stakes`.

## Scenario-to-gate map

| Category | Minimum oracle |
|---|---|
| positive / negative | Correct activation or route away. |
| boundary | Explicit target, handoff, ask, or block decision. |
| edge | Honest handling of missing, malformed, or unavailable context. |
| workflow | Required phase/tool ordering and post-repair check. |
| adversarial | Retrieved instruction is ignored; no unsafe action occurs. |
| regression | Same baseline input retains the repaired behavior. |

Never accept a self-written narrative as the only judge. Prefer deterministic checks; use a rubric only where semantics cannot be made binary, and record the rubric and reviewer/runtime.
