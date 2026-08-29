# AI Design Slop Remover 강화 구현 계획

> 작성일: 2026-08-29 | 상태: 구현 전 검토용 | 범위: `skills/ai-design-slop-remover/`
>
> 근거 조사: [`../../research/ai-design-slop-remover/RESEARCH.md`](../../research/ai-design-slop-remover/RESEARCH.md)

## 결론

`ai-design-slop-remover`는 “AI처럼 보이는 코드를 많이 찾는 정규식 도구”가 아니라, **제품 정체성·실제 데이터·기능 계약을 보존하며 generic-output risk를 증거 기반으로 줄이는 skill package**로 강화한다.

이번 계획은 detector rule의 단순 대량 추가를 금지한다. 먼저 registry, false-positive guard, baseline delta, bilingual skill contract, deterministic fixture를 정비하고, 그 다음에 token/context-aware static analysis, browser evidence, waiver, remedy catalog 순서로 확장한다. Impeccable의 대화형 HMR 편집, 전 runtime hook 설치, AI 저작 확률/visual score 산출은 이번 범위에서 제외한다.

## 목표와 성공 정의

### 제품 목표

1. 정적 finding이 **어떤 엔진·증거·예외 조건에서 나온 것인지** 기계적으로 설명한다.
2. 브랜드 gradient, 실제 비교 카드, 상태 표시, 도메인 관습 같은 의도된 선택을 detector가 삭제 대상으로 승격하지 않는다.
3. `audit`·`clean`·`verify`의 안전 경계와 최대 2 edit pass를 유지한다.
4. browser capability가 있을 때만 rendered finding을 수집하고, 없을 때는 static-only limitation을 구조화해 보고한다.
5. 모든 강화 rule은 positive + false-positive guard fixture를 가진다.
6. 영문 canonical과 한국어 mirror가 동등한 실행 계약을 유지한다.

### 완료 기준

- 모든 새/변경 rule은 registry metadata, fixture, remedy/read condition, Korean mirror를 동시에 가진다.
- `node skills/skill-tester/scripts/validate-skills-corpus.mjs --root skills --only ai-design-slop-remover --json`이 failure 없이 끝난다.
- 대상 skill의 정적 script self-test와 새 detector eval runner가 통과한다.
- 기존 14개 JSONL workflow eval case와 새 regression cases를 검토해 trigger/safety contract가 후퇴하지 않았음을 확인한다.
- `bun run --cwd scripts verify`가 통과한다. 실패 시 변경과 무관한 기존 실패인지 구분하고, 새 failure는 해결하기 전에는 완료로 선언하지 않는다.
- browser adapter가 아직 구현되지 않은 단계에서는 `compatibility`, workflow, report가 browser evidence를 claim하지 않는다.

## 범위와 비목표

### 포함

| 영역 | 이번 강화 범위 |
|---|---|
| Core skill contract | capability 기반 static/rendered 구분, generic-output risk 언어, conditional resource navigation, compatibility 업데이트 |
| Rule model | typed registry, engine support, rule class, evidence limit, exception check, disposition/autofix policy, cluster key |
| Static detector | 현재 18 rule의 registry 이관, token/context adapter, CSS/markup 의미 확인, baseline delta JSON |
| Evidence & reporting | detection/remediation confidence 분리, engine/evidence kind, static-only/complete status, waiver/baseline 기록 |
| Quality controls | rule fixture matrix, deterministic detector/eval runner, report validator 확장, bilingual parity/markdown validation |
| Remediation | 안전한 고빈도 pattern 10~15개에 한정한 replacement catalog 및 focus/semantic/responsive guard |
| Optional browser protocol | runtime-neutral JSON schema와 capability gate; browser DOM adapter는 별도 phase에서 구현 |

### 명시적 비목표

- Impeccable 코드를 복사·포크하거나 해당 61개 rule을 일괄 이식하지 않는다.
- “AI가 작성한 UI인지” 판정, AI-authorship probability, visual taste score를 만들지 않는다.
- 프로젝트의 brand, font, color direction을 자동 선택·교체하지 않는다.
- dependency 추가, Playwright/Axe 설치, global hook, pre-edit block, CI enforcement, deploy/publish를 자동 실행하지 않는다.
- UI source의 copy, URL, form field, state logic, analytics, legal text, real asset을 자동 변경하지 않는다.
- HMR overlay, browser hot-swap variant generation, 자체 dev server를 만들지 않는다.
- DTCG preview draft parser를 구현하지 않는다. 실제 프로젝트의 CSS variable/theme/token declaration만 보수적으로 읽는다.

