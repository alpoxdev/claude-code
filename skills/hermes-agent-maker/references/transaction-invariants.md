## Machine-facing invariants

### `RenderedArtifact`

A `RenderedArtifact` is a deterministic, ordered description of one normalized spec and template version:

- `artifact_id`, `kind`, normalized `target_identity`, and `template_version` identify it.
- `files` is path-sorted and contains each generated regular file exactly once as `{path, content_bytes, sha256, mode}`.
- `directories` is path-sorted and contains each generated directory exactly once.
- `changes` is path-sorted and contains every `create`, `update`, and `delete`; no implicit operation is permitted.
- Identical normalized input and template version produce byte-identical ordered paths, bytes, modes, hashes, and IDs.

### `OwnershipMarker`

Directory kinds `skill`, `native-plugin`, and `portable-plugin` use the fixed marker path `.hermes-agent-maker/ownership.json`.

The canonical marker payload contains exactly `schema_version`, `artifact_kind`, normalized `target_identity`, `template_version`, `marker_path`, sorted `owned_directories`, sorted `owned_entries`, and `owned_set_digest`.

- `owned_entries` lists every generated non-marker regular file exactly once as `{path, sha256, mode}`.
- `owned_directories` lists every generated directory, including the marker parent.
- The marker path must not appear in `owned_entries`; a self-entry is invalid.
- `owned_set_digest` is SHA-256 of canonical UTF-8 JSON for the payload without `owned_set_digest`: keys and arrays are sorted.
- Render non-marker files and hashes first, build and digest the marker payload, serialize it canonically, then append the marker to the rendered, staged, and journal maps.

This non-self-referential digest avoids an impossible marker self-hash fixed point.

### Target preflight

An absent target may always be created. An existing target may be replaced only when the spec sets `overwrite: true`, and a directory target additionally requires a regular, non-symlink marker at the exact marker path.

Before mutation, validate marker schema, version, kind, target identity, template version, marker path, canonical ordering, digest, and marker exclusion. Verify every ledger path, its bytes, and its mode; reject duplicate, missing, extra, or unmanaged entries and any filesystem entry outside the recorded generated tree.

Reject an absolute, empty, `.`, `..`, or escaping relative path. For target, ancestors, root, stage, journal, and backup, use `lstat` and containment checks; reject symlinks, sockets, FIFOs, devices, and other special files. Resolve the workspace and nearest existing ancestor with `realpath`, require containment, acquire the transaction lock, then recheck containment immediately before commit. Lock conflicts stop without mutation.

### `ApplyTransaction`

`ApplyTransaction` is the only writer. It records artifact identity, the complete expected root map including the marker, the previous map, stage/backup/journal locations, and hashes.

- Stage and journal are same-filesystem siblings of the target. Never use cross-device moves.
- For a single file, write and verify a same-directory temporary file, then atomically rename it into place.
- For an absent directory root, verify the complete staged tree and rename it once into place.
- For an owned replacement, retain a same-filesystem backup, move root to backup, move verified stage to root, then clean up only after journaled verification.
- On an in-process failure, roll back to the hash-valid prior root when possible. On interruption, recovery examines journal, root, stage, and backup and restores or completes only a uniquely hash-valid state.
- Recovery is bound to `artifact_id`: a journal left by a different artifact stops the run with `E_FOREIGN_TRANSACTION` instead of being completed blindly.
- If no unique hash-valid state exists, do not delete or overwrite anything: preserve journal evidence, report a blocked recovery, and require review.

Do not claim crash atomicity, power-loss atomicity, or recovery without the required journal and hash-valid evidence.
