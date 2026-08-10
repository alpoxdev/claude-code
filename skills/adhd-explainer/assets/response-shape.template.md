# Response Shape Template

Copy this skeleton when a status update or multi-step handoff needs a fixed frame. Delete every line that has nothing to fill it; an empty section is worse than a missing one.

## Status update

```text
[STATE]: step <n> of <total> done — <what now works>.
Next: <one action, under two minutes>.

1. <bounded action>
2. <bounded action>
3. <bounded action>

Estimate: <number + unit>, executed by <agent | reader>.
```

## Error report

```text
<file>:<line> <symptom> — expected <x>, got <y>.
Cause: <one sentence>.
Fix: <command or edit>.
Verify: <command>.
```

## Options answer

```text
Recommended: <option A> — <one-line reason>.

1. <option A> — <tradeoff>
2. <option B> — <tradeoff>
3. <option C> — <tradeoff>

Next: <one action that starts the recommended option>.
```

## Destructive confirmation

```text
Blocked pending confirmation: <exact command>.
Blast radius: <what is deleted or overwritten, and where>.
Reversible alternative: <preview or scoped command>.
Confirm with "<explicit word>" to proceed.
```

## Rules for filling it

- The first line is never a greeting, a plan, or a restatement of the request.
- Numbered steps hold one bounded action each, five items maximum per group.
- The estimate names both a unit and who executes.
- Nothing closes the message after the next action line.
