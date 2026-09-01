# Agent Launch and Selection Policy

Read this rule whenever Orca will launch, configure, or recover a coding-agent terminal.

## Capability-first launcher decision

1. Resolve the Orca executable and read the version-matched Orca guide before acting.
2. Confirm the Orca runtime is reachable with `status --json`.
3. For an Orca-known native supervised agent, create or bind the Run, create the Task, then
   use `worker-start --task <task-id> --agent <id>`. `worker-start` owns native placement,
   worktree/terminal creation, prompt delivery, and lifecycle. Do not pre-create that same
   worker with `worktree create --agent`, and do not create a throwaway worktree merely to
   test whether an arbitrary id is registered.
4. For a CLI Orca does not register, create a terminal with the agent's validated startup
   command, wait for `tui-idle`, then deliver the task through terminal text input. Keep the
   handle returned by Orca as the sole handle for that agent.
5. Inspect the terminal before a follow-up send unless its next input is unambiguous.

The direct-command path is required for known unregistered CLIs such as `omo` and `gjc`.
It is not evidence that every arbitrary executable is safe to launch: confirm the binary is
available and inspect its `--help` output first.

## Unregistered CLI custom-dispatch worker path

Orca 1.4.192 has no documented public configuration surface for registering OMO as a
first-class `worker-start` agent. Use the unregistered CLI path until Orca exposes a supported
registration mechanism. In particular, never suggest an invented configuration such as
`orca.yaml` plus `--agent omo`, and do not run `worker-start --agent omo` as a registration
probe.

An OMO or other unregistered CLI worker uses low-level Dispatch plus terminal input. Its
Dispatch lifecycle is authoritative only after Orca's exact Dispatch preamble and task spec
are delivered to the agent. The terminal process remains user-owned; no native
`worker-start` launch receipt, owned-terminal cleanup, or `launch.requested`/
`launch.effective` evidence exists for this path.

### Non-negotiable delivery invariant

**Terminal creation is not task delivery. A custom CLI worker is not started until the
terminal is ready, a Dispatch exists, and the exact preamble plus task spec has been
successfully delivered.** Record these transitions independently:

```text
terminal_created -> terminal_ready -> dispatch_created -> prompt_delivered -> worker_active -> worker_completed
```

Do not mark `worker_active` from `terminal create`, `terminal wait`, or `dispatch` alone.
`prompt_delivered` requires the terminal-send receipt and a post-send terminal read showing
the prompt was accepted. `worker_completed` requires the active Dispatch's accepted
`worker_done`, `escalation`, or an exact recovery outcome.

### Existing OMO terminal: reuse, never replace

If the user supplies an existing OMO handle, do not create, close, or replace a terminal.
First inspect and wait on that exact tab:

```text
ORCA terminal show --terminal <omo-handle> --json
ORCA terminal wait --terminal <omo-handle> --for tui-idle --timeout-ms 60000 --json
```

Read the tab before and after waiting. If it is active, waiting for a person, in a different
worktree, has an uncertain identity, or times out, preserve it, report the state, and do not
send a prompt. Do not create a duplicate fallback tab.

### New OMO terminal: explicit command evidence

Create a terminal only when no eligible existing tab was supplied. Before creation, validate
`command -v omo`, `omo --help`, `omo --list-models <requested-model>`, and
`omo auth check --provider <provider> --json`. Preserve the exact requested model, thinking,
permission preset, and `--no-model-fallback` in the terminal command.

For the declared OMO policy, `opencodex/gpt-5.6-sol` permits `medium` through `high`; and
`opencodex/gpt-5.6-terra` permits `medium` through `xhigh`. Reject an explicit value outside
those policy ranges rather than silently coercing it. Examples:

```text
omo --model opencodex/gpt-5.6-sol --thinking high --permission-preset workspace --no-model-fallback
omo --model opencodex/gpt-5.6-terra --thinking xhigh --permission-preset workspace --no-model-fallback
```

