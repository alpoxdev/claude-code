# Repair Workflow

**Purpose**: 테스트-후-수정 작업을 좁게 유지하고, 가능한 되돌릴 수 있게 하며, 결함을 드러낸 동일 평가로 증명한다.

## Permission and ownership gate

사용자가 고침, 강화, 추가, 수정, 정리, 삭제를 명시적으로 요청할 때만 편집한다. 편집 전에 대상 스킬 루트를 기록하고, 쓸 수 있는 파일이 다음 중 하나임을 증명한다:

- 해당 `SKILL.md` 또는 지역화 sibling;
- 대상 스킬 안의 직접 또는 전이적으로 필요한 지원 파일;
- 요청된 대상 로컬 eval 산출물;
- 측정한 공백을 닫는 데 필요한 최소 신규 리소스.

이웃 스킬, 공유 지침, 애플리케이션 코드, 생성 파일, 외부 시스템은 수정하지 않는다. 넓은 구조, 이름, 패키지 재설계는 발견사항을 기록한 뒤 `skill-maker`로 넘긴다.

## Baseline -> repair -> recheck

1. 편집 전에 정적 출력과 영향 시나리오 결과를 저장한다.
2. 가장 작은 근본 원인을 분류하고 이를 고칠 대상 소유 파일을 이름으로 정한다.
3. 하나의 일관된 수정 집합만 적용하며 기회성 정리를 섞지 않는다.
4. 바꾸지 않은 영향 정적 검사와 시나리오를 다시 실행한다.
5. 중요 guard가 통과하고 새 회귀가 없을 때만 변경을 유지한다. 그렇지 않으면 멈추고 근거를 보존하며 `iterate` 또는 `block`을 보고한다.

## Safe addition and edit

- 명확한 owner, load condition, verifier가 있을 때만 rule, reference, fixture, deterministic helper를 추가한다.
- trigger, authority, side-effect, loop, stop 규칙은 `SKILL.md`에서 발견 가능하게 유지한다.
- 기계 판독 형식과 한영 의미 동등성을 지키며, 실질적으로 변경한 모든 Markdown에는 한국어 sibling을 추가한다.
- 실패 테스트를 약화하거나 guard를 제거하거나 실패를 caveat이라고 이름만 바꿔 수리로 만들지 않는다.

## Safe deletion gate

다음 조건을 모두 만족할 때만 삭제할 수 있다:

1. 사용자가 정리 또는 삭제를 명시적으로 요청했거나, 오래된 파일을 이름으로 지정한 수리를 승인했다.
2. 파일이 대상 스킬의 증명된 소유 범위 안에 있고 과업 밖 사용자 작업이 아니다.
3. search와 직접 링크 검사에서 남은 in-scope consumer가 없거나, 같은 수정으로 모든 consumer를 먼저 해소했다.
4. 삭제가 필요한 baseline evidence, 배포된 호환 계약, 생성 source of truth, 검토하지 않은 외부 consumer를 지우지 않는다.
5. 삭제 후 링크, 구조, 영향 동작 검사가 통과한다.

하나라도 알 수 없으면 파일을 보존하고 후보로 보고한다. 추론만으로 삭제하지 않는다.

비유지 후보를 되돌릴 때는 **compare-before-restore** 영수증을 사용한다. 현재 대상 소유 파일이 기록한 후보 postimage와 일치할 때만 preimage로 복구하며, 일치하지 않으면 충돌로 중단한다.

## Stop and handoff

한 번의 repair cycle 뒤에 멈춘다. 새 스킬, resource redesign, 넓은 package refactor는 `skill-maker`로, 제한된 metric experiment는 `autoresearch-skill`로 넘긴다. 대상, ownership, permission, 필수 verification capability가 없으면 block한다.
