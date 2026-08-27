# 배포 수정 Flow Schema

> 복잡 경로에서만 사용하는 `.hyper/deploy-fix/flow.json`용 flow-state template. 정식 JSON Schema 문서가 아니라 문서화된 계약이다.

## Schema

```json
{
  "id": "deploy-fix-{YYYYMMDD-HHmmss}",
  "skill": "deploy-fix",
  "status": "in_progress | completed | blocked",
  "complexity": "complex",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "request": {
    "failure": "오류 메시지 또는 실패 단계 설명",
    "scope": "repo-wide | workspace:name | ci-step:name | deploy-target:name",
    "build_command": "실패하는 명령 (해당하는 경우)",
    "ci_provider": "GitHub Actions | Vercel | GitLab CI | other (해당하는 경우)",
    "target": "해당하는 경우 provider project/environment/target",
    "related_files": ["알고 있다면 config/code 파일 경로"]
  },
  "current_phase": "investigate | options | confirm | fix | verify",
  "phases": {
    "investigate": {
      "status": "pending | in_progress | completed",
      "root_cause": "확인된 근본 원인",
      "evidence": ["로그/config에서 얻은 근거 증거"],
      "failure_chain": [
        {
          "step": "실패 단계 이름",
          "error": "오류 메시지",
          "file": "해당하는 경우 파일 경로"
        }
      ],
      "hypotheses": [
        {
          "description": "가설 텍스트",
          "confidence": "high | medium | low",
          "verified": false
        }
      ]
    },
    "options": {
      "status": "pending | in_progress | completed",
      "options": [
        {
          "id": 1,
          "summary": "옵션 설명",
          "pros": ["장점"],
          "cons": ["단점"],
          "risk": "low | medium | high",
          "files": ["영향받는 파일"],
          "recommended": true
        }
      ]
    },
    "confirm": {
      "status": "pending | completed",
      "selected_option": 1,
      "notes": "사용자가 제공한 메모가 있으면 기록"
    },
    "fix": {
      "status": "pending | in_progress | completed",
      "changed_files": ["수정된 파일 목록"]
    },
    "verify": {
      "status": "pending | in_progress | completed | failed",
      "commands_run": ["실행한 검증 명령"],
      "result": "pass | fail",
      "notes": "검증 세부 사항",
      "external_action": {
        "requested": false,
        "authorized_action": "정확한 retry/deploy/publish/rollback action 또는 null",
        "authorized_target": "정확한 provider/project/environment/target 또는 null",
        "preflight": "pass | fail | not_run",
        "rollback_or_stop": "rollback 또는 stop condition 또는 null",
        "post_check": "정의된 post-action check 또는 null"
      }
    }
  }
}
```

## Status values

| Status | Meaning |
|--------|---------|
| `pending` | 아직 시작하지 않은 phase |
| `in_progress` | 현재 진행 중인 phase |
| `completed` | 성공적으로 완료된 phase |
| `failed` | 실패한 phase (`verify` 전용) |
| `blocked` | 외부 입력을 기다리는 중 (전체 status 전용) |

## Rules

- `current_phase`는 status가 `in_progress` 또는 `pending`인 첫 phase로 설정한다.
- 쓸 때마다 `updated_at`을 갱신한다.
- 모든 phase가 `completed`이면 최상위 `status`를 `completed`로 설정한다.
- `verify`가 실패하면 status를 `failed`로 설정하고 범위 안에서 수정한 뒤 다시 시도한다.
- 재개 전 `skill: deploy-fix`, `complexity: complex`, 현재 request/scope/target 일치, 유효한 phase status, 미완료 top-level status를 요구한다. malformed, stale, cross-workspace, conflicting, completed state는 조정하기 전까지 non-resumable이다.
- 이전 또는 중단된 flow의 사용자 선택이나 external-action permission을 상속하지 않는다. 선택이 모호하면 `fix` 전에, remote/production action은 매번 다시 확인한다.
- 실질적으로 다른 실패 접근은 최대 3개까지 허용한다. 세 번째 실패 뒤에는 top-level `status`를 `blocked`로 설정하고 attempt evidence를 보존한 뒤 정확한 입력 하나를 요청하며 멈춘다.
- `id`는 생성 timestamp를 사용한다: `deploy-fix-20260327-100000`.

## Example: initial state

```json
{
  "id": "deploy-fix-20260327-150000",
  "skill": "deploy-fix",
  "status": "in_progress",
  "complexity": "complex",
  "created_at": "2026-03-27T15:00:00Z",
  "updated_at": "2026-03-27T15:00:00Z",
  "request": {
    "failure": "TypeScript compilation error: Cannot find module '@repo/shared'",
    "scope": "workspace:apps/web",
    "build_command": "turbo build --filter=apps/web",
    "ci_provider": "GitHub Actions",
    "related_files": ["apps/web/tsconfig.json", "packages/shared/package.json"]
  },
  "current_phase": "investigate",
  "phases": {
    "investigate": { "status": "in_progress" },
    "options": { "status": "pending" },
    "confirm": { "status": "pending" },
    "fix": { "status": "pending" },
    "verify": { "status": "pending" }
  }
}
```
