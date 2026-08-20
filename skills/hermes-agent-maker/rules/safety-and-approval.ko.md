# 안전 및 승인 계약

모든 preview와 apply 요청에는 이 규칙을 사용합니다. 생성기는 strict normalized JSON과 로컬 정적 assets만 받고 자연어를 해석하지 않습니다.

## 쉬운 안전 설명

- **Preview는 읽기 전용 계획입니다.** 만들기, 수정, 삭제할 모든 파일과 이전/새 해시를 보여 줍니다. 파일, marker, stage, journal, lock, recovery record를 전혀 쓰지 않습니다.
- **승인은 정확해야 합니다.** 사용자에게 보인 preview ID와 전체 순서 change-set을 승인받습니다. 파일, 해시, target, template version, 삭제 중 하나라도 달라지면 새 preview와 승인이 필요합니다.
- **기존 폴더에는 소유 증명이 필요합니다.** 완전히 소유한 생성 root만 바꿀 수 있습니다. 알 수 없거나 사용자가 관리하는 항목, 링크, 특수 파일은 건드리지 않고 중지합니다.
- **실패 복구는 마법이 아닙니다.** 단일 파일 교체는 같은 디렉터리 안의 atomic rename을 사용합니다. 디렉터리 transaction은 프로세스 안 실패에는 atomic이고 중단 뒤 journal로 복구할 수 있지만 **crash-atomic이 아닙니다**. 상태가 불명확하면 추측하거나 삭제하지 않고 증거를 보존하고 차단합니다.

사용자 질문과 확인 문구는 쉬운 한국어여야 합니다. credentials를 요구하거나 드러내지 않습니다.

## 금지 경계

Discord artifact, credentials, tokens, private keys, `.env` 파일, install/enable/remove action, Hermes login/profile/trust state, gateway, bot, adapter, external transmission, network fetching, dynamic schema retrieval을 만들거나 바꾸는 요청은 render, stage, write 없이 거절합니다. `user-draft`와 `memory-draft`는 제안일 뿐 USER나 MEMORY를 활성화하지 않습니다.

## 기계용 불변 조건

### `RenderedArtifact`

`RenderedArtifact`는 하나의 normalized spec과 template version을 결정적으로 설명합니다.

- `artifact_id`, `preview_id`, `kind`, normalized `target_identity`, `template_version`이 artifact를 식별합니다.
- `files`는 path 순서이며 생성 regular file을 `{path, content_bytes, sha256, mode}`로 정확히 한 번씩 담습니다.
- `directories`는 path 순서이며 생성 directory를 정확히 한 번씩 담습니다.
- `change_set`은 path 순서이며 모든 `create`, `update`, `delete`를 담습니다. 묵시적 작업은 허용하지 않습니다.
- 각 change는 해당 path, 필요한 mode, `old_sha256` 또는 명시적 `absent`, `new_sha256` 또는 명시적 deletion을 담습니다. preimage map은 모든 delete와 ownership marker를 포함한 현재 영향 경로 전체를 덮습니다.
- 같은 normalized input과 template version은 byte-identical ordered paths, bytes, modes, hashes, IDs, change-set을 만듭니다.

`preview`는 preimage를 만들기 위해 현재 상태를 읽고 검증할 수 있지만 filesystem mutation은 없습니다.

### `ApprovalEnvelope`

`ApprovalEnvelope`는 명시적 사용자 확인 하나를 `RenderedArtifact` 하나에 묶습니다.

- `preview_id`, `artifact_id`, `kind`, `target_identity`, `template_version`, 전체 순서 `change_set`, 전체 preimage map을 포함합니다.
- 해당되는 경우 marker bytes와 marker SHA-256을 포함하는 전체 rendered file map을 담습니다.
- 확인은 이 값과 정확히 같을 때만 유효합니다. 일부 승인, 이름만 승인, wildcard 승인, 요약 승인 모두 무효입니다.
- stage나 write 전에 apply는 모든 영향 경로를 다시 읽어 envelope preimage와 완전히 같아야 합니다. 예상 absence는 absence로 남고, 예상 regular-file bytes와 mode는 같으며, 예상 directories는 유효해야 합니다.
- 변경, 등장, 사라짐, 순서 변경, 누락, 추가, malformed, 불일치가 있으면 stale approval입니다. write 없이 거절하고 새 preview를 요구합니다.

### `OwnershipMarker`

