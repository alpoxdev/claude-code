# Deploy Fix Flow Schema

> Flow-state template for `.hyper/deploy-fix/flow.json` -- used in complex path only. This is a documented contract, not a formal JSON Schema document.

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
    "failure": "error message or failing step description",
    "scope": "repo-wide | workspace:name | ci-step:name | deploy-target:name",
    "build_command": "the command that fails (if applicable)",
    "ci_provider": "GitHub Actions | Vercel | GitLab CI | other (if applicable)",
    "target": "provider project/environment/target when applicable",
    "related_files": ["config/code file paths if known"]
  },
  "current_phase": "investigate | options | confirm | fix | verify",
  "phases": {
    "investigate": {
      "status": "pending | in_progress | completed",
      "root_cause": "identified root cause",
      "evidence": ["supporting evidence from logs/config"],
      "failure_chain": [
        {
          "step": "failing step name",
          "error": "error message",
          "file": "file path if applicable"
        }
      ],
      "hypotheses": [
        {
          "description": "hypothesis text",
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
          "summary": "option description",
          "pros": ["advantages"],
          "cons": ["disadvantages"],
          "risk": "low | medium | high",
          "files": ["affected files"],
          "recommended": true
        }
      ]
    },
    "confirm": {
      "status": "pending | completed",
      "selected_option": 1,
      "notes": "user-provided notes if any"
    },
    "fix": {
      "status": "pending | in_progress | completed",
      "changed_files": ["list of modified files"]
    },
    "verify": {
      "status": "pending | in_progress | completed | failed",
      "commands_run": ["validation commands executed"],
      "result": "pass | fail",
      "notes": "verification details",
      "external_action": {
        "requested": false,
        "authorized_action": "exact retry/deploy/publish/rollback action or null",
        "authorized_target": "exact provider/project/environment/target or null",
        "preflight": "pass | fail | not_run",
        "rollback_or_stop": "rollback or stop condition or null",
        "post_check": "defined post-action check or null"
      }
    }
  }
}
```

## Status values

| Status | Meaning |
|--------|---------|
| `pending` | Phase not yet started |
| `in_progress` | Phase currently active |
| `completed` | Phase finished successfully |
| `failed` | Phase failed (verify only) |
| `blocked` | Waiting on external input (overall status only) |

## Rules

- Set `current_phase` to the first phase with status `in_progress` or `pending`.
- Update `updated_at` on every write.
- When all phases are `completed`, set top-level `status` to `completed`.
- If `verify` fails, set its status to `failed` and fix within scope before retrying.
- Before resume, require `skill: deploy-fix`, `complexity: complex`, a matching current request/scope/target, valid phase statuses, and a non-completed top-level status. Treat malformed, stale, cross-workspace, conflicting, or completed state as non-resumable until reconciled.
- Never inherit user confirmation or external-action permission from a previous or interrupted flow. Reconfirm before `fix` when selection is ambiguous and before every remote/production action.
- Allow at most three materially different failed repair approaches. After the third failure, set top-level `status` to `blocked`, preserve attempt evidence, and stop for one precise input.
- The `id` uses the creation timestamp: `deploy-fix-20260327-100000`.

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
