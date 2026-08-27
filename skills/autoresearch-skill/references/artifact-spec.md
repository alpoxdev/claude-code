# Artifact Spec

Use this reference when creating or reviewing the experiment workspace for an autoresearch run.

## Workspace Shape

```text
.hyper/autoresearch-skill/[skill-name]/
|-- dashboard.html
|-- results.json
|-- results.js        # optional but recommended fallback for file:// browsers
|-- results.tsv
|-- changelog.md
|-- score-explanation.md # required for completed runs unless fully represented in results.json.score_explanation
|-- final-report.md      # required final Korean user-facing report
|-- run-contract.md      # recommended; required when source/tool/delegation is used
|-- source-ledger.md     # required when external/current claims are used
|-- trace-summary.md     # required when tools/delegation/parallel evaluation is used
|-- baseline-files.json  # required when support files beyond SKILL.md can change
|-- recovery.json        # required when a candidate mutates files/resources or a run can resume
|-- details/             # optional; long analysis, prompt packs, raw eval results
`-- SKILL.md.baseline
```

Create this directory at the repository root, not inside the skill folder.

In `$autoresearch` runs, this `.hyper` directory is the domain-specific result log, while the final completion gate is handled by a separate `.omx/specs/autoresearch-[skill-name]/result.json` completion artifact. Record the `.omx/specs/.../result.json` path in `completion_artifact_path`, and record this file's `results.json` in `output_artifact_path`.

The always-required base artifacts are `dashboard.html`, `results.json`, `results.tsv`, `changelog.md`, and `SKILL.md.baseline`. Completed runs also require Korean score movement and handoff content in `results.json.score_explanation` plus `final-report.md`, or in `score-explanation.md` and `final-report.md` loaded through `results.js`. `run-contract.md`, `source-ledger.md`, and `trace-summary.md` become required depending on run conditions.

Do not force long content into `results.json`; place it under `details/` as Markdown/Text/JSON/TSV/Log files. The renderer safely serializes `changelog.md`, `score-explanation.md`, `final-report.md`, `run-contract.md`, `source-ledger.md`, `trace-summary.md`, and supported files under `details/` into `results.js` so the dashboard can show them in the detailed log section.

Canonical generated assets:

- template: `skills/autoresearch-skill/assets/dashboard-template.html`
- renderer: `skills/autoresearch-skill/scripts/render-dashboard.mjs`
- renderer runtime: the Bun JSON runtime

## Baseline snapshot

When only the target skill's `SKILL.md` is changed, `SKILL.md.baseline` is enough. For runs that may also change `rules/`, `references/`, `scripts/`, or `assets/`, add one of the following:

- Copy the original files being changed into a `baseline/` directory
- Record each file's path, sha256, and size in `baseline-files.json`

Changing support files while leaving only `SKILL.md.baseline` is treated as an incomplete baseline.

## `run-contract.md`

Record the pre-baseline contract briefly. It is useful even for simple runs that do not use external/current sources, tools, or delegation, and it is required when those elements are present.

```markdown
# Run Contract

