# Context Signals

Use this reference when brief, identity, or intent is incomplete or conflicting.

## Read order

1. Explicit user request and keep/change boundary.
2. Applicable project instructions.
3. `PRODUCT.md`, `DESIGN.md`, surface brief, decision records, and explicit visual references.
4. Package/framework/styling configuration.
5. Tokens, themes, global styles, shared primitives, and representative stable screens.
6. Target source and its data/behavior dependencies.
7. Rendered target and states when available.

Absence is not permission. Missing product or design documents make the corresponding fact `unknown`; they do not make the product greenfield.

## Brief inference fields

- page type: landing, dashboard, settings, docs, portfolio, commerce, or other
- visitor mode: `Persuade`, `Operate`, `Read`, or `Experience`
- audience and task
- confirmed brand commitments and explicit references
- data cardinality and domain conventions
- keep/change boundary
- accessibility, platform, localization, legal, and performance constraints

Use this sentence form:

> This surface helps [audience] perform [task] in [situation], and follows [confirmed brand/brief/product context]; [unknowns] remain unverified.

## Conflict handling

- User/project authority beats heuristic defaults.
- A documented brand or explicit reference beats a generic anti-gradient or anti-font heuristic.
- Real data shape and behavior beat a structural fingerprint heuristic.
- A representative existing screen is evidence, not authority to copy accidental defects.
- When two authoritative local sources conflict, record the conflict and ask or block if it changes remediation.

## Browser limitation statement

When rendering is unavailable, state:

> Static source verification only. Rendered hero fit, overflow, actual contrast, visual hierarchy, and interaction states were not verified.

Do not silently substitute a source-only audit for a requested visual verification.
