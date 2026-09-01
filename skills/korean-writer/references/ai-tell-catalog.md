# Korean AI-Tell Catalog

Load this on demand, not on every request: it is the deep-reference layer behind the compact family table in `rules/tell-avoidance.md`, and a normal drafting turn never needs it.

Reach for it when a draft feels machine-written but no W-rule names the problem, when a humanize diagnosis needs the candidate pool to diagnose against, when a reviewer asks why a construction was avoided, or when a new pattern needs a home in the right family. Each entry carries a catalog ID (`C-` + family letter + index), the Korean pattern itself, one bad-to-good pair, the reason it reads as generated, and the move to make. Catalog IDs index knowledge; `rules/writing-method.md` W-IDs index the prescriptions you actually apply. Where the two seem to disagree, the W-rule wins.

## A 번역투

- **C-A1 `~를 통해` as an all-purpose instrument marker.** Korean marks instruments with `~로` or folds them into a verb; the noun-phrase detour is English `through`/`via` wearing a 조사.
  - Bad: 인터뷰를 통해 원인을 파악했다. → Good: 인터뷰로 원인을 파악했다. **Fix:** Write the instrument as `~로`, or let a connecting verb carry it (`인터뷰해서 파악했다`). W-01.
- **C-A2 `~에 있어서` as a topic frame.** A Japanese-style topical frame that Korean expresses with a bare `~에서` or `~은/는`.
  - Bad: 협업에 있어서 신뢰가 중요하다. → Good: 협업에서는 신뢰가 중요하다. **Fix:** Set the topic with the particle and drop the frame entirely. W-01.
- **C-A3 Double passive `~되어진다`, `~보여진다`.** One passive suffix already does the work; stacking a second is a grammatical error that survives only because it sounds cautious.
  - Bad: 매출이 개선되어진다. → Good: 매출이 개선된다. **Fix:** Use one passive layer, and prefer the active voice when an actor exists. W-02.
- **C-A4 `가지고 있다` for plain possession or attribute.** A literal rendering of `have`; Korean states attributes with `있다` or an adjective.
  - Bad: 이 서비스는 세 가지 강점을 가지고 있다. → Good: 이 서비스의 강점은 셋이다. **Fix:** Say what the thing *is* rather than what it *has*. W-02.
- **C-A5 Compulsive `그`/`그녀`.** Korean drops a known subject or repeats the name; pronoun-every-sentence is anaphora imported from English.
  - Bad: 담당자가 보고서를 냈다. 그는 회의도 열었다. → Good: 담당자가 보고서를 내고 회의도 열었다. **Fix:** Drop the subject when context holds it, or join the clauses. W-14, W-22.
- **C-A6 Doubled particles `-에서의`, `-으로의`.** Two case markers fused to compress a relative clause the sentence never wrote out.
  - Bad: 현장에서의 검증이 남았다. → Good: 현장에서 검증하는 일이 남았다. **Fix:** Unfold the particle stack back into a verb. W-16.
- **C-A7 `~에 대해` as a reflex object marker.** English `about/on` turned into a Korean frame even where the direct object marker `을/를` is what the verb actually takes.
  - Bad: 이 보고서는 인공지능의 미래에 대해 분석한다. → Good: 이 보고서는 인공지능의 미래를 분석한다. **Fix:** Mark the object directly; opinion verbs (`생각하다`, `토론하다`) may keep `~에 대해`. W-01.
- **C-A8 `~와 관련하여` as formal surplus.** A bureaucratic frame doing the work of a direct noun or verb.
  - Bad: 기후 변화와 관련하여 발표가 진행됐다. → Good: 기후 변화를 다루는 발표가 진행됐다. **Fix:** Write the noun or verb that names the actual relation. W-25.
- **C-A9 `~에 기반하여`/`~에 바탕으로` as filler framing.** Repeated basis-framing that a plain `~로`, `~을 보고`, or `~을 토대로` carries with fewer syllables.
  - Bad: 사용자 데이터에 기반하여 우선순위를 정했다. → Good: 사용자 데이터를 보고 우선순위를 정했다. **Fix:** Fold the basis into the case marker or the verb. W-25.
