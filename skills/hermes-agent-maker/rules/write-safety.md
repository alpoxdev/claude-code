# Write safety contract

Use this rule for every generator run. The generator receives only strict normalized JSON and local static assets; it never interprets natural language.

## Plain-language safety

- **The generator writes directly.** No approval envelope, preview digest, or confirmation prompt is required. Run `apply` as soon as the normalized spec is complete.
- **A new target is always safe to write.** When the target path does not exist, the generator creates the parent directories and writes the artifact in one transaction.
- **An existing target is never touched by accident.** Without `overwrite: true` the run stops with `E_TARGET_EXISTS` and changes nothing.
- **An existing directory needs proof of ownership.** With `overwrite: true`, a directory artifact is replaced only when a valid `.hermes-agent-maker/ownership.json` marker proves this generator produced every file currently in that root. Anything else stops with `E_UNOWNED_ROOT`.
- **A failure is recoverable, not magical.** Single-file replacement uses an atomic same-directory rename. A directory transaction is in-process failure atomic and interruption-recoverable through its journal; it is **not crash-atomic**. When state is ambiguous, the generator preserves evidence and blocks instead of guessing or deleting.

Report results and questions in easy Korean. Never ask for or expose credentials.

## Use preview when it helps, not as a gate

`mode: "preview"` renders the complete ordered change-set and writes nothing. Use it to show the user what a risky run would do — an overwrite, an unfamiliar target, or a large composite request. It is a reporting convenience, not a required step, and a preview never has to be approved before `apply`.

## Forbidden boundary

Reject without rendering or writing any request that creates or modifies Discord artifacts, credentials, tokens, private keys, `.env` files, install/enable/remove actions, Hermes login/profile/trust state, gateways, bots, adapters, external transmission, network fetching, or dynamic schema retrieval. `user-draft` and `memory-draft` produce proposal documents only and never activate USER or MEMORY.

## Apply decision table

| Condition | Result |
| --- | --- |
| Target absent | create parent directories, stage, verify, then commit |
| Target exists without `overwrite: true` | `E_TARGET_EXISTS`; no write |
| Directory target exists with a valid ownership marker and `overwrite: true` | stage, verify, journal, then commit |
| Existing directory lacks a valid ownership marker | `E_UNOWNED_ROOT`; no write |
| Marker present but malformed, mismatched, or out of date with the tree | `E_MARKER` or `E_UNOWNED_ROOT`; no write |
| Symlink, special file, containment escape, or lock conflict | refuse; no write |
| Journal belongs to a different artifact | `E_FOREIGN_TRANSACTION`; no write |
| Recovery state ambiguous | preserve evidence and block |
| `mode: "preview"` | report the complete ordered change-set; no write |
