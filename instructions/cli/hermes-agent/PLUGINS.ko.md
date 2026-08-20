# Hermes Agent 플러그인

> English version: [PLUGINS.md](PLUGINS.md)  
> 구현 안내: [PLUGIN_AUTHORING.ko.md](PLUGIN_AUTHORING.ko.md)  
> 조사 기준일: **2026-08-20**. 배포 전 설치된 Hermes 버전의 동작을 확인한다.

## 범위 및 주요 출처

이 안내서는 Hermes 플러그인의 선택, 탐색, 설치, 운영, 보안을 다룬다. 네이티브 매니페스트, `register(ctx)`, 코드, 검증, 패키징, 호환성은 [플러그인 작성](PLUGIN_AUTHORING.ko.md)을 읽는다.

- [플러그인 개요 및 수명 주기](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Hermes 플러그인 만들기](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)
- [Hermes Agent 저장소](https://github.com/NousResearch/hermes-agent)
- [Agent Plugins v1 명세](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md)

## 가장 작은 확장 표면 선택

| 필요 | 사용할 방식 | 다음 경우에는 네이티브 일반 플러그인을 사용하지 말 것 |
|---|---|---|
| LLM 호출 도구, Python 훅, 슬래시 명령, CLI 하위 명령, 패키지 스킬 | **네이티브 플러그인**: `plugin.yaml` + Python `register(ctx)` | 외부 MCP 서버 또는 지식 워크플로만 있으면 된다. |
| Agent Plugins 구현체에서 쓸 수 있는 이식 가능한 스킬과 제한된 MCP 패키지 | **Portable Agent Plugin v1**: `plugin.json`, `skills/`, 선택적 `mcp.json` | Python 핸들러, 훅, 명령, 프로바이더 등록 또는 샌드박스가 필요하다. Hermes는 전체 적합성이 아닌 부분집합을 지원한다. |
| 실행형 통합 없는 지침/워크플로 | **스킬** | 런타임 도구, 자격 증명 API 또는 수명 주기 동작이 필요하다. |
| 이미 존재하는 외부 도구 서버 | `mcp_servers` 설정의 **MCP** | 프로세스 내 Python 동작이나 Hermes 수명 주기 훅이 필요하다. |
| TTS/STT 또는 셸 이벤트 명령 | 설정 기반 명령 프로바이더 또는 셸 훅 | 명령 템플릿으로 통합을 완전히 표현할 수 있다. |

**권장:** 제3자 제품 통합은 독립 저장소로 만든다. 이는 품질 판단이 아닌 공식 결합/유지보수 경계다.

## 탐색 및 활성화 수명 주기

네이티브 일반 플러그인은 `plugin.yaml`, `__init__.py`, `register(ctx)`를 포함한다. Hermes는 번들 플러그인, `~/.hermes/plugins/`의 사용자 플러그인, `HERMES_ENABLE_PROJECT_PLUGINS=true`일 때만 `.hermes/plugins/`의 신뢰하는 프로젝트 플러그인, pip 엔트리 포인트, Nix 선언을 탐색한다. 같은 이름이 충돌하면 뒤의 소스가 앞의 소스를 대체한다.

일반 사용자 플러그인은 `plugins.enabled`에 들어가기 전에는 **탐색되지만 실행되지 않는다**. 충돌 시 `plugins.disabled`가 이긴다. 번들 플랫폼/백엔드와 특수 프로바이더 탐색에는 별도 선택 규칙이 있으므로 allow-list가 모든 범주를 제어하지 않는다.

```bash
# 설치는 실행을 뜻하지 않는다.
hermes plugins install owner/repository --no-enable
hermes plugins list
hermes plugins enable calculator
hermes plugins disable calculator
hermes plugins remove calculator

# 재현 가능한 설치에는 변경 불가능한 40자 전체 커밋이 필요하다.
hermes plugins install owner/repository \
  --ref 0123456789abcdef0123456789abcdef01234567
```

**사실:** Hermes는 프로필별로 소스, 리비전, 핀 상태를 기록한다. 핀에는 태그, 브랜치, 축약 SHA를 거부하고 `plugins update`는 핀된 플러그인을 옮기지 않는다. `install ... --force --ref <새-전체-sha>`로만 핀을 명시적으로 바꾼다.

**권장:** 정확한 운영 리비전을 검토하고 핀한 뒤 업데이트를 코드 배포로 취급한다. 커뮤니티 인덱스 등재는 메타데이터 검토이며 **코드 감사가 아니다**.

## 프로바이더 및 확장 경계

다음 백엔드에는 일반 도구가 아닌 전용 인터페이스를 사용한다.

| 확장 | 경계 및 선택 |
|---|---|
| 추론/모델 프로바이더 | `plugins/model-providers/<name>/`에서 `ProviderProfile`을 등록하고 사용자는 `--provider` 또는 설정으로 선택한다. |
| 메모리 프로바이더 또는 컨텍스트 엔진 | 전용 단일 활성 프로바이더 인터페이스. |
| 게이트웨이 플랫폼, 이미지/비디오 생성, 브라우저, 웹 검색, 시크릿 소스, 대시보드 인증 | 각 문서화된 어댑터/추상 베이스 클래스 인터페이스 및 탐색 경로. |
| 외부 도구 | MCP를 설정하면 Hermes가 서버 도구를 탐색한다. |

일반 플러그인은 공존할 수 있다. 프로바이더 선택은 다른 소유권과 활성화 의미를 가지므로, 프로바이더 자격 증명, 재시도, 설정, 기능 동작은 그 프로바이더 인터페이스 안에 둔다.

## Portable Agent Plugins v1

이식 패키지는 네이티브 Python 플러그인이 아닌 호환 패키지다.

```text
my-portable-plugin/
├── plugin.json
├── skills/
│   └── summarize/
│       └── SKILL.md
└── mcp.json
```

Hermes는 `plugin.json`, 스킬 frontmatter, 고정 컴포넌트 위치, MCP 엔트리, 해석된 경로, 심볼릭 링크 포함 여부를 로컬에서 검증하며 로드 중 스키마를 가져오지 않는다. 활성화된 패키지는 `skills_list`와 `skill_view`를 통해 읽기 전용 네임스페이스 스킬 및 MCP를 제공할 수 있다. 네임스페이스는 결정적이다(`agent-plugin-<slug>-<hash>`). `PLUGIN_ROOT`는 해석된 패키지 루트이고 `PLUGIN_DATA`는 Hermes가 관리하는 프로필별 쓰기 가능 저장소다.

지원 MCP 부분집합은 **stdio**와 **Streamable HTTP**다. stdio는 셸이 아닌 실행 파일 토큰 하나와 별도 인수를 사용한다. Streamable HTTP는 userinfo와 fragment가 없는 절대 `http(s)` URL이어야 한다. 일반 HTTP는 localhost/loopback에서만 허용되며 헤더는 cross-origin 리디렉션을 넘어 전달되지 않는다. 레거시 `sse`는 보고 후 건너뛴다. 유효한 형제 컴포넌트가 있으면 잘못된 컴포넌트는 독립적으로 건너뛴다.

Portable Agent Plugins v1은 신뢰, 권한, provenance, 샌드박스를 제공하지 않는다. 하나를 활성화하면 그 지침과 로컬 실행 파일은 설치된 다른 플러그인과 같은 완전 신뢰 상태가 된다. 이식 가능한 스킬/MCP에만 사용하고 Python 도구, 훅, 슬래시/CLI 명령, 프로바이더 통합에는 네이티브 플러그인을 사용한다.

## 운영 및 보안

```bash
# 탐색/로드 진단과 기능 동의 상태를 검토한다.
HERMES_PLUGINS_DEBUG=1 hermes plugins list
hermes logs --level WARNING
hermes plugins capabilities calculator
```

네이티브 매니페스트의 `requires_env`로 누락된 런타임 자격 증명을 선언한다. 설치는 없는 값을 묻고, 필수 변수가 없으면 Hermes를 충돌시키지 않고 플러그인을 비활성화한다. portable `mcp.json`, 매니페스트, 소스, 로그, 패키지 파일, 플러그인 상태에 자격 증명을 저장하지 않는다.

`tools.override`, 호스트 LLM 재정의, 게이트웨이 플랫폼 작업 같은 기능은 선언과 동의가 필요하다. Hermes는 설치/활성화/업데이트에서 이를 보여 주고 플러그인별 권한을 기록하며 새 기능에는 재동의를 요구한다. 플러그인은 권한 있는 호스트 표면에 접근하기 전에 `ctx.has_capability()`를 사용해야 한다.

**중요한 사실:** 기능은 동의와 감사 제어이며 **샌드박스가 아니다**. 네이티브 플러그인은 사용자 OS 권한으로 동작하는 프로세스 내 Python이므로 호스트 게이트를 무시하거나 접근 가능한 파일을 읽고 네트워크를 쓰고 프로세스를 시작할 수 있다. 신뢰하는 코드만 설치·활성화한다. 가능하면 최소 권한, 명시적 시간 초과, 입력 검증, 출력 비식별화, 기능 없는 설계를 우선한다.

작성 전용 Doctor 동작, 디버그 세부 사항, 안전한 구현 패턴은 [플러그인 작성](PLUGIN_AUTHORING.ko.md)을 참조한다.
