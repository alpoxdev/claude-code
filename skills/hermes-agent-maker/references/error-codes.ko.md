# Hermes Agent Maker 오류 코드와 복구 동작

> 영어 정본: [`error-codes.md`](error-codes.md).  
> 출처: `skills/hermes-agent-maker/scripts/generate.mjs`와 `skills/hermes-agent-maker/scripts/validate-portable-v1-output.mjs`. 이 문서는 두 script가 실제로 던지는 코드에서만 도출했습니다.

두 script는 모두 stderr 한 줄 `{"error":"E_*"}`과 종료 코드 1로 닫히며 실패합니다. `generate.mjs`는 435번째 줄에서, `validate-portable-v1-output.mjs`는 299번째 줄에서 이 envelope를 씁니다. stdout에는 성공했을 때만 receipt가 나오므로, 에이전트는 트리를 부분적으로 들여다보지 말고 stderr만 보고 판단합니다.

모든 코드는 두 복구 그룹 중 정확히 하나에 속합니다. 제3의 선택지도, 재량 판단도 없습니다.

- **입력을 고쳐서 다시 실행.** 기계적인 실패이고 *쓰기 이전에* 검출되었습니다. manifest, target, workspace를 고친 뒤 다시 실행합니다.
- **종료 정지 — 증거를 보존하고 절대 재시도하지 않음.** 기존 트리, marker, journal, lock, 혹은 부분 적용되었을 수 있는 commit에 닿은 실패입니다. 멈추고 코드와 경로를 보고한 뒤 판단을 사용자에게 넘깁니다.

## 타협 불가 규칙

1. **`E_TARGET_EXISTS`는 절대로 `overwrite: true`를 스스로 켤 근거가 아닙니다.** 이 코드는 대상이 이미 있고 spec이 교체를 요청하지 않았다는 뜻입니다. `overwrite: true`는 사용자가 명시적으로 지시할 때만 허용됩니다. 에이전트가 스스로 이 플래그를 켜면, 건드리지 말라고 한 데이터를 파괴한 것입니다.
2. **`E_LOCK`은 폴링·대기·반복 재시도를 하면 안 됩니다.** `sleep` 금지, backoff 금지, 두 번째 시도 금지, "한 번만 더" 금지. 다른 writer가 대상을 쥐고 있거나 lock 경로가 안전하지 않다는 뜻입니다. 보고하고 멈춥니다.
3. **`E_COMMIT_VERIFY`는 변경 상태가 UNKNOWN이라는 뜻입니다.** rename은 일어났는데 되읽기가 일치하지 않았습니다. journal(`.hermes-agent-maker-journal-<token>.json`), stage 디렉터리(`.hermes-agent-maker-stage-<token>-*`), backup(`<target>.hermes-backup`)을 그대로 보존합니다. 지우지 말고, "정리"하지 말고, 다시 실행하지 마십시오. 재실행은 진단에 필요한 바로 그 증거를 다시 해석해 덮어씁니다.
4. **`E_UNOWNED_ROOT`와 `E_MARKER`: 대상을 보존합니다.** marker 파일이나 소유가 확인되지 않은 트리를 복구·삭제·덮어쓰기·수동 편집하지 마십시오. 이 코드들은 생성기가 디스크 위 대상의 소유를 증명할 수 없다는 뜻이며, 그대로 쓰면 남의 산출물을 뭉갭니다.
5. **JSON이 아닌 stderr는 모두 종료 정지입니다.** 아래 "프로토콜은 완전히 닫혀 있지 않습니다" 참고.

## 그룹 1 — 입력을 고쳐서 다시 실행

파일 시스템 변경 이전에 발생합니다. 입력을 바로잡은 뒤 재실행하는 것은 안전합니다.

