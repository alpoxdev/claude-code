# 커밋 및 푸시 정책

빠른 inspection pass 이후 `git-maker`가 활성화되어 있고 durable commit/push contract가 필요할 때 이 규칙을 사용한다.

## 인자 모드

| 입력 | 동작 |
|------|------|
| 인자 없음 | `current`와 동일하다. 현재 세션에 귀속되는 변경만 선택하고 Git 상태와 대조해 논리적 커밋으로 그룹화한 뒤 push한다. 남아 있다는 이유로 무관한 변경을 fallback으로 포함하지 않는다. |
| `current` 또는 `CURRENT` | 명시적 current-session mode다. 현재 세션의 edit/tool 기록과 diff evidence를 함께 사용해 이 세션이 만든 file 또는 hunk만 선택한다. 귀속이 애매하면 사용자나 다른 agent 변경을 흡수하지 말고 제외 후 보고한다. |
| `ALL` 또는 `all` | 모든 uncommitted 파일을 포함하고 논리적 커밋으로 그룹화하며 빠뜨린 파일을 남기지 않는다. |
| `--force` | commit 인자에서 `--force`를 제거하고 push 단계에만 전달한다. push는 반드시 `--force-with-lease`를 사용하고 `main`/`master`에서는 여전히 차단해야 한다. |
| `&& <branch>` | Commit 인자를 끝내고 propagation target 하나를 추가한다. 여러 target은 source branch commit/push 뒤 왼쪽부터 실행한다. Scope keyword는 대소문자를 구분하지 않는다. |
| 다른 인자 | repo discovery, file selection, staging, message generation을 위한 filter로 취급한다. 실제 Git 상태와 일치하지 않으면 중단한다. |

## 현재 세션 변경 귀속

- 현재 세션 tool로 작성한 정확한 file/hunk를 우선하고 live diff로 검증한다.
- 이 세션이 건드린 file 전체를 소유한 것으로 보지 않는다. 기존 또는 동시 변경이 같은 file에 있으면 귀속 가능한 hunk만 split-stage한다.
- Unstaged, 최근 변경, 유일하게 남은 dirty change라는 이유만으로 소유권을 추론하지 않는다.
- 안전하게 hunk를 분리할 수 없으면 모호한 file을 uncommitted로 남기고 보고한다. 모든 uncommitted 변경을 포함하는 명시적 opt-in은 `ALL`이다.

## 커밋 규칙

| 범주 | 규칙 |
|------|------|
| 먼저 검사 | staging 또는 commit 전에 status/preflight 명령을 실행한다. |
| Diff source | staged 변경사항이 있으면 staged 파일을 기본 후보로 보고 staged diff를 검사한다. staged가 없으면 unstaged/untracked 변경사항을 검사한다. |
| Repository boundary | 여러 저장소는 독립적으로 커밋해야 한다. non-repository parent에서 nested repo를 하나의 repo처럼 stage하거나 commit하지 않는다. linked Git worktree에서는 `git rev-parse --show-toplevel`의 checkout root를 boundary로 사용하고 shared `git-common-dir`로 collapse하지 않는다. |
| Logical scope | 각 commit은 정확히 하나의 논리적 변경을 포함한다. 여러 그룹은 순차적으로 commit한다. |
| Staging discipline | 선택한 그룹에 필요한 파일만 stage한다. `ALL` 모드가 모든 uncommitted 파일을 의도적으로 포함하고 grouping이 여전히 논리 단위별로 일어나는 경우가 아니면 blanket staging을 사용하지 않는다. |
| Type selection | 실제 dominant change에서 Conventional Commit type을 선택한다. |
| Scope selection | 하나의 module/package/feature가 변경을 명확히 소유할 때만 scope를 사용한다. |
| Language | Commit subject와 body는 한국어이며 Conventional Commit type/scope는 영어로 유지한다. |
| Subject line | command/imperative ending이 아닌 중립적인 Conventional Commit result/summary wording을 사용한다. colon 뒤는 lowercase이고 72자 미만이어야 한다. |
| Body/footer | why/risk/follow-up, breaking change, 검증된 issue reference, 또는 명시적으로 요청된 metadata가 필요할 때만 추가한다. |
| Safety | secret, generated credential, unrelated user change를 절대 커밋하지 않는다. 명시 요청 없이는 `--no-verify`, rebase, reset, amend, destructive history operation을 사용하지 않는다. |
| Hook failures | 오류를 검사한다. 현재 변경이 원인이고 fix가 안전할 때만 수정 후 재시도한다. 그렇지 않으면 중단하고 blocker를 보고한다. |

## 커밋 메시지 톤

한국어 subject는 독자에게 지시하는 문장이 아니라 commit-message summary로 작성한다.

| 사용 | 피함 | 이유 |
|------|------|------|
| `build(deps): 안정 버전 도구 체인으로 빌드 경로 정렬` | `build(deps): 안정 버전 도구 체인으로 빌드 경로를 맞춰라` | `맞춰라`는 명령처럼 들린다. |
| `build(cloudflare): Workers 배포 경로 안정화` | `build(cloudflare): Workers 배포 경로를 안정화하라` | `~하라`는 명령형 어미다. |
| `refactor(nextjs): 아키텍처 경계 강화로 배포 안정성 확보` | `refactor(nextjs): 아키텍처 경계를 강제해 배포 안정성을 확보하라` | Commit subject는 변경/결과를 설명해야 한다. |

선호하는 한국어 subject 형태:

- 명사/결과 구문: `빌드 경로 정렬`, `배포 경로 안정화`, `검증 흐름 개선`
- 간결한 과거 효과/결과 요약: `의존성 해석 고정`, `라우팅 경계 분리`
- `~하라`, `~해라`, `~라`, `~하자` 같은 문장 끝 명령형 어미나 future maintainer에게 직접 명령하는 표현 없음

