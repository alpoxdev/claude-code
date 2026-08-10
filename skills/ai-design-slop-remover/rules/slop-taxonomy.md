# Slop Taxonomy

## Finding classes

| Class | Meaning | Default handling |
|---|---|---|
| `hard-gate` | Accessibility, behavior, security, or unmistakable responsive failure | Fix or block according to task authority; never present as mere taste |
| `default-risk` | Strongly resembles a recurring AI default but may be intentional | Check brief and identity; replace only with supporting evidence |
| `review-only` | Specificity, taste, emotional impression, or structure that requires human/agent judgment | Report with caveat; never auto-fix |
| `informational` | Useful observation that does not require change | Record only when relevant |

## Registry scopes

- `universal`: stable quality or accessibility guard independent of visual taste.
- `default-risk`: suspicious default with legitimate brief or brand exceptions.
- `context-dependent`: requires page type, domain, audience, data shape, or brief.
- `review-only`: cannot become a gate from static matching alone.

## Categories

- `structure`: repeated hero, feature-grid, card, navigation, footer, bento, sidebar, or section fingerprints.
- `surface`: gradients, glow, orbs, decorative pills, status dots, side stripes, uniform radius/shadow, arbitrary tokens.
- `typography-copy`: generic type pairing, cliché phrases, placeholder names/brands, unsupported metrics or claims, repetitive eyebrows.
- `motion-interaction`: `transition-all`, indiscriminate scale/reveal, layout animation, missing reduced motion, hover-only affordance.
- `quality`: contrast/focus/semantics/responsive defects, fake chrome, and claims made without rendered evidence.

## Required exception checks

- An explicitly requested brand color, gradient, font, or reference is not slop by default.
- Three columns are not slop when the data genuinely has three peers or the user requires that comparison.
- Domain conventions in medical, finance, public sector, or B2B interfaces are not generic merely because they repeat.
- A static match cannot prove visual hierarchy, contrast, usability, or intent.
- Multiple weak signals do not become deterministic merely by counting them.

## Disposition

Use exactly one action per finding:

- `remove`: unsupported decoration or placeholder with high-confidence evidence.
- `replace`: a pattern is supported as risky and a brief-aligned alternative preserves content and behavior.
- `preserve`: brand, brief, data, or function justifies the pattern.
- `ask`: a user decision materially changes the safe result.
- `block`: evidence, scope, or authority is inadequate.
