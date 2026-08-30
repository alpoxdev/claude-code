# Evidence Reporting

**Purpose**: 테스트와 수정 결과를 재현 가능하고, 결정 가능하며, 실행하지 못한 검사를 정직하게 드러내게 한다.

## Verdicts

- `ship`: 모든 중요 관문이 통과했고 실질적 caveat가 남지 않았다.
- `caveated ship`: 중요 관문은 통과했지만, 이름을 명시한 비중요 또는 실행 불가 검사가 남았다.
- `iterate`: 허가되고 범위 안인 다음 수정이 명확하지만 현재 결과는 통과하지 않는다.
- `block`: 대상, authority, ownership, permission, 필수 capability 때문에 신뢰할 수 있는 결과를 만들 수 없다.

정적 구조가 유효하다는 이유만으로 결과를 `pass`라고 부르지 않는다.

## Claim chain

각 결론은 다음을 기록한다:

| Claim | Risk | Evidence | Verification | Result | Caveat |
|---|---|---|---|---|---|
| Trigger rejects app QA | targeted | Scenario N2와 routing rule | Scenario observation | pass | 해당하면 classifier runtime 미실행 |

baseline과 current 근거를 분리한다. 수정이 없었으면 꾸며 낸 비교 대신 current를 `not applicable`으로 표시한다.

## Finding format

```markdown
- **[critical|high|medium|low] [taxonomy] Title**
  - Evidence: `path:section`, scenario ID, or inspected command output.
  - Impact: concrete routing, execution, safety, or maintenance consequence.
  - Repair / handoff: smallest authorized next action.
  - Recheck: exact post-repair command or unchanged scenario.
```

unsafe behavior, 필수 resource 손실, 거짓 pass에는 `critical`, 일반 경로 trigger/workflow 실패에는 `high`, 복구 가능한 scope/edge 모호성에는 `medium`, 비차단 문구/유지보수 문제에는 `low`를 사용한다.

## Trace and command evidence

tool, repair, deletion, retrieval, delegation 동작에는 편집 전 읽은 파일, 명령과 정규화된 대상 경로, editable ownership, source boundary, side-effect gate, fallback, 한국어와 영어의 동작 동등성, 수정 후 재실행 같은 관련 trace assertion을 기록한다. validator를 실행했으면 명령 exit code와 확인한 JSON 필드를 포함한다.

실행 검사가 불가능하면 이유, 다음으로 좋은 검사, 구체 위험을 쓴다. 실행하지 않은 명령, 서브에이전트 주장, 문서 readback을 부족한 근거 대신 쓰지 않는다.

## Handoff

새 스킬 또는 구조 재설계는 `skill-maker`로, 제한된 점수 최적화는 `autoresearch-skill`로, 애플리케이션 동작은 application QA workflow로 넘긴다. 구조 리팩터링에는 `rules/skill-maker-handoff.md`를 사용하며 대상, baseline, 실패 시나리오, 수정 경로, 미검증 위험, ownership, 리팩터링 후 verifier를 담는다. 받는 스킬의 주장만으로 검증을 끝내지 않는다.
