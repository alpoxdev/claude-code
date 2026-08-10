# Remediation Workflow

## Modes

- `audit`: inspect, classify, and report. Never edit product source.
- `clean`: run an audit, apply supported low-risk changes, judge any structural change, verify, and report.
- `verify`: inspect an existing change against the brief, prior findings, and current guards. Do not broaden the change.

## Ordered procedure

1. Confirm target and mode from the request. A missing target blocks mutation.
2. Read project authority and available product/design context before scanning implementation details.
3. Write the brief inference and mark unknowns. Do not interpret missing `PRODUCT.md` or `DESIGN.md` as greenfield permission.
4. Run `detect-slop.cjs`; optionally run `analyze-structure.cjs` when repeated page structure is relevant.
5. Collect rendered evidence when a browser exists. Use representative widths: 320, 375, 414, 768, 1280×800, and 1440+ when the surface supports them. Check relevant hover, focus, active, disabled, loading, empty, error, and reduced-motion states.
6. Classify every finding by rule scope, severity, confidence, and evidence family. Select `remove`, `replace`, `preserve`, `ask`, or `block`.
7. In `clean`, apply the smallest low-risk category first. Do not combine unrelated redesigns into one pass.
8. Re-run the detector and affected project checks. Inspect rendered behavior where available.
9. Permit one correction pass only for a concrete failed guard. Stop after two total edit passes.
10. Report observed results and limitations using the template.

## Pass acceptance

Keep a pass only when all applicable conditions hold:

- no P0 remains
- each P1 is resolved or has a documented preservation reason
- no behavior regression is observed
- protected copy, IA, legal text, URLs, form contracts, assets, and brand commitments remain intact
- detector counts do not worsen without a justified trade-off
- responsive and accessibility guards pass where they were actually checked
- the inferred or explicit brief is still satisfied

If a guard fails, discard or correct the specific change. Never redefine the baseline to make a pass look successful.
