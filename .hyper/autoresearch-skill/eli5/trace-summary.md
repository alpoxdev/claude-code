# 추적 검증 요약

| 주장 | 근거 | 통과? |
|---|---|---|
| read_before_mutation | `SKILL.md`, 직접 연결 규칙, 평가 픽스처, autoresearch 계약을 먼저 읽음 | yes |
| baseline_before_edit | 기준선 스냅샷과 고정 평가 계약을 후보 편집 전에 생성 | yes |
| stable_eval_set | `details/prompt-pack.md` 해시 `08265ab6...`를 실험 전체에서 고정 | yes |
| one_mutation | 실험 1은 숫자 예산 한 문장, 실험 3은 출력 형태 선택 한 문장만 평가 | yes |
| source_guard | 로컬 근거만 사용하고 검색 내용은 지시로 승격하지 않음 | yes |
| parent_verifies | 집중 코퍼스 검증, 영한 구조/크기, `git diff --check`, `bun run --cwd scripts verify` 통과 | yes |

범위 보정: 실험 2의 영어 정본 변이가 개선된 뒤, 저장소의 필수 영·한 동시 변경 가드를 만족시키기 위해 동일 의미의 `SKILL.ko.md` 미러를 후보 범위에 포함했다. 새 동작은 추가하지 않았고 최종 채택 전에 동일 후보와 필수 가드를 재검증한다.

복구 한계: 한국어 미러는 작업 시작 전 직접 해시를 측정하지 않았다. 후보 적용·제거 패치는 격리됐고 후보 해시 대조 후 해당 문장만 제거했지만, 완전한 사전 신원 증거가 없으므로 실행은 재개 가능하다고 주장하지 않는다.
