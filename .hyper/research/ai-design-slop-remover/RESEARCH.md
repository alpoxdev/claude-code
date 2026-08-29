# AI Design Slop Remover 강화 조사 리포트

> 검토일: 2026-08-29 | 깊이: deep | 검토한 소스: 10 | 인용한 소스: 10
>
> 범위: `skills/ai-design-slop-remover/`를 기존 제품 정체성을 보존하는 UI anti-slop 감사·정리 스킬로 강화하기 위한 로컬 코드, 공개 GitHub 저장소, 공식 문서 조사. 이번 조사는 **스킬 구현을 수정하지 않는다.**

## Executive Summary

현재 스킬은 안전한 변경 경계, evidence 분류, `audit`/`clean`/`verify` 모드, 한국어 보고 계약을 이미 잘 갖췄다. 다만 실제 탐지는 `detect-slop.cjs`의 정규식 18개(총 186 LOC)에 집중되어 있어, “소스에서 특정 문자열이 보인다”와 “그 선택을 제거하는 것이 옳다” 사이의 맥락을 충분히 검증하지 못한다.

가장 좋은 강화 방향은 [Impeccable](https://github.com/pbakaus/impeccable)의 거대한 구현을 포크하는 것이 아니다. 그 저장소에서 검증된 **다중 탐지 엔진, 프로젝트 디자인 시스템 학습, 좁은 예외 처리, 독립된 비결정적 리뷰와 결정적 탐지의 분리**를 추출하고, [StyleGallery](https://github.com/changeroa/StyleGallery)의 **안전한 대체 레이아웃 패턴과 증거 게이트**, [anti-ai-slop](https://github.com/ch040602/anti-ai-slop)의 **목적·구체성 중심 언어와 클러스터 기반 판정**을 현재 스킬의 보수적 안전 계약 위에 얹는 방식이다.

권장 순서는 (1) typed rule registry와 회귀 평가 확장, (2) 정적 소스·토큰 인식, (3) 브라우저 DOM/렌더 증거 adapter, (4) waiver·baseline·리포트 UX, (5) 대체 패턴 catalog다. 대화형 라이브 편집, 자체 dev-server, 모든 런타임 hook은 성숙 후 선택 사항이며 첫 강화 범위에 넣지 않는다.

## Scope

- 질문: AI Design Slop Remover를 가장 강력하면서도 오탐과 정체성 훼손에 안전한 스킬로 만들려면 무엇을 도입해야 하는가?
- 기준 시점: 2026-08-29.
- 조사 채널: 현재 저장소 코드, 공개 GitHub 저장소의 shallow clone/커밋, 공식 문서.
- 제외: 원격 저장소에 변경을 전송하거나 외부 라이브러리를 설치·실행하지 않았다. 각 저장소의 구현을 복사하거나 라이선스 적합성을 확정하지 않았다.

## 현재 기준선

### 이미 강한 부분

현재 스킬은 다음의 중요한 안전 장치를 이미 보유한다.

- `audit`은 읽기 전용이고 `clean`만 변경할 수 있다.
- 브랜드 토큰, 실제 카피, URL, form contract, 상태 로직, 실제 asset을 기본 보호 대상으로 지정한다.
- `static`/`rendered`/`accessibility`/`rationale` 증거를 구분하고, 정적 탐지 결과를 시각·접근성 통과로 과장하지 않는다.
- 단 두 edit pass만 허용하고, P0/P1·행동 regression·brief 훼손을 명시적 guard로 둔다.
- 한국어 결과 템플릿, `validate-report.cjs`, 14개 eval case를 이미 갖췄다.

근거: `skills/ai-design-slop-remover/SKILL.md`, `rules/*.md`, `assets/evals/slop-remover-cases.jsonl`의 로컬 구현.

### 확인된 한계

| 영역 | 현재 상태 | 실제 위험 |
|---|---|---|
| 탐지 | 한 파일의 정규식 18개 | Tailwind/CSS module/JSX/CSS-in-JS/계산된 CSS에서 누락·오탐 가능 |
| 규칙 모델 | rule metadata가 코드 배열에 내장 | engine 지원 여부, manual-only 성격, 예외, baseline 정책을 기계적으로 표현하기 어려움 |
| 구조 판정 | `grid-cols-3`, `card` 근접 문자열 등 source signature | 진짜 요금제·비교·데이터 cardinality와 템플릿형 feature grid를 구분하지 못함 |
| 디자인 시스템 | `DESIGN.md`를 읽으라는 instruction 중심 | 실제 CSS variables·토큰·font/radius/shadow scale과 탐지를 연결하지 못함 |
| 렌더 증거 | 브라우저가 있으면 agent가 수동 확인 | computed style, overflow, 실제 contrast, 보이는 상태를 구조화된 finding으로 만들지 못함 |
| 예외 | finding의 `preserve`/`ask` 판단만 있음 | 파일·값·한 줄 단위의 이유 있는 waiver와 재검토 이력이 없음 |
| 회귀 | positive fixture 1개와 프롬프트 eval 중심 | rule별 positive/negative/brand-exception/browser-state fixture가 부족함 |
| 대안 | fix playbook이 일부 항목만 지원 | “무엇을 지울까”보다 “기능·IA를 보존하며 무엇으로 바꿀까”의 안전한 선택지가 부족함 |

`detect-slop.cjs`에 실제 등록된 18개 rule은 gradient, transition, layout animation, side stripe, nested card, fake chrome, placeholder/proof/cliche, hover scale, three-column grid, orb/dot/version label, alt/focus signature에 집중되어 있다. 이는 좋은 출발점이지만 UI anti-slop 전체를 판정하기엔 얇다.

## 외부 사례에서 얻을 것

### 1. Impeccable: 다층 detector를 그대로 포크하지 말고 설계 원칙만 채택

[Impeccable](https://github.com/pbakaus/impeccable)는 2026-08-29 기준 clone commit `b0594c72`에서 61개 anti-pattern registry와 다음 5개 탐지 engine을 분리한다.

| Engine | 관찰 대상 | 현재 스킬에 가져올 교훈 |
|---|---|---|
| regex/text | 원본 소스, CSS-in-JS, 스타일 블록 | 현재 Node 정적 scanner를 유지하되 parser/adapter로 분리 |
| static HTML + CSS cascade | markup과 선언 cascade | class명 대신 style 의미를 확인하는 2차 static 단계 |
| browser DOM | computed style, 요소 크기·위치·상태 | layout/overflow/실제 font·색상·모션 상태 확인 |
| visual screenshot contrast | 렌더된 glyph/background 변화 | source만으로 contrast를 주장하지 않는 evidence 보강 |
| design-system analyzer | `DESIGN.md`, tokens, font/radius/size/shadow | 프로젝트의 의도된 token과 literal drift를 분리 |

이 저장소의 detector는 gradient text, dark glow, number label, eyebrow chip, grid background, pulsating dot, border-shadow 결합, image hover transform, line length, heading rhythm, clipped overflow 등 현재보다 넓은 범주를 다룬다. 더 중요한 것은 rule을 정적·DOM·시각 engine 중 어떤 곳에서 신뢰할 수 있는지 구분하고, advisory finding을 실패 count와 분리한다는 점이다.

Impeccable의 `hooks.md`는 즉시 수정 가치가 큰 기계적 finding만 per-edit으로 알리고, 카피·색상·레이아웃 취향은 session 종료 deep pass로 미룬다. `ignore-value`와 file-scoped waiver에는 사유를 요구해 “브랜드의 Inter” 같은 정상 사례를 전역 rule disable로 숨기지 않는다. 이 설계는 현재 스킬의 `preserve` 철학과 잘 맞는다.

또한 `critique.md`는 **독립된 design review(A)**와 **detector/browser evidence(B)**를 섞기 전까지 서로 보지 않게 한다. 이 방식은 detector 결과가 주관 리뷰를 앵커링하는 문제를 줄인다. 다만 subagent가 없는 runtime에서는 명시적으로 degraded라고 표시한다.

**채택:** registry/engine 분리, design-system contextualization, narrow waiver, 즉시/심층 tier, 독립 evidence synthesis.

**채택하지 않음:** 3,537개 파일 규모의 다중 runtime mirror, 12,000 LOC live browser, 자동 hook 설치, 자체 HMR variant workflow. 현재 스킬의 목적은 보수적인 정리이며, 이 기능들은 복잡도·권한·운영 비용이 과도하다.

### 2. StyleGallery: “삭제”를 “기능을 보존하는 대체”로 바꿔 주는 catalog

[StyleGallery](https://github.com/changeroa/StyleGallery)는 2026-08-18 commit `9049f13`에서 46개의 레이아웃 패턴을 9개 범주(centering, containment, grid repetition, inline grouping, media fit, overlay exception, split sidebar, stacking, viewport shell)로 제공한다.

각 pattern은 단순한 CSS 조각이 아니라 **언제 사용할지**, **바꾸면 깨지는 core property**, **반응형·scroll ownership**, **DOM/focus/source order 제약**을 함께 명시한다. 예를 들어 `card-grid`는 카드 반복에만 쓰고, fluid responsiveness와 의미 순서/focus order를 보존하라고 명시한다.

이 저장소의 품질 gate도 직접적인 모델이다.

- visual evidence는 screenshot/diff/state capture를 허용 증거로 삼되, visual QA가 usability·accessibility·brand fit을 증명하지는 못한다고 명시한다.
- design claim gate는 design claim마다 evidence, rationale, counterclaim/limitation을 요구하고, palette나 typeface를 일률적으로 처방하지 않는다.

**채택:** 현재 `fix-playbook.md` 옆에 *small, curated* replacement pattern catalog를 만든다. 새 패턴은 “균일한 feature card를 무조건 없애기”가 아니라 `유지해야 하는 data cardinality`, `바꿀 수 있는 hierarchy`, `semantic/focus/order guard`, `모바일 수용 기준`을 포함한다.

**채택하지 않음:** StyleGallery를 runtime dependency나 디자인 권위로 취급하지 않는다. pattern은 대안 후보일 뿐, 브랜드·brief·실제 데이터가 우선한다.

### 3. anti-ai-slop: AI 저작 여부가 아닌 목적·구체성·클러스터 위험을 판정

[anti-ai-slop](https://github.com/ch040602/anti-ai-slop)의 2026-06-28 commit `171db9c`은 “AI detector가 아니라 generic-output quality review”라고 분명히 선언한다. 924줄의 field-reported register는 Web/UI SaaS average(P21), blink/status decoration(P22), copy-paste layout grammar(P23), generated visual slop(P24), detector overreach(P25)를 분리한다.

특히 다음은 현재 스킬이 직접 흡수할 가치가 크다.

- finding의 중심 질문을 “AI가 만들었는가”가 아니라 **목적에 맞는가, 다른 제품에도 그대로 재사용될 수 있는가, proof/state/task가 있는가**로 둔다.
- isolated word 하나가 아니라 한 영역에서 반복되는 **cluster**를 위험 신호로 본다.
- `generic-output risk`와 severity/confidence를 분리한다.
- hero, feature card, dashboard visual, motion마다 “무엇을 사용자가 이해하거나 할 수 있게 하는가”를 확인한다.

**채택:** 모든 finding에 `specificity impact`와 `cluster key`를 추가하고, final verdict를 authorship claim 없이 “generic-output risk”로 보고한다.

### 4. anti-dark-pattern: 실행 가능한 rule·테스트·CI reporting의 운영 모델

[anti-dark-pattern](https://github.com/erayaha/anti-dark-pattern)의 2026-08-29 commit `cbba425`은 UI code scan을 CLI/GitHub Action/test suite로 배포하는 구조다. 주제가 anti-slop과 다르므로 rule을 가져오면 안 되지만, **rule engine + typed result + testable CLI + CI report-only rollout**이라는 운영 방식을 참조할 수 있다.

**채택:** JSON output schema, rule unit test, CI에서 실패시키기 전 report-only baseline/delta 모드.

## 공식 근거가 주는 경계

### Browser·접근성 증거는 정적 lint와 다르다

[Playwright accessibility testing 문서](https://playwright.dev/docs/accessibility-testing)는 Axe가 contrast/label/중복 ID 등 자동 검출 가능한 문제를 잡을 수 있지만, 많은 접근성 문제는 수동 평가와 포용적 사용자 테스트가 필요하다고 명시한다. 따라서 강화된 스킬은 다음을 절대 섞지 않아야 한다.

- source rule hit ≠ 렌더된 visual failure
- screenshot 안정성 ≠ 접근성 pass
- Axe pass ≠ user task/usability pass
- generic pattern count ≠ AI authorship probability

이 구분은 현재 스킬의 evidence taxonomy를 유지·확장해야 하는 이유다.

### Token parsing은 보수적으로 한다

[Design Tokens Community Group format draft](https://www.designtokens.org/tr/drafts/format/)은 design token을 플랫폼 독립적인 design decision 표현으로 설명하지만, 해당 페이지 스스로 preview이며 구현의 권위 있는 specification으로 삼지 말라고 밝힌다. 그러므로 첫 단계에서는 형식을 새로 구현하지 않는다.

- `DESIGN.md`, CSS custom property, Tailwind/theme config, existing token file에서 **명시된 값만** 읽는다.
- token을 찾지 못하면 “literal color가 slop”이라고 결론 내리지 않는다.
- DTCG parser는 stable specification 또는 프로젝트의 실제 `.tokens` 사용이 확인된 뒤 별도 opt-in으로 다룬다.

### Anti-slop은 usability와 연결되지만 대체하지 않는다

[NN/g의 10 usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)는 system status, real-world language, user control, consistency, error prevention, recognition, efficiency, minimal design, error recovery, help를 제시한다. `Aesthetic and Minimalist Design`은 불필요한 정보가 중요한 정보의 상대적 가시성을 낮춘다고 설명한다.

따라서 anti-slop finding은 “덜 유행하게 만들기”가 아니라 **주요 task·state·proof·hierarchy를 가리는 장식을 줄이는지**로 정당화해야 한다. 이 heuristic은 review lens로만 쓰고, 빈 static match로 violation을 만들지 않는다.

### 새 rendered adapter는 브라우저의 resolved value를 근거로 한다

[MDN의 `getComputedStyle()` 문서](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle)는 해당 API가 active stylesheet와 계산을 적용한 뒤의 read-only resolved style을 돌려준다고 설명한다. 그러므로 browser adapter는 CSS class/token 이름을 재추측하지 말고 실제 `font-size`, `line-height`, `color`, `background`, `border`, `animation`, pseudo element 같은 **결과 값**을 finding evidence로 저장해야 한다.

다만 반환 객체는 live object이고, 방문한 링크 관련 privacy 보호 때문에 일부 computed style이 의도적으로 부정확할 수 있다. render adapter는 매 scan에서 JSON primitive snapshot으로 즉시 직렬화하고 `:visited` 기반 판단을 하지 않아야 한다. 이 제약은 source와 rendered result의 책임을 분리하는 또 하나의 이유다.

### Interaction·motion rule은 UI의 실제 상태를 보존해야 한다

[Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)은 visible/unobscured focus ring, 24px 이상 hit target(모바일 44px), `prefers-reduced-motion`, state를 설명하는 motion, 그리고 `transition: all` 대신 의도한 property만 명시할 것을 권한다. 이 문서는 일반적 UI guideline이므로 brand direction의 근거로 쓰면 안 되지만, 현재 스킬의 `transition-all`, layout-property animation, focus, reduced motion, empty/loading/error state 검증은 강화할 수 있다.

따라서 `transition-all`은 자동 replace 후보로 유지하되, focus ring을 지연시키지 않는지, reduced-motion에서 상태 전달이 완전히 사라지지 않는지, 그리고 실제 hover/focus/active property가 무엇인지를 browser evidence로 확인한 후 수용한다.

## 강화 목표 아키텍처

### 원칙

1. **Brief와 identity가 detector보다 우선한다.** 브랜드 gradient, 3개 요금제, domain convention은 registry의 일반 규칙을 이긴다.
2. **탐지 confidence와 remediation confidence를 별도로 기록한다.** `transition-all`의 존재는 확실해도 해당 전환이 왜 필요한지는 별도 검토다.
3. **한 signal이 아니라 cluster + context를 우선한다.** 여러 독립 category의 medium-risk signal이 한 surface에 집중될 때만 generic-output risk를 높인다.
4. **브라우저가 없을 때 기능을 축소하되 거짓 pass를 만들지 않는다.** static-only 결과는 유효하지만 rendered claim은 할 수 없다.
5. **대안은 semantics·data·focus order·responsive guard를 포함해야 한다.** 카드 제거가 정보 구조 삭제가 되어서는 안 된다.
6. **waiver는 좁고 이유가 있어야 한다.** 전역 disable은 사용자 승인 없이는 금지한다.

### 제안 모듈

| 계층 | 책임 | 초기 구현 범위 |
|---|---|---|
| Context resolver | brief, brand, tokens, target, protected contracts를 structured context로 추출 | `DESIGN.md`/`PRODUCT.md`, CSS variables, theme config, target import 주변부 |
| Rule registry | rule ID, category, class, severity, engine support, exception prompts, autofix eligibility, tests를 선언 | JSON/JS data module; 기존 18 rule 이전 |
| Static engines | text/CSS/markup/signature를 탐지 | 현재 regex scanner 분리 + CSS var/markup adapter |
| Rendered adapter | computed style, real dimensions, overflow, DOM semantics, state/viewport observation | browser capability가 있을 때만 실행하는 JSON adapter |
| Decision layer | detect vs remediate confidence, cluster, protected content, disposition, waiver를 계산 | `remove/replace/preserve/ask/block` 유지·정교화 |
| Remedy catalog | pattern별 안전한 대안과 acceptance guard | 10~15개 high-value replacement pattern |
| Evidence/report | baseline delta, rendered/static distinction, waiver ledger, residual risk | current Korean template와 validator 확장 |
| Evaluation suite | rule regression, false positive, protected contract, render-state test | fixture matrix + deterministic test runner |

### Registry 계약 예시

```ts
type Rule = {
  id: string
  category: 'structure' | 'surface' | 'type-copy' | 'motion' | 'quality'
  class: 'universal' | 'default-risk' | 'context-dependent' | 'review-only'
  defaultSeverity: 'P0' | 'P1' | 'P2' | 'P3'
  engines: Array<'text' | 'css' | 'markup' | 'dom' | 'visual'>
  perEditTier?: 'immediate' | 'deep'
  evidenceLimit: string
  exceptionChecks: string[]
  dispositionPolicy: 'autofix-safe' | 'review' | 'manual-only'
  remedyRef?: string
  fixtureRefs: string[]
}
```

`autofix-safe`는 현재처럼 content/state/brand/semantic role이 없는 장식에만 허용한다. `default-risk` 또는 `context-dependent` 구조 rule은 registry에 있어도 자동 변경 권한을 얻지 않는다.

## 우선순위 로드맵

### P0 — 신뢰성 기반: registry, baseline, eval을 먼저 만든다

**목표:** rule 수보다 오탐 제어와 회귀 방지를 먼저 강제한다.

1. `scripts/rules/`에 rule registry를 도입하고 `detect-slop.cjs`를 reader/orchestrator로 축소한다.
2. 모든 rule에 `engine`, `class`, `evidenceLimit`, `exceptionChecks`, `autofix eligibility`를 선언한다.
3. output JSON에 `detectorVersion`, `engine`, `evidenceKind`, `detectionConfidence`, `remediationConfidence`, `clusterKey`를 추가한다.
4. `--baseline <json>`와 `--only-new`를 추가해 CI가 기존 debt가 아닌 새 finding의 delta를 먼저 보고하게 한다.
5. fixture를 positive뿐 아니라 negative·brand exception·data cardinality·localized copy·Tailwind/CSS module/CSS-in-JS로 확장한다.

**완료 기준:** 같은 input이 정렬된 동일 JSON을 내고, rule마다 최소 1 positive와 1 false-positive guard fixture가 있으며, 현재 14 eval case가 모두 유지된다.

### P1 — 정적 분석을 “문자열 검색”에서 “프로젝트 맥락이 있는 소스 증거”로 높인다

**목표:** 정적 mode만으로도 확인 가능한 rule의 precision을 높인다.

1. CSS custom property와 declared token value를 추출한다. `DESIGN.md`는 허가된 gradient/font/color의 primary source다.
2. markup/CSS adapter로 `border-left`, shadow, radius, animation, `prefers-reduced-motion`, heading, image alt, fake chrome을 class명 대신 선언/element 결합으로 확인한다.
3. `structure.three-equal-cards`는 data source, title/price/action 반복, sibling cardinality를 함께 확인하고 “요금제/비교” 힌트가 있으면 기본 `preserve` 후보로 낮춘다.
4. source-only rule에는 `render confirmation required`를 registry에서 강제한다.

**우선 추가 rule 후보:** `structure.repeated-eyebrow`, `structure.numbered-section-label`, `structure.identical-icon-card-cluster`, `surface.glass-decoration`, `surface.radial-glow`, `surface.grid-background`, `surface.border-plus-wide-shadow`, `type.decorative-monospace`, `type.emoji-icon`, `motion.pulse-without-state`, `motion.bounce-easing`, `motion.marquee`, `quality.heading-skip`, `quality.clipped-content`.

**주의:** `overused-font`, cream palette, purple gradient, 3-card grid, glass, monospace는 모두 `default-risk` 또는 `review-only`여야 한다. 단독 source match로 P1을 만들지 않는다.

### P2 — Browser Evidence Protocol을 추가한다

**목표:** 렌더된 화면에서만 판단 가능한 사실을 static 탐지로 가장하지 않는다.

1. browser가 제공될 때 URL/viewport/state 목록을 받아 DOM computed style와 layout 값을 JSON으로 수집한다.
2. 기본 viewport는 surface type에 따라 mobile(375), tablet(768), desktop(1280)으로 시작하고, user/project breakpoint가 있으면 그것을 우선한다.
3. 확인 항목: horizontal overflow, clipped text, rendered control size, focus-visible, motion preference, actual font/color, interactive state, key state(loading/error/empty/disabled).
4. screenshot은 visual hierarchy/spacing/asset fit evidence로 기록하되, axe/keyboard/behavior claim으로 승격하지 않는다.
5. 접근성 자동 검사는 해당 프로젝트가 Axe/Playwright를 이미 보유하거나 사용자가 설치를 승인한 경우에만 실행한다. 그렇지 않으면 browser adapter의 관찰 결과와 manual QA limitation을 보고한다.

**완료 기준:** 브라우저 없이 static-only report가 여전히 동작하고, 브라우저가 있으면 모든 rendered finding에 viewport/state/source locator가 남는다.

### P3 — 좁은 waiver와 개발 흐름을 만든다

**목표:** 의도된 브랜드 선택은 한 번 기록하고, 진짜 문제는 숨기지 않는다.

1. `.ai-slop-remover.json` 또는 프로젝트 친화적인 config에 `ignoreValue`, `ignoreRuleInFile`, `baseline`, `reason`, `reviewAfter`를 정의한다.
2. inline waiver는 `ai-slop-disable-next-line <rule> -- <reason>`처럼 exportable generated file에만 지원한다.
3. user confirmation 없이 global `ignoreRule`을 쓰지 않는다. value/file scope가 기본이다.
4. 최초에는 manual final scan + CI report-only를 제공한다. pre-edit blocking hook은 false-positive rate가 검증된 뒤 opt-in으로만 고려한다.
5. `critique` mode를 추가한다면 unanchored design review와 deterministic detector 결과를 독립 수집한 뒤 합성하고, 가능한 도구가 없으면 degraded 사실을 표시한다.

### P4 — 고품질 대체안 catalog를 만든다

**목표:** “AI처럼 보이는 것 삭제” 대신 제품 기능을 더 명확하게 보이게 한다.

각 entry는 `when to use`, `preserve`, `do not use when`, `semantic and focus guard`, `responsive acceptance`, `proof/state requirement`를 가져야 한다.

| 기존 generic 형태 | 후보 대체 | 바꾸면 안 되는 계약 |
|---|---|---|
| 동일 icon-heading-copy feature card 다발 | 우선순위 1개 + supporting list, workflow sequence, typographic list | 실제 peer data와 모든 CTA/link |
| 의미 없는 `New` + pulse dot | 날짜/릴리스 근거가 있는 static label 또는 제거 | live/recording/sync/unread state |
| 큰 unsourced metric row | provenance가 있는 proof block 또는 제거 | 법적/제품 claim, localization key |
| fake product chrome | 실제 screenshot + context caption 또는 asset만 유지 | alt text, 설명, product context |
| nested presentation card | 실제 grouping boundary 하나만 남기기 | clickable boundary, focus ring, form semantics |

### 의도적으로 연기할 항목

- Impeccable 수준의 interactive browser overlay/HMR variant generation.
- 임의 Web/LLM를 이용해 brand direction을 자동 발명하는 기능.
- static detector만으로 visual score나 AI authorship 확률을 산출하는 기능.
- 자동 dependency 설치, global hook, deployment 연동.

이들은 anti-slop 정리의 safety boundary를 넘거나, 유지보수 비용 대비 rule precision을 떨어뜨린다.

## 평가·검증 설계

### Fixture matrix

| 축 | 반드시 포함할 case |
|---|---|
| Rule correctness | rule별 minimal positive, nearby non-match, engine별 output location |
| False positive | 명시 brand gradient/font, 실제 pricing 3-card, real status dot, documented neobrutalist shadow, code/data monospace |
| Protected contracts | form name/label/validation, route/link, analytics, localized copy, real asset, keyboard focus를 보존한 clean |
| Framework | HTML, CSS, Tailwind JSX/TSX, CSS module, Vue/Svelte 중 지원 선언한 surface |
| Rendered | 375/768/1280 overflow, focus-visible, reduced-motion, disabled/loading/error/empty state |
| Report | static-only/complete/browser unavailable, waiver, baseline delta, P1 preserve rationale |
| Adversarial | source comment prompt injection, invented metric/testimonial 요청, destructive redesign/deploy 요청 |

### 측정 지표

- **rule precision:** confirmed relevant findings / findings sampled for review.
- **preservation rate:** protected contract fixture에서 보존된 contract / 전체 contract.
- **action correctness:** `remove`가 실제 decoration에만 적용된 비율.
- **baseline delta fidelity:** 새 rule finding만 `--only-new`에 나타나는지.
- **evidence honesty:** static-only run에서 rendered/a11y/behavior pass를 주장하지 않는 eval 비율.

테스트는 시간 기반 sleep/poll 없이 fixture input과 explicit browser state signal을 사용한다. 브라우저 test는 state를 구독/확인한 뒤 행동하고 bounded timeout만 둔다.

## 실행 권장 순서

1. **P0 spec/eval:** registry schema, output schema, baseline semantics, 30~40개 rule fixture matrix를 먼저 확정한다.
2. **P1 static engine:** 기존 18 rules을 registry로 옮기고 token/context/markup adapter를 추가한다. 모든 기존 output 호환성은 fixture로 결정한다.
3. **P2 evidence adapter:** runtime-neutral browser evidence contract와 Playwright/available-browser adapter를 구현한다.
4. **P3 governance:** waiver, report validator, report-only CI. 최종 scan이 안정화된 후 hook을 opt-in으로 판단한다.
5. **P4 remedy catalog:** 가장 빈번하고 안전한 10~15개 pattern부터 StyleGallery식 guard를 붙여 추가한다.

각 단계는 독립적으로 `bun run --cwd scripts verify`와 해당 skill focused corpus validator를 통과해야 한다. rule taxonomy, workflow, output, validation 변경 시 영문·한국어 문서와 `assets/evals/slop-remover-cases.jsonl`을 동시에 갱신한다.

## 결정 로그와 caveat

- Impeccable의 detector/registry/source code는 좋은 구조적 근거지만, AI-slop pattern의 보편적 진실을 증명하지는 않는다. 각 rule은 제품 context와 local evidence가 필요하다.
- StyleGallery의 pattern은 긍정적 대체 vocabulary로 유용하지만, 특정 제품의 brand direction을 결정하는 권위가 아니다.
- anti-ai-slop의 field-reported pattern은 community/OSS 감각을 정리한 자료다. AI 저작 판정에 사용하면 안 된다.
- DTCG 페이지는 preview draft이며 구현 기준으로 채택하지 않는다. 토큰 extraction은 프로젝트의 실제 선언을 우선한다.
- Playwright/Axe 및 screenshot 모두 자동화 범위가 제한된다. 키보드, assistive technology, 실제 task completion, brand fit에는 수동 검증이 계속 필요하다.
- 외부 저장소 코드를 복사하기 전에 각 저장소의 최신 라이선스와 attribution 조건을 별도로 확인해야 한다. 이 문서는 설계 아이디어와 공개 evidence만 요약한다.

## Claim-Source Matrix

| 핵심 주장 | Primary source | 보조/충돌 source | 신뢰도 | caveat |
|---|---|---|---|---|
| 현재 detector는 18 regex rule 중심이다 | `skills/.../scripts/detect-slop.cjs` 로컬 코드 | current fixture/evals | 높음 | runtime rendering은 구현하지 않음 |
| Impeccable은 61 rule·5 engine으로 detector를 분리한다 | [Impeccable](https://github.com/pbakaus/impeccable), clone `b0594c72` | `cli/engine/registry`, `engines/*` | 높음 | 18개 provider mirror를 포함한 repository 규모를 그대로 비교하면 안 됨 |
| Impeccable은 tiered hooks·narrow ignore·독립 critique를 제공한다 | [Impeccable](https://github.com/pbakaus/impeccable), `skill/reference/hooks.md`, `critique.md` | local clone | 높음 | 다른 agent runtime의 hook API는 직접 이식 불가 |
| StyleGallery는 pattern과 evidence gate를 결합한다 | [StyleGallery](https://github.com/changeroa/StyleGallery), clone `9049f13` | `patterns/`, `quality/gates/` | 높음 | layout corpus는 visual direction을 처방하지 않음 |
| anti-ai-slop은 authorship 대신 generic-output risk와 cluster를 강조한다 | [anti-ai-slop](https://github.com/ch040602/anti-ai-slop), clone `171db9c` | `research/field_reported_ai_smell_patterns.md` | 높음 | field-reported signals의 보편성은 제한됨 |
| browser/a11y automation은 수동 평가를 대체하지 않는다 | [Playwright accessibility docs](https://playwright.dev/docs/accessibility-testing) | [NN/g heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | 높음 | tool coverage는 project/browser setup에 의존 |
| DTCG draft는 token interoperability의 참고이나 implementation authority가 아니다 | [DTCG format draft](https://www.designtokens.org/tr/drafts/format/) | 해당 문서의 preview 경고 | 높음 | stable spec 채택 전 parser 구현 금지 |
| Browser adapter는 resolved CSS value를 snapshot해야 한다 | [MDN `getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) | Impeccable browser engine | 높음 | `:visited` privacy 보호로 일부 style은 관찰 근거로 부적합 |
| motion/focus/touch rule은 실제 interaction state를 보존해야 한다 | [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines) | Playwright manual-test caveat | 중간 | vendor guideline이며 brand direction의 규범이 아님 |

## Source Ledger

| # | Source | URL/path | Accessed | Grade | Role | Used |
|---:|---|---|---|---|---|---:|
| 1 | 현재 AI Design Slop Remover | `skills/ai-design-slop-remover/` | 2026-08-29 | S | primary local evidence | Yes |
| 2 | Impeccable | https://github.com/pbakaus/impeccable (`b0594c72`, 2026-08-29) | 2026-08-29 | S | primary implementation evidence | Yes |
| 3 | StyleGallery | https://github.com/changeroa/StyleGallery (`9049f13`, 2026-08-18) | 2026-08-29 | S | primary pattern/evidence-gate evidence | Yes |
| 4 | anti-ai-slop | https://github.com/ch040602/anti-ai-slop (`171db9c`, 2026-06-28) | 2026-08-29 | S | primary taxonomy/process evidence | Yes |
| 5 | Anti-Dark Pattern | https://github.com/erayaha/anti-dark-pattern (`cbba425`, 2026-08-29) | 2026-08-29 | S | supporting CLI/CI architecture evidence | Yes |
| 6 | Playwright Accessibility Testing | https://playwright.dev/docs/accessibility-testing | 2026-08-29 | S | official browser/a11y boundary | Yes |
| 7 | NN/g 10 Usability Heuristics | https://www.nngroup.com/articles/ten-usability-heuristics/ | 2026-08-29 | A | usability rationale | Yes |
| 8 | Design Tokens Community Group format draft | https://www.designtokens.org/tr/drafts/format/ | 2026-08-29 | S | token interoperability and preview caveat | Yes |
| 9 | MDN `Window.getComputedStyle()` | https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle | 2026-08-29 | S | browser resolved-value boundary | Yes |
| 10 | Vercel Web Interface Guidelines | https://vercel.com/design/guidelines | 2026-08-29 | B | interaction/motion implementation guidance | Yes |

## Query Log

중복 없는 탐색 질의와 채널을 사용했다.

1. `github "AI slop" detector UI design skill remove generic AI patterns` — GitHub 후보 발굴.
2. `awesome claude code skills design UI audit accessibility github` — 관련 skill ecosystem 교차 확인.
3. `automated design linting tool CSS anti-pattern detector open source` — CLI/CI linter 사례 발굴.
4. `Web Interface Guidelines vercel interfaces.rauno design checklist` — 일반 UI 품질 기준 후보 발굴.
5. `LLM generated UI homogenization study research paper design diversity` — homogenization 연구 후보 발굴.
6. `design system conformance checker figma code tokens lint tool github` — token conformance 사례 발굴.
7. `axe-core playwright accessibility automated testing CI node` — 공식 a11y 자동화 기준 확인.
8. `visual regression testing tool open source playwright screenshot diff 2026` — render verification 대안 탐색.
9. `"design tokens" W3C DTCG format spec community group` — token standard 상태 확인.
10. `Nielsen Norman Group heuristic evaluation 10 usability heuristics severity rating` — usability rationale 확인.

## 다음 구현의 결정 기준

이 리포트를 구현 plan으로 전환할 때는 다음 질문에 모두 “예”일 때만 rule/engine을 추가한다.

1. 해당 pattern은 source/DOM/render 중 어느 증거로 판정 가능한가?
2. 명시 brand/data/domain exception은 무엇이며, registry에서 기계적으로 보류할 수 있는가?
3. 안전한 기본 disposition이 `remove`가 아니라 `review`여야 하는가?
4. rule마다 positive와 false-positive fixture가 있는가?
5. 실제 clean 후 content·semantics·focus·behavior·responsive contract를 확인할 수 있는가?
6. browser가 없을 때도 limitation을 정직하게 보고하며 결과가 유용한가?

모든 답이 충족되지 않으면 그 항목은 pattern catalog의 review-only guidance로 먼저 두고 detector gate로 승격하지 않는다.
