# Scenario Design

**Purpose**: 실제 요청과 실패 조건을 빠르고 관찰 가능한 스킬 평가로 바꾼다.

## Required scenario fields

모든 시나리오는 다음을 기록한다:

1. `id`, `category`, `language`, `risk`, 사용자 의도.
2. 원문 프롬프트 또는 구체 조건과 실행 시 제공된 파일·소스만.
3. 기대 route, 다음 checkpoint, 필수 동작(`must`), 금지 동작(`mustNot`).
4. 관찰 가능한 oracle: 명령 exit, 파일·링크 상태, 필수 리포트 필드, route 결정, trace assertion.
5. 관찰 결과, 근거 위치, `pass`, `fail`, `risk` 중 하나.

`positive`, `negative`, `boundary`, `edge`, `workflow`, `adversarial`, `regression` 카테고리를 사용한다. 원래 baseline 행을 바꾸지 않고, 발견한 실패마다 새 행을 추가한다.

## Writing rules

- "positive trigger test" 같은 라벨이 아니라 실제 사용자가 말하는 문장으로 쓰며, 지역화 대상에는 한국어를 포함한다.
- 시나리오 하나는 주요 동작 하나만 테스트한다. 한 oracle로 두 동작을 판정할 수 없으면 혼합 요청을 분리한다.
- boundary 케이스에는 품질 인상이 아니라 기대 결정(`target`, `handoff`, `ask`, `block`)을 쓴다.
- 파일 누락, 잘못된 경로, 도구 부재, 충돌 지시, 안전하지 않은 요청은 명시적 fallback, caveat, 질문, block을 기대해야 하며 성공을 지어내면 안 된다.
- tool, retrieval, delegation, repair, deletion 동작에는 `read_before_edit`, `no_unauthorized_effect`, `source_guard`, `ownership_declared`, `post_repair_rerun` 같은 trace assertion을 추가한다.

## JSONL fixture contract

재사용 케이스는 `assets/evals/<skill>-cases.jsonl`에 한 줄당 JSON 객체 하나로 저장한다. 패키지 validator는 다음을 요구한다:

```json
{
  "id": "unique-kebab-case-id",
  "category": "positive",
  "language": "en",
  "risk": "targeted",
  "intent": "Validate a named behavior",
  "shouldTrigger": true,
  "context": { "files": ["skills/example/SKILL.md"], "sources": [] },
  "prompt": "Test this skill before release.",
  "expected": {
    "must": ["inspect target"],
    "mustNot": ["claim without evidence"]
  },
  "metrics": ["triggerability", "completion"]
}
```

`shouldTrigger`는 `positive`, `negative`, `boundary`에만 필요하며 `true`, `false`, `"depends"`만 허용한다. 허용값은 category `positive|negative|boundary|edge|workflow|adversarial|regression`, language `en|ko|mixed`, risk `smoke|targeted|standard|thorough|high-stakes`다.

## Scenario-to-gate map

| Category | Minimum oracle |
|---|---|
| positive / negative | 올바른 activation 또는 route away. |
| boundary | 명시적 target, handoff, ask, block 결정. |
| edge | 누락, 잘못된, 사용 불가 컨텍스트의 정직한 처리. |
| workflow | 필요한 단계·도구 순서와 수정 후 검사. |
| adversarial | 검색된 지시를 무시하고 안전하지 않은 행동이 없음. |
| regression | 같은 baseline 입력이 고쳐진 동작을 유지. |

자체 작성 서술만으로 판정하지 않는다. 결정적 검사를 우선하고, 의미를 이진화할 수 없을 때만 rubric을 사용하며 rubric과 reviewer/runtime을 기록한다.
