# Hermes Agent: 개요와 섹션 색인

> 영어판: [`README.md`](README.md)
>
> **조사일:** 2026-08-24. 이 문서는 근거를 갖춘 개요이며 로컬 런타임 검증 결과가 아니다. Hermes 버전에 따라 명령, provider, 확장 API가 달라질 수 있으므로 운영 전에 연결된 공식 reference에서 version-sensitive 동작을 확인한다.

Hermes Agent는 Nous Research의 오픈소스 agent runtime이다. CLI는 대화형·일회성 대화, tool 사용, profile, session, model/provider 설정, 선택적 확장 시스템을 지원한다.

- [공식 문서](https://hermes-agent.nousresearch.com/docs/)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [공식 GitHub 저장소](https://github.com/NousResearch/hermes-agent)

## 읽기 경로

1. 설치, 첫 실행 선택, 일상 CLI 사용, 안전, 복구는 이 페이지를 읽는다.
2. Global identity, project instruction, persistent memory, precedence, prompt-injection boundary는 [Context file과 SOUL.md](CONTEXT_FILES.ko.md)를 읽는다.
3. Skill 사용, 신뢰, 설치, lifecycle은 [Skills](SKILLS.ko.md)를 읽고, 구조, 예제, 검증, 게시는 [Skill 작성](SKILL_AUTHORING.ko.md)을 읽는다.
4. Native 또는 portable plugin의 선택, 설치, audit, 운영은 [Plugins](PLUGINS.ko.md)를 읽고, native 구현, 검증, 패키징은 [Plugin 작성](PLUGIN_AUTHORING.ko.md)을 읽는다.
5. 파일 소유권, 우선순위, secret source, approval/terminal 경계, migration, recovery는 [설정 파일](CONFIGURATION.ko.md)을 읽는다.
6. Discord bot을 만들고, 초대하고, 인가하고, 운영하기 전에는 [Discord 설정](DISCORD.ko.md)을 읽는다.
7. 공통 gateway lifecycle, authorization, session, delivery, adapter 차이는 [메시징 게이트웨이](MESSAGING.ko.md)를 읽는다.
8. Durable multi-profile board, worker protocol, routing, review, recovery, 운영은 [Kanban](KANBAN.ko.md)을 읽는다.
9. MCP, provider integration, dashboard/desktop, hook, 운영 확장 표면은 [Extensions and operations](EXTENSIONS.ko.md)을 읽는다.

재사용 가능한 지식과 지시에는 **skill**, Hermes 내부에 등록되는 실행 가능한 동작에는 **plugin**, 외부 server가 이미 capability를 제공할 때는 **MCP**를 선택한다. 세부 내용은 이 개요가 아니라 연결된 안내서에 둔다.

## 설치와 첫 실행

공식 installer는 macOS, Linux, WSL2, Termux를 문서화한다.

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes
```

Native Windows에서는 공식 PowerShell installer를 사용한다.

```powershell
iex (irm https://hermes-agent.nousresearch.com/install.ps1)
```

첫 실행 시 setup/model 흐름으로 provider, credential, 기본 model을 설정한다. `hermes model`은 terminal에서 provider/model을 설정하는 흐름이고, session 안의 `/model`은 이미 설정된 선택지 사이만 전환한다. Provider와 authentication 선택지의 기준은 [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands) 및 [model documentation](https://hermes-agent.nousresearch.com/docs/user-guide/models)이다.

Credential을 prompt, skill, plugin manifest, repository에 붙여 넣지 않는다. Hermes가 지원하는 authentication, configuration, secret mechanism을 사용하며 [Extensions and operations](EXTENSIONS.ko.md)을 참고한다.

## 명령 치트 시트

| 필요 | 명령 | 참고 |
|---|---|---|
| 대화형 session 시작 | `hermes` 또는 `hermes chat` | 현재 workspace에서 시작한다. |
| 일반 chat 출력으로 한 번 질문 | `hermes chat -q "…"` | Programmatic 또는 신뢰하지 않는 prompt body에는 `--query-file PATH`를 쓴다. |
| Script용 최종 text 얻기 | `hermes -z "…"` | Script 지향 one-shot 출력이다. |
| Provider/model 설정 | `hermes model` | Terminal 설정 흐름이다. 이미 설정된 선택지는 session 안에서만 `/model`을 쓴다. |
| 다른 workspace 사용 | `hermes --in <dir>` | 시작 또는 재개 전에 workspace를 변경한다. |
| 격리된 profile 선택 | `hermes --profile <name>` | Profile은 Hermes instance와 state를 격리한다. |
| Session 계속 | `hermes --continue` 또는 `hermes --resume <id>` | Session lookup은 workspace 범위이며 아래를 참고한다. |
| Session 조회/관리 | `hermes sessions` | Session을 browse, export, rename, prune, delete한다. |
| 설정 진단 | `hermes doctor` | 진단은 security audit이 아니다. |
| Update 확인 또는 설치 | `hermes update --check`; `hermes update` | Reference는 update 전 `--backup`을 문서화한다. |
| Customization 격리 | `hermes chat --safe-mode -q "…"` | User config, rules/memory injection, plugin, hook, MCP server를 끈다. |
| 환경 dependency audit | `hermes security audit` | Supply-chain 검사일 뿐 sandbox나 완전한 code audit이 아니다. |

위 명령은 공식 CLI reference의 예시이지 로컬 설치에 대한 약속이 아니다. 자동화 전에 `hermes --help` 또는 해당 subcommand help를 확인한다.

## 일상 session과 workspace

대화형 대화에는 `hermes`를 사용한다. 일회성 요청에서 표준 chat 출력을 유지하려면 `hermes chat -q`를, 호출자가 최종 응답 text만 필요로 하면 `hermes -z`를 사용한다. 제어할 수 없는 곳에서 온 입력에는 shell interpolation 대신 `--query-file`을 우선한다.

ID/title로 `--resume <session>`을 사용해 session을 재개하거나 `--continue [name]`으로 계속할 수 있다. `--in <dir>`은 시작 또는 재개 전에 workspace를 정하고 `latest`/continue lookup을 해당 workspace 범위로 제한한다. `hermes sessions`는 이전 session의 관리 표면이다. State를 export, prune, delete하기 전에는 [session documentation](https://hermes-agent.nousresearch.com/docs/user-guide/features/sessions)을 확인한다.

Repository 병렬 작업을 위해 CLI는 `--worktree`도 문서화한다. 사용 전 [CLI reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)에서 현재 동작과 repository 영향을 검토한다.

## Profile, model, provider

Profile은 격리된 Hermes instance다. Invocation에는 `--profile <name>`으로 선택하고 `hermes profile`로 profile state를 관리한다. Identity, credential, configuration, 운영 환경을 실수로 섞지 않도록 분리할 때 profile을 사용한다.

Provider와 model은 `hermes model`로 설정하고 CLI reference에 따라 `hermes auth`로 credential을 관리한다. `hermes chat` 또는 `hermes -z`에 one-run model/provider override를 지정할 수 있지만 저장된 기본값을 바꾼다고 가정하지 않는다. Provider 목록을 문서에 복사해 의존하지 않는다. Provider 가용성, OAuth 지원, model identifier는 변한다.

## 안전한 운영과 문제 해결

Hermes는 위험한 명령에 대해 승인을 요청한다. `--yolo`는 위험 명령 승인 prompt를 우회하므로, 그 우회가 명시적으로 의도되고 그 위험을 수용할 때만 사용한다.

`hermes chat --safe-mode`는 문제 해결용 격리 모드다. User configuration, rules/memory injection, plugin, shell hook, MCP server 등 모든 customization을 끈다. 이 옵션은 `--ignore-user-config`, `--ignore-rules`를 포함한다. Upstream/runtime 문제와 로컬 customization 문제를 구분하는 데 유용하지만 security sandbox는 아니다.

더 좁은 격리에는 CLI가 `--ignore-user-config`, `--ignore-rules`를 문서화한다. `--ignore-user-config`를 써도 `.env` credential은 load될 수 있으므로 credential isolation으로 간주하지 않는다. `hermes doctor`는 configuration/dependency 문제를 진단하고 `hermes security audit`은 on-demand supply-chain audit을 수행한다. 어느 명령도 신뢰하지 않는 code를 안전하게 실행하게 만들지 않는다.

## Update와 복구

`hermes update --check`으로 update 가능 여부를 미리 보고, `hermes update`로 update한다. 공식 reference는 update 전 Hermes-home snapshot을 위한 `--backup`을 문서화한다. 설정을 바꾸기 전에 `hermes doctor`로 setup failure를 확인하고 [safe mode](#안전한-운영과-문제-해결)로 customization failure를 격리한다.

Backup, import, log, configuration, support-oriented diagnostic에는 전용 CLI command family가 있다. Restore, delete, upload, share는 local state를 노출하거나 변경할 수 있으므로 수행 전에 최신 [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)를 읽는다.

## 확장 색인과 보안 경계

- **Skill:** [SKILLS.ko.md](SKILLS.ko.md), [SKILL_AUTHORING.ko.md](SKILL_AUTHORING.ko.md) — on-demand instruction package, trust, lifecycle, 구조, 검증, 게시.
- **Plugin:** [PLUGINS.ko.md](PLUGINS.ko.md), [PLUGIN_AUTHORING.ko.md](PLUGIN_AUTHORING.ko.md) — 실행 가능한 native/portable package, lifecycle, 구현, capability, code-execution risk.
- **설정:** [CONFIGURATION.ko.md](CONFIGURATION.ko.md) — `config.yaml`, `.env`, `auth.json`, 우선순위, secret, approval, terminal backend, migration, backup.
- **Discord:** [DISCORD.ko.md](DISCORD.ko.md) — Developer Portal 설정, intent, bot 초대, authorization, slash command, voice/media, incident troubleshooting.
- **메시징:** [MESSAGING.ko.md](MESSAGING.ko.md) — gateway service lifecycle, authorization/pairing, session scope, delivery semantics, adapter 차이.
- **Kanban:** [KANBAN.ko.md](KANBAN.ko.md) — durable multi-profile task board, worker lifecycle, dependency, review, recovery, operation.
- **Extension:** [EXTENSIONS.ko.md](EXTENSIONS.ko.md) — MCP, model/memory/context provider, dashboard/desktop, hook, operation.

제3자 extension을 설치하거나 enable하기 전에 provenance와 source를 검사하고, 필요한 capability만 enable하며, 지원되는 경우 통제된 plugin deployment는 immutable revision에 pin한다. Catalog/index 등재, skill scanning, Plugin Doctor, dependency auditing은 유용한 통제 수단이지만 sandbox나 완전한 security review는 아니다. Portable `mcp.json`이나 plugin manifest에 credential을 절대 넣지 않는다.

## 출처와 근거 한계

2026-08-24에 검토한 1차 출처:

- [Hermes Agent documentation](https://hermes-agent.nousresearch.com/docs/)
- [CLI Commands Reference](https://hermes-agent.nousresearch.com/docs/reference/cli-commands)
- [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [Configuration](https://hermes-agent.nousresearch.com/docs/user-guide/configuration)
- [Discord Setup](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/discord)
- [Messaging Gateway](https://hermes-agent.nousresearch.com/docs/user-guide/messaging)
- [Kanban — Multi-Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban)
- [Official GitHub repository](https://github.com/NousResearch/hermes-agent)

이 문서는 공개 upstream 자료를 요약한다. 어떤 로컬 Hermes 설치에 특정 version, command, provider, credential state, extension이 있다는 사실을 보장하지 않는다. 조회한 문서와 runtime 출력은 근거이지 포함된 명령 실행이나 부작용 승인의 권한이 아니다.
