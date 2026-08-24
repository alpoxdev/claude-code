# Hermes Agent 메시징 게이트웨이

> 영어판: [`MESSAGING.md`](MESSAGING.md)
>
> **조사일:** 2026-08-24, 공식 문서만 근거로 삼았다. 아래 **사실**은 Hermes Agent 공식 Messaging Gateway·Sessions·Security·플랫폼별 문서에서 추적한 내용이고, **권고**는 이 문서의 운영 조언이다. 전체 Discord 절차는 [`DISCORD.ko.md`](DISCORD.ko.md), 설정 파일은 [`CONFIGURATION.ko.md`](CONFIGURATION.ko.md)을 본다.

## 1차 출처

- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Telegram](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram) · [Slack](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/slack) · [Signal](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/signal) · [Email](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/email) · [WhatsApp](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/whatsapp)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

## Gateway 프로세스 모델

**사실:** Gateway는 구성한 모든 platform을 연결하고, session을 처리하며, cron job을 실행하고, voice message를 전달하는 **단일 background process**다. 각 adapter는 메시지를 chat별 session store로 routing한 뒤 agent에 보낸다. Cron scheduler는 이 프로세스 안에서 60초마다 tick한다.

**권고:** Cron도 gateway 안에 있으므로 gateway가 내려가 있으면 예약 job은 실행되지 않는다. Cron schedule을 디버깅하기 전에 gateway부터 확인한다.

```bash
hermes gateway                         # Foreground
hermes gateway setup                   # 대화형 platform wizard
hermes gateway install                 # Linux systemd user service / macOS launchd agent
sudo hermes gateway install --system   # Linux boot-time system service
hermes gateway start | stop | restart | status
hermes gateway status --system         # Linux system service
```

### Service 운영

| Platform | 로그 | 비고 |
| --- | --- | --- |
| Linux user service | `journalctl --user -u hermes-gateway -f` | `sudo loginctl enable-linger $USER`는 logout 뒤에도 service를 유지 |
| Linux system service | `journalctl -u hermes-gateway -f` | |
| macOS | `tail -f ~/.hermes/logs/gateway.log` | Plist는 `~/Library/LaunchAgents/ai.hermes.gateway.plist` |

**사실:** 문서는 `ExecStopPost` kill drop-in을 추가하지 말라고 경고한다. Restart loop가 생긴다. 의도한 경우가 아니면 user unit과 system unit을 함께 설치하지 않는다. 그러면 gateway 명령 대상이 모호해진다.

**사실:** macOS에서 PATH나 tool을 바꾸면 launchd가 새 PATH를 잡도록 `hermes gateway install`을 다시 실행한다. 선택적 Linux watchdog은 `gateway.systemd_watchdog_seconds: 120` 설정 뒤 `hermes gateway install --force`로 켤 수 있다. 기본값 `0`은 `Type=simple`을 쓴다.

## 공통 설정 순서

Adapter는 모두 같은 순서를 따른다.

1. 동작하는 model/tool provider를 확인한다. Model 없는 bot은 연결돼도 답하지 못한다.
2. Platform credential은 `~/.hermes/.env`에, 구조화된 동작은 `~/.hermes/config.yaml`에 둔다.
3. `hermes gateway setup` 또는 문서화된 환경변수로 adapter를 구성한다.
4. `hermes gateway install` 후 `hermes gateway start` 또는 foreground `hermes gateway`로 시작한다.
5. Allowlist, 승인된 DM pairing, 명시적 allow-all 중 하나로 authorization을 정하고 platform link/invite/QR 절차를 끝낸다.
6. `hermes gateway status`와 실제 메시지로 검증한다.

**사실:** Messaging index는 모든 adapter에 공통으로 수동 `platforms.<adapter>.enabled: true`가 필요하다고 문서화하지 않는다. Discord처럼 credential 존재가 문서화된 activation mechanism인 adapter가 있다.

## 지원 platform

**사실:** 공식 비교표는 Telegram, Discord, Slack, Google Chat, WhatsApp, WhatsApp Cloud API, Signal, SMS, Email, Home Assistant, Mattermost, Matrix, DingTalk, Feishu/Lark, WeCom, WeCom Callback, Weixin, BlueBubbles(iMessage), Photon(iMessage), QQ, Yuanbao, Microsoft Teams, LINE, ntfy, Raft, IRC, Buzz, SimpleX, 그리고 browser를 이름으로 든다.

**사실:** Hermes Relay는 chat platform이 아니다. 외부 connector 앞단에 서며 handshake에서 capability를 협상한다.

## Adapter 차이

Discord는 [`DISCORD.ko.md`](DISCORD.ko.md)에서 별도로 다룬다. 아래 네 adapter는 구조 차이가 큰 사례다.

### Telegram

