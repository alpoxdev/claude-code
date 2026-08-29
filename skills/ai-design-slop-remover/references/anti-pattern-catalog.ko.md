# Anti-pattern 목록

Detector 출력이나 렌더링 관찰을 rule에 연결할 때만 이 목록을 읽는다. Registry는 판단 보조이며 보편적 금지 목록이 아니다. `autofix`는 명시된 예외 확인 후에만 결정적 대체가 안전할 수 있다는 뜻이다.

| ID | Category | Scope | 기본 severity | Static | Autofix | Pattern과 예외 |
|---|---|---|---|---:|---:|---|
| `surface.gradient-text` | surface | default-risk | P2 | yes | no | Gradient clip headline; 명시적 brand/reference typography 보존 |
| `surface.purple-gradient` | surface | default-risk | P2 | yes | no | Purple→blue/pink gradient; 문서화된 brand token 보존 |
| `surface.random-glow` | surface | review-only | P3 | partial | no | hierarchy·brand 역할 없는 glow |
| `surface.decorative-orb` | surface | default-risk | P2 | partial | yes | content, interaction, semantic, brand 역할 없는 orb/blob |
| `surface.thick-side-stripe` | surface | default-risk | P2 | yes | no | 의미 없는 두꺼운 card edge |
| `surface.uniform-radius` | surface | context-dependent | P3 | partial | no | 모든 hierarchy level의 동일 radius; design-system token 예외 |
| `surface.uniform-shadow` | surface | context-dependent | P3 | partial | no | 모든 곳의 동일 elevation; 명시적 elevation system 예외 |
| `surface.status-dot` | surface | default-risk | P3 | partial | yes | state·legend 없는 dot |
| `surface.version-label` | surface | default-risk | P3 | partial | yes | 제품 의미 없는 장식용 “v2.0/new” label |
| `surface.decorative-pill` | surface | default-risk | P3 | partial | yes | category, state, action 역할 없는 pill |
| `surface.token-drift` | surface | default-risk | P2 | partial | no | 확인된 token 밖 literal color/font; local 예외 가능 |
| `structure.three-equal-cards` | structure | context-dependent | P1 | partial | no | 동일 icon-heading-copy 카드 3개; 실제 3개 peer 비교 보존 |
| `structure.card-in-card` | structure | default-risk | P2 | yes | no | semantic grouping 없는 presentation card 중첩 |
| `structure.centered-hero` | structure | review-only | P3 | partial | no | 반복 centered hero; page purpose 예외 |
| `structure.template-sequence` | structure | review-only | P2 | no | no | 제품별 IA 없는 Hero→3 features→CTA→footer |
| `structure.ai-nav` | structure | review-only | P3 | partial | no | wordmark-left, links-middle, CTA-right fingerprint |
| `structure.ai-footer` | structure | review-only | P3 | partial | no | generic Product/Company/Resources/Legal 4열 footer |
| `structure.bento-without-ia` | structure | context-dependent | P2 | partial | no | priority·data와 무관한 bento 배치 |
| `copy.placeholder-person` | typography-copy | default-risk | P1 | yes | yes | John/Jane Doe 또는 명백한 fake testimonial identity |
| `copy.placeholder-brand` | typography-copy | default-risk | P1 | yes | yes | Acme/Nexus/SmartFlow형 placeholder를 실제 brand처럼 사용 |
| `copy.cliche` | typography-copy | context-dependent | P3 | yes | no | Elevate, seamless, next-gen, unleash, game-changer; 인용·domain 예외 |
| `copy.unsupported-metric` | typography-copy | default-risk | P1 | partial | yes | local source 없는 percentage·metric claim |
| `copy.unsupported-proof` | typography-copy | default-risk | P1 | partial | yes | source 없는 testimonial, trust badge, proof bar, claim |
| `copy.repeated-eyebrow` | typography-copy | review-only | P3 | partial | no | 모든 section의 uppercase eyebrow |
| `motion.transition-all` | motion-interaction | universal | P2 | yes | yes | broad transition; 실제 바뀌는 property로 교체 |
| `motion.layout-property` | motion-interaction | universal | P1 | yes | no | top/left/width/height/margin/padding animation |
| `motion.missing-reduced-motion` | motion-interaction | universal | P1 | partial | no | 큰 motion에 reduced-motion path 없음 |
| `motion.scale-everywhere` | motion-interaction | default-risk | P2 | yes | no | 무관한 control/card의 동일 hover scale |
| `motion.hover-only` | motion-interaction | universal | P1 | partial | no | 필수 affordance·content가 hover에서만 제공됨 |
| `quality.missing-focus-visible` | quality | universal | P1 | partial | no | visible control의 focus 억제 후 명확한 대체 없음 |
| `quality.missing-alt` | quality | universal | P1 | partial | no | informative image alt 누락; decorative image는 empty alt 가능 |
| `quality.mobile-overflow-risk` | quality | universal | P1 | partial | no | fixed/min-width overflow 가능성; 렌더링 확인 필요 |
| `quality.fake-chrome` | quality | default-risk | P2 | yes | no | 근거 없는 장식용 browser/phone/IDE/terminal chrome |
| `structure.repeated-eyebrow` | structure | review-only | P3 | yes | no | 반복 eyebrow/kicker signature; 실제 hierarchy/sequence를 전달하면 보존 |
| `structure.numbered-section-label` | structure | context-dependent | P3 | yes | no | 01/02/03 marker; 사용자가 따라야 할 sequence면 보존 |
| `structure.identical-icon-card-cluster` | structure | context-dependent | P2 | yes | no | 세 feature-card/icon-tile signature; 실제 peer data/action 보존 |
| `surface.radial-glow` | surface | review-only | P3 | yes | no | Radial glow signature; 목적 있는 lighting/brand material 보존 |
| `surface.grid-background` | surface | review-only | P3 | yes | no | 반복 gradient grid; 실제 map/canvas/blueprint context 보존 |
| `surface.border-plus-wide-shadow` | surface | context-dependent | P3 | yes | no | Border와 wide shadow 조합; 문서화된 elevation system 보존 |
| `type.decorative-monospace` | typography-copy | default-risk | P3 | yes | no | 장식적 technical language와 monospace; code, ID, log, measurement, 실제 state 보존 |
| `motion.pulse-without-state` | motion-interaction | default-risk | P2 | yes | no | Pulse signature; recording, sync, unread, notification, live state 보존 |
| `quality.heading-skip` | quality | universal | P2 | yes | no | 정적 h1→h3 heading skip; component composition은 review 필요 |

## Registry 해석

Static `yes`는 포함 detector가 source signature를 찾는다는 뜻이지 UI 결함 확정이 아니다. `partial`은 source heuristic에 맥락 또는 렌더링이 필요하다는 뜻이다. Browser-only·주관적 pattern은 명시적 warrant와 caveat가 있을 때만 보고한다. 수정 단계에는 `fix-playbook.ko.md`를 읽는다.

Detector v2는 `engine`, `evidenceKind`, detection/remediation confidence, cluster, exception status를 보고한다. `candidate` exception은 계속 보이는 review item이며 finding을 suppress하거나 automatic removal 권한을 주지 않는다.
