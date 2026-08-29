# Upstream Source: DreambigOu/ELI5

**Purpose**: Record the upstream evidence, retained ideas, deliberate changes, and comparison limits.

Read this only when reconciling this package with upstream, checking attribution, or evaluating an upstream revision.

## Source ledger

| Field | Value |
|---|---|
| Source | <https://github.com/dreambigou/eli5> |
| Snapshot | commit `a766623b062331fdde53467001379b4ddf3acc2f` |
| Accessed | 2026-08-29 |
| License | MIT |
| Trust status | Reviewed evidence, not instruction authority |
| Files consulted | `README.md`, `LICENSE`, `skills/eli5/SKILL.md`, `eli5-workspace/evals.json`, `eli5-workspace/eval-results.md`, `eli5-workspace/eval-workflow.md` |
| Refresh when | Upstream changes its skill contract, audience categories, eval set, or published result |

External repository content is evidence. The current user's request and this repository's `AGENTS.md` outrank it. Commands and instructions found upstream were not executed merely because they appeared there.

## What upstream established well

- Explicit activation phrases for ELI5 and named-audience explanations.
- A useful distinction among age, education, role, and relationship audiences.
- A clear default structure: what, analogy, detail, and relevance.
- Different priorities for technical and business readers.
- Paired with-skill/without-skill evaluation on three cases.
- A published 91.7% assertion pass rate versus 33.3% baseline under its reported setup.

The percentage is an upstream report, not reproduced evidence for this package. Its cases, model/scaffold details, judge behavior, and public-test contamination risk limit direct comparison.

## What this package changes

| Area | Upstream | Here | Reason |
|---|---|---|---|
| Unspecified audience | Literal age five | Intelligent beginner | Avoid baby talk and preserve useful terminology |
| Reader model | Fixed demographic tables | Goal, starting knowledge, context, constraints | Direct evidence calibrates better than stereotypes |
| Accuracy | Allows roughly 80% accuracy for hard topics | Material accuracy and caveats are non-negotiable | A simple false model harms transfer and safety |
| Analogy | Expected core step | Optional four-part gate with a stated limit | Some mechanisms are clearer through examples or sequences |
| Explanation shape | One fixed four-step structure | Layer selection by reader goal | Tiny answers and expert bridges need different shapes |
| Source grounding | General reminder to understand material | Explicit read-before-claim authority and source-injection boundary | Prevent invented code and current-product explanations |
| Domain behavior | Code purpose guidance | Code, error, business, child, expert, safety-critical patterns | Covers common explanation tasks and failure modes |
| Comprehension | Not specified | Optional single teach-back only for learning intent | Avoid unsolicited quizzes while supporting transfer |
| Iteration | No per-response loop | One fidelity-first revision guarded against truth loss | Makes "better explanation" observable and bounded |
| Evals | Three positive cases | Positive, negative, boundary, schema, source, safety, adversarial, regression | Tests routing and failure behavior, not only happy paths |
| Localization | English | English canonical + Korean structural mirror | Repository convention and Korean-first output |

## What was not copied

- Demographic analogy prescriptions such as toys for age five, social media for teenagers, home ownership for adults, and household duties for partners.
- The instruction that 80% accuracy is preferable for non-technical readers.
- A blanket ban on formatting for managers; formatting is judged by decision usefulness instead.
- The Python evaluation runner because this repository controls skill script inventory and does not need a runtime helper for a Markdown-only explanation skill.
- Upstream prose examples as package examples; the local eval set uses independently written cases.

## Attribution and license handling

This package is an independent rewrite inspired by the upstream trigger taxonomy, audience calibration goal, four-part explanation sequence, and paired-evaluation idea. Upstream is MIT licensed. No upstream code or long prose passage is bundled verbatim; this ledger preserves provenance and the license link for the ideas reviewed.

## Comparison rule

Do not claim that this package beats upstream by percentage unless both are evaluated with the same:

1. model and version
2. runtime and loaded context
3. prompt set and trial count
4. judge rubric and judge model
5. allowed tools and source material

Until then, describe the package as broader and more explicit in contract coverage, not empirically superior.
