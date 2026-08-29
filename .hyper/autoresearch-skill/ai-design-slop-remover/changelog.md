# 변경 로그

## Experiment 0 - baseline

**점수:** 4/5 (80.0%)  
**변화량:** 0점  
**수정:** 원본 v2 core를 수정하지 않았다.  
**어디서 부족했나:** 변경 시 detector fixture runner는 직접 안내하지만 report/waiver/rendered handoff contract runner는 core에서 직접 실행 경로가 없다.  
**Guard:** detector fixture 16/16, contract fixture 6/6, focused corpus validator, whitespace가 모두 통과했다.  
**수정 파일:** 없음  
**남은 실패:** `resource navigation`에서 `run-contract-evals.cjs`가 명시되지 않았다.

## Experiment 1 - metric-error / discard

**점수:** 신뢰 불가  
**수정:** 영문·한국어 `resource_navigation`에 contract fixture runner만 추가했다.  
**실패 원인:** 최초 수동 E3 판정은 focused corpus validator의 직접 실행 조건까지 요구한다는 metric을 완결하지 못했다. 고정된 결정적 oracle로 재실행하면 2/5였으므로 이 점수는 비교 불가다.  
**복구:** candidate postimage SHA-256가 기록값과 일치함을 확인한 뒤, 소유한 두 core 파일만 baseline으로 복구했다.  
**결정:** `metric-error`; 후보를 유지하지 않고 reset event를 기록했다.

## Experiment 2 - reset

**점수:** 4/5 (80.0%)  
**수정:** target skill을 수정하지 않았다.  
**이유:** prompt/eval 의도는 유지하되, 결정적 local oracle `details/score-core-contract.cjs`를 도입해 manual scoring ambiguity를 제거했다.  
**결정:** reset 후 baseline을 다시 기록했고 이후 score만 비교한다.

## Experiment 3 - keep

**점수:** 5/5 (100.0%)  
**변화량:** +1점 (+20.0%p)  
**수정:** 영문·한국어 `resource_navigation`에 contract fixture runner와 focused corpus validator의 변경 시 실행 조건을 추가했다.  
**어디서 올랐나:** E3 변경 검증 경로가 fail에서 pass로 바뀌었다. detector fixture, contract fixture, focused corpus validator의 직접 실행 조건이 모두 core에 있다.  
**왜 유지했나:** 고정 5개 binary eval이 5/5가 되었고 detector 16/16, contract 6/6, focused corpus, whitespace Guard가 모두 통과했다.  
**수정 파일:** `skills/ai-design-slop-remover/SKILL.md`, `skills/ai-design-slop-remover/SKILL.ko.md`  
**남은 실패:** 없음. metric이 포화되어 추가 mutation을 실행하지 않았다.