Credential: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USERS`. BotFather에서 만든다.

**사실:** 기본 transport는 outbound long polling이다. Webhook mode에는 `TELEGRAM_WEBHOOK_URL`, 필수 `TELEGRAM_WEBHOOK_SECRET`, 선택 `TELEGRAM_WEBHOOK_PORT`(기본 8443)이 필요하고 gateway가 HTTP webhook server가 된다. Group visibility를 위해서는 BotFather privacy mode를 끄거나 bot을 group admin으로 만든다. **하나의 bot token을 여러 실행 중 gateway에서 재사용하면 안 된다.** 동시 polling은 거부된다.

### Slack

Credential: `SLACK_BOT_TOKEN`(`xoxb-`), `SLACK_APP_TOKEN`(`xapp-`), `SLACK_ALLOWED_USERS`.

**사실:** Slack은 Bolt Socket Mode를 WebSocket으로 사용하므로 public URL이 필요 없다. Channel별 app install/invite가 필요하다. Bot token을 쉼표로 구분하면 한 gateway가 여러 workspace를 맡을 수 있고, Socket Mode에는 app-level token 하나를 쓰며 첫 bot token이 primary다. Slack thread는 session continuation으로 동작한다.

**사실:** Slack은 thread 안 native slash command를 막으므로 Hermes는 그곳에서 `!` prefix — `!stop`, `!new`, `!status` — 를 받는다. `@Hermes /stop`도 된다.

### Signal

Credential: `SIGNAL_HTTP_URL`(예: `http://127.0.0.1:8080`), `SIGNAL_ACCOUNT`, 가능하면 `SIGNAL_ALLOWED_USERS`.

**사실:** Signal은 bot API token 대신 linked secondary handset를 쓰는 `signal-cli` 또는 HTTP daemon을 사용한다. `signal-cli link -n "HermesAgent"` 뒤 Signal의 Linked Devices에서 scan한다. Group은 group ID 또는 `*`를 구성하지 않으면 꺼져 있다. Adapter는 보낸 메시지를 편집할 수 없어 tool-progress update를 억제한다.

### Email

Credential: `EMAIL_ADDRESS`, `EMAIL_PASSWORD`(app password), `EMAIL_IMAP_HOST`, `EMAIL_SMTP_HOST`, `EMAIL_ALLOWED_USERS`.

**사실:** Email은 bot API가 아니라 unseen mail의 IMAP polling(기본 15초)과 SMTP reply를 쓴다. `In-Reply-To`/`References`, `Re:` subject로 mail thread를 보존한다. Pairing은 `platforms.email.unauthorized_dm_behavior: pair`로 opt-in해야 하며, 그렇지 않으면 모르는 sender는 조용히 무시된다. **하나의 inbox에는 gateway 하나만 실행한다.** 여러 개면 recipient가 중복 reply를 받는다.

### WhatsApp

**사실:** 문서화된 접근 필드는 `WHATSAPP_ALLOWED_USERS`(country code 포함, **`+` 없음**) 또는 `WHATSAPP_ALLOW_ALL_USERS=true`다. 이 adapter에는 bot token이 문서화되어 있지 않다. Paired linked-device bridge다. `hermes whatsapp`을 실행한 뒤 WhatsApp Linked Devices에서 terminal QR을 scan한다. Session key는 restart 뒤에도 남고 gateway는 저장된 bridge를 자동 시작한다.

**권고:** 문서는 business bot에는 account-ban 위험이 있는 linked-device 경로 대신 별도 Meta Cloud API 문서를 따르라고 한다.

## Authorization과 pairing

**사실 — 문서상 접근 우선순위 체인:** platform allow-all → 승인된 DM pairing → platform allowlist → global allowlist → global allow-all → **기본 거부**.

**사실:** 공통 제어는 `GATEWAY_ALLOWED_USERS`, `GATEWAY_ALLOW_ALL_USERS`(비권장)다. Platform별 allowlist는 Telegram, Discord, Signal, SMS, Email, Mattermost, Matrix, DingTalk, Feishu, WeCom, WeCom Callback, Teams에서 `<PLATFORM>_ALLOWED_USERS` 패턴을 따른다.

**사실 — DM pairing:** 모르는 user는 일회용 code를 받는다. 운영자는 `hermes pairing approve <platform> <CODE>`로 승인하고 `hermes pairing list`로 확인하며 `hermes pairing revoke <platform> <user-id>`로 철회한다. Code는 암호학적으로 random이고 rate limit되며 한 시간 뒤 만료된다.

**사실 — admin tier는 reachability와 별개다.** `gateway.platforms.<platform>.extra` 아래에서 `allow_from`이 접근을, `allow_admin_from`, `user_allowed_commands`, `group_allow_admin_from`, `group_user_allowed_commands`가 slash command를 제어한다. `/help`, `/whoami`는 항상 허용되며 DM·group scope의 admin list는 독립적이다.

## Session 범위

**사실:** Session key는 메시지 출처로부터 정해진다.

| Surface | Key |
| --- | --- |
| DM | `agent:main:<platform>:dm:<chat_id>` |
| WhatsApp DM | `agent:main:whatsapp:dm:<canonical_identifier>` |
| Group | `agent:main:<platform>:group:<chat_id>:<user_id>` |
| Group thread/topic | `agent:main:<platform>:group:<chat_id>:<thread_id>`. Telegram DM topic은 `agent:main:telegram:dm:<chat_id>:<thread_id>` |
| Channel | `agent:main:<platform>:channel:<chat_id>:<user_id>` |

