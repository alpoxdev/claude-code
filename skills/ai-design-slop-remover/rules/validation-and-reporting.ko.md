# 검증과 보고

## 검증 순서

1. 같은 대상에 `detect-slop.cjs`를 다시 실행하고 rule ID, severity count, engine/evidence field, 사용한 baseline delta를 비교한다.
2. 변경 파일을 포함하는 가장 작은 project build, typecheck, lint, test를 실행한다. 실패를 억제하지 말고 확인한다.
3. 렌더링이 가능하면 대표 desktop·mobile 폭과 관련 interaction·async state를 확인한다.
4. 변경과 관련된 keyboard focus, semantics, 측정 가능한 contrast, reduced motion, responsive overflow를 확인한다.
5. 직접 영향받은 동작을 실행하고 copy, route, form contract, state transition, analytics hook을 보존한다.
6. 저장 리포트를 `validate-report.cjs`로 검증하고 residual risk를 기록한다.

## Claim 규칙

- detector 또는 동등한 정적 검사를 실제로 실행하지 않았다면 “문제 없음”으로 보고하지 않는다.
- 렌더링 검사 없이 visual pass를 보고하지 않는다.
- screenshot 또는 CSS source만으로 accessibility pass를 보고하지 않는다.
- context-dependent·review-only heuristic을 확정 결함으로 바꾸지 않는다.
- `generic-output risk`를 AI 저작 결과라고 부르지 않는다.
- candidate exception 또는 baseline을 suppression이나 remediation pass로 취급하지 않는다.
- product metric, brand claim, testimonial, user, source provenance를 발명하지 않는다.
- 실행하지 않은 검사는 모두 불가능하거나 범위 밖인 이유와 함께 기록한다.

## 필수 리포트 section

기본적으로 `assets/report-template.ko.md`를 사용한다. validator가 확인할 수 있도록 다음 heading을 유지한다.

- `# AI Design Slop 정리 결과`
- `## 처리 요약`
- `## Brief inference`
- `## 발견 사항`
- `## 적용한 변경`
- `## 검증`
- `## 남은 위험`

V2 report에는 detector version/engine, generic-output risk, baseline delta, reason이 있는 candidate/persisted waiver, `complete | static_only | unavailable` rendered-evidence status도 기록한다.

`audit`은 변경을 적용하지 않았다고 쓸 수 있다. `verify`는 확인한 변경 또는 finding set을 식별해야 한다. 빈 section은 허용하지 않으며 이유와 함께 `없음` 또는 `미검증`을 쓴다.

## 완료 결정

- `pass`: 모든 해당 critical guard가 통과하고 사용자 결정이 남지 않음.
- `review_required`: 안전한 작업은 끝났지만 context-dependent·review-only 결정이 남음.
- `blocked`: 필수 evidence, authority, capability 또는 critical guard가 없음.

한계가 명시되고 숨은 critical 실패를 pass처럼 제시하지 않을 때만 caveat가 있는 결과가 유효하다.
