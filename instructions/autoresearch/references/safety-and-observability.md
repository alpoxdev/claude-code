# Autoresearch Safety and Observability

> Korean version: [`safety-and-observability.ko.md`](safety-and-observability.ko.md)

An autoresearch loop may repeat only inside an explicit authority, ownership, and evidence boundary. Capability is not authorization, and a nominal rollback verb is not proof of reversibility.

## 1. Workspace identity and ownership

Before baseline, record:

- stable repository/workspace identity and canonical root
- immutable starting state and current retained ref/snapshot
- run ID and artifact directory
- owned and excluded paths/resources
- pre-existing staged, unstaged, untracked, and relevant ignored state
- active operation/lock state

Acknowledging a dirty tree authorizes observation, not mutation. Every pre-existing path is user-owned unless the controlling request explicitly assigns that exact path. When ownership overlaps or is uncertain, leave the original workspace read-only and use an owned scratch worktree, clone, container, or content snapshot.

Resolve real paths and symlinks before writes/deletes. A target outside ownership is a safety stop.

## 2. Git isolation facts and policy

- A linked worktree has separate working files, index, and `HEAD`, but shares most refs, repository config by default, hooks, remotes, and the object database. It is useful isolation, not a security boundary.
- Use a unique run-owned branch/ref for retained mutating work and never bypass other-worktree branch safeguards.
- Detached `HEAD` is allowed for read-only inspection or intentionally disposable experiments. Before retained state can become unreachable, anchor and verify a run-owned named ref or immutable content snapshot.
- Do not edit shared refs, common config, hooks, remotes, stash, or maintenance state unless explicitly in scope and separately checkpointed.
- A commit records the index, not the whole workspace. A plain patch may omit staged, untracked, ignored, binary, mode, symlink, submodule, or external state. Checkpoint coverage must be declared.

