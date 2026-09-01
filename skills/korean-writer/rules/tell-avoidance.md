# Tell Avoidance

**Purpose**: Catalog the families of Korean AI tells and say what each one costs you. This is the WHY view; `rules/writing-method.md` owns the actual prescriptions under W-IDs. In compose mode the table lists what never to write; in humanize mode it lists what to hunt down in supplied text under `rules/humanize-method.md`.

## Severity in generation mode

Severity here ranks what you do while the sentence is still being written, not how badly a finished sentence reads. The three levels are defined by the cost of obeying them at drafting time:

- **S1, never write it in the first place.** The pattern is a removal candidate at birth. If it appears in your draft, it was a mistake, not a style choice.
- **S2, do not repeat.** One natural occurrence is fine and sometimes unavoidable. Three or more repetitions in the same piece turn the habit into a tell.
- **S3, avoid only when stacked.** Harmless alone. It reads as AI only when it piles up with other tells in the same paragraph.

A row tagged `S1~S2` splits by sub-pattern; a row tagged `S2~S3` splits by density. Both are explained in the row itself.

Two consequences follow from reading severity this way. First, S1 costs nothing to obey, because avoiding a pattern you never typed is free, while deleting it later forces a rewrite of the sentence around it. Second, S2 is a budget rather than a ban: policing single occurrences produces stiff, over-corrected prose, which is its own tell.

In humanize mode severity works the other way around: S1 items found in supplied text are removed outright, S2 items are thinned by repetition count, and S3 items are touched only when they stack with other tells. `rules/humanize-method.md` owns that ordering.

## The families

| 카테고리 | 대표 패턴 | 왜 AI처럼 읽히는가 | 생성 시점 처방 | 심각도 |
|---|---|---|---|---|
| A 번역투 | `~를 통해`, `~에 대해`, `~에 있어서`, `~와 관련하여`, `~에 기반하여/바탕으로`, `~에 의해`, double passive `~되어진다`, honorific passive `합의가 이루어졌다`, `가지고 있다`, `~할 수 있다` repeated, `~을 위해` repeated, progressive `~되고 있다` repeated, compulsive `그/그녀`, `했다. 그리고 했다` sentence-chaining, abstract subject with ornate object, three nested 관형절, doubled particles `-에서의`/`-으로의`/`-에로의` | English and Japanese syntax wearing Korean clothes. No Korean speaker builds a sentence this way unless translating one. | Write the verb first. `~를 통해` becomes `~로` or a connecting verb; `~에 대해` and `~과 관련하여` become a direct object or noun; `~에 있어서` becomes `~에서`; `~에 기반하여` becomes `~로` or `~을 보고`; `~에 의해` promotes the actor to subject; passives stay single; `가지고 있다` becomes `있다`; modals and purpose frames are not repeated across sentences; drop pronouns Korean would drop. | S1 |
| B 어휘 습관 | Parenthetical glosses on every term, English left untranslated where a settled Korean word exists, redundant `-들`, repeated `그것은`/`이것은`, `해당`/`본`/`당` on every noun, formal Sino-Korean verbs (`진행하다`, `실시하다`, `수행하다`) where a plain verb fits | A model reaching for source-language vocabulary and officialese instead of committing to one living voice. | Gloss a term once, at first use, only when the Korean is genuinely ambiguous. Translate anything that has a normal Korean equivalent. Drop `-들`, pronouns, and 지시관형사 that the context already carries. Keep the plain verb when the register allows it. | S2 |
| C 구조적 AI 패턴 | Mechanical `첫째/둘째/셋째`, three-beat parallel lists, bullet, heading and emoji overload, a comma after every 연결어미, comma-joined independent sentences, list-introducing colons (`다음과 같습니다:`) | Answer-shaped scaffolding imposed on prose that nobody asked to be an outline. | Default to paragraphs. Enumerate only when the genre asks for it, and vary list lengths. Let 연결어미 carry the clause without a comma propping it up. End the lead-in sentence with a period. | S1~S2 |
| D AI 특유 관용구 | `결론적으로`, `시사하는 바가 크다`, `주목할 만하다`, `혁신적인`, closing formulas `지금이야말로`, `~할 때다`, `~라는 뜻이다`, `~인 셈이다`, theatrical hooks `질문을 던진다`, causal shorthand `~로 이어진다` | Stock filler that asserts significance the sentence never earned. Instantly recognizable across thousands of generated texts. | Delete the phrase and state the finding. If the point matters, the specific fact shows it; if there is no fact, there is no point. | S1 |
| E 리듬 균일성 | Sentences of near-identical length, four or more identical `C/O/P` shapes with no meaning-bearing parallelism, every paragraph the same shape and sentence count, uniform `~이다/~한다` or uniform `-습니다` cadence with no breath inside the settled register | Human writing breathes unevenly. A repeated mold becomes a tell when it carries no deliberate enumeration, parallel structure, or step sequence. | Mix lengths by content. When the shape count raises, keep meaningful parallelism and vary only an unmotivated mold. Fix the register before the first sentence and hold it; vary endings inside the register, never across registers. | S2 |
| F 수식·중복 | `매우`/`정말` stacked on adjectives, paired synonyms doing one job, `~적`/`~성`/`~화` sprayed across nouns, redundant modifier implied by the head noun | Intensity substituted for evidence, plus Sino-Korean nominalization that pads without adding meaning. | Cut the intensifier and let the noun carry weight. Keep one of any synonym pair. Unfold `~적/~성/~화` into a verb or plain noun. | S2 |
| G Hedging 남용 | Stacked softeners such as `~할 수 있을 것으로 보인다`, both-sides balancing (`양쪽 모두 일리가 있다` with no decision) | Multiple hedges on one claim read as a model insuring itself rather than a writer judging. | One hedge per claim, at most. If the uncertainty is real, name what is uncertain and why. A genuine open question is fine; a reflexive balance formula is not. | S2 |
| H 접속사 남발 | `또한`, `따라서`, `즉`, `나아가` opening consecutive sentences, repeated `하지만`/`그러나`, `즉` restating a clear sentence | Connectives narrating logic the sentences already carry, sentence after sentence. | Let sequence do the work. Open with a connective only where the turn would otherwise be missed, never twice in a row. | S2 |
| I 형식명사 과다 | `것이다`, `점`, `수`, `바`, `~할 필요가 있다`, attribution formulas `~는 분석이다`/`~는 뜻이다`, universal `필요하다`, `능력` on every noun | Empty nouns inflate a plain predicate into a bureaucratic one. Dense clusters read as generated hedging. | Say the predicate directly. `~할 필요가 있다` becomes `~해야 한다`; drop `것이다` unless it carries real emphasis. Attribute claims to a named source or drop the attribution. | S2 |
| J 시각 장식 남용 | Bold runs, quotation marks used for emphasis, dashes `—` as paragraph-level inserts, emoji, list-introducing colons, decorative horizontal rules | Decoration replaces emphasis that structure and word choice should have delivered. | Earn emphasis with sentence position and word choice. In prose genres, spend decoration sparingly; in document genres, follow that skill's formatting contract instead. | S2~S3 |

