# Writing Method

Generation-time rules for drafting Korean prose that does not read like AI output, and editing rules for making supplied Korean read as if a person wrote it. In compose mode every rule applies while writing, not after; in humanize mode the same rules name what to remove from supplied text under `rules/humanize-method.md`. Every rule is phrased as a concrete act: what to write, and what never to write.

## 1. Principles

- **P1 Content first.** Put facts, claims, and numbers on the page before polishing. A sentence with real content beats a smooth sentence with none.
- **P2 Evidence sentences, not filler.** Every sentence must carry information: a fact, a reason, a step, a comparison. When drafting, delete any sentence that only restates the previous one.
- **P3 Genre preservation.** Match the genre the user asked for. Do not force a neutral essay register onto ad copy, a report, or a messenger reply. Genre budgets live in the genre table of `rules/genre-calibration.md`, which holds the per-genre decoration counts. In humanize mode the supplied text's own register outranks the genre row; `rules/humanize-method.md` owns that ordering.
- **P4 No over-correction.** Never force colloquial tone or artificial rhythm variation to seem human. Unnatural variation is its own tell, and scrubbing one tell must not inject another.
- **P5 Meaning is explicit.** Korean carries meaning through particles, endings, and complete sentence shapes. Dropping components to sound casual produces telegraphic fragments that read as a different kind of machine output.

These principles outrank the rules below. When a rule and a principle appear to conflict, follow the principle.

## 2. Generation rules

Each rule has a stable ID, a one-line rule, and one bad to good example pair. Korean examples stay in Korean in both language versions.
Rules are ordered roughly by how early they bite during drafting: sentence construction first, then connective and rhythm habits, then decoration and diction.
A rule that references another file defers to that file; nothing here restates the genre table's decoration counts or the self-check thresholds.

**W-01** When drafting, never write translated-English connectives: write `~로` or `~-하며`, not `~를 통해`; write `~에서`, not `~에 있어서`; mark the object with `을/를`, not `~에 대해`.
- Bad: 이 연구를 통해 새로운 사실이 밝혀졌다. 경제 정책에 있어서 중요한 과제다. 보고서는 인공지능의 미래에 대해 분석한다.
- Good: 이 연구로 새로운 사실이 밝혀졌다. 경제 정책에서 중요한 과제다. 보고서는 인공지능의 미래를 분석한다.

**W-02** Never write double passives or fake possessives: ban `~되어진다`, and write `있다`, not `가지고 있다`.
- Bad: 결과가 반영되어진다. 이 모델은 높은 정확도를 가지고 있다.
- Good: 결과가 반영된다. 이 모델은 정확도가 높다.

**W-03** Never give an inanimate subject a causative verb borrowed from English; rebuild the sentence with a human actor or a plain verb.
- Bad: 이 기능은 사용자가 시간을 절약하게 한다.
- Good: 이 기능을 쓰면 시간을 절약할 수 있다.

**W-04** Unpack Sino-Korean nominalizations when drafting: turn `~적`, `~성`, `~화` nouns back into verbs or adjectives.
- Bad: 시스템의 안정성의 향상이 가능하다.
- Good: 시스템을 더 안정적으로 만들 수 있다.

**W-05** Budget sentence-initial connectives: never open consecutive sentences with `또한`, `따라서`, `즉`, `나아가`.
- Bad: 따라서 품질이 중요하다. 또한 비용도 고려해야 한다. 즉, 둘 다 필요하다.
- Good: 품질이 중요하다. 비용도 따져봐야 하므로 둘 다 필요하다.

**W-06** Budget formal nouns: keep `것이다`, `점`, `수`, `바`, `~할 필요가 있다` sparse; when drafting, replace them with direct verb endings.
- Bad: 이 점을 고려할 필요가 있다고 볼 수 있는 것이다.
- Good: 이 점도 함께 고려해야 한다.

**W-07** Allow at most one hedging step per claim; never stack `~일 수도 있다고 생각된다` style double hedges.
- Bad: 이 방법이 도움이 될 수도 있다고 생각되는 것 같다.
- Good: 이 방법이 도움이 될 수 있다.

**W-08** Skip mechanical enumeration (`첫째`, `둘째`, `셋째`) unless the genre demands it; `rules/genre-calibration.md` owns that exception.
- Bad: 첫째, 속도가 빠르다. 둘째, 설치가 쉽다. 셋째, 비용이 저렴하다.
- Good: 속도가 빠르고 설치도 쉽다. 비용 부담도 적다.

