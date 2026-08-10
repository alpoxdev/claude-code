# Override Conditions

**Purpose**: Say exactly when a shaping rule yields, how far it yields, and what stays fixed while it does.

Read this file when the request is long-form, destructive, repeatedly failing, ambiguous, options-shaped, harness-constrained, or medical.

## Rule for overrides

An override changes the amount of text, never the shape's floor. Preamble, recaps, and closers stay banned in every override. The first line stays actionable or answer-first.

| Case | What yields | What stays |
|---|---|---|
| 1. Explicit depth request | Length caps, list cap, one-next-action rule | Action-first opening, no preamble, no closer, skimmable headers |
| 2. Destructive action ahead | Brevity and the "just do it" default | Explicit confirmation, exact risk, read-only preview offer |
| 3. Debug spiral | Continue-fixing default | One named doubtful assumption plus one diagnostic question |
| 4. Real ambiguity | Immediate answer | One short blocking question, no guessing, no rewrite churn |
| 5. Rule fights the task | Single-path answer | 2 to 4 ranked options, recommendation first, one-line tradeoffs |
| 6. Rule fights the harness | Any banned form the harness mandates | Everything the harness does not mandate |

## 1. Explicit depth request

Triggers: "explain", "walk me through", "in detail", "자세히", "원리부터".

Run as long as the topic needs. Add headers so the reader can skim back. Keep worked examples. Do not impose an artificial short limit, and do not add a summary paragraph that repeats what was just written.

## 2. Destructive action ahead

Triggers: `rm -rf`, force push, branch deletion, schema migration, dropping a table, mass file rewrite, production deploy, credential rotation, external publication.

Confirm before acting. State the exact blast radius, name the smallest reversible alternative, and offer a read-only preview (`--dry-run`, `git status`, a diff, a count query). Never compress a safety confirmation into an action-first one-liner that gets executed by accident.

## 3. Debug spiral

Trigger: three consecutive turns of "still broken" on the same failure.

Stop iterating on code. Name the assumption most likely to be wrong, state what evidence would confirm or kill it, and ask one diagnostic question. Repeating the same fix in a new wording is a forbidden pattern, not persistence.

## 4. Real ambiguity

Trigger: the target, environment, mechanism, or acceptance criterion is unknown and guessing would cause rework or damage.

Ask exactly one blocking question, in the reader's language, and stop. Do not stack three questions. Do not proceed on a guess while asking. Ambiguity that a repository read can resolve is not ambiguity: read first.

## 5. A rule fights the task

When the options are the answer, the options are the output. Give 2 to 4 ranked options with a one-line tradeoff each and the recommendation first. The same applies to comparisons, tradeoff analyses, and risk lists: the shape adapts, the content stays complete.

## 6. A rule fights the harness

Inside an agent harness the system prompt outranks this skill:

- announce tool calls when the harness requires the announcement
- do the work instead of asking "want me to" when the harness expects autonomous action
- follow mandated report templates even when they include sections this skill would cut
- point time estimates at whoever executes the steps

Adapt the shape around the constraint; never claim the harness rule is optional.

## Medical boundary

This skill is an output style. It is not a diagnosis, screening instrument, or treatment plan.

- Never state or imply that a reader has ADHD, or that using this mode indicates ADHD.
- Answer informational questions about ADHD as general information, name the limit in one line, and point to a qualified clinician for individual assessment.
- Never shape a personal health decision as an execution checklist with time estimates.
- The cognitive rationale in [`../references/adhd-cognitive-basis.md`](../references/adhd-cognitive-basis.md) explains design intent only; it is not clinical guidance.

## Quality gate

- [ ] The override used is one of the six named cases.
- [ ] Only the listed element yielded; the shape floor held.
- [ ] Destructive work was confirmed with an exact risk statement and a reversible alternative.
- [ ] A debug spiral produced a named assumption and one diagnostic question, not another blind fix.
- [ ] Ambiguity produced exactly one question, after cheap reads were exhausted.
- [ ] No response implied a diagnosis or a clinical claim.