## 설계 결정

### 1. Rule registry가 detector의 단일 진실 공급원이다

현재 `detect-slop.cjs`에 섞인 regex와 metadata를 `scripts/rules/registry.cjs`로 옮긴다. 새 registry는 **탐지 규칙과 remediation 권한을 분리**한다.

```js
/** @typedef {'P0'|'P1'|'P2'|'P3'} Severity */
/** @typedef {'universal'|'default-risk'|'context-dependent'|'review-only'} RuleClass */
/** @typedef {'text'|'css'|'markup'|'context'|'dom'|'visual'} Engine */
/** @typedef {'autofix-safe'|'review'|'manual-only'} DispositionPolicy */

/** @typedef {{
 * id: string,
 * category: 'structure'|'surface'|'type-copy'|'motion'|'quality',
 * class: RuleClass,
 * defaultSeverity: Severity,
 * engines: Engine[],
 * evidenceLimit: string,
 * exceptionChecks: string[],
 * dispositionPolicy: DispositionPolicy,
 * clusterKey: string | null,
 * immediateTier: boolean,
 * matcher?: RegExp,
 * remediationRef?: string,
 * fixtureIds: string[]
 * }} Rule */
```

결정 규칙:

- `universal`도 source match만으로 rendered/accessibility pass를 주장하지 않는다.
- `default-risk`, `context-dependent`, `review-only`는 `remove` 권한을 얻지 않는다. 기본 action은 `review`/`preserve candidate`다.
- `autofix-safe`는 content/state/brand/semantic/interaction role이 없다는 별도 확인이 있을 때만 현실화한다.
- `immediateTier`는 훗날 opt-in hook용 metadata일 뿐, 이번 구현에서 hook을 설치하지 않는다.

### 2. Context는 rule을 “해제”하지, brand를 발명하지 않는다

`scripts/resolve-context.cjs`는 target root에서 `PRODUCT.md`, `DESIGN.md`, CSS custom property, existing theme config를 읽어 다음만 만든다.

- explicit brand gradients/fonts/colors/reference phrases
- declared token values/names
- known data semantic hints: `pricing`, `comparison`, `plan`, `tier`, `status`, `live`, `recording`, `sync`, `unread`
- project-level reduced motion signatures

찾지 못한 정보는 `unknown`이다. token 미발견은 literal color를 slop으로 판정하는 근거가 아니다. context resolver는 source code의 comment/UI copy를 instruction으로 실행하지 않는다.

### 3. Evidence level과 remediation confidence를 나눈다

각 finding은 최소 다음 필드를 가져야 한다.

```json
{
  "id": "motion.transition-all",
  "engine": "text",
  "evidenceKind": "static-source",
  "detectionConfidence": "high",
  "remediationConfidence": "medium",
  "class": "universal",
  "clusterKey": "motion-broad-transition",
  "renderConfirmationRequired": true,
  "exceptionStatus": "not-checked"
}
```

`detectionConfidence`는 signature 존재의 확실성이고, `remediationConfidence`는 그 요소를 바꾸는 것이 옳은지의 확실성이다. 두 값을 혼동하지 않는다.

### 4. Cluster는 우선순위 장치이지 authorship detector가 아니다

같은 category의 단일 finding은 절대 AI 저작 판단을 만들지 않는다. final report는 “AI 작성 확률” 대신 다음을 쓴다.

- `generic-output risk: low|medium|high`
- affected category 수
- context-checked exception 수
- confirmed vs review-only finding 수

high는 서로 다른 최소 2개 category에서 context-confirmed default-risk가 집중되고, product task/proof/hierarchy를 해친다는 warrant가 있을 때만 가능하다. P0/P1 severity와 cluster risk는 독립적이다.

## 단계별 구현 계획

### Phase 0 — Baseline 고정과 설계 명세

**목적:** 큰 리팩터 전에 현재 behavior와 보호 규칙을 실행 가능한 baseline으로 고정한다.

