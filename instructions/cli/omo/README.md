# OMO Runtime Profile

> Korean version: [`README.ko.md`](README.ko.md)

## Scope

This profile documents the local Orca supervision reporter installed at
`~/.omo/agent/extensions/omo-supervision-reporter.ts`. It applies only when a fresh OMO
process runs in an Orca dispatched terminal. It is not a standard OMO capability and does
not describe other hosts or OMO installations.

Shared capability rules remain in [`../capability-contract.md`](../capability-contract.md).

## Local reporter behavior

The reporter uses the direct Orca mail channel (channel A). W1.8b observed that an Orca
Dispatch preamble carries `--from`, `--task-id`, and `--dispatch-id`, and that an OMO child can
send an accepted lifecycle message with those identifiers. Channel B, a status-file relay, is
therefore not installed.

For each new prompt, the reporter parses all three identifiers from the current preamble. It
sends nothing when any identifier is absent, and clears its previous context so a normal
user-owned turn cannot report under a stale Dispatch.

| Event | Direct mail behavior |
|---|---|
| `agent_start` | Sends `status` with phase `active`, then starts heartbeat scheduling. |
| Tool execution start/end | Sends a latest-only `status` update. |
| Every five minutes while active | Sends at most one `heartbeat` with phase `working`. |
| `agent_settled` | Stops heartbeat scheduling and clears Dispatch context. |

Delivery is best effort: reports use `orca orchestration send` with the preamble's sender,
Task, and Dispatch identifiers. A one-second unref'ed command timeout and a latest-only pending
slot ensure a slow or failed receiver neither blocks OMO nor accumulates obsolete reports.

The reporter never sends `worker_done`. The delivered Task preamble remains the only contract
for completion, and the coordinator remains responsible for nudge, replacement, settlement,
and cleanup decisions.

## Installation and verification

Global OMO extension discovery loads the file from `~/.omo/agent/extensions/`. A newly started
OMO process sees the reporter; an existing OMO process must start a new session before it loads
new extension code.

```text
node ~/.omo/agent/orca-pi-adapter/bin/orca-pi-doctor.mjs --json
```

A healthy report lists `omo-supervision-reporter.ts` among the managed global extensions. Then
create a short-lived Orca Dispatch, retrieve its exact preamble, and use
`orca orchestration check --run <run> --types status,heartbeat,worker_done --wait --json` to
observe direct mail before the Task's own completion message.

## Limits and coordinator boundary

- No complete `--from`, `--task-id`, and `--dispatch-id` set means no reporter mail.
- The reporter does not decide that a worker stalled, does not nudge, does not re-dispatch, does
  not start `--retry-of`, and does not close a terminal.
- A status or heartbeat proves liveness only. It never proves meaningful progress or completion.
- Direct-mail delivery was verified on the local Orca/OMO combination only. Recheck the live
  preamble and command capabilities after runtime upgrades.
