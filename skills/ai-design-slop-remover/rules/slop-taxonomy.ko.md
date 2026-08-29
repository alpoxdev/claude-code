# Slop 분류 체계

## Finding class

| Class | 의미 | 기본 처리 |
|---|---|---|
| `hard-gate` | 접근성, 동작, 보안 또는 명백한 responsive 실패 | 작업 권한에 따라 수정하거나 block하며 취향으로 축소하지 않음 |
| `default-risk` | 반복되는 AI 기본값과 강하게 닮았지만 의도적일 수 있음 | brief·정체성을 확인하고 근거가 있을 때만 교체 |
| `review-only` | specificity, 취향, 감정적 인상, 구조처럼 사람·agent 판단이 필요함 | caveat와 함께 보고하며 자동 수정 금지 |
| `informational` | 변경은 필요 없지만 유용한 관찰 | 관련 있을 때만 기록 |

## Registry scope

- `universal`: 시각 취향과 무관한 안정적 품질·접근성 guard.
- `default-risk`: 정당한 brief·brand 예외가 있는 의심스러운 기본값.
- `context-dependent`: page type, domain, audience, data shape, brief가 필요함.
- `review-only`: 정적 일치만으로 gate가 될 수 없음.

## 증거와 exception status

- `detection confidence`는 engine이 source, context, DOM, rendered signature를 얼마나 확실하게 찾았는지다.
- `remediation confidence`는 finding을 brief 또는 protected contract 위반 없이 바꿀 수 있는 확실성이다.
- `candidate` exception은 명시 local brand, data, real-state evidence가 preserve를 뒷받침한다는 뜻이다. review를 위해 계속 보이며 rule을 suppress하거나 auto-fix 권한을 주지 않는다.
- `generic-output risk`는 context-confirmed cluster를 바탕으로 한 `low`, `medium`, `high` 우선순위다. AI가 인터페이스를 작성했다는 증거가 아니다.

## Category

- `structure`: 반복 hero, feature grid, card, navigation, footer, bento, sidebar, section fingerprint.
- `surface`: gradient, glow, orb, decorative pill, status dot, side stripe, 획일적 radius/shadow, 임의 token.
- `typography-copy`: generic type 조합, cliché, placeholder 이름·brand, 근거 없는 metric·claim, 반복 eyebrow.
- `motion-interaction`: `transition-all`, 무차별 scale/reveal, layout animation, reduced motion 누락, hover-only affordance.
- `quality`: contrast/focus/semantic/responsive 결함, fake chrome, 렌더링 증거 없는 주장.

## 필수 예외 확인

- 명시적으로 요구한 브랜드 색, gradient, font, reference는 기본적으로 slop이 아니다.
- 실제 데이터가 3개 동등 비교 대상이거나 사용자가 요구하면 3-column은 slop이 아니다.
- 의료, 금융, 공공, B2B 관습은 반복된다는 이유만으로 generic이 아니다.
- 정적 일치는 visual hierarchy, contrast, usability, intent를 증명하지 못한다.
- 약한 신호가 여러 개여도 단순 합산으로 결정적 증거가 되지 않는다.

## 처리

Finding마다 정확히 하나를 선택한다.

- `remove`: 고신뢰 근거가 있는 무근거 장식 또는 placeholder.
- `replace`: 위험 패턴 근거가 있고 brief에 맞는 대안이 콘텐츠와 동작을 보존함.
- `preserve`: brand, brief, data, function이 패턴을 정당화함.
- `ask`: 사용자 결정이 안전한 결과를 실질적으로 바꿈.
- `block`: evidence, scope, authority가 부족함.