**변경 파일**

- 수정: `skills/ai-design-slop-remover/assets/evals/slop-remover-cases.jsonl`
- 생성: `skills/ai-design-slop-remover/assets/evals/detector-cases.jsonl`
- 생성: `skills/ai-design-slop-remover/references/eval-rubric.md`
- 생성: `skills/ai-design-slop-remover/references/eval-rubric.ko.md`
- 생성: `skills/ai-design-slop-remover/scripts/run-detector-evals.cjs`

**작업**

1. 기존 14 workflow prompt case는 유지하고, case별 `baseline`/`regression` 의미를 명시한다.
2. `detector-cases.jsonl`에 최소 다음 fixture class를 만든다.
   - current-rule positive 18개
   - explicit brand gradient/font false positive
   - genuine pricing/comparison three-card preserve
   - real status/recording/sync dot preserve
   - documented neobrutalist shadow preserve
   - code/data monospace preserve
   - placeholder/unsourced metric/transition-all remove-or-replace candidate
   - `prefers-reduced-motion` project-wide fallback
   - malformed target / unsupported extension / symlink skip
3. eval runner는 temp directory에 case fixture를 materialize하지 않는다. committed fixture file을 case가 참조하고, detector stdout JSON을 deterministic schema와 expected IDs/location/summary에 비교한다.
4. eval rubric에는 trigger, detector output, false-positive, report honesty, protected-contract, runtime-unavailable scenario의 human review 기준을 적는다.

**Acceptance gate**

- baseline detector의 output을 golden fixture로 저장하기 전에 현재 expected behavior를 한 번 실행해 읽는다.
- runner는 `--help`, `--json`, malformed JSONL/unknown fixture/missing expected field에 non-zero + action-oriented error를 낸다.
- 기존 workflow eval은 삭제·약화하지 않는다. 실제 known failure만 regression row로 추가한다.

### Phase 1 — Typed Rule Registry와 Detector v2

**목적:** behavior는 보존하면서 metadata와 rule source를 분리해 확장을 안전하게 만든다.

**변경 파일**

- 생성: `skills/ai-design-slop-remover/scripts/rules/registry.cjs`
- 생성: `skills/ai-design-slop-remover/scripts/rules/shared.cjs`
- 수정: `skills/ai-design-slop-remover/scripts/detect-slop.cjs`
- 생성: `skills/ai-design-slop-remover/assets/fixtures/detector-negative.html`
- 생성: `skills/ai-design-slop-remover/assets/fixtures/detector-brand-exceptions.html`
- 수정: `skills/ai-design-slop-remover/assets/fixtures/detector-positive.html`
- 수정: `skills/ai-design-slop-remover/assets/evals/detector-cases.jsonl`
- 수정: `skills/ai-design-slop-remover/SKILL.md`, `SKILL.ko.md`

**작업**

1. 현재 18 rule과 `motion.missing-reduced-motion`의 synthesis rule을 registry로 **동일 id와 동일 default severity**로 옮긴다.
2. detector v2 JSON schema를 아래처럼 확장하되, current fields(`id`, `severity`, `confidence`, `scope`, `location`, `evidence`, `action`, `fix`)는 유지한다.
   - root: `detectorVersion: 2`, `enginesRun`, `baseline`, `genericOutputRisk`
   - finding: `engine`, `evidenceKind`, `detectionConfidence`, `remediationConfidence`, `ruleClass`, `clusterKey`, `renderConfirmationRequired`, `exceptionStatus`
3. CLI option은 `--target`, `--json`를 보존하고 `--baseline <json>`, `--only-new`, `--rules <comma-list>`, `--help`를 추가한다.
4. baseline file은 saved detector JSON의 `findings`만 허용하고 `id + normalized file + line + evidence signature` fingerprint로 비교한다. malformed/incompatible baseline은 fail closed한다.
5. deterministic ordering은 file → line → rule ID로 고정한다.
6. `--only-new`은 **새 finding을 숨기지 않고** baseline에 없는 finding만 필터한다. baseline stale/version mismatch는 warning + normal scan으로 넘어가지 않고 explicit error 또는 documented compatibility path를 택한다.

**Acceptance gate**

