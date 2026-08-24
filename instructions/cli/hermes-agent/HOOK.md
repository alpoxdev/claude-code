# Hermes Agent Hooks

> Korean version: [`HOOK.ko.md`](HOOK.ko.md)
>
> Companion guides: [overview](README.md), [extensions](EXTENSIONS.md), [configuration](CONFIGURATION.md), [plugins](PLUGINS.md), and [plugin authoring](PLUGIN_AUTHORING.md)
> **Research date:** 2026-08-24, against official Hermes Agent documentation and first-party source pinned at [`a0ca7c19204e514f9590ce3b812e029b315ab9e9`](https://github.com/NousResearch/hermes-agent/commit/a0ca7c19204e514f9590ce3b812e029b315ab9e9). **Facts** trace to those sources. **Recommendations** are this guide's operating policy, not Hermes guarantees. Confirm version-sensitive behavior before operating.

## Primary sources

- [Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)
- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [Plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Inbound Webhooks](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks)
- [Pinned Hooks source](https://github.com/NousResearch/hermes-agent/blob/a0ca7c19204e514f9590ce3b812e029b315ab9e9/website/docs/user-guide/features/hooks.md)

## Scope and selection

**Fact:** Hermes documents four distinct lifecycle-hook systems. Choose the narrowest system whose execution and authority match the need; do not conflate outbound lifecycle notifications with inbound webhook routes.

| Need | System | Registration and scope | Can steer execution? |
| --- | --- | --- | --- |
| Gateway-only observation or integration | Gateway hook | `$HERMES_HOME/hooks/<name>/HOOK.yaml` + `handler.py`; Gateway | No ordinary directive contract |
| In-process tool, model, session, or transform policy | Plugin hook | `ctx.register_hook()` from a native plugin; CLI + Gateway | Event-specific; some hooks can block, modify, or request approval |
| Configured command at a lifecycle boundary | Shell hook | `hooks.<event>` in `$HERMES_HOME/config.yaml`; CLI + Gateway | Event-specific; supported `pre_tool_call` directives can control a call |
| HTTP notification to an external receiver | Outbound webhook | `hooks.outbound` in `$HERMES_HOME/config.yaml`; CLI + Gateway | No; notification only |

**Fact:** Inbound webhook gateway routes and route scripts are separate messaging surfaces, not a fifth lifecycle-hook system. Their authentication and untrusted-input model must be evaluated separately.

## Runtime and trust boundary

**Fact:** Hooks are trusted-code extension points, not a security sandbox. Gateway hooks and Python plugin hooks run inside Hermes. Shell hooks run as child processes under the Hermes OS user; this is process separation, not capability restriction. Hermes catches ordinary callback exceptions at several dispatch points, but does not generically isolate hangs, termination, resource exhaustion, shared-state changes, or malicious behavior.

**Recommendation:** Run high-risk hooks under a dedicated non-admin OS account and isolate mutually untrusted deployments with separate processes, service accounts, containers, or hosts. `HERMES_SAFE_MODE` must be described only for registration paths that explicitly check it; it is not a verified kill switch for every hook system.

## Gateway hooks

**Fact:** A gateway hook directory contains `HOOK.yaml` and `handler.py`; `handler.py` exports synchronous or asynchronous `handle(event_type, context)`. The manifest chooses events such as gateway, session, agent, reaction, and `command:*` events. Event payloads are event-specific; selected message or response fields can be truncated, but no universal payload-redaction guarantee exists.

**Fact:** At the pinned revision, matching handlers are invoked serially and awaited by the emitting path. Ordinary handler exceptions are logged and later handlers continue, but Hermes provides no generic gateway-hook timeout, retry, authentication gate, or rollback. Do not describe gateway hooks as unable to block gateway progress.

**Recommendation:** Use gateway hooks for fast observation or safely offloaded side effects. Bound external I/O inside the hook, make effects idempotent, and never use an event name or registration order as a global ordering guarantee across turns, profiles, or processes.

## Plugin hooks

**Fact:** Native plugins register callbacks through `ctx.register_hook(name, callback)` during `register(ctx)`. Plugins can run in CLI and Gateway sessions. Hook payloads are keyword-based and evolve additively; callbacks should accept `**kwargs` rather than assume a closed or positional payload schema.

**Fact:** Return handling is event-specific. Observer hooks ignore returns, transforms use their own contract, and `pre_tool_call` may block, modify shallow tool arguments, or request the existing approval flow. Approval-observer hooks do not themselves veto execution. Plugin callbacks are in-process; an exception can be logged and isolated while a hang or direct side effect still disrupts work.

**Recommendation:** Treat a plugin hook like trusted application code. Grant only needed plugin capabilities, review its source and dependencies, use minimal event payloads, and test the exact event contract rather than extrapolating one hook's authority to another.

## Shell hooks

**Fact:** Shell hooks are configured under `hooks.<event>` in `$HERMES_HOME/config.yaml`. Hermes supplies JSON on stdin and runs the configured command without implicit shell parsing (`shell=False`). The command remains arbitrary executable code and inherits the spawning process environment and OS permissions.

**Fact:** A shell-hook entry can set `command`, a tool matcher for tool events, `timeout`, and `fail_closed`/`failClosed` for supported `pre_tool_call` policy. The documented default timeout is 60 seconds, clamped from 1 to 300 seconds. Failures are normally fail-open; a `pre_tool_call` hook with `fail_closed: true` can block on spawn error, timeout, or nonempty invalid output, and exit code `2` blocks that event.

**Fact:** Shell-hook consent authorizes registration of an `(event, command)` pair, not each execution or the script's content integrity. Changing a referenced script does not invalidate existing consent. `hermes hooks test` executes matching configured hooks; `hermes hooks doctor` can execute an allowlisted hook during a smoke test.

**Recommendation:** Inspect scripts before accepting or testing them. Use `fail_closed: true` only for a tested `pre_tool_call` policy with a bounded timeout. Test successful, spawn-error, timeout, malformed-output, denial, and approval-timeout paths before relying on the hook as a safety control.

## Outbound webhooks

**Fact:** `hooks.outbound` registers asynchronous, notification-only HTTP consumers. A callback serializes a lifecycle payload and cannot return a block, transform, or approval directive. At the pinned revision, delivery uses an in-memory bounded queue and a daemon worker; a slow target can delay other targets, overflow can drop new events, and shutdown has a bounded drain. Treat delivery as best effort, not durable, lossless, at-least-once, or exactly-once.

**Fact:** A target may use `secret_env` or `secret`. Hermes emits `X-Hermes-Signature-256` only when a signing secret resolves; an unset `secret_env` yields an unsigned delivery rather than disabling the target or falling back to inline `secret`. The signature authenticates the raw body relative to that secret; it does not encrypt the payload. Current implementation retries connection failures and 5xx responses once with the same delivery ID; 3xx and 4xx are not retried.

**Recommendation:** Use HTTPS and make receivers idempotent. When authentication is required, reject unsigned requests, verify the exact raw body with `hmac.compare_digest`, enforce a timestamp window, and persist accepted `delivery_id` values for deduplication. Use an external durable queue or broker when the notification is an audit record or must survive process failure.

## Payload, privacy, and inbound boundary

**Fact:** Hook payload sensitivity is event-specific. Payloads can include messages, conversation history, tool arguments/results, model output, paths, identifiers, and secrets embedded in values. Hermes provides no blanket hook-payload redaction guarantee. Outbound signing does not make a payload private.

**Fact:** Inbound webhook verification is route- and scheme-specific. Except for explicit loopback-only `INSECURE_NO_AUTH`, routes require configured secrets. Successful verification proves only that the request satisfied the selected shared-secret scheme; it does not establish that business fields are true, their author is authorized, or their text is safe for an agent. HMAC does not encrypt payloads and body-only schemes do not establish freshness.

**Recommendation:** Treat every inbound message, webhook field, and externally supplied hook value as untrusted agent input, even when authenticated. Select minimum events and constrained toolsets, and review every receiver, log, template, and storage destination before enabling a hook.

## Failure and ordering model

**Fact:** Hermes has no one global hook failure policy or global ordering guarantee. A single dispatcher invocation generally visits its current callbacks sequentially, while each event contract defines its own return precedence. Concurrent calls, retries, queue drops, multiple processes, and profile routing do not preserve a universal order.

| System/event | Bounded behavior at the pinned revision |
| --- | --- |
| Gateway or plugin callback raises ordinary `Exception` | Logs and continues; no rollback or generic timeout |
| Plugin/shell `pre_tool_call` returns valid `block` | Blocks that tool call |
| Shell spawn error or timeout | Allows by default; can block only for configured fail-closed `pre_tool_call` |
| Shell `pre_tool_call` exits `2` | Blocks that tool call |
| Outbound serialization, queue, or HTTP failure | Logs or drops; never vetoes the agent action |

**Recommendation:** Document and test failure behavior for the exact system and event. Include causal metadata, tolerate gaps/duplicates/reordering, and do not infer transactionality or rollback from caught exceptions.

## Profiles and validation

**Fact:** Profile-aware routing scopes Hermes configuration and cooperating credential resolution; it is not a security sandbox between mutually untrusted profiles. Arbitrary hook/plugin code can access shared process or filesystem resources. Do not claim gateway, shell, or outbound hooks are independently isolated per profile.

Before enabling a hook:

1. Identify the hook system, exact event, authority, payload fields, and failure behavior.
2. Review code, command arguments, inherited environment, outbound receiver, and secret source.
3. Confirm the active `$HERMES_HOME`, profile, and relevant approval/allowlist configuration.
4. Exercise the real happy path plus timeout, malformed output, receiver failure, and duplicate/retry behavior in a disposable environment.
5. Re-read the [Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) reference after every Hermes upgrade.

## EXPAND

- Add event-by-event payload tables only after pinning them to the Hermes version in use.
- Add a receiver implementation only with an explicit secret, retention, privacy, replay, and idempotency contract.
- Run `hermes hooks test` or `hermes hooks doctor` only after inspecting their configured scripts; both can execute hook code.
