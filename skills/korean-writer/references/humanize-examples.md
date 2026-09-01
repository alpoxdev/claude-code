# Humanize Worked Examples

Load this when running humanize mode: it shows the repair procedure in `rules/humanize-method.md` producing a good outcome and the failure modes it guards against, on real before/after material. Compose mode does not need this file.

## Example 1 — Register preservation (casual text)

The input is a casual, living voice. The correct repair touches almost nothing, because almost nothing is a tell.

**Input (supplied):**

> 어제 발표 보셨어요? 진짜 놀랐는데요. 그 회사가 신제품을 내놨는데 가격이 생각보다 훨씬 쌌거든요. 그게 얼마나 파격적이냐면 — 경쟁사 절반 수준이었어요. 이러다 시장 판도가 바뀌는 거 아닌가 싶네요.

**Good repair** (what this skill produces):

> 어제 발표 보셨어요? 진짜 놀랐는데요. 그 회사가 신제품을 내놨는데 가격이 생각보다 훨씬 쌌거든요. 그게 얼마나 파격적이냐면, 경쟁사 절반 수준이었어요. 이러다 시장 판도가 바뀌는 거 아닌가 싶네요.

Only the em dash after `파격적이냐면` changed, to a comma, because a dash before a numeral does no rhetorical work here. The contractions (`내놨는데`, `쌌거든요`), the direct question, the ending variety (`-는데요`, `-거든요`, `-네요`), and the casual speculation all survive. This is a pass, not a skipped job.

**Failure modes this example teaches:**

- **Register escalation.** `어제 발표를 보셨습니까. 매우 놀라운 결과였습니다.` The rewrite turned a question into a statement, flattened the endings to 합쇼체, and injected `매우 놀라운` — a cliché the input never had. Diagnosis: the input had no S1 tells; nothing was there to repair.
- **Colloquial erasure.** `이러한 흐름은 시장 판도의 변화에 중요한 역할을 할 것으로 주목받았다.` The personal speculation (`~아닌가 싶네요`) is voice. Replacing it with an attributed, formal verdict destroys the writer, not the tell.
- The em dash `—` in this input is a **living dash**: the writer chose it for a dramatic pause before the reveal. W-19 bans drafting new default dashes; it does not license scrubbing a dash the author used deliberately.

## Example 2 — Structure preservation (academic text)

The input is formal academic prose with a numbered hierarchy, statistics, and footnote anchors. The tells are thin; the anchors are dense.

**Input (supplied):**

> Ⅱ. 플랫폼 노동과 고용보험의 사각지대
>
> 1. 문제의 소재
>
> (1) 적용 대상의 획정
>
> 통계청 집계에 따르면 2024년 국내 플랫폼 종사자는 88만 3천 명으로, 전년 대비 11.1% 증가하였다.1)
>
> 플랫폼 종사자의 고용보험 실질 가입률은 36.5%에 그친다.

**Good repair:** headings `Ⅱ.`, `1.`, `(1)` remain their own lines with their numbering untouched; `88만 3천 명`, `11.1%`, `36.5%`, and the footnote marker `1)` stay exactly where they are; the sentence `플랫폼 종사자의 고용보험 실질 가입률은 36.5%에 그친다` reads slightly stiff, and in 학술 genre that stiffness is the genre's own voice — it stays.

**Failure modes this example teaches:**

- **Heading absorption.** `플랫폼 노동과 고용보험의 사각지대라는 문제의 소재를 살펴보면…` merges two heading levels into one sentence. The hierarchy (`Ⅱ.` → `1.` → `(1)`) is an anchor; restoring it means re-emitting the heading lines verbatim.
- **Footnote corruption.** Moving a sentence without its `1)` marker, or renumbering `1) 2) 3)` after deletion, breaks the citation chain. Footnote count, numbering, and attachment points are anchors.
- **Quote alteration.** Rephrasing inside a quoted source (`'…36.5%에 불과하다'고 보고하였다` when the source text says `그친다`) is a content lie, not a style fix. A quotation is a quotation even when it is one word.

## Example 3 — Family-driven repair (blog prose)

The input carries a stack: translationese frame (A), a stock closer (D), and rhythm uniformity (E). Diagnosis picks the dominant families instead of hunting every span.

**Input (supplied):**

> 디지털 전환에 있어서 기업들이 직면한 도전은 매우 다양합니다. 본 보고서는 디지털 전환의 핵심 요소에 대해 분석하고, 효과적인 전략을 제시하기 위해 작성되어졌습니다. 이러한 변화는 기업에게 새로운 기회를 가져올 것입니다. 결론적으로, 이는 모든 기업이 진지하게 고민해야 할 주제입니다.

**Diagnosis (one line each, as the repair log records it):**

- A 번역투: `~에 있어서`, `~에 대해`, `작성되어졌습니다` — W-01, W-02.
- D 관용구: `결론적으로`, `이는 ~할 주제입니다` — W-13.
- E 리듬: four sentences of near-identical length — W-10.

**Repaired text:**

> 디지털 전환에서 기업들이 마주한 도전은 다양합니다. 이 보고서는 디지털 전환의 핵심 요소를 분석하고 효과적인 전략을 제시하려고 작성했습니다. 이런 변화 속에서 새 기회가 열립니다. 모든 기업이 진지하게 고민해야 할 주제입니다.

Anchors verified: no numbers or names existed; meaning, scope, and the 합니다체 register are unchanged. The last sentence drops the closer and asserts the topic directly; the third sentence makes the abstract subject concrete. Four sentences remain, but their lengths now differ, and the shape run no longer repeats one mold.

**Delivery note (what the user sees):** `번역투 프레임(~에 있어서, ~에 대해, 작성되어졌습니다)과 결말 공식(결론적으로)을 정리하고 문장 길이를 실었습니다.`

## How to read these examples

The good outcomes share one shape: the smallest set of edits that removes diagnosed tells while every anchor and every voice marker survives. The bad outcomes are never over-ambitious rewrites that read badly — they are confident rewrites that read smoothly and lost the writer. That asymmetry is why `rules/humanize-method.md` treats fidelity failures as the primary risk and wording quality as the secondary one.