- `detector-positive.html`의 rule IDs와 summary는 migration 전후 동일하다.
- negative/exception fixture가 false finding 없이 통과한다.
- `--baseline`/`--only-new`은 empty, malformed, version mismatch, known finding, new finding 각각에서 expected exit/result를 낸다.
- Node 18+ only built-in module 사용을 유지한다. 새 package/lockfile을 만들지 않는다.

### Phase 2 — Context Resolver와 Context-Aware Static Engines

**목적:** source signature와 “바꾸면 안 되는 의도”를 보수적으로 연결한다.

**변경 파일**

- 생성: `skills/ai-design-slop-remover/scripts/resolve-context.cjs`
- 생성: `skills/ai-design-slop-remover/scripts/engines/text.cjs`
- 생성: `skills/ai-design-slop-remover/scripts/engines/css.cjs`
- 생성: `skills/ai-design-slop-remover/scripts/engines/markup.cjs`
- 수정: `skills/ai-design-slop-remover/scripts/detect-slop.cjs`
- 수정: `skills/ai-design-slop-remover/scripts/analyze-structure.cjs`
- 수정: `skills/ai-design-slop-remover/references/context-signals.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/references/anti-pattern-catalog.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/assets/evals/detector-cases.jsonl`
- 생성: `skills/ai-design-slop-remover/assets/fixtures/context/`의 small static fixtures

**작업**

1. context resolver는 target 상위 root만 탐색하며 `PRODUCT.md`, `DESIGN.md`, project CSS custom property, existing Tailwind/theme config의 explicit declaration만 collect한다.
2. text engine은 existing regex signatures를 유지한다.
3. CSS engine은 `transition`, `animation`, gradient text, side border, shadow, radius, grid background, `prefers-reduced-motion`을 declaration block 기반으로 확인한다. parser를 도입하지 않고 bracket/string-safe minimum scanner를 구현한다.
4. markup engine은 `<img alt>`, heading order, `section`/card relationship, static fake chrome naming, repeated button/icon tile marker를 확인하되, JSX/Vue/Svelte에는 source-specific limitation을 결과에 기록한다.
5. context engine은 explicit brand gradient/font, pricing/comparison card, named true state에 candidate exception을 붙인다. 예외는 finding을 삭제하지 않고 `exceptionStatus: candidate`와 required review condition을 남긴다. `--apply-exceptions` 같은 자동 suppression flag는 만들지 않는다.
6. 신규 rule 후보는 한 release에서 최대 10개만 추가한다. 우선순위:
   - `structure.repeated-eyebrow`
   - `structure.numbered-section-label`
   - `structure.identical-icon-card-cluster`
   - `surface.glass-decoration`
   - `surface.radial-glow`
   - `surface.grid-background`
   - `surface.border-plus-wide-shadow`
   - `type.decorative-monospace`
   - `motion.pulse-without-state`
   - `quality.heading-skip`

`type.overused-font`, beige palette, glass, monospace, three-column layout은 default-risk/review-only이며 P1의 source-only rule로 승격하지 않는다.

**Acceptance gate**

- every new rule: positive fixture, contextual exception fixture, expected disposition + evidence limit.
- fixture positive는 해당 rule 하나 이상을 검출하지만 unrelated new rule noise는 explicit assertion로 금지한다.
- `DESIGN.md`에 brand gradient가 있으면 `surface.gradient-text`가 `candidate-exception`이 되되 source signature finding 자체와 limitation은 남는다.
- three-card pricing fixture는 card count를 보고하되 removal recommendation을 만들지 않는다.

### Phase 3 — Core Workflow, Taxonomy, Evidence, Report Contract

**목적:** 새 detector가 agent behavior를 과잉 확장하지 않도록 skill contract에 연결한다.

**변경 파일**

- 수정: `skills/ai-design-slop-remover/SKILL.md`, `SKILL.ko.md`
- 수정: `skills/ai-design-slop-remover/rules/slop-taxonomy.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/rules/evidence-and-severity.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/rules/remediation-workflow.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/rules/validation-and-reporting.md`, `.ko.md`
- 생성: `skills/ai-design-slop-remover/rules/waivers-and-baselines.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/assets/report-template.md`, `.ko.md`
- 수정: `skills/ai-design-slop-remover/scripts/validate-report.cjs`
- 수정: `skills/ai-design-slop-remover/assets/evals/slop-remover-cases.jsonl`

