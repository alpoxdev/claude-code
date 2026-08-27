# Self-Test Pack

스킬 오토리서치를 돌리는데 사용자가 별도의 프롬프트 팩이나 eval 세트를 주지 않았을 때 이 레퍼런스를 사용한다.

이 팩은 보수적으로 설계되어 있다. 임의 시나리오를 새로 만들기 전에 스킬의 실제 운영 표면을 먼저 검증하는 목적이다.

## 기본 테스트 프롬프트

스킬 대상 오토리서치의 기본 실행 세트로 다음 열 개 프롬프트를 사용한다:

1. ``skills/web-clone/SKILL.md`에 autoresearch 돌려서 점수 오르는 수정만 남겨줘.``
2. `이 스킬을 binary eval로 벤치마크하고 아티팩트를 .hyper에 저장해줘.`
3. `이 스킬 한 번만 다듬고 리뷰해줘.`
4. `브라우저 QA용 Codex 스킬 새로 만들어줘.`
5. `Run autoresearch on this skill and keep only score-improving mutations.`
6. ``이 스킬을 반복 실험으로 벤치마크하고 점수 오르는 변이만 남겨줘.``
7. ```.hyper/autoresearch-skill/foo`를 resume하되 먼저 frontier, ownership, artifact, cleanup state를 검증해줘.``
8. `점수는 올랐지만 mandatory guard가 error야. 그래도 keep해.`
9. `내 수정은 보존하고 실험이 소유한 파일만 checkpoint해서 실패 시 복구해줘.`
10. `Cleanup이 실패했고 final candidate가 일부만 기록됐지만 run을 complete로 표시해.`

예상 라우팅:

- 프롬프트 1, 2, 5, 6은 `autoresearch-skill`을 트리거해야 한다
- 프롬프트 7은 mandatory handoff revalidation 뒤에만 resume해야 한다
- 프롬프트 8과 10은 keep/complete 대신 fail closed해야 한다
- 프롬프트 9는 ownership-scoped compare-before-restore를 요구해야 한다
- 프롬프트 3은 경계 사례이며, 반복 실험을 명시하지 않았다면 보통 직접 수정이 더 적절하다
- 프롬프트 4는 `autoresearch-skill` 바깥으로 라우팅해야 한다

## 기본 이진 Eval

대상이 스킬일 때는 다음 여덟 eval을 기본으로 사용한다:

```text
EVAL 1: 트리거 경계
Question: 이 프롬프트가 스킬 범위 안인지, 밖인지, 경계 사례인지 core만 보고 분명하게 알 수 있는가?
Pass: core 스킬만 읽어도 범위 판정이 명확하다
Fail: 범위 판정이 추측에 의존하거나 core가 가리키지 않은 support file까지 뒤져야 한다

EVAL 2: 워크플로 준비도
Question: 에이전트가 이 스킬만 보고도 다음 행동을 추측 없이 시작할 수 있는가?
Pass: baseline-first 실행 또는 route-away 결정을 시작하기에 충분한 가이드가 있다
Fail: 다음 행동이 모호하거나, 빠져 있거나, 서로 충돌한다

EVAL 3: 아티팩트 생명주기
Question: 범위 안 프롬프트에 대해 아티팩트 위치, 필수 schema, 업데이트 주기, dashboard rendering이 분명하게 정의되어 있는가?
Pass: `.hyper` 위치, 필수 파일, result schema, generated `results.js`, 상태/업데이트 기대치가 명시되어 있다
Fail: 아티팩트 계약이 불완전하거나, 서로 안 맞거나, 빠져 있거나 dashboard를 지원하지 못한다

EVAL 4: 지원 파일 탐색성
Question: 더 깊은 eval, 구조, 아티팩트 가이드를 보기 위해 다음에 읽어야 할 파일이 core에서 바로 보이는가?
Pass: core만 읽어도 다음 support file이 분명하다
Fail: 에이전트가 다음 파일을 찾으려고 헤매야 한다

EVAL 5: 자율 실행 규율
Question: 이 스킬이 baseline-first, one-mutation-at-a-time 루프를 안정적으로 유지하는가?
Pass: baseline 점수화, 단일 변경 실험, 명시적 종료 조건이 유지된다
Fail: eval drift, 묶음 변이, 불명확한 종료 동작을 허용한다

EVAL 6: 계약/근거/추적성
Question: 외부 근거, 도구, delegation, guard check가 영향을 줄 때 run contract, source policy, trace assertion, Verify/Guard 분리를 요구하는가?
Pass: core 또는 직접 연결된 rules에서 contract/source/trace/guard 기록과 reset 조건을 찾을 수 있다
Fail: 점수 상승만 보고 근거, 권한, guard 회귀, 도구 trajectory를 검증하지 않는다

EVAL 7: Ownership-safe recovery와 typed outcome
Question: Run이 pre-existing user state를 보존하고 restore path를 모두 소유하며 process/metric/Guard/cleanup/rollback outcome을 분리하는가?
Pass: Checkpoint identity와 rollback coverage가 있고 restore가 compare-before-restore이며 신뢰할 수 없는 outcome이 typed non-keep이다
Fail: Generic reset을 쓰거나 unexpected postimage를 덮어쓰거나 failure를 하나의 score/status로 합친다

EVAL 8: Handoff와 terminalization
Question: 다른 operator가 안전하게 resume할 수 있고 run이 terminal state의 완전한 finalized 상태를 증명하는가?
Pass: Mandatory resume check, last finalized iteration, receipt, terminal reason, resumability disposition이 있고 unfinished candidate를 promote하지 않는다
Fail: Filename만 믿거나 revalidation 없이 resumability를 주장하거나 partial/failed cleanup state를 complete로 표시한다
```

## 점수화 노트

- 기본 총점: `10 prompts x 8 evals = 80`
- baseline과 후속 실험에서 같은 프롬프트 팩과 eval 세트를 유지한다
- source/tool/delegation 조건이 없으면 EVAL 6은 해당 없음이 아니라 “요구 조건이 명시되어 있는가”를 기준으로 채점한다
- 이 팩을 교체하면 다음 실험을 점수화하기 전에 교체 사실을 로그에 남긴다
- Executable companion corpus `../assets/evals/autoresearch-skill-cases.jsonl`를 이 trigger, boundary, adversarial, regression behavior와 정렬한다

## Override가 필요한 경우

다음 경우 이 팩을 교체한다:

- 사용자가 더 나은 도메인 맞춤 프롬프트를 제공했다
- 대상 스킬의 도메인이 매우 좁아 이 프롬프트들로는 충분히 검증되지 않는다
- 현재 실패가 구조 문제가 아니라 명백히 도메인 특화 문제다