- **C-A10 `~에 의해` as an English passive.** Korean prefers the actor as subject; `~에 의해` is the by-phrase left where the actor should stand.
  - Bad: 운영팀에 의해 반영되었습니다. → Good: 운영팀이 반영했습니다. **Fix:** Promote the actor to subject; use `~로` only when the actor is genuinely an instrument. W-25.
- **C-A11 Repeated `~할 수 있다` across sentences.** A modal stamped on every sentence turns assertions into a permission manual; Korean asserts facts in the present tense.
  - Bad: 이 도구는 배포를 자동화할 수 있다. 시간을 아낄 수 있고 실수도 줄일 수 있다. → Good: 이 도구는 배포를 자동화한다. 시간이 줄고 실수도 덜한다. **Fix:** Keep the modal only for genuine possibility, ability, or permission. W-26.
- **C-A12 Repeated `~을 위해` purpose clauses.** A purpose frame on every clause reads as a translated requirements list.
  - Bad: 비용 절감을 위해 도입했고, 품질 확보를 위해 검증을 강화했다. → Good: 비용을 아끼려고 도입했고, 품질을 지키려고 검증을 강화했다. **Fix:** Diversify into `~려고`/`~고자`, or fold the purpose into the verb. W-26.
- **C-A13 Honorific passive `합의가 이루어졌다`-type formations.** A formal passive invented because the Korean verb felt bare: `이루어지다`, `수행되다`, `시행되다` where the plain verb has an actor.
  - Bad: 합의가 이루어졌다. → Good: 두 회사가 합의했다. **Fix:** Name the actor and use the plain verb. W-02, W-25.
- **C-A14 Sentence chaining with `그리고`.** `했다. 그리고 했다.` joins two full sentences with a connective where Korean would fold them into one predicate chain.
  - Bad: 그는 보고했다. 그리고 자리에 앉았다. → Good: 그가 보고하고 자리에 앉았다. **Fix:** Fold the second predicate into `-고` or drop the connection the sequence already carries. W-05.
- **C-A15 Abstract subject with an ornate object.** `이 트렌드는 새로운 기회를 가져온다`-style pairing of an abstract subject with a made-up object the sentence never earned.
  - Bad: 이러한 트렌드는 새로운 기회를 가져온다. → Good: 이런 흐름에서 새 기회가 열린다. **Fix:** Make the event or actor concrete. W-03.
- **C-A16 Repeated progressive `~되고 있다`.** The `-고 있다` aspect stamped on consecutive predicates pads the rhythm and reports change as ongoing weather.
  - Bad: 경쟁은 심화되고 있다. 어려움은 커지고 있다. → Good: 경쟁이 심해지고 어려움도 커진다. **Fix:** Drop the progressive where plain present works; vary one verb into a noun+verb split. W-10, W-26.

## B 영어 인용·용어 과다

- **C-B1 Parenthetical gloss on every term.** Glossing settled vocabulary signals a writer hedging between two languages instead of choosing one.
  - Bad: 확장성(scalability)과 안정성(stability)을 확보(secure)했다. → Good: 확장성과 안정성을 확보했다. **Fix:** Gloss once, at first use, and only where the Korean is genuinely ambiguous. W-12.
- **C-B2 Untranslated English where a settled Korean word exists.** Loanwords in place of ordinary vocabulary read as source-language residue, not as jargon.
  - Bad: 이번 릴리즈의 밸류는 유저 익스피리언스 임프루브먼트입니다. → Good: 이번 배포의 핵심은 사용자 경험 개선입니다. **Fix:** Keep the loanword only when the field actually uses it (API, 커밋, 배포 파이프라인). W-12.
- **C-B3 English acronym never expanded.** An acronym dropped without its first-use expansion assumes a reader the piece never identified.
  - Bad: SLO 위반이 두 번 있었다. → Good: 서비스 수준 목표(SLO)를 두 번 어겼다. **Fix:** Expand once, then use the short form freely. W-12.
- **C-B4 Loanword and Korean synonym in one sentence.** Naming one referent twice in two languages doubles the length and adds nothing.
  - Bad: 유저(사용자)의 피드백(의견)을 모았다. → Good: 사용자 의견을 모았다. **Fix:** Pick the term your reader already uses and stay with it. W-12.
