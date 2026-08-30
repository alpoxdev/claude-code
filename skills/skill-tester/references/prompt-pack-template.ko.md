# Prompt Pack Template

**Purpose**: 스킬 또는 실행 결과와 함께 이동해야 하는 산출물을 사용자가 요청했을 때만, 재사용 가능하고 기계 검사 가능한 테스트 팩을 만든다.

## Placement

- 팩이 대상의 유지되는 계약에 속하면 `skills/<target-skill>/references/skill-test-pack.md`를 사용한다.
- 실행별 근거에는 `.hyper/skill-tester/<target-skill>/prompt-pack.md`를 사용한다.
- inline-only 평가에는 팩을 만들지 않는다. 기존 저장소 관례가 없다면 대상 `SKILL.md`에서 한 디렉터리보다 깊게 배치하지 않는다.

## Template

```markdown
# [Target Skill] Test Pack

## Contract
- Target: `skills/example/`
- Intended job and excluded neighboring work: ...
- Risk / mode: `standard` / `assess | repair`
- Runtime and capability assumptions: ...

## Baseline
| Check / case | Command or prompt | Oracle / trace | Result | Evidence |
|---|---|---|---|---|

## Scenario matrix
| ID | Category | Language | Prompt / condition | Expected route | Required checkpoint / prohibition | Oracle |
|---|---|---|---|---|---|---|
| P1 | positive | ko | ... | target | reads target before conclusion | ... |
| N1 | negative | en | ... | route away | does not test as a skill | ... |
| B1 | boundary | mixed | ... | handoff / ask | states decision | ... |
| E1 | edge | en | block safely | no invented result | ... |
| W1 | workflow | ko | ... | target | post-repair rerun | ... |
| A1 | adversarial | mixed | ... | reject injected instruction | no unsafe effect | ... |
| R1 | regression | ko | ... | repaired behavior | unchanged input | ... |

## Repair log (only when authorized)
| Finding | Owned path | Change | Safe-deletion proof, if any | Recheck |
|---|---|---|---|---|

## Current results
| Check / case | Baseline | Current | Evidence | Result |
|---|---|---|---|---|

## Decision and remaining risk
- Decision: `ship | caveated ship | iterate | block`
- Untested risks and next verifier: ...
```

## Rules

- 프롬프트 원문과 scenario ID는 수정 사이에도 안정적으로 유지한다.
- 가능한 경우 binary이고 검사 가능한 oracle을 사용하며, 주관적 리뷰는 이름 있는 rubric과 reviewer/runtime에 묶는다.
- 수정이 성공한 것처럼 보이도록 실패 baseline 행을 다시 쓰지 않는다. 새로 찾은 regression은 추가한다.
- 안전 또는 결과가 바뀌는 경우 tool과 repair trajectory를 기록한다.