`omo --list-models` demonstrates catalog availability, not remaining quota or the eventual
runtime model. Preserve the terminal creation command, requested model/thinking, permission
preset, fallback flag, terminal handle, startup model display/session metadata if available,
and prompt-delivery receipt as launch evidence. Say `verified` only for facts actually shown
by this evidence.

### Low-level Dispatch protocol

Create or bind the coordinator Run, then create one Task per target terminal. For parallel
existing OMO tabs, keep a 1:1 Task/terminal mapping and a distinct prompt-delivery receipt
for each tab. Use the current CLI form without `--inject`:

```text
ORCA orchestration dispatch --task <task-id> --to <terminal-handle> --json
ORCA orchestration dispatch-show --task <task-id> --preamble --json
```

Do not reconstruct IDs, lifecycle commands, or preamble wording. Use the returned exact
preamble and current Task spec as one `terminal send` payload:

```text
ORCA terminal send --terminal <terminal-handle> --text "<exact preamble + task spec>" --enter --json
```

Before composing the payload, inspect the returned preamble. On Orca 1.4.192 the exact
`dispatch-show --task <task-id> --preamble --json` response can already include `=== TASK ===`
and the full Task specification. In that case send the returned preamble once, without
appending the Task spec again. The current `dispatch-show` CLI does **not** accept `--run`;
the Dispatch's Run binding is returned in its receipt. An unsupported `--run` error is a
command-shape error, not a reason to recreate the Task or Dispatch.

After a successful send, read the same terminal and retain both send receipt and observed
acceptance before recording `prompt_delivered` then `worker_active`. The custom prompt must
follow the exact returned preamble. When it calls for lifecycle completion, it must send one
`worker_done` with the active task and Dispatch IDs and an explicit
`--outcome succeeded|failed`; it uses `ask` for blocking questions, `escalation` when blocked,
and idles after completion. If the preamble presents a different command, follow that exact
command instead.

`worker-show` can report `state: unsupervised`, `stage: context_only`, and no terminal-owned
resource for this path even after the OMO terminal accepts the prompt and begins Working. This
is expected because low-level Dispatch did not create the terminal. Treat the terminal's
running/Working evidence as `worker_active`; wait for accepted `worker_done` and verify the
Task plus Dispatch are `completed` before claiming completion. Preserve the tab after that
transition unless the user explicitly asks to close it.

### Failure handling

| Observation | Required response |
|---|---|
| `agent_unconfigured` | This means Orca did not recognize the terminal as a first-class agent; it does not prove OMO failed. Preserve the terminal, never retry `worker-start`, and use the low-level Dispatch protocol. |
| `tui-idle` timeout | Read the same terminal once, report its state, and neither send a prompt nor create another terminal. |
| Dispatch creation failure | Preserve Task and terminal state, do not send a prompt, and report the error with Orca's exact recovery action. |
| `dispatch-show --preamble` failure | Do not send a partial or invented prompt. Preserve the Dispatch and report the exact failure. |
| `dispatch-show` rejects `--run` | The current command does not accept that flag. Re-run the exact supported `--task <task-id> --preamble --json` form; do not recreate state. |
| Prompt-send failure | Preserve the existing Dispatch, inspect its delivery/terminal state, and follow the exact recovery action. Never create another Dispatch or blindly duplicate the prompt. |
| `unsupervised` / `context_only` after accepted send | Low-level Dispatch has no owned terminal resource. Keep supervising the same tab; do not downgrade delivery, replace the tab, or manually settle before accepted lifecycle completion. |
| Confirmed mid-task stall (native) | Follow the Supervision loop recovery ladder in `SKILL.md`: bounded confirmation, at most one nudge, then ladder step 3 only if `worker-show` reports `failed` or `stopped`. |
| Confirmed mid-task stall (custom) | Follow the Supervision loop recovery ladder in `SKILL.md`: bounded confirmation, at most one nudge after read-before-send, then user escalation. Do not auto-redispatch. |
| `worker-show` `failed` or `stopped` | Recovery ladder step 3 in the SKILL.md Supervision loop: native-only `worker-start --task <task> --retry-of <dispatch_id>` once. Repeat `--on`/worktree and `--agent`/terminal choices; do not inherit placement. |
| `outcome_unknown` | Do not auto-replace. Require explicit user approval per the SKILL.md Supervision loop. |
| `terminal_gone` | Runtime healthy plus exact handle absent only. Classify per the SKILL.md Supervision loop and escalate with evidence; never confuse with a runtime outage. |

