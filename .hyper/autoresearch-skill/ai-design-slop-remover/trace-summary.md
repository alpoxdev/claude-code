# 추적 검증 요약

| Assertion | Evidence | Pass? |
|---|---|---|
| `read_before_mutation` | target core, workflow/validation rules, 3개 eval corpus, autoresearch contract를 baseline 전 읽음 | yes |
| `baseline_before_edit` | Experiment 0이 target mutation 전 기록됨 | yes |
| `ownership_checkpoint` | `baseline-files.json`, `recovery.json`의 digest/owned path | yes |
| `stable_eval_set` | `details/prompt-pack.md`, `details/eval-results.tsv`의 고정 identity | yes |
| `reset_event` | Experiment 1 metric-error 후 Experiment 2에서 결정적 oracle로 rebaseline | yes |
| `review_before_mutation` | Experiment 0 changelog과 results row를 후보 전 재검토 | yes |
| `one_mutation` | Experiment 1은 resource navigation의 contract runner 한 줄만 bilingual core에 추가 | yes |
| `guard_respected` | score와 guard를 분리한 run contract/results | yes |
| `source_guard` | mutation에 external/current claim을 사용하지 않음 | yes |
| `bounded_tools` | local read/apply_patch/Node/Bun만 사용, network 없음 | yes |
| `network_and_secret_guard` | raw secret/network data 없음 | yes |
| `restoration_verified` | Experiment 1 KEEP로 restore 불필요; candidate digest가 final frontier와 일치 | yes |
| `artifact_schema` | results TSV/JSON/JS와 dashboard renderer validation 통과 | yes |
| `parent_verifies` | fixed oracle, detector 16/16, contract 6/6, focused corpus, `bun run --cwd scripts verify`를 직접 확인 | yes |
| `manual_qa` | `details/manual-qa.md`의 detector happy/help/invalid 및 contract runner help/6-case receipt | yes |
| `terminalization` | Experiment 3 frontier, terminal reason, cleanup/rollback, bridge approval을 complete record에 기록 | yes |
