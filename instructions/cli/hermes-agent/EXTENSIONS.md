# Hermes Agent extensions and operations map

> Korean translation: [EXTENSIONS.ko.md](EXTENSIONS.ko.md)  
> Companion guides: [overview and runtime use](README.md), [configuration](CONFIGURATION.md), [Discord](DISCORD.md), [messaging gateway](MESSAGING.md), [skills](SKILLS.md), and [native plugins](PLUGINS.md)
> **Research date:** 2026-08-24. Claims and examples below are limited to the official Hermes documentation and the official [NousResearch/hermes-agent repository](https://github.com/NousResearch/hermes-agent).

Hermes extensions cross trust boundaries: an MCP can run a local program or call a remote service; a messaging gateway accepts messages from another platform; and a tool provider receives input and credentials. Treat enablement as granting capability, not merely adding a UI feature. Inspect source, scopes, transport, and credential flow before enabling anything.

## Choose the extension surface

| Need | Primary surface | Operational boundary |
| --- | --- | --- |
| Existing external tools, databases, or internal API | MCP | Server code and its credentials become available to Hermes. |
| Hermes-native behavior | General plugin/provider configuration | Provider sends task content to its service. |
| Chat from Telegram, Discord, Slack, WhatsApp, Signal, or Email | Messaging gateway | Platform identity/pairing and inbound untrusted text. |
| React to lifecycle events or enforce local policy | Hooks / shell hooks | Hook code executes with its configured process privileges. |
| Spoken input/output | STT / TTS provider | Audio and text leave the host when cloud-backed. |
| GUI or local control plane | Desktop / dashboard | Bind and access controls determine who can operate it. |

Do not use a native plugin guide as an MCP substitute or assume that an MCP catalog entry is sandboxed. Use [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) for an external MCP server and [Plugins](PLUGINS.md) for native-plugin authoring.

## MCP: configure, limit, and operate

MCP support ships with Hermes. At startup Hermes discovers and registers tools from `mcp_servers`; supported servers may also contribute resource and prompt wrappers. There are two transports:

- **stdio** — Hermes starts a local subprocess and communicates over stdin/stdout. This is appropriate for a locally installed server and local resources, but the command and bootstrap chain must be trusted.
- **HTTP** — Hermes connects to a remote MCP endpoint. Use this for hosted or organization endpoints; verify the URL, authentication scheme, and service authorization separately.

A documented minimal stdio configuration is:

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
```

Start a chat after configuring it:

```bash
hermes chat
```

A static-token HTTP server uses `url` and `headers`; keep the actual token in an environment variable or Hermes `.env`, not in version-controlled YAML:

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ${MCP_TOKEN}"
```

For hosted OAuth MCPs, `auth: oauth` makes Hermes handle discovery, PKCE, token exchange, refresh, and step-up authentication. The documented workflow includes `hermes mcp login <name>` where applicable. OAuth tokens are cached at `~/.hermes/mcp-tokens/<server>.json` with mode `0600`; on a headless host use the documented paste-back redirect flow, SSH forwarding, or a deliberately configured proxied callback. Do not expose callback endpoints casually.

### Catalog and lifecycle

The Nous-reviewed catalog is opt-in; it is not a community marketplace and catalog MCPs are disabled until installed. These documented commands distinguish interactive use, listing, and installation:

```bash
hermes mcp
hermes mcp catalog
hermes mcp install n8n
hermes mcp configure linear
```

Installation can clone a repository and run manifest bootstrap commands such as package installation, then run the MCP server. Review the catalog manifest’s `source`, `install.bootstrap`, transport command/arguments, endpoint, authentication, and tool list before installing. Catalog review is useful evidence, **not** a replacement for your own supply-chain review. MCPs never auto-update; rerun `hermes mcp install <name>` after reviewing a changed manifest.

At install/configure time Hermes can write `mcp_servers.<name>.tools.include`; select only necessary tools, especially omit destructive or administrative operations. If the server cannot be probed, installation can still complete, so rerun `hermes mcp configure <name>` after connectivity or OAuth is fixed. `${VAR}` in MCP connection fields resolves at connect time from the environment (including `~/.hermes/.env`); Cursor-style `${env:VAR}` is accepted too. Undefined variables remain literal and log a warning.

**MCP troubleshooting:** verify server command/arguments and package installation for stdio; verify endpoint reachability, OAuth login/callback path, and required provider login for HTTP; then reduce the enabled tool set and reconnect. A changed MCP schema can invalidate model prompt caching, so Hermes asks before `/reload-mcp` by default (`approvals.mcp_reload_confirm: true`). Consult the [MCP configuration reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference) for supported fields rather than copying an arbitrary client’s schema.

## Provider map: what is extended and where data goes

Hermes supports AI-model providers and auxiliary providers rather than treating all integrations as one plugin type. The official [provider guide](https://hermes-agent.nousresearch.com/docs/integrations/providers) is the authority for current provider IDs, model names, and credentials. The [Tool Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway) can provide web search, image generation, TTS, and cloud-browser backends through Nous Portal, while individual backends can also use their own credentials.

| Capability | What to decide | Data/credential boundary |
| --- | --- | --- |
| Model | Provider, model, fallback and endpoint | Prompts, tool schemas, and model-visible context go to the selected model provider. |
| Memory/context | Whether persistent memory, sessions, skills, and project context are appropriate | Local Hermes state persists under the selected Hermes home; imported/untrusted text can influence the model, so do not equate “in context” with “trusted.” |
| Web search | Search backend and query/data handling | Queries and any retrieved content cross to the search provider; web content remains untrusted input. |
| Browser | Local/cloud browser backend and authenticated browsing policy | A cloud browser/provider can receive navigation and page data; browser sessions/cookies are high-value credentials. |
| Image/video | Generation or analysis provider and retention policy | Prompts and media cross to that provider; do not upload private media without authorization. |
| Secrets | `.env`, OAuth credentials, or an external injection mechanism | Secrets must be injected only into the component that needs them; never put them in prompts, committed YAML, or broad subprocess environments. |
| TTS/STT | Voice/transcription backend and consent | Spoken audio and transcript/text may leave the machine with cloud providers. |

`hermes setup --portal` is the documented one-OAuth setup for a Nous model provider plus the four Tool Gateway tools; `hermes portal info` reports what is wired. This is a convenience boundary, not a reason to grant every backend every secret. Bring-your-own keys remain per backend. For any non-Portal provider, follow its official Hermes integration page and place API keys in `.env`.

## Messaging gateway and adapters

The gateway is the integration boundary for Telegram, Discord, Slack, WhatsApp, Signal, and Email. Read [Messaging gateway](MESSAGING.md) for the shared service lifecycle, authorization, session scope, durable delivery semantics, and adapter differences. Read [Discord setup](DISCORD.md) for Developer Portal setup, intents, invitations, Discord access policy, slash commands, and voice/media. Its documented entry points are:

```bash
hermes gateway setup
hermes gateway start
```

Run setup for the selected adapter and follow the platform-specific [Messaging Gateway guide](https://hermes-agent.nousresearch.com/docs/user-guide/messaging); do not invent bot-token names or webhook commands. A gateway can bridge the same agent capabilities to remote chat, so every inbound message, attachment, URL, and quoted instruction is untrusted until the authenticated platform user is authorized.

Keep platform bot tokens in `.env`, restrict who may converse through the gateway using its documented pairing/allowlist controls, and use separate identities/accounts for production systems. The gateway supports dangerous-command approval in chat; a response such as `yes` or `approve` is meaningful only in the correctly paired conversation. Do not enable headless auto-approval merely because a messaging adapter is available.

## Hooks and shell hooks

Hooks extend lifecycle behavior; shell hooks specifically execute commands. Use the official [Hooks guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) and [shell-hooks reference](https://hermes-agent.nousresearch.com/docs/reference/shell-hooks) for event names, schema, and timeout behavior. Treat hook configuration like executable code:

1. Keep scripts in a reviewed, access-controlled location and use absolute/controlled paths where the reference requires them.
2. Validate event payloads; do not interpolate untrusted message, filename, URL, or model output into shell syntax.
3. Use least privilege, narrow environment passing, bounded runtime, and idempotent operations.
4. Log enough to diagnose failures without writing secrets or whole sensitive payloads.
5. Test operationally in an isolated profile/backend before attaching hooks to a production gateway or cron path.

Hooks are suitable for notification, auditing, policy checks, and local orchestration—not a substitute for the approval system or container isolation. A successful hook run does not validate the safety of its input.

## Dashboard, desktop, profiles, and state

Hermes Desktop and the dashboard expose configuration and extension surfaces, but they do not change the underlying trust model. Inspect the selected MCP/provider/adapter before clicking install or login, and protect the device/session that can control the dashboard. The Desktop MCP view exposes catalog transport, source, auth, endpoint/command, bootstrap, and setup details specifically so they can be reviewed.

The default Hermes home is `~/.hermes/`, containing `config.yaml`, `.env`, `auth.json`, memories, skills, cron jobs, sessions, logs, and MCP tokens. `HERMES_HOME` selects profile state; use distinct profiles for distinct users, environments, or risk levels. [Configuration files](CONFIGURATION.md) documents file ownership, managed scope, the key-specific environment/configuration precedence caveat, secret sources, and recovery. Manage values with the documented commands:

```bash
hermes config
hermes config get model
hermes config set terminal.backend docker
hermes config unset terminal.backend
hermes config check
hermes config migrate
```

`hermes config set` routes API keys to `.env` and non-secret values to `config.yaml`. `config.yaml` supports `${VAR}` and `${env:VAR}` substitution; external secret systems should inject environment values at startup rather than use unsupported inline file/vault references.

Profile isolation does **not** automatically isolate ordinary host credentials. With a local backend, `terminal.home_mode: auto` preserves the real OS `HOME`, so subprocesses may see normal `ssh`, GitHub CLI, cloud, and package-manager credentials. Use `terminal.home_mode: profile` for a deliberately separate tool home and initialize only required credentials there. The safer operational default for untrusted work is an isolated backend such as Docker, Modal, Daytona, Vercel Sandbox, or Singularity; verify mounts, egress, and environment forwarding because a host mount or forwarded secret can defeat the intended boundary.

## Security audit, approvals, and safe operation

Before enabling or changing an extension, audit: source/release and install command; execution location; tool list and mutation scope; credentials and OAuth scopes; reachable files, network, and mounted volumes; authorized gateway users; logs/retention; and rollback/removal path. Run `hermes doctor` for product diagnostics and `hermes security audit` for its on-demand supply-chain audit; neither substitutes for reviewing the actual configuration and manifest values, sandboxing, or a complete code audit.

Hermes approval modes are configured under `approvals.mode`: `smart` (default), `manual`, or `off`. Smart uses an auxiliary LLM for risk assessment; manual prompts for dangerous commands; off disables approval checks and is equivalent to YOLO. Keep `cron_mode: deny` and `single_query_mode: deny` unless a reviewed, isolated automation specifically needs otherwise. Approval timeout fails closed by default.

`hermes --yolo`, `hermes chat --yolo`, `/yolo`, or `HERMES_YOLO_MODE=1` bypasses dangerous-command prompts for the current session, but not the always-on hardline blocklist. It is not “safe mode.” A practical safe mode is: a separate profile, no gateway exposure, minimum tool/MCP set, no production credentials, manual approvals, and an isolated terminal backend. Add organization-specific irreversible operations to `approvals.deny`; quoted fnmatch patterns block them even under YOLO/off on host-reaching backends. Deny rules are guardrails, not a sandbox.

Permanent “always” approvals become `command_allowlist` entries in `config.yaml`; review and remove them periodically. `hermes approvals suggest` is read-only by default and `hermes approvals suggest --apply 1,3` changes the allowlist—review proposed patterns before applying.

## Decision matrix and incident triage

| Situation | Select | Avoid / check first |
| --- | --- | --- |
| Need a vetted third-party integration | MCP catalog entry with least tools | Installing before reviewing its manifest and bootstrap. |
| Need a private/local service | stdio MCP or controlled internal HTTP MCP | Passing the full host environment or broad filesystem roots. |
| Need SaaS OAuth tools | HTTP MCP with `auth: oauth` | Static-token workarounds or an exposed callback. |
| Need messaging control | Gateway adapter plus pairing/allowlist | Treating any channel participant as an operator. |
| Need unattended automation | Cron plus explicit review and least privilege | `cron_mode: approve` on a host with production secrets. |
| Need to process untrusted code/content | Separate profile and isolated backend | Local backend with real HOME, host mounts, and forwarded credentials. |
| Need voice/media | Explicit STT/TTS/media provider | Sending sensitive recordings/assets without consent. |
| Tool fails after a change | Check config, credentials, endpoint/process, then tool filtering | Repeatedly reloading or broadening access blindly. |

For an incident or suspected credential exposure: stop the affected gateway/provider/MCP connection, revoke or rotate the credential at its issuer, remove the affected `.env`/OAuth configuration and persistent allowlists as appropriate, inspect logs and adapter authorization, then re-enable only after the extension configuration and scopes are reviewed. Hermes logs redact secrets, but redaction is not a justification for logging sensitive inputs.

## Primary sources

- [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) and [MCP config reference](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [AI Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers) and [Tool Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway)
- [Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) and [shell hooks reference](https://hermes-agent.nousresearch.com/docs/reference/shell-hooks)
- [Official repository](https://github.com/NousResearch/hermes-agent) and [optional MCP manifests](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
