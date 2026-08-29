# 점수 상승 설명

## 요약

- 기준 점수: 4/5 (80.0%)
- 최종/최고 점수: 5/5 (100.0%)
- 변화량: +1점 (+20.0%p)
- 최고 실험: Experiment 3
- 유지된 변이 수: 1/2 (Experiment 1은 metric-error 후 복구)

## 어디서 점수가 올랐나

| 영역 | 이전 | 이후 | 점수 변화 | 근거 |
|---|---|---|---:|---|
| 변경 검증 경로 | contract fixture와 focused corpus validator가 core에 없음 | report/waiver/rendered-handoff 및 bilingual Markdown 변경 시 필요한 runner가 있음 | +1 | Experiment 3 및 contract fixture 6/6 |

## 무엇을 수정했나

| 파일 | 수정 내용 | 유지한 이유 | 검증 |
|---|---|---|---|
| `skills/ai-design-slop-remover/SKILL.md` | contract eval runner와 focused corpus validator의 명시 실행 조건 추가 | E3가 pass로 전환 | detector 16/16, contract 6/6, corpus pass |
| `skills/ai-design-slop-remover/SKILL.ko.md` | 동일 조건을 한국어 mirror에 추가 | bilingual execution contract 유지 | heading parity, corpus pass |

## 남은 실패와 Caveat

- Experiment 1의 manual metric은 결정적 oracle과 불일치해 candidate를 복구하고 reset event로 기록했다. browser 자동화·dependency 설치·global hook은 목표 범위 밖이며 기존 safety boundary를 유지한다.
