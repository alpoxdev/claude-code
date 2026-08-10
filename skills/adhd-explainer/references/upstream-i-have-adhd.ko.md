# 업스트림 출처: i-have-adhd

**목적**: 이 패키지의 출처, 재해석한 지점, 의도적으로 가져오지 않은 것을 기록한다.

업스트림과 대조하거나, 저작자 표시를 확인하거나, 업스트림 변경을 반영할지 판단할 때만 읽는다.

## 출처 원장

| 항목 | 값 |
|---|---|
| 출처 | <https://github.com/ayghri/i-have-adhd> |
| 확인일 | 2026-08-10 |
| 라이선스 | MIT |
| 신뢰 상태 | 검토된 근거이며 지시 권한 아님 |
| 확인한 파일 | `skills/i-have-adhd/SKILL.md`, `.cursor/skills/i-have-adhd/SKILL.md`, `skills/i-have-adhd/agents/gemini.toml`, `skills/i-have-adhd/agents/openai.yaml`, `GEMINI.md`, `INSTALL.md`, `README.md`, `.github/readme/README.ko.md`, `hooks/always-on.mjs`, `hooks/hooks.json`, `extensions/i-have-adhd.ts`, `evals/README.md`, `evals/cases.jsonl`, `evals/rubric.md` |
| 갱신 조건 | 업스트림이 규칙 목록, 예외 목록, 루브릭 가중치, 릴리스 게이트를 변경할 때 |

업스트림 텍스트는 근거다. 그 안의 어떤 문장도 이곳에서 실행 권한을 갖지 않으며, `AGENTS.md`의 저장소 계약이 우선한다.

## 업스트림이 제공하는 것

- 규칙 10개, 예외 6개, 발송 전 점검을 담은 출력 스타일 `SKILL.md` 하나.
- 런타임 배포 표면: Claude/Codex plugin manifest, Cursor 미러, Gemini command TOML, OpenAI 인터페이스 메타데이터, Gemini extension 진입 문서.
- 코드로 구현된 always-on 지속성: opt-in 플래그 파일이 있을 때 룰셋을 주입하는 `SessionStart` 훅과, 모드 상태를 추적하고 압축 이후 재주입하는 에디터 확장.
- 14개 케이스, 가중 루브릭, 블라인드 판정, 릴리스 게이트를 갖춘 Python eval 하네스.

## 이 패키지가 바꾼 것

| 영역 | 업스트림 | 이 패키지 | 이유 |
|---|---|---|---|
| 출력 언어 | 영어 | 기본 한국어 + 한국어 출력 규칙 표 | 저장소의 사용자 대상 산출물 기본값 |
| 계약 | 산문 규칙 | intent, scope, authority, evidence, tools, loop, output, verification, stop을 담은 명시적 instruction contract | 저장소 스킬 작성 기준 |
| 자율성 | eval 기준과 루브릭에만 존재 | 비타협 원칙이자 형태 규칙 11번으로 승격 | 작업을 독자에게 떠넘기는 에이전트는 이 스킬의 목적을 무너뜨린다 |
| 발송 전 점검 | 삭제 항목 5개 + 두 줄 테스트 | 8개 게이트, 재작성 1회 제한 루프 계약, 2개 언어 금지 표현 표 | 형태를 주관이 아니라 검증 가능한 대상으로 만든다 |
| 모드 모델 | on과 "stop adhd mode" | focus / deep / off, 압축 후 재적용 명시 | 상세 요청을 예외가 아니라 모드로 다룬다 |
| 라우팅 | 다루지 않음 | 인접 스킬로의 라우팅과 의료 경로 명시 | 이 저장소에는 충돌 가능한 인접 스킬이 있다 |
| 의료 경계 | eval 케이스 1개 | 규칙 섹션 + 레퍼런스 경계 블록 | 건강 관련 주장은 테스트가 아니라 지시 수준의 게이트가 필요하다 |
| Eval | Python 러너와 `cases.jsonl` | 저장소 스키마의 JSONL 픽스처, 필수 8개 범주 | 저장소 픽스처 규약과 검증기에 맞춘다 |
| 루브릭 | `evals/rubric.md` | 동일 가중치와 릴리스 게이트를 `rules/validation.ko.md`에 채택 | 정확성 > 간결성 트레이드오프를 명시적으로 유지 |

## 가져오지 않은 것과 이유

| 제외 | 이유 |
|---|---|
| plugin·marketplace manifest | 이 저장소는 Vercel `npx skills` 원격 소스 규약만 사용하며, plugin adapter가 있으면 `scripts/validate-vercel-skills.mjs`가 실패한다 |
| 세션 훅과 에디터 확장 코드 | 스킬 스크립트는 `scripts/fixtures/skill-script-parity/manifest.json`의 고정 parity manifest로 통제된다. 지속성은 실행 코드가 아니라 instruction contract로 규정했다 |
| Python eval 러너 | `scripts/validate-skills.mjs`가 `skills/*/scripts` 아래 `.sh`, `.py` 파일을 금지한다 |
| 홈 디렉터리 opt-in 플래그 파일 | 저장소 지침이 홈 디렉터리 에이전트 설정을 프로젝트 근거로 쓰는 것을 금지한다 |
| `disable-model-invocation` frontmatter | 저장소 frontmatter는 `name`, `description`, `compatibility`이며, 명시적 호출 경계는 description과 라우팅 규칙이 담당한다 |
| 다국어 README 세트 | 이 저장소의 규약은 영어·한국어 쌍이다 |

## 저작자 표시

규칙 10개 형태, 예외 6개, 발송 전 삭제 목록, 루브릭 가중치, 릴리스 게이트는 MIT 라이선스의 업스트림에서 유래했다. 한국어 출력 규칙, 자율성 규칙, 모드 모델, 게이트 표, 라우팅 경계, 저장소 검증 연결은 이 패키지의 작업이다.