If native `worker-start` features are strictly required, stop and use a registered Orca agent
or wait for first-class OMO support. Do not cross-agent-fallback merely to obtain lifecycle
features.

## Parent cleanup responsibility

The parent coordinator, not a child worker, is responsible for completing every child session's
lifecycle. As soon as the parent observes accepted `worker_done`, a failed Dispatch, or an
explicit terminal outcome, it must settle that child before checking/waiting again or ending.
Stall-settled children, including `failed`, `stopped`, and `abandoned` outcomes, that the
parent created are also subject to the reuse, release/close, or retain receipt decision.
Leaving a parent-created child open without a settlement receipt after a stall settlement is
prohibited; live abandoned x2 leftovers are the leak precedent.

| Child kind and ownership | Parent action after settlement |
|---|---|
| Native supervised terminal created by `worker-start` | Reuse the exact terminal immediately for a follow-up Dispatch, explicitly retain it when the user asks, or run `worker-release --dispatch <dispatch-id> --json`. Do not call broad `terminal close` instead of a release receipt. |
| Custom-dispatch terminal created by the parent | After verifying the Dispatch is settled and the handle still identifies that same child, reuse it, retain it by explicit user request, or run `terminal close --terminal <handle> --json`. Record the close receipt. |
| Stall-settled parent-created child (`failed`/`stopped`/`abandoned`) | Same reuse/release/retain receipt decision as any other parent-created settlement. Do not leave it open without a settlement receipt. |
| Existing/reused/user-owned custom terminal | Never close it automatically. Record retained/user-owned after Task and Dispatch completion; leave it open unless the user explicitly asks to close it. |
| Setup, coordinator, active, unproven, or stale terminal | Never close it. Report the ownership/state blocker and wait or escalate. |

The child worker's only terminal responsibility is to send the exact completion/failure signal
specified by its preamble, then idle. A `worker_done` does not authorize the child to close its
own session. `worker-release` on a low-level custom Dispatch can return `retained` with no
owned resource; this is expected and does not discharge the parent's explicit decision for a
parent-created custom tab.

## Origin-agent affinity

Default worker selection is pinned to the coding agent that initiated the orchestration. This
is agent affinity, not model affinity. The **effective worker agent** is the originating agent
unless the user explicitly names a different worker agent for a Task. Choose models, thinking
levels, profiles, credentials, and one-shot quota fallback only within that effective agent's
CLI.

1. Determine the origin agent from the active agent session/runtime identity first, then the
   active terminal's startup command, then explicit task context. Record the evidence used.
2. Launch all default workers with that same agent. For example, OMO initiates OMO workers;
   Claude initiates Claude workers. An Orca-known origin uses the known-agent path; a new
   unregistered origin uses the custom-dispatch terminal path above, whether new or existing.
3. A user can override affinity only by explicitly naming the replacement worker agent. The
   override is Task-scoped, is recorded in the launch record, and becomes that Task's
   effective worker agent. A request to select a model, effort, provider, profile, credential,
   or quota fallback does not override the originating agent.
4. If origin detection is ambiguous, the origin CLI is not launchable, or the requested work
   needs a different agent, ask one narrow question or stop with the observed blocker. Never
   default to another coding agent.
5. A quota or rate-limit error can change only the effective worker agent's authorized
   credential, model, or effort under the quota policy. It cannot trigger a fallback to a
   third agent or back to the origin after an explicit override.

This rule applies to all workers created by a coordination request, including parallel
workers. It does not prevent an explicit multi-agent plan supplied by the user.

## Model and thinking precedence

Preserve the user's exact requested model, provider, model profile, credential preference,
and thinking/effort level. Validate them against the target CLI's current catalog and help
output before launch.