- **C-B5 Redundant `-들` after quantified or context-marked plurals.** The quantifier or context already marks the plural, so the suffix doubles it. Not a blanket ban: keep `-들` for emphasis, contrast, or generalization.
  - Bad: 많은 사용자들이 세 가지 기능들을 요청했다. → Good: 많은 사용자가 세 가지 기능을 요청했다. **Fix:** Drop the suffix the quantifier makes redundant. W-20.
- **C-B6 Repeated `그것은`/`이것은` and `해당`/`본`/`당`.** Pronouns and 지시관형사 where the antecedent is obvious; officialese demonstratives where `이/그`, the bare noun, or nothing carries the reference.
  - Bad: 이 프로젝트는 성공했다. 그것은 팀원들의 노력 덕분이다. 해당 방식은 유지된다. → Good: 이 프로젝트는 팀원들의 노력 덕분에 성공했다. 이 방식은 유지된다. **Fix:** Omit the obvious pronoun; replace the formal demonstrative. W-21.
- **C-B7 Formal Sino-Korean verbs where a plain verb fits.** `진행하다`, `실시하다`, `수행하다` dress an ordinary action in officialese the register never asked for.
  - Bad: 우리는 파일럿을 진행하고 설문을 실시했습니다. → Good: 파일럿을 돌리고 설문을 거쳤습니다. **Fix:** Keep the plain verb when the settled register accepts it. W-24.

## C 구조적 AI 패턴

- **C-C1 Mechanical `첫째/둘째/셋째` in running prose.** Ordinal scaffolding turns an essay into an answer sheet; the sequence is rarely load-bearing.
  - Bad: 첫째, 속도가 빠르다. 둘째, 설치가 쉽다. → Good: 속도가 빠르고 설치도 간단하다. **Fix:** Enumerate only when the count itself matters to the reader. W-08.
- **C-C2 Bullet list where a paragraph belongs.** Bullets strip the connective tissue between claims, so the reasoning disappears and only labels remain.
  - Bad: 세 줄짜리 불릿으로 나눈 원인 분석. → Good: 원인을 한 문단으로 이어 쓰고 인과를 문장으로 밝힌다. **Fix:** Default to paragraphs in prose genres; `rules/genre-calibration.md` says where lists are allowed. W-11.
- **C-C3 Heading on every short block.** Headings every few sentences fragment an argument that was meant to build.
  - Bad: 세 문장마다 붙은 소제목. → Good: 하나의 논지를 한 구역으로 묶고 제목은 구역마다 하나만 둔다. **Fix:** Add a heading only where a reader would genuinely jump in. W-11.
- **C-C4 Comma after every 연결어미.** The 연결어미 already joins the clauses; the comma is English punctuation propping up a joint that needs no prop.
  - Bad: 배포를 마쳤고, 로그를 확인했고, 알림을 껐다. → Good: 배포를 마친 뒤 로그를 확인하고 알림을 껐다. **Fix:** Punctuate for breath, not for every clause boundary. W-11.
- **C-C5 Summary block restating what was just said.** A closing recap of a short piece adds length without information, which is why generated text reaches for it.
  - Bad: 요약하면, 위에서 말한 세 가지가 핵심입니다. → Good: 마지막 문장이 결론을 직접 말하게 둔다. **Fix:** Cut the recap unless the piece is long enough that a reader lost the thread. W-06.
- **C-C6 List-introducing colon.** `다음과 같습니다:` uses an English colon to launch a list; Korean ends the lead-in sentence with a period, and only time, ratio, and key-value pairs keep the colon.
  - Bad: 설치 방법은 다음과 같습니다: → Good: 설치 방법은 아래와 같습니다. **Fix:** End the lead-in with a period; keep colons for 시각·비율 표기. W-11, W-15.

## D AI 특유 관용구

- **C-D1 `결론적으로` opening the final paragraph.** A label announcing a conclusion instead of stating one; the reader can see where the piece ends.
  - Bad: 결론적으로 이 방식이 더 낫다. → Good: 이 방식이 더 낫다. **Fix:** Delete the label and lead with the claim. W-13.
- **C-D2 `시사하는 바가 크다`.** Asserts significance while withholding what the significance is.
  - Bad: 이번 결과가 시사하는 바가 크다. → Good: 이번 결과대로면 다음 분기 목표를 다시 잡아야 한다. **Fix:** Replace the assertion with the consequence it is standing in for. W-13.
