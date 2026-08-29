# Validation and Reporting

## Verification order

1. Re-run `detect-slop.cjs` against the same target and compare rule IDs, severity counts, engine/evidence fields, and baseline delta when used.
2. Run the smallest project build, typecheck, lint, and test commands that cover changed files; inspect failures rather than suppressing them.
3. When rendering is available, inspect representative desktop and mobile widths and relevant interaction/async states.
4. Check keyboard focus, semantics, contrast where measurable, reduced motion, and responsive overflow affected by the change.
5. Exercise directly affected behavior and preserve copy, routes, form contracts, state transitions, and analytics hooks.
6. Validate a saved report with `validate-report.cjs` and record residual risk.

## Claim rules

- Do not report “no issues” unless the detector or equivalent static inspection actually ran.
- Do not report a visual pass without rendered inspection.
- Do not report an accessibility pass from a screenshot or CSS source alone.
- Do not turn a context-dependent or review-only heuristic into a confirmed defect.
- Do not call `generic-output risk` an AI-authorship result.
- Do not treat a candidate exception or baseline as suppression or a remediation pass.
- Do not invent product metrics, brand claims, testimonials, users, or source provenance.
- Record every unrun check and why it was unavailable or out of scope.

## Required report sections

Use `assets/report-template.ko.md` by default. Preserve these headings so the validator can inspect the result:

- `# AI Design Slop 정리 결과`
- `## 처리 요약`
- `## Brief inference`
- `## 발견 사항`
- `## 적용한 변경`
- `## 검증`
- `## 남은 위험`

V2 reports also record detector version/engines, generic-output risk, baseline delta, candidate/persisted waivers with reason, and `complete | static_only | unavailable` rendered-evidence status.

`audit` may state that no changes were applied. `verify` must identify the change or finding set it checked. Empty sections are invalid; use an explicit `없음` or `미검증` with a reason.

## Completion decision

- `pass`: all applicable critical guards passed and no user decision remains.
- `review_required`: safe work is complete but a context-dependent or review-only decision remains.
- `blocked`: required evidence, authority, capability, or a critical guard is missing.

A caveated result is valid only when limitations are explicit and no hidden critical failure is presented as passed.
