# Safety and approval contract

Use this rule for every preview and apply request. The generator receives only strict normalized JSON and local static assets; it does not interpret natural language.

## Plain-language safety

- **Preview is a read-only plan.** It shows every file that would be created, updated, or deleted, with old and new hashes. It never writes a file, marker, stage, journal, lock, or recovery record.
- **Approval is specific.** Ask the user to approve the shown preview identity and its complete ordered change-set. A different file, hash, target, template version, or deletion requires a new preview and approval.
- **Existing folders need proof of ownership.** The maker may replace only a fully owned generated root. It must stop rather than touch an unknown, user-managed, linked, or unusual filesystem entry.
- **A failure is recoverable, not magical.** Single-file replacement uses an atomic same-directory rename. A directory transaction is in-process failure atomic and interruption-recoverable with its journal; it is **not crash-atomic**. When state is ambiguous, preserve evidence and block instead of guessing or deleting.

User-facing questions and confirmation prompts must be easy Korean. Never ask for or expose credentials.

## Forbidden boundary

Reject without rendering, staging, or writing requests that create or modify Discord artifacts, credentials, tokens, private keys, `.env` files, install/enable/remove actions, Hermes login/profile/trust state, gateways, bots, adapters, external transmission, network fetching, or dynamic schema retrieval. `user-draft` and `memory-draft` are proposals only and never activate USER or MEMORY.

## Machine-facing invariants

### `RenderedArtifact`

A `RenderedArtifact` is a deterministic, ordered description of one normalized spec and template version:

- `artifact_id`, `preview_id`, `kind`, normalized `target_identity`, and `template_version` identify it.
- `files` is path-sorted and contains each generated regular file exactly once as `{path, content_bytes, sha256, mode}`.
- `directories` is path-sorted and contains each generated directory exactly once.
- `change_set` is path-sorted and contains every `create`, `update`, and `delete`; no implicit operation is permitted.
- Each change includes path, mode where applicable, `old_sha256` or explicit `absent`, and `new_sha256` or explicit deletion. The preimage map covers every current affected path, including all deletes and the ownership marker.
- Identical normalized input and template version produce byte-identical ordered paths, bytes, modes, hashes, IDs, and change-set.

`preview` may read and validate current state to form preimages, but has no filesystem mutation.

### `ApprovalEnvelope`

An `ApprovalEnvelope` binds one explicit user confirmation to one `RenderedArtifact`:

- It includes `preview_id`, `artifact_id`, `kind`, `target_identity`, `template_version`, the complete ordered `change_set`, and the complete preimage map.
- It includes the full rendered file map, including marker bytes and marker SHA-256 when applicable.
- Its confirmation is valid only for exactly these values. Partial approvals, approval by name alone, wildcard approval, and approval of a summary are invalid.
- Before any stage or write, apply re-reads every affected path and requires exact equality with the envelope preimage: expected absence remains absent; expected regular-file bytes and mode remain equal; expected directories remain valid.
- Any changed, appeared, disappeared, reordered, omitted, extra, malformed, or mismatched value is a stale approval. Refuse it with no mutation and require a new preview.

### `OwnershipMarker`

Directory kinds `skill`, `native-plugin`, and `portable-plugin` use the fixed marker path `.hermes-agent-maker/ownership.json`.

The canonical marker payload contains exactly `schema_version`, `artifact_kind`, normalized/resolved `target_identity`, `template_version`, `marker_path`, sorted `owned_directories`, sorted `owned_entries`, and `owned_set_digest`.

- `owned_entries` lists every generated non-marker regular file exactly once as `{path, sha256, mode}`.
- `owned_directories` lists every generated directory, including the marker parent.
- The marker path must not appear in `owned_entries`; a self-entry is invalid.
- `owned_set_digest` is SHA-256 of canonical UTF-8 JSON for the payload without `owned_set_digest`: keys and arrays are sorted.
- Render non-marker files and hashes first; build and digest the marker payload; serialize the marker canonically; hash marker bytes; append the marker only to the full rendered, approval, staged, journal, and recovery maps.

This non-self-referential digest avoids an impossible marker self-hash fixed point. The marker remains an ordinary approval-bound file, but is separately validated semantically and canonically.

### Owned-root preflight

An absent directory root may be created. An existing root may be changed only when it is fully owned by a regular, non-symlink marker at the exact marker path.

Before mutation, validate marker schema, version, kind, target identity, template version, marker path, canonical ordering, digest, and marker exclusion. Verify every ledger non-marker path, bytes, and mode; reject duplicate, missing, extra, or unmanaged entries and any filesystem entry outside the allowed generated tree. Deletes are allowed only for approved owned paths.

Reject an absolute, empty, `.`, `..`, or escaping relative path. For target, ancestors, root, stage, journal, backup, and every entry, use `lstat` and containment checks; reject symlinks, sockets, FIFOs, devices, and other special files. Resolve the workspace and nearest existing ancestor with `realpath`, require containment, acquire the transaction lock, then recheck containment and preimages immediately before commit. Lock conflicts reject without mutation.

### `ApplyTransaction`

`ApplyTransaction` is the only writer. It records artifact/preview identity, complete expected root map (including marker), preimages, ordered change-set, stage/backup/journal locations, hashes, and phase.

- Stage and journal are same-filesystem siblings of the target. Never use cross-device moves.
- For a single file, write and verify a same-directory temporary file, then atomically rename it into place.
- For an absent directory root, verify the complete staged tree and rename it once into place.
- For an owned replacement, retain a same-filesystem backup, move root to backup, move verified stage to root, then clean up only after journaled verification.
- Stage verifies marker semantics, the non-marker ledger, and the complete marker-inclusive file map before commit.
- On an in-process failure, roll back to the hash-valid prior root when possible. On interruption, recovery examines journal, root, stage, and backup and restores or completes only a uniquely hash-valid state.
- If no unique hash-valid state exists, do not delete or overwrite anything: preserve journal/evidence, report a blocked recovery, and require review.

Do not claim crash atomicity, power-loss atomicity, or recovery without the required journal and hash-valid evidence.

## Apply decision table

| Condition | Result |
| --- | --- |
| No exact approval envelope | refuse; no write |
| Preview-only request | report complete change-set; no write |
| Preimage differs from approval | stale approval refusal; no write |
| Existing root lacks valid ownership marker | refuse; no write |
| Symlink, special file, containment escape, or lock conflict | refuse; no write |
| Unmanaged path or unapproved deletion | refuse; no write |
| Valid envelope and owned/absent target | stage, verify, journal, then commit |
| Recovery state ambiguous | preserve evidence and block |