- **C-D3 `주목할 만하다`.** Instructs the reader to be interested rather than giving them a reason.
  - Bad: 응답 시간 개선이 주목할 만하다. → Good: 응답 시간이 420ms에서 180ms로 줄었다. **Fix:** State the fact; interest follows or it was never there. W-13.
- **C-D4 `혁신적인`, `획기적인`, `압도적인`.** Superlatives that no measurement backs, recognizable because generated marketing copy defaults to them.
  - Bad: 혁신적인 아키텍처를 도입했습니다. → Good: 큐를 하나로 합쳐 배포 단계를 둘 줄였습니다. **Fix:** Name the change and let the reader rank it. W-13.
- **C-D5 `~라고 할 수 있다` as a closing formula.** A statement dressed as a cautious verdict, adding syllables and subtracting commitment.
  - Bad: 이 접근이 효율적이라고 할 수 있다. → Good: 이 접근이 더 효율적이다. **Fix:** Close with the plain predicate. W-13.
- **C-D6 Closing formulas `지금이야말로`, `~할 때다`, `~라는 뜻이다`, `~인 셈이다`.** A stock ending that performs urgency or verdict instead of earning either.
  - Bad: 지금이야말로 더 투자해야 할 때이다. 이는 우리 전략이 옳았다는 뜻이다. → Good: 지금 더 투자한다. 우리 전략이 옳았다. **Fix:** Close with the plain assertion the formula is paraphrasing. W-13.
- **C-D7 Theatrical hooks and causal shorthand.** `질문을 던진다` stages the text as a drama; `~로 이어진다` compresses a causal claim the sentence never built.
  - Bad: 두 지능의 충돌이 질문을 던진다. 규제 공백이 비용 증가로 이어진다. → Good: 지능 두 개가 부딪히면서 답해야 할 문제가 달라졌다. 규제 공백 때문에 비용이 늘었다. **Fix:** State the question or the cause directly. W-13, W-03.

## E 리듬 균일성

- **C-E1 Near-identical sentence lengths.** Human paragraphs breathe unevenly; a run of same-length sentences is the flattest signature generated prose leaves.
  - Bad: 데이터를 모은다. 데이터를 정리한다. 모델을 학습한다. → Good: 데이터를 모은다. 정리가 끝나면 학습에 넣을 표본을 골라 모델을 돌린다. 결과를 보고 배포 여부를 정한다. **Fix:** Let content decide each sentence's length, then check the paragraph's silhouette by eye. W-10.
- **C-E2 Four or more identical `C/O/P` shapes with no meaning-bearing parallelism.** A repeated mold reads as generated only when it does no rhetorical work; deliberate enumeration, parallel structure, and step sequences keep their shape.
  - Bad: 서버를 확인합니다. 서버를 점검합니다. 서버를 살핍니다. 서버를 확인합니다. → Good: 서버를 확인한 뒤 관련 로그를 읽습니다. 원인이 보이지 않으면 설정까지 점검하고, 결과는 기록으로 남깁니다. **Fix:** Let the count raise the check, then keep meaning-bearing parallelism and vary only an unmotivated mold; `rules/validation.md` step 3 defines the unit and exemption test. W-09.
- **C-E3 Politeness level drifting mid-piece.** Switching between 합니다체 and 한다체 inside one text is a seam where two generated passages were joined.
  - Bad: 지표를 확인합니다. 그다음 원인을 분석한다. → Good: 지표를 확인합니다. 그다음 원인을 분석합니다. **Fix:** Settle the register before the first sentence and hold it to the last. W-09.
- **C-E4 Every paragraph the same number of sentences.** Uniform paragraph blocks signal a template, not an argument that varies in weight.
  - Bad: 세 문장짜리 문단이 다섯 번 반복. → Good: 논지가 무거운 문단은 길게, 전환 문단은 한두 문장으로 쓴다. **Fix:** Size each paragraph to the work it does. W-10.

## F 수식·중복

- **C-F1 Stacked intensifiers `매우`, `정말`, `굉장히`.** Intensity substituted for evidence; the adjective was already doing the job.
  - Bad: 매우 정말 중요한 지표입니다. → Good: 이 지표가 배포 여부를 정합니다. **Fix:** Cut the intensifier and let the noun or number carry weight. W-04.