- Intent: [successful outcome of this run]
- Scope: [files that may be changed / excluded files]
- Authority: [priority order among user, project, target skill, retrieved content]
- Evidence: [local files, official docs, source ledger]
- Tools: [capabilities used and side-effect limits]
- Output: [artifacts to leave behind]
- Verification: [binary eval, trace assertion, artifact check]
- Stop condition: [budget, stable high score, blocker, reset conditions]
- Recovery/Handoff: [frontier/candidate identity, owned paths, compare-before-restore, resumability]
```

## `recovery.json`

For mutating or resumable runs, record enough state to recover without overwriting unrelated work:

```json
{
  "generation": 3,
  "last_finalized_iteration": 2,
  "cursor": "evaluate-candidate-3",
  "frontier_identity": "sha256:...",
  "candidate_identity": "sha256:...",
  "config_identity": "sha256:...",
  "eval_identity": "sha256:...",
  "environment_identity": "sha256:...",
  "owned_paths": ["skills/diagram-generator/SKILL.md"],
  "artifact_digests": {"results.json": "sha256:..."},
  "cleanup_status": "pending",
  "rollback_status": "not-required",
  "redactions": ["environment values omitted"],
  "resume_disposition": "resumable",
  "resume_checks": ["frontier", "candidate", "config", "eval", "environment", "ownership", "artifacts", "cleanup"]
}
```

Allowed `resume_disposition` values are `resumable`, `manual_recovery`, and `non_resumable`. Use `resumable` only after every declared resume check passes. If compare-before-restore detects an unexpected postimage, do not overwrite it; preserve both identities and record `rollback-error`.

## `source-ledger.md`

Create this when provider/runtime/current claims, external documents, or security/compliance claims influence a mutation or KEEP decision.

```markdown
| # | Source | URL/path | Date/freshness | Grade | Claim supported | Used in experiment |
|---:|---|---|---|---|---|---|
```

## `trace-summary.md`

Create this when tool use, delegation, or parallel evaluation affects correctness.

```markdown
| Assertion | Evidence | Pass? |
|---|---|---|
| read_before_mutation | [files read before edit] | yes/no |
| baseline_before_edit | [experiment 0 artifact] | yes/no |
| stable_eval_set | [prompt/eval hash or reset event] | yes/no |
| one_mutation | [changelog experiment entry] | yes/no |
| source_guard | [ledger / no external claims] | yes/no |
| parent_verifies | [final verification command/output] | yes/no |
```

## `results.tsv`

A tab-separated file with the following header:

```text
experiment	commit	score	max_score	pass_rate	metric_status	metric	delta	guard	cleanup	rollback	status	description
```

Example:

```text
experiment	commit	score	max_score	pass_rate	metric_status	metric	delta	guard	cleanup	rollback	status	description
0	a1b2c3d	14	20	70.0%	valid	70.0	0.0	pass	pass	not-required	baseline	원본 스킬 - 수정 없음
1	b2c3d4e	16	20	80.0%	valid	80.0	+10.0	pass	pass	not-required	keep	번호 매기기 실패를 막는 anti-pattern 추가
2	-	16	20	80.0%	valid	80.0	0.0	pass	pass	pass	discard	레이아웃 지침을 앞으로 옮겼지만 측정 가능한 이득 없음
```

## `results.json`

Required minimum shape:

```json
{
  "skill_name": "diagram-generator",
  "status": "running",
  "current_experiment": 3,
  "baseline_score": 70.0,
  "best_score": 90.0,
  "metric_direction": "higher_is_better",
  "last_statuses": ["baseline", "keep", "discard"],
  "best_experiment": 1,
  "experiments": [
    {
      "id": 0,
      "commit": "a1b2c3d",
      "score": 14,
      "max_score": 20,
      "metric": 70.0,
      "metric_status": "valid",
      "delta": 0.0,
      "pass_rate": 70.0,
      "guard": "pass",
      "guard_metric": null,
      "cleanup": "pass",
      "rollback": "not-required",
      "status": "baseline",
      "description": "원본 스킬 - 수정 없음"
    }
  ],
  "run_contract_path": "run-contract.md",
  "source_ledger_path": "source-ledger.md",
  "trace_summary_path": "trace-summary.md",
  "recovery_path": "recovery.json",
  "last_finalized_iteration": 2,
  "terminal_reason": null,
  "resume_disposition": "resumable",
  "score_explanation": {
    "summary_ko": "기준 70.0%에서 최고 90.0%로 +20.0%p 상승했습니다.",
    "baseline_score": 70.0,
    "final_score": 90.0,
    "delta": 20.0,
    "best_experiment": 1,
    "most_effective_change_ko": "트리거 경계 예시와 검증 기준을 보강했습니다.",
    "changed_files": ["skills/diagram-generator/SKILL.md"],
    "improvements": [
      {
        "area_ko": "트리거 경계",
        "score_delta": 2,
        "before_ko": "경계 요청이 모호했습니다.",
        "after_ko": "긍정/부정/경계 예시가 분리되었습니다.",
        "evidence_ko": "EVAL 1 통과 수가 증가했습니다.",
        "files": ["skills/diagram-generator/SKILL.md"]
      }
    ],
    "remaining_failures_ko": []
  },
  "eval_breakdown": [
    {
      "name": "텍스트 가독성",
      "pass_count": 8,
      "total": 10
    }
  ]
}
```

`score_explanation` is required when `status` is `complete` unless an equivalent `score-explanation.md` is present and loaded through `results.js`. Its human-readable values must be Korean.

Status values:

- `running`
- `idle`
- `complete`

Experiment status values:

- `baseline`
- `keep`
- `keep-reworked`
- `discard`
- `tie`
- `inconclusive`
- `candidate-crash`
- `infra-flake`
- `timeout`
- `signaled`
- `no-op`
- `hook-blocked`
- `metric-error`
- `guard-failed`
- `guard-error`
- `cleanup-error`
- `rollback-error`
- `reset`

Keep process completion, metric validity/value, each mandatory Guard, cleanup, rollback, and final decision in distinct fields. A higher metric cannot compensate for any failed/error Guard or incomplete cleanup/recovery. Write the iteration result and `last_finalized_iteration` atomically before promoting the candidate or declaring a terminal state.

## `dashboard.html`

Generate one self-contained HTML file with inline CSS and JavaScript and no external CDN.

Do not hand-build an arbitrary different dashboard on every run. Materialize `dashboard.html` from the canonical template and keep layout and loading behavior stable.

Required behavior:

- Auto-refresh every 10 seconds
- Read `results.json`
- Render score trend as a line chart with the built-in Canvas API
- Render color bars for each experiment
- Show the experiment table
- Show pass counts by eval
- Show current run status
- Show score movement summary, exact delta, best experiment, changed files, and per-area improvement reasons when available
- Reflect the `running`, `idle`, and `complete` states from `results.json`
- Render correctly when opened directly as `file://` in Chrome or another browser

