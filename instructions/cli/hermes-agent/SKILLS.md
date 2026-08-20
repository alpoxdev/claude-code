# Hermes Agent Skills

> Korean: [SKILLS.ko.md](SKILLS.ko.md) · Authoring: [SKILL_AUTHORING.md](SKILL_AUTHORING.md) · Runtime overview: [README.md](README.md) · Research date: **2026-08-20**

This is a practical reference for Hermes Agent skills. **Verified** statements and commands below are drawn from the official [Skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Creating Skills guide](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills), and the [NousResearch/hermes-agent source](https://github.com/NousResearch/hermes-agent). Product behavior can change; consult `hermes skills --help` on the installed version before automation. Sections marked **Recommendation** are authoring or operational advice, not an upstream contract.

## Model: procedures loaded on demand

A skill is an [Agent Skills-compatible](https://agentskills.io/specification) `SKILL.md`: instructions plus optional local support files. It adds a procedure using existing tools; it is not an executable plugin or a new privileged tool.

Hermes uses progressive disclosure:

| Level | Agent operation | Content loaded |
|---|---|---|
| 0 | `skills_list()` | name, description, category (about 3k tokens for the index) |
| 1 | `skill_view(name)` | the selected `SKILL.md` and metadata |
| 2 | `skill_view(name, path)` | one requested reference/support file |

Thus a concise description makes a skill discoverable, while detailed edge cases belong in referenced files. Installed skills are available as slash commands and can also be found through normal conversation when the `skills` toolset is enabled.

**Recommendation:** Put the common, safe path in `SKILL.md`; put long APIs, vendor tables, and exceptional procedures in `references/`. Do not put credentials, unreviewed instructions, or a whole source corpus into the initial file.

## Discovery, locations, and trust

### Skill locations and precedence (verified)

| Tier | Location | Notes |
|---|---|---|
| Project (highest) | `<project-root>/.hermes/skills/` | Hermes-native project skills |
| Project (highest) | `<project-root>/.agents/skills/` | cross-tool convention |
| Profile/local | `~/.hermes/skills/` | primary source of truth; bundled, hub, and agent-created skills live here |
| External (lowest) | each `skills.external_dirs` entry | scanned alongside local skills |

The project root is the closest ancestor containing `.git`; worktrees and submodules count. A local skill shadows an external skill of the same name; a project skill shadows both. New agent-created skills go to `~/.hermes/skills/`; existing external skills may be edited in place if writable. Project directories are repo-owned: the curator does not modify them.

Configure additional directories in `~/.hermes/config.yaml`:

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

`~` and `${VAR}` expand; nonexistent directories are skipped. External directories are **not** write protection: use filesystem permissions when shared content must not change.

Project skills are discovered but not loaded until the project is trusted:

```bash
hermes skills trust
hermes skills trust ~/src/myproject
hermes skills untrust
```

Trusted roots are stored in `skills.trusted_project_dirs`; `skills.project_discovery: false` disables project scanning and notices. Trust is inherited by non-interactive sessions based on their working directory; those sessions do not prompt or auto-trust. On every content change, project skills are scanned; a `dangerous` result is quarantined and unavailable to the index, `skills_list`, slash commands, and direct load.

**Recommendation:** Treat `hermes skills trust` as permission to follow code-adjacent instructions, not as a one-time repository reputation check. Re-review after branch switches, pulls, or ownership changes.

## Using skills

### Invoke and stack (verified)

Every installed skill has a slash command:

```text
/gif-search funny cats
/plan design an auth-provider migration
/excalidraw
```

A bare skill name loads it and lets the agent request the task. Hermes loads up to five leading installed slash commands; remaining text is the instruction. Parsing stops at the first token that is not an installed skill, so a path is retained as an argument:

```text
/github-pr-workflow /test-driven-development fix issue #123
/ocr-and-documents /tmp/scan.pdf extract the tables
```

The skills toolset also permits conversational discovery:

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

### Bundles (verified)

A bundle is a YAML alias that loads several already-installed skills plus optional instruction text. It does not install its members. Bundles live at `~/.hermes/skill-bundles/<slug>.yaml` and win on slash-name collision with a skill.

```bash
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
hermes bundles list
hermes bundles show backend-dev
hermes bundles reload
hermes bundles delete backend-dev
```

```yaml
name: backend-dev
description: Backend feature work — review, test, PR workflow.
skills:
  - github-code-review
  - test-driven-development
  - github-pr-workflow
instruction: |
  Always start by writing failing tests, then implement.
```

`name` defaults to the file stem and is normalized to a hyphenated slash command. `skills` is required and non-empty; each item can be a skill name or path relative to the skills directory. Missing members are reported and skipped rather than failing the bundle. `/bundles` lists bundles in chat.

**Recommendation:** Keep bundles task-shaped and small. A bundle’s shared instruction must not override project safety rules or silently authorize commands.

### `/learn` (verified)

`/learn` asks the agent to research supplied material with its existing tools and save a reusable skill through `skill_manage`; it is a normal agent turn, not a separate ingestion engine. It can use a local directory, URL, conversation procedure, or pasted description:

```text
/learn the REST client in ~/projects/acme-sdk, focus on auth + pagination
/learn https://docs.example.com/api/quickstart
/learn how I just deployed the staging server
/learn filing an expense: open the portal, New > Expense, attach receipt, submit
```

For large material, Hermes can create a knowledge-base skill: a lean index `SKILL.md` with topic files under `references/`, loaded only as needed. Re-learning a topic folds material into the existing skill. Agent-created writes obey `skills.write_approval` when enabled.

**Recommendation:** Supply authoritative, bounded source paths and review the generated diff. `/learn` can preserve mistakes or hostile source instructions just as any authored procedure can.

## Hub, taps, URLs, and lifecycle

### Discover and inspect before install (verified)

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search kubernetes
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect openai/skills/k8s
hermes skills install openai/skills/k8s
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

Supported identifiers include `official/...`, `skills-sh/...`, direct GitHub `owner/repo/path`, `well-known:<endpoint>`, and an HTTPS `SKILL.md` URL. Well-known discovery reads `/.well-known/skills/index.json`; direct URLs resolve names in this order: frontmatter name, valid URL-path slug, interactive TTY prompt, then `--name` (required on noninteractive surfaces if no name resolves).

```bash
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/SKILL.md --name sharethis-chat
```

A tap is a GitHub source, defaulting to its `skills/` path:

```bash
hermes skills tap add myorg/skills-repo
hermes skills tap list
hermes skills tap remove myorg/skills-repo
```

Taps are stored in `~/.hermes/skills/.hub/taps.json`. A published tap has one directory per skill beneath `skills/`, each with `SKILL.md`; dot- and underscore-prefixed directories are ignored. A `skills.sh.json` at the tap root can provide hub category groupings. Publish a skill to GitHub with:

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

### Maintain provenance and local edits (verified)

```bash
hermes skills list --source hub
hermes skills check
hermes skills update
hermes skills update react
hermes skills update react --force
hermes skills audit
hermes skills uninstall k8s
hermes skills reset google-workspace
hermes skills reset google-workspace --restore
hermes skills reset google-workspace --restore --yes
```

Hub state records source identifier, content hash, scanner version/findings, time, and cache status in `.hub/lock.json`. `check` compares stored provenance to upstream; `update` reinstalls only changed hub skills. Locally modified hub skills are skipped unless `--force` is supplied. `audit` re-scans installed hub skills. `uninstall` removes a hub skill.

Bundled skills have origin hashes in `.bundled_manifest`. Normal sync updates unchanged copies and preserves modified copies. `reset <name>` clears that skill’s manifest entry while preserving its current copy; `--restore` deletes the local copy and restores current bundled content, with confirmation unless `--yes` is used.

Bundled seeding can be managed per profile:

```bash
hermes skills opt-out
hermes skills opt-out --remove
hermes skills opt-in --sync
```

`opt-out` stops future bundled seeding without touching files. `--remove` confirms and deletes only unmodified bundled skills; user edits, hub skills, and authored skills remain. `opt-in --sync` removes the `.no-bundled-skills` marker and seeds now. At initial installation, `--no-skills` and `hermes profile create research --no-skills` are the corresponding blank-profile options.

The same hub operations are available in chat, for example `/skills browse`, `/skills inspect …`, `/skills install …`, `/skills check`, `/skills update`, `/skills reset …`, and `/skills list`.

### Security and publishing (verified + recommendation)

Hermes scans hub installs for prompt injection, exfiltration, destructive commands, supply-chain signals, and related threats. `inspect` exposes upstream metadata when available. Trust levels are `builtin`, `official`, `trusted`, and `community`. `--force` may override caution/warn policy blocks but **never** a `dangerous` verdict. Official optional skills are built-in trusted; new taps are community by default. `audit` is a rescan, not proof that code is safe.

**Recommendation:** Inspect every third-party `SKILL.md`, every referenced script, and every URL before install; pin/review the GitHub revision through your organization’s process where that matters. Treat a scanner pass, trusted registry label, and a GitHub token as different things. Never put credentials in a tap, and do not publish instructions that cause irreversible actions without an explicit user confirmation step. Review updates before `--force`; it deliberately replaces local edits.

GitHub-backed hub activity may hit unauthenticated limits (60 requests/hour); the official guide says `GITHUB_TOKEN` raises this to 5,000/hour. Store it in Hermes’ local secret configuration, not in a skill or repository.

## Troubleshooting

| Symptom | Verified cause / action |
|---|---|
| Skill does not appear | Check platform restriction, `requires_*`/`fallback_for_*`, duplicate higher-precedence name, project trust, and quarantine. |
| Project skills were found but not loaded | Run `hermes skills trust` at the project root, or pass the project path. |
| External skill is unexpectedly edited | External directories are writable discovery locations; protect them with filesystem permissions. |
| URL install cannot name the skill | Add `name:` frontmatter or supply `--name`; noninteractive surfaces cannot prompt. |
| Update skips a changed skill | Hermes preserved a local edit; review it, then use `hermes skills update <name> --force` only to replace it. |
| Bundled skill remains “user-modified” after copying upstream files | Use `hermes skills reset <name>` to re-baseline, or `--restore` for the pristine bundled copy. |
| Community install is blocked | Read `inspect`/scan findings; `--force` cannot install `dangerous` content. |
| Hub requests are rate-limited | Configure `GITHUB_TOKEN` in the local secret setup, then retry later. |
| A secret is requested in a chat gateway | Do not send it in chat; use local `hermes setup` or `~/.hermes/.env` as Hermes directs. |

## Primary sources

- Nous Research, [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- Nous Research, [Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills)
- Nous Research, [Hermes Agent source: skills CLI](https://github.com/NousResearch/hermes-agent/tree/main/hermes_cli/subcommands)
- Nous Research, [Hermes Agent source: bundled skills](https://github.com/NousResearch/hermes-agent/tree/main/skills)
- [Agent Skills specification](https://agentskills.io/specification)