- **C-F2 Synonym pairs doing one job.** Two near-identical words joined by `및`/`그리고` fill space without splitting the meaning.
  - Bad: 신속하고 빠른 대응이 필요합니다. → Good: 빠르게 대응해야 합니다. **Fix:** Keep one word from the pair. W-04.
- **C-F3 `~적`, `~성`, `~화` sprayed across nouns.** Sino-Korean nominalization stacks abstraction on a plain action.
  - Bad: 시스템의 안정성의 향상이 가능하다. → Good: 시스템을 더 안정적으로 만들 수 있다. **Fix:** Unfold the nominalization back into a verb or adjective. W-04.
- **C-F4 Redundant modifier already implied by the noun.** The head noun contains the modifier's meaning, so the modifier only doubles it.
  - Bad: 미리 사전에 준비한 계획. → Good: 미리 준비한 계획. **Fix:** Delete the modifier the noun already implies. W-04.
- **C-F5 Long modifier chains before the head noun.** Three or more stacked 관형절 make the reader hold every clause until the noun arrives.
  - Bad: 지난 분기에 도입한 새로 개선된 자동화된 배포 절차. → Good: 지난 분기에 새 배포 절차를 자동화했다. **Fix:** Break the chain into a clause with its own verb. W-04.

## G Hedging 남용

- **C-G1 Stacked softeners on one claim.** Layered hedges read as a model insuring itself rather than a writer judging.
  - Bad: 도움이 될 수도 있다고 생각되는 것 같습니다. → Good: 도움이 될 수 있습니다. **Fix:** Allow one hedging step per claim, no more. W-07.
- **C-G2 Hedging a fact you actually verified.** Softening a checked number invites doubt the evidence does not deserve.
  - Bad: 오류율이 줄어든 것으로 보입니다. → Good: 오류율이 2.1%에서 0.4%로 줄었습니다. **Fix:** Assert what you measured; hedge only what you did not. W-07.
- **C-G3 `일반적으로`, `대체로` with no exception in sight.** A generality qualifier that names no counter-case is a reflex, not a caveat.
  - Bad: 일반적으로 대체로 캐시가 효과적입니다. → Good: 읽기가 쓰기보다 많은 구간에서는 캐시가 효과적입니다. **Fix:** State the condition under which the claim holds. W-07.
- **C-G4 Anonymous authority `~라고 알려져 있다`.** An unsourced attribution that adds weight without adding a source.
  - Bad: 이 방식이 더 안전하다고 알려져 있다. → Good: 이 방식은 실패 시 원본을 그대로 남기므로 더 안전하다. **Fix:** Give the reason, or name the source, or drop the claim. W-07.
- **C-G5 Reflexive both-sides balancing.** `양쪽 모두 일리가 있다` closing a discussion with no judgment; balance that exists to dodge the question rather than to report a real trade-off.
  - Bad: 두 방안 모두 일리가 있다. 검토할 필요가 있다. → Good: 비용이 우선이면 A, 보안이 우선이면 B다. **Fix:** Report the actual trade-off with its condition, or make the call. W-07.

## H 접속사 남발

- **C-H1 Consecutive sentences opening with a connective.** Two connective openings in a row narrate logic the sentences already carry.
  - Bad: 따라서 품질이 중요하다. 또한 비용도 고려해야 한다. → Good: 품질이 중요하다. 비용도 함께 고려해야 한다. **Fix:** Never open two adjacent sentences with a connective; the order of the claims already carries the link. W-05.
- **C-H2 `즉` restating an already-clear sentence.** The restatement exists because the first sentence was not trusted, and both survive into the draft.
  - Bad: 처리량이 두 배가 됐다. 즉, 성능이 개선됐다. → Good: 처리량이 두 배가 됐다. **Fix:** Cut whichever version says less. W-05.
- **C-H3 `나아가`, `더 나아가` for a step that never escalates.** An escalation marker on a sentence of the same weight as the last.
  - Bad: 나아가 문서도 정리했다. → Good: 문서도 함께 정리했다. **Fix:** Reserve escalation markers for a genuine jump in scope. W-05.
- **C-H4 `한편` used as a paragraph spacer.** A contrast marker where no contrast exists, used only to start a new paragraph.
  - Bad: 한편 배포 일정도 확정했다. → Good: 배포 일정도 확정했다. **Fix:** Use `한편` only when the second clause genuinely cuts against the first. W-05.

## I 형식명사 과다