| 코드 | 의미 | 단계 | 결정적 에이전트 동작 |
| --- | --- | --- | --- |
| `E_ARGS` | 잘못된 CLI 호출: `--manifest`/`--workspace` 이외의 플래그, 값 누락, 플래그 중복, 또는 validator에서 `--root <path>` 정확히 두 인자가 아닌 경우. | 인자 파싱, 읽기 이전 | 필요한 플래그·값 쌍만으로 명령줄을 다시 구성해 재실행합니다. |
| `E_JSON` | JSON 문서가 파싱되지 않았거나 객체가 아닌 값으로 파싱되었습니다. manifest 단계에서는 spec 파일, validator에서는 `plugin.json` 또는 `mcp/*.json`입니다. | manifest 읽기(생성기) 또는 문서 읽기(validator) | manifest 단계: 유효한 단일 JSON 객체로 다시 만들어 재실행합니다. 이미 쓰인 트리에 대한 validator 단계라면 그룹 2로 취급합니다. |
| `E_SPEC` | 정규화된 spec이 유효하지 않습니다: 미지의 필드, 지원하지 않는 `kind`, 안전 패턴을 어기거나 금지어를 포함한 `summary`, 안전하지 않은 `target`, `preview`/`apply`가 아닌 `mode`, boolean이 아닌 `overwrite`, `1.0.0`이 아닌 `template_version`, 또는 `kind`가 요구하는 것과 어긋나는 `name`의 존재·부재. | spec 검증, 대상을 읽기 이전 | 해당 필드를 spec 계약에 맞게 고쳐 재실행합니다. 필드를 추가해 spec을 넓히지 마십시오. |
| `E_TARGET` | `target`이 안전한 상대 경로가 아니거나, 단일 파일 `kind`가 고정 파일명이 아닌 곳을 가리킵니다(`soul`→`SOUL.md`, `agents`→`AGENTS.md`, `user-draft`→`USER.md.draft.md`, `memory-draft`→`MEMORY.md.draft.md`). | spec 검증 | 해당 `kind`가 요구하는 경로로 `target`을 지정해 재실행합니다. |
| `E_WORKSPACE` | `--workspace` 경로가 없거나, 디렉터리가 아니거나, symlink입니다. | workspace 해석 | `--workspace`를 실제 디렉터리로 지정해 재실행합니다. symlink를 직접 풀거나 교체하지 마십시오. |
| `E_CONTAINMENT` | 해석된 대상이 실제 workspace 루트를 벗어나거나, validator에서 참조 경로가 출력 루트 밖으로 해석되거나 symlink를 넘어갑니다. | 생성기의 대상 해석, validator의 참조 해석 | 생성기에서 쓰기 이전이라면: workspace 안에 머무는 `target`을 골라 재실행합니다. lock 이후 재확인(412번째 줄)이나 이미 쓰인 트리에 대한 validator에서 나왔다면 그룹 2로 취급합니다. |
| `E_TEMPLATE` | 해당 `kind`의 template bundle 항목이 없거나 형식이 어긋납니다: `files` 배열 없음, 잘못된 `path`/`content`/`mode`, 안전하지 않거나 marker 경로와 충돌하는 렌더 경로, 빈 파일 목록, 중복 경로. | 렌더, 쓰기 이전 | 동결된 script를 고치지 마십시오. `kind`를 보고하고 멈춥니다. 잘못된 bundle은 스킬 패키징 결함이지 에이전트가 손댈 입력이 아닙니다. |
| `E_CANONICAL_JSON` | 값을 정규 직렬화할 수 없었습니다(`JSON.stringify`가 `undefined` 반환). | 렌더 또는 marker 구성 중 정규 직렬화 | 보고하고 멈춥니다. 사용자가 고칠 입력이 아니라 내부 불변식 파손입니다. |
| `E_SCHEMA_PROVENANCE` | 고정된 오프라인 schema 출처 정보가 잘못되었습니다: 잘못된 `schema_version`, `offline-vendored`가 아닌 `retrieval`, 누락·추가된 schema 항목, `sha256` 불일치, 기대한 v1 URL이 아닌 `$id`. | validator, 고정 schema 적재 | 보고하고 멈춥니다. 네트워크로 schema를 가져오지 말고, 통과시키려고 출처 파일을 다시 쓰지 마십시오. |
| `E_PLUGIN_V1` | `plugin.json`이 고정된 Agent Plugins v1.0.0 schema를 만족하지 않거나, `components`/`mcp` 형태가 잘못되었습니다. | validator, plugin 문서 검사 | 쓰기 이전 렌더를 검증 중이면 spec 입력을 고쳐 재실행합니다. 이미 쓰인 트리라면 그룹 2로 취급합니다. |
| `E_MCP_V1` | `mcp/*.json` 문서가 고정된 MCP v1.0.0 schema를 만족하지 않거나 `servers` 값이 객체가 아닙니다. | validator, MCP 문서 검사 | `E_PLUGIN_V1`과 동일합니다. 쓰기 이전이면 고쳐 재실행, 쓰기 이후면 그룹 2. |
| `E_HERMES_SUBSET` | 내용이 Hermes subset 정책을 위반합니다: 금지된 동작 용어나 metadata 키, 형식이 어긋난 `SKILL.md` frontmatter, 잘못된 skill 경로, 객체가 아닌 server 항목, 잘못된 command/args 형태, `sse` transport, `http`/`streamable-http`가 아닌 transport, 문자열이 아니거나 파싱되지 않는 URL, `http(s)`가 아닌 scheme, 내장된 credential이나 fragment, loopback이 아닌 `http`·`http` transport server. | validator, Hermes subset 검사 | 문제가 되는 내용을 spec을 통해 고치고 다시 렌더합니다. 통과시키려고 subset 검사를 완화하지 마십시오. |
| `E_REFERENCE` | 참조 경로를 쓸 수 없습니다: 절대 경로, 역슬래시 포함, 점 세그먼트 포함, 출력 루트 밖, 파일이 아닌 항목, 읽기 실패, 선언된 skill의 `SKILL.md` 누락, 잘못된 `mcp/` 경로, 실제 디렉터리가 아닌 출력 루트. | validator, 참조 해석 | 쓰기 이전: 참조 집합을 고쳐 다시 렌더합니다. 이미 쓰인 트리라면 그룹 2로 취급합니다. |
| `E_UNKNOWN` | 던져진 값이 `Error`가 아니어서 코드를 뽑아낼 수 없었습니다. | 모든 단계 — 최외곽 catch | 종료 정지로 취급합니다. 단계를 모르므로 쓰기 상태도 알 수 없습니다. 모두 보존하고 보고합니다. |

