# Hermes Agent Maker Error Codes and Recovery Actions

> Korean mirror: [`error-codes.ko.md`](error-codes.ko.md).  
> Sources: `skills/hermes-agent-maker/scripts/generate.mjs` and `skills/hermes-agent-maker/scripts/validate-portable-v1-output.mjs`. This reference is derived from the thrown codes in those two scripts and nothing else.

Both scripts fail closed onto one line of stderr: `{"error":"E_*"}` with exit code 1. `generate.mjs` writes the envelope at line 435; `validate-portable-v1-output.mjs` writes it at line 299. Stdout carries a receipt only on success, so an agent decides from stderr, never from a partially inspected tree.

Every code belongs to exactly one of two recovery groups. There is no third option and no judgement call:

- **Correct the input and re-run.** The failure is mechanical and was detected *before* anything was written. Fix the manifest, the target, or the workspace, then run again.
- **Terminal stop — preserve evidence, never retry.** The failure touched an existing tree, an ownership marker, a journal, a lock, or a commit that may have partially applied. Stop, report the code and the paths, and hand the decision to the user.

## Non-negotiable rules

1. **`E_TARGET_EXISTS` is NEVER self-authorization to set `overwrite: true`.** The code means a target is already present and the spec did not request replacement. Only the user may authorize `overwrite: true`, in an explicit instruction. An agent that flips the flag on its own has destroyed data it was told not to touch.
2. **`E_LOCK` must NOT be polled, slept on, or retried in a loop.** No `sleep`, no backoff, no second attempt, no "just once more". Another writer holds the target, or a lock path is unsafe. Report and stop.
3. **`E_COMMIT_VERIFY` means the mutation state is UNKNOWN.** The rename happened but the readback did not match. Preserve the journal (`.hermes-agent-maker-journal-<token>.json`), the stage directory (`.hermes-agent-maker-stage-<token>-*`), and the backup (`<target>.hermes-backup`). Do not delete them, do not "tidy up", do not re-run — a re-run reinterprets exactly the evidence needed to diagnose the failure.
4. **`E_UNOWNED_ROOT` and `E_MARKER`: preserve the target.** Never repair, delete, overwrite, or hand-edit a marker file or an unowned tree. These codes mean the generator cannot prove it owns what is on disk; writing anyway would clobber a foreign artifact.
5. **Any non-JSON stderr is a terminal stop.** See "The protocol is not fully closed" below.

## Group 1 — Correct the input and re-run

These fire before any filesystem mutation. Re-running after a corrected input is safe.

