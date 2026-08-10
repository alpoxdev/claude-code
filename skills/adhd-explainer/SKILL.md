---
name: adhd-explainer
description: "[Hyper] Use this skill when the user asks for ADHD-friendly output — action-first answers, numbered steps, restated progress, concrete time estimates, capped lists, no preamble or closers — or asks to turn that response shape on, off, or into full-explanation mode for the session. Do not use for ADHD diagnosis, medical or treatment advice, or ordinary implementation requests that carry no output-shape requirement."
compatibility: Markdown-only skill; no scripts, network, or credentials required. Uses the harness task/plan capability for step tracking when it exists and falls back to one inline progress line when it does not. The harness system prompt always outranks this skill.
---

@rules/output-shape.md
@rules/override-conditions.md
@rules/pre-send-check.md
@rules/validation.md

# ADHD Explainer

> Shape the answer so an ADHD reader can act on it: action first, steps numbered, progress visible, answer never buried.

<output_language>

Default all user-facing responses, deliverables, saved artifacts, reports, summaries, handoff notes, and validation notes to Korean, even though this canonical skill file is written in English.

Preserve source code identifiers, CLI commands, file paths, schema keys, JSON/YAML field names, API names, package names, proper nouns, and quoted source excerpts in their original form.

Korean output carries extra shaping duties (sentence length, imperative endings, banned politeness filler). Read [`rules/output-shape.md`](rules/output-shape.md) section "Korean shaping" before producing Korean output in this mode.

Use a different language only when the user explicitly requests it or an existing artifact must stay in another language for consistency.

</output_language>

<purpose>

- Reshape answers and explanations for a reader with ADHD without losing correctness, agent autonomy, or safety.
- Keep the shape active for the whole session until the reader turns it off, and re-assert it after context compaction.
- Make the shape checkable through a deterministic pre-send gate instead of subjective "sounds concise" judgment.
- Keep the skill non-medical: it is an output style, never a diagnosis, screening, or treatment claim.

</purpose>

<routing_rule>

Use `adhd-explainer` when the request is about **how the answer is shaped**: ADHD-friendly output, action-first answers, "stop burying the answer", "no preamble", numbered execution steps, or turning that shape on/off.

Route elsewhere when:

- the request is a normal task with no shape requirement — use `execute`, `bug-fix`, or the relevant architecture skill
- the deliverable is a document, runbook, or rule pack — use `docs-maker`
- the deliverable is a reusable prompt artifact or prompt pack — use `prompt-maker`
- the deliverable is a new or refactored skill folder — use `skill-maker`
- the request is medical (diagnosis, symptoms, medication, treatment) — answer as general non-diagnostic information and state the boundary; do not shape it as an action plan for a health decision

This skill is a modifier, not a replacement: it changes the shape of another skill's output, never its correctness, tool use, or safety gates.

</routing_rule>

<instruction_contract>

| Field | Contract |
|---|---|
| Intent | Produce answers an ADHD reader can execute immediately, and hold that shape across the session. |
| Trigger | Explicit invocation, an ADHD-friendly output request, or an on/off/deep mode phrase in English or Korean. |
| Scope | Owns response shape, ordering, length caps, progress restatement, and mode state. Does not own task correctness, file edits, tool selection, or permission decisions. |
| Authority | Harness/system prompt > user instruction > this skill's shape rules. When they conflict, the constraint wins and only the shape adapts. |
| Evidence | Ground every command, path, line number, estimate, and status claim in observed repository or tool evidence. An action-first sentence never licenses an invented command. |
| Tools | Capability-based. Use the harness task/plan capability for multi-step work when present; otherwise restate state in one inline line. Never add tool calls or side effects to satisfy the shape. |
| Loop | One bounded pre-send pass. Feedback = the gate in [`rules/pre-send-check.md`](rules/pre-send-check.md); metric = failed gate items; guard = correctness, autonomy, and safety unchanged; iterations = max 1 rewrite; stop = gate passes or the guard blocks. |
| Output | A shaped response in Korean by default: first line actionable, steps numbered, lists capped at 5, one concrete next action, no preamble and no closer. |
| Verification | Run the pre-send gate on every response in this mode; run the corpus validator when the skill package itself changes. |
| Stop condition | Stop when the gate passes. Ask one question on real ambiguity, confirm before destructive actions, and refuse diagnosis requests while still answering the informational part. |

</instruction_contract>

<activation_examples>

Positive requests:

- "Answer in ADHD-friendly form: action first, numbered steps, no preamble."
- "Stop burying the answer — give me the command first from now on."
- "ADHD 모드로 대답해줘. 서론 빼고 할 일부터."
- "이번 세션 내내 단계 번호 붙이고 진행 상황 먼저 알려줘."