Official Git semantics: [`git-worktree`](https://git-scm.com/docs/git-worktree), [`git-reset`](https://git-scm.com/docs/git-reset), [`git-apply`](https://git-scm.com/docs/git-apply), and [`git-checkout`](https://git-scm.com/docs/git-checkout#_detached_head).

## 3. Checkpoint and rollback

A checkpoint identifies:

- base/frontier and candidate immutable state
- owned changed paths and refs
- covered tracked/staged/unstaged/untracked/binary/mode/symlink/submodule state as applicable
- relevant non-Git files/resources and exclusions
- pre/post state fingerprints and restoration procedure

Rollback means restoring only run-owned candidate paths/resources/refs to recorded pre-iteration values **if their current values still match the expected post-mutation state**. Otherwise stop on conflict.

Never automatically stash, clean, reset, restore, revert, commit, delete, or overwrite pre-existing/user-owned work. `reset --hard`, broad restore/checkout, `clean`, or history-changing recovery may be valid only in an explicitly owned disposable state under the applicable authorization; the command name alone never makes it safe.

After restoration, verify the frontier identity, preserved user-state fingerprint, absence of candidate diff, and resource cleanup. Mismatch is `rollback-error` and blocks keep/resume.

## 4. Authorization matrix

| Action class | Default |
|---|---|
| Scoped local read/edit/verification requested by the task | Allowed under repository policy |
| Commit, release, push, deploy, publish, deletion, destructive rollback | Requires the controlling explicit authorization |
| Credentials, private data, external transmission, production access | Denied unless explicitly authorized and bounded |
| Irreversible external mutation | Outside the iterative loop; use a separately approved finalization gate |

Approval is action-, target-, environment-, argument-, and time-specific. It does not authorize retries, changed arguments, broader paths, or downstream commands.

Network is not classified only as read/write. An outbound read request can transmit repository or secret data. Declare destination, method/protocol, data class, read/write intent, and whether ambient credentials may be used. Never execute `curl | sh`; fetch, verify, inspect, then execute as separate approved steps.

Do not place secrets in argv, prompts, logs, artifacts, patches, handoffs, URLs, or raw environment dumps. Persist credential source class and redaction status, never values.

## 5. Locks, deadlines, and lifecycle

- Acquire mutation ownership atomically. Use run ID plus a fencing generation/epoch; PID or hostname alone does not prove ownership.
- Never delete a foreign or merely old lock. Break ownership only after the applicable lease/owner/resource checks pass and record the decision.
- Define time/resource/output bounds for procedures and the whole run where applicable.
- Register owned process groups, containers, temporary paths, sockets, ports, worktrees, and refs at creation.
- On success, failure, signal, timeout, or interrupt, clean resources in reverse order and verify absence.
- A leaked resource is `cleanup-error`; it prevents keep and automatic resume.

## 6. Typed procedure outcomes

For a process procedure, record applicable argv or script identity, cwd, timeout, start/end, exit code or signal, typed outcome, sanitized evidence references, and cleanup. Preserve tool-established exit semantics rather than forcing one numeric convention.

For human, model, rubric, API, or panel judges, record the procedure definition, rubric/input identity, invocation outcome, raw observation IDs, and aggregation identity. Process exit codes do not apply.

Common outcomes remain distinct:

```text
completed
guard-failed
verifier-error
metric-error
timeout
signaled
blocked
inconclusive
cleanup-error
rollback-error
```

Parseable output after a non-successful or incomplete procedure is diagnostic only. Avoid shell pipelines for acceptance evidence; if unavoidable, capture each stage result and failure propagation.

## 7. Durable evidence

Recommended artifacts:

```text
events.jsonl                 # append-only state transitions
results.tsv                  # human-scannable index
summary.md                   # evidence-bound synthesis
handoff.json                 # atomic terminal/resume state
environment.json             # allowlisted outcome-affecting inputs
artifacts.manifest.json      # content identities and producers
raw/                         # sanitized procedure evidence
```

Every resume-critical artifact records canonical relative locator, media type, size, digest, producing run/iteration/procedure, and timestamp where material. Use immutable/versioned artifact names, finalize referenced artifacts first, then publish `handoff.json` via same-directory atomic replacement with a monotonic generation/fencing check.

Checksums prove integrity, not confidentiality or producer trust. Redaction violations block publication and automatic resume.

## 8. Minimum resumable handoff

Automatic resume requires all required and applicable conditional state:

```json
{
  "schema": {"name": "autoresearch-handoff", "version": "1.0"},
  "generation": 8,
  "run": {"id": "run-opaque-id", "checkpointed_at": "ISO-8601"},
  "terminal": {"status": "INTERRUPTED", "stop_reason": "user_interrupt"},
  "workspace": {"id": "stable-id", "expected_state": {"dirty": false}},
  "frontier": {"id": "frontier-7", "snapshot": {"kind": "git_commit", "digest": "..."}},
  "candidate": null,
  "cursor": {"last_finalized_iteration": 7, "next_iteration": 8},
  "config": {"artifact": "effective-config.json", "digest": "..."},
  "environment": {"policy": "declared-outcome-affecting-inputs", "digest": "..."},
  "metric": {"evidence": "metric-frontier-7"},
  "guard": {"evidence": "guard-frontier-7"},
  "ownership": {"state": "released"},
  "cleanup": {"status": "complete", "residual_resources": []},
  "rollback": {"required": false, "status": "not_needed"},
  "redaction": {"policy": "allowlist-and-sanitize-v1", "violations": []},
  "resume": {"mode": "revalidate_then_continue", "next_action": "select_hypothesis"}
}
```

When a candidate exists, record its base frontier, state, snapshot, changed paths, and recovery action. When a dirty workspace is expected, inventory each path and its ownership. When ownership is held/unknown, record the lease locator and fencing epoch. When rollback is pending, record target, scope, procedure, and validation predicates.

Missing state is never synthesized. Unsupported schema or missing decisive evidence downgrades the handoff to `manual_recovery` or `non_resumable` and requires reconstruction/re-baselining.

## 9. Mandatory resume checks

Before mutation:

1. validate schema and conditional fields;
2. verify resume-critical artifact digests;
3. acquire ownership with a new fencing epoch and re-read generation;
4. resolve workspace identity independently of path;
5. verify/materialize the immutable frontier;
6. compare actual workspace/resources with expected state;
7. reconcile any candidate without replaying unknown side effects;
8. recompute config and declared environment identities;
9. confirm redaction has no unresolved violation;
10. rerun the frontier guard and remeasure when evidence is stale, noisy, or incompatible.

Continue only after the prior iteration is finalized. Full SLSA provenance, workflow replay history, exhaustive host inventory, and product-specific session state are intentionally outside this minimum runtime-neutral contract.
