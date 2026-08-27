# Evaluation And Iteration

## Minimum Categories

JSONL prompt eval fixture를 만들 때 positive, negative, boundary, source, safety, schema, regression, adversarial cases를 포함한다.

## Anti-Tautology Rule

eval은 plausible bad prompt에서 실패할 수 있어야 한다. file existence만 확인하거나, behavior와 무관한 keyword presence를 확인하거나, implementation text를 그대로 반복하는 check는 evidence로 세지 않는다.

## Case Shape

Medium 이상 case는 다음을 정의합니다.

- non-empty `id`, `category`, `language`, `invocation`, `risk`, `prompt`
- observable `expected.must`, `expected.mustNot`
- runner와 judge identity
- `trace`의 required trajectory evidence
- `gate`의 binary acceptance rule

같은 intent를 English, Korean, mixed-language prompt로 다룹니다. Skill name만 보고 trigger test가 통과하지 않도록 explicit, implicit, contextual invocation을 포함합니다.

## Iteration Loop

직접 deterministic check로 요청 artifact를 증명할 수 있으면 no loop를 사용합니다. Optimization은 최대 3회 candidate iteration만 실행합니다.

1. Baseline behavior와 score를 capture합니다.
2. Target metric 또는 rubric과 improvement direction을 선언합니다.
3. Cases, runner, judge, non-regression guard를 고정합니다.
4. Failure를 instruction gap, context gap, schema mismatch, source-boundary issue, safety issue, model/runtime mismatch로 진단합니다.
5. 가장 작은 prompt surface를 patch하고 같은 case를 rerun합니다.
6. Target이 개선되고 모든 guard가 통과할 때만 candidate를 keep하며, 아니면 discard합니다.
7. 새 failure pattern마다 regression case를 추가하고 remaining risk를 기록합니다.

## Stop

Target 달성, candidate 3회 평가, 더 넓은 scope가 필요한 guard failure, missing context/capability/model/runtime/user authority가 필요한 failure에서 optimization을 멈춥니다. Improvement를 주장하려고 baseline, case, runner, judge를 바꾸지 않습니다.
