# Hermes Agent Discord Setup

> Korean version: [`DISCORD.ko.md`](DISCORD.ko.md)
>
> **Research date:** 2026-08-24, against the official documentation only. **Facts** trace to Hermes Agent's official Discord, Messaging Gateway, Security, and Voice Mode pages plus Discord's own developer portal. **Recommendations** are this guide's operational advice. Verify version-sensitive names and defaults in the official reference before operating.

## Primary sources
- [Discord Setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Use Voice Mode with Hermes](https://hermes-agent.nousresearch.com/docs/guides/use-voice-mode-with-hermes)
- [Discord Developer Portal](https://discord.com/developers/applications)

## Before you start
**Fact:** the bot needs a working model provider first. A Discord adapter with no configured model connects and then fails to answer.

**Fact:** two files control Discord. `~/.hermes/.env` holds credentials and environment toggles; `~/.hermes/config.yaml` holds structured behavior. **Environment variables always win when both set the same thing.**

**Fact — documentation inconsistency:** a few official pages refer to a separate `~/.hermes/gateway-config.yaml`. The current Gateway Internals "Config Sources" section states that the gateway reads `config.yaml` directly through its YAML loader, and there is no official deprecation notice for the other filename. **Recommendation:** put everything in `~/.hermes/config.yaml`; do not create `gateway-config.yaml`.

## Step 1 — Create the Discord application
1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and choose **New Application**.
2. Name it, accept the Developer Terms, and select **Create**.
3. On **General Information**, copy the **Application ID**. You need it for the manual invite URL.

## Step 2 — Create the bot user
**Fact:** Discord creates the bot user automatically when you open the **Bot** page.

**Fact:** the official guide recommends **Public Bot = ON** and **Require OAuth2 Code Grant = OFF**. If you keep Public Bot **OFF**, the Discord-provided installation link will not work and you must use the manual OAuth2 URL in Step 5.

## Step 3 — Enable privileged gateway intents
**Fact:** this is the single most common failure point. Without the right intents the bot connects and stays silent because message text arrives empty.

On the **Bot** page, under **Privileged Gateway Intents**:

| Intent | Purpose | Required |
| --- | --- | --- |
| Presence Intent | See online/offline status | Optional |
| Server Members Intent | Access the member list, resolve usernames | Required |
| Message Content Intent | Read the text content of messages | Required |

Toggle both **Server Members Intent** and **Message Content Intent** on, then select **Save Changes**.

**Fact — a documented nuance worth knowing.** The setup table above marks Server Members as required, while the same page's troubleshooting section is more precise: Hermes always requests Message Content, and requests Server Members **additionally** when you use username-based allowlists (rather than numeric IDs) or `DISCORD_ALLOWED_ROLES`. Presence is not required for a text bot. The separate Voice Mode guide recommends enabling all three for voice-channel use.

**Recommendation:** follow the table — enable Server Members and Message Content — unless you have a specific reason to minimize scopes. The nuance matters when you audit permissions later, not when you first set up.

**Fact:** below 100 servers you may toggle intents freely. At 100 or more servers Discord requires a verification application to use privileged intents.

## Step 4 — Get the bot token
1. On the **Bot** page, under **Token**, select **Reset Token**.
2. Enter your 2FA code if your account has two-factor authentication.
3. Copy the token immediately.

**Fact:** the token is displayed **once**. If you lose it you must reset and generate a new one. Anyone holding it has full control of the bot.

**Recommendation:** store it in a password manager, then place it in `~/.hermes/.env` and run `chmod 600 ~/.hermes/.env`. Never commit it.

## Step 5 — Generate the invite URL
### Option A — Installation tab (recommended)
**Installation** → **Installation Contexts: Guild Install** → **Install Link: Discord Provided Link**, then set Default Install Settings:

- **Scopes:** `bot`, `applications.commands`
- **Minimum permissions:** View Channels, Send Messages, Embed Links, Attach Files, Read Message History
- **Recommended additions:** Send Messages in Threads, Add Reactions

### Option B — Manual URL
Required when Public Bot is OFF:

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

**Fact — permission integers:**

| Set | Integer |
| --- | --- |
| Minimal text | `117760` |
| Recommended text | `274878286912` |
| Voice guide, text only | `309237763136` |
| Voice guide, text and voice | `309240908864` |

**Recommendation:** these are not interchangeable descriptions of one permission set. Use `274878286912` for a text bot and re-invite with `309240908864` only when you actually add voice channels.

## Step 6 — Invite the bot
Choose **Add to Server**, select the server, then **Continue** → **Authorize** → complete the CAPTCHA.

**Fact:** the inviting account needs **Manage Server**, otherwise the server does not appear in the dropdown. The bot stays offline until the Hermes gateway starts — that is expected, not a failure.

## Step 7 — Find your Discord user ID
**Discord Settings** → **Advanced** → enable **Developer Mode**, then right-click your user and choose **Copy User ID**.

## Step 8 — Configure Hermes
### Option A — Interactive (recommended)
```bash
hermes gateway setup
```

Select **Discord**, then paste the bot token and your user ID when prompted.

### Option B — Manual
Add to `~/.hermes/.env`:

```dotenv
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496
# Multiple users are comma-separated:
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

Then start the gateway:

```bash
hermes gateway
```

The bot should come online within a few seconds. Send it a DM or mention it in a channel to test.

**Fact — how the adapter turns on.** The presence of `DISCORD_BOT_TOKEN` is the documented activation mechanism: the bundled Discord adapter auto-configures when the gateway starts. `DISCORD_ALLOWED_USERS` governs **authorization**, not activation. There is no `plugins.discord` key, no `plugins.enabled: [discord]` entry, and no separate enable flag in the official Discord material.

### Run it as a service
```bash
hermes gateway install              # systemd user service (Linux) / launchd agent (macOS)
sudo hermes gateway install --system  # Linux boot-time system service
hermes gateway start | stop | status
```

**Fact:** on Linux, `sudo loginctl enable-linger $USER` keeps a user service alive after logout, and logs are read with `journalctl --user -u hermes-gateway -f`. On macOS the plist is `~/Library/LaunchAgents/ai.hermes.gateway.plist` and logs are at `~/.hermes/logs/gateway.log`; re-run `hermes gateway install` after PATH or tool changes so launchd captures the new PATH.

## Configuration reference
Discord configuration lives in three surfaces. The root `discord:` section **mirrors the behavior environment variables**: when both set an equivalent setting, the environment variable wins and YAML supplies the default. Root `discord:` and `gateway.platforms.discord.extra` have disjoint documented key sets, so the docs state no precedence between those two YAML subtrees.

| Surface | Holds |
| --- | --- |
| `~/.hermes/.env` | Credentials and environment toggles (`DISCORD_*`) |
| `~/.hermes/config.yaml`, root `discord:` | Behavior: mentions, threads, reactions, channel filters, backfill, attachments, voice |
| `~/.hermes/config.yaml`, `gateway.platforms.discord.extra` | Slash-command access control and registration ownership |

### Environment variables
| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_BOT_TOKEN` | **Yes** | — | Bot token; also activates the adapter |
| `DISCORD_ALLOWED_USERS` | Conditional | — | Comma-separated user IDs allowed to interact |
| `DISCORD_ALLOWED_ROLES` | No | — | Comma-separated role IDs; OR semantics with allowed users; auto-enables Server Members Intent |
| `DISCORD_ALLOW_ALL_USERS` | No | `false` | Opt-in to allow every reachable Discord user |
| `GATEWAY_ALLOW_ALL_USERS` | No | `false` | Same, across every gateway platform |
| `DISCORD_ALLOWED_CHANNELS` | No | — | Restrict responses to these channel IDs; alone it can explicitly scope guild access and therefore satisfy the Discord access policy |
| `DISCORD_IGNORED_CHANNELS` | No | — | Never respond here; highest priority |
| `DISCORD_REQUIRE_MENTION` | No | `true` | Only respond to `@mention` in server channels |
| `DISCORD_THREAD_REQUIRE_MENTION` | No | `false` | `true` gates threads like channels — use for multi-bot threads |
| `DISCORD_FREE_RESPONSE_CHANNELS` | No | — | Channels that need no mention |
| `DISCORD_IGNORE_NO_MENTION` | No | `true` | Stay silent when others, but not the bot, are mentioned |
| `DISCORD_AUTO_THREAD` | No | `true` | Create a thread per `@mention` in a text channel |
| `DISCORD_NO_THREAD_CHANNELS` | No | — | Reply inline instead of threading |
| `DISCORD_REACTIONS` | No | `true` | 👀 processing, ✅ success, ❌ error |
| `DISCORD_ALLOW_BOTS` | No | `"none"` | `none`, `mentions`, or `all` |
| `DISCORD_HISTORY_BACKFILL` | No | `true` | Prepend missed channel scrollback on mention |
| `DISCORD_HISTORY_BACKFILL_LIMIT` | No | `50` | Messages scanned backwards |
| `DISCORD_REPLY_TO_MODE` | No | `"first"` | `off`, `first`, or `all` |
| `DISCORD_COMMAND_SYNC_POLICY` | No | `"safe"` | `safe`, `bulk`, or `off` |
| `DISCORD_HOME_CHANNEL` | No | — | Channel for proactive messages such as cron output |
| `DISCORD_ALLOW_MENTION_EVERYONE` | No | `false` | Bot cannot ping `@everyone`/`@here` |
| `DISCORD_ALLOW_MENTION_ROLES` | No | `false` | Bot cannot ping roles |
| `DISCORD_ALLOW_MENTION_USERS` | No | `true` | Bot may ping individual users |
| `DISCORD_MAX_ATTACHMENT_BYTES` | No | `33554432` | 32 MiB; `0` is unlimited and buffers in memory |
| `DISCORD_PROXY` | No | — | `http://`, `https://`, or `socks5://`; overrides `HTTPS_PROXY` |

### config.yaml
```yaml
discord:
  require_mention: true           # Require @mention in server channels
  thread_require_mention: false   # true for multi-bot threads
  free_response_channels: ""      # Comma-separated IDs or a YAML list
  auto_thread: true               # Auto-create threads on @mention
  reactions: true
  ignored_channels: []
  no_thread_channels: []
  history_backfill: true
  history_backfill_limit: 50
  channel_prompts:                # Ephemeral per-channel system prompts
    "1234567890": |
      This channel is for research tasks. Prefer citations and concise synthesis.

group_sessions_per_user: true     # Global: isolate each user's transcript
```

**Fact:** `channel_prompts` are injected every turn without being persisted to transcript history; exact thread or channel IDs win, and a thread with no entry falls back to its parent channel ID. Changes take effect on the next turn.

**Fact:** `discord.missed_message_backfill` (disabled by default) recovers messages lost when Discord's WebSocket resume window expires during a restart. Recovered messages pass through the same authorization, mention, and deduplication path as live events, and the ledger lives per profile at `gateway/discord_message_recovery.db`.

## Who is allowed to talk to the bot
**Fact:** access is **fail-closed**. With no policy configured, every inbound user is denied and the log records `No Discord access policy configured; inbound Discord messages will be denied by default.` `DISCORD_ALLOWED_CHANNELS` is itself a policy: it can explicitly scope guild access even when no user/role allowlist is present. DMs still require a user policy, pairing, or explicit allow-all.

**Fact — the documented priority chain:** platform allow-all → approved DM pairing → platform allowlist → global allowlist → global allow-all → default deny.

**Fact:** an unknown DM user receives an 8-character pairing code. The operator approves it with `hermes pairing approve discord <code>`, lists pending codes with `hermes pairing list`, and revokes with `hermes pairing revoke discord <user-id>`. Codes expire after one hour and are rate-limited.

**Fact:** `DISCORD_IGNORED_CHANNELS` takes priority over every other channel setting. `DISCORD_ALLOWED_CHANNELS` restricts guild channels while DMs remain governed by user authorization; as above, the channel list also satisfies the guild-side access-policy requirement.

### Slash-command access control
```yaml
gateway:
  platforms:
    discord:
      extra:
        allow_from:
          - "123456789012345678"
          - "999888777666555444"
        allow_admin_from:            # Admins can run every slash command
          - "123456789012345678"
        user_allowed_commands:       # Non-admins get only these, plus /help and /whoami
          - status
          - model
          - history
        group_allow_admin_from:      # Separate lists for server channels
          - "123456789012345678"
        group_user_allowed_commands:
          - status
```

**Fact:** `/help` and `/whoami` are always allowed. Plain chat is unaffected — a non-admin can still converse. If `allow_admin_from` is unset for a scope, gating is disabled for that scope, so existing installs keep working. **DM admin status does not imply server-channel admin status.** Use `/whoami` to see the active scope and tier.

## Runtime behavior
| Context | Behavior |
| --- | --- |
| DMs | Responds to every message, no mention needed; each DM has its own session — after authorization |
| Server channels | Requires `@mention` by default |
| Threads | After the bot participates, follow-ups need no mention, unless `thread_require_mention` is true |
| Free-response channels | No mention required; replies inline and skips auto-threading |
| Forum channels | Each send creates a separate thread post |

**Fact:** `group_sessions_per_user` defaults to `true`, so two people in one channel hold separate conversations. Setting it to `false` shares one transcript, one token budget, one interrupt state, and one running-agent slot for the whole room.

**Fact — bot-to-bot conversation is unsupported.** `DISCORD_ALLOW_BOTS` exists to accept input from one trusted relay or webhook bot. Wiring several Hermes profiles to reply to each other is an unsupported topology: Discord auto-mentions the replied-to author, so under `"mentions"` two bots satisfy each other's mention gate indefinitely and ack-loop. **There is no circuit breaker for this.** Keep the default `"none"`.

## Slash commands
**Fact:** built-ins include `/new`, `/reset`, `/status`, `/model`, `/personality`, `/retry`, `/undo`, `/stop`, `/whoami`, `/approve`, `/deny`, `/sethome`, `/compress`, `/title`, `/resume`, `/sessions`, `/usage`, `/reasoning`, `/voice`, `/rollback`, `/background`, `/reload-mcp`, `/platform`, `/restart`, `/commands`, `/insights`, `/update`, and `/help`. `/verbose` requires `display.tool_progress_command: true`. Official material is internally inconsistent about `/clear` and `/history`: approval/access examples include them, while a chat-command table labels them CLI-only. Confirm availability with `/help` on the installed version.

**Fact:** installed skills register automatically as native application commands on the next gateway restart. **Discord's hard limit is 100 application commands per bot**; excess skills are skipped with a log warning.

**Fact:** `DISCORD_COMMAND_SYNC_POLICY` controls startup sync — `safe` diffs and patches existing global commands (recreating them when Discord metadata cannot be patched), `bulk` restores the older full-sync behavior, and `off` skips sync entirely.

**Fact:** when several gateways share one Discord application, exactly one must own global registration. Followers set `gateway.platforms.discord.extra.slash_commands: false` (default `true`), or the last one to start wins and commands flap.

**Fact:** `/model` with no arguments opens a picker limited to 25 providers and 25 models by Discord's dropdown limits, with a 120-second timeout; only authorized users may interact with it.

## Approvals inside Discord
**Fact:** two distinct flows exist.

- **Dangerous terminal commands.** Hermes posts the command details and waits for a text reply of `yes`, `y`, `approve`, `ok`, or `go` — or `no`, `n`, `deny`, `cancel`. `/approve` and `/deny` also work. The gateway sets `HERMES_EXEC_ASK=1` automatically. `approvals.timeout` (default 300 seconds) **denies on timeout**.
- **Destructive session commands** (`/clear`, `/new`, `/reset`, `/undo`) with `approvals.destructive_slash_confirm` enabled use a native three-option dialog: **Approve Once / Always Approve / Cancel**. Choosing "Always" flips that config to false.

**Fact:** clarify questions also render choice buttons, but those are not dangerous-command approval. The official material disagrees on `agent.clarify_timeout`: the dedicated settings section says 3600 seconds while platform prose says 600; follow the dedicated settings section until upstream reconciles it.

**Fact:** `approvals.mode` values are `smart` (default), `manual`, and `off`; the hardline blocklist survives YOLO and `off`. **However**, the dangerous-command guard stack runs only on host-reaching backends (local, SSH, host-mounted Docker) — isolated container backends skip it entirely.

**Recommendation:** the docs do not state which authorized participant may answer another user's pending approval prompt. Until that is documented, keep `group_sessions_per_user: true` and keep allowlists tight.

## Attachments, voice, and media
**Fact:** outbound media uses `MEDIA:/path` — images preview inline, MP4/MOV get a player, audio becomes a voice message where possible, and documents attach. Discord tier limits apply (25 MB free through 500 MB); an HTTP 413 falls back to a local-cache link.

**Fact:** inbound attachments of **any file type** are accepted; user authorization, not file extension, is the gate. Text-like UTF-8 content is auto-injected up to 100 KiB, and binaries are surfaced as a local path. Note a documented contradiction: the environment table describes `DISCORD_ALLOW_ANY_ATTACHMENT` with a `false` default, while a later authoritative section states that the legacy `discord.allow_any_attachment` key is now a **no-op** and all types are accepted; it remains only so existing configurations do not error.

**Fact:** incoming Discord voice messages are transcribed automatically through local `faster-whisper`, Groq (`GROQ_API_KEY`), or OpenAI (`VOICE_TOOLS_OPENAI_KEY`). `/voice on` speaks replies to voice-origin messages; `/voice tts` speaks every reply.

**Fact:** live voice channels use `/voice join`, `/voice leave`, and `/voice status`. Hermes posts transcripts to the text channel where join was issued. This requires ffmpeg and opus, the Connect and Speak Discord permissions, and re-invitation with the voice permission integer. The bot auto-leaves after 300 idle seconds; `voice_channel_inactivity_timeout_seconds: 0` keeps it until an explicit leave.

## Troubleshooting
| Symptom | Cause | Action |
| --- | --- | --- |
| Bot is offline | The gateway is not running — expected before first start | `hermes gateway status`, then `start`; check the gateway log |
| Online but never responds anywhere | Message Content Intent disabled, or no access policy | Enable the intent and save; set an allowlist; restart; grep the log for `No Discord access policy configured` |
| `PrivilegedIntentsRequired` on startup | Required intent is off | Enable Message Content, plus Server Members for username allowlists or roles; restart |
| Responds in DM but not in a channel | `@mention` required by default | Check `DISCORD_REQUIRE_MENTION`, free-response channels, ignored/allowed channels, and channel permissions |
| Slash commands do not appear | Missing scope, stale sync, or a conflict | Ensure `applications.commands` was in the invite; restart after installing skills; check the 100-command warning; confirm sync policy is not `off`; ensure only one gateway owns registration |
| Token rejected | Invalid or revoked token | Reset the token, update `DISCORD_BOT_TOKEN`, restart; failures surface as a fatal `discord_auth_error` |
| Permission errors at runtime | Missing channel permissions | Needs View Channels, Send Messages, Embed Links, Attach Files, Read Message History; threads need Send Messages in Threads; reactions need Add Reactions |
| Adapter went quiet after network trouble | The per-adapter circuit breaker tripped | `/platform list`, grep the log for `circuit breaker|paused|disabled`, check Discord status, then `/platform resume discord` — it does **not** auto-resume |
| Bot appears connected but misses messages | Stale WebSocket while REST still returns 200 | Tune `discord.websocket_liveness_interval_seconds`, `websocket_liveness_failure_threshold`, `websocket_heartbeat_ack_max_age_seconds`, `websocket_max_latency_seconds` |
| Joins voice but hears nothing | Authorization, mute, intents, or permissions | Verify the user ID is allowed, the user is unmuted, intents are on, and Connect/Speak are granted |
| A new forum channel is not detected | Created after gateway start | Restart the gateway, or run `/channels refresh` |

**Fact:** the official Discord page has no dedicated headings for "token invalid", "commands not appearing", or generic channel-permission errors. The rows above combine the Discord page with the Messaging Gateway and Voice Mode documentation rather than inventing error strings.

## Security boundary
**Fact:** every inbound message, attachment, URL, and quoted instruction is untrusted input. Authentication and allowlists verify **who** may trigger the agent; they do not make the **text** trustworthy. Hermes does not — and by its own documentation cannot reliably — sanitize untrusted text with a blocklist.

**Recommendation:** bound the blast radius through authorization, least-capability toolsets, approvals kept on, an isolated terminal backend, credential isolation, and narrow prompting. Treat a Discord gateway as a public entrance to your agent's capabilities.

## Verification checklist
- [ ] Message Content Intent is on; Server Members is on when using role or username allowlists.
- [ ] The token is in `~/.hermes/.env` at mode `600`, and never committed.
- [ ] The invite used scopes `bot` and `applications.commands` with permission integer `274878286912`.
- [ ] At least one access policy is configured — the default denies everyone.
- [ ] YAML lives in `~/.hermes/config.yaml`, not `gateway-config.yaml`.
- [ ] `DISCORD_ALLOW_BOTS` is `"none"` unless one specific trusted, non-auto-replying bot must be accepted.
- [ ] The approval posture was chosen together with the terminal backend, since isolated backends skip dangerous-command checks.
