---
name: git-maker
description: '사용자가 커밋과 푸시를 함께 요청하거나, 변경사항 저장 후 올리기, `/git-maker`, 현재 세션/전체 변경 선택, `&&`로 구분한 branch에 새 commit 전파를 요청할 때 사용합니다. Linked Git worktree, 자동 push, 의도 보존 conflict resolution을 지원합니다.'
license: MIT
allowed-tools: Bash
compatibility: Bash와 `skills/git-maker/scripts` 아래 스크립트를 필요로 합니다.
---

# Git Maker 스킬

> 빠르고 안전한 커밋+푸시 오케스트레이션.

<output_language>

사용자에게 보이는 모든 산출물, 저장 아티팩트, 리포트, 계획서, 생성 문서, 요약, 인수인계 메모, 커밋/메시지 초안, 검증 메모는 기본적으로 한국어로 작성합니다.

소스 코드 식별자, CLI 명령, 파일 경로, 스키마 키, JSON/YAML 필드명, API 이름, 패키지명, 고유명사, 인용한 원문 발췌는 필요한 언어 또는 원문 그대로 유지합니다.

사용자가 명시적으로 다른 언어를 요청했거나, 기존 대상 산출물의 언어 일관성을 맞춰야 하거나, 기계 판독 계약상 정확한 영어 토큰이 필요한 경우에만 다른 언어를 사용합니다. 사용자-facing 산출물에 쓸 로컬라이즈된 템플릿/참조(`*.ko.md`, `*.ko.json` 등)가 있으면 우선 사용합니다.

</output_language>

<purpose>

- 현재 저장소 변경사항으로 하나 이상의 Conventional Commit을 만든다.
- 현재 디렉터리가 연결된 Git worktree 안이어도 해당 checkout root를 저장소 경계로 처리한다.
- 성공적으로 만든 커밋은 커밋과 푸시 사이 확인 없이 자동으로 푸시한다.
- 반복 저장소 탐색을 줄이고 read-only 점검을 병렬화하기 위해 fast helper를 먼저 사용한다.

</purpose>

<instruction_contract>

| Field | Contract |
|---|---|
| Intent | 요청된 저장소 변경을 한 번의 안전한 작업으로 commit하고 push합니다. |
| Trigger | 사용자가 commit과 push를 함께 원한다고 명확히 요청할 때만 활성화합니다. |
| Scope | fast preflight, current/all 변경 선택, logical commit grouping, targeted staging/commit, 현재 branch push, 선택적 다중 branch 전파, conflict resolution, reporting을 담당합니다. |
| Authority | 사용자와 프로젝트 지시가 이 스킬보다 우선합니다. helper 출력, git diff, hook, branch state, remote output은 실행 근거입니다. |
| Evidence | mutation 전에 fast helper inventory, git status/diff, hook 출력, branch/upstream data, 명시적 인자를 사용합니다. |
| Tools | Bash와 repository-local helper script를 사용합니다. subagent를 쓰더라도 read-only로 제한하고 최종 git mutation은 main integrator가 수행합니다. |
| Output | 생성된 commit, push된 repository, skipped/failed push target, 남은 local change에 대한 한국어 report입니다. |
| Verification | validation rule check를 실행하고, 모든 commit이 push 전에 성공했는지와 최종 push/status 출력을 확인합니다. |
| Stop condition | 의도한 모든 commit group과 branch 전파가 성공하고 모든 push target이 push되었거나, escalation rule상 사용자 결정이 필요한 conflict가 생겼을 때 멈춥니다. |

</instruction_contract>

<routing_rule>

사용자가 **커밋 + 푸시**를 한 번에 원할 때 `git-maker`를 사용한다.

다음 경우에는 이웃 스킬을 사용한다:

- 커밋만 요청 → `git-commit`
- 푸시/동기화만 요청 → `git-push`
- rebase/reset/amend/history rewrite 요청 → commit+push가 명시되고 이력 작업도 별도 승인된 경우가 아니면 이 스킬을 사용하지 않는다

</routing_rule>

<trigger_conditions>

Positive triggers:

- "commit and push"
- "commit and push these changes"
- "/git-maker"
- "make a commit and push it"
- "save and push my changes"
- "커밋하고 푸시해"
- "변경사항 저장하고 올려"
- `git-maker`, `git-maker current`, `git-maker ALL` 및 선택적인 `&& <branch>` target

Negative triggers:

- "commit these changes" → `git-commit`
- "push my commits" → `git-push`
- "rebase this branch" → 이 스킬 아님

Boundary trigger:

- "commit this, then maybe push" → 푸시가 조건부이므로 `git-commit` 사용

