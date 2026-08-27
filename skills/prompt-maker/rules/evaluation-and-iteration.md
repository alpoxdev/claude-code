# Evaluation And Iteration

## Minimum Categories

Include positive, negative, boundary, source, safety, schema, regression, and adversarial cases when creating a JSONL prompt eval fixture.

## Anti-Tautology Rule

An eval must be able to fail under a plausible bad prompt. Do not count checks that only assert file existence, keyword presence unrelated to behavior, or a restatement of the implementation text.

## Case Shape

Each medium-or-higher case should define:

- non-empty `id`, `category`, `language`, `invocation`, `risk`, and `prompt`
- observable `expected.must` and `expected.mustNot`
- runner and judge identity
- required trajectory evidence in `trace`
- a binary acceptance rule in `gate`

Cover the same intent across English, Korean, and mixed-language prompts. Include explicit, implicit, and contextual invocation so trigger tests do not pass from the skill name alone.

## Iteration Loop

Use no loop when direct deterministic checks prove the requested artifact. For optimization, run at most three candidate iterations:

1. Capture baseline behavior and score.
2. Declare the target metric or rubric and improvement direction.
3. Freeze cases, runner, judge, and non-regression guards.
4. Diagnose failure as instruction gap, context gap, schema mismatch, source-boundary issue, safety issue, or model/runtime mismatch.
5. Patch the smallest prompt surface and rerun the same cases.
6. Keep the candidate only when the target improves and every guard passes; otherwise discard it.
7. Add a regression case for every new failure pattern and record remaining risk.

## Stop

Stop optimizing when the target is met, three candidates have been evaluated, a guard failure would require broader scope, or remaining failures need missing context, capability, model/runtime, or user authority. Never change the baseline, cases, runner, or judge to claim improvement.