- If the requested model is absent, the requested thinking level is unsupported for that
  model, or the credential is unavailable, stop before launch. State the observed constraint
  and offer only verified alternatives.
- Do not silently substitute a cheaper, faster, stronger, or differently billed model for an
  explicit user choice.
- Do not persist a model profile, credential pin, or default setting unless the user asks.
- Quote terminal arguments safely. Treat model ids, profile names, credential selectors, and
  the task text as distinct arguments; never splice untrusted terminal text into a command.

## Automatic selection policy

Automatic mode applies only when the user has not chosen a model or thinking level.

1. Read the CLI's live model catalog and credential-readiness output.
2. Prefer a user-configured model profile or the CLI's existing default when it is ready.
3. Select a named model only when the catalog and credentials make the candidate unambiguous.
   Otherwise omit the model flag and let the ready CLI default choose; report that decision.
4. If a selected model exposes supported effort levels, use `low` for narrow read-only work,
   `medium` for ordinary implementation, and `high` for multi-file, debugging, or
   architecture work. Use `xhigh` or `max` only when the task clearly needs it and the
   catalog supports it. Never infer support from the agent name.
5. If a desired automatic effort is unsupported, choose the nearest lower supported effort.
   If no capability data is available, omit the effort flag instead of guessing.

## Usage and quota policy

Preflight checks must not send a paid test prompt merely to discover allowance.

- Readiness is not remaining quota. Report them separately.
- For GJC, inspect account readiness before launch and use its usage statistics only as
  historical request/token/cost evidence. A configured `--prefer-credential` can provide
  quota fallback only when the user or existing project configuration authorizes that
  credential preference.
- For OMO, inspect authentication readiness and the model catalog. Its current CLI exposes no
  independent remaining-quota command; do not claim that a successful auth check proves an
  allowance remains.
- When automatic selection receives an explicit quota/rate-limit failure, reread the terminal
  error and make at most one fallback attempt using a verified ready alternative. For GJC,
  prefer its authorized credential-fallback capability. For OMO, choose only a verified
  provider/model alternative. Record the original failure and selected fallback.
- If a user-selected model or effort fails for quota/rate limit, do not change it. Report the
  failure and request a model, credential, or wait decision.
- If no verified alternative exists, stop with the actual error. Never retry blindly.

## One-shot recovery boundary

This skill does not run an optimization loop. Rolling supervision waits are checkpoints, not
recovery, and are unbounded until a lifecycle terminal signal. Bounded recovery is limited
to: (1) one automatic quota/rate-limit fallback after a real launch failure, accepted only
when the new terminal reaches `tui-idle` and receives the intended task; and (2) for one
confirmed mid-task stall per Dispatch, at most one nudge and - only for a native worker whose
Dispatch reports `failed` or `stopped` - at most one `--retry-of` replacement.
`outcome_unknown`, custom re-dispatch, abandon, and any second nudge require an explicit user
decision. Otherwise stop and retain the original failure. Expiry of harness/session/lease
boundaries of the parent process is an observation checkpoint, not recovery - on expiry the
parent reports and re-arms or hands the decision to the user, and never classifies the worker
as failed or settles it.

## Required launch record

For each launched agent, retain in the task/worktree record:

- requested or automatic selection mode;
- origin agent, origin-detection evidence, and explicit cross-agent override if one exists;
- worker kind (`native-supervised` or `custom-dispatch`), Dispatch id, exact-preamble receipt,
  state transition record, and prompt-delivery evidence for custom-dispatch workers;
- chosen agent, model, effort, profile, and credential policy (never secret values);
- catalog/readiness checks and their result;
- Orca worktree id and sole terminal handle;
- prompt-delivery result; and
- parent settlement decision (`reused`, `released`, `closed`, or `retained`) and its receipt;
- quota fallback or blocker, if any;
- `workerKind`, terminal ownership (`parent-created`, `reused`, or `user-owned`), and whether
  the supervision contract was embedded;
- heartbeat cadence, stall evidence path, nudge receipts and response, stall classification
  result;
- replacement or settlement decision and its authority source.