**W-09** Watch repeated sentence construction: four or more consecutive sentences with the same `C/O/P` shape raise the check, then keep the shape when it carries a deliberate enumeration, parallel structure, or step sequence and vary it only when it has no rhetorical reason. Ignore tense, honorifics, and register-bound terminal endings; `rules/validation.md` step 3 defines the unit, the meaning-bearing parallelism test, and the edge-construction rulings.
- Bad: 서버를 확인합니다. 서버를 점검합니다. 서버를 살핍니다. 서버를 확인합니다.
- Good: 서버를 확인한 뒤 관련 로그를 읽습니다. 원인이 보이지 않으면 설정까지 점검하고, 결과는 기록으로 남깁니다.

**W-10** Vary sentence length: mix long and short sentences and avoid a machine-uniform rhythm; judge by ear, not by counting.
- Bad: 데이터를 수집한다. 데이터를 정제한다. 모델을 학습한다. 결과를 평가한다.
- Good: 먼저 데이터를 모은다. 정제가 끝나면 모델을 학습하고, 마지막으로 결과를 평가해 배포 여부를 정한다.

**W-11** Treat visual decoration (bold, emphasis quotes, dashes, emoji) as a budget owned by genre; `rules/genre-calibration.md` states each genre's allowance as counts per 500자, and those counts are the ceiling.
- Bad: **매우 중요**합니다. 이것은 *핵심* "기능"입니다.
- Good: 이 기능이 이 버전의 핵심입니다.

**W-12** Do not copy English words that Korean can express, and do not scatter parenthetical glosses.
- Bad: 이 프레임워크는 높은 플렉서빌리티(flexibility)를 제공(provide)한다.
- Good: 이 프레임워크는 유연성이 높다.

**W-13** Never write AI stock phrases: ban `결론적으로`, `시사하는 바가 크다`, `주목할 만하다`, `혁신적인`, `획기적`.
- Bad: 결론적으로 이 결과는 시사하는 바가 크며 주목할 만하다.
- Good: 이 결과가 의미하는 바는 다음 절에서 따로 다룬다.

**W-14** Never force `그`/`그녀` pronouns: Korean naturally repeats the noun or drops the subject.
- Bad: 철수는 학교에 갔다. 그는 도서관에 들렀다. 그는 책을 빌렸다.
- Good: 철수는 학교에 갔다가 도서관에 들러 책을 빌렸다.

**W-15** Write complete sentences: do not drop meaningful components behind stacked `~의`, and end sentences with a predicate and a sentence-final ending, not with a noun phrase, an adverbial phrase, or a connective ending. Headers and list items are exempt.
- Bad: 이 기능의 설정의 변경의 절차는 아래와 같습니다. 적용 시에는 재시작이 필요하니 유의하시고요.
- Good: 이 기능의 설정을 바꾸는 절차는 아래와 같습니다. 바뀐 설정은 재시작한 뒤에 적용되므로, 재시작 시점을 미리 정해 둡니다.

**W-16** Keep particles and endings that carry meaning: drop a 조사 only when omitting it is genuinely natural, and use 부사, 보조사, and 선어말어미 to make the relations between words explicit.
- Bad: 회의는 금요일 오후로. 자료는 회의 전까지 공유.
- Good: 회의는 금요일 오후에 열기로 했습니다. 자료는 회의 전까지 공유드리겠습니다.

**W-17** Prefer a concrete Sino-Korean word in its natural slot and attach 조사 and 어미 to it, so the relations inside the sentence stay visible; do not let the 한자어 float as a bare compound.
- Bad: 쓴 비용을 구하는 함수에 문제가 생기면 바로 조치 바람.
- Good: 지출한 비용을 추론하는 함수에 오류가 발생하면 즉시 담당자가 조치합니다.

**W-18** Do not substitute figurative vocabulary where an ordinary word carries the meaning; keep a figurative expression only when it is a settled idiom in this field and the plain word would sound odd.
- Bad: 이번 조사는 기존 연구의 흐름을 밟는다.
- Good: 이번 조사는 기존 연구의 방향을 따른다.

