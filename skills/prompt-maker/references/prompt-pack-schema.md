# Prompt Pack Schema

Use this schema for reusable prompt artifacts. Keep keys stable when an eval harness or downstream script reads them.

```yaml
identity:
  name: ""
  role: ""
  responsibility: ""
intent:
  user_goal: ""
  success_criteria: []
  failure_criteria: []
trigger:
  use_when: []
  do_not_use_when: []
scope:
  in_scope: []
  out_of_scope: []
  side_effect_limits: []
authority:
  priority_order: []
  conflict_rule: ""
evidence:
  required_sources: []
  source_ledger: ""
tools:
  allowed: []
  gated: []
variables:
  required: []
  optional: []
context_packet:
  documents: []
  assumptions: []
  missing_information: []
examples:
  positive: []
  negative: []
constraints:
  style: []
  safety: []
  reasoning_visibility: "Do not request hidden chain-of-thought; ask for public rationale and verification evidence."
output_schema:
  format: "markdown | json | yaml"
  fields: []
  forbidden: []
eval_cases:
  fixture: ""
  categories: [positive, negative, boundary, source, safety, schema, regression, adversarial]
version_note:
  version: ""
  changed: []
  rationale: ""
```

## Required Sections

Every prompt pack should include identity, variables, context packet, examples, constraints, output schema, eval cases, and version note even when some values are intentionally empty with a reason.

When `format` is `json` or `yaml`, define exact key names and types, reject malformed required inputs, and include a schema eval that parses the output. Do not accept prose that merely mentions the required fields.
