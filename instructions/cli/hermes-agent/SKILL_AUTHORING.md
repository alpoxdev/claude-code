# Hermes Agent Skill Authoring

> Korean: [SKILL_AUTHORING.ko.md](SKILL_AUTHORING.ko.md) · Skills use and lifecycle: [SKILLS.md](SKILLS.md) · Research date: **2026-08-20**

This companion covers authoring, structure, validation, and publication. **Verified** statements are drawn from the official [Skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Creating Skills guide](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills), and [NousResearch/hermes-agent source](https://github.com/NousResearch/hermes-agent). **Recommendation** marks guidance rather than an upstream contract.

## Canonical layout and frontmatter

### Directory layout (verified)

```text
~/.hermes/skills/
├── mlops/
│   └── axolotl/
│       ├── SKILL.md                 # required entry point
│       ├── references/              # load-on-demand detail
│       ├── templates/               # reusable output skeletons
│       ├── scripts/                 # helper programs
│       ├── examples/                # referenced examples
│       └── assets/                  # supplementary files
├── .hub/
│   ├── lock.json                    # source/hash/scan provenance
│   ├── quarantine/
│   └── audit.log
└── .bundled_manifest                # bundled origin hashes
```

Hub URL/GitHub installs fetch `SKILL.md` and explicitly referenced files only under `references/`, `templates/`, `scripts/`, `assets/`, and `examples/`; unrelated repository files are not copied. Supporting files must therefore be named and referenced from the skill.

### Complete supported frontmatter (verified)

```markdown
---
name: release-notes
description: Draft release notes from merged changes and reviewed evidence
version: 1.0.0
author: Example Platform Team
license: MIT
platforms: [macos, linux]
required_environment_variables:
  - name: RELEASE_API_TOKEN
    prompt: Release API token
    help: Get a token from the internal developer portal
    required_for: publishing release notes
required_credential_files:
  - path: release_oauth.json
    description: OAuth token created by the release setup flow
metadata:
  hermes:
    tags: [release, changelog, git]
    related_skills: [github-pr-workflow]
    requires_toolsets: [terminal]
    requires_tools: [terminal]
    fallback_for_toolsets: [browser]
    fallback_for_tools: [browser_navigate]
    config:
      - key: release-notes.repository
        description: Repository used for release-note generation
        default: ""
        prompt: Repository owner/name
    blueprint:
      schedule: "0 9 * * 1"
      deliver: origin
      prompt: Draft weekly release notes from merged pull requests.
      no_agent: false
---
```

`name` and `description` are the standard essential fields. `version`, `author`, `license`, `platforms`, environment and credential declarations, and Hermes metadata are optional. Valid platforms are `macos`, `linux`, and `windows`; omitted or empty means all platforms. An incompatible platform hides the skill from the index, `skills_list`, and slash commands.

`requires_toolsets`/`requires_tools` hide the skill if **any** required capability is unavailable. `fallback_for_toolsets`/`fallback_for_tools` hide it if **any** named capability is available. Use `requires_*` for workflows that genuinely need a capability and `fallback_for_*` for an alternative that should appear only when the primary capability is absent.

`required_environment_variables` entries accept `name` (required), `prompt`, `help`, and `required_for`. Missing variables do not hide discovery. Local CLI setup is requested only when loading; messaging surfaces direct users to local `hermes setup` or `~/.hermes/.env`. Set declared variables are passed into `terminal` and `execute_code` sandboxes without exposing their raw values to the model. Use `metadata.hermes.config` for non-secret preferences: values live at `skills.config` in `config.yaml`, are prompted by `hermes config migrate`, displayed by `hermes config show`, and injected when the skill loads. Use `required_credential_files` for file credentials relative to `~/.hermes/`; existing files are mounted/synced to supported remote sandboxes.

A `metadata.hermes.blueprint` marks a runnable automation suggestion. Installing it does **not** schedule anything; users explicitly accept or dismiss it through `/suggestions`.

Template variables in the body are substituted by default:

| Token | Value |
|---|---|
| `${HERMES_SKILL_DIR}` | absolute skill directory |
| `${HERMES_SESSION_ID}` | active session ID, or left unchanged without a session |

Set `skills.template_vars: false` to disable this substitution. Inline shell ``!`command` `` is disabled by default; enabling `skills.inline_shell: true` executes it on the host while loading a skill. Output is capped and failures are marked, but this is still host command execution.

**Recommendation:** Use `required_environment_variables` only for secrets and `config` only for non-secret settings. Do not enable inline shell for community content. Prefer scripts with explicit inputs to dynamic shell interpolation.

## A complete, realistic authoring example

Create a small procedure first, then add only justified support files:

```text
release-notes/
├── SKILL.md
├── references/
│   └── style-guide.md
├── templates/
│   └── release-notes.md
└── scripts/
    └── collect_merged_prs.py
```

```markdown
---
name: release-notes
description: Draft release notes from merged pull requests and a style guide
version: 1.0.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [release, changelog, git]
    requires_toolsets: [terminal]
    config:
      - key: release-notes.repository
        description: Repository owner/name to inspect
        default: ""
        prompt: Repository owner/name
---

# Release Notes

## When to Use
Use to prepare a draft from merged pull requests. Do not publish, tag, or change a repository unless the user explicitly requests it.

## Procedure
1. Read `${HERMES_SKILL_DIR}/references/style-guide.md` and confirm the target release range.
2. Run `python3 ${HERMES_SKILL_DIR}/scripts/collect_merged_prs.py <range>`.
3. Group evidence by user-facing change; omit uncertain claims and flag them.
4. Start from `${HERMES_SKILL_DIR}/templates/release-notes.md`.
5. Return a draft and the pull-request links used. Ask before publication.

## Pitfalls
- Do not infer a feature from a title alone; use the linked change details.
- Keep breaking changes and migrations separate.

## Verification
Check that every factual bullet has a cited pull request and that no publication command was run.
```

```python
# scripts/collect_merged_prs.py
# Accept one explicit revision range; print structured, reviewable data.
import subprocess
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: collect_merged_prs.py <revision-range>")
print(subprocess.check_output(["git", "log", "--format=%H%x09%s", sys.argv[1]], text=True))
```

```markdown
<!-- templates/release-notes.md -->
# Release {{version}}

## Highlights

## Fixes

## Breaking changes

## Evidence
- Pull requests:
```

This example intentionally has no token, inline shell, or publish operation. In a real script, validate revision syntax and handle subprocess errors; the short example illustrates the file contract rather than a production parser.

### Authoring workflow (recommendation)

1. Decide whether instructions plus existing tools suffice. Use a plugin/tool when durable API integration, precise binary/streaming processing, or auth lifecycle belongs in code.
2. Choose a unique lowercase identifier and a description that says when it helps; keep the description short (Hermes’ `/learn` authoring guidance calls for at most 60 characters).
3. Write `When to Use`, common procedure, pitfalls, and verification before adding scripts.
4. Move only material needed on demand into `references/`; use templates for repeatable output and examples for reviewed exemplars.
5. Declare platform/tool conditions narrowly. A mistaken `requires_*` makes a valid skill invisible.
6. Declare secret and non-secret setup separately; never embed values in frontmatter, examples, or scripts.
7. Invoke it with a harmless representative prompt, inspect actual tool use and output, then test missing configuration, incompatible platform, and unavailable required toolset.
8. Review every support file as code and publish only the files the `SKILL.md` references.

## Publishing a skill tap (verified)

Publish a skill to a GitHub repository with:

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

A tap defaults to a repository `skills/` path. It contains one directory per
skill, each with a `SKILL.md`; directories beginning with `.` or `_` are
ignored. Referenced `references/`, `templates/`, `scripts/`, `assets/`, and
`examples/` files can accompany it. Consumers add, inspect, and remove taps
with:

```bash
hermes skills tap add myorg/skills-repo
hermes skills tap list
hermes skills tap remove myorg/skills-repo
```

Taps are recorded in `~/.hermes/skills/.hub/taps.json`. A tap-root
`skills.sh.json` may define hub category groupings. New taps are `community`
trust by default and their installed skills receive the standard security
scan. See [SKILLS.md](SKILLS.md) for installation, inspection, trust levels,
and update lifecycle.


## Primary sources

- Nous Research, [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- Nous Research, [Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills)
- Nous Research, [Hermes Agent source: skills CLI](https://github.com/NousResearch/hermes-agent/tree/main/hermes_cli/subcommands)
- Nous Research, [Hermes Agent source: bundled skills](https://github.com/NousResearch/hermes-agent/tree/main/skills)
- [Agent Skills specification](https://agentskills.io/specification)
