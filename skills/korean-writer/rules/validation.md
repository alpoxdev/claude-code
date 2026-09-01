# Validation and Self-Check

**Purpose**: Confirm the draft you just wrote, or the text you just repaired, is clean before delivery, using only what a model can count or see. No scripts, no scores. The steps below run in compose mode on a new draft. In humanize mode the shortened protocol in section 2 runs instead: the S1 scan and connective count of steps 1 and 2 on the repaired text, then the anchor re-verification and the over-correction guard from `rules/humanize-method.md`, with steps 3 to 6 skipped because the supplied text's rhythm, shape runs, and decoration are the author's rather than targets to rewrite.

Every threshold below carries an inline `(출처: ...)` tag naming what kind of threshold it is. `fixed` marks a count this package pins from drafting practice, so the check is a comparison against a number. `judgment` marks a call made by eye, where no number would survive contact with a real draft. Steps carrying no tag are not thresholds.

## 1. Draft self-check protocol

Run these in order on the draft you just produced. Steps 1 to 6 are checks; 7 and 8 govern when to stop.

1. **S1 scan.** Reread the draft for the never-write items: 번역투 구문 and the AI 관용구 목록 in [`writing-method.md`](writing-method.md). Every hit is removed, not softened. This step has no threshold, because one occurrence is one too many.

2. **문두 접속사 count.** Count sentences opening with 또한, 따라서, 즉, or 나아가. Two or more in consecutive sentences fails `(출처: fixed)`. Fix by merging the two sentences or deleting the connective; the logic usually survives without it.