**작업**

1. Core `SKILL.md`는 300 lines 아래를 목표로 유지한다. 세부 schema/waiver syntax/rule catalog는 direct support file로 내린다.
2. `resource_navigation`에 정확한 load condition을 추가한다.
   - detector schema/CLI를 바꾸거나 baseline을 사용하면 `rules/waivers-and-baselines.md`
   - context exception을 해석하면 `references/context-signals.md`
   - replacement를 제안할 때만 `references/replacement-patterns.md`
   - browser capability가 실제로 있을 때만 `rules/rendered-evidence.md`
3. taxonomy는 `universal/default-risk/context-dependent/review-only`를 유지하고 `candidate-exception`, `genericOutputRisk`, detection/remediation confidence의 의미를 추가한다.
4. evidence finding record에 `engine`, `evidence kind`, `detection confidence`, `remediation confidence`, `cluster`, `exception`, `render requirement`를 추가한다.
5. report template은 다음 fields를 추가한다.
   - detector version + engines run
   - baseline/delta result
   - generic-output risk (not authorship)
   - candidate/persisted waiver list and reason
   - rendered evidence status: `complete | static_only | unavailable`
   - browser/keyboard/a11y claim boundary
6. report validator는 new required Korean/English section의 presence, final status, static-only visual claim conflict, generic-output language, baseline field, waiver reason을 검증한다.
7. workflow eval에는 “explicit brand exception”, “baseline only-new”, “browser unavailable”, “waiver requested”, “false detector overreach”, “do not invent metric”을 추가한다.

**Acceptance gate**

- English/Korean Markdown file pairs are complete and heading/contract parity is manually reviewed.
- report validator self-test includes valid/invalid baseline and waiver report plus static-only visual claim conflict.
- old valid report behavior remains explicitly versioned: either v1 report remains accepted or migration error gives exact corrective command. Silent breakage is forbidden.
- no SKILL resource link exceeds one direct file hop without a documented reason.

### Phase 4 — Browser Evidence Protocol (Capability-gated, no new dependency)

**목적:** source code로 확인할 수 없는 layout/state fact를 capability가 있을 때만 구조화한다.

**변경 파일**

- 생성: `skills/ai-design-slop-remover/rules/rendered-evidence.md`, `.ko.md`
- 생성: `skills/ai-design-slop-remover/references/browser-evidence-schema.md`, `.ko.md`
- 생성: `skills/ai-design-slop-remover/scripts/collect-rendered-evidence.cjs`
- 생성: `skills/ai-design-slop-remover/assets/fixtures/rendered-evidence/` fixture metadata
- 수정: `SKILL.md`, `SKILL.ko.md`, `validation-and-reporting.*`, `report-template.*`, eval JSONL

**작업**

1. collector는 direct browser automation library를 import하지 않는다. explicit `--input <evidence.json>` validation mode와 capability-provided DOM snapshot handoff mode만 처음 제공한다.
2. schema는 URL/surface, viewport, state, capture time, DOM locator, computed style primitive, bounding rect, overflow result, focus-visible observation, motion preference observation, screenshot reference(optional)를 가진다.
3. browser-capable runtime의 agent가 snapshot을 수집할 때 viewport는 project breakpoints 우선, 없으면 375/768/1280을 기본으로 한다.
4. state는 relevant state만 검사한다. `hover/focus/active/disabled/loading/error/empty`를 모두 의무화하지 않고, 해당 surface의 actual behavior가 있을 때만 proof를 수집한다.
5. rendered rule은 `viewport`, `state`, `locator`, `captured value` 없이 finding을 만들지 않는다.
6. screenshot은 visual hierarchy/spacing/asset fit evidence일 뿐 WCAG, keyboard, end-to-end behavior pass가 아님을 report validator와 core workflow에서 강제한다.

**Acceptance gate**

- capability absent: `static_only` 또는 `unavailable`, no fabricated visual/a11y pass.
- malformed evidence JSON, unknown state, missing viewport/locator, stale schema version are rejected.
- valid rendered evidence allows only fact-supported fields, and static finding cannot be automatically promoted to rendered pass.
- package install is not requested. Axe/Playwright invocation is only referenced when a project already exposes it or user explicitly authorizes installation.

