# Hermes Agent Kanban

> Korean version: [`KANBAN.ko.md`](KANBAN.ko.md)
>
> **Research date:** 2026-08-24, against Hermes Agent's official documentation only. **Facts** describe the documented Kanban behavior; **Recommendations** are operational advice. Commands, settings, defaults, and the dashboard surface are version-sensitive — confirm them with `hermes kanban --help` and the linked official references before automating.

## Primary sources

- [Kanban — Multi-Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban)
- [Kanban Tutorial](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-tutorial)
- [Kanban worker lanes](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-worker-lanes)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)

## What Kanban is

**Fact:** Hermes Kanban is a durable, SQLite-backed task board for coordinating named Hermes profiles. The default board persists at `~/.hermes/kanban.db`; additional boards persist at `~/.hermes/kanban/boards/<slug>/kanban.db`. A task, comment, dependency, run, event, and handoff is durable state rather than transient parent-session context.

**Fact:** it has three surfaces over the same per-board database:

| Actor | Surface | Use it for |
| --- | --- | --- |
| Human, script, cron | `hermes kanban …`, `/kanban …`, or dashboard | Creating, inspecting, routing, and supervising work |
| Dispatcher-spawned worker | Dedicated `kanban_*` tools | Reading, heartbeating, handing off, reviewing, completing, or blocking its assigned task |
| Orchestrator profile | The `kanban` toolset | Decomposing work, creating/linking children, and routing the graph |

**Fact — do not mix the interfaces:** a spawned worker operates through tools such as `kanban_show` and `kanban_complete`, not by shelling out to `hermes kanban`. The dispatcher sets `HERMES_KANBAN_TASK`, `HERMES_KANBAN_BOARD`, DB, workspace, run, claim-lock, profile, and optional tenant values for that worker. Regular chat sessions have no Kanban-tool schema unless their profile explicitly enables the `kanban` toolset.

## When to choose Kanban

| Use `delegate_task` when | Use Kanban when |
| --- | --- |
| A parent needs one short child answer before continuing | Work crosses agent or human boundaries |
| Parent and child can safely join in one live context | Work must survive process restarts or context compression |
| One anonymous, one-shot subagent is sufficient | Named profiles need persistent identity or memory |
| No durable audit trail or follow-up routing is needed | You need dependencies, review, retry, human unblock, or historical inspection |

**Fact:** `delegate_task` is a fork-and-join RPC-style call; Kanban is a peer-readable durable queue and state machine. A Kanban worker may still use `delegate_task` internally.

**Recommendation:** choose Kanban for a workflow that could plausibly stop overnight, need a different role tomorrow, or need an operator to understand what happened without recovering a parent transcript.

## Core model

**Fact:** a task has a title, optional body, one assignee profile, optional tenant, optional idempotency key, optional priority/workspace/model/skills, links to parents or children, comments, runs, and events. The documented core lifecycle is `triage → todo → ready → running → review | blocked | done | archived`; the CLI also exposes `schedule` for time-delay/follow-up work.

| Concept | Meaning |
| --- | --- |
| Board | A hard-isolated project/domain queue with its own database, logs, workspaces, and attachment root |
| Task | One durable card; a worker may have several runs over its lifetime |
| Link | A parent → child dependency; completed parents promote a waiting child from `todo` to `ready` |
| Comment | Durable human/agent handoff; included in worker context on claim |
| Run | One worker attempt with outcome, profile, timestamps, log path, summary, and metadata |
| Tenant | A soft namespace inside a board; useful filtering, not a board-level security boundary |

**Fact:** boards are the hard isolation boundary. Workers inherit `HERMES_KANBAN_BOARD` and Kanban tools read that board only; links across boards are rejected. Tenant names only scope task data inside one board and should not be treated as security isolation.

## Setup and first task

```bash
# `init` is idempotent; any other Kanban CLI action also auto-initializes.
hermes kanban init

# The gateway hosts the dispatcher by default.
hermes gateway start

# Human or automation creates the card.
hermes kanban create "Research customer churn" \
  --assignee researcher \
  --body "Return a cited one-page analysis and named follow-up risks."

# Inspect and monitor from the human surface.
hermes kanban list
hermes kanban watch
hermes kanban stats
```

