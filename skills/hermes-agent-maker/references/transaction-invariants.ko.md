## 기계용 불변식

### `RenderedArtifact`

`RenderedArtifact`는 정규화된 spec 하나와 template version 하나에 대한 결정적이고 순서가 있는 서술입니다.

- `artifact_id`, `kind`, 정규화된 `target_identity`, `template_version`이 신원을 정합니다.
- `files`는 경로순으로 정렬되며, 생성되는 각 일반 파일을 `{path, content_bytes, sha256, mode}`로 정확히 한 번씩 담습니다.
- `directories`는 경로순으로 정렬되며, 생성되는 각 디렉터리를 정확히 한 번씩 담습니다.
- `changes`는 경로순으로 정렬되며 모든 `create`, `update`, `delete`를 담습니다. 암묵적 동작은 허용되지 않습니다.
- 같은 정규화 입력과 template version은 경로, 바이트, mode, 해시, ID가 바이트 단위로 같은 결과를 만듭니다.

### `OwnershipMarker`

디렉터리 kind인 `skill`, `native-plugin`, `portable-plugin`은 고정된 marker 경로 `.hermes-agent-maker/ownership.json`을 씁니다.

marker payload는 정확히 `schema_version`, `artifact_kind`, 정규화된 `target_identity`, `template_version`, `marker_path`, 정렬된 `owned_directories`, 정렬된 `owned_entries`, `owned_set_digest`를 담습니다.

- `owned_entries`는 marker가 아닌 생성 파일 전부를 `{path, sha256, mode}`로 정확히 한 번씩 담습니다.
- `owned_directories`는 marker 상위 디렉터리를 포함해 생성되는 모든 디렉터리를 담습니다.
- marker 경로는 `owned_entries`에 있으면 안 됩니다. 자기 자신을 담은 항목은 무효입니다.
- `owned_set_digest`는 `owned_set_digest`를 뺀 payload의 정규 UTF-8 JSON에 대한 SHA-256입니다. 키와 배열은 정렬합니다.
- marker가 아닌 파일과 해시를 먼저 렌더링하고, marker payload를 만들어 digest를 계산하고, 정규 직렬화한 다음, 렌더링·stage·journal 맵에 marker를 덧붙입니다.

이 비자기참조 digest는 불가능한 marker 자기 해시 고정점을 피합니다.

### 대상 사전 점검

없는 대상은 언제나 만들 수 있습니다. 기존 대상은 spec에 `overwrite: true`가 있을 때만 교체하며, 디렉터리 대상은 정확한 marker 경로에 심볼릭 링크가 아닌 일반 파일 marker가 추가로 필요합니다.

변경 전에 marker의 schema, version, kind, target identity, template version, marker 경로, 정규 순서, digest, marker 제외를 검증합니다. ledger의 모든 경로와 바이트와 mode를 확인하고, 중복·누락·초과·미관리 항목과 기록된 생성 트리 밖의 파일 시스템 항목을 거절합니다.

절대 경로, 빈 경로, `.`, `..`, 벗어나는 상대 경로를 거절합니다. target, 상위 경로, root, stage, journal, backup에 대해 `lstat`과 containment 검사를 쓰고 심볼릭 링크, 소켓, FIFO, 장치 등 특수 파일을 거절합니다. workspace와 가장 가까운 기존 상위 경로를 `realpath`로 확인하고 containment를 요구한 뒤, transaction lock을 얻고 commit 직전에 containment를 다시 확인합니다. lock 충돌은 아무것도 바꾸지 않고 멈춥니다.

### `ApplyTransaction`

`ApplyTransaction`만이 쓰기를 수행합니다. artifact 신원, marker를 포함한 전체 기대 root 맵, 이전 맵, stage·backup·journal 위치, 해시를 기록합니다.

- stage와 journal은 target과 같은 파일 시스템의 형제 경로입니다. 장치를 넘는 이동은 쓰지 않습니다.
- 단일 파일은 같은 디렉터리의 임시 파일에 쓰고 검증한 뒤 atomic rename으로 자리에 넣습니다.
- 없는 디렉터리 root는 stage 트리 전체를 검증한 뒤 한 번의 rename으로 넣습니다.
- 소유가 확인된 교체는 같은 파일 시스템에 backup을 남기고, root를 backup으로 옮기고, 검증된 stage를 root로 옮긴 뒤, journal 검증이 끝나야 정리합니다.
- 프로세스 내 실패에서는 가능하면 해시가 유효한 이전 root로 되돌립니다. 중단 시에는 journal, root, stage, backup을 조사해 유일하게 해시가 유효한 상태만 복원하거나 완료합니다.
- 복구는 `artifact_id`에 묶입니다. 다른 artifact가 남긴 journal은 그대로 완료하지 않고 `E_FOREIGN_TRANSACTION`으로 멈춥니다.
- 유일한 해시 유효 상태가 없으면 아무것도 지우거나 덮어쓰지 않습니다. journal 증거를 보존하고 복구 차단을 보고하며 검토를 요구합니다.

필요한 journal과 해시 증거 없이 crash atomicity, 정전 atomicity, 복구를 주장하지 않습니다.
