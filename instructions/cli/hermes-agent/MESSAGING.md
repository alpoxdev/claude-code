# Hermes Agent Messaging Gateway

> Korean version: [`MESSAGING.ko.md`](MESSAGING.ko.md)
>
> **Research date:** 2026-08-24, against the official documentation only. **Facts** trace to Hermes Agent's official Messaging Gateway, Sessions, Security, and per-platform pages. **Recommendations** are this guide's operational advice. For the full Discord walkthrough see [`DISCORD.md`](DISCORD.md); for configuration files see [`CONFIGURATION.md`](CONFIGURATION.md).

## Primary sources

- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Telegram](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram) · [Slack](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack) · [Signal](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal) · [Email](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email) · [WhatsApp](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

## The gateway process model

**Fact:** the gateway is a **single background process** that connects to every configured platform, handles sessions, runs cron jobs, and delivers voice messages. Each adapter routes messages into a per-chat session store and then into the agent. The cron scheduler ticks every 60 seconds inside this process.

**Recommendation:** because cron lives in the gateway, a scheduled job simply does not fire when the gateway is down. Check the gateway before debugging a cron schedule.

```bash
hermes gateway                         # Foreground
hermes gateway setup                   # Interactive platform wizard
hermes gateway install                 # systemd user service (Linux) / launchd agent (macOS)
sudo hermes gateway install --system   # Linux boot-time system service
hermes gateway start | stop | restart | status
hermes gateway status --system         # Linux system service
```

### Service operation

| Platform | Log | Notes |
| --- | --- | --- |
| Linux, user service | `journalctl --user -u hermes-gateway -f` | `sudo loginctl enable-linger $USER` keeps it alive after logout |
| Linux, system service | `journalctl -u hermes-gateway -f` | |
| macOS | `tail -f ~/.hermes/logs/gateway.log` | Plist at `~/Library/LaunchAgents/ai.hermes.gateway.plist` |

**Fact:** the docs warn against adding an `ExecStopPost` kill drop-in — it causes restart loops. Do not keep user and system units installed together unless intended, because gateway commands then become ambiguous.

**Fact:** re-run `hermes gateway install` on macOS after PATH or tool changes so launchd captures the new PATH. An optional Linux watchdog is available with `gateway.systemd_watchdog_seconds: 120` followed by `hermes gateway install --force`; the default `0` uses `Type=simple`.

## The common setup sequence

Every adapter follows the same shape:

1. Confirm a working model and tool provider — a bot with no model connects and then fails.
2. Put platform credentials in `~/.hermes/.env`; put structured behavior in `~/.hermes/config.yaml`.
3. Configure the adapter through `hermes gateway setup`, or with the documented environment fields.
4. Start it: `hermes gateway install` and `hermes gateway start`, or `hermes gateway` in the foreground.
5. Establish authorization — an allowlist, an approved DM pairing, or an explicit allow-all — and complete any platform link, invite, or QR step.
6. Verify with `hermes gateway status` and a real message.

**Fact:** the messaging index documents no universal manual `platforms.<adapter>.enabled: true` requirement. For adapters like Discord, credential presence is the documented activation mechanism.

## Supported platforms

**Fact:** the official comparison table names Telegram, Discord, Slack, Google Chat, WhatsApp, WhatsApp Cloud API, Signal, SMS, Email, Home Assistant, Mattermost, Matrix, DingTalk, Feishu/Lark, WeCom, WeCom Callback, Weixin, BlueBubbles (iMessage), Photon (iMessage), QQ, Yuanbao, Microsoft Teams, LINE, ntfy, Raft, IRC, Buzz, and SimpleX — plus the browser.

**Fact:** Hermes Relay is **not** a chat platform. It fronts external connectors and negotiates capabilities at handshake.

## Adapter differences

Discord is documented separately in [`DISCORD.md`](DISCORD.md). The four below show how much the structural model varies.

### Telegram

Credentials: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`. Created through BotFather.

**Fact:** the default transport is outbound long polling. Webhook mode instead requires `TELEGRAM_WEBHOOK_URL` and a mandatory `TELEGRAM_WEBHOOK_SECRET` (optionally `TELEGRAM_WEBHOOK_PORT`, default 8443), turning the gateway into an HTTP webhook server. For group visibility, BotFather privacy mode must be off or the bot must be a group admin. **Never reuse one bot token across running gateways** — concurrent polling is rejected.

### Slack

Credentials: `SLACK_BOT_TOKEN` (`xoxb-`), `SLACK_APP_TOKEN` (`xapp-`), `SLACK_ALLOWED_USERS`.

**Fact:** Slack uses Bolt Socket Mode over WebSockets and needs no public URL. Install or invite the app per channel. One gateway can serve multiple workspaces through comma-separated bot tokens; one app-level token still handles Socket Mode and the first bot token is primary. Slack threads act as session continuation.

**Fact:** Slack blocks native slash commands inside threads, so Hermes accepts a `!` prefix there — `!stop`, `!new`, `!status` — and `@Hermes /stop` also works.

### Signal

Credentials: `SIGNAL_HTTP_URL` (for example `http://127.0.0.1:8080`), `SIGNAL_ACCOUNT`, and ideally `SIGNAL_ALLOWED_USERS`.

**Fact:** Signal uses `signal-cli` or an HTTP daemon with a handset linked as a secondary device (`signal-cli link -n "HermesAgent"`, then scan from Signal's Linked Devices) rather than a bot API token. Groups are disabled unless group IDs or `*` are configured. The adapter cannot edit sent messages, so it suppresses tool-progress updates.

### Email

Credentials: `EMAIL_ADDRESS`, `EMAIL_PASSWORD` (an app password), `EMAIL_IMAP_HOST`, `EMAIL_SMTP_HOST`, `EMAIL_ALLOWED_USERS`.

**Fact:** email uses IMAP polling for unseen mail (default interval 15 seconds) plus SMTP replies — there is no bot API. Replies preserve the mail thread through `In-Reply-To`/`References` and a `Re:` subject. Pairing is opt-in via `platforms.email.unauthorized_dm_behavior: pair`; otherwise unknown senders are silently ignored. **Run only one gateway instance against an inbox**, or recipients get duplicate replies.

### WhatsApp

**Fact:** the documented access field is `WHATSAPP_ALLOWED_USERS` (numbers with country code, **no `+`**) or `WHATSAPP_ALLOW_ALL_USERS=true`; no bot token is documented for this adapter. It is a paired linked-device bridge: run `hermes whatsapp`, then scan the terminal QR from WhatsApp's Linked Devices. Session keys persist across restarts and the gateway starts the saved bridge automatically.

**Recommendation:** the docs direct business bots to the separately documented Meta Cloud API because the linked-device path carries account-ban risk.

## Authorization and pairing

**Fact — the documented access priority chain:** platform allow-all → approved DM pairing → platform allowlist → global allowlist → global allow-all → **default deny**.

**Fact:** the generic controls are `GATEWAY_ALLOWED_USERS` and `GATEWAY_ALLOW_ALL_USERS` (not recommended). Per-platform allowlists follow the `<PLATFORM>_ALLOWED_USERS` pattern across Telegram, Discord, Signal, SMS, Email, Mattermost, Matrix, DingTalk, Feishu, WeCom, WeCom Callback, and Teams.

**Fact — DM pairing:** an unknown user receives a one-time code. The operator runs `hermes pairing approve <platform> <CODE>`, inspects with `hermes pairing list`, and revokes with `hermes pairing revoke <platform> <user-id>`. Codes are cryptographically random, rate-limited, and expire after one hour.

**Fact — admin tier is separate from reachability.** Under `gateway.platforms.<platform>.extra`, `allow_from` grants access while `allow_admin_from`, `user_allowed_commands`, `group_allow_admin_from`, and `group_user_allowed_commands` govern slash commands. `/help` and `/whoami` are always allowed, and DM and group scopes have independent admin lists.

## Session scoping

**Fact:** session keys are derived from the message source:

| Surface | Key |
| --- | --- |
| DM | `agent:main:<platform>:dm:<chat_id>` |
| WhatsApp DM | `agent:main:whatsapp:dm:<canonical_identifier>` |
| Group | `agent:main:<platform>:group:<chat_id>:<user_id>` |
| Group thread/topic | `agent:main:<platform>:group:<chat_id>:<thread_id>`; Telegram DM topics use `agent:main:telegram:dm:<chat_id>:<thread_id>` |
| Channel | `agent:main:<platform>:channel:<chat_id>:<user_id>` |

**Fact:** `group_sessions_per_user` defaults to `true`, isolating each participant's transcript. Setting it to `false` gives the room one shared conversation — and therefore one shared token budget, one interrupt state, and one running-agent slot. Threads stay separate from their parent regardless, but a group thread/topic is **shared by all participants by default**; set `thread_sessions_per_user: true` for per-user thread isolation. Sessions persist until `/new`, `/reset`, or compression; `session_reset.mode` defaults to `none` and additionally supports `idle`, `daily`, and `both`. Before automatic reset Hermes gets a turn to save memories, and sessions with active background processes are never auto-reset.

**Fact:** when a participant ID is unavailable, the platform falls back to a single shared room session.

## Running several adapters

**Fact:** one gateway typically runs several adapters at once. Operate them individually without restarting everything:

```
/platform list
/platform pause <name>
/platform resume <name>
```

**Fact:** a paused adapter keeps its connection and background loops but drops incoming messages. `/platform list` reports `running`, `paused`, or `paused-by-breaker`.

**Fact:** each adapter has a circuit breaker that trips after repeated retryable failures — network errors, rate limits, 5xx responses, WebSocket faults. **It does not auto-resume.** Once the provider is healthy again, `/platform resume <name>` clears and rearms it.

**Fact — documented conflicts:** do not run user and system gateway units together; never share one Telegram bot token across gateways; run only one gateway against an email inbox. `HERMES_HOME` isolates separate installations with hashed service and launchd names, and commands target the current home.

## Message delivery

**Fact:** delivery uses a durable `state.db` ledger with at-least-once semantics. A crash before or during a send is retried on boot; a mid-send crash is marked "Recovered reply" and may duplicate. Retries are bounded at three attempts within 24 hours, after which rows are abandoned; delivered rows are pruned after seven days.

**Fact:** `gateway.delivery_ledger: false` restores the older, loss-prone behavior. Restart-interrupted sessions auto-resume on the next reply, logged as `Scheduled auto-resume for N restart-interrupted session(s)`.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Gateway will not start or is not running | `hermes gateway status`; read the service log; re-run `hermes gateway setup`; then `hermes doctor` |
| Gateway starts but nobody can message it | The documented main cause is an incomplete bot token, allowlist, or platform setup |
| Adapter connects but messages fail | Verify the credential, link/invite/QR step, and allowlist or pairing; inspect the gateway log |
| An adapter went quiet | Grep the log for `circuit breaker|paused|disabled`, run `/platform list`, check the provider status page, then `/platform resume <name>` |
| Duplicate replies | Expected at-least-once behavior after a mid-send crash, or two gateways against one inbox/token |
| Missing messaging dependencies | Install the messaging extra as documented, then restart the gateway |

## Security boundary

**Fact:** an inbound message is untrusted data. Allowlists and pairing authenticate **who** may trigger the agent; webhook HMAC authenticates the **sender**, not the content. Upstream text — a PR title, an issue body, a forwarded message — remains attacker-controlled, and the docs state that Hermes does not and cannot reliably sanitize untrusted text with a blocklist.

**Recommendation:** the real boundary is the capability surface. Reduce the toolset exposed to gateway platforms, keep approvals on, prefer an isolated terminal backend for untrusted work, use separate identities for production, and never enable headless auto-approval just because a messaging adapter exists.

## Verification checklist

- [ ] A model and tool provider work before any adapter is enabled.
- [ ] Credentials are in `~/.hermes/.env` at mode `600`; behavior is in `config.yaml`.
- [ ] An explicit authorization policy exists — the gateway denies by default.
- [ ] No bot token or inbox is shared between two running gateways.
- [ ] Service logs were confirmed reachable before relying on the gateway unattended.
- [ ] The exposed toolset and approval mode were chosen deliberately for a public entry point.
