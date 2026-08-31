# 검증

`git-maker` 변경 완료를 선언하거나 fast-path run을 성공으로 보고하기 전에 이 check를 실행한다.

## 스킬 품질 체크

- Description은 이 skill이 commit과 push를 함께 수행한다고 말하며 `git-commit` 및 `git-push`와 구분한다.
- Positive trigger example이 최소 3개 있다.
- Negative trigger example이 최소 2개 있다.
- Boundary example이 최소 1개 있다.
- Core `SKILL.md`는 lean하게 유지되고 rules/scripts를 직접 가리키며 중복하지 않는다.
- Script addition은 deterministic speed 또는 safety improvement로 정당화된다.
- Agent parallelism guidance는 `rules/agent-parallelism.md`에 격리되어 있고 core에 중복되지 않는다.
- Worktree guidance가 명확하다. linked worktree는 valid context이고 checkout root는 별도로 유지되며 `.git`이 directory라고 가정하지 않는다.
- 인자 없음과 `current`/`CURRENT`는 현재 세션 변경을, `all`/`ALL`은 모든 uncommitted 변경을 선택한다.
- 모든 scope mode에서 `&&` propagation syntax가 정의되고 mutation 전에 모든 target을 validate한다.
- Conflict handling은 intent-preserving 자율 해결이 기본이며 중요한 결정 경계에서만 escalation한다.

## 런타임 체크

- Skill root에서는 `node --check scripts/git-maker-fast.mjs`, repository root에서는 `node --check skills/git-maker/scripts/git-maker-fast.mjs`가 통과한다.
- `scripts/git-maker-fast.mjs inspect . --jobs 2`가 `repos|begin`, `repo-status|begin`, file inventory block을 출력한다.
- 가능하면 local linked-worktree fixture가 `worktree|linked`와 linked checkout root의 `repo|...` path를 보여준다.
- 사용자가 push를 요청하지 않는 한 push helper는 실제 remote에 대해 테스트하지 않는다. behavior validation에는 local fixture를 사용한다.
- Commit phase는 여전히 targeted staging과 commit당 하나의 logical change를 사용한다.
- Commit subject는 `~하라`, `~해라`, `~라`로 끝나는 한국어 command가 아니라 neutral Conventional Commit summary처럼 읽힌다.
- Push phase는 모든 commit group이 성공한 뒤에만 automatic이다.
- Force push는 `main`과 `master`에서 계속 차단된다.
- Subagent를 사용했다면 그 작업은 read-only였고 최종 Git mutation은 main integrator에 남아 있었다.
- Local multi-branch fixture로 이번 run에서 만든 commit만 각 target에 왼쪽부터 도달하는지 검증한다.
- Local conflict fixture로 mechanical conflict 하나는 질문 없이 해결·검증하고, 의도적으로 ambiguous한 behavior conflict는 이후 target 전에 한 가지 집중된 질문을 유발하는지 검증한다.

## Readback 체크

다음 관점으로 읽는다.

1. trigger model: 이 skill은 commit+push에서 활성화되고 commit-only 또는 push-only에서는 활성화되지 않는다.
2. rushed operator: 가장 빠르고 안전한 명령이 명확하다.
3. commit reviewer: 생성된 한국어 subject가 instruction이 아니라 간결한 change/result summary처럼 보인다.
4. maintainer: future speed rules는 `rules/speed-and-automation.md`에, durable commit policy는 `rules/commit-and-push-policy.md`에, subagent lane rules는 `rules/agent-parallelism.md`에 속한다.
5. branch operator: `/git-maker && dev`, `/git-maker CURRENT && dev && deploy/staging`, `/git-maker all && dev`의 scope와 propagation behavior가 모호하지 않다.
