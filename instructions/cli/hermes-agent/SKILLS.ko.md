# Hermes Agent 스킬

> English: [SKILLS.md](SKILLS.md) · 작성: [SKILL_AUTHORING.ko.md](SKILL_AUTHORING.ko.md) · 런타임 개요: [README.ko.md](README.ko.md) · 조사일: **2026-08-20**

이 문서는 Hermes Agent 스킬의 실무 참고서다. 아래의 **확인됨** 문장과 명령은 공식 [Skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Creating Skills guide](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills), [NousResearch/hermes-agent 소스](https://github.com/NousResearch/hermes-agent)를 근거로 한다. 제품 동작은 바뀔 수 있으므로 자동화하기 전 설치한 버전의 `hermes skills --help`를 확인한다. **권장 사항** 표시는 업스트림 계약이 아닌 작성·운영 조언이다.

## 모델: 필요할 때 로드하는 절차

스킬은 [Agent Skills 호환](https://agentskills.io/specification) `SKILL.md`, 즉 선택적인 로컬 보조 파일을 갖는 지침이다. 기존 도구로 절차를 추가할 뿐 실행형 플러그인이나 새 권한 도구는 아니다.

Hermes는 점진적 공개를 사용한다.

| 단계 | 에이전트 작업 | 로드 내용 |
|---|---|---|
| 0 | `skills_list()` | 이름, 설명, 카테고리(인덱스 약 3k 토큰) |
| 1 | `skill_view(name)` | 선택한 `SKILL.md`와 메타데이터 |
| 2 | `skill_view(name, path)` | 요청한 참조/보조 파일 하나 |

따라서 짧은 설명은 발견성을 만들고, 자세한 예외 처리는 참조 파일에 둔다. 설치된 스킬은 슬래시 명령으로 쓸 수 있으며 `skills` 도구셋을 켠 일반 대화에서도 발견할 수 있다.

**권장 사항:** 흔하고 안전한 경로는 `SKILL.md`에, 긴 API·공급자 표·예외 절차는 `references/`에 둔다. 자격 증명, 검토하지 않은 지침, 전체 원문 코퍼스를 최초 파일에 넣지 않는다.

## 발견, 위치, 신뢰

### 스킬 위치와 우선순위(확인됨)

| 계층 | 위치 | 비고 |
|---|---|---|
| 프로젝트(최고) | `<project-root>/.hermes/skills/` | Hermes 네이티브 프로젝트 스킬 |
| 프로젝트(최고) | `<project-root>/.agents/skills/` | 도구 간 공통 규약 |
| 프로필/로컬 | `~/.hermes/skills/` | 기본 원본; 번들·허브·에이전트 작성 스킬 위치 |
| 외부(최저) | 각 `skills.external_dirs` 항목 | 로컬과 함께 검색 |

프로젝트 루트는 `.git`가 있는 가장 가까운 상위 디렉터리이며 worktree와 submodule도 포함한다. 로컬 스킬은 같은 이름의 외부 스킬을, 프로젝트 스킬은 둘 모두를 가린다. 새 에이전트 작성 스킬은 `~/.hermes/skills/`에, 기존 외부 스킬은 쓰기 가능하면 제자리에서 수정될 수 있다. 프로젝트 디렉터리는 저장소 소유이므로 curator가 수정하지 않는다.

`~/.hermes/config.yaml`에 추가 디렉터리를 설정한다.

```yaml
skills:
  external_dirs:
    - ~/.agents/skills
    - /home/shared/team-skills
    - ${SKILLS_REPO}/skills
```

`~`와 `${VAR}`가 확장되고 없는 디렉터리는 건너뛴다. 외부 디렉터리는 쓰기 보호 경계가 아니므로, 공유 콘텐츠를 고정해야 하면 파일 시스템 권한을 사용한다.

프로젝트 스킬은 발견되지만 프로젝트를 신뢰하기 전에는 로드되지 않는다.

```bash
hermes skills trust
hermes skills trust ~/src/myproject
hermes skills untrust
```

신뢰한 루트는 `skills.trusted_project_dirs`에 저장되고 `skills.project_discovery: false`는 프로젝트 검색과 알림을 끈다. 비대화형 세션은 작업 디렉터리 기준의 대화형 신뢰 결정을 상속하며 묻거나 자동 신뢰하지 않는다. 프로젝트 스킬은 내용 변경마다 스캔되고 `dangerous` 결과는 격리되어 인덱스, `skills_list`, 슬래시 명령, 직접 로드에서 사용할 수 없다.

**권장 사항:** `hermes skills trust`는 저장소 평판을 한 번 승인하는 일이 아니라 코드 인접 지침을 따를 권한이다. 브랜치 전환, pull, 소유권 변경 뒤 재검토한다.

## 스킬 사용

### 호출과 스택(확인됨)

설치된 모든 스킬에는 슬래시 명령이 있다.

```text
/gif-search funny cats
/plan design an auth-provider migration
/excalidraw
```

스킬 이름만 쓰면 로드한 뒤 에이전트가 작업을 물을 수 있다. Hermes는 선행하는 설치된 슬래시 명령을 최대 다섯 개 로드하고 나머지 텍스트를 지시로 쓴다. 설치된 스킬이 아닌 첫 토큰에서 파싱을 멈추므로 경로는 인수로 보존된다.

```text
/github-pr-workflow /test-driven-development fix issue #123
/ocr-and-documents /tmp/scan.pdf extract the tables
```

스킬 도구셋은 대화형 발견도 허용한다.

```bash
hermes chat --toolsets skills -q "What skills do you have?"
hermes chat --toolsets skills -q "Show me the axolotl skill"
```

### 번들(확인됨)

번들은 이미 설치된 여러 스킬과 선택적 추가 지침을 한 번에 로드하는 YAML 별칭이다. 구성원을 설치하지 않는다. 번들은 `~/.hermes/skill-bundles/<slug>.yaml`에 있고 슬래시 이름 충돌 시 스킬보다 우선한다.

```bash
hermes bundles create backend-dev \
  --skill github-code-review \
  --skill test-driven-development \
  --skill github-pr-workflow \
  -d "Backend feature work — review, test, PR workflow"
hermes bundles list
hermes bundles show backend-dev
hermes bundles reload
hermes bundles delete backend-dev
```

```yaml
name: backend-dev
description: Backend feature work — review, test, PR workflow.
skills:
  - github-code-review
  - test-driven-development
  - github-pr-workflow
instruction: |
  Always start by writing failing tests, then implement.
```

`name`은 파일 stem이 기본값이며 하이픈 슬래시 명령으로 정규화된다. `skills`는 비어 있지 않은 필수 목록이고 항목은 스킬 이름 또는 스킬 디렉터리 상대 경로다. 없는 구성원은 실패시키지 않고 보고 후 건너뛴다. 채팅의 `/bundles`가 번들을 나열한다.

**권장 사항:** 번들은 작업 단위로 작게 만든다. 공통 지침이 프로젝트 안전 규칙을 덮거나 조용히 명령 권한을 부여해서는 안 된다.

### `/learn`(확인됨)

`/learn`은 에이전트에게 기존 도구로 제공 자료를 조사하고 `skill_manage`로 재사용 스킬을 저장하도록 요청한다. 별도 수집 엔진이 아닌 일반 에이전트 턴이다. 로컬 디렉터리, URL, 대화에서 수행한 절차, 붙여 넣은 설명을 사용할 수 있다.

```text
/learn the REST client in ~/projects/acme-sdk, focus on auth + pagination
/learn https://docs.example.com/api/quickstart
/learn how I just deployed the staging server
/learn filing an expense: open the portal, New > Expense, attach receipt, submit
```

큰 자료에는 가느다란 인덱스 `SKILL.md`와 주제별 `references/` 파일을 갖는 지식 기반 스킬을 만들 수 있으며 필요한 파일만 로드한다. 같은 주제를 다시 학습하면 기존 스킬에 자료를 합친다. 에이전트 작성 쓰기는 켰다면 `skills.write_approval`을 따른다.

**권장 사항:** 권위 있고 범위가 한정된 소스 경로를 제공하고 생성된 diff를 검토한다. `/learn`도 다른 작성 절차처럼 오류나 악성 소스 지침을 보존할 수 있다.

## 허브, 탭, URL, 수명주기

### 설치 전에 발견·검사(확인됨)

```bash
hermes skills browse
hermes skills browse --source official
hermes skills search kubernetes
hermes skills search react --source skills-sh
hermes skills search https://mintlify.com/docs --source well-known
hermes skills inspect openai/skills/k8s
hermes skills install openai/skills/k8s
hermes skills install official/security/1password
hermes skills install skills-sh/vercel-labs/json-render/json-render-react --force
```

지원 식별자는 `official/...`, `skills-sh/...`, GitHub 직접 `owner/repo/path`, `well-known:<endpoint>`, HTTPS `SKILL.md` URL이다. well-known 발견은 `/.well-known/skills/index.json`을 읽는다. 직접 URL의 이름 해결 순서는 프런트매터 이름, 유효한 URL 경로 slug, 대화형 TTY 프롬프트, `--name` 순서이며 비대화형 표면에서 이름이 해결되지 않으면 `--name`이 필요하다.

```bash
hermes skills install well-known:https://mintlify.com/docs/.well-known/skills/mintlify
hermes skills install https://sharethis.chat/SKILL.md
hermes skills install https://example.com/SKILL.md --name sharethis-chat
```

탭은 기본으로 `skills/` 경로를 쓰는 GitHub 소스다.

```bash
hermes skills tap add myorg/skills-repo
hermes skills tap list
hermes skills tap remove myorg/skills-repo
```

탭은 `~/.hermes/skills/.hub/taps.json`에 저장된다. 게시 탭은 `skills/` 아래 스킬마다 하나의 디렉터리와 `SKILL.md`를 가지며 dot/underscore 시작 디렉터리는 무시한다. 탭 루트의 `skills.sh.json`은 허브 카테고리 그룹을 제공할 수 있다. GitHub에 스킬을 게시한다.

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

### provenance와 로컬 편집 유지(확인됨)

```bash
hermes skills list --source hub
hermes skills check
hermes skills update
hermes skills update react
hermes skills update react --force
hermes skills audit
hermes skills uninstall k8s
hermes skills reset google-workspace
hermes skills reset google-workspace --restore
hermes skills reset google-workspace --restore --yes
```

허브 상태는 `.hub/lock.json`에 소스 식별자, 콘텐츠 해시, 스캐너 버전/결과, 시간, 캐시 상태를 기록한다. `check`는 저장한 provenance와 업스트림을 비교하고, `update`는 바뀐 허브 스킬만 재설치한다. 로컬에서 수정한 허브 스킬은 `--force` 없이는 건너뛴다. `audit`은 설치된 허브 스킬을 다시 스캔한다. `uninstall`은 허브 스킬을 제거한다.

번들 스킬의 origin 해시는 `.bundled_manifest`에 있다. 일반 sync는 바뀌지 않은 복사본은 업데이트하고 수정한 복사본은 보존한다. `reset <name>`은 현재 복사본을 보존하면서 해당 manifest 항목을 지운다. `--restore`는 로컬 복사본을 삭제하고 현재 번들 콘텐츠를 복원하며, `--yes`가 없으면 확인한다.

프로필별 번들 seeding 관리:

```bash
hermes skills opt-out
hermes skills opt-out --remove
hermes skills opt-in --sync
```

`opt-out`은 파일을 건드리지 않고 미래의 번들 seeding을 막는다. `--remove`은 확인 후 수정되지 않은 번들 스킬만 삭제하고 사용자 편집·허브·작성 스킬은 남긴다. `opt-in --sync`는 `.no-bundled-skills` marker를 지우고 즉시 seed한다. 최초 설치에서는 `--no-skills`와 `hermes profile create research --no-skills`가 같은 빈 프로필 선택지다.

동일한 허브 작업은 채팅에서도 가능하다. 예: `/skills browse`, `/skills inspect …`, `/skills install …`, `/skills check`, `/skills update`, `/skills reset …`, `/skills list`.

### 보안과 게시(확인됨 + 권장 사항)

Hermes는 허브 설치에서 프롬프트 주입, 데이터 유출, 파괴적 명령, 공급망 신호 등을 스캔한다. `inspect`는 가능하면 업스트림 메타데이터를 보인다. 신뢰 수준은 `builtin`, `official`, `trusted`, `community`다. `--force`는 caution/warn 정책 차단은 재정의할 수 있지만 **절대** `dangerous` 판정을 재정의하지 못한다. 공식 선택 스킬은 내장 신뢰이고 새 탭은 기본 community다. `audit` 재스캔은 안전 증명이 아니다.

**권장 사항:** 설치 전 모든 타사 `SKILL.md`, 참조 스크립트, URL을 검사한다. 중요한 경우 조직 절차에 따라 GitHub revision을 고정/검토한다. 스캐너 통과, trusted registry 표지, GitHub 토큰은 서로 다른 보장이다. 탭에 자격 증명을 넣지 않고, 명시적 사용자 확인 없이 되돌릴 수 없는 작업을 실행하도록 하는 지침을 게시하지 않는다. `--force`는 의도적으로 로컬 편집을 대체하므로 업데이트 전에 검토한다.

GitHub 기반 허브 작업은 미인증 60 requests/hour 제한에 닿을 수 있고, 공식 문서는 `GITHUB_TOKEN`이 5,000/hour로 올린다고 말한다. 이를 스킬이나 저장소가 아닌 Hermes 로컬 비밀 설정에 저장한다.

## 문제 해결

| 증상 | 확인된 원인 / 조치 |
|---|---|
| 스킬이 보이지 않음 | 플랫폼 제한, `requires_*`/`fallback_for_*`, 더 높은 우선순위의 같은 이름, 프로젝트 신뢰, 격리를 확인한다. |
| 프로젝트 스킬이 발견됐지만 로드되지 않음 | 프로젝트 루트에서 `hermes skills trust`를 실행하거나 프로젝트 경로를 전달한다. |
| 외부 스킬이 뜻밖에 편집됨 | 외부 디렉터리는 쓰기 가능한 발견 위치다. 파일 시스템 권한으로 보호한다. |
| URL 설치가 스킬 이름을 정하지 못함 | `name:` 프런트매터를 추가하거나 `--name`을 준다. 비대화형 표면은 물을 수 없다. |
| update가 변경 스킬을 건너뜀 | Hermes가 로컬 편집을 보존했다. 검토 후 대체할 때만 `hermes skills update <name> --force`를 쓴다. |
| 업스트림 파일을 복사한 뒤에도 번들 스킬이 user-modified로 남음 | 재기준 설정에는 `hermes skills reset <name>`, 깨끗한 번들 복사본에는 `--restore`를 쓴다. |
| 커뮤니티 설치가 차단됨 | `inspect`/스캔 결과를 읽는다. `--force`는 `dangerous` 콘텐츠를 설치할 수 없다. |
| 허브 요청이 rate limit됨 | 로컬 비밀 설정에 `GITHUB_TOKEN`을 구성하고 나중에 재시도한다. |
| 채팅 gateway에서 비밀을 요청함 | 채팅으로 보내지 말고 Hermes가 안내하는 로컬 `hermes setup` 또는 `~/.hermes/.env`를 쓴다. |

## 1차 출처

- Nous Research, [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- Nous Research, [Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills)
- Nous Research, [Hermes Agent source: skills CLI](https://github.com/NousResearch/hermes-agent/tree/main/hermes_cli/subcommands)
- Nous Research, [Hermes Agent source: bundled skills](https://github.com/NousResearch/hermes-agent/tree/main/skills)
- [Agent Skills specification](https://agentskills.io/specification)
