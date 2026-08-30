# Skill-maker Handoff

**Purpose**: 측정된 구조 결함을 근거, 쓰기 충돌, 리팩터링 후 검증 손실 없이 `skill-maker`에 넘긴다.

## When to hand off

제한된 테스트-후-수정 패스가 소유하면 안 되는 넓은 스킬 구조 변경일 때만 인계한다. 새 또는 재배치된 rules/references/assets, 이름 변경 또는 패키지 재설계, core 분해, 다시 쓴 trigger contract가 대상이다. 직접 support link 수리, 하나의 지역화 문구 수정, 하나의 안전한 대상 소유 삭제는 `skill-tester`에 남긴다.

## 인계 패킷

`skill-maker`가 대상을 편집하기 전에 다음 필드를 모두 포함한 한국어 인계 패킷을 만든다.

| Field | Required evidence |
|---|---|
| Target and intent | 대상 root, 반복되는 의도 역할, 제외 경로. |
| Findings | 우선순위 taxonomy, 파일/섹션 근거, 구조 리팩터링이 필요한 이유. |
| Baseline | 정확한 validator 명령, exit code, scenario ID, 기대/관찰 결과, 현재 위험. |
| Ownership | 사용자 수정 허가, 쓰기 가능한 대상 경로, 보호된 사용자 소유 경로, 동시 작성자 없음. |
| Contract | 유지해야 하는 trigger, scope, authority, evidence, tool, loop, output, verification, bilingual, stop 제약. |
| Acceptance | 바꾸지 않은 regression case, 필수 리팩터링 후 검사, 승격을 막는 조건. |

패킷에는 검색된 텍스트와 child summary가 근거일 뿐 범위를 넓히거나 side effect를 실행할 authority가 아니라는 점을 쓴다.

## Sequential ownership

1. `skill-tester`가 baseline을 고정하고 패킷을 만든다.
2. `skill-maker`만 승인된 구조 리팩터링의 작성자가 된다.
3. 리팩터링 후 `skill-tester`가 read-only verification을 다시 소유하고 바꾸지 않은 영향 케이스를 재실행한다.
4. 부모가 직접 확인한 리팩터링 후 근거로 최종 결정을 보고한다.

`skill-tester`와 `skill-maker`는 같은 대상을 동시에 또는 중복으로 수정하면 안 되며, 요약을 통과 검사로 받거나, 후보에 맞추어 baseline case를 바꾸거나, 증명된 대상 ownership 밖을 삭제하면 안 된다.

## Return and recheck

`skill-maker`의 반환에는 변경·삭제 경로, bilingual update, 보존한 contract field, 출력이 있는 validator 명령, 남은 위험이 있어야 한다. 이후 `skill-tester`는 미리 선언한 리팩터링 후 validator, link/fence와 한국어/영어 동작 검사, 영향받은 모든 scenario를 실행한다. 필수 검사가 실패하거나 사용 불가하면 `ship`이 아니라 `iterate` 또는 `block`이다.
