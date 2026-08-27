# Autoresearch Command Family

> 영어판: [`command-family.md`](command-family.md)

이 문서는 command 형태의 upstream example을 runtime-neutral archetype으로 해석한다. 모든 runtime이 같은 command name, syntax, hook, artifact set을 제공한다고 약속하지 않는다.

## Shared contract

모든 archetype은 Goal, Scope, Verify/Evidence, Guard, Budget, Stop, Authorization을 선언한다. Mutating loop는 다음을 따른다.

```text
Preflight -> Baseline -> Hypothesis -> Checkpoint -> Verify -> Guard
-> Decide -> Restore if needed -> Record -> Stop/Handoff
```

Bare-command upstream surface는 classic config-driven execution, goal-directed orchestration, guided setup 사이를 route할 수 있다. Trustworthy predicate가 있는 archetype만 자동으로 loop하며 subjective 또는 terminal task는 single-pass 또는 human-gated일 수 있다.

## Plan

분해와 measurable selection이 필요한 broad goal에 사용한다.

- Locked rubric 또는 metric으로 bounded plan candidate를 비교한다.
- Decision rationale와 rejected alternative를 남긴다.
- Plan은 implementation이나 side effect를 승인하지 않는다.

## Debug

원인을 모를 때 사용한다.

- Hypothesis -> minimal probe -> evidence -> keep/discard hypothesis.
- Crash/timeout/parser/infra outcome을 구분해 보존한다.
- Code fix는 root-cause evidence 뒤의 새 iteration이지 failed probe를 제자리에서 다시 쓰는 작업이 아니다.

## Fix

Failure를 재현할 수 있을 때 사용한다.

- 먼저 failing behavior를 고정한다.
- Falsifiable change 하나를 만든다.
- Regression proof와 mandatory guard가 통과해야 keep한다.

## Reason

산출물이 code가 아니라 decision일 때 사용한다.

- Alternative, assumption, counterexample, disconfirming evidence를 만든다.
- Ranking 전에 decision criteria를 고정한다.
- Unresolved uncertainty를 기록하고 winner를 만들어내지 않는다.

## Probe

Bounded feasibility 또는 data gathering에 사용한다.

- Probe를 reversible하고 isolated하게 유지한다.
- Observed capability와 production readiness를 구분한다.
- Retained finding을 project-owned test, doc, follow-up plan으로 승격한다.

## Learn

Repeated evidence에서 reusable pattern을 추출할 때 사용한다.

- Independent case 두 개 이상을 요구하고 아니면 provisional로 표시한다.
- Scope와 counterexample을 기록한다.
- Repository-specific incident 하나를 universal rule로 만들지 않는다.

## Predict

나중에 score할 수 있는 forecast에 사용한다.

- Horizon, outcome schema, scoring rule, resolution source를 미리 선언한다.
- Outcome을 알기 전에 prediction timestamp를 고정한다.
- Resolution evidence 뒤 forecast를 수정하지 않는다.

## Improve

Faithful evaluator가 있는 existing artifact에 사용한다.

- Baseline behavior를 보존하고 measured weakness 하나를 다룬다.
- Style/quality score를 inherently objective number가 아니라 profile-specific evidence로 취급한다.
- Repeated adaptation이 evaluator에 overfit할 수 있으면 untouched confirmation set을 쓴다.

## Scenario

Seed feature, flow, failure domain의 edge-case coverage를 체계적으로 찾을 때 사용한다.

```text
seed -> coverage dimensions -> generate -> classify new/extension/duplicate
-> log -> saturation check -> repeat
```

- Dimension과 iteration을 제한한다.
- Declared saturation 또는 budget에서 중단한다.
- Scenario discovery는 구현이 해당 scenario를 처리한다는 증거가 아니다. Retained scenario를 project-owned test나 acceptance check로 바꾼다.

## Iteration analytics

`results.tsv` 또는 동등한 recorded evidence를 분석할 때 사용한다.

- Trend, plateau, crash cluster, invalid run, promising hypothesis를 찾는다.
- Finalized outcome을 다시 labeling하지 않는다.
- Local/upstream TSV analyzer를 behavioral eval 및 legacy OpenAI Evals platform과 구분한다.

## Behavioral evals

Artifact 또는 agent trace를 outcome, process, style, efficiency로 평가할 때 사용한다.

- Candidate 전에 case, check/rubric, judge identity, aggregation을 고정한다.
- Process가 claim의 일부면 trace/tool-call/handoff evidence를 보존한다.
- [`config-and-metrics.ko.md`](config-and-metrics.ko.md)의 metric/judge reliability contract를 적용한다.

## Regression

Changed state가 green baseline을 red로 바꾸는지 검증할 때 사용한다.

- Base와 candidate를 isolated owned state에서 평가한다.
- Malformed, truncated, missing, invalid evidence는 fail closed한다.
- Unavailable dimension을 명시한다.
- Evaluable baseline을 만든 dimension이 없으면 `STABLE`을 보고하지 않는다.

## Security

기본은 read-only review와 proof다. Finding은 fix, disclosure, exploit, transmission, production access를 승인하지 않는다.

- Trust boundary와 threat model을 고정한다.
- Verification과 remediation을 분리한다.
- Credential, sensitive data, disclosure, external action은 controlling authorization rule로 route한다.

## Ship

Ship은 readiness verification 뒤 separate finalization gate로 다룬다.

1. Project-defined check를 실행하고 artifact를 검사한다.
2. Blocker와 residual risk를 보고한다.
3. Exact action이 명시적으로 승인되지 않으면 deploy, publish, push, release, destructive rollback, credential use, production mutation 전에 중단한다.
4. 승인된 finalization action 뒤 target identity와 outcome을 검증한다.

Repository override: upstream `--auto` flag는 사용자 승인이 아니다.

## Handoff and chaining

모든 command가 handoff를 쓴다고 가정하지 않는다. Pinned upstream v2.2.2 surface에서는 chain command가 `handoff.json`을 쓰고 downstream command가 소비한다. Local runtime은 다른 artifact를 사용할 수 있다.

Handoff는 [`core-loop.ko.md`](core-loop.ko.md)와 [`safety-and-observability.ko.md`](safety-and-observability.ko.md)를 만족할 때만 automatically resumable하다. Immutable frontier, explicit candidate, evidence, ownership, cleanup, redaction, revalidation state가 없는 summary filename은 resume contract가 아니다.

## Sources

> 출처 확인 2026-08-27. Upstream behavior는 release v2.2.2, commit `050e30dc4ba0974b03f2873111b9901ec3211390` 기준이다.

- [v2.2.2 release](https://github.com/uditgoenka/autoresearch/releases/tag/v2.2.2)
- [Pinned root skill and router](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/SKILL.md)
- [Pinned scenario archetype](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/scenario.md)
- [Pinned regression archetype](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/.agents/skills/autoresearch/regression.md)
- [Pinned chains and handoff behavior](https://github.com/uditgoenka/autoresearch/blob/050e30dc4ba0974b03f2873111b9901ec3211390/guide/chains-and-combinations.md)
- [OpenAI skill evaluation guidance](https://developers.openai.com/blog/eval-skills)
