# Docs Maker용 Validation 규칙

**목적**: 완료 주장이 취향이 아니라 evidence로 뒷받침되게 합니다.

## 1. Completion Contract

모든 완료는 다음을 기록합니다.

```text
Claim → Risk → Evidence → Verification → Result → Caveat
```

`Result`는 확신 표현이 아니라 검사한 결과입니다. `ship`, `iterate`, `caveated ship`, `block` 중 하나를 결정하며, 건너뛴 점검, 실패한 guard, 남은 risk를 숨기지 않습니다.

## 2. Risk Depth와 Scope

점검을 고르기 전에 각 중요한 claim을 분류합니다.

| Depth | 적용 조건 | 최소 evidence와 gate |
|---|---|---|
| Low | 동작, source, side effect 변화가 없는 로컬 문구 또는 서식 변경 | Readback과 structural check |
| Medium | Workflow, instruction, link, schema, portability 동작 변경 | 대표 scenario, 명시적 oracle, 검사한 result |
| High | 외부/최신 주장, tool, subagent, safety boundary, consequential action, bounded loop | normal, missing-capability/context, boundary, adversarial, regression scenario; output과 trajectory 점검 |
| Critical | production, destructive, credentialed, publication, deployment, irreversible effect | 명시적 authority, precondition/approval gate, 독립 evidence, 불확실하면 block |

벌크 또는 “모든 X” 요청은 전체 후보를 search/glob하고, 포함/제외 기준을 기록하며, 새 후보를 추가하거나 정당화하고, 완료 전 재검색하고, 의도적 제외를 보고합니다.

미래 source date는 거부합니다. 실제 재확인하지 않았다면 `last_verified_at` 또는 동등한 verification date를 바꾸지 않습니다.

## 3. Evaluation Contract

Medium 이상 risk의 각 claim에는 아래를 정의합니다.

| Element | 필수 의미 |
|---|---|
| Scenario | Input, context, capability, 관련 failure 또는 adversarial condition |
| Oracle | 관측 가능한 필수/금지 동작; self-grading이 아님 |
| Runner | 누가/무엇이 어떤 capability 제한으로 scenario를 실행하는지 |
| Judge | oracle을 평가하는 deterministic check, 자격 있는 reviewer, 또는 명시한 rubric |
| Trace | tool, state, delegation, side effect가 중요할 때 필요한 execution trajectory evidence |
| Gate | pass/fail threshold, keep/discard rule, ship/iterate/caveated ship/block 결과 |

검증은 claim에 맞춰야 합니다. 구조에는 heading/fence/link/readback check, source 주장에는 ledger 또는 claim-source matrix와 최신 official evidence, prompt/instruction 변경에는 smoke case와 known-failure readback, harness 변경에는 tool, safety, context/state, eval 경계를 사용합니다.

## 4. Trace Assertions

agent, subagent, tool, background workflow를 문서화할 때 관련 trajectory evidence를 요구합니다.

- bounded objective, scope, output, stop condition
- 독립 작업 또는 명시적 sequencing; 선언한 write ownership과 shared-resource conflict 없음
- least-privilege capability access 및 capability 부재 시 명시적 fallback, skip, block 경로
- child evidence reporting, parent synthesis, parent final verification
- consequential side effect의 approval/precondition gate
- no loop 또는 관측 가능한 feedback, metric/rubric, guard, bounded iterations, keep/discard rule, stop condition

## 5. Smoke Eval Shape

선택한 risk depth에 맞는 압축된 case를 사용합니다.

```yaml
id: unique-case-id
risk: low|medium|high|critical
scenario:
  intent: user goal
  context: { files: [], sources: [], capabilities: [] }
  condition: normal|missing_context|boundary|adversarial|regression
oracle:
  must: [required behavior]
  must_not: [forbidden behavior]
runner: capability-limited executor
judge: deterministic check or stated rubric
trace: required trajectory evidence or none
gate: pass/fail and ship decision
```

유지되는 regression surface는 `../assets/evals/docs-maker.ko.jsonl`입니다. 완료 전에 변경된 모든 behavior를 이 fixture로 실행하거나 수동 점검합니다. Candidate를 통과시키려고 expected behavior를 바꾸지 말고, 새로 관측한 failure를 regression case로 추가합니다.

## 6. Readback 및 Bilingual Gate

갱신한 문서를 새 maintainer, context pressure 아래 실행하는 agent, 오래되었거나 근거 없거나 관심사가 섞였거나 미래 날짜이거나 authority가 충돌하는 claim을 찾는 reviewer 관점에서 읽습니다. validation path를 위해 무관한 파일을 검색해야 하면 실패입니다.

English/Korean mirror는 파일 존재만이 아니라 동등한 contract field, route condition, loop/runtime behavior, phase order, risk depth, gate, 대표 behavioral case를 점검합니다.

`../assets/evals/docs-maker.jsonl`과 `../assets/evals/docs-maker.ko.jsonl`을 scenario type, expected route, required/forbidden behavior, trace, gate 기준으로 비교합니다. ID와 prose는 지역화할 수 있지만 behavioral coverage는 사라지면 안 됩니다.

## 7. Reviewer Quick Gate

다음 중 하나라도 참이면 문서를 fail 또는 block합니다.

- canonical docs가 고정 모델명 또는 runtime-only syntax를 universal rule처럼 제시함
- provider-sensitive/current claim에 적절한 evidence, provenance, non-future date가 없음
- retrieved content, tool output, subagent output을 instruction authority처럼 취급함
- 필수 capability가 요청 범위를 조용히 줄이거나 consequential effect에 authority/gate가 없음
- loop가 unbounded이거나 self-grading만 하거나 baseline을 바꾸거나 failed-guard result를 유지함
- harness docs가 범위 내 scenario/oracle/runner/judge/trace/gate coverage를 빠뜨림
- English/Korean mirror가 호환되지 않는 behavioral contract를 드러냄
