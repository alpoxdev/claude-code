# Anti-pattern Catalog

Load this catalog only when mapping detector output or a rendered observation to a rule. The registry is a judgment aid, not a universal ban list. `autofix` means a deterministic replacement may be safe only after the stated exception check.

| ID | Category | Scope | Default severity | Static | Autofix | Pattern and exception |
|---|---|---|---|---:|---:|---|
| `surface.gradient-text` | surface | default-risk | P2 | yes | no | Gradient-clipped headline; preserve explicit brand/reference typography |
| `surface.purple-gradient` | surface | default-risk | P2 | yes | no | Purple→blue/pink gradient; preserve documented brand tokens |
| `surface.random-glow` | surface | review-only | P3 | partial | no | Glow without hierarchy/brand role |
| `surface.decorative-orb` | surface | default-risk | P2 | partial | yes | Orb/blob without content, interaction, semantic, or brand role |
| `surface.thick-side-stripe` | surface | default-risk | P2 | yes | no | Thick colored card edge without meaning |
| `surface.uniform-radius` | surface | context-dependent | P3 | partial | no | One radius on every hierarchy level; design-system token may justify it |
| `surface.uniform-shadow` | surface | context-dependent | P3 | partial | no | Same elevation everywhere; explicit elevation system may justify it |
| `surface.status-dot` | surface | default-risk | P3 | partial | yes | Dot without state or legend |
| `surface.version-label` | surface | default-risk | P3 | partial | yes | Decorative “v2.0/new” label without product meaning |
| `surface.decorative-pill` | surface | default-risk | P3 | partial | yes | Image/heading pill with no category, state, or action role |
| `surface.token-drift` | surface | default-risk | P2 | partial | no | Literal color/font outside confirmed tokens; local exception may exist |
| `structure.three-equal-cards` | structure | context-dependent | P1 | partial | no | Three identical icon-heading-copy cards; preserve real three-peer comparisons |
| `structure.card-in-card` | structure | default-risk | P2 | yes | no | Nested presentation cards without semantic grouping |
| `structure.centered-hero` | structure | review-only | P3 | partial | no | Repeated centered hero; page purpose may require it |
| `structure.template-sequence` | structure | review-only | P2 | no | no | Hero→3 features→CTA→footer without product-specific information architecture |
| `structure.ai-nav` | structure | review-only | P3 | partial | no | Wordmark-left, links-middle, CTA-right fingerprint |
| `structure.ai-footer` | structure | review-only | P3 | partial | no | Generic Product/Company/Resources/Legal four-column footer |
| `structure.bento-without-ia` | structure | context-dependent | P2 | partial | no | Bento placement unrelated to priority or data |
| `copy.placeholder-person` | typography-copy | default-risk | P1 | yes | yes | John/Jane Doe or obvious fake testimonial identity |
| `copy.placeholder-brand` | typography-copy | default-risk | P1 | yes | yes | Acme/Nexus/SmartFlow-like placeholder presented as real brand |
| `copy.cliche` | typography-copy | context-dependent | P3 | yes | no | Elevate, seamless, next-gen, unleash, game-changer; quote/domain use may be valid |
| `copy.unsupported-metric` | typography-copy | default-risk | P1 | partial | yes | Percentage/metric claim with no local source |
| `copy.unsupported-proof` | typography-copy | default-risk | P1 | partial | yes | Testimonial, trust badge, proof bar, or claim without source |
| `copy.repeated-eyebrow` | typography-copy | review-only | P3 | partial | no | Uppercase eyebrow on every section |
| `motion.transition-all` | motion-interaction | universal | P2 | yes | yes | Broad transition; replace with the properties that actually change |
| `motion.layout-property` | motion-interaction | universal | P1 | yes | no | Animates top/left/width/height/margin/padding |
| `motion.missing-reduced-motion` | motion-interaction | universal | P1 | partial | no | Significant motion with no reduced-motion path |
| `motion.scale-everywhere` | motion-interaction | default-risk | P2 | yes | no | Same hover scale on unrelated controls/cards |
| `motion.hover-only` | motion-interaction | universal | P1 | partial | no | Essential affordance or content available only on hover |
| `quality.missing-focus-visible` | quality | universal | P1 | partial | no | Visible controls have focus suppression and no clear replacement |
| `quality.missing-alt` | quality | universal | P1 | partial | no | Informative image lacks alt; decorative image may need empty alt |
| `quality.mobile-overflow-risk` | quality | universal | P1 | partial | no | Fixed/min-width likely to overflow; rendering must confirm |
| `quality.fake-chrome` | quality | default-risk | P2 | yes | no | Browser/phone/IDE/terminal chrome used as unsupported decoration |

## Registry interpretation

Static `yes` means the bundled detector can find a source signature, not that the UI is defective. `partial` means source heuristics need context or rendering. Browser-only and subjective patterns remain reportable only with an explicit warrant and caveat. For remediation steps, load `fix-playbook.md`.