디렉터리 kind `skill`, `native-plugin`, `portable-plugin`은 고정 marker path `.hermes-agent-maker/ownership.json`을 사용합니다.

Canonical marker payload는 정확히 `schema_version`, `artifact_kind`, normalized/resolved `target_identity`, `template_version`, `marker_path`, 정렬된 `owned_directories`, 정렬된 `owned_entries`, `owned_set_digest`를 담습니다.

- `owned_entries`는 marker를 제외한 생성 regular file 전부를 `{path, sha256, mode}`로 정확히 한 번씩 나열합니다.
- `owned_directories`는 marker parent를 포함한 생성 directory 전부를 나열합니다.
- marker path는 `owned_entries`에 있으면 안 됩니다. self-entry는 무효입니다.
- `owned_set_digest`는 `owned_set_digest`를 뺀 payload의 canonical UTF-8 JSON SHA-256입니다. keys와 arrays는 정렬합니다.
- 먼저 non-marker files와 hashes를 render하고, marker payload를 build/digest하고, marker를 canonical serialize하고, marker bytes를 hash한 다음, marker는 전체 rendered, approval, staged, journal, recovery maps에만 추가합니다.

이 non-self-referential digest는 불가능한 marker self-hash fixed point를 피합니다. marker는 일반 approval-bound file이지만 semantic 및 canonical 검증도 별도로 받습니다.

### Owned-root preflight

없는 directory root는 만들 수 있습니다. 기존 root는 정확한 marker path의 regular, non-symlink marker가 완전 소유를 증명할 때만 바꿀 수 있습니다.

Mutation 전 marker schema, version, kind, target identity, template version, marker path, canonical ordering, digest, marker exclusion을 검증합니다. ledger의 모든 non-marker path, bytes, mode를 검증하고 duplicate, missing, extra, unmanaged entry, 허용된 generated tree 밖 filesystem entry는 거절합니다. delete는 승인된 owned path만 허용합니다.

Absolute, empty, `.`, `..`, escape relative path를 거절합니다. target, ancestors, root, stage, journal, backup, 모든 entry에 `lstat`와 containment checks를 쓰고 symlink, socket, FIFO, device, 기타 special file을 거절합니다. `realpath`로 workspace와 nearest existing ancestor를 resolve하여 containment를 요구하고 transaction lock을 얻은 뒤 commit 직전에 containment와 preimage를 다시 검사합니다. Lock conflict는 mutation 없이 거절합니다.

### `ApplyTransaction`

`ApplyTransaction`만 writer입니다. artifact/preview identity, marker를 포함한 complete expected root map, preimages, ordered change-set, stage/backup/journal locations, hashes, phase를 기록합니다.

- Stage와 journal은 target의 같은 filesystem sibling입니다. cross-device move는 사용하지 않습니다.
- Single file은 같은 directory temporary file을 write/verify한 뒤 atomic rename으로 교체합니다.
- 없는 directory root는 complete staged tree를 verify한 뒤 한 번 rename합니다.
- Owned replacement는 같은 filesystem backup을 보존하고 root를 backup으로 옮긴 뒤 verified stage를 root로 옮기며 journaled verification 뒤에만 cleanup합니다.
- Stage는 commit 전에 marker semantics, non-marker ledger, marker-inclusive complete file map을 검증합니다.
- 프로세스 안 실패 시 가능하면 hash-valid prior root로 rollback합니다. 중단 시 recovery는 journal, root, stage, backup을 검사하고 유일하게 hash-valid한 state만 restore 또는 complete합니다.
- 유일한 hash-valid state가 없으면 아무것도 delete나 overwrite하지 않습니다. journal/evidence를 보존하고 blocked recovery를 보고하며 review를 요구합니다.

Crash atomicity, power-loss atomicity, 필수 journal과 hash-valid evidence 없는 recovery를 주장하지 않습니다.

## Apply 결정 표

| 조건 | 결과 |
| --- | --- |
| Exact approval envelope 없음 | 거절; write 없음 |
| Preview-only 요청 | complete change-set 보고; write 없음 |
| Preimage가 approval과 다름 | stale approval 거절; write 없음 |
| Existing root에 valid ownership marker 없음 | 거절; write 없음 |
| Symlink, special file, containment escape, lock conflict | 거절; write 없음 |
| Unmanaged path 또는 unapproved deletion | 거절; write 없음 |
| Valid envelope 및 owned/absent target | stage, verify, journal 후 commit |
| Recovery state가 ambiguous | evidence 보존 후 block |