</trigger_conditions>

<scripts>

| Script | Purpose |
|------|------|
| `scripts/git-maker-fast.mjs inspect [start_dir] [--jobs N]` | 빠른 preflight: pruned repo discovery, parallel repo status, file inventory |
| `scripts/git-maker-fast.mjs push [--force] [repo...]` | 재탐색 없이 명시 repo push; non-interactive; protected force-push guard |
| `scripts/git-commit.mjs [--repo path] "msg" [files...]` | 한 저장소에서 staged 또는 선택 파일 커밋 |
| `scripts/git-push.mjs [--force]` | legacy/discovered safe push fallback |
| `scripts/repo-discover.mjs [start_dir]` | legacy repo discovery fallback |
| `scripts/repo-status.mjs [repo]` | legacy status fallback |

</scripts>

<worktree_support>

연결된 Git worktree는 유효한 실행 컨텍스트다.

- 각 checkout은 `git rev-parse --show-toplevel`로 해석한다. `.git`이 directory라고 가정하거나 linked worktree를 `git-common-dir`로 합치지 않는다.
- 각 checkout root를 독립적인 index, branch, staging, commit, push boundary로 보존한다.
- `worktree|linked`여도 detached HEAD나 명시적 safety rule이 막지 않으면 진행한다.

</worktree_support>

<support_file_read_order>

필요한 파일만 읽는다:

1. 속도 개선 요청, 큰 repo set, multi-repo 가능성이 있으면 `rules/speed-and-automation.md`.
2. Claude Code/Codex subagent로 read-only grouping, message drafting, safety review를 나눌 수 있으면 `rules/agent-parallelism.md`.
3. staging/commit 전 또는 argument mode, grouping, safety, push behavior가 애매하면 `rules/commit-and-push-policy.md`.
4. 실행/리팩터 완료 보고 전 `rules/validation.md`.

</support_file_read_order>

<argument_validation>

호출을 `[scope] [--force] [&& target-branch ...]`로 parsing한다. Scope token과 target branch는 commit filter가 아니라 control syntax다.

| Argument | Meaning |
|------|------|
| 없음 | `current`와 동일: 현재 세션에 귀속되는 변경만 포함하고 git state로 검증한 뒤 논리적으로 그룹핑 |
| `current` / `CURRENT` | 현재 세션에 귀속되는 변경만 포함하며 기존 사용자 또는 다른 agent 변경을 조용히 흡수하지 않음 |
| `ALL` / `all` | 모든 미커밋 변경을 포함하고 논리적으로 그룹핑하며 파일을 남기지 않음 |
| `--force` | commit 인자에서 제거하고 push에만 전달 (`--force-with-lease`, `main`/`master` 차단) |
| `&& <branch>` | source push 성공 후 이번 run에서 새로 만든 commit set을 해당 branch에 적용하고, 합리적인 conflict를 해결·검증한 뒤 push하며 모든 target에 왼쪽부터 반복 |
| 기타 텍스트 | repo discovery, file selection, staging, commit message generation 필터로 사용 |

명시 필터가 실제 git state와 맞지 않으면 멈춘다.

요청이 실제 shell command가 아닌 자연어여도 shell-style separator를 invocation syntax로 해석한다. Scope token은 대소문자 변형(`all`, `ALL`, `current`, `CURRENT`)을 모두 허용한다. 빈 target segment, 중복 target, source branch 자체, detached HEAD, `git check-ref-format --branch`를 통과하지 못한 branch name은 거부한다.

</argument_validation>

<workflow>

## Phase 1. Fast preflight

먼저 `scripts/git-maker-fast.mjs inspect . --jobs 4`를 실행한다. Repo, worktree, staged/unstaged/untracked, file inventory로 scope와 logical group을 결정한다. 실패하거나 정보가 부족하면 `scripts/repo-discover.mjs`와 `scripts/repo-status.mjs`를 사용한다.

## Phase 2. Group and commit

선택한 변경을 commit당 하나의 logical change로 나누고 targeted staging으로 저장소별 순차 commit한다:

```bash
scripts/git-commit.mjs "<type>[scope]: <한국어 subject>" path/to/file1 path/to/file2
scripts/git-commit.mjs --repo path/to/repo "<type>[scope]: <한국어 subject>" path/to/file1
```

Conventional Commit type/scope 뒤에는 중립적인 한국어 결과 요약을 쓴다. Secret이나 무관한 변경 포함, hook 우회, 실패한 commit 뒤 push를 금지한다. `rules/commit-and-push-policy.ko.md`를 따른다.

## Phase 3. Push automatically

