# Hermes Agent 스킬 작성

> English: [SKILL_AUTHORING.md](SKILL_AUTHORING.md) · 스킬 사용과 수명주기: [SKILLS.ko.md](SKILLS.ko.md) · 조사일: **2026-08-20**

이 동반 문서는 작성, 구조, 검증, 게시를 다룬다. **확인됨** 문장은 공식 [Skills guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills), [Creating Skills guide](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills), [NousResearch/hermes-agent 소스](https://github.com/NousResearch/hermes-agent)를 근거로 한다. **권장 사항**은 업스트림 계약이 아닌 지침을 표시한다.

## 표준 레이아웃과 프런트매터

### 디렉터리 레이아웃(확인됨)

```text
~/.hermes/skills/
├── mlops/
│   └── axolotl/
│       ├── SKILL.md                 # 필수 진입점
│       ├── references/              # 필요 시 로드하는 세부 사항
│       ├── templates/               # 재사용 출력 골격
│       ├── scripts/                 # 도우미 프로그램
│       ├── examples/                # 참조되는 예제
│       └── assets/                  # 보조 파일
├── .hub/
│   ├── lock.json                    # 소스/해시/스캔 provenance
│   ├── quarantine/
│   └── audit.log
└── .bundled_manifest                # 번들 origin 해시
```

허브 URL/GitHub 설치는 `SKILL.md`와 명시적으로 참조한 `references/`, `templates/`, `scripts/`, `assets/`, `examples/` 파일만 가져오며 관련 없는 저장소 파일은 복사하지 않는다. 따라서 보조 파일은 스킬에서 이름을 써 참조해야 한다.

### 완전한 지원 프런트매터(확인됨)

```markdown
---
name: release-notes
description: Draft release notes from merged changes and reviewed evidence
version: 1.0.0
author: Example Platform Team
license: MIT
platforms: [macos, linux]
required_environment_variables:
  - name: RELEASE_API_TOKEN
    prompt: Release API token
    help: Get a token from the internal developer portal
    required_for: publishing release notes
required_credential_files:
  - path: release_oauth.json
    description: OAuth token created by the release setup flow
metadata:
  hermes:
    tags: [release, changelog, git]
    related_skills: [github-pr-workflow]
    requires_toolsets: [terminal]
    requires_tools: [terminal]
    fallback_for_toolsets: [browser]
    fallback_for_tools: [browser_navigate]
    config:
      - key: release-notes.repository
        description: Repository used for release-note generation
        default: ""
        prompt: Repository owner/name
    blueprint:
      schedule: "0 9 * * 1"
      deliver: origin
      prompt: Draft weekly release notes from merged pull requests.
      no_agent: false
---
```

`name`과 `description`은 표준 필수 필드다. `version`, `author`, `license`, `platforms`, 환경·자격 파일 선언과 Hermes 메타데이터는 선택 사항이다. 유효 플랫폼은 `macos`, `linux`, `windows`이며 생략하거나 비우면 모든 플랫폼이다. 호환되지 않는 플랫폼에서는 인덱스, `skills_list`, 슬래시 명령에서 숨겨진다.

`requires_toolsets`/`requires_tools`는 필수 기능 중 **하나라도** 없으면 숨긴다. `fallback_for_toolsets`/`fallback_for_tools`는 명명한 기능 중 **하나라도** 있으면 숨긴다. 실제로 기능이 필요한 워크플로에는 `requires_*`, 주 기능이 없을 때만 보일 대안에는 `fallback_for_*`를 쓴다.

`required_environment_variables` 항목은 필수 `name`과 `prompt`, `help`, `required_for`를 받을 수 있다. 값이 없어도 발견에서 숨기지 않는다. 로컬 CLI는 로드 시에만 설정을 요청하고 메시징 표면은 로컬 `hermes setup` 또는 `~/.hermes/.env`를 안내한다. 설정된 선언 변수는 원시 값을 모델에 노출하지 않고 `terminal` 및 `execute_code` 샌드박스에 전달된다. 비밀이 아닌 선호값에는 `metadata.hermes.config`를 쓴다. 값은 `config.yaml`의 `skills.config`에 저장되고 `hermes config migrate`가 묻고 `hermes config show`가 보이며 로드 시 주입된다. `~/.hermes/` 상대 파일 자격 증명에는 `required_credential_files`를 쓴다. 존재하는 파일은 지원되는 원격 샌드박스에 mount/sync된다.

`metadata.hermes.blueprint`은 실행 가능한 자동화 제안을 표시한다. 설치해도 스케줄하지 않으며 사용자가 `/suggestions`에서 명시적으로 수락하거나 거부한다.

본문 템플릿 변수는 기본으로 치환된다.

| 토큰 | 값 |
|---|---|
| `${HERMES_SKILL_DIR}` | 절대 스킬 디렉터리 |
| `${HERMES_SESSION_ID}` | 활성 세션 ID, 세션이 없으면 변경하지 않음 |

`skills.template_vars: false`로 치환을 끈다. 인라인 셸 ``!`command` ``은 기본으로 꺼져 있고 `skills.inline_shell: true`를 켜면 스킬 로드 중 호스트에서 실행한다. 출력 제한과 실패 표시는 있지만 호스트 명령 실행인 점은 변하지 않는다.

**권장 사항:** 비밀에는 `required_environment_variables`만, 비밀이 아닌 설정에는 `config`만 쓴다. 커뮤니티 콘텐츠에 인라인 셸을 켜지 않는다. 동적 셸 보간보다 명시 입력을 받는 스크립트를 선호한다.

## 완전하고 현실적인 작성 예제

먼저 작은 절차를 만들고 정당한 보조 파일만 추가한다.

```text
release-notes/
├── SKILL.md
├── references/
│   └── style-guide.md
├── templates/
│   └── release-notes.md
└── scripts/
    └── collect_merged_prs.py
```

```markdown
---
name: release-notes
description: Draft release notes from merged pull requests and a style guide
version: 1.0.0
platforms: [macos, linux]
metadata:
  hermes:
    tags: [release, changelog, git]
    requires_toolsets: [terminal]
    config:
      - key: release-notes.repository
        description: Repository owner/name to inspect
        default: ""
        prompt: Repository owner/name
---

# Release Notes

## When to Use
Use to prepare a draft from merged pull requests. Do not publish, tag, or change a repository unless the user explicitly requests it.

## Procedure
1. Read `${HERMES_SKILL_DIR}/references/style-guide.md` and confirm the target release range.
2. Run `python3 ${HERMES_SKILL_DIR}/scripts/collect_merged_prs.py <range>`.
3. Group evidence by user-facing change; omit uncertain claims and flag them.
4. Start from `${HERMES_SKILL_DIR}/templates/release-notes.md`.
5. Return a draft and the pull-request links used. Ask before publication.

## Pitfalls
- Do not infer a feature from a title alone; use the linked change details.
- Keep breaking changes and migrations separate.

## Verification
Check that every factual bullet has a cited pull request and that no publication command was run.
```

```python
# scripts/collect_merged_prs.py
# Accept one explicit revision range; print structured, reviewable data.
import subprocess
import sys

if len(sys.argv) != 2:
    raise SystemExit("usage: collect_merged_prs.py <revision-range>")
print(subprocess.check_output(["git", "log", "--format=%H%x09%s", sys.argv[1]], text=True))
```

```markdown
<!-- templates/release-notes.md -->
# Release {{version}}

## Highlights

## Fixes

## Breaking changes

## Evidence
- Pull requests:
```

이 예제에는 의도적으로 토큰, 인라인 셸, publish 작업이 없다. 실제 스크립트에서는 revision 문법을 검증하고 subprocess 오류를 처리한다. 이 짧은 예제는 생산용 파서가 아니라 파일 계약을 보여 준다.

### 작성 워크플로(권장 사항)

1. 기존 도구와 지침으로 충분한지 정한다. 영속적 API 통합, 정확한 이진/스트리밍 처리, 인증 수명주기는 플러그인/도구 코드에 둔다.
2. 고유한 소문자 식별자와 도움이 되는 시점을 말하는 설명을 정한다. 설명은 짧게 유지한다(Hermes의 `/learn` 작성 지침은 60자 이하를 요구한다).
3. 스크립트 전에 `When to Use`, 일반 절차, 함정, 검증을 쓴다.
4. 필요 시에만 필요한 자료를 `references/`로 옮기고 반복 출력에는 템플릿, 검토한 전형에는 예제를 쓴다.
5. 플랫폼/도구 조건은 좁게 선언한다. 잘못된 `requires_*`는 유효한 스킬을 숨긴다.
6. 비밀과 비밀 아닌 설정을 분리 선언하며 값은 프런트매터, 예제, 스크립트에 절대 넣지 않는다.
7. 무해한 대표 프롬프트로 호출하고 실제 도구 사용과 출력을 본 뒤, 누락 설정·호환 안 되는 플랫폼·필수 도구셋 부재를 시험한다.
8. 모든 보조 파일을 코드처럼 검토하고 `SKILL.md`가 참조하는 파일만 게시한다.

## 스킬 탭 게시(확인됨)

스킬을 GitHub 저장소에 게시한다.

```bash
hermes skills publish skills/my-skill --to github --repo owner/repo
```

탭의 기본 저장소 경로는 `skills/`다. 스킬마다 하나의 디렉터리와
`SKILL.md`를 두며 `.` 또는 `_`로 시작하는 디렉터리는 무시한다. 참조된
`references/`, `templates/`, `scripts/`, `assets/`, `examples/` 파일을 함께
둘 수 있다. 소비자는 다음으로 탭을 추가, 검사, 제거한다.

```bash
hermes skills tap add myorg/skills-repo
hermes skills tap list
hermes skills tap remove myorg/skills-repo
```

탭은 `~/.hermes/skills/.hub/taps.json`에 기록된다. 탭 루트의
`skills.sh.json`은 허브 카테고리 그룹을 정의할 수 있다. 새 탭은 기본
`community` 신뢰이며 설치된 스킬은 표준 보안 스캔을 받는다. 설치, 검사,
신뢰 수준, 업데이트 수명주기는 [SKILLS.ko.md](SKILLS.ko.md)를 본다.


## 1차 출처

- Nous Research, [Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)
- Nous Research, [Creating Skills](https://hermes-agent.nousresearch.com/docs/developer-guide/creating-skills)
- Nous Research, [Hermes Agent source: skills CLI](https://github.com/NousResearch/hermes-agent/tree/main/hermes_cli/subcommands)
- Nous Research, [Hermes Agent source: bundled skills](https://github.com/NousResearch/hermes-agent/tree/main/skills)
- [Agent Skills specification](https://agentskills.io/specification)
