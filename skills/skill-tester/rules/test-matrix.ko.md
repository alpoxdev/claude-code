# Skill Test Matrix

**Purpose**: 대상 주장을 증명할 수 있는 가장 작고 빠른 테스트 집합을 고르고, 실제 위험이 요구할 때만 범위를 넓힌다.

## Risk selection

| Depth | Use when | Minimum gate |
|---|---|---|
| `smoke` | 메타데이터 또는 한 가지 로컬 문구 변경 | 구조 검사와 3–5개 집중 케이스. |
| `targeted` | 하나의 trigger, workflow, support link, 알려진 실패 변경 | smoke + 실패 케이스 + 이웃 boundary + 수정 후 재실행. |
| `standard` | 실질적인 스킬 workflow 또는 resource 변경 | positive, negative, boundary, edge, workflow, regression 8–15개, 정적·한영 검사. |
| `thorough` | tool use, source handling, delegation, deletion, runtime fallback, 넓은 동작 변경 | standard + trace, adversarial safety, capability-degradation, safe-deletion 검사. |

파일 수가 아니라 주장 위험도로 고른다. 자격 증명, 운영, 파괴적, 외부 행동이 있는 대상은 high-stakes다. 명시적 사용자 허가와 적용 가능한 사람 관문 없이 부작용을 고치지 않는다.

## Matrix dimensions

| Dimension | Test | Fast evidence |
|---|---|---|
| Trigger precision | 의도한 프롬프트와 명백히 무관한 프롬프트 | Positive/negative route 표. |
| Boundary routing | 이웃 스킬과 혼합 의도 | Route 또는 handoff 근거. |
| Contract | Intent, scope, authority, evidence, tools, loop, output, verification, stop | Section readback. |
| Resource integrity | 직접 링크, Korean pair, fence, scripts, assets | 로컬 validator 출력. |
| Workflow | 다음 행동, capability fallback, 실패 경로 | Phase simulation과 trace. |
| Repair safety | edit ownership, reference-safe deletion, 바꾸지 않은 재검사 | Baseline/current 비교. |
| Safety | retrieval injection과 결과적 행동 | Adversarial case와 permission trace. |
| Regression | 알려졌거나 가능성 큰 이전 실패 | 바꾸지 않은 regression case. |

## Coverage floor

사용자가 smoke-only를 명시하지 않으면 positive 3개, negative 2개, boundary 2개, edge 2개, regression 1개를 포함한다. `standard`에는 workflow 또는 adversarial 하나를, `thorough`에는 둘 다 추가한다. 지역화 대상에는 파일 쌍 검사만이 아니라 동작상 동등한 한국어 시나리오가 하나 이상 필요하다.

## Fast-path order

1. 대상 경로를 검증하고 `SKILL.md`와 직접 링크를 읽는다.
2. 넓은 corpus 검사 전에 좁은 정적 validator를 실행한다.
3. 요청한 주장과 가장 가까운 실패 모드를 증명하는 케이스만 먼저 실행한다.
4. 공유 계약, 여러 스킬, 선택한 위험도가 요구할 때만 corpus 또는 전체 매트릭스로 확장한다.

## Exit rule

모든 중요한 route, resource, safety 케이스에 근거가 있을 때만 통과한다. 수정은 변경 후 같은 영향 케이스를 다시 실행할 때만 통과한다. 더 깔끔해 보이는 core나 바뀐 테스트 집합은 근거가 아니다.
