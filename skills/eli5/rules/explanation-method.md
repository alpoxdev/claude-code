# Explanation Method

**Purpose**: Convert reader calibration into repeatable decisions while keeping fidelity ahead of friendliness.

## 1. Build the reader model

Use direct evidence before proxies.

| Signal | Strong evidence | Weak evidence to avoid overusing |
|---|---|---|
| Knowledge | "I know Python", named coursework, earlier questions | Age or job title alone |
| Goal | "I need to decide", "help me debug", "teach me" | Generic "explain" with no context |
| Context | Supplied code, incident, meeting, class, product decision | Invented hobbies or domestic roles |
| Constraints | Word limit, no jargon, required terms, language | Assumed attention span or intelligence |

When a missing detail changes only the example, choose a neutral example and continue. Ask one question only when the missing goal or prior knowledge would materially change the explanation.

## 2. Preserve the causal spine

Before simplifying, identify:

1. The thing being explained.
2. The job it performs or problem it solves.
3. The actors or parts involved.
4. The cause-and-effect sequence.
5. The outcome or consequence.
6. The caveat that would make a simplified statement false.

Do not draft from terminology alone. If the mechanism is not understood, investigate or state the uncertainty.

## 3. Choose the depth

| Reader goal | Default depth | Include |
|---|---|---|
| Quick orientation | Gist | Definition + why it matters |
| First-time learning | Foundation | Gist + concrete model + mechanism + one example |
| Decision support | Decision | Outcome + options + trade-offs + uncertainty |
| Debugging | Diagnostic | Symptom + cause chain + fix + verification |
| Teaching/study | Learning | Layered mechanism + example + optional teach-back |
| Expert bridge | Comparative | Known concept + delta + edge cases + trade-offs |

"Simple" controls cognitive load, not correctness. "Detailed" controls depth, not sentence complexity.

## 4. Use terminology well

- Keep an essential term when the reader will encounter it again.
- Define it in plain language at first use: **term — practical meaning**.
- Use one stable label for one concept; do not rotate synonyms for variety.
- Expand acronyms once unless the user already demonstrates familiarity.
- Prefer verbs and concrete actors over abstract noun chains.
- Break long causal chains into ordered steps, not fragments.

## 5. Use analogies as scaffolding

An analogy is optional. Use one only when it reduces explanation cost.

### Analogy gate

1. **Familiarity**: Is the source situation plausibly familiar from stated context, not stereotype?
2. **Mapping**: Can each important part map to a real part of the mechanism?
3. **Prediction**: Does the analogy help predict what happens next?
4. **Limit**: Can the important mismatch be stated briefly?

If any answer is no, use a concrete worked example or diagram-like sequence instead.

Good form:

> Picture a restaurant queue: requests wait their turn before being handled. The match stops there—software queues can copy, retry, or process several items at once depending on their design.

Never let the analogy carry the factual claim by itself. Name the real mechanism immediately before or after it.

## 6. Explain common material types

### Code

1. State the code's purpose in the surrounding system.
2. Name inputs, outputs, and state changes.
3. Trace control or data flow in execution order.
4. Explain only syntax that matters to that flow.
5. Name side effects, failure paths, and trade-offs when relevant.

### Errors

1. Translate the visible symptom.
2. Identify the root cause supported by evidence.
3. Connect cause to symptom.
4. Give the smallest correction when asked or useful.
5. Give one verification or prevention step.

Do not treat the error text as the root cause without checking its context.

### Business or manager audiences

Lead with consequence and decision. Include technical mechanism only to the depth needed to understand risk, cost, sequencing, or trade-offs. Do not ban code formatting mechanically; omit it when it does not help the decision.

Default to a decision brief, not a tutorial: one recommendation, up to three supporting trade-offs, and one next decision or measurement. Put optional mechanism detail after the brief only when the request asks for it. Do not repeat the recommendation as a summary, checklist, and conclusion.

### Children and beginners

Use short concrete sentences and one idea at a time. Keep real names for concepts they may encounter again. Never use baby talk, exaggerated enthusiasm, or an assumed interest such as candy, toys, games, or cartoons.

### Experts crossing domains

Start from a concept they named as familiar. Emphasize differences, invariants, failure modes, and trade-offs. Do not re-teach basics they already demonstrated.

### Safety-critical topics

For medical, legal, financial, security, or operational-risk topics:

- retain uncertainty, conditions, and exceptions
- distinguish general education from personalized judgment
- keep the real term beside the plain-language definition
- state where the simplified model stops
- never convert general information into a confident personal recommendation

## 7. Add comprehension checks selectively

Use at most one low-pressure check when the user asks to learn, study, prepare, or confirm understanding.

Prefer teach-back:

> In your own words, what causes the retry to happen?

Avoid trivia questions, surprise quizzes, or "Does that make sense?". No check is needed for one-off orientation, decision briefs, or users who asked only for an answer.

## 8. Compression order

When the explanation is too long, remove in this order:

1. Repeated summary.
2. Second analogy or example.
3. Decorative setup and transitions.
4. Optional history and trivia.
5. Lower-priority implementation detail.

Never remove the causal link, decision-relevant trade-off, safety caveat, or source uncertainty first.

## 9. Pre-send readback

Read the first paragraph alone: it must answer the question. Then read every sentence containing "like", "imagine", or "think of": the mapped concept and important mismatch must be nearby. Finally, read the explanation without examples: the real mechanism must still be present.
