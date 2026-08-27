# Prompt Pack Schema

재사용 가능한 prompt artifact에는 이 schema를 사용한다. eval harness 또는 downstream script가 읽는 경우 key를 안정적으로 유지한다.

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
  reasoning_visibility: "hidden chain-of-thought를 요구하지 말고 public rationale과 verification evidence를 요구한다."
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

prompt pack에는 identity, variables, context packet, examples, constraints, output schema, eval cases, version note가 있어야 한다. 값이 비어 있어야 한다면 이유를 함께 적는다.

`format`이 `json` 또는 `yaml`이면 정확한 key name과 type을 정의하고 malformed required input을 reject하며 output을 parse하는 schema eval을 포함합니다. Required field를 prose로 언급만 한 결과는 허용하지 않습니다.
