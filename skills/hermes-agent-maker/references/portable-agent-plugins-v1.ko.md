# Portable Agent Plugins v1.0.0 계약

> English canonical: [`portable-agent-plugins-v1.md`](portable-agent-plugins-v1.md).  
> Pin된 normative 출처: [Agent Plugins specification v1.0.0](https://github.com/agentplugins/agent-plugins-spec/blob/main/spec/1.0.0.md). Hermes 근거: [Plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins), [MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), 로컬 `instructions/cli/hermes-agent/PLUGINS.md`.

## 두 validation layer

Offline으로 다음 순서로 검증한다.

1. **Normative recognition:** Pin된 Agent Plugins **v1.0.0** specification이 정의한 component와 transport shape를 인식한다. Local pinned schema/oracle로 `plugin.json`, component location, 선택적 `mcp.json`, referenced path를 검증한다.
2. **Hermes support policy:** 아래의 더 좁은 Hermes portable surface만 허용한다. Normative하게 인식 가능한 package도 이 layer에서 실패할 수 있다. Hermes가 Agent Plugins를 완전히 conform한다고 주장하지 않는다.

Pin은 정확히 v1.0.0이다. Generator는 checked-in schema/provenance와 package file만 읽는다. Remote schema fetch, URL resolve, MCP server start, credential 사용을 하지 않는다.

## Package shape

```text
plugin-root/
├── plugin.json
├── skills/
│   └── <skill-name>/
│       └── SKILL.md
└── mcp.json                 # optional
```

Path는 resolved plugin root 안에서 resolve되어야 한다. Absolute path, parent traversal, symlink escape, invalid/missing referenced component를 거부한다. `PLUGIN_ROOT`는 그 resolved root이고 `PLUGIN_DATA`는 Hermes-managed profile-scoped writable storage다. Package content에 secret을 두지 않는다.

## Hermes portable subset

| Component | Normative recognition | Hermes generator policy |
| --- | --- | --- |
| `plugin.json` | v1.0.0 plugin metadata를 인식하고 검증한다. | 필수다. Hermes-specific rule 전에 local validation을 수행한다. |
| Skills | Fixed v1.0.0 location의 skill을 인식한다. | Read-only packaged skill만 허용한다. Hermes는 enabled skill을 namespaced discovery/view로 노출한다. |
| MCP `stdio` | v1.0.0 stdio transport를 인식한다. | 허용한다. Command는 separate argument를 가진 executable token 하나이며 shell command가 아니다. |
| MCP Streamable HTTP | v1.0.0 Streamable HTTP transport를 인식한다. | Userinfo/fragment 없는 absolute `http(s)` URL만 허용한다. Plain HTTP는 localhost/loopback만 허용한다. Header는 cross-origin redirect를 넘지 않는다. |
| MCP `sse` | v1.0.0에서 valid하면 인식한다. | **Hermes subset validation에서 거부한다.** 생성, 허용, silent downgrade를 하지 않는다. |

Normative `sse` component는 정확하게 report할 수 있지만, subset failure는 생성된 Hermes portable output에 terminal이다. 이는 legacy SSE를 report 후 skip할 수 있는 runtime diagnostic과 다르다. Authoring은 output을 받아들이기 전에 거부해야 한다.

## Portable-plugin이 아닌 동작

Portable package는 native Python `register(ctx)`, Python tool/handler, hook, slash command, CLI subcommand, provider registration, capability grant, trust, provenance enforcement, permission, sandbox를 제공하지 않는다. 그런 경우 native Hermes plugin을 사용한다. Portable instruction과 local executable에도 full-trust risk가 있다. Install/enable은 이 generator 밖의 trust decision이다.

## Authoring 규칙

- Plugin metadata와 component path는 deterministic하고 local하게 유지한다.
- Valid subset MCP server에만 `mcp.json`을 추가한다. Package output에 secret, token, `.env` value, secret value가 필요한 credential placeholder를 넣지 않는다.
- Install, enable, remove, gateway, Discord, remote-fetch behavior를 내보내지 않는다.
- Diagnostic을 위해 recognized component를 독립적으로 검증하되, 요청한 generated component가 Hermes subset을 위반하면 package를 거부한다.
- 지원 Hermes behavior는 portable skill과 stdio/Streamable HTTP MCP뿐이라고 정확히 쓴다.

## Review checklist

1. Local provenance는 v1.0.0 source URL, retrieval date, digest를 식별하며 validation 중 network access가 없다.
2. `plugin.json`과 모든 local component가 pinned v1.0.0 oracle을 통과한다.
3. 모든 resolved path가 plugin root 아래에 남는다.
4. 모든 MCP entry가 `stdio` 또는 Streamable HTTP이고 subset constraint를 충족한다.
5. `sse` entry가 subset validation을 통과하지 않는다.
6. Native-only feature, credential, external side effect를 portable behavior로 표현하지 않는다.