**Fact:** the gateway-embedded dispatcher is the default (`kanban.dispatch_in_gateway: true`) and sweeps boards every `60` seconds by default. `ready` work remains ready while the gateway is down. `hermes kanban daemon` is deprecated; running it together with the embedded dispatcher against the same database is unsupported and can create claim races.

```yaml
# ~/.hermes/config.yaml
kanban:
  dispatch_in_gateway: true       # default
  dispatch_interval_seconds: 60   # default
  review_dispatch: true           # default: assigned reviewer gets bundled sdlc-review
```

**Recommendation:** operate one dispatcher per database. Do not use the legacy standalone daemon as a second "backup" dispatcher.

## Boards and resolution

```bash
hermes kanban boards list
hermes kanban boards create product-api \
  --name "Product API" --description "Service delivery" --switch
hermes kanban --board product-api create "Add health check" --assignee backend
hermes kanban boards switch product-api
hermes kanban boards show
hermes kanban boards rm product-api          # recoverable archive
hermes kanban boards rm product-api --delete # permanent deletion
```

**Fact:** board resolution is, in precedence order: explicit `--board <slug>`, `HERMES_KANBAN_BOARD`, `~/.hermes/kanban/current`, then `default`. Slugs allow lowercase alphanumerics, hyphens, and underscores; they are 1–64 characters, must start alphanumeric, auto-downcase uppercase input, and reject path-like values.

**Fact:** `boards rm` archives a non-default board under `boards/_archived/<slug>-<timestamp>/` by default. `--delete` hard-deletes it; the `default` board cannot be removed through this command.

## Create, link, and route work

```bash
SCHEMA=$(hermes kanban create "Design auth schema" \
  --assignee backend --tenant auth --priority 2 --json | jq -r .id)

API=$(hermes kanban create "Implement auth API" \
  --assignee backend --tenant auth --parent "$SCHEMA" --json | jq -r .id)

hermes kanban create "Test auth API" \
  --assignee qa --tenant auth --parent "$API" \
  --body "Cover success, wrong password, expired token, and concurrent refresh."
```

**Fact:** a child with unfinished parents remains `todo`; after every parent is `done`, the dispatcher promotes it to `ready`. `hermes kanban link <parent> <child>` adds a same-board dependency and rejects cycles. A child of an already-done parent can enter `ready` immediately.

**Fact:** `--idempotency-key` deduplicates automated creates: a later create with the same key returns the existing task instead of creating a duplicate.

**Fact — documented conflict:** the feature guide documents `hermes kanban schedule <id> --at <ISO8601>` as setting a task's `scheduled_at` time, while the CLI reference describes `schedule <id> "<reason>"` as moving work to a `scheduled` status. Use the dedicated feature guide's `--at` form and confirm the installed signature with `hermes kanban --help`; do not automate an assumed `scheduled` status.

**Fact:** core human/automation operations include `list`, `show`, `assign`, `link`, `unlink`, `claim`, `comment`, `complete`, `block`, `request-review`, `request-changes`, `reopen-review`, `schedule`, `unblock`, `archive`, `tail`, `runs`, `dispatch`, `context`, `specify`, `decompose`, `gc`, and board commands. Use `hermes kanban --help` for the installed flag set.

## Workspace and attachments

| Workspace form | Behavior | Retained after completion |
| --- | --- | --- |
| `scratch` (default) | Fresh temporary directory under the board workspace root | No; declared completion artifacts are copied to durable attachment storage first |
| `worktree` | Git worktree under `.worktrees/<task-id>/` | Yes |
| `worktree:<path>` | A pinned worktree path | Yes |
| `dir:<absolute-path>` | Existing trusted local directory | Yes |

**Fact:** `dir:` requires an absolute path. Relative paths are rejected at dispatch because resolving them from an arbitrary dispatcher CWD is ambiguous and creates a confused-deputy escape. A `dir:` path is otherwise trusted under the single-host/local-user model: the worker runs with the operator's user identity.

