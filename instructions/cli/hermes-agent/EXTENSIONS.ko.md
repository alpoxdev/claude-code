# Hermes Agent 확장 및 운영 지도

> 영어 원문: [EXTENSIONS.md](EXTENSIONS.md)  
> 함께 읽을 문서: [개요 및 런타임 사용](README.ko.md), [설정](CONFIGURATION.ko.md), [Discord](DISCORD.ko.md), [메시징 게이트웨이](MESSAGING.ko.md), [스킬](SKILLS.ko.md), [네이티브 플러그인](PLUGINS.ko.md)
> **조사 기준일:** 2026-08-24. 아래의 주장과 예시는 공식 Hermes 문서 및 공식 [NousResearch/hermes-agent 저장소](https://github.com/NousResearch/hermes-agent)로 제한한다.

Hermes 확장은 신뢰 경계를 넘는다. MCP는 로컬 프로그램을 실행하거나 원격 서비스에 호출할 수 있고, 메시징 게이트웨이는 다른 플랫폼의 메시지를 받으며, 도구 제공자는 입력과 자격 증명을 받는다. 활성화는 단순 UI 기능 추가가 아니라 능력 부여로 취급한다. 무엇이든 켜기 전에 소스, 범위, 전송 방식, 자격 증명 흐름을 점검한다.

## 확장 표면 선택

| 필요 | 우선 표면 | 운영 경계 |
| --- | --- | --- |
| 기존 외부 도구, 데이터베이스, 내부 API | MCP | 서버 코드와 그 자격 증명이 Hermes에 제공된다. |
| Hermes 네이티브 동작 | 일반 플러그인/제공자 설정 | 제공자는 작업 내용을 자기 서비스로 전송한다. |
| Telegram, Discord, Slack, WhatsApp, Signal, Email 채팅 | 메시징 게이트웨이 | 플랫폼 신원/페어링 및 신뢰할 수 없는 인바운드 텍스트. |
| 수명주기 이벤트 반응 또는 로컬 정책 강제 | Hooks / shell hooks | 훅 코드는 설정된 프로세스 권한으로 실행된다. |
| 음성 입출력 | STT / TTS 제공자 | 클라우드 기반이면 오디오와 텍스트가 호스트 밖으로 나간다. |
| GUI 또는 로컬 제어면 | Desktop / dashboard | 바인딩과 접근 제어가 운영자를 결정한다. |

네이티브 플러그인 안내서를 MCP 대용으로 쓰거나 MCP 카탈로그 항목이 샌드박스라고 가정하지 않는다. 외부 MCP 서버는 [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), 네이티브 플러그인 작성은 [Plugins](PLUGINS.ko.md)를 사용한다.

## MCP: 구성, 제한, 운영

MCP 지원은 Hermes에 포함되어 있다. 시작 시 Hermes는 `mcp_servers`의 도구를 발견하여 등록하며, 지원 서버는 리소스와 프롬프트 래퍼도 제공할 수 있다. 전송 방식은 둘이다.

- **stdio** — Hermes가 로컬 하위 프로세스를 시작하고 stdin/stdout으로 통신한다. 로컬 설치 서버와 로컬 리소스에 적합하지만 명령과 부트스트랩 체인을 신뢰해야 한다.
- **HTTP** — Hermes가 원격 MCP 엔드포인트에 직접 연결한다. 호스팅/조직 엔드포인트에 사용하며 URL, 인증 방식, 서비스 권한을 각각 검증한다.

문서화된 최소 stdio 구성은 다음과 같다.

```yaml
mcp_servers:
  filesystem:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/projects"]
```

구성 뒤 채팅을 시작한다.

```bash
hermes chat
```

정적 토큰 HTTP 서버는 `url`과 `headers`를 쓴다. 실제 토큰은 버전 관리 YAML이 아니라 환경 변수 또는 Hermes `.env`에 둔다.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/mcp"
    headers:
      Authorization: "Bearer ${MCP_TOKEN}"
```

호스팅 OAuth MCP에서 `auth: oauth`는 검색, PKCE, 토큰 교환/갱신, step-up 인증을 Hermes가 처리하게 한다. 적용되는 경우 문서화된 흐름에는 `hermes mcp login <name>`이 포함된다. OAuth 토큰은 `~/.hermes/mcp-tokens/<server>.json`에 `0600` 권한으로 캐시된다. 헤드리스 호스트에서는 문서의 paste-back 리디렉션 흐름, SSH 포워딩, 또는 신중히 구성한 프록시 콜백을 사용한다. 콜백 엔드포인트를 함부로 노출하지 않는다.

### 카탈로그와 수명주기

Nous 검토 카탈로그는 opt-in이며 커뮤니티 마켓플레이스가 아니다. 카탈로그 MCP는 설치될 때까지 비활성이다. 다음 명령은 대화형 사용, 목록, 설치를 구분한다.

```bash
hermes mcp
hermes mcp catalog
hermes mcp install n8n
hermes mcp configure linear
```

설치는 저장소를 clone하고 패키지 설치 같은 manifest bootstrap 명령을 실행한 뒤 MCP 서버를 실행할 수 있다. 설치 전 카탈로그 manifest의 `source`, `install.bootstrap`, 전송 명령/인수, 엔드포인트, 인증, 도구 목록을 검토한다. 카탈로그 검토는 유용한 근거이지만 자체 공급망 검토를 대체하지 **않는다**. MCP는 자동 업데이트되지 않으므로 변경된 manifest를 검토한 후 `hermes mcp install <name>`을 다시 실행한다.

설치/구성 시 Hermes는 `mcp_servers.<name>.tools.include`를 기록할 수 있다. 필요한 도구만 선택하고, 특히 파괴적/관리 작업은 제외한다. 서버 probe가 실패해도 설치는 완료될 수 있으므로 연결 또는 OAuth를 고친 뒤 `hermes mcp configure <name>`을 다시 실행한다. MCP 연결 필드의 `${VAR}`는 연결 시 환경( `~/.hermes/.env` 포함)에서 해결되며 Cursor 형식 `${env:VAR}`도 허용된다. 정의되지 않은 변수는 리터럴로 남고 경고를 기록한다.

**MCP 문제 해결:** stdio는 서버 명령/인수와 패키지 설치를, HTTP는 엔드포인트 도달성, OAuth 로그인/콜백 경로, 필요한 제공자 로그인을 확인한다. 그 다음 활성 도구 집합을 줄이고 재연결한다. 바뀐 MCP 스키마는 모델 프롬프트 캐시를 무효화할 수 있으므로 기본적으로 Hermes는 `/reload-mcp` 전에 묻는다(`approvals.mcp_reload_confirm: true`). 임의 클라이언트 스키마를 복사하지 말고 지원 필드는 [MCP 구성 참조](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference)를 따른다.

## 제공자 지도: 무엇을 확장하며 데이터는 어디로 가는가

Hermes는 모든 통합을 하나의 플러그인으로 취급하지 않고 AI 모델 제공자와 보조 제공자를 지원한다. 최신 제공자 ID, 모델명, 자격 증명은 공식 [provider guide](https://hermes-agent.nousresearch.com/docs/integrations/providers)가 기준이다. [Tool Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway)는 Nous Portal을 통해 웹 검색, 이미지 생성, TTS, 클라우드 브라우저 백엔드를 제공할 수 있으며, 개별 백엔드는 자체 자격 증명도 사용할 수 있다.

| 능력 | 결정할 것 | 데이터/자격 증명 경계 |
| --- | --- | --- |
| 모델 | 제공자, 모델, 폴백, 엔드포인트 | 프롬프트, 도구 스키마, 모델에 보이는 컨텍스트가 선택한 모델 제공자로 간다. |
| 메모리/컨텍스트 | 영구 메모리, 세션, 스킬, 프로젝트 컨텍스트의 적절성 | 로컬 Hermes 상태는 선택한 Hermes home에 남는다. 가져온/신뢰할 수 없는 텍스트는 모델에 영향을 줄 수 있으므로 “컨텍스트 안”을 “신뢰됨”과 동일시하지 않는다. |
| 웹 검색 | 검색 백엔드와 질의/데이터 처리 | 질의와 검색 콘텐츠가 검색 제공자에게 전달된다. 웹 콘텐츠는 신뢰할 수 없는 입력이다. |
| 브라우저 | 로컬/클라우드 백엔드와 인증 브라우징 정책 | 클라우드 브라우저/제공자는 탐색과 페이지 데이터를 받을 수 있다. 브라우저 세션/쿠키는 고가치 자격 증명이다. |
| 이미지/비디오 | 생성/분석 제공자와 보존 정책 | 프롬프트와 미디어가 제공자로 간다. 허가 없이 사적 미디어를 올리지 않는다. |
| 시크릿 | `.env`, OAuth 자격 증명, 외부 주입 메커니즘 | 필요한 구성 요소에만 주입한다. 프롬프트, 커밋된 YAML, 넓은 하위 프로세스 환경에 넣지 않는다. |
| TTS/STT | 음성/전사 백엔드와 동의 | 클라우드 제공자에서는 음성 오디오와 전사/텍스트가 기기를 떠날 수 있다. |

`hermes setup --portal`은 Nous 모델 제공자와 네 가지 Tool Gateway 도구를 위한 문서화된 단일 OAuth 설정이며, `hermes portal info`는 연결 상태를 보고한다. 이는 편의 경계이지 모든 백엔드에 모든 시크릿을 줄 이유가 아니다. BYOK는 백엔드별로 가능하다. Portal 이외 제공자는 공식 Hermes 통합 페이지를 따르고 API 키는 `.env`에 둔다.

## 메시징 게이트웨이와 어댑터

게이트웨이는 Telegram, Discord, Slack, WhatsApp, Signal, Email의 통합 경계다. 공통 service lifecycle, authorization, session scope, durable delivery semantics, adapter 차이는 [메시징 게이트웨이](MESSAGING.ko.md)를, Developer Portal 설정, intent, 초대, Discord access policy, slash command, voice/media는 [Discord 설정](DISCORD.ko.md)을 읽는다. 문서화된 진입점은 다음이다.

```bash
hermes gateway setup
hermes gateway start
```

선택한 어댑터에 대해 setup을 실행하고 플랫폼별 [Messaging Gateway 안내서](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)를 따른다. 봇 토큰 이름이나 webhook 명령을 추측하지 않는다. 게이트웨이는 동일한 에이전트 능력을 원격 채팅으로 연결할 수 있으므로 모든 인바운드 메시지, 첨부물, URL, 인용 지시는 인증된 플랫폼 사용자가 권한을 받기 전까지 신뢰할 수 없다.

플랫폼 봇 토큰은 `.env`에 보관하고, 문서화된 pairing/allowlist 제어로 게이트웨이 대화자를 제한하며, 프로덕션 시스템에는 별도 신원/계정을 쓴다. 게이트웨이는 채팅에서 위험 명령 승인을 지원하지만 `yes` 또는 `approve` 응답은 올바르게 페어링된 대화에서만 의미가 있다. 메시징 어댑터가 있다고 무인 자동 승인을 켜지 않는다.

## Hooks와 shell hooks

Hooks는 수명주기 동작을 확장하고 shell hooks는 특히 명령을 실행한다. 이벤트 이름, 스키마, timeout은 공식 [Hooks 안내서](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)와 [shell hooks 참조](https://hermes-agent.nousresearch.com/docs/reference/shell-hooks)를 따른다. 훅 구성은 실행 코드처럼 취급한다.

1. 검토되고 접근 제어된 위치에 스크립트를 두고, 참조가 요구하면 절대/통제된 경로를 쓴다.
2. 이벤트 payload를 검증하고 신뢰할 수 없는 메시지, 파일명, URL, 모델 출력을 셸 문법에 보간하지 않는다.
3. 최소 권한, 좁은 환경 전달, 제한된 실행 시간, 멱등 작업을 사용한다.
4. 시크릿이나 민감 payload 전체를 쓰지 않고도 장애를 진단할 로그를 남긴다.
5. 프로덕션 게이트웨이 또는 cron 경로에 붙이기 전에 격리된 profile/backend에서 운영적으로 시험한다.

훅은 알림, 감사, 정책 검사, 로컬 오케스트레이션에 적합하지만 승인 시스템이나 컨테이너 격리를 대체하지 않는다. 훅 실행 성공은 입력의 안전성을 검증하지 않는다.

## Dashboard, Desktop, profile, 상태

Hermes Desktop과 dashboard는 구성 및 확장 표면을 노출하지만 근본 신뢰 모델을 바꾸지 않는다. Install/login을 클릭하기 전에 선택 MCP/제공자/어댑터를 점검하고 dashboard를 제어할 수 있는 기기/세션을 보호한다. Desktop MCP 뷰는 검토하도록 카탈로그 전송, 소스, 인증, 엔드포인트/명령, bootstrap, setup 세부사항을 제공한다.

기본 Hermes home은 `~/.hermes/`이며 `config.yaml`, `.env`, `auth.json`, 메모리, 스킬, cron 작업, 세션, 로그, MCP 토큰을 담는다. `HERMES_HOME`은 profile 상태를 선택한다. 사용자, 환경, 위험 수준별로 profile을 분리한다. 파일 소유권, managed scope, 키별 환경변수/설정 우선순위 주의점, secret source, 복구는 [설정 파일](CONFIGURATION.ko.md)을 따른다. 문서화된 관리는 다음과 같다.

```bash
hermes config
hermes config get model
hermes config set terminal.backend docker
hermes config unset terminal.backend
hermes config check
hermes config migrate
```

`hermes config set`은 API 키를 `.env`로, 비시크릿 값을 `config.yaml`로 보낸다. `config.yaml`은 `${VAR}` 및 `${env:VAR}` 치환을 지원한다. 외부 시크릿 시스템은 지원되지 않는 인라인 file/vault 참조 대신 시작 시 환경 값을 주입해야 한다.

Profile 격리는 일반 호스트 자격 증명을 자동 격리하지 **않는다**. 로컬 백엔드에서 `terminal.home_mode: auto`는 실제 OS `HOME`을 보존하므로 하위 프로세스가 일반 `ssh`, GitHub CLI, 클라우드, 패키지 관리자 자격 증명을 볼 수 있다. 별도 도구 home이 필요하면 `terminal.home_mode: profile`을 쓰고 필요한 자격 증명만 의도적으로 초기화한다. 신뢰할 수 없는 작업의 더 안전한 운영 기본값은 Docker, Modal, Daytona, Vercel Sandbox, Singularity 같은 격리 백엔드다. 호스트 mount 또는 전달 시크릿이 의도한 경계를 무너뜨릴 수 있으므로 mount, egress, 환경 전달을 확인한다.

## 보안 감사, 승인, 안전 운영

확장을 활성화/변경하기 전 다음을 감사한다: 소스/릴리스와 설치 명령, 실행 위치, 도구 목록과 변경 범위, 자격 증명/OAuth scope, 도달 가능한 파일/네트워크/mount volume, 권한 있는 게이트웨이 사용자, 로그/보존, rollback/removal 경로. 제품 진단에는 `hermes doctor`, on-demand supply-chain audit에는 `hermes security audit`을 실행한다. 둘 다 실제 구성·manifest 검토, sandbox, 완전한 code audit을 대체하지 않는다.

Hermes 승인 모드는 `approvals.mode` 아래 `smart`(기본), `manual`, `off`다. Smart는 보조 LLM으로 위험을 평가하고 manual은 위험 명령을 묻고 off는 승인을 끄며 YOLO와 동등하다. 검토된 격리 자동화가 특별히 필요하지 않다면 `cron_mode: deny`와 `single_query_mode: deny`를 유지한다. 기본 승인 timeout은 fail-closed다.

`hermes --yolo`, `hermes chat --yolo`, `/yolo`, `HERMES_YOLO_MODE=1`은 현재 세션의 위험 명령 프롬프트를 우회하지만 항상 켜진 hardline blocklist는 우회하지 못한다. 이것은 “안전 모드”가 아니다. 실용적 안전 모드는 별도 profile, 게이트웨이 노출 없음, 최소 도구/MCP 집합, 프로덕션 자격 증명 없음, manual 승인, 격리 terminal backend다. 조직별 비가역 작업을 `approvals.deny`에 추가한다. 인용한 fnmatch 패턴은 host-reaching backend에서 YOLO/off 중에도 차단한다. Deny rule은 sandbox가 아니라 guardrail이다.

영구 “always” 승인은 `config.yaml`의 `command_allowlist` 항목이 된다. 주기적으로 검토하고 제거한다. `hermes approvals suggest`는 기본적으로 read-only이고 `hermes approvals suggest --apply 1,3`는 allowlist를 바꾸므로 제안 패턴을 적용 전에 검토한다.

## 결정 매트릭스와 사고 분류

| 상황 | 선택 | 피하거나 먼저 확인할 것 |
| --- | --- | --- |
| 검토된 서드파티 통합 필요 | 최소 도구의 MCP 카탈로그 항목 | manifest/bootstrap 검토 전 설치. |
| 사설/로컬 서비스 필요 | stdio MCP 또는 통제된 내부 HTTP MCP | 전체 host environment나 넓은 filesystem root 전달. |
| SaaS OAuth 도구 필요 | `auth: oauth` HTTP MCP | 정적 토큰 우회나 노출된 callback. |
| 메시징 제어 필요 | pairing/allowlist가 있는 gateway adapter | 어떤 채널 참여자든 운영자로 취급. |
| 무인 자동화 필요 | 명시적 검토와 최소 권한 cron | 프로덕션 시크릿이 있는 호스트에서 `cron_mode: approve`. |
| 신뢰할 수 없는 코드/콘텐츠 처리 | 분리 profile과 격리 backend | real HOME, host mount, 전달 자격 증명이 있는 local backend. |
| 음성/미디어 필요 | 명시적 STT/TTS/미디어 제공자 | 동의 없이 민감 녹음/자산 전송. |
| 변경 뒤 도구 실패 | config, 자격 증명, endpoint/process, 도구 필터 순으로 확인 | 맹목적으로 reload하거나 접근 범위를 넓힘. |

사고 또는 자격 증명 노출 의심 시 영향을 받는 gateway/provider/MCP 연결을 중지하고, 발급자에서 자격 증명을 폐기/순환하며, 필요에 따라 영향 받은 `.env`/OAuth 구성과 영구 allowlist를 제거하고, 로그와 adapter 권한을 검사한 뒤 확장 구성과 scope를 검토한 후에만 다시 활성화한다. Hermes 로그는 시크릿을 마스킹하지만, 그것은 민감 입력을 기록해도 된다는 근거가 아니다.

## 주요 출처

- [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp) 및 [MCP 구성 참조](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [AI Providers](https://hermes-agent.nousresearch.com/docs/integrations/providers) 및 [Tool Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/features/tool-gateway)
- [Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) 및 [shell hooks 참조](https://hermes-agent.nousresearch.com/docs/reference/shell-hooks)
- [공식 저장소](https://github.com/NousResearch/hermes-agent) 및 [optional MCP manifest](https://github.com/NousResearch/hermes-agent/tree/main/optional-mcps)