`E_`(접두사 단독)는 **방출되는 오류 코드가 아닙니다.** 소스에서는 `validate-portable-v1-output.mjs` 104번째와 161번째 줄의 `error.message.startsWith("E_")` 판별에만 나오며, 이미 코드가 붙은 오류를 `E_REFERENCE`로 덮어쓰지 않고 다시 던지기 위한 sentinel 접두사입니다. 소스를 기계적으로 grep했을 때 이 문서와 정확히 대조되도록 여기에 적어 둡니다.

## 그룹 2 — 종료 정지, 증거 보존, 재시도 금지

기존 트리, marker, journal, lock, 또는 부분 적용되었을 수 있는 commit에 닿습니다. **생성기를 다시 실행하지 마십시오. 정리하지 마십시오. 복구하지 마십시오.** 코드, 대상 경로, journal/stage/backup 경로를 보고하고 멈춥니다.

| 코드 | 의미 | 단계 | 결정적 에이전트 동작 |
| --- | --- | --- | --- |
| `E_SPECIAL_FILE` | 기존 경로 구성 요소가 symlink이거나, 경로 중간에 디렉터리가 아닌 것이 있거나, 대상 자체가 일반 파일도 디렉터리도 아닙니다. 기존 트리의 preimage 수집 중에도 발생합니다. | 대상 해석 및 트리 순회 | 멈춥니다. 경로를 비우려고 특수 파일이나 symlink를 지우거나 바꾸지 말고, 정확한 경로를 사용자에게 보고합니다. |
| `E_TARGET_EXISTS` | 대상이 이미 있는데 spec이 `overwrite: true`를 설정하지 않았습니다. | 쓰기 게이트, lock 아래 | 멈추고 사용자에게 묻습니다. **스스로 `overwrite: true`를 켜지 마십시오.** 그 플래그는 오직 사용자의 결정입니다. |
| `E_UNOWNED_ROOT` | 대상은 있으나 생성기가 소유를 증명할 수 없습니다: 잘못된 파일 유형, symlink, marker 누락 또는 symlink, 추적 경로의 누락·초과, marker와의 내용·모드 불일치. | 소유 검증, lock 아래 | 멈춥니다. 대상을 그대로 보존합니다. 복구·삭제·덮어쓰기를 하지 말고, 검사를 통과시키려고 marker를 쓰지 마십시오. |
| `E_MARKER` | ownership marker 자체가 유효하지 않습니다: 키 집합 불일치, 잘못된 `schema_version`/`artifact_kind`/`target_identity`/`template_version`/`marker_path`, digest 불일치, 정규 형식이 아닌 바이트, 형식이 어긋나거나 정렬되지 않은 owned entry, 트리와 어긋나는 owned directory 집합. | 소유 검증, lock 아래 | 멈춥니다. marker를 바이트 그대로 보존합니다. 수동 편집·재생성·삭제 금지. |
| `E_PREIMAGE_MODE` | 대상 트리의 기존 파일 모드가 `0644`도 `0755`도 아니어서 이전 상태를 journal에 기록할 수 없습니다. | preimage 수집, transaction 이전 | 멈춥니다. 수집을 성공시키려고 트리에 `chmod`하지 말고 경로와 모드를 보고합니다. |
| `E_PARENT` | commit 시점에 대상의 상위 디렉터리가 디렉터리가 아니거나 symlink입니다. | transaction commit 준비 | 멈춥니다. 상위 디렉터리를 교체하거나 unlink하지 마십시오. |
| `E_LOCK` | 대상별 lock을 얻지 못했습니다: 살아 있는 소유자가 쥐고 있음, 안전하지 않은 lock 경로(디렉터리가 아니거나 symlink), `EEXIST` 복구 경로 실패, 재획득 `mkdir` 실패. | lock 획득 | 멈추고 보고합니다. **폴링·sleep·backoff·반복 재시도 금지.** 한 번의 획득 시도가 프로토콜의 전부입니다. |
| `E_STALE_TRANSACTION` | commit 시점에 이전에 중단된 실행의 `<target>.hermes-backup`이 남아 있는데, 이를 인증할 journal이 없습니다. | transaction commit 준비 | 멈춥니다. backup을 보존합니다. 쓰기를 뚫으려고 삭제하지 마십시오. 이전 트리의 유일한 사본일 수 있습니다. |
| `E_JOURNAL` | journal 형식이 어긋나거나 이 대상에 묶이지 않습니다: 잘못된 `version`/`directory`/`target_identity`/`target`/`stage`/`backup` 필드, 도출된 token 배치와 맞지 않는 경로, 유효하지 않은 expected/previous map, 현재 대상과 다른 `target`을 가진 journal. | 복구, 쓰기 게이트 이전 | 멈춥니다. journal을 보존합니다. 삭제하거나 손으로 고치지 마십시오. 복구는 생성기가 인증할 수 있을 때만 유효합니다. |
| `E_FOREIGN_TRANSACTION` | journal 형식은 맞지만 `artifact_id`가 다른 산출물의 것입니다. 다른 writer의 중단된 transaction이 이 대상에 남아 있습니다. | 복구, 쓰기 게이트 이전 | 멈춥니다. journal, stage, backup을 보존합니다. 다른 산출물의 transaction을 복구하지 마십시오. |
| `E_RECOVERY_AMBIGUOUS` | 디스크 상태가 판정 가능한 네 가지 복구 처분 중 어느 것과도 맞지 않아, 완료와 롤백을 구분할 수 없습니다. | 중단된 transaction의 복구 | 멈추고 사용자에게 올립니다. journal, stage, backup, 대상을 보존합니다. 재실행은 모호성을 풀지 못하고 증거만 덮어씁니다. |
| `E_STAGE_VERIFY` | 방금 쓴 stage가 기대한 내용·모드 map으로 되읽히지 않았습니다. | staging, 대상 변경 이전 | 멈춥니다. stage는 script가 제거하고 대상은 건드려지지 않았습니다. 보고하고 무턱대고 재실행하지 마십시오. 되읽기 불일치는 잘못된 입력이 아니라 파일 시스템이나 동시성 문제를 뜻합니다. |
| `E_COMMIT_VERIFY` | 대상이 제자리로 rename되었으나 기대한 map으로 되읽히지 않았습니다. **변경 상태가 UNKNOWN입니다.** | commit, 대상 rename 이후 | 즉시 멈춥니다. journal, stage, backup을 보존합니다. 정리 금지, 재실행 금지, 살펴보고 고치기 금지. 세 경로와 대상을 사용자에게 보고합니다. |