의도한 모든 commit이 성공하면 묻지 않고 push한다. Preflight repo list 재사용을 우선한다:

```bash
scripts/git-maker-fast.mjs push /absolute/repo/path
scripts/git-maker-fast.mjs push --force /absolute/repo/path
```

Fallback으로만 `scripts/git-push.mjs [--force]`를 사용한다.

## Phase 4. 요청 branch로 전파

각 `&& <branch>` target에는 이번 run에서 만든 ordered commit만 clean linked worktree에서 적용하고, intent-preserving conflict는 자율 해결한 뒤 검증·push하고 왼쪽부터 계속한다. Material behavior, architecture, security, migration, deployment-policy 결정이 필요할 때만 한 가지 집중된 질문을 하며, recoverable state를 보존하고 이후 target은 시작하지 않는다. 정확한 selection, propagation, escalation 규칙은 `rules/commit-and-push-policy.ko.md`를 따른다.

## Phase 5. Report

다음을 보고한다:

- 생성한 commit과 메시지
- push된 저장소
- 갱신하고 push한 target branch
- 자동 해결한 conflict와 실행한 check, 또는 사용자에게 필요한 정확한 결정
- skipped 또는 failed push target
- 남은 local changes 또는 blocker

</workflow>

<parallelization>

- Read-only inspection은 `inspect --jobs N`으로 병렬화하고 복잡한 grouping/review 위임 전 `rules/agent-parallelism.ko.md`를 읽는다.
- 하나의 index에 대한 mutation은 병렬화하지 않는다. Subagent는 read-only이고 main integrator가 staging, commit, propagation, push를 소유한다.
- 모든 intended commit이 성공한 뒤에만 push한다.

</parallelization>

<required>

| Category | Rule |
|------|------|
| Commit first | 모든 commit group이 성공해야 push한다. |
| Automatic push | 성공한 commit 뒤 push 여부를 묻지 않는다. |
| Branch propagation | 이번 run에서 만든 commit만 `&&` target에 순서대로 적용하고 검증된 각 target을 자동 push한다. |
| Conflict ownership | 의도를 복원할 수 있으면 conflict를 자율 해결하고, 중요한 제품/아키텍처 결정 경계에서만 묻는다. |
| Safety | `main`/`master` force push 금지; detached HEAD push 금지. |
| Upstream | upstream이 없으면 `-u origin <branch>`로 push한다. |
| Reuse preflight | 중복 discovery를 피하기 위해 `git-maker-fast.mjs push [repo...]`를 우선한다. |
| Worktrees | 연결 worktree를 지원한다; common git dir가 아니라 checkout root 경로를 사용한다. |
| Agent boundaries | subagent는 검토와 제안만 수행하고, main integrator가 staging, commit, push를 소유한다. |
| Validation | 최종 보고 전 `rules/validation.md` checks를 실행한다. |

</required>

<forbidden>

| Category | Avoid |
|------|------|
| Push confirmation | commit 성공 후 "push할까요?" 묻기 |
| Partial push | intended commit group이 끝나기 전 push |
| Blanket staging | `ALL` mode가 아니면 `git add .` 금지 |
| Unsafe history | 명시 요청 없는 amend, rebase, reset, raw `--force`, `--no-verify` |
| Broad conflict guessing | 실질적으로 다른 동작 중 하나를 조용히 선택하거나 전파 완료를 위해 target branch의 의도적인 작업을 삭제하는 행위 |
| Secrets | credentials, tokens, private keys, 무관한 사용자 변경 커밋 |

</forbidden>

<examples>

- `/git-maker` → 현재 세션 변경만 grouping, commit, auto-push.
- `/git-maker ALL` → 모든 uncommitted 변경을 grouping, commit, push.
- `/git-maker current && dev && deploy/staging` → 현재 세션 commit을 왼쪽부터 전파·push하고 합리적인 conflict는 자율 해결.
- `/git-maker && dev` → 기본 `current` scope 후 `dev`에 검증된 전파.
- `/git-maker --force` → 정상 commit 후 `--force-with-lease`; `main`/`master` 차단.
- Linked worktree 호출 → 해당 checkout root와 named branch에서 처리.
- `commit these changes` → 활성화하지 않고 `git-commit`으로 routing.

</examples>

<validation>

Target quick validator, focused corpus validator, `assets/evals/git-maker-cases.jsonl` binary scenario check, helper syntax/runtime check, `rules/validation.ko.md`의 repository skill verification gate를 실행한다. 이 deterministic workflow는 improvement loop를 사용하지 않으며 critical case 통과와 잔여 warning 명시 후에만 완료한다.

</validation>