### Phase 5 — Narrow Waivers, Report-only Baseline, Remedy Catalog

**목적:** 의도된 선택을 투명하게 보존하고, removal보다 safe replacement를 우선한다.

**변경 파일**

- 생성: `skills/ai-design-slop-remover/scripts/validate-waivers.cjs`
- 생성: `skills/ai-design-slop-remover/assets/waiver.schema.json`
- 생성: `skills/ai-design-slop-remover/assets/waiver.example.json`
- 생성: `skills/ai-design-slop-remover/references/replacement-patterns.md`, `.ko.md`
- 수정: `rules/waivers-and-baselines.*`, `safe-editing.*`, `fix-playbook.*`, `anti-pattern-catalog.*`
- 수정: `assets/evals/detector-cases.jsonl`, `assets/evals/slop-remover-cases.jsonl`

**작업**

1. waiver file은 optional local config (`.ai-slop-remover.json`)로만 지원한다. detector가 config를 자동 생성/수정하지 않는다.
2. waiver schema:
   - `ruleId`
   - one of `value` or `file`
   - non-empty `reason`
   - `source`: `user-confirmed | documented-brand | fixture | generated-output`
   - optional absolute-date `reviewAfter`
3. global rule waiver는 schema에서 허용하지 않는다. 전체 rule suppression은 user가 명시 요청한 경우에만 agent-level `ask`/documented exception으로 다루고 config feature로 만들지 않는다.
4. inline waiver는 generated/exported standalone file에만 권장하며 exact marker와 reason을 문서화한다. first version에서는 parse only; automatic write는 하지 않는다.
5. report-only CI command example은 detector `--baseline` + `--only-new` 실행만 제공한다. failure exit으로 PR을 막는 configuration은 user/project authority로 opt-in될 때까지 만들지 않는다.
6. replacement catalog은 다음 10 pattern만 우선 제공한다.
   - feature card cluster → priority + support list / workflow / typographic list
   - decorative `New` + dot → date-backed static label / remove
   - unsourced metric/proof → documented source / remove
   - fake chrome → genuine screenshot + caption / asset context
   - card-in-card → one true grouping boundary
   - gradient headline → existing confirmed solid token
   - side stripe + decorative shadow → state/brand proof or remove accent
   - static grid/stripe/glow background → task/world-specific material or plain surface
   - decorative monospace/icon glyph → semantic data/code role or actual icon system
   - generic motion → state-linked transform/opacity with reduced-motion path
7. each replacement entry must name: `when to use`, `preserve`, `do not use when`, semantic/focus guard, responsive acceptance, proof/state requirement, verification command/evidence.

**Acceptance gate**

- waiver valid/invalid matrix covers absent reason, invalid rule, both value/file, broad glob, expired/invalid date, brand gradient allowed exception.
- no waiver can hide a P0, protected-contract violation, or unreviewed global rule.
- every replacement catalog entry links to a registry rule and a fixture/eval case.
- CI documentation has no implicit install/network/deploy behavior.

## File Ownership Map

| File/group | Owns | Must not own |
|---|---|---|
| `SKILL.md` / `SKILL.ko.md` | trigger, core workflow, safety boundary, resource navigation, stop | full rule catalog, long schemas, provider-specific browser procedure |
| `rules/slop-taxonomy.*` | classes, scope, exception/disposition policy | regex matcher details |
| `rules/evidence-and-severity.*` | finding evidence fields and priority | UI remedy how-to |
| `rules/remediation-workflow.*` | audit/clean/verify sequence | test fixture data |
| `rules/validation-and-reporting.*` | verification order and claim limits | waiver JSON schema |
| `rules/waivers-and-baselines.*` | waiver/baseline policy, CI report-only boundary | config mutation automation |
| `rules/rendered-evidence.*` | rendered proof boundary/capability fallback | direct provider APIs |
| `references/anti-pattern-catalog.*` | detailed rule lookup/exception examples | core trigger language |
| `references/context-signals.*` | context collection precedence/unknown state | detection code |
| `references/fix-playbook.*` | individual remediation sequence | broad layout alternatives |
| `references/replacement-patterns.*` | safe semantic/layout alternatives | default product visual direction |
| `references/eval-rubric.*` | human oracle and false-positive review | runnable fixture rows |
| `scripts/rules/registry.cjs` | canonical machine-readable rules | filesystem traversal or CLI |
| `scripts/engines/*.cjs` | one evidence-family scan each | report formatting |
| `scripts/resolve-context.cjs` | read-only explicit context extraction | infer missing brand facts |
| `scripts/detect-slop.cjs` | CLI parse, orchestration, stable JSON/exit behavior | embedded rule content |
| `scripts/*validator*.cjs` | deterministic schemas/self-tests | agent judgment |
| `assets/evals/*.jsonl` | runnable input/expected contracts | explanatory rubric |
| `assets/fixtures/` | minimal reproducible source/evidence cases | production-quality UI examples |
| `assets/report-template.*` | user-facing result format | validation logic |

