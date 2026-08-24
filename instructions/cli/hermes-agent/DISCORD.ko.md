# Hermes Agent Discord 설정

> 영어판: [`DISCORD.md`](DISCORD.md)
>
> **조사일:** 2026-08-24, 공식 문서만 근거로 삼았다. 아래 **사실**은 Hermes Agent의 공식 Discord·Messaging Gateway·Security·Voice Mode 문서와 Discord Developer Portal에서 추적한 내용이고, **권고**는 이 문서의 운영 조언이다. 버전 의존적인 이름과 기본값은 운영 전에 공식 reference에서 다시 확인한다.

## 1차 출처
- [Discord Setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Use Voice Mode with Hermes](https://hermes-agent.nousresearch.com/docs/guides/use-voice-mode-with-hermes)
- [Discord Developer Portal](https://discord.com/developers/applications)

## 시작하기 전에
**사실:** bot을 연결하기 전에 동작하는 model provider가 필요하다. Model이 없는 Discord adapter는 연결될 수 있지만 답하지 못한다.

**사실:** Discord는 두 파일로 제어한다. `~/.hermes/.env`는 자격증명과 환경 토글을, `~/.hermes/config.yaml`은 구조화된 동작을 담는다. **같은 값을 둘 다 설정하면 환경변수가 항상 이긴다.**

**사실 — 문서 불일치:** 일부 공식 페이지는 별도 `~/.hermes/gateway-config.yaml`을 언급한다. 그러나 현재 Gateway Internals의 "Config Sources"는 gateway가 YAML loader를 통해 `config.yaml`을 직접 읽는다고 한다. 다른 파일의 공식 deprecation notice는 없다. **권고:** 모든 YAML은 `~/.hermes/config.yaml`에 두고 `gateway-config.yaml`은 만들지 않는다.

## 1단계 — Discord application 만들기
1. [Discord Developer Portal](https://discord.com/developers/applications)에서 **New Application**을 선택한다.
2. 이름을 정하고 Developer Terms에 동의한 뒤 **Create**를 선택한다.
3. **General Information**에서 **Application ID**를 복사한다. 수동 초대 URL에 필요하다.

## 2단계 — bot user 만들기
**사실:** **Bot** 페이지를 열면 Discord가 bot user를 자동 생성한다.

**사실:** 공식 안내서는 **Public Bot = ON**, **Require OAuth2 Code Grant = OFF**를 권장한다. Public Bot을 끄면 Discord가 만든 installation link는 동작하지 않으며 5단계의 수동 OAuth2 URL을 써야 한다.

## 3단계 — privileged gateway intent 켜기
**사실:** 가장 흔한 실패 지점이다. Intent가 맞지 않으면 bot이 연결돼도 message text가 비어 있어 침묵한다.

**Bot** 페이지의 **Privileged Gateway Intents**에서 다음을 설정하고 **Save Changes**를 누른다.

| Intent | 목적 | 필요 여부 |
| --- | --- | --- |
| Presence Intent | online/offline 상태 보기 | 선택 |
| Server Members Intent | member list 접근, username 해석 | 필요 |
| Message Content Intent | 메시지 본문 읽기 | 필요 |

**사실 — 보존해야 할 미묘한 차이:** 위 setup 표는 Server Members도 필요하다고 표시하지만, 같은 페이지 troubleshooting은 더 좁게 설명한다. Hermes는 항상 Message Content를 요청하고 username allowlist 또는 `DISCORD_ALLOWED_ROLES`를 쓸 때만 Server Members를 추가 요청한다. Text bot에는 Presence가 필요 없다. 별도 Voice Mode 문서는 voice channel에 세 intent 전부를 권장한다.

**권고:** 특별히 scope를 최소화할 이유가 없다면 첫 설정에서는 표대로 Server Members와 Message Content를 모두 켠다. 이 차이는 처음 설정보다 나중의 permission audit에서 중요하다.

**사실:** 100개 미만 server에서는 intent를 자유롭게 토글할 수 있다. 100개 이상이면 Discord가 privileged intent 사용을 위한 verification 신청을 요구한다.

## 4단계 — bot token 받기
1. **Bot** 페이지의 **Token**에서 **Reset Token**을 누른다.
2. 계정에 2FA가 있다면 코드를 입력한다.
3. Token을 즉시 복사한다.

**사실:** token은 **한 번만** 보인다. 잃어버리면 새 token을 reset해야 한다. 가진 사람은 bot을 완전히 제어할 수 있다.

**권고:** password manager에 보관한 뒤 `~/.hermes/.env`에 넣고 `chmod 600 ~/.hermes/.env`를 실행한다. 절대 커밋하지 않는다.

## 5단계 — 초대 URL 만들기
### A. Installation tab (권장)
**Installation** → **Installation Contexts: Guild Install** → **Install Link: Discord Provided Link**를 선택하고 Default Install Settings를 설정한다.

- **Scopes:** `bot`, `applications.commands`
- **최소 permission:** View Channels, Send Messages, Embed Links, Attach Files, Read Message History
- **권장 추가 permission:** Send Messages in Threads, Add Reactions

### B. 수동 URL
Public Bot이 OFF면 필요하다.

```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=274878286912
```

**사실 — permission integer:**

| 세트 | Integer |
| --- | --- |
| 최소 text | `117760` |
| 권장 text | `274878286912` |
| Voice 문서의 text-only | `309237763136` |
| Voice 문서의 text + voice | `309240908864` |

**권고:** 이 값들은 한 permission set의 다른 설명이 아니다. Text bot에는 `274878286912`를 쓰고 voice channel을 실제로 더할 때만 `309240908864`으로 다시 초대한다.

## 6단계 — bot 초대하기
**Add to Server**를 선택하고 server를 고른 다음 **Continue** → **Authorize** → CAPTCHA를 완료한다.

**사실:** 초대 계정에는 **Manage Server**가 있어야 server가 dropdown에 나온다. Hermes gateway가 시작될 때까지 bot은 offline으로 남는다. 이는 정상 동작이지 실패가 아니다.

## 7단계 — 내 Discord user ID 찾기
**Discord Settings** → **Advanced** → **Developer Mode**를 켠 뒤, 자신의 user를 우클릭해 **Copy User ID**를 선택한다.

## 8단계 — Hermes 설정하기
### A. 대화형 설정 (권장)
```bash
hermes gateway setup
```

**Discord**를 선택하고 prompt가 나오면 bot token과 user ID를 입력한다.

### B. 수동 설정
`~/.hermes/.env`에 추가한다.

```dotenv
DISCORD_BOT_TOKEN=your-bot-token
DISCORD_ALLOWED_USERS=284102345871466496
# 여러 사용자는 쉼표로 구분한다.
# DISCORD_ALLOWED_USERS=284102345871466496,198765432109876543
```

그 다음 gateway를 시작한다.

```bash
hermes gateway
```

몇 초 안에 bot이 online이 되어야 한다. DM을 보내거나 channel에서 mention해 시험한다.

**사실 — adapter가 켜지는 방식:** `DISCORD_BOT_TOKEN`의 존재가 문서화된 활성화 수단이다. Gateway 시작 시 내장 Discord adapter가 자동 구성된다. `DISCORD_ALLOWED_USERS`는 활성화가 아니라 **인가**를 제어한다. 공식 Discord 자료에는 `plugins.discord` 키, `plugins.enabled: [discord]`, 별도 enable flag가 없다.

### Service로 실행하기
```bash
hermes gateway install                 # Linux systemd user service / macOS launchd agent
sudo hermes gateway install --system   # Linux boot-time system service
hermes gateway start | stop | status
```

**사실:** Linux에서 `sudo loginctl enable-linger $USER`는 logout 뒤에도 user service를 살려 두며 로그는 `journalctl --user -u hermes-gateway -f`로 읽는다. macOS plist는 `~/Library/LaunchAgents/ai.hermes.gateway.plist`, 로그는 `~/.hermes/logs/gateway.log`다. PATH나 tool을 바꾼 뒤에는 launchd가 새 PATH를 잡도록 `hermes gateway install`을 다시 실행한다.

## 설정 레퍼런스
Discord 설정은 세 surface에 나뉜다. 루트 `discord:`는 **동작 환경변수를 mirror**한다. 같은 설정이 둘에 있으면 환경변수가 이기고 YAML은 기본값을 제공한다. 루트 `discord:`와 `gateway.platforms.discord.extra`는 문서화된 키 집합이 서로 겹치지 않으므로, 공식 문서도 이 두 YAML subtree 사이의 우선순위는 말하지 않는다.

| Surface | 내용 |
| --- | --- |
| `~/.hermes/.env` | credential과 환경 토글 (`DISCORD_*`) |
| `~/.hermes/config.yaml`, 루트 `discord:` | mention, thread, reaction, channel filter, backfill, attachment, voice 같은 동작 |
| `~/.hermes/config.yaml`, `gateway.platforms.discord.extra` | slash-command 등록 소유권과 접근 제어 |

### 환경변수
| 변수 | 필수 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `DISCORD_BOT_TOKEN` | **예** | — | Bot token이며 adapter도 활성화한다 |
| `DISCORD_ALLOWED_USERS` | 조건부 | — | 상호작용 가능한 user ID의 쉼표 구분 목록 |
| `DISCORD_ALLOWED_ROLES` | 아니오 | — | role ID 쉼표 목록. allowed user와 OR. Server Members Intent 자동 활성화 |
| `DISCORD_ALLOW_ALL_USERS` | 아니오 | `false` | 닿을 수 있는 모든 Discord user를 명시적으로 허용 |
| `GATEWAY_ALLOW_ALL_USERS` | 아니오 | `false` | 모든 gateway platform에 대한 같은 동작 |
| `DISCORD_ALLOWED_CHANNELS` | 아니오 | — | 이 channel ID에서만 응답. User/role allowlist 없이도 guild access를 명시적으로 scope해 Discord access policy를 충족할 수 있음 |
| `DISCORD_IGNORED_CHANNELS` | 아니오 | — | 여기서는 절대 응답하지 않음. 최우선 |
| `DISCORD_REQUIRE_MENTION` | 아니오 | `true` | server channel에서는 `@mention`에만 응답 |
| `DISCORD_THREAD_REQUIRE_MENTION` | 아니오 | `false` | `true`면 thread도 channel처럼 gate. multi-bot thread용 |
| `DISCORD_FREE_RESPONSE_CHANNELS` | 아니오 | — | mention이 필요 없는 channel |
| `DISCORD_IGNORE_NO_MENTION` | 아니오 | `true` | bot이 아닌 다른 대상만 mention되면 침묵 |
| `DISCORD_AUTO_THREAD` | 아니오 | `true` | text channel에서 `@mention`마다 thread 생성 |
| `DISCORD_NO_THREAD_CHANNELS` | 아니오 | — | thread 대신 inline reply |
| `DISCORD_REACTIONS` | 아니오 | `true` | 👀 처리 중, ✅ 성공, ❌ 오류 |
| `DISCORD_ALLOW_BOTS` | 아니오 | `"none"` | `none`, `mentions`, `all` |
| `DISCORD_HISTORY_BACKFILL` | 아니오 | `true` | mention 때 놓친 channel scrollback을 앞에 붙임 |
| `DISCORD_HISTORY_BACKFILL_LIMIT` | 아니오 | `50` | 거꾸로 훑는 메시지 수 |
| `DISCORD_REPLY_TO_MODE` | 아니오 | `"first"` | `off`, `first`, `all` |
| `DISCORD_COMMAND_SYNC_POLICY` | 아니오 | `"safe"` | `safe`, `bulk`, `off` |
| `DISCORD_HOME_CHANNEL` | 아니오 | — | cron output 같은 proactive 메시지 channel |
| `DISCORD_ALLOW_MENTION_EVERYONE` | 아니오 | `false` | `@everyone`/`@here` ping 금지 |
| `DISCORD_ALLOW_MENTION_ROLES` | 아니오 | `false` | role ping 금지 |
| `DISCORD_ALLOW_MENTION_USERS` | 아니오 | `true` | 개별 user ping 허용 |
| `DISCORD_MAX_ATTACHMENT_BYTES` | 아니오 | `33554432` | 32 MiB. `0`은 무제한이며 메모리에 buffer |
| `DISCORD_PROXY` | 아니오 | — | `http://`, `https://`, `socks5://`. `HTTPS_PROXY`보다 우선 |

### config.yaml
```yaml
discord:
  require_mention: true
  thread_require_mention: false
  free_response_channels: ""      # 쉼표 구분 ID 또는 YAML list
  auto_thread: true
  reactions: true
  ignored_channels: []
  no_thread_channels: []
  history_backfill: true
  history_backfill_limit: 50
  channel_prompts:
    "1234567890": |
      이 채널은 조사 작업용입니다. 출처와 간결한 종합을 우선하세요.

group_sessions_per_user: true      # 전역: 사용자별 transcript 격리
```

**사실:** `channel_prompts`는 transcript history에 저장되지 않은 채 매 turn 삽입된다. 정확한 thread/channel ID가 이기며, thread에 엔트리가 없으면 부모 channel ID로 fallback한다. 변경은 다음 turn부터 적용된다.

**사실:** 기본 비활성 `discord.missed_message_backfill`은 재시작 중 Discord WebSocket resume window가 만료되어 놓친 메시지를 복구한다. 복구 메시지는 live event와 같은 authorization·mention·deduplication 경로를 지나며 ledger는 profile별 `gateway/discord_message_recovery.db`에 있다.

## 누가 bot과 대화할 수 있는가
**사실:** 접근은 **fail-closed**다. Policy가 하나도 없으면 모든 inbound user가 거부되고 로그에 `No Discord access policy configured; inbound Discord messages will be denied by default.`가 기록된다. `DISCORD_ALLOWED_CHANNELS`도 policy다. User/role allowlist가 없어도 guild access를 명시적으로 scope할 수 있다. DM에는 여전히 user policy, pairing, 또는 명시적 allow-all이 필요하다.

**사실 — 문서상 우선순위 체인:** platform allow-all → 승인된 DM pairing → platform allowlist → global allowlist → global allow-all → 기본 거부.

**사실:** 모르는 DM user는 8자 pairing code를 받는다. 운영자는 `hermes pairing approve discord <code>`로 승인하고 `hermes pairing list`로 대기 코드를 확인하며 `hermes pairing revoke discord <user-id>`로 철회한다. 코드는 한 시간 뒤 만료되며 rate limit된다.

**사실:** `DISCORD_IGNORED_CHANNELS`는 다른 모든 channel 설정보다 우선한다. `DISCORD_ALLOWED_CHANNELS`는 guild channel만 제한하고 DM은 user authorization의 지배를 받는다. 앞서 말한 것처럼 channel list는 guild 쪽 access-policy requirement도 충족한다.

### Slash command 접근 제어
```yaml
gateway:
  platforms:
    discord:
      extra:
        allow_from:
          - "123456789012345678"
          - "999888777666555444"
        allow_admin_from:
          - "123456789012345678"
        user_allowed_commands:
          - status
          - model
          - history
        group_allow_admin_from:
          - "123456789012345678"
        group_user_allowed_commands:
          - status
```

**사실:** `/help`, `/whoami`는 항상 허용된다. 일반 채팅은 이 설정의 영향을 받지 않아 non-admin도 대화는 할 수 있다. Scope에 `allow_admin_from`이 없으면 그 scope의 gating은 꺼져 기존 설치가 계속 동작한다. **DM admin은 server-channel admin을 의미하지 않는다.** `/whoami`로 현재 scope와 tier를 확인한다.

## 런타임 동작
| 컨텍스트 | 동작 |
| --- | --- |
| DM | authorization 뒤 모든 메시지에 응답. Mention 불필요. DM별 session |
| Server channel | 기본적으로 `@mention` 필요 |
| Thread | Bot이 참여한 뒤 후속 메시지는 mention 불필요. 단 `thread_require_mention`이 true면 예외 |
| Free-response channel | Mention 불필요. Inline reply이고 auto-thread 생략 |
| Forum channel | 전송마다 별도 thread post 생성 |

**사실:** `group_sessions_per_user` 기본값은 `true`라 한 channel의 두 사람이 별도 대화를 가진다. `false`면 room 전체가 transcript, token budget, interrupt state, 실행 중 agent slot 하나를 공유한다.

**사실 — bot-to-bot 대화는 지원하지 않는다.** `DISCORD_ALLOW_BOTS`는 신뢰하는 relay/webhook bot 하나의 input을 받기 위한 것이다. 여러 Hermes profile을 서로 reply하게 연결하는 topology는 지원되지 않는다. Discord는 reply 대상 작성자를 자동 mention하므로 `"mentions"`에서 두 bot이 서로의 mention gate를 끝없이 만족하며 ack-loop한다. **이를 끊는 circuit breaker는 없다.** 기본 `"none"`을 유지한다.

## Slash command
**사실:** 내장 command는 `/new`, `/reset`, `/status`, `/model`, `/personality`, `/retry`, `/undo`, `/stop`, `/whoami`, `/approve`, `/deny`, `/sethome`, `/compress`, `/title`, `/resume`, `/sessions`, `/usage`, `/reasoning`, `/voice`, `/rollback`, `/background`, `/reload-mcp`, `/platform`, `/restart`, `/commands`, `/insights`, `/update`, `/help`를 포함한다. `/verbose`는 `display.tool_progress_command: true`가 필요하다. 공식 자료는 `/clear`, `/history`에 대해 내부적으로 불일치한다. Approval/access 예시는 이를 포함하지만 chat-command 표는 CLI-only라고 표시한다. 설치 버전에서는 `/help`로 가용성을 확인한다.

**사실:** 설치된 skill은 다음 gateway restart에 native application command로 자동 등록된다. **Discord bot 하나의 application command 한도는 100개**이며 초과 skill은 log warning과 함께 건너뛴다.

**사실:** `DISCORD_COMMAND_SYNC_POLICY`는 startup sync를 조정한다. `safe`는 기존 global command를 diff/patch하며 Discord metadata를 patch할 수 없으면 재생성한다. `bulk`는 예전 full-sync, `off`는 sync 생략이다.

**사실:** 여러 gateway가 같은 Discord application을 공유한다면 정확히 하나만 global registration을 소유해야 한다. Follower에는 `gateway.platforms.discord.extra.slash_commands: false`(기본 `true`)를 설정한다. 그렇지 않으면 마지막으로 시작한 gateway가 이겨 command가 흔들린다.

**사실:** 인자 없는 `/model`은 Discord dropdown 한도 때문에 provider 25개·model 25개로 제한된 picker를 열며 120초 뒤 timeout된다. 승인된 user만 interaction할 수 있다.

## Discord 안의 승인
**사실:** 두 flow가 서로 다르다.

- **위험 terminal command.** Hermes가 command detail을 post하고 `yes`, `y`, `approve`, `ok`, `go` 또는 `no`, `n`, `deny`, `cancel` text reply를 기다린다. `/approve`, `/deny`도 된다. Gateway가 `HERMES_EXEC_ASK=1`을 자동 설정한다. `approvals.timeout` 기본 300초는 **timeout 시 거부**다.
- **파괴적 session command** (`/clear`, `/new`, `/reset`, `/undo`). `approvals.destructive_slash_confirm`가 켜져 있으면 네이티브 세 선택 dialog — **Approve Once / Always Approve / Cancel** — 를 쓴다. Always Approve를 선택하면 그 config는 false가 된다.

**사실:** clarify question도 choice button으로 표시되지만 위험 command 승인은 아니다. 공식 자료는 `agent.clarify_timeout`에 대해 전용 settings 절에서 3600초, platform 산문에서 600초라고 서로 다르게 말한다. Upstream이 정리할 때까지 전용 settings 절을 따른다.

**사실:** `approvals.mode`는 `smart`(기본), `manual`, `off`다. Hardline blocklist는 YOLO와 `off` 뒤에도 남는다. **다만** 위험 명령 가드 스택은 host-reaching backend(local, SSH, host-mounted Docker)에서만 동작하고 격리 container backend에서는 아예 건너뛴다.

**권고:** 문서는 승인된 participant 중 누가 다른 user의 pending approval prompt에 답할 수 있는지 말하지 않는다. 문서화될 때까지 `group_sessions_per_user: true`와 좁은 allowlist를 유지한다.

## 첨부물, voice, media
**사실:** Outbound media는 `MEDIA:/path`를 쓴다. Image는 inline preview, MP4/MOV는 player, audio는 가능하면 voice message, document는 attachment가 된다. Discord tier 제한(무료 25 MB부터 500 MB)이 적용되며 HTTP 413이면 local-cache link로 fallback한다.

**사실:** Inbound attachment는 **모든 파일 형식**을 받는다. File extension이 아니라 user authorization이 gate다. UTF-8 text-like content는 최대 100 KiB까지 자동 주입되며 binary는 local path로 제공된다. 문서에는 불일치가 있다. 환경변수 표는 `DISCORD_ALLOW_ANY_ATTACHMENT`가 false 기본값이라 하지만, 뒤의 권위 있는 절은 legacy `discord.allow_any_attachment`를 no-op이라 하고 모든 형식을 받는다고 한다. 이 키는 기존 configuration이 error를 내지 않게 하기 위해서만 남아 있다.

**사실:** 들어오는 Discord voice message는 local `faster-whisper`, Groq(`GROQ_API_KEY`), OpenAI(`VOICE_TOOLS_OPENAI_KEY`)로 자동 전사된다. `/voice on`은 voice-origin message에만 답을 읽고, `/voice tts`는 모든 답을 읽는다.

**사실:** Live voice channel에는 `/voice join`, `/voice leave`, `/voice status`를 쓴다. Hermes는 join을 실행한 text channel에 transcript를 post한다. ffmpeg·opus, Discord Connect·Speak permission, voice permission integer로 재초대가 필요하다. Bot은 기본 300초 idle 후 떠나며 `voice_channel_inactivity_timeout_seconds: 0`이면 명시적 leave 전까지 유지한다.

## 문제 해결
| 증상 | 원인 | 조치 |
| --- | --- | --- |
| Bot이 offline | Gateway 미실행. 첫 시작 전에는 정상 | `hermes gateway status` 후 `start`; gateway log 확인 |
| Online인데 어디에도 응답하지 않음 | Message Content Intent off 또는 access policy 없음 | Intent를 켜고 저장, allowlist 설정, restart, log에서 `No Discord access policy configured` 검색 |
| Startup에서 `PrivilegedIntentsRequired` | 필요한 intent가 꺼짐 | Message Content와 role/username allowlist용 Server Members를 켜고 restart |
| DM은 되지만 channel은 안 됨 | 기본 mention requirement | `DISCORD_REQUIRE_MENTION`, free-response, ignored/allowed channel, channel permission 확인 |
| Slash command가 안 보임 | Scope 누락, stale sync, 충돌 | Invite에 `applications.commands` 확인, skill 설치 뒤 restart, 100-command warning 확인, sync가 `off` 아닌지 확인, 등록 소유 gateway 하나만 유지 |
| Token 거부 | Invalid/revoked token | Token reset, `DISCORD_BOT_TOKEN` 갱신, restart. 실패는 fatal `discord_auth_error`로 표시 |
| Runtime permission 오류 | Channel permission 부족 | View Channels, Send Messages, Embed Links, Attach Files, Read Message History 필요. Thread는 Send Messages in Threads, reaction은 Add Reactions 필요 |
| Adapter가 조용해짐 | Adapter circuit breaker tripped | `/platform list`, log에서 `circuit breaker|paused|disabled` 검색, Discord status 확인, `/platform resume discord`. 자동 재개되지 않음 |
| 연결됐지만 메시지를 놓침 | REST는 200이지만 WebSocket이 stale | `discord.websocket_liveness_interval_seconds`, `websocket_liveness_failure_threshold`, `websocket_heartbeat_ack_max_age_seconds`, `websocket_max_latency_seconds` 조정 |
| Voice에 들어가지만 듣지 못함 | Authorization, mute, intent, permission | 허용된 user ID, user unmute, intent, Connect/Speak 확인 |
| 새 forum channel을 못 찾음 | Gateway 시작 뒤 생성 | Gateway restart 또는 `/channels refresh` |

**사실:** 공식 Discord 페이지에는 "token invalid", "commands not appearing", 일반 channel permission error 전용 heading이 없다. 위 행은 Discord 페이지와 Messaging Gateway·Voice Mode 문서를 합쳐 오류 문자열을 꾸며내지 않도록 정리했다.

## 보안 경계
**사실:** 모든 inbound message, attachment, URL, 인용 instruction은 신뢰할 수 없는 입력이다. Authentication과 allowlist는 agent를 **누가** 발동할 수 있는지 확인할 뿐 **text**를 신뢰할 수 있게 만들지 않는다. Hermes는 공식 문서상 untrusted text를 blocklist로 신뢰성 있게 sanitise하지 않으며 할 수도 없다.

**권고:** authorization, 최소 capability toolset, 켠 상태의 approval, 격리 terminal backend, credential 격리, 좁은 prompt로 blast radius를 제한한다. Discord gateway는 agent capability의 public entrance로 다룬다.

## 검증 체크리스트
- [ ] Message Content Intent가 켜졌고, role 또는 username allowlist를 쓰면 Server Members도 켰다.
- [ ] Token은 mode `600`의 `~/.hermes/.env`에 있고 커밋하지 않는다.
- [ ] Invite는 `bot`, `applications.commands` scope와 `274878286912` permission integer를 썼다.
- [ ] Access policy가 하나 이상 있다. 기본은 모두 거부다.
- [ ] YAML은 `gateway-config.yaml`이 아닌 `~/.hermes/config.yaml`에 있다.
- [ ] 신뢰하는 자동응답 없는 bot 하나가 반드시 필요할 때 외에는 `DISCORD_ALLOW_BOTS`가 `"none"`이다.
- [ ] 격리 backend는 위험 명령 검사를 건너뛰므로, terminal backend와 함께 approval posture를 선택했다.