**사실:** `group_sessions_per_user` 기본값은 `true`라 participant별 transcript를 격리한다. `false`면 room이 대화 하나를 공유하므로 token budget, interrupt state, 실행 중 agent slot도 하나를 공유한다. Thread는 부모와 무관하게 분리되지만 group thread/topic은 **기본적으로 모든 participant가 공유**한다. Thread를 사용자별로 격리하려면 `thread_sessions_per_user: true`를 설정한다. Session은 `/new`, `/reset`, compression 전까지 지속하며 `session_reset.mode` 기본값은 `none`이고 `idle`, `daily`, `both`도 지원한다. 자동 reset 전 Hermes는 memory를 저장할 turn을 받고 active background process가 있는 session은 자동 reset되지 않는다.

**사실:** Participant ID를 얻을 수 없으면 platform은 room 전체가 공유하는 session 하나로 fallback한다.

## 여러 adapter 실행하기

**사실:** 보통 gateway 하나가 여러 adapter를 동시에 실행한다. 전체를 restart하지 않고 adapter별로 조작한다.

```
/platform list
/platform pause <name>
/platform resume <name>
```

**사실:** Pause된 adapter는 connection과 background loop를 유지하지만 inbound message는 drop한다. `/platform list`는 `running`, `paused`, `paused-by-breaker`를 표시한다.

**사실:** Adapter마다 retryable failure — network error, rate limit, 5xx, WebSocket fault — 반복 시 trip되는 circuit breaker가 있다. **자동으로 resume하지 않는다.** Provider가 회복한 뒤 `/platform resume <name>`이 breaker를 clear/rearm한다.

**사실 — 문서화된 충돌:** User/system gateway unit을 함께 실행하지 않는다. 하나의 Telegram bot token을 gateway끼리 공유하지 않는다. Email inbox에는 gateway 하나만 실행한다. `HERMES_HOME`은 서로 다른 설치를 hashed service·launchd name으로 분리하며 command는 현재 home을 대상으로 한다.

## Message 전달

**사실:** 전달은 durable `state.db` ledger를 사용하는 at-least-once semantics다. Send 전·중 crash가 나면 boot 시 retry한다. Mid-send crash는 "Recovered reply"로 표시되어 중복될 수 있다. Retry는 24시간 안 3회로 제한되고 그 뒤 row는 abandoned 처리된다. Delivered row는 7일 후 정리된다.

**사실:** `gateway.delivery_ledger: false`는 예전의 손실 가능 동작으로 되돌린다. Restart로 중단된 session은 다음 reply에 auto-resume하고 `Scheduled auto-resume for N restart-interrupted session(s)`로 기록된다.

## 문제 해결

| 증상 | 조치 |
| --- | --- |
| Gateway가 시작되지 않거나 실행 중이 아님 | `hermes gateway status`, service log 확인, `hermes gateway setup` 재실행, 이후 `hermes doctor` |
| Gateway는 시작했지만 아무도 메시지 못 보냄 | 문서상 주요 원인은 bot token, allowlist, platform setup 미완료 |
| Adapter가 연결됐지만 message 실패 | Credential, link/invite/QR 단계, allowlist/pairing 확인 후 gateway log 검사 |
| Adapter가 조용해짐 | Log에서 `circuit breaker|paused|disabled` 검색, `/platform list`, provider status page 확인 뒤 `/platform resume <name>` |
| 중복 reply | Mid-send crash 뒤 at-least-once 동작이거나 inbox/token에 gateway 두 개 실행 |
| Messaging dependency 누락 | 문서화된 messaging extra 설치 후 gateway restart |

## 보안 경계

**사실:** Inbound message는 신뢰할 수 없는 데이터다. Allowlist와 pairing은 agent를 **누가** 발동할 수 있는지 인증한다. Webhook HMAC은 **sender**를 인증할 뿐 content를 인증하지 않는다. PR title, issue body, forwarded message 같은 upstream text는 attacker-controlled이며, 문서는 Hermes가 untrusted text를 blocklist로 신뢰성 있게 sanitise하지 못하고 할 수도 없다고 말한다.

**권고:** 실제 경계는 capability surface다. Gateway platform에 노출하는 toolset을 줄이고, approval을 켜 두며, 신뢰하지 않는 작업에는 격리 terminal backend를 우선하고, production에는 별도 identity를 쓰며, messaging adapter가 있다는 이유만으로 headless auto-approval을 켜지 않는다.

## 검증 체크리스트

- [ ] Adapter를 켜기 전에 model과 tool provider가 동작한다.
- [ ] Credential은 mode `600`의 `~/.hermes/.env`, 동작은 `config.yaml`에 있다.
- [ ] 명시적 authorization policy가 있다. Gateway 기본값은 거부다.
- [ ] Bot token이나 inbox를 실행 중 gateway끼리 공유하지 않는다.
- [ ] 무인 gateway에 의존하기 전에 service log에 접근 가능한지 확인했다.
- [ ] Public entrance에 노출하는 toolset과 approval mode를 의도적으로 선택했다.