## 프로토콜은 완전히 닫혀 있지 않습니다

`generate.mjs`는 template bundle을 **모듈 적재 시점, 12번째 줄**에서 파싱합니다.

```js
const templates = JSON.parse(readFileSync(join(scriptRoot, "assets/templates/artifacts.json"), "utf8"));
```

`{"error":"E_*"}` envelope는 훨씬 뒤, **435번째 줄**의 바닥 `try`/`catch`에 설치됩니다.

```js
try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "E_UNKNOWN" })}\n`); process.exitCode = 1; }
```

12번째 줄은 그 `try` 블록 **바깥**에서 실행됩니다. 따라서 손상된 template bundle(`JSON.parse`의 `SyntaxError`)이나 읽기 중 OS 수준 실패(`EACCES`, `ENOENT`)는 JSON envelope가 아니라 **원시 메시지나 stack trace로 stderr에 드러납니다.** 모듈 수준 import에도, 그리고 envelope가 299번째 줄에 있고 import가 그 위에 있는 `validate-portable-v1-output.mjs`에도 같은 노출이 있습니다.

에이전트에게 주는 결론은 명시적입니다.

> **파싱 가능한 `{"error":"E_*"}` 한 줄이 아닌 stderr 출력은 모두 종료 정지입니다.** stack trace를 패턴 매칭해 코드로 바꾸려 하지 말고, 재시도하지 말고, 아무것도 쓰이지 않았다고 가정하지 마십시오. 원시 stderr를 그대로 남기고, 대상과 journal/stage/backup 경로를 보존한 뒤 사용자에게 보고합니다.

두 script는 동결되어 있습니다. 파싱을 `try` 안으로 옮기거나 envelope를 넓히려고 수정하지 마십시오. 이 틈에 대한 올바른 대응은 위의 종료 정지 규칙입니다.

## 판단 절차

1. stderr를 읽습니다. 파싱 가능한 `{"error":"E_*"}` 한 줄이 정확히 아니면 → 종료 정지, 모두 보존, 원시 출력 보고.
2. 코드를 추출합니다. 그룹 1이고 **또한** 쓰기 이전에 발생했다면 → 해당 입력만 고쳐 한 번 재실행합니다.
3. 그룹 2이거나, 이미 쓰인 트리에 대한 validator에서 그룹 1 코드가 나왔다면 → 종료 정지. 대상, marker, journal, stage, backup, lock을 보존하고 코드와 경로를 보고합니다.
4. `overwrite: true`를 스스로 켜지 말고, lock을 폴링하지 말고, 복구 증거를 지우지 말고, 검사를 만족시키려고 marker를 편집하지 마십시오.
