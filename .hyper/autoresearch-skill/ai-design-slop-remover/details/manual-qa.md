# Manual CLI QA

## 기준선 CLI surface

- Invocation: `node skills/ai-design-slop-remover/scripts/detect-slop.cjs --target skills/ai-design-slop-remover/assets/fixtures/detector-positive.html --json`
- Expected binary observable: structured detector v2 JSON with findings and `genericOutputRisk`.
- Observed: exit 0; v2 JSON emitted 9 findings, P1=4/P2=4/P3=1, `genericOutputRisk: medium`.

## Help and invalid input

- Invocation: `node skills/ai-design-slop-remover/scripts/detect-slop.cjs --help`
- Expected binary observable: usage text and exit 0.
- Observed: usage displayed and exit 0.
- Invocation: `node skills/ai-design-slop-remover/scripts/detect-slop.cjs --target skills/ai-design-slop-remover/assets/fixtures/unsupported.txt --json`
- Expected binary observable: structured error and exit 2.
- Observed: `Unsupported file type: .txt`, `detectorVersion: 2`, exit 2.

## Kept mutation QA

- Invocation: `node skills/ai-design-slop-remover/scripts/run-contract-evals.cjs --help`
- Expected binary observable: `Usage: node run-contract-evals.cjs [--cases <cases.jsonl>] [--json]` and exit 0.
- Observed: exact usage displayed and exit 0.
- Invocation: `node skills/ai-design-slop-remover/scripts/run-contract-evals.cjs --json`
- Expected binary observable: six valid/rejected report, waiver, and rendered handoff cases pass.
- Observed: exit 0; 6/6 cases passed.

## Cleanup

- Command: no server, temp directory, port, or background process was created.
- Receipt: cleanup `pass`; `/tmp` baseline probe was ephemeral and no owned persistent resource requires deletion.
