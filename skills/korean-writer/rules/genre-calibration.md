# Genre Calibration

**Purpose**: Fix bullets, register, and ornament per genre so one house voice is not applied to every Korean deliverable.

Genre is settled in workflow step 1, before drafting. When the request names no genre and none follows from the artifact, ask once and keep writing under the answer. When the question goes unanswered, default to 칼럼 and say so in a single clause.

This file decides what a genre allows. It does not restate the avoidance prescriptions: those live in `rules/writing-method.md` (W-rules) and `rules/tell-avoidance.md` (A~J categories, S1/S2/S3), and are referenced here by name only.

## 1. Genre table

| 장르 | 허용·권장(장식 허용치는 500자 기준) | 금지·주의 | 문체 기준 |
| --- | --- | --- | --- |
| 칼럼·에세이 | 한다체 또는 짧은 합니다체, 문장 길이 변주를 적극적으로 살림, 비유 허용. 장식: 불릿 0개, 볼드 0개, 강조용 따옴표 쌍 1개, 대시 1개, 이모지 0개 `(출처: fixed)` | 형식명사 과다, 관용구 | 한다체 권장 |
| 보고서·리포트 | 합니다체, 수치·근거 문장 우선. 장식: 불릿 목록 2개(각 5항목 이하), 볼드 3개, 강조용 따옴표 쌍 2개, 대시 2개, 이모지 0개 `(출처: fixed)` | hedging 남용, "~할 필요가 있다" 반복 | 합니다체 |
| 기술문서 | 한다체, 용어 일관성, 명령문 허용. 장식: 불릿 목록 3개(각 7항목 이하), 볼드 5개, 강조용 따옴표 쌍 2개, 대시 2개, 이모지 0개 `(출처: fixed)` | 마케팅 관용구 유입, 볼드로 문장 전체 강조 | 한다체 |
| 마케팅 카피 | 짧은 문장, 감탄문은 5문장당 1개까지. 장식: 불릿 목록 1개(3항목 이하), 볼드 3개, 강조용 따옴표 쌍 2개, 대시 2개, 이모지 2개 `(출처: fixed)` | hype 어휘(혁신적/획기적/압도적) 기본 금지, 과장 병기 | 합니다체 또는 해요체(대상 독자 따름) |
| 이메일·메신저 | 존칭 일관, 문단 짧게. 장식: 불릿 0개, 볼드 0개, 강조용 따옴표 쌍 0개, 대시 0개, 이모지 1개 `(출처: fixed)` | 장식으로 요점을 대신하기, 대시·볼드 강조 | 합니다체/해요체(상황 따름) |

**Humanize mode reads a different row rule.** When repairing supplied text, the text's own register is the row: a 해요체 piece stays 해요체 even if the settled genre's row says 한다체, and a 한다체 report stays 한다체 even if the row says 합니다체. The genre row still governs decoration ceilings in the same way it does for a draft, because decoration allowances are properties of the deliverable, not of the writer's voice. `rules/humanize-method.md` owns this ordering.

Read the row for the settled genre, not the whole table. Counts are per 500 Korean characters of body text, spaces excluded. Multiply the row's numbers by the draft's 500자 blocks, rounded down, with a floor of one block: a 1,200자 draft gets the row numbers times two, and anything under 500자 gets the row numbers as written. One bullet 목록 means one run of consecutive bullet lines, counted as a single list, and the per-list item cap applies to the lines inside it. A genre allowance is a ceiling, not a quota: 마케팅 카피 permits two emoji, so a piece with none is still correct.

These counts are this skill's own calibration, tagged `fixed` in the sense `rules/validation.md` defines. They are drafting-time ceilings a writer checks against a draft, not detection scores computed over finished text.

Mixed deliverables take the genre of the section being written. A 기술문서 with a promotional intro switches rows at the section boundary; the intro follows 마케팅 카피 and the body returns to 기술문서.

Genre columns override each other only inside one row. 기술문서 forbidding marketing idiom does not make those idioms acceptable elsewhere, and 마케팅 카피 permitting exclamation does not loosen 보고서·리포트.

## 2. Decoration budget boundary

Visual decoration (category J: bold, emphasis-quotation pairs, dashes, emoji) is budgeted by this skill only in prose genres, where the writer owns the page. The table above holds the per-genre counts, and `rules/writing-method.md` governs how the allowance is spent.

When the deliverable is a structured document owned by another skill, that skill's formatting contract wins and this skill's decoration budget yields:

- `docs-maker` owns document structure, so its section, table, and emphasis conventions govern the document shape.
- `readme-maker` owns README shape, so its badge, heading, and code-block conventions govern the file.
- A DESIGN.md or similar contract document follows the contract's own format rules.

Yielding is scoped to format. Sentence-level work stays with this skill: inside a docs-maker section or a readme-maker block, the Korean sentences still follow the settled genre's register and the avoidance rules. Report the yield in one clause when the contract and the genre row disagree, then follow the contract.

## 3. Conflict resolution

Apply in order and stop at the first rule that resolves the case.

1. **User's explicit request wins.** A stated register, bullet preference, or ornament instruction overrides the genre row, including when it contradicts the default. Follow it and do not argue the row back in.
2. **Genre table wins over habit.** With no explicit user instruction, the row for the settled genre decides register, structure, and ornament. Do not carry a previous draft's voice into a new genre.
3. **Default to 칼럼 when the genre is unresolved.** When the single question goes unanswered, write under 칼럼·에세이, state the assumption in one clause, and switch without argument if the user corrects it.
