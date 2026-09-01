# Runtime CLI Evidence for Agent Launches

Read this reference only when launching a coding agent through an Orca terminal or when a
model, thinking, credential, or quota rule depends on the target CLI.

## Evidence ledger

| Source | Observed version/date | Supported claim | Caveat |
|---|---|---|---|
| Local `orca status --json`, `orca skills get orchestration --full`, `worker-start/dispatch/dispatch-show/terminal create/show/wait/send --help` | Orca 1.4.192, 2026-08-30 | Native `worker-start --agent` is for configured TUI agents. Low-level Dispatch takes `--task` and `--to`; `dispatch-show --task --preamble` returns the exact current preamble. | Orca exposes no observed public arbitrary-agent/template registration surface. `worker-start --terminal` can return `agent_unconfigured` for OMO; do not retry it. |
| Local `omo --version`, `omo --help` | OMO 5.0.0-0.beta.26, 2026-08-30 | OMO exposes `--model`, `--thinking`, `--permission-preset`, and `--no-model-fallback`. | This recheck did not run auth or catalog commands. Help-token availability does not prove model availability, credential readiness, allowance, or actual startup model. |
| Local `gjc --version`, `gjc launch --help`, `gjc accounts --help` | GJC 0.15.6, 2026-08-30 | GJC exposes `--model`, `--thinking`, `--smol`, `--slow`, `--plan`, `--mpreset`, `--credential`, and `--prefer-credential`; account checks are available. | This recheck did not run account or model catalog probes. Capability help is not credential readiness or quota balance. |
| Official Orca orchestration docs and issue [#14952](https://github.com/stablyai/orca/issues/14952) | Retrieved 2026-08-30 | The public docs describe native `worker-start` and low-level Dispatch; the issue requests custom/vendor agent registration rather than documenting one. | These are supporting evidence only. The installed runtime help and observed result take precedence. |
| Live read-only OMO custom-dispatch run | Orca 1.4.192 / OMO beta 5.0.0-0.beta.26, 2026-08-30 | A terminal launched with `omo --model opencodex/gpt-5.6-sol --thinking high --permission-preset workspace --no-model-fallback` reached `tui-idle`; low-level Dispatch was created without injection; returned preamble was accepted as 4943 bytes; OMO reported Working then sent accepted `worker_done`, completing Task and Dispatch while the tab remained open. | One read-only run; recheck runtime behavior before applying to later Orca/OMO versions. |
| Local `orca status --json`, `orchestration check/worker-show/worker-read/send/worker-start --help`, `terminal read/wait --help` | Orca 1.4.193 / OMO 5.0.0-0.beta.31, 2026-09-01 | Supervision primitives exist with their semantics: `check --wait` timeout is a checkpoint not a failure and `{count:0}` means no matching message, 15s keepalive is liveness not progress; `worker-show --dispatch` state plus `observation.agentWait` (null = looked and found no wait; absent = never looked; a waiting worker is healthy, not failed) enables conditional recovery; `worker-read --source/--cursor/--limit` for bounded change detection with source_changed handling; `send --to dispatch:<id>` relays attempt-specific coordinator guidance; `worker-start --retry-of` links a replacement attempt without inheriting placement, for native failed|stopped only; `terminal read --cursor/--limit` deltas and `--screen` frames (mutually exclusive) give change/Working-marker signals; heartbeat/status are alive-not-done signals. | Help-token availability does not prove runtime behavior or defaults; recheck before applying to later Orca/OMO versions. |
| Isolated W1.8b nudge probe: test OMO custom-dispatch terminal, one minimal task plus one post-completion status query via `terminal send` | Orca 1.4.193 / OMO 5.0.0-0.beta.31, 2026-09-01 | The documented custom nudge procedure is safe on an idle custom-dispatch screen: after an accepted `worker_done` (Task and Dispatch `completed`), one `terminal send` status query was accepted (110 bytes, receipt shown), the OMO worker replied on screen with a single idle-phase line within 90 seconds, no composer draft contamination appeared in `--screen` output, no TUI artifacts, no new Working marker, and no follow-up orchestration mail was generated - the worker did not misread the query as a new task. Supports read-before-send plus the single status-query wording in the SKILL.md Supervision loop. | Single isolated probe with test wording on an idle screen only; mid-task busy screens were not probed, and one model (opencodex/combo/glm-5.3-flash) was used. Recheck before generalizing to busy screens, other models, or later versions. Evidence: `.omo/evidence/w18b-nudge-probe/`. |

The table is local command evidence, not authorization to expose credentials or incur paid
requests. Re-run `scripts/check-runtime-capabilities.mjs --json` before relying on volatile
flags, then run any model/catalog/readiness check required by the actual task. The script's
version values are observations, not pass/fail pins. Do not change an observed date unless the
named command was rechecked.

## Orca patterns

For an Orca-known agent in a separate worktree, use the agent-first path documented by the
live CLI:

```text
ORCA worktree create --name <task-name> --agent <known-agent> --prompt "<task>" --json
```

For an unregistered agent, first reuse an eligible existing terminal if the user supplied one;
otherwise create exactly one terminal for the agent. Replace each placeholder with validated
values; never copy the placeholder tokens literally. Terminal creation alone is not task
delivery: complete the Dispatch/preamble/send protocol below before claiming the worker began.

```text
ORCA worktree create --name <task-name> --no-parent --json
ORCA terminal create --worktree id:<repoId>::<worktreePath> --title <agent-title> --command "<validated-agent-command>" --json
ORCA terminal wait --terminal <handle> --for tui-idle --timeout-ms 60000 --json
ORCA orchestration task-create --spec "<task specification>" --json
ORCA orchestration dispatch --task <task-id> --to <handle> --json
ORCA orchestration dispatch-show --task <task-id> --preamble --json
ORCA terminal send --terminal <handle> --text "<exact preamble + task specification>" --enter --json
```

For the active worktree, omit worktree creation and target `--worktree active` in terminal
creation. The start command owns model and effort flags; the delivered text is the task, not
shell syntax.

## Unregistered OMO terminal

The normal `worker-start` composition is unavailable for OMO when Orca does not recognize OMO
as a first-class agent. Orca currently has no documented public configuration surface for
registering OMO as a first-class worker-start agent. Use the unregistered CLI path until Orca
exposes a supported registration mechanism. Do not use either command below after this status
is known:

```text
ORCA orchestration worker-start --task <task_id> --worktree current --agent omo --json
ORCA orchestration worker-start --task <task_id> --terminal <omo-handle> --json
```

The second form can fail with `agent_unconfigured` / `Terminal ... is not running a recognized
agent`. Use the custom-dispatch sequence in [`../rules/agent-selection.md`](../rules/agent-selection.md):
reuse the existing tab when supplied, dispatch without `--inject`, retrieve the exact preamble
through `dispatch-show --preamble`, send that preamble plus Task spec, then wait for the
Dispatch lifecycle signals. This preserves the existing OMO tab but does not provide native
launch receipt or `launch.requested/effective` semantics.

The current `dispatch-show` syntax is `--task <task-id> --preamble --json`; do not pass
`--run`. In the observed run, the returned preamble already included `=== TASK ===` and the
complete Task specification. Send the returned preamble exactly once rather than assuming a
second spec append is required. After accepted delivery, `worker-show` reported
`unsupervised/context_only` with `terminalResource: null` while `worker-read` reported terminal
`running`, liveness `live`; that is normal low-level ownership. Accepted `worker_done` changed
both Task and Dispatch to `completed` without closing the OMO tab.

`worker-release --dispatch <dispatch-id>` closes only a settled coordinator-owned native worker
terminal. For a settled low-level Dispatch it reports retained/no owned resource and does not
close the custom tab. The parent must decide reuse, explicit retention, or closing only a
verified parent-created custom terminal with `terminal close --terminal <handle> --json`.
The actual user-owned OMO tab from the observed run must remain open until the user requests
closure.

## OMO command construction

Validate candidate models with `omo --list-models`. Validate a provider before using it:

```text
omo auth check --provider <provider> --json
```

Valid launch shapes from the observed CLI include:

```text
omo --model <provider/model-or-pattern> --thinking <off|minimal|low|medium|high|xhigh|max>
omo --model <provider/model-or-pattern>:<thinking>
```

The first shape is preferred in generated commands because the model and thinking arguments
remain separately inspectable. Do not put the initial task in this command when the Orca
workflow will send the exact Dispatch preamble plus Task specification after `tui-idle`.
Include `--permission-preset workspace --no-model-fallback` whenever the user explicitly
requests the workspace policy and no fallback. Under this skill's explicit OMO policy, Sol
uses `medium`-`high` and Terra uses `medium`-`xhigh`; reject explicit values outside those
ranges.

## GJC command construction

Validate candidates with `gjc --list-models`; its output lists model/provider capabilities,
including available thinking levels. Inspect account readiness before choosing a provider:

```text
gjc accounts check --json
gjc stats --json
```

Valid launch shapes from the observed CLI include:

```text
gjc --model <model> --thinking <minimal|low|medium|high|xhigh|max>
gjc --mpreset <profile>
gjc --model <model> --smol <fast-model> --slow <reasoning-model> --plan <planning-model>
gjc --prefer-credential <authorized-selector>
```

`--default` persists a model profile and is forbidden unless the user explicitly asks for a
persistent default. A failed account check or `unknown` API-key probe is not permission to
probe the provider with a paid task.

## Failure classification

| Observation | Meaning | Required response |
|---|---|---|
| Binary missing or help fails | The target CLI cannot be safely configured. | Stop before creating an agent terminal and report the exact error. |
| Model missing or effort absent from catalog | Requested configuration is incompatible. | For explicit input, ask for a verified alternative; for automatic input, omit the flag or select a verified lower effort. |
| Credential `failed` or `not_ready` | Authentication is unavailable. | Stop or choose only a configured, authorized ready provider in automatic mode. |
| Credential `unknown` | Readiness cannot be measured. | Do not claim quota/readiness; use only an already configured default if the user authorizes attempting it. |
| Quota/rate-limit terminal error | A real request was rejected by provider allowance/rate. | Follow the one-shot fallback boundary in [`../rules/agent-selection.md`](../rules/agent-selection.md). |
| `agent_unconfigured` on existing OMO terminal | Orca cannot prove a recognized agent identity, so native worker lifecycle cannot attach. | Do not retry `worker-start` or switch agents. Use custom Dispatch without `--inject`, or block if native lifecycle is required. |
| Dispatch created but preamble unavailable | A Dispatch exists but no safe custom-worker prompt is available. | Preserve the Dispatch and terminal; do not send a partial prompt. Follow Orca's exact recovery action. |
| Prompt-send failure after Dispatch | Delivery is unknown, so another Dispatch or duplicate prompt could create duplicate work. | Preserve the Dispatch, inspect exact terminal/Dispatch state, and follow the returned recovery action. |
| `tui-idle` wait timeout | Agent is not ready to receive a prompt. | Read the one terminal once, report the blocker, and do not send blindly. |