| Code | Meaning | Phase | Deterministic agent action |
| --- | --- | --- | --- |
| `E_ARGS` | Bad CLI invocation: a flag other than `--manifest`/`--workspace`, a missing value, a duplicated flag, or (in the validator) anything but exactly `--root <path>`. | Argument parse, before any read | Rebuild the command line with exactly the required flag/value pairs and re-run. |
| `E_JSON` | A JSON document did not parse, or parsed to something that is not an object. In the manifest phase this is the spec file; in the validator it is `plugin.json` or an `mcp/*.json`. | Manifest read (generator) or document read (validator) | Manifest phase: regenerate the manifest as a single valid JSON object and re-run. Validator phase on a generated tree: treat as Group 2 — the tree is already on disk. |
| `E_SPEC` | The normalized spec is invalid: an unknown field, an unsupported `kind`, a `summary` failing the safe pattern or containing a forbidden term, a non-safe `target`, a `mode` that is not `preview`/`apply`, a non-boolean `overwrite`, `template_version` other than `1.0.0`, or a `name` present/absent against what the `kind` requires. | Spec validation, before any read of the target | Fix the offending field against the spec contract and re-run. Never widen the spec by adding fields. |
| `E_TARGET` | The `target` is not a safe relative path, or a single-file `kind` was pointed somewhere other than its fixed filename (`soul`→`SOUL.md`, `agents`→`AGENTS.md`, `user-draft`→`USER.md.draft.md`, `memory-draft`→`MEMORY.md.draft.md`). | Spec validation | Set `target` to the required path for that `kind` and re-run. |
| `E_WORKSPACE` | The `--workspace` path does not exist, is not a directory, or is a symlink. | Workspace resolution | Point `--workspace` at a real directory and re-run. Do not resolve or replace the symlink yourself. |
| `E_CONTAINMENT` | The resolved target escapes the real workspace root, or (validator) a referenced path resolves outside the output root or crosses a symlink. | Target resolution in the generator; reference resolution in the validator | Generator, pre-write: choose a `target` that stays inside the workspace and re-run. If it surfaces from the post-lock re-check (line 412) or from the validator against a written tree, treat as Group 2. |
| `E_TEMPLATE` | The template bundle entry for this `kind` is missing or malformed: no `files` array, a bad `path`/`content`/`mode`, a rendered path that is unsafe or collides with the marker path, an empty file list, or duplicate paths. | Render, before any write | Do not edit the frozen scripts. Report the `kind` and stop; a bad bundle is a skill-packaging defect, not an input the agent may patch. |
| `E_CANONICAL_JSON` | A value could not be canonically serialized (`JSON.stringify` returned `undefined`). | Canonical serialization during render or marker construction | Report and stop. This is an internal invariant break, not a user-fixable input. |
| `E_SCHEMA_PROVENANCE` | The pinned offline schema provenance is wrong: bad `schema_version`, `retrieval` other than `offline-vendored`, a missing/extra schema entry, a `sha256` mismatch, or a `$id` that is not the expected v1 URL. | Validator, pinned-schema load | Report and stop. Never fetch a schema over the network and never rewrite the provenance file to make it pass. |
| `E_PLUGIN_V1` | `plugin.json` does not satisfy the pinned Agent Plugins v1.0.0 schema, or its `components`/`mcp` shape is wrong. | Validator, plugin document check | If validating a pre-write render, correct the spec inputs and re-run. Against an already-written tree, treat as Group 2. |
| `E_MCP_V1` | An `mcp/*.json` document does not satisfy the pinned MCP v1.0.0 schema, or its `servers` value is not an object. | Validator, MCP document check | Same as `E_PLUGIN_V1`: pre-write, correct and re-run; post-write, treat as Group 2. |
| `E_HERMES_SUBSET` | Content violates the Hermes subset policy: a forbidden behavior term or metadata key, malformed `SKILL.md` frontmatter, a bad skill path, a non-object server entry, a bad command/args shape, `sse` transport, a transport other than `http`/`streamable-http`, a non-string or unparseable URL, a non-`http(s)` scheme, embedded credentials or a fragment, or a non-loopback `http`/`http`-transport server. | Validator, Hermes subset check | Correct the offending content through the spec and re-render. Never relax the subset check to pass. |
| `E_REFERENCE` | A referenced path is unusable: absolute, backslashed, dot-segmented, outside the output root, a non-file entry, unreadable, a missing `SKILL.md` for a declared skill, a bad `mcp/` path, or an output root that is not a real directory. | Validator, reference resolution | Pre-write: fix the referenced set and re-render. Against a written tree: treat as Group 2. |
| `E_UNKNOWN` | A thrown value was not an `Error`, so no code could be extracted. | Any phase — the outermost catch | Treat as a terminal stop. The phase is unknown, so the write state is unknown; preserve everything and report. |

`E_` (bare) is **not** an emitted error code. It appears in the source only as the sentinel prefix in the guard `error.message.startsWith("E_")` at `validate-portable-v1-output.mjs` lines 104 and 161, which re-throws an already-coded error instead of masking it as `E_REFERENCE`. It is listed here so a mechanical grep of the sources reconciles exactly against this document.

## Group 2 — Terminal stop, preserve evidence, never retry

These touch an existing tree, a marker, a journal, a lock, or a commit that may have partially applied. **Do not re-run the generator. Do not clean up. Do not repair.** Report the code, the target path, and any journal/stage/backup paths, then stop.

