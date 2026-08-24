# Hermes Agent Hooks

> 영어판: [`HOOK.md`](HOOK.md)
>
> 함께 읽을 문서: [개요](README.ko.md), [확장](EXTENSIONS.ko.md), [설정](CONFIGURATION.ko.md), [플러그인](PLUGINS.ko.md), [플러그인 작성](PLUGIN_AUTHORING.ko.md)
> **조사일:** 2026-08-24. 공식 Hermes Agent 문서와 [`a0ca7c19204e514f9590ce3b812e029b315ab9e9`](https://github.com/NousResearch/hermes-agent/commit/a0ca7c19204e514f9590ce3b812e029b315ab9e9)에 고정한 first-party source를 근거로 삼았다. 아래 **사실**은 해당 근거를 추적하고, **권고**는 Hermes 보장이 아닌 이 안내서의 운영 정책이다. 버전 의존적인 동작은 운영 전에 다시 확인한다.

## 1차 출처

- [Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks)
- [Build a Hermes Plugin](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins)
- [Plugins](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins)
- [Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)
- [Inbound Webhooks](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks)
- [고정된 Hooks source](https://github.com/NousResearch/hermes-agent/blob/a0ca7c19204e514f9590ce3b812e029b315ab9e9/website/docs/user-guide/features/hooks.md)

## 범위와 선택

**사실:** Hermes는 서로 다른 네 가지 lifecycle-hook system을 문서화한다. 실행 방식과 권한이 필요한 범위에 맞는 가장 좁은 system을 선택하고, outbound lifecycle notification과 inbound webhook route를 혼동하지 않는다.

| 필요 | System | 등록과 범위 | 실행을 제어할 수 있는가? |
| --- | --- | --- | --- |
| Gateway 전용 관찰 또는 integration | Gateway hook | `$HERMES_HOME/hooks/<name>/HOOK.yaml` + `handler.py`; Gateway | 일반 directive contract 없음 |
| In-process tool/model/session/transform policy | Plugin hook | Native plugin의 `ctx.register_hook()`; CLI + Gateway | 이벤트별; 일부 hook은 block, modify, approval request 가능 |
| Lifecycle boundary의 configured command | Shell hook | `$HERMES_HOME/config.yaml`의 `hooks.<event>`; CLI + Gateway | 이벤트별; 지원되는 `pre_tool_call` directive가 call을 제어 가능 |
| External receiver로 HTTP notification | Outbound webhook | `$HERMES_HOME/config.yaml`의 `hooks.outbound`; CLI + Gateway | 불가; notification 전용 |

**사실:** Inbound webhook gateway route와 route script는 다섯 번째 lifecycle-hook system이 아니라 별도 messaging surface다. 인증과 신뢰하지 않는 입력 모델을 별도로 평가해야 한다.

## 런타임과 신뢰 경계

**사실:** Hook은 보안 sandbox가 아니라 trusted-code extension point다. Gateway hook과 Python plugin hook은 Hermes 내부에서 실행된다. Shell hook은 Hermes OS 사용자의 child process로 실행되지만, 이는 process separation일 뿐 capability restriction이 아니다. Hermes는 여러 dispatch point에서 일반 callback exception을 처리하지만 hang, 종료, 자원 고갈, shared-state change, 악성 동작을 일반적으로 격리하지 않는다.

**권고:** High-risk hook은 dedicated non-admin OS account로 실행하고, 상호 신뢰하지 않는 deployment는 별도 process, service account, container 또는 host로 격리한다. `HERMES_SAFE_MODE`는 등록 경로에서 해당 값을 명시적으로 확인하는 system에 대해서만 설명하며, 모든 hook system을 멈추는 검증된 kill switch라고 표현하지 않는다.

## Gateway hooks

**사실:** Gateway hook directory에는 `HOOK.yaml`과 `handler.py`가 있고, `handler.py`는 sync 또는 async `handle(event_type, context)`를 export한다. Manifest는 gateway, session, agent, reaction, `command:*` event를 선택한다. Event payload는 event-specific이며 일부 message/response field는 truncate될 수 있지만, 모든 payload에 적용되는 redaction 보장은 없다.

**사실:** 고정한 revision에서 일치하는 handler는 emitting path가 순서대로 호출하고 await한다. 일반 handler exception은 log되고 이후 handler는 계속 실행되지만, Hermes는 generic gateway-hook timeout, retry, authentication gate, rollback을 제공하지 않는다. Gateway hook이 gateway progress를 막을 수 없다고 설명해서는 안 된다.

**권고:** Gateway hook은 빠른 관찰 또는 안전하게 offload한 side effect에 사용한다. Hook 내부 external I/O에 bound를 두고, effect를 idempotent하게 설계하며, event name이나 registration order를 turn/profile/process 전체의 순서 보장으로 사용하지 않는다.

## Plugin hooks

**사실:** Native plugin은 `register(ctx)`에서 `ctx.register_hook(name, callback)`로 callback을 등록한다. Plugin은 CLI와 Gateway session에서 실행될 수 있다. Hook payload는 keyword 기반으로 additive하게 발전하므로 callback은 닫힌/positional payload schema를 가정하지 말고 `**kwargs`를 받아야 한다.

**사실:** Return handling은 event-specific이다. Observer hook은 return을 무시하고, transform은 자체 contract를 쓰며, `pre_tool_call`은 block, shallow tool-argument modify, 기존 approval flow 요청을 할 수 있다. Approval-observer hook 자체는 실행을 veto하지 않는다. Plugin callback은 in-process이므로 exception은 log/격리될 수 있어도 hang이나 직접 side effect는 작업을 방해할 수 있다.

**권고:** Plugin hook은 trusted application code처럼 다룬다. 필요한 capability만 부여하고 source/dependency를 검토하며 최소 event payload를 사용하고, 한 hook의 권한을 다른 hook에 일반화하지 말고 정확한 event contract를 test한다.

## Shell hooks

**사실:** Shell hook은 `$HERMES_HOME/config.yaml`의 `hooks.<event>` 아래에 설정한다. Hermes는 JSON을 stdin으로 제공하고 implicit shell parsing 없이(`shell=False`) command를 실행한다. Command는 여전히 arbitrary executable code이며 spawning process의 environment와 OS permission을 상속한다.

**사실:** Shell-hook entry에는 `command`, tool event용 matcher, `timeout`, 지원되는 `pre_tool_call` policy용 `fail_closed`/`failClosed`를 설정할 수 있다. 문서화된 기본 timeout은 60초이고 1~300초로 clamp된다. Failure는 보통 fail-open이며, `fail_closed: true`인 `pre_tool_call`은 spawn error, timeout, nonempty invalid output에서 block할 수 있고 exit code `2`는 해당 event를 block한다.

**사실:** Shell-hook consent는 `(event, command)` pair의 registration을 허용하는 것이며, 매 실행이나 script content integrity를 승인하는 것이 아니다. 참조 script를 바꿔도 기존 consent는 무효화되지 않는다. `hermes hooks test`는 일치하는 configured hook을 실제로 실행하고, `hermes hooks doctor`는 smoke test 중 allowlisted hook을 실행할 수 있다.

**권고:** Script를 accept/test하기 전에 검토한다. `fail_closed: true`는 bounded timeout이 있는 검증된 `pre_tool_call` policy에만 사용한다. Safety control로 의존하기 전에 success, spawn error, timeout, malformed output, denial, approval-timeout path를 test한다.

## Outbound webhooks

**사실:** `hooks.outbound`는 asynchronous notification-only HTTP consumer를 등록한다. Callback은 lifecycle payload를 serialize하며 block, transform, approval directive를 return할 수 없다. 고정한 revision의 delivery는 bounded in-memory queue와 daemon worker를 사용하므로 slow target은 다른 target을 지연시키고, overflow는 새 event를 drop하며, shutdown drain은 제한된다. Delivery는 durable, lossless, at-least-once, exactly-once가 아닌 best effort로 취급한다.

**사실:** Target은 `secret_env` 또는 `secret`을 사용할 수 있다. Signing secret이 resolve될 때만 Hermes는 `X-Hermes-Signature-256`을 보낸다. 설정한 `secret_env`가 없으면 target을 disable하거나 inline `secret`으로 fallback하지 않고 unsigned delivery가 된다. Signature는 secret 기준으로 raw body를 인증하지만 payload를 암호화하지 않는다. 현재 구현은 connection failure와 5xx를 같은 delivery ID로 한 번 재시도하고, 3xx/4xx는 재시도하지 않는다.

**권고:** HTTPS를 사용하고 receiver를 idempotent하게 만든다. 인증이 필요하면 unsigned request를 거부하고, 정확한 raw body를 `hmac.compare_digest`로 검증하며, timestamp window를 강제하고, deduplication을 위해 수락한 `delivery_id`를 영속 저장한다. Audit record이거나 process failure 뒤에도 살아야 하는 notification에는 external durable queue/broker를 사용한다.

## Payload, 개인정보, inbound 경계

**사실:** Hook payload 민감도는 event-specific이다. Payload에는 message, conversation history, tool argument/result, model output, path, identifier와 값에 포함된 secret이 들어갈 수 있다. Hermes는 모든 hook payload에 대한 일괄 redaction을 보장하지 않는다. Outbound signing도 payload를 private하게 만들지 않는다.

**사실:** Inbound webhook verification은 route/scheme-specific이다. 명시적인 loopback-only `INSECURE_NO_AUTH`를 제외하면 route에는 configured secret이 필요하다. Verification 성공은 요청이 선택된 shared-secret scheme을 충족한다는 뜻일 뿐 business field가 사실이거나 작성자가 authorized되었거나 text가 agent에 안전하다는 뜻은 아니다. HMAC은 payload를 암호화하지 않으며 body-only scheme은 freshness를 보장하지 않는다.

**권고:** 인증되었어도 모든 inbound message, webhook field, externally supplied hook value를 untrusted agent input으로 취급한다. 최소 event와 constrained toolset을 선택하고 hook을 켜기 전에 모든 receiver, log, template, storage destination을 검토한다.

## Failure와 ordering model

**사실:** Hermes에는 하나의 global hook failure policy나 global ordering guarantee가 없다. 하나의 dispatcher invocation은 보통 현재 callback을 순서대로 방문하지만, 각 event contract는 자체 return precedence를 정의한다. Concurrent call, retry, queue drop, multiple process, profile routing은 보편적인 순서를 보존하지 않는다.

| System/event | 고정한 revision의 제한된 동작 |
| --- | --- |
| Gateway 또는 plugin callback이 일반 `Exception` 발생 | Log 후 계속; rollback/generic timeout 없음 |
| Plugin/shell `pre_tool_call`이 유효한 `block` return | 해당 tool call을 block |
| Shell spawn error 또는 timeout | 기본적으로 allow; configured fail-closed `pre_tool_call`만 block 가능 |
| Shell `pre_tool_call`이 `2`로 exit | 해당 tool call을 block |
| Outbound serialization, queue, HTTP failure | Log/drop; agent action을 veto하지 않음 |

**권고:** 정확한 system/event의 failure behavior를 문서화하고 test한다. Causal metadata를 넣고 gap/duplicate/reordering을 허용하며, caught exception에서 transactionality나 rollback을 추론하지 않는다.

## Profile과 검증

**사실:** Profile-aware routing은 Hermes configuration과 cooperating credential resolution 범위를 제공하지만, 상호 신뢰하지 않는 profile 사이의 security sandbox는 아니다. 임의의 hook/plugin code는 shared process/filesystem resource에 접근할 수 있다. Gateway, shell, outbound hook이 profile마다 독립 격리된다고 설명하지 않는다.

Hook을 enable하기 전:

1. Hook system, exact event, authority, payload field, failure behavior를 식별한다.
2. Code, command argument, inherited environment, outbound receiver, secret source를 검토한다.
3. Active `$HERMES_HOME`, profile, 관련 approval/allowlist configuration을 확인한다.
4. Disposable environment에서 real happy path와 timeout, malformed output, receiver failure, duplicate/retry behavior를 실행한다.
5. Hermes upgrade 때마다 [Event Hooks](https://hermes-agent.nousresearch.com/docs/user-guide/features/hooks) reference를 다시 읽는다.

## EXPAND

- Event-by-event payload table은 사용하는 Hermes version에 pin한 뒤에만 추가한다.
- Receiver implementation은 explicit secret, retention, privacy, replay, idempotency contract가 있을 때만 추가한다.
- `hermes hooks test`/`hermes hooks doctor`는 configured script를 확인한 뒤에만 실행한다. 둘 다 hook code를 실행할 수 있다.
