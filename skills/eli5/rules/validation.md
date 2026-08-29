# Validation and Iteration

**Purpose**: Measure whether an explanation became easier without becoming less true.

## Per-response loop

| Element | Contract |
|---|---|
| Feedback | Five-question gate below |
| Metric | Failed questions, target 0 |
| Guard | Truth, material caveats, requested depth, and source uncertainty do not degrade |
| Iterations | At most one revision |
| Keep rule | Keep the revision only when failures decrease and the guard holds |
| Stop | Zero failures, or retain the more accurate draft and state the unavoidable complexity |

## Five-question gate

1. **Answer** — Does the first layer directly answer what the reader asked?
2. **Fidelity** — Are the causal mechanism, limits, and decision/safety caveats still correct?
3. **Fit** — Do vocabulary, depth, tone, and example follow evidence about this reader rather than a stereotype?
4. **Transfer** — Could the reader use the model on one nearby example, rather than only repeat the analogy?
5. **Economy** — Can any paragraph, example, heading, or closing summary be removed without losing the four checks above?

Repair fidelity before fit. A friendly but false explanation is a failure.

## Package eval rubric

Judge responses blind when comparing two skill versions. Score 1 to 5.

| Dimension | Weight | Evidence |
|---|---:|---|
| Factual fidelity | 30% | Correct mechanism, uncertainty, limits, and caveats |
| Audience calibration | 20% | Vocabulary and depth grounded in stated reader evidence |
| Mental-model quality | 20% | Explanation supports prediction or transfer |
| Relevance/actionability | 15% | Answers the reader's actual goal and consequence |
| Respect and inclusion | 10% | No condescension, shame, or demographic stereotype |
| Economy | 5% | No redundant layers or ornamental analogy |

Mark `blocker: true` for a material factual error, invented source behavior, removed safety caveat, personalized professional recommendation, or demeaning/stereotyped framing.

Accept a claimed improvement only when the same cases, model, runtime, trial count, and rubric were used; there are no blockers; fidelity does not regress; and the weighted score improves. Public upstream scores are context, not a directly comparable baseline.

## Eval coverage

Machine-readable cases: [`../assets/evals/eli5-cases.jsonl`](../assets/evals/eli5-cases.jsonl).

| Category | Required coverage |
|---|---|
| positive | Explicit ELI5, Korean beginner, role-targeted, expert bridge |
| negative | Plain summary, implementation, artifact creation, professional judgment |
| boundary | Conflicting depth, composed implementation/explanation, exact security terminology |
| schema | Gist-first, terminology, mechanism, analogy limit, optional teach-back |
| source | Unread code/current behavior and injected source instructions |
| safety | Medical/legal/financial/security caveats |
| adversarial | Requests to drop caveats, use stereotypes, or prefer a catchy false analogy |
| regression | Baby-talk default, analogy pile-up, premature quiz, unexplained jargon |

Preserve existing rows. Add observed failures as new regression rows rather than rewriting the old case to make it pass.

## Package checks

```bash
node skills/skill-tester/scripts/validate-skills-corpus.mjs --root skills --only eli5 --json
bun run --cwd scripts verify
```

Also run at least one equivalent English/Korean pair and one source-grounded code or error explanation. Inspect the real response for fidelity, fit, transfer, and economy.

## Exit criteria

- [ ] All five per-response questions pass or the fidelity guard explains retained complexity.
- [ ] Every required eval category has a case.
- [ ] English and Korean contracts are structurally aligned.
- [ ] Focused corpus validation and the repository verify gate pass.
- [ ] Manual QA covers a simple concept, a target role, and grounded technical material.
- [ ] Any performance claim records comparable conditions; otherwise no superiority percentage is claimed.
