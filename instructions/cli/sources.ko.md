# CLI 런타임 프로필 근거 원장

> 영어판: [`sources.md`](sources.md)

## 조사 범위와 한계

- 확인일: 2026-08-27
- 기본 채널: 프로젝트 저장소 내부 문서만 사용.
- JCode 예외: 사용자가 `jcode.sh`에 대한 출처 기반 조사를 명시적으로 요청했으므로 해당 profile은 아래에 기록한 버전 고정 공식 소스·release artifact·렌더링 문서·실행한 `v0.81.1` help/test·날짜가 있는 반증을 사용한다.
- 기본 제외: 홈 디렉터리 설정·전역 skill·외부 웹 문서·설치된 CLI의 실시간 help. JCode 예외 조사에서도 credential 사용·인증·전역 설치를 하지 않았고 로컬 설정을 권위로 간주하지 않았다.
- 결론: 이 원장은 제품의 완전한 기능 목록이 아니라 선언한 증거 채널이 직접 뒷받침하는 최소 기능과 경계를 기록한다. GJC, Hermes Agent, OpenClaw와 OpenCode의 일부 기능에는 여전히 로컬 근거가 없으므로 해당 profile에서 runtime discovery와 fallback으로 처리한다.

## Source ledger

| # | Source | URL/path | 유형 | 확인된 내용 | 사용 위치 |
|---:|---|---|---|---|---|
| 1 | 프로젝트 범위 규칙 | [`../../AGENTS.md`](../../AGENTS.md) ⚠️ | 로컬 규칙 | 조사·참조는 저장소 내부로 제한하고, 전역 설정을 근거로 사용하지 않음 | 전체 문서의 근거 범위 |
| 2 | Instructions Base | [`../README.ko.md`](../README.ko.md) | 로컬 안내 | 런타임 중립 core와 runtime profile을 분리하고, capability 중심으로 도구를 서술 | `README.md`, `capability-contract.md` |
| 3 | Runtime Profiles | [`../context-engineering/references/runtime-profiles.ko.md`](../context-engineering/references/runtime-profiles.ko.md) | 로컬 reference | 공통 규칙은 capability 중심, 런타임별 차이는 별도 profile에 둠 | 레이어와 용어 |
| 4 | Skill Authoring | [`../skill/SKILL_AUTHORING.ko.md`](../skill/SKILL_AUTHORING.ko.md) | 로컬 안내 | skill은 intent·scope·authority·tools·verification을 분리하고 안전 경계를 둠 | Skill 작성 패턴·검증 |
| 5 | Claude Code skill | [`../../skills/claude-code/SKILL.ko.md`](../../skills/claude-code/SKILL.ko.md) | 로컬 skill | `claude -p`, 세션 재개, 권한 모드, 도구 제한 사용 규칙 | `claude-code/README.md` |
| 6 | Codex skill | [`../../skills/codex/SKILL.ko.md`](../../skills/codex/SKILL.ko.md) | 로컬 skill | `codex exec`, `codex review`, 세션 재개, sandbox 선택 규칙 | `codex/README.md` |
| 7 | Git commit skill | [`../../skills/git-commit/SKILL.ko.md`](../../skills/git-commit/SKILL.ko.md) | 로컬 skill | OpenCode에서는 native ask 스타일 승인 프롬프트가 가능할 때 우선, 아니면 평문 fallback | `opencode/README.md` |
| 8 | JCode 공식 문서 | [jcode.sh/docs](https://jcode.sh/docs) | 1차 라이브 문서 | 설치·provider·config·MCP·remote·skill·command·SDK 발견 표면 | `jcode/README.ko.md` |
| 9 | JCode v0.81.1 소스 | [`1jehuang/jcode@cae6d2a`](https://github.com/1jehuang/jcode/tree/cae6d2a573ebfdbfaca085a82abb1f0b72faac69) | 버전 고정 1차 소스 | Config 우선순위·tool policy·command-risk·path·MCP·session·memory·swarm·SDK·gateway·hook·automation 동작 | `jcode/README.ko.md` |
| 10 | JCode v0.81.1 릴리스 | [v0.81.1](https://github.com/1jehuang/jcode/releases/tag/v0.81.1) | 1차 릴리스 | 릴리스 날짜·asset·checksum·소스 경계 | `jcode/README.ko.md` |
| 11 | JCode onboarding | [jcode.sh/onboarding](https://jcode.sh/onboarding) | 1차 렌더링 페이지 | 테스트 기반 onboarding 상태와 기존 login import 주장 | `jcode/README.ko.md` |
| 12 | JCode telemetry 계약 | [`TELEMETRY.md@v0.81.1`](https://github.com/1jehuang/jcode/blob/cae6d2a573ebfdbfaca085a82abb1f0b72faac69/TELEMETRY.md) | 버전 고정 policy/source 문서 | 집계 telemetry·opt-out·transcript opt-in·내용·보존·redaction 주의 | `jcode/README.ko.md` |
| 13 | JCode issue 반증 검색 | [`1jehuang/jcode` issues](https://github.com/1jehuang/jcode/issues) | 사용자 보고와 연결 source/PR | 승인·MCP·session·swarm·provider·installer·remote 동작의 버전 drift와 한계 | `jcode/README.ko.md` 주의사항만 |
| 14 | Anthropic 인증 policy | [Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use) | Provider 1차 policy | 제3자 제품의 구독 OAuth 경계와 수정되지 않은 Claude Code binary 예외 | `jcode/README.ko.md` provider 경고 |

> ⚠️ `AGENTS.md`와 `CLAUDE.md`는 `.gitignore:41-42` 대상이라 **버전 관리되지 않는다**(확인 2026-07-28, `git ls-files` 결과 0건). 이 원장의 근거 #1은 현재 clone에만 존재하며 다른 clone에서는 참조가 끊긴다. 이를 추적 대상으로 바꿀지는 저장소 관례에 대한 별도 결정 사항이며 이 문서에서 정하지 않는다.

## Claim-source matrix

| Claim | Source(s) | Confidence | Caveat |
|---|---|---|---|
| 공통 skill 규칙은 capability 중심이고 런타임별 차이는 profile에 분리한다 | 2, 3 | 높음 | 이 프로젝트의 문서 설계 규칙이다. 제품 공통 표준 주장 아님. |
| Claude Code bridge는 비대화형 실행·세션 재개·권한 모드를 다룬다 | 5 | 높음 | 현재 저장소의 `claude-code` skill 범위이며 전체 Claude Code 기능표가 아님. |
| Codex bridge는 `exec`, `review`, 재개, sandbox 흐름을 다룬다 | 6 | 높음 | 현재 저장소의 `codex` skill 범위이며 설치 버전의 기능 보장은 아님. |
| Codex에서는 평문 질문을 사용한다 | 6, 7 | 중간 | 저장소 skill의 운영 규칙이다. native 질문 도구 부재에 대한 제품 일반 주장은 하지 않는다. |
| OpenCode는 native ask 스타일 승인 프롬프트가 노출될 때 우선 사용할 수 있다 | 7 | 중간 | 로컬 skill의 조건부 지침 하나만 근거다. 다른 OpenCode 기능은 확인되지 않았다. |
| GJC의 정적 도구 목록을 이 저장소 근거로 확정할 수 없다 | 저장소 내 `instructions`, `skills`, `README.md` 검색 | 높음 | 부재 증명은 저장소 범위에만 한정된다. |
| Hermes Agent와 OpenClaw의 제품 고유 capability를 이 저장소 근거로 확정할 수 없다 | 저장소 내 `instructions`, `skills`, `README.md` 검색 | 높음 | 부재 증명은 저장소 범위에만 한정되며 외부 웹 문서와 설치된 CLI는 프로젝트 범위에서 제외된다. |
| JCode v0.81.1은 넓은 도구 표면을 제공하지만 일반 대화형 실행에는 범용 사용자 승인이나 작업공간 sandbox 경계가 확인되지 않았다 | 9, 13 | 높음 | Tool profile과 Bash catastrophic deny는 제한적 런타임 방어다. 가용성은 여전히 권한이 아니다. |
| JCode 프로젝트 MCP 설정은 실행 가능한 stdio 설정이며 프로젝트 신뢰 prompt 없이 시작될 수 있다 | 8, 9, 13 | 높음 | v0.81.1은 HTTP/SSE 항목을 건너뛴다. 사용 전에 모든 프로젝트 MCP command와 environment를 점검한다. |
| JCode session·memory·swarm·background work·SDK·비대화형 run은 구현되어 있으나 버전에 민감하다 | 8, 9, 10, 13 | 높음 | 진행 중 issue·오래된 문서·registry/source 버전 차이·auto-poke 다중 turn 때문에 runtime 검증이 필요하다. |
| JCode telemetry와 transcript 공유는 서로 다른 동의 경계를 가진다 | 12 | 높음 | 집계 telemetry는 끄지 않으면 활성화되는 것으로 문서화되어 있고, 전체 transcript는 별도 opt-in이며 heuristic redaction은 보장이 아니다. |
| JCode의 `claude` 구독 OAuth 경로는 Anthropic 공개 제3자 인증 policy와 일치하지 않는다 | 9, 13, 14 | 높음 | 기술적 동작은 policy 허가가 아니다. 별도 `anthropic-api` 경로를 우선하고 실행 시점에 policy를 재확인한다. |

## 갱신 조건

다음 중 하나가 생기면 이 원장을 갱신한다.

- 프로젝트에 버전 고정된 CLI 공식 reference 또는 검증된 런타임 profile이 추가된다.
- skill이 특정 CLI의 질문·승인·도구 기능에 새로 의존한다.
- CLI 명령/권한 동작이 달라져 기존 profile의 fallback이나 safety gate가 부정확해진다.
- JCode가 config 우선순위·승인/tool policy·MCP 신뢰·gateway transport·automation 출력·credential import·telemetry·SDK protocol 동작을 바꾸는 릴리스를 게시한다.

갱신 시에는 근거를 먼저 추가하고, 그 다음 해당 프로필과 공통 계약을 수정하며, 마지막으로 링크·claim-source matrix·smoke eval을 다시 확인한다.