자연스러운 초안이 명령처럼 읽히면 현재 commit에 존재하는 결과로 다시 쓴다.

## 그룹화 휴리스틱

1. 같은 feature 또는 fix를 구현하는 파일은 함께 둔다.
2. Test는 대응하는 implementation file과 함께 둔다.
3. Config/build 변경은 그것이 지원하는 feature와 함께 둔다.
4. 무관한 standalone 변경은 각각 별도 그룹을 이룬다.
5. `ALL` 모드에서는 모든 uncommitted 파일이 정확히 하나의 그룹에 나타나야 한다.

## 푸시 규칙

| 범주 | 규칙 |
|------|------|
| Commit first | 모든 commit group이 성공해야 push를 시작한다. |
| No confirmation | 성공적인 commit 이후 push 여부를 묻지 말고 자동으로 push한다. |
| Explicit repos | 중복 discovery를 피하려면 `scripts/git-maker-fast.mjs inspect`의 repo list를 `scripts/git-maker-fast.mjs push`에 전달하는 것을 선호한다. |
| Worktrees | named branch에 있으면 linked worktree는 유효한 push target이다. `.git/worktrees/...` 또는 common git dir가 아니라 checkout root path를 전달한다. |
| Upstream | upstream이 없으면 `-u origin <branch>`로 push한다. |
| Safety | `main` 또는 `master`에는 절대 force push하지 않는다. detached HEAD에서는 절대 push하지 않는다. |
| Failure | push가 실패하면 실패한 repo를 보고한다. Commit은 local에 남아 있으며 작업이 완료된 것처럼 말하지 않는다. |

## 다중 branch 전파

1. Mutation 전에 모든 `&&` target을 parse하고 validate한다. 빈/중복 target, source branch, detached HEAD, invalid ref name은 거부한다.
2. 이번 run에서 만든 ordered commit list를 캡처한다. 단지 local ahead 상태라는 이유로 무관한 이전 commit을 전파하지 않는다.
3. Target마다 clean existing linked worktree를 사용하거나 임시 linked worktree를 만든다. Dirty source checkout을 switch하거나 무관한 worktree state를 건드리지 않는다.
4. Commit 적용 전 target을 fetch하고 configured remote에서 fast-forward한다. Source branch 전체를 merge하거나 target history를 rewrite하지 않는다.
5. 캡처한 commit을 순서대로 cherry-pick한다. 적용 mechanism은 cherry-pick이며, conflict resolution 결과 file에서는 source와 target의 의도적인 동작을 merge할 수 있다.
6. Cherry-pick sequence와 관련 validation이 성공한 뒤에만 target을 push하고 다음 target으로 진행한다.
7. 이번 run이 만든 temporary worktree만 clean 상태에서 제거한다. 사용자의 기존 worktree는 절대 제거하지 않는다.

## Conflict 해결과 escalation

Conflict가 생기면 기본적으로 자율 해결한다:

- 모든 conflict stage(`base`, `ours`, `theirs`), source commit intent, target branch evolution, 관련 caller와 test를 검사한다.
- 한쪽을 통째로 선택하지 말고 non-conflicting target change를 보존하면서 source behavior를 통합한다.
- Generated artifact는 canonical generator가 있으면 그것으로 다시 만들며 generated output을 primary fix로 직접 편집하지 않는다.
- 계속 진행하고 push하기 전에 focused type/lint/test 또는 affected executable surface를 실행한다.
- 최종 report에 무엇을 조정했는지 기록한다.

다음 중 중요한 결정이 남을 때만 사용자에게 결과 중심의 좁은 질문 하나를 한다: 두 개 이상의 plausible product behavior, incompatible schema/data migration, security/deployment policy ambiguity, intentional target functionality 삭제, propagated commit보다 훨씬 큰 redesign. File 수 자체는 blocker가 아니지만 넓은 conflict는 scope를 재평가할 근거다. 질문할 때는 이후 target을 시작하지 않고 exact command/path를 보고하며 cherry-pick/worktree를 recoverable state로 보존한다.

## Type 선택

| 관찰된 dominant change | Type |
|------|------|
| 사용자-facing capability 추가 | `feat` |
| 잘못된 동작 수정 | `fix` |
| 문서만 변경 | `docs` |
| formatting/style만 변경 | `style` |
| 내부 restructure | `refactor` |
| performance improvement | `perf` |
| tests 추가/수정 | `test` |
| build/dependency/tooling | `build` |
| CI automation | `ci` |
| maintenance/metadata | `chore` |
| revert | `revert` |

## 실패 처리

| 실패 사례 | 응답 |
|------|------|
| candidate filter가 Git 상태와 일치하지 않음 | 중단하고 push하지 않는다 |
| commit할 변경사항 없음 | commit이 생성되지 않았다고 보고한다. 이미 unpushed commit이 있고 사용자 의도가 여전히 push를 포함할 때만 push한다 |
| 한 commit group 실패 | 중단하고 이후 그룹을 push하지 않는다 |
| push 실패 | 어떤 저장소가 실패했는지 보고한다. local commit은 안전하게 남아 있다 |
| 하나의 일관된 intent-preserving 결과가 있는 propagation conflict | 해결하고 검증한 뒤 계속 진행하며 reconciliation을 보고한다 |
| 중요한 behavior/architecture 결정이 필요한 propagation conflict | 한 가지 집중된 질문을 하고 이후 target을 시작하지 않는다 |
| network/auth prompt 위험 | non-interactive push helper output을 사용한다. push할 수 없으면 remote/auth blocker를 보고한다 |