| Code | Meaning | Phase | Deterministic agent action |
| --- | --- | --- | --- |
| `E_SPECIAL_FILE` | An existing path component is a symlink, or a non-directory sits mid-path, or the target itself is neither a regular file nor a directory. Also raised when walking an existing tree during preimage capture. | Target resolution and tree walk | Stop. Never delete or replace the special file or symlink to clear the path — report the exact path to the user. |
| `E_TARGET_EXISTS` | The target already exists and the spec did not set `overwrite: true`. | Write gate, under the lock | Stop and ask the user. **Never set `overwrite: true` on your own authority** — that flag is the user's decision alone. |
| `E_UNOWNED_ROOT` | The target exists but the generator cannot prove ownership: wrong file type, a symlink, a missing or symlinked marker, an extra/missing tracked path, or a content/mode mismatch against the marker. | Ownership validation, under the lock | Stop. Preserve the target exactly. Never repair, delete, or overwrite it, and never write a marker to make the check pass. |
| `E_MARKER` | The ownership marker itself is invalid: wrong key set, wrong `schema_version`/`artifact_kind`/`target_identity`/`template_version`/`marker_path`, a bad digest, non-canonical bytes, malformed or unsorted owned entries, or an owned-directory set that disagrees with the tree. | Ownership validation, under the lock | Stop. Preserve the marker byte-for-byte. Never hand-edit, regenerate, or delete it. |
| `E_PREIMAGE_MODE` | An existing file in the target tree has a mode other than `0644` or `0755`, so its pre-state cannot be journaled. | Preimage capture, before the transaction | Stop. Do not `chmod` the tree to make the capture succeed — report the path and mode. |
| `E_PARENT` | The parent directory of the target is not a directory, or is a symlink, at commit time. | Transaction commit setup | Stop. Never replace or unlink the parent. |
| `E_LOCK` | The per-target lock could not be acquired: a live owner holds it, the lock path is unsafe (not a directory, or a symlink), the `EEXIST` recovery path failed, or the retake `mkdir` failed. | Lock acquisition | Stop and report. **Never poll, sleep, back off, or retry in a loop.** One acquisition attempt is the entire protocol. |
| `E_STALE_TRANSACTION` | A `<target>.hermes-backup` from an earlier interrupted run is present at commit time, with no journal to authenticate it. | Transaction commit setup | Stop. Preserve the backup. Never delete it to unblock the write — it may be the only copy of the previous tree. |
| `E_JOURNAL` | The journal is malformed or does not bind to this target: bad `version`/`directory`/`target_identity`/`target`/`stage`/`backup` fields, a path not matching the derived token layout, an invalid expected/previous map, or a journal whose `target` differs from the current one. | Recovery, before the write gate | Stop. Preserve the journal. Never delete or hand-fix it; recovery is only valid when the generator can authenticate it. |
| `E_FOREIGN_TRANSACTION` | The journal is well-formed but its `artifact_id` belongs to a different artifact. Another writer's interrupted transaction is present on this target. | Recovery, before the write gate | Stop. Preserve the journal, stage, and backup. Never recover another artifact's transaction. |
| `E_RECOVERY_AMBIGUOUS` | The on-disk state matches none of the four decidable recovery dispositions, so completion and rollback cannot be distinguished. | Recovery of an interrupted transaction | Stop and escalate to the user. Preserve journal, stage, backup, and target. Re-running cannot disambiguate — it only overwrites evidence. |
| `E_STAGE_VERIFY` | The freshly written stage did not read back as its expected content/mode map. | Staging, before any target mutation | Stop. The stage is removed by the script; the target was never touched. Report and do not re-run blindly — a readback mismatch indicates a filesystem or concurrency problem, not a bad input. |
| `E_COMMIT_VERIFY` | The target was renamed into place but did not read back as the expected map. **Mutation state is UNKNOWN.** | Commit, after the target rename | Stop immediately. Preserve the journal, stage, and backup. Do not clean up, do not re-run, do not inspect-and-fix. Report all three paths plus the target to the user. |

## The protocol is not fully closed

`generate.mjs` parses its template bundle at **module load, line 12**:

```js
const templates = JSON.parse(readFileSync(join(scriptRoot, "assets/templates/artifacts.json"), "utf8"));
```

The `{"error":"E_*"}` envelope is installed much later, in the bottom `try`/`catch` at **line 435**:

```js
try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "E_UNKNOWN" })}\n`); process.exitCode = 1; }
```

Line 12 executes **outside** that `try` block. So a corrupt template bundle (a `SyntaxError` from `JSON.parse`) or an OS-level failure on the read (`EACCES`, `ENOENT`) surfaces as a **raw message or a stack trace on stderr**, not as the JSON envelope. The same exposure applies to the module-scope imports and to `validate-portable-v1-output.mjs`, whose envelope likewise sits at line 299 with its imports above it.

The consequence for an agent is explicit:

> **Any stderr output that is not a single parseable `{"error":"E_*"}` line is a terminal stop.** Do not attempt to pattern-match a stack trace into a code, do not retry, and do not assume nothing was written. Capture the raw stderr verbatim, preserve the target and any journal/stage/backup paths, and report to the user.

Both scripts are frozen. Do not modify them to move the parse inside the `try` block or to widen the envelope; the correct response to this gap is the terminal-stop rule above.

## Decision procedure

1. Read stderr. If it is not exactly one parseable `{"error":"E_*"}` line → terminal stop, preserve everything, report raw output.
2. Extract the code. If it is in Group 1 **and** the failure occurred before any write → correct that specific input and re-run once.
3. If it is in Group 2, or a Group 1 code surfaced from the validator against an already-written tree → terminal stop. Preserve the target, marker, journal, stage, backup, and lock. Report the code and the paths.
4. Never set `overwrite: true`, never poll a lock, never delete recovery evidence, and never edit a marker to satisfy a check.