**W-19** Do not reach for the em dash as a default joiner; pick the 콜론 or 연결어미 that names the relation, and spend a dash only inside the genre row's allowance in `rules/genre-calibration.md`.
- Bad: 회의 결과는 한 줄이다 — 예산 승인이다.
- Good: 회의 결과는 예산 승인 한 줄이다.

**W-20** Drop the plural marker `-들` when a quantifier or the context already marks the plural; keep it only when it carries emphasis, contrast, or generalization. A mechanical blanket ban is not adopted.
- Bad: 많은 사용자들이 세 가지 기능들을 요청했다. 기능들은 다음 분기에 나온다.
- Good: 많은 사용자가 세 가지 기능을 요청했다. 기능은 다음 분기에 나온다.

**W-21** Do not waste pronouns or demonstratives: drop `그것은`/`이것은` when the antecedent is obvious, and replace `해당`, `본`, `당` with `이/그`, the bare noun, or omission.
- Bad: 이 프로젝트는 성공했다. 그것은 팀원들의 노력 덕분이다. 해당 방식은 앞으로도 유지된다.
- Good: 이 프로젝트는 팀원들의 노력 덕분에 성공했다. 우리는 이 방식을 앞으로도 유지한다.

**W-22** Drop the subject when it carries over from the previous sentence; keep it when the actor changes or two actors contrast.
- Bad: 나는 아침에 일어났다. 나는 커피를 마셨다. 나는 출근했다.
- Good: 아침에 일어나 커피를 마시고 출근했다.

**W-23** Break the three-beat habit: do not force every list and every sentence run into exactly three parallel items; vary the count or split the third item off.
- Bad: 이 솔루션은 빠르고, 효율적이며, 안전합니다. 우리는 계획하고, 실행하고, 평가했습니다.
- Good: 이 솔루션은 빠르고 효율적입니다. 계획하고 실행한 뒤 평가했고, 부족한 부분은 개선했습니다.

**W-24** When the settled register accepts a plain Korean verb, do not dress the action in a formal Sino-Korean verb such as `진행하다`, `실시하다`, `수행하다`.
- Bad: 우리는 파일럿을 진행하고, 설문을 실시하며, 결과를 검토했습니다.
- Good: 파일럿을 돌리고 설문을 거쳐 결과를 살폈습니다.

**W-25** Do not lean on formal framing phrases as filler: write the direct noun or verb instead of `~와 관련하여`, write `~로`/`~을 보고`/`~을 토대로` instead of `~에 기반하여`/`~에 바탕으로`, and make the actor the subject instead of writing `~에 의해`.
- Bad: 보안과 관련하여 예산을 늘렸고, 사용자 데이터에 기반하여 우선순위를 정했으며, 운영팀에 의해 반영되었습니다.
- Good: 보안 예산을 늘렸고, 사용자 데이터를 보고 우선순위를 정했으며, 운영팀이 반영했습니다.

**W-26** Use `~할 수 있다` only for real possibility, ability, or permission, and never repeat a modal or purpose frame across consecutive sentences: diversify `~을 위해` into `~려고`/`~고자` or fold the purpose into the verb.
- Bad: 이 도구는 배포를 자동화할 수 있다. 시간을 아낄 수 있고 실수도 줄일 수 있다. 도입은 비용 절감을 위해 추진했고, 검증은 품질 확보를 위해 강화했다.
- Good: 이 도구는 배포를 자동화한다. 시간이 줄고 실수도 덜한다. 비용을 아끼려고 도입했고, 품질을 지키려고 검증을 강화했다.

## 3. Deliberately excluded

Quantitative signals from detection tooling are excluded here because they describe distributions of finished text, not drafting acts. Thresholds for self-checking live in `rules/validation.md` with source tags.

- **z-score style uniformity scores**: a z-score is computed over a completed document, so a writer mid-draft has nothing to act on.
- **Sentence-length standard deviation figures**: a numeric spread can only be measured after the text exists; the drafting rule is W-10's mix long and short.
- **Comma-rate statistics**: a comma ratio is a property of a finished corpus, not a choice made while writing a sentence.
- **Nonstandard spacing as a "human" signal**: deliberately mis-spacing 의존명사 or 보조용언 to imitate human irregularity trades a real spelling standard for a fake tell; this package keeps standard 표기.

Anything measurable only after the draft exists belongs to the self-check protocol in `rules/validation.md`, not to this file.