**Fact:** scratch is intentionally ephemeral. `kanban_complete(artifacts=[...])` copies declared files into durable task attachment storage before cleanup; an absent declared scratch artifact leaves the task in flight so the worker can correct the path. Use `worktree` or `dir:` whenever the whole workspace must remain inspectable.

**Fact:** dashboard uploads and tool attachments are capped at 25 MB and are stored per task. A local worker receives attachment absolute paths in its context. Remote terminal backends need the board attachment directory mounted into the sandbox before those paths can be read.

**Recommendation:** use `worktree` for code changes, `dir:<absolute-path>` only for a deliberately shared trusted workspace, and scratch for disposable research or transformations whose declared deliverables are enough.

## Worker protocol and handoff

**Fact:** spawned workers receive a `KANBAN_GUIDANCE` system-prompt block automatically; no per-profile skill installation is required for the lifecycle. A healthy worker must terminate its run with exactly one lifecycle operation:

| Tool | Outcome |
| --- | --- |
| `kanban_complete(summary=..., metadata=...)` | Task reaches `done` |
| `kanban_request_review(summary=..., metadata=..., reviewer=...)` | Same card enters `review` |
| `kanban_block(reason=...)` | Task waits in `blocked` for a real external/human resolution |

**Fact:** workers use `kanban_show()` first, operate in `$HERMES_KANBAN_WORKSPACE`, call `kanban_heartbeat()` during long work, then complete or block. If a worker exits normally while its task is still running, Hermes records a protocol violation, injects up to two completion/block nudges, and applies a bounded retry before auto-blocking instead of looping forever.

**Fact:** workers running longer than one hour should heartbeat at least hourly. The dispatcher documents a `kanban.dispatch_stale_timeout_seconds` default of four hours with no heartbeat in the last hour before reclaiming; the worker-lane contract separately documents a 15-minute default claim TTL that only reclaims a dead PID and extends a live worker's claim. Do not treat either setting as permission to leave work unreported.

```text
summary: what changed or was concluded
metadata: changed_files, verification, dependencies, retry_notes, residual_risk
```

**Recommendation:** write enough structured handoff evidence for the next worker or reviewer to answer: what changed, how it was checked, what can unblock/retry it, and what risk remains. Do not put secrets, tokens, raw PII, or whole logs in task bodies, comments, summaries, metadata, or attachments; task rows and run histories are durable.

## Review, block, and recovery

**Fact:** review is not a block. A same-card implementation uses `kanban_request_review`; the reviewer approves with `kanban_complete`, requests actionable rework with `kanban_request_changes`, or blocks only for an external escalation. An alternative graph is a pre-created downstream review/QA card: complete the implementation parent so the child can promote. Do not combine both review models for one phase.

**Fact:** `kanban_block` routes a dependency blocker back through dependency gating and surfaces `needs_input`, `capability`, or `transient` blockers to a human. `kanban_unblock` restores the source phase — `review`, `ready`, or `todo` while parents are open — rather than routing directly to `triage`. Repeated same-cause block/unblock cycles eventually route to `triage` under a deterministic recurrence breaker (documented default `2`).

**Fact:** the dispatcher reclaims crashed workers, tracks run history, and auto-blocks a task after consecutive spawn failures. `kanban.failure_limit` defaults to `2`, unless a task supplies `--max-retries`. A worker-lane contract also documents `max_runtime_seconds` as a per-run wall-clock cap and `hermes kanban diagnostics` for ready tasks stranded past `kanban.stranded_threshold_seconds` (default 30 minutes).

## Triage, decomposition, and goal mode

**Fact:** Triage cards are rough ideas. With `kanban.auto_decompose: true` (default), the dispatcher invokes the built-in decomposer each tick, up to `kanban.auto_decompose_per_tick: 3` cards; it uses `auxiliary.kanban_decomposer`, profile descriptions, and a task graph. Manual mode leaves cards in triage until `hermes kanban decompose <id>` or dashboard/slash-command action. `hermes kanban specify <id>` rewrites a single task into goal, approach, and acceptance criteria before promoting it to `todo`.