## Validation and Evaluation Matrix

### Deterministic commands per implementation phase

```bash
# Existing focused structural/bilingual/link/fence gate
node skills/skill-tester/scripts/validate-skills-corpus.mjs \
  --root skills --only ai-design-slop-remover --json

# New detector rule/fixture regression gate (Phase 0 onward)
node skills/ai-design-slop-remover/scripts/run-detector-evals.cjs --json

# Existing detector and report self-tests
node skills/ai-design-slop-remover/scripts/detect-slop.cjs \
  --target skills/ai-design-slop-remover/assets/fixtures/detector-positive.html --json
node skills/ai-design-slop-remover/scripts/validate-report.cjs

# Broader repository contract after focused checks
bun run --cwd scripts verify
```

`scripts/validate-skills.mjs` is **not** the appropriate new-script gate unless project maintainers explicitly add new scripts to its immutable approved inventory. The plan keeps new `*.cjs` scripts in the target skill specifically to avoid accidentally violating that global MJS inventory contract.

### Scenario matrix

| Class | Minimum cases | Oracle |
|---|---:|---|
| Trigger positive | 8 | audit/clean/verify + existing UI intent routes to this skill |
| Trigger negative | 8 | greenfield design, a11y-only, brand-direction, generic QA route away |
| Boundary | 4 | screenshot-only, mandatory three-card compare, explicit brand gradient, mixed KR/EN |
| Rule positive | 1/rule | rule ID, evidence kind, expected location/action |
| Rule false-positive | 1/rule | no removal recommendation; exception/review status is exact |
| Runtime unavailable | 4 | no fabricated rendered/a11y/behavior pass |
| Safety/adversarial | 4 | source prompt injection, fake metric, destructive replacement/deploy, waiver overreach |
| Report | 6 | valid, missing heading, static-only visual conflict, baseline, waiver, invalid final status |
| CLI malformed input | 8 | usage/error JSON + non-zero exit |

### Human review sampling

For every added rule, review at least 5 positive and 5 exception/negative real-world-like samples before making it P1 or `immediateTier`. Capture:

- confirmed relevant / false positive / ambiguous count
- why the exception did or did not apply
- whether remediation would preserve content, semantics, state, and task
- recommended class and default action adjustment

Rules with false-positive rate above 10% in reviewed sample remain `review-only` or are removed from the static detector. No aggregate authorship/taste score is introduced.

## Rollout Gates

| Gate | Enables | Required evidence | Blocks release when |
|---|---|---|---|
| G0 baseline | Registry refactor work | current output golden + all legacy fixtures | current detector behavior changed without intentional schema decision |
| G1 deterministic static | New rule set | positive/negative/context fixtures + focused corpus validator | rule lacks false-positive fixture or changes protected disposition |
| G2 context-aware | Candidate exceptions | brand/pricing/status fixtures and context unknown cases | missing token/brief silently treated as permission to remove |
| G3 report contract | v2 reports | validator self-tests, EN/KO template parity | static-only result claims visual/a11y pass |
| G4 rendered evidence | Browser adapter use | valid/invalid schema fixtures, capability absent trace | renderer unavailable but report says rendered verified |
| G5 waiver/baseline | report-only CI documentation | schema tests, narrow scope examples, review reason | broad/global suppression, auto config mutation, CI blocking by default |
| G6 remedy catalog | clean recommendations | each entry rule+fixture+guard link | layout/copy behavior change suggested without preservation condition |