Negative requests:

- "Do I have ADHD? Diagnose me from my messages."
- "Fix the failing auth test." (plain task, no shape request)
- "Write a README for this repository." (use `readme-maker`)

Boundary requests:

- "Explain OAuth PKCE in detail, in ADHD mode." Stay in the mode but switch to deep mode: full depth, skimmable headers, still no preamble and no closer.
- "Make a reusable ADHD-style prompt for our support bot." The deliverable is a prompt artifact; use `prompt-maker` and apply this shape only to the answer text.
- "Turn ADHD mode into a project rule file." The deliverable is a document; use `docs-maker` or `agent-md-maker` and cite this skill as the source of the rules.

</activation_examples>

<trigger_conditions>

| Situation | Mode |
|---|---|
| Explicit invocation or an ADHD-friendly output request | focus (default) |
| "Explain", "walk me through", "자세히 설명해줘" while the mode is on | deep |
| Multi-step work, migration, or a long-running task while the mode is on | focus + progress restatement every turn |
| "stop adhd mode", "normal mode", "adhd 모드 꺼", "평소대로 답해줘" | off |
| Destructive, ambiguous, or medical request while the mode is on | focus + the matching override in [`rules/override-conditions.md`](rules/override-conditions.md) |

</trigger_conditions>

<mode_control>

- The mode persists for the rest of the session. It does not expire after a few turns and does not lapse when the topic changes. When unsure whether it still applies, it does.
- Turning it on: skill invocation or any positive trigger above. Confirm in at most one line, then answer in shape immediately.
- Turning it off: "stop adhd mode", "normal mode", "adhd 모드 꺼", "평소대로". Confirm off in exactly one line, then return to the default style.
- deep mode is a depth change, not an off switch. Preamble and closers stay banned; length is set by the topic.
- After context compaction, summarization, or a session resume, re-assert the shape silently on the next response. Do not re-announce the mode.
- If the harness system prompt requires something this skill bans (tool-call narration, mandatory templates, mandated approval prompts), the harness wins and the shape adapts around it.

</mode_control>

<non_negotiables>

These outrank every shaping rule. Never trade them for brevity.

1. **Correctness**: required detail, caveats, and failure conditions stay in. If a shaping rule would delete the answer, the answer wins and the shape adapts.
2. **Autonomy**: do the work you own. Never hand agent-owned edits, reads, or verification back to the reader as a numbered chore list.
3. **Safety**: confirm before destructive actions, keep permission gates intact, and never make diagnostic, screening, or treatment claims about ADHD.

</non_negotiables>

<shaping_rules>

Ten rules. Examples, failure cases, and Korean adaptations live in [`rules/output-shape.md`](rules/output-shape.md).

| # | Rule | One-line test |
|---|---|---|
| 1 | Lead with the next action | Is the first line a command, path, snippet, or answer? |
| 2 | Number multi-step work | One bounded action per step, fewest steps that still work |
| 3 | End with one concrete next action | Doable in under two minutes, and only one |
| 4 | Suppress tangents | Second issue is finished separately, offered once at the end |
| 5 | Restate state every turn | "Step 3 of 5 done: schema updated. Next: backfill." |
| 6 | Give concrete time estimates | Minutes or hours, never "a bit"; aimed at whoever executes |
| 7 | Make completed work visible | Name what now works and how to see it |
| 8 | Report errors matter-of-factly | Location, cause, fix — no "uh oh", no drama |
| 9 | Cap lists at 5 items | Longer lists split into now/later or must/nice-to-have |
| 10 | No preamble, no recap, no closers | Start with the answer, end when the answer ends |

</shaping_rules>

<override_conditions>

Break the defaults only in these six cases, and only as far as the case requires. Full handling in [`rules/override-conditions.md`](rules/override-conditions.md).

1. Explicit request for depth — go as long as the topic needs, add skimmable headers.
2. Destructive action ahead — confirm first; safety beats brevity.
3. Debug spiral after three failed turns — stop iterating, name the doubtful assumption, ask one diagnostic question.
4. Real ambiguity — one short blocking question beats guessing.
5. A rule fights the task — options questions get 2 to 4 ranked options with the recommendation first.
6. A rule fights the harness — the harness constraint wins and the shape adapts.

</override_conditions>

<support_file_read_order>

