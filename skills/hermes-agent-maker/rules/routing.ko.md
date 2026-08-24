# Hermes Artifact 라우팅

Hermes Agent Maker 요청마다 정규화 spec을 만들기 전에 이 규칙을 읽습니다.

## `classifyRequest`

요청 전체가 아니라 요청된 산출물 하나하나를 분류합니다.

| 사용자 목표 | 경로 | 결과 |
|---|---|---|
| 재사용 가능한 agent skill 패키지 | `skill` | marker가 있는 디렉터리에 짝을 이루는 `SKILL.md`와 `SKILL.ko.md`, `references/` 상세 문서, 출력 template. |
| Hermes 전용 plugin | `native-plugin` | marker가 있는 디렉터리에 `plugin.yaml`, `__init__.py`, `schemas.py`, `tools.py`. 결정적인 `register(ctx)`와 입력을 검증하는 handler를 담고 비밀값은 넣지 않습니다. |
| 여러 런타임에서 쓰는 agent plugin | `portable-plugin` | marker가 있는 디렉터리에 고정된 v1.0.0 portable 파일. Hermes subset도 통과해야 합니다. |
| 결정적 artifact 생성기 | `skill` 또는 `native-plugin` | 만들어질 artifact 기준으로 정합니다. 지침이면 `skill`, 실행 가능한 등록이면 `native-plugin`입니다. |
| workspace 정체성과 말투 | `soul` | workspace 안의 `SOUL.md`만. |
| 저장소 agent 지침 | `agents` | workspace 안의 `AGENTS.md`만. |
| 제안하는 USER 정보 | `user-draft` | workspace 안의 `USER.md.draft.md`만. 활성 USER memory는 절대 아닙니다. |
| 제안하는 지속 MEMORY 정보 | `memory-draft` | workspace 안의 `MEMORY.md.draft.md`만. 활성 MEMORY memory는 절대 아닙니다. |

다음 요청은 라우팅하지 않습니다: Hermes 설치·업데이트·login·profile/trust 변경, plugin 설치/활성화/제거, gateway, Discord, bot, adapter, 네트워크 서비스, credential·token·개인 키·`.env` 처리, schema 가져오기, 외부 전송. 쉬운 한국어로 이렇게 말합니다: “이 작업은 Hermes artifact 생성 범위가 아닙니다. 설치·활성화·연결·비밀값 처리는 여기서 하지 않습니다.” 제외된 작업을 우회하는 artifact를 만들지 않습니다.

Discord는 맥락으로 언급될 수 있지만, 출력·설정·코드·template·경로·검증 대상이 되지는 않습니다.

## `splitCompositeRequest`

1. 사용자가 말한 순서대로 요청된 artifact를 뽑아냅니다.
2. 각 artifact를 `classifyRequest`로 분류합니다.
3. 제외 대상은 다른 경로로 바꾸지 않고 거절합니다.
4. 유효한 경로들은 하나의 순서 있는 복합 요청으로 유지합니다. 각 경로는 자기 정규화 spec과 자기 생성기 실행을 가지며, 말한 순서대로 실행합니다.
5. 빠진 값은 먼저 맥락에서 해결합니다. 맥락으로 정말 정할 수 없는 갈림길만 묻고, 이후 나머지 경로는 다시 묻지 않고 진행합니다.

예: “스킬과 portable plugin을 만들고 Discord에 연결해 줘”는 `skill`, `portable-plugin`, 그리고 제외되는 Discord 부분으로 나뉩니다. 두 artifact는 생성하고, Discord 부분은 범위 밖이라고 분명히 말합니다.

## `resolveSpecValues`

`NormalizedArtifactSpec`에는 `kind`, `mode`, `summary`, `target`, `template_version`이 필요하고, 디렉터리 kind 세 가지에는 `name`도 필요합니다. 사용자를 인터뷰하지 말고 값을 도출합니다.

| 값 | 도출 방법 |
|---|---|
| artifact kind | 요청 표현에서 가져옵니다. 형식을 말하지 않은 plugin은 아래 규칙을 따릅니다. |
| mode | CLI flag가 아닌 manifest field입니다. 기본값은 `"apply"`로 하고, preview rule에서만 `"preview"`를 씁니다. |
| plugin 형식 | Python tool, hook, command, Hermes 등록이 필요하면 `native-plugin`을 고릅니다. 여러 런타임 재사용이나 지침 전용 패키징이 중심이면 `portable-plugin`을 고릅니다. 선택과 그 결과를 한 문장으로 말하고, 두 해석이 똑같이 그럴듯할 때만 묻습니다. |
| target | `soul`, `agents`, `user-draft`, `memory-draft`는 고정입니다. 디렉터리 kind는 패키지 이름에서 workspace 상대 경로를 도출하며, 사용자가 위치를 말하지 않으면 workspace 루트의 `<name>`을 기본값으로 씁니다. |
| name | 사용자의 표현에서 도출한 소문자 kebab-case. |
| summary | artifact의 목적을 요청에서 뽑아 한 문장으로 씁니다. 설치·credential·gateway·Discord·네트워크 용어가 들어가면 schema와 생성기가 모두 거절합니다. |
| overwrite | 이 생성기가 소유한 기존 artifact를 교체해 달라고 했을 때만 `overwrite: true`를 씁니다. 낯선 경로의 `E_TARGET_EXISTS`를 우회하려고 쓰지 않습니다. |

사용자가 기존 `USER.md`나 `MEMORY.md`를 적용해 달라고 하면 이렇게 설명합니다: “USER와 MEMORY는 안전을 위해 draft만 만들 수 있습니다. 제안 문서로 만들겠습니다.” 그런 다음 해당 draft 경로로 라우팅해 생성합니다.

credential을 요구하지 않고, 결과가 크게 달라지는데도 plugin 형식을 말없이 추측하지 않으며, 자연어를 생성기에 그대로 넘기지 않습니다.

## 경로 완료 경계

라우팅이 곧 생성 권한입니다. 필요한 값이 모두 정해지면 엄격한 JSON으로 정규화하고 생성기를 `apply` 모드로 실행합니다. 라우팅과 쓰기 사이에 승인 단계는 없습니다. 기존 artifact를 덮어쓰거나 낯선 대상을 건드릴 때만 `preview`를 먼저 쓰고 change-set을 보고합니다. 기존 대상은 [`write-safety.ko.md`](write-safety.ko.md)에 정의된 대로 spec에 `overwrite: true`가 있고 ownership marker가 검증될 때만 바뀝니다.