3. **Sentence-shape run count.** Walk the sentences in order and write one `C/O/P` unit for each. `C` is the number of clauses: count each main, connective, adnominal, or quoted clause once, but count a predicate with auxiliaries such as `-고 있다` as one clause. `O` is `O` when the main clause has an explicit object marked `을/를`, otherwise `-`. `P` is the final predicate class after ignoring tense, honorifics, and the register-bound terminal ending: `V` for an action verb, `A` for a state or descriptive predicate, or `C` for the copula `이다`. Four or more consecutive identical units raises the check `(출처: fixed)`; it does not by itself fail the draft. Worked example: `회의는 오전 열 시에 시작합니다. 먼저 지난주 실적을 확…

**Meaning-bearing parallelism test:** when the trigger raises, ask whether the repeated shape itself carries the meaning—a deliberate enumeration, parallel structure, or step sequence whose parallelism is the content; if yes, pass and move on, but if the sentences merely land in one mold for no rhetorical reason, vary them `(출처: judgment)`.

- PASS: `검색창은 이름과 지역을 함께 받습니다. 결과 화면은 가까운 순서로 매장을 보여 줍니다. 필터는 영업 상태와 편의 시설을 구분합니다. 지도는 각 매장의 위치를 표시합니다. 저장 목록은 관심 매장을 한곳에 모읍니다.` is `1/O/V × 5`; the five parallel feature statements carry the enumeration, so keep them.
- FAIL: `서버를 확인합니다. 서버를 점검합니다. 서버를 살핍니다. 서버를 확인합니다.` is `1/O/V × 4`; the shape adds no rhetorical work to the repeated claim, so vary or cut it.

Classify the three edge constructions this way so the count has one answer: `-(으)ㄹ 수 있다` is one modal predicate and takes the lexical predicate's class, because `수 있다` expresses possibility rather than adding an adnominal clause (`배포할 수 있습니다` = `1/-/V`); lexical `있다/없다` takes `A`, because existence or absence is a state (`자료가 있습니다` and `오류가 없습니다` = `1/-/A` each); result-state `되다`, including `-어 있다`, takes `A`, because it describes an attained condition rather than a transition (`준비가 되어 있습니다` = `1/-/A`; eventive `설정이 변경되었습니다` remains `1/-/V`).

This unit measures author-controlled construction instead of register-bound morphology. It catches the common identical-mold run, not every repetitive paragraph; step 4's rhythm eyeball covers repetitions that superficial tuple variation lets through. Terminal endings encode the required 합니다체, 한다체, or 해요체 and therefore cannot reliably signal monotony.

4. **Rhythm eyeball.** Look at the paragraph as a shape. A clean draft visibly mixes short sentences with long ones; if every sentence lands at the same length, fix it `(출처: judgment)`. Cut or combine where the content allows, and leave it alone where it does not.

5. **형식명사 density eyeball.** Scan each paragraph for 것이다, 점, 수, and 바 piling up. When they stack inside one paragraph, rewrite that paragraph `(출처: judgment)` so the nouns carry meaning instead of padding.

6. **Decoration count.** Count five things in the draft: bullet lists, bold spans, emphasis-quotation pairs, dashes, and emoji. Read the settled genre's row in [`genre-calibration.md`](genre-calibration.md), which states each of those five as a number per 500자, and scale that row by the draft's length as the table's scaling sentence directs. Compare count against allowance one element at a time; every element over its allowance gets cut until the count is at or under the number `(출처: fixed)`. That file owns the numbers; this one names the comparison and does not restate them.

7. **"Already good" exit.** When all six checks pass and nothing needs an edit, deliver as is `(출처: judgment)`. Do not manufacture changes to look diligent. An untouched clean draft is a pass, not a skipped step.

8. **Recheck limit.** At most three fix-and-rescan passes `(출처: fixed)`. If something still fails on the third pass, deliver the draft and state the remaining issue in one line rather than churning the wording further.

## 2. Repaired-text self-check (humanize mode)

After the repair pass in `rules/humanize-method.md` finishes, run this shortened protocol on the repaired text itself:

1. **S1 scan and connective count** as in steps 1 and 2 above, because a repair must not leave a tell it charged itself with removing.
2. **Anchor re-verification.** Walk the anchor list recorded before editing and confirm every anchor survived: numbers, names, quotations, headings, footnotes, list shapes, and the register.
3. **Over-correction guard.** Check the five failure modes in `rules/humanize-method.md` — register escalation, cliché injection, colloquial erasure, structural corruption, new tells — on every repaired passage.
4. **Recheck limit.** The same three-round ceiling `(출처: fixed)` applies to repair rounds; deliver with a one-line note when it is reached.

Steps 3 to 6 of the compose protocol do not run as targets to rewrite: the supplied text's rhythm, shape runs, and decoration are the author's, and only diagnosed families and S1 items touch them.

## 3. Self-application audit

This skill's own Korean bodies obey its own S1 rules. Prose that preaches 번역투 avoidance while using 번역투 is not credible.

```bash
rg -n "를 통해|에 있어서|되어진다|시사하는 바|결론적으로" skills/korean-writer/SKILL.ko.md skills/korean-writer/rules/genre-calibration.ko.md skills/korean-writer/rules/validation.ko.md skills/korean-writer/rules/humanize-method.ko.md
```

Expect zero hits. Any hit is rewritten to follow the rule it violates. The Korean mirror of this audit wraps the first character of each search pattern in a character class, because `validation.ko.md` is itself an audited path and a plain pattern inside its own code block would trip on itself; the plain patterns here are safe because this English file is not in the audited path list.

**Exception**: `rules/writing-method.ko.md`, `rules/tell-avoidance.ko.md`, and `references/ai-tell-catalog.ko.md` are exempt. All three quote the forbidden patterns by design, since listing 번역투 examples requires writing them, so they are excluded from this audit rather than being made to pass it.

## 4. Package verification commands

Any change to this skill's files runs all three, in order. All must exit 0.

```bash
node skills/skill-tester/scripts/validate-skills-corpus.mjs --root skills --only korean-writer --json
node skills/skill-tester/scripts/validate-skill.mjs skills/korean-writer
bun run --cwd scripts verify
```

## Exit criteria

- [ ] The S1 scan found no 번역투 구문 or AI 관용구, or every hit was removed.
- [ ] No two consecutive sentences open with 또한, 따라서, 즉, or 나아가.
- [ ] Every run of four or more identical `C/O/P` units passed the meaning-bearing parallelism test, or was varied.
- [ ] Sentence lengths visibly vary, and 형식명사 do not pile up in any paragraph.
- [ ] Each of bullet lists, bold, emphasis-quotation pairs, dashes, and emoji was counted and lands at or under the number in the genre row of `genre-calibration.md`.
- [ ] The draft was delivered clean, or after at most three rescan passes with the remainder stated.
- [ ] In humanize mode: anchors re-verified, the over-correction guard passed, and the delivery carries the change summary.
- [ ] Package changes keep the self-application audit at zero hits and all three commands at exit 0.
