# 수정 워크플로

## 모드

- `audit`: 검사, 분류, 보고만 한다. 제품 소스를 수정하지 않는다.
- `clean`: audit 후 근거 있는 저위험 변경을 적용하고 구조 변경은 판단한 뒤 검증·보고한다.
- `verify`: 기존 변경을 brief, 이전 finding, 현재 guard와 대조한다. 변경 범위를 넓히지 않는다.

## 순서

1. 요청에서 대상과 모드를 확정한다. 대상이 없으면 수정은 block한다.
2. 구현 세부를 스캔하기 전에 프로젝트 권한과 존재하는 제품·디자인 맥락을 읽는다.
3. brief inference와 unknown을 기록한다. `PRODUCT.md`나 `DESIGN.md` 부재를 greenfield 권한으로 해석하지 않는다.
4. `detect-slop.cjs`를 실행한다. report-only delta 비교에만 `--baseline <result.json> --only-new`을 사용하며 debt를 승인하지 않는다. 반복 페이지 구조가 관련되면 `analyze-structure.cjs`도 실행한다.
5. 이미 사용 가능한 browser capability 또는 검증된 handoff가 있을 때만 렌더링 증거를 수집한다. project breakpoint 또는 375, 768, 1280 폭을 사용하고 관련 hover, focus, active, disabled, loading, empty, error, reduced-motion 상태만 확인한다.
6. 각 finding에 engine, evidence kind, detection/remediation confidence, exception status, rule scope, severity, evidence family를 지정하고 `remove`, `replace`, `preserve`, `ask`, `block`을 선택한다.
7. `clean`에서는 가장 작은 저위험 범주부터 적용한다. 무관한 redesign을 한 pass에 묶지 않는다.
8. detector와 영향받은 프로젝트 검사를 다시 실행하고, 가능하면 렌더링 동작을 확인한다.
9. 구체적으로 실패한 guard에만 보정 pass 1회를 허용한다. 총 2 edit pass 후 중단한다.
10. 템플릿으로 관찰 결과와 한계를 보고한다.

## Pass 수용 조건

해당하는 모든 조건을 만족할 때만 pass를 유지한다.

- P0가 남지 않음
- 각 P1이 해결되거나 보존 사유가 기록됨
- 관찰된 동작 regression 없음
- 보호된 copy, IA, legal text, URL, form contract, asset, brand commitment 유지
- 정당한 trade-off 없이 detector 수치가 악화되지 않음
- candidate exception, baseline, waiver가 protected-contract 또는 P0 issue를 숨기지 않음
- 실제 검사한 responsive·accessibility guard 통과
- 추론하거나 명시된 brief 유지

Guard가 실패하면 해당 변경을 폐기하거나 구체적으로 보정한다. 성공처럼 보이게 baseline을 다시 정의하지 않는다.