Each row is a family, not a single pattern. `references/ai-tell-catalog.md` holds the individual patterns behind each letter, with a Korean example pair and a fix for every one; read it when a draft or a repair needs detail this table compresses away.

## How the families stack

The families are not independent, and the stacking is what makes a paragraph read as generated rather than merely stiff.

- A and I feed each other. Translationese pulls in empty nouns, so a sentence carrying `~를 통해` usually carries `것이다` a few words later. Fixing the syntax often clears both.
- D and F travel together. A phrase like `시사하는 바가 크다` almost always arrives with an intensifier, because both exist to assert importance without evidence.
- C and E compound. Mechanical enumeration forces parallel sentence shapes, which flattens rhythm; the fix for one usually loosens the other.
- J is the amplifier. Alone it is a formatting preference. Layered on C's bullet scaffolding or D's stock phrases, it converts a merely stiff passage into an obviously generated one, which is exactly why it sits at S2~S3.

When a draft feels wrong but no single sentence looks broken, look for a stack rather than a violation.

## Detection-only, not generation rules

Quantitative detection scoring over finished text is out of scope for this skill, and the exclusion is a decision rather than an omission. Z-scores over sentence-length distributions, comma ratios, lexical diversity indices, change-rate gates, and graded quality scores all belong to measuring; this skill writes and repairs by judgment.

Those metrics observe a finished text's distribution, so they can only be computed after the writing is done. A metric that needs the whole document as input cannot instruct the act of writing the next sentence. The drafting-time equivalents live in `rules/writing-method.md` as qualitative rules, the self-check in `rules/validation.md` applies them by eye rather than by score, and the humanize guard in `rules/humanize-method.md` bounds the repair by anchors and over-correction signals rather than by percentages.

## How to use this file

Read the table for the reasoning; apply the W-IDs in `rules/writing-method.md` for the actual moves. Genre exceptions, especially for C and J, are settled in `rules/genre-calibration.md`. When a prescription here and a W-rule appear to disagree, the W-rule wins.