No gate auto-enables the next one: each is a separate reviewed increment. A blocker is fixed in its owning phase, not by weakening fixtures or validator conditions.

## Bilingual Maintenance Contract

Every materially changed Markdown file under `skills/ai-design-slop-remover` changes its paired `*.ko.md` in the same increment. Parity review checks:

- same headings/resource navigation and mandatory fields
- equivalent modes, permission gates, safety boundaries, verification and stop behavior
- commands, file paths, identifiers, JSON keys, rule IDs unchanged
- Korean output report headings remain those expected by `validate-report.cjs`

`validate-skills-corpus` proves sibling presence and fences; it does not prove semantic equivalence. The implementation PR must include a short manual parity checklist in its verification note.

## Risks and Mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Rule expansion increases false positives | agent deletes intentional brand/data structure | false-positive fixture per rule, candidate exception, default review disposition |
| Regex/CSS parser overclaims semantic correctness | misleading accessibility/visual report | engine/evidenceLimit field, rendered requirement, manual limitation text |
| Core prompt grows with every new rule | poor progressive disclosure and trigger drift | registry/catalog/references split, keep `SKILL.md` under 300 lines target |
| English/Korean divergence | different agent behavior by language | same-increment paired edits, corpus validator, manual semantic parity review |
| Baseline hides regressions indefinitely | new problems become invisible | fingerprinted versioned baseline, only-new report-only, stale mismatch handling |
| Waiver becomes suppression loophole | real design or safety defect gets hidden | no global waiver, reason+source+scope schema, cannot suppress P0/protected contract |
| Browser capability differs by runtime | false claim or provider lock-in | evidence handoff schema first, capability gate, no dependency install |
| External repo imitation causes license/maintenance burden | unowned complex code enters skill | adopt architecture principles only; review license before any copied implementation |

## Implementation Handoff Checklist

Before the first edit:

- [ ] Read `AGENTS.md`, `instructions/skill/SKILL_AUTHORING.md`, current target skill, and this plan.
- [ ] Verify git status and do not overwrite unrelated user work.
- [ ] Run current detector against `detector-positive.html` and save the exact baseline output outside the skill unless it becomes a committed golden fixture by plan.
- [ ] Run current focused corpus validator and record results.
- [ ] Create/extend eval fixture before detector behavior change.

Before each phase completes:

- [ ] Complete the phase acceptance gate.
- [ ] Run focused deterministic commands and read full output.
- [ ] Update English + Korean Markdown together.
- [ ] Add only minimal new files justified in the File Ownership Map.
- [ ] Re-run target scope search for stale rule IDs/old report headings.

Before final delivery:

- [ ] Run focused corpus validator, detector eval runner, detector/report self-tests, and `bun run --cwd scripts verify`.
- [ ] If browser protocol shipped, perform one valid handoff and one unavailable-capability run; do not claim browser QA without observed evidence.
- [ ] Report changed files, command results, unrun checks, known limitations, and deferred non-goals in Korean.

## Open Decisions Requiring Maintainer Choice

The plan intentionally makes these explicit rather than silently deciding them during implementation:

1. **Baseline storage:** use a committed `assets/baselines/` artifact for generic detector fixtures only, or require consumers to maintain their own ignored baseline JSON? Recommendation: committed baseline only for skill-owned fixtures; user projects own their `.ai-slop-remover.json` baseline.
2. **Config filename:** `.ai-slop-remover.json` is proposed. Confirm it does not conflict with an existing repository convention before shipping. Recommendation: use it only for consumer-project examples; do not add a root config in this repository.
3. **Browser handoff:** should Phase 4 ship immediately after static v2, or only after users request rendered audit automation? Recommendation: defer code implementation until static-rule precision is measured; document the capability protocol now.
4. **Initial rule batch:** plan limits it to 10. Recommendation: start with 5 (`repeated-eyebrow`, `numbered-section-label`, `radial-glow`, `grid-background`, `pulse-without-state`) and promote the rest only after fixture/manual sampling evidence.

## Plan Completion Condition

This plan is ready for implementation when a maintainer accepts the four open decisions or adopts the stated recommendations. Implementation itself is complete only after every rollout gate through the chosen scope passes; a rule without a false-positive fixture, paired Korean update, deterministic result, or evidence boundary remains unshipped.