- **C-I1 `것이다` closing a sentence with no emphasis to carry.** An empty noun inflating a plain predicate into a pronouncement.
  - Bad: 이 방식이 더 낫다는 것이다. → Good: 이 방식이 더 낫다. **Fix:** Drop `것이다` unless it marks a genuine reveal. W-06.
- **C-I2 `~할 필요가 있다` for an obligation.** Three words where one ending says the same thing more directly.
  - Bad: 문서를 갱신할 필요가 있다. → Good: 문서를 갱신해야 한다. **Fix:** Use the obligation ending. W-06.
- **C-I3 `~하는 점`, `~라는 점` as a noun bridge.** A bridge noun turning a finished clause into the object of a weaker verb.
  - Bad: 응답이 느리다는 점이 문제다. → Good: 응답이 느려서 문제다. **Fix:** Let the clause connect with a 연결어미. W-06.
- **C-I4 `~할 수 있는 부분이 있다`.** A padded existence claim that says less than the bare verb.
  - Bad: 개선할 수 있는 부분이 있습니다. → Good: 캐시 적중률을 더 올릴 수 있습니다. **Fix:** Name the specific thing that can change. W-06.
- **C-I5 `~하는 바이다`, `~인 바`.** Archaic formal nouns that give ordinary prose a bureaucratic register nobody asked for.
  - Bad: 검토를 요청하는 바입니다. → Good: 검토를 부탁드립니다. **Fix:** Use the plain request or statement form. W-06.
- **C-I6 Attribution formulas and universal nouns.** `~는 분석이다`/`~는 뜻이다` attributing a claim to nobody, `필요하다` as an all-purpose predicate, and `능력` bolted onto every noun.
  - Bad: 수요가 시장을 떠받치고 있다는 분석이다. 추론 능력이 필요하다. → Good: 수요가 시장을 떠받치고 있다는 게 증권사의 분석이다. 스스로 판단하고 이어갈 수 있어야 한다. **Fix:** Name the source or drop the attribution; state what specifically is needed. W-06, W-04.

## J 시각 장식

- **C-J1 Bold spanning a whole sentence.** Emphasis on everything is emphasis on nothing, and it marks text laid out by a template.
  - Bad: **이번 배포에서 성능이 크게 개선되었습니다.** → Good: 이번 배포에서 응답 시간이 절반으로 줄었습니다. **Fix:** Emphasize a phrase at most, and prefer sentence position over bold. W-11.
- **C-J2 Quotation marks used for emphasis.** Quotes signal citation or irony; borrowing them for stress misleads the reader.
  - Bad: 이번 개선은 "진짜" 큽니다. → Good: 이번 개선은 지난 세 분기 중 가장 큽니다. **Fix:** Replace the quotes with the fact that justifies the stress. W-11.
- **C-J3 Em dash `—` as a general-purpose joiner.** A dash standing in for the connective the sentence should have chosen.
  - Bad: 배포는 끝났다 — 다만 모니터링은 남았다. → Good: 배포는 끝났지만 모니터링은 남았다. **Fix:** Pick the 연결어미 that names the relation. W-19.
- **C-J4 Emoji as section markers.** Decorative markers in prose genres where nothing about the artifact asked for them.
  - Bad: 🚀 성능 개선 / ✅ 완료. → Good: 성능 개선은 끝났고 모니터링만 남았습니다. **Fix:** Follow the genre row in `rules/genre-calibration.md`; most prose rows allow none. W-11.
- **C-J5 Decorative horizontal rules between short blocks.** Rules chop a continuous argument into slides.
  - Bad: 두 문단마다 삽입한 `---`. → Good: 문단 사이 공백만으로 구역을 나눈다. **Fix:** Keep separators for genuine part boundaries. W-11.

## Using this catalog

Read one family, not the whole file: a draft with a translationese problem needs A, not J. Apply the prescription from the matching W-rule in `rules/writing-method.md`, take genre exceptions from `rules/genre-calibration.md`, and count what needs counting with the self-check in `rules/validation.md`. In humanize mode, `rules/humanize-method.md` uses this catalog as the candidate pool for the dominant-pattern diagnosis and treats every `Fix` as an edit that must survive the anchors and the over-correction guard. The Korean examples stay in Korean in both language versions of this file so the pattern under discussion is the same object in each.