Lifecycle rules:

- Render `dashboard.html` from `skills/autoresearch-skill/assets/dashboard-template.html`
- Use `skills/autoresearch-skill/scripts/render-dashboard.mjs <artifact-dir>` as the default renderer
- After creating `dashboard.html`, open it immediately if the runtime makes that safe
- After each experiment, update `results.tsv` and `results.json`
- Keep `score-explanation.md` and `final-report.md` current for completed runs, unless the same score explanation is fully represented in `results.json.score_explanation`
- If source/tool/delegation affects the run, also keep `run-contract.md`, `source-ledger.md`, and `trace-summary.md` current
- While an experiment is running, keep `results.json.status` set to `running`
- When the loop ends, set `results.json.status` to `complete` only after the last iteration, terminal reason, cleanup/rollback receipts, and resumability disposition are finalized
- When opening the dashboard through `file://`, do not rely only on `fetch("./results.json")`
- Provide a file-based fallback such as `results.js` that assigns the same data to a browser global
- If a fallback file exists, always keep `results.js` synchronized with `results.json`
- Do not edit the HTML template directly for long detailed content; write it to `details/*.md`, `details/*.txt`, `details/*.json`, `details/*.tsv`, `details/*.log`, or standard log files, then let the renderer load it into `results.js`
- Render detailed logs with the dashboard's safe Markdown subset (`#` headings, bold, inline code, fenced code, lists, and simple tables) after escaping raw HTML, so tags or prompts in experiment output cannot gain script authority

## Detailed content files

Separate detailed reasoning, prompt packs, raw eval results, failure output, and manual reviews as follows.

```text
details/
|-- prompt-pack.md
|-- eval-results.tsv
|-- failure-excerpts.md
`-- architect-review.json
```

Recommended principles:

- Keep core metrics and status in `results.json`.
- Put long human-readable explanations in `details/` or standard log files.
- Keep `dashboard-template.html` as a presentation template only; do not hardcode per-run content into it.
- Rerun `scripts/render-dashboard.mjs <artifact-dir>` to synchronize `dashboard.html` and `results.js`.

Recommended browser-safety pattern:

- Prefer `fetch("./results.json")` when served over HTTP
- Load `results.js` when opened directly from disk
- Both paths must show the same result data, not separate state

Recommended render order:

```bash
skills/autoresearch-skill/scripts/render-dashboard.mjs .hyper/autoresearch-skill/my-skill
open .hyper/autoresearch-skill/my-skill/dashboard.html
```

Recommended style:

- White or near-white background
- Soft accent colors
- Clean sans-serif typography
- Status colors that make baseline, keep, and discard easy to distinguish

Chart guide:

- Use the built-in Canvas API
- X-axis: experiment number
- Y-axis: pass rate %

## `score-explanation.md` and `final-report.md`

Use [reporting-and-score-explanation.md](reporting-and-score-explanation.md) for the required Korean templates. The short version may live in `results.json.score_explanation`, but the dashboard and final answer must still expose where and how the score rose, what changed, and why the changes were kept.

## `changelog.md`

Add one entry per experiment:

```markdown
## Experiment [N] - [keep/discard]

**Score:** [X]/[max] ([percent]%)
**Change:** [one-line mutation summary]
**Reasoning:** [why this change was expected to help]
**Result:** [which evals improved, stayed the same, or regressed]
**Failing outputs:** [remaining failures, if any]
**Evidence/Trace:** [source ledger or trace assertion changes, if any]
```

## Worked Example

Example summary for a diagram skill:

- Baseline: `32/40 (80%)`
- Experiment 1 keep: the rule against numbering improved numbering failures
- Experiment 2 discard: the font-size requirement only added complexity and had weak benefit
- Experiment 3 keep: concrete pastel palette examples improved color compliance
- Experiment 4 discard: duplicate anti-color rules had no effect
- Experiment 5 keep: the worked example improved consistency and reached `97.5%`

Leave reasoning in the changelog so later agents do not repeat the same dead ends.