**Fact:** `kanban.orchestrator_profile` chooses who owns the root after fan-out; it does not load that profile's prompt or skills into the built-in decomposer. If an LLM selects an unknown profile, `kanban.default_assignee`, then the active default profile, is the documented fallback. Profile descriptions improve routing; the orchestrator should verify available profiles before creating cards.

**Fact:** `--goal` runs a card in an in-session goal loop. An auxiliary judge evaluates card title/body acceptance criteria after each turn until completion, task termination, or the turn budget; `--goal-max-turns` defaults to `20`, and an exhausted budget blocks the card for human review. It shares the `/goal` engine but not `/goal` state.

**Recommendation:** use auto-decomposition only after profile names and descriptions are accurate. For independent implementation cards, place shared design decisions and acceptance criteria in every child body because workers cannot see sibling cards.

## Dashboard and operations

**Fact:** `hermes dashboard` exposes the bundled Kanban dashboard plugin after board initialization. The dashboard, CLI, slash command, and worker tools all route writes through the same `kanban_db` layer. The dashboard displays status columns, task drawers, attachments, dependencies, comments, run history, filters, profile lanes, and a dispatcher nudge; destructive moves prompt for confirmation.

**Fact — documented security conflict:** the dashboard REST table describes plugin routes as protected by the dashboard's ephemeral session token, but the security model states that dashboard HTTP authentication explicitly skips `/api/plugins/`; only the Kanban WebSocket requires the ephemeral session token. Treat the security-model explanation as authoritative: plugin routes are reachable by any process on the host when the dashboard uses its localhost default. Do not run `hermes dashboard --host 0.0.0.0` on a shared host; a reachable attacker can read the collaboration surface and create, reassign, or archive tasks.

**Fact:** Kanban tasks are intentionally profile-agnostic on the host: opening a dashboard through any profile shows every profile's board tasks. The markdown renderer escapes input and limits links to `http(s)`/`mailto:` with `rel="noopener noreferrer"`; this does not make task text trusted instruction content.

**Fact:** worker stdout/stderr is stored under the board's `logs/<task-id>.log`; `task_runs` retain log paths, exit status where available, summaries, and metadata, while `task_events` retain lifecycle transitions. Inspect with `hermes kanban show <id>`, `runs <id>`, `tail <id>`, or the dashboard.

## Limits and unsupported assumptions

**Fact:** an external Codex, Claude Code, OpenCode, container runner, or other non-Hermes worker lane is not a paved built-in integration. A plugin can supply a `spawn_fn`, but mapping its process, workspace, authentication, exit behavior, and `kanban_complete`/`kanban_block` contract is integration-specific design work.

**Fact:** Kanban's documented model is single-host and trusted-local-user. It is not a remote multi-tenant security service, a sandbox, or authorization for a worker to access every local directory, mounted credential, or remote backend resource.

**Fact — approval caveat:** the official material documents no Kanban-specific approval gate and does not state how ordinary tool approvals behave inside a dispatcher-spawned non-interactive worker. For unattended gateway, cron, and Kanban workers, the docs recommend `hard_stop_enabled: true` because its default is `false`. Treat unrecorded approval behavior as unknown rather than assuming it auto-denies or auto-approves.

## Operator checklist

- [ ] Choose one board per hard isolation boundary; use tenants only for soft grouping.
- [ ] Create and describe assignee profiles before creating runnable cards.
- [ ] Keep exactly one dispatcher running for each board database.
- [ ] Use `worktree` or a trusted absolute `dir:` workspace for durable code/output; declare scratch artifacts explicitly.
- [ ] Put acceptance criteria and cross-worker design decisions in card bodies.
- [ ] Require structured completion metadata and review handoffs; keep secrets and raw sensitive data out of durable board records.
- [ ] Check `list`, `show`, `runs`, `tail`, or dashboard history before unblocking or retrying.
- [ ] Validate installed commands and flags with `hermes kanban --help` after upgrades.