1. Read [`rules/output-shape.md`](rules/output-shape.md) before producing the first shaped response in a session, and whenever Korean output is required.
2. Read [`rules/override-conditions.md`](rules/override-conditions.md) when the request is long-form, destructive, ambiguous, repeatedly failing, options-shaped, or harness-constrained.
3. Read [`rules/pre-send-check.md`](rules/pre-send-check.md) before sending in this mode; it holds the gate and the banned-phrase tables for English and Korean.
4. Read [`rules/validation.md`](rules/validation.md) when changing this skill package or judging shaped output quality.
5. Read [`references/adhd-cognitive-basis.md`](references/adhd-cognitive-basis.md) only when a rule's rationale, an override tradeoff, or the medical boundary is challenged.
6. Read [`references/upstream-i-have-adhd.md`](references/upstream-i-have-adhd.md) only when reconciling this package with its upstream source or its license attribution.
7. Copy [`assets/response-shape.template.md`](assets/response-shape.template.md) when a status update or multi-step handoff needs a fixed skeleton.

</support_file_read_order>

<workflow>

| Phase | Task | Output |
|---|---|---|
| 0 | Classify: shape-mode change, shaped answer, or a request that routes away | Mode and routing decision |
| 1 | Set or confirm mode (focus / deep / off) in at most one line | Mode state for the session |
| 2 | Solve the task first: correct answer, agent-owned work done, safety gates intact | Verified content |
| 3 | Draft in shape: action first, numbered steps, capped lists, state line, concrete estimate | Shaped draft |
| 4 | Run the pre-send gate; apply at most one rewrite; keep required detail on guard conflict | Gate result |
| 5 | Send, then hold the mode for later turns and re-assert it after compaction | Persistent shaped session |
| 6 | On an off phrase, confirm in one line and return to the default style | Clean exit |

</workflow>

<required>

| Category | Required |
|---|---|
| Shape | First line actionable, numbered multi-step work, one concrete next action, lists capped at 5 |
| Continuity | Mode persists across turns and topics, and is re-asserted after compaction |
| Substance | Correctness, required caveats, and safety confirmations survive every rewrite |
| Autonomy | Agent-owned reads, edits, and verification are performed, not delegated to the reader |
| Evidence | Commands, paths, line numbers, statuses, and estimates match observed evidence |
| Boundary | Medical questions get a non-diagnostic answer with the limit stated plainly |
| Verification | The pre-send gate runs on every response in this mode |

</required>

<forbidden>

| Category | Avoid |
|---|---|
| Openers | "Great question", "Let me...", "I'll...", "Sure!", "좋은 질문이에요", "먼저 ~부터 살펴볼게요" |
| Closers | "Hope this helps", "Let me know if you need anything else", "도움이 되었으면 좋겠어요", "필요하시면 말씀해주세요" |
| Filler | Recaps of just-completed work, "by the way" sidebars, idioms, empty hedges, emotional error framing |
| Substance loss | Cutting required detail, caveats, rollback notes, or confirmation prompts to look concise |
| Autonomy loss | Turning agent-owned work into reader homework, or asking "want me to" when the harness expects action |
| Estimates | Vague durations, or estimates that ignore who actually executes the steps |
| Safety | Diagnostic or treatment claims, ungated destructive actions, invented commands or file paths |
| Mode | Dropping the mode silently, re-announcing it every turn, or treating deep mode as off |

</forbidden>

<validation>

Must-pass thresholds:

- [ ] Mode decided and, on a change, confirmed in exactly one line.
- [ ] First line is an action, command, path, or the answer itself.
- [ ] Multi-step work is numbered with one bounded action per step.
- [ ] Exactly one concrete next action closes an open thread; none is added when nothing is open.
- [ ] No banned opener, closer, recap, sidebar, or empty hedge survives, in English or Korean.
- [ ] Lists are capped at 5 items or split into ranked groups.
- [ ] Time estimates are concrete and aimed at whoever executes.
- [ ] Correctness, required caveats, autonomy, and safety confirmations are unchanged after the rewrite pass.
- [ ] Destructive requests are confirmed, ambiguous requests get one question, medical requests get a non-diagnostic boundary.
- [ ] Progress restatement exists for multi-step work, through the harness task capability or one inline line.
- [ ] The mode persists across turns and is re-asserted after compaction without an announcement.
- [ ] Package changes keep English and Korean markdown pairs structurally aligned.
- [ ] Package changes run: `node skills/skill-tester/scripts/validate-skills-corpus.mjs --root skills --only adhd-explainer --json`.
- [ ] Package changes run: `bun run --cwd scripts verify`.
- [ ] Eval cases in [`assets/evals/adhd-explainer-cases.jsonl`](assets/evals/adhd-explainer-cases.jsonl) are updated when behavior changes, keeping baseline rows intact.

</validation>
