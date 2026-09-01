#!/usr/bin/env bun
// @ts-check
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, relative, resolve, sep } from 'node:path'

/** @typedef {{ id?: unknown, category?: unknown, language?: unknown, risk?: unknown, intent?: unknown, shouldTrigger?: unknown, context?: { files?: unknown, sources?: unknown }, expected?: { route?: unknown, checkpoint?: unknown, must?: unknown, must_not?: unknown, trace?: unknown } }} EvalRow */
/** @typedef {{ schemaVersion: 1, ok: boolean, root: string, evals: string, checks: string[], errors: string[] }} ValidationResult */

const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: bun scripts/validate-orca-orchestration.mjs [--root <path>] [--evals <path>] [--json]

Validates the orca-orchestration package contract, bilingual resources, links, source dates,
and JSONL eval fixture. Empty fixtures are rejected with the single diagnostic evals_empty.`)
  process.exit(0)
}

const valueFlags = new Set(['--root', '--evals'])
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (valueFlags.has(arg)) {
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      console.error(`${arg} requires a value`)
      process.exit(2)
    }
    index += 1
  } else if (arg !== '--json') {
    console.error(`Unknown argument: ${arg}`)
    process.exit(2)
  }
}

/** @param {string} name @param {string} fallback */
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index === -1 ? fallback : (args[index + 1] ?? fallback)
}

const root = resolve(option('--root', resolve(import.meta.dirname, '..')))
const configuredEvals = resolve(root, option('--evals', 'assets/evals/agent-launch-policy.jsonl'))
const evalsPath = existsSync(configuredEvals) && statSync(configuredEvals).isDirectory()
  ? resolve(configuredEvals, 'agent-launch-policy.jsonl')
  : configuredEvals
const asJson = args.includes('--json')
/** @type {string[]} */
const errors = []
/** @type {string[]} */
const checks = []

/** @param {string} path */
const requireFile = (path) => {
  if (!existsSync(path) || !statSync(path).isFile()) {
    errors.push(`missing_file:${relative(root, path)}`)
    return ''
  }
  checks.push(`file:${relative(root, path)}`)
  return readFileSync(path, 'utf8')
}

/** @param {string} directory @returns {string[]} */
const markdownFiles = (directory) => {
  /** @type {string[]} */
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...markdownFiles(path))
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path)
  }
  return files.sort()
}

/** @param {string} path */
const posix = (path) => path.split(sep).join('/')

/** @returns {void} */
const validateLocalLinks = () => {
  for (const file of markdownFiles(root)) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].trim().split(/\s+/)[0].split('#')[0]
      if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue
      const destination = resolve(dirname(file), target)
      if (!existsSync(destination) || !statSync(destination).isFile()) {
        errors.push(`broken_local_link:${posix(relative(root, file))}:${target}`)
      }
    }
  }
  checks.push('markdown:local-links')
}

const canonicalMarkdown = [
  'SKILL.md',
  'rules/agent-selection.md',
  'references/runtime-cli-evidence.md',
]

for (const file of canonicalMarkdown) {
  const source = requireFile(resolve(root, file))
  const koreanPath = file.replace(/\.md$/, '.ko.md')
  const korean = requireFile(resolve(root, koreanPath))
  if (!source || !korean) continue
  const sourceHeadings = [...source.matchAll(/^## /gm)].length
  const koreanHeadings = [...korean.matchAll(/^## /gm)].length
  const sourceFences = [...source.matchAll(/^```/gm)].length
  const koreanFences = [...korean.matchAll(/^```/gm)].length
  if (sourceHeadings !== koreanHeadings) errors.push(`heading_parity:${file}`)
  if (sourceFences !== koreanFences || sourceFences % 2 !== 0 || koreanFences % 2 !== 0) {
    errors.push(`fence_parity:${file}`)
  }
}
checks.push('markdown:bilingual-parity')

const skill = requireFile(resolve(root, 'SKILL.md'))
const koreanSkill = requireFile(resolve(root, 'SKILL.ko.md'))
const expectedName = basename(root)
if (expectedName !== 'orca-orchestration') errors.push(`folder_name:${expectedName}`)
if (!/^---\nname: orca-orchestration\n/m.test(skill)) errors.push('frontmatter:name')
if (!/^---\nname: orca-orchestration\n/m.test(koreanSkill)) errors.push('korean_frontmatter:name')
for (const required of [
  'Use this skill when supervised Orca multi-agent coordination',
  'scripts/validate-orca-orchestration.mjs',
  'scripts/check-runtime-capabilities.mjs',
  'scripts/verify-orca-orchestration.mjs',
  'worker-start --task <task-id> --agent <registered-agent>',
  'do not pre-create the same native worker',
  'explicit override becomes the effective worker',
  'agent for that Task',
  'Custom CLI delivery invariant',
  'Terminal creation is not task delivery.',
  '## Parent-owned child session cleanup',
  'No-loop boundary',
]) {
  if (!skill.includes(required)) errors.push(`core_missing:${required}`)
}
for (const required of [
  'worker-start --task <task-id> --agent <registered-agent>',
  '같은',
  'native worker를',
  '`worktree create --agent`로 미리 만들지 않습니다.',
  '이 명시적 override는 해당 Task의 유효 worker agent',
  'Custom CLI 전달 불변식',
  '## 부모가 소유한 자식 session 정리',
]) {
  if (!koreanSkill.includes(required)) errors.push(`korean_core_missing:${required}`)
}
checks.push('core:contract')

const reference = requireFile(resolve(root, 'references/runtime-cli-evidence.md'))
const today = new Date().toISOString().slice(0, 10)
for (const match of reference.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
  if (match[1] > today) errors.push(`future_evidence_date:${match[1]}`)
}
checks.push('reference:dates')

let rawEvals = ''
try {
  rawEvals = readFileSync(evalsPath, 'utf8')
  checks.push(`file:${posix(relative(root, evalsPath))}`)
} catch {
  errors.push(`missing_file:${posix(relative(root, evalsPath))}`)
}
/** @type {EvalRow[]} */
const rows = []
for (const [index, line] of rawEvals.split(/\r?\n/).entries()) {
  if (!line.trim()) continue
  try {
    const parsed = JSON.parse(line)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      errors.push(`invalid_jsonl_object:${index + 1}`)
    } else {
      rows.push(/** @type {EvalRow} */ (parsed))
    }
  } catch {
    errors.push(`invalid_jsonl:${index + 1}`)
  }
}
if (rows.length === 0) errors.push('evals_empty')
const ids = new Set()
const validCategories = new Set(['positive', 'negative', 'boundary', 'edge', 'workflow', 'adversarial', 'regression'])
const validRisks = new Set(['smoke', 'targeted', 'standard', 'thorough', 'high-stakes'])
const validRoutes = new Set(['target', 'handoff', 'ask', 'block'])

/** @param {EvalRow} row */
const validateScenarioContract = (row) => {
  const id = typeof row.id === 'string' ? row.id : 'unknown'
  const category = typeof row.category === 'string' ? row.category : ''
  const language = typeof row.language === 'string' ? row.language : ''
  const risk = typeof row.risk === 'string' ? row.risk : ''
  const route = typeof row.expected?.route === 'string' ? row.expected.route : ''
  if (!validCategories.has(category)) errors.push(`invalid_category:${id}`)
  if (!['ko', 'en'].includes(language)) errors.push(`invalid_language:${id}`)
  if (!validRisks.has(risk)) errors.push(`invalid_risk:${id}`)
  if (typeof row.intent !== 'string' || !row.intent.trim()) errors.push(`invalid_intent:${id}`)
  if (!row.context || !Array.isArray(row.context.files) || !Array.isArray(row.context.sources)) {
    errors.push(`invalid_context:${id}`)
  }
  if (['positive', 'negative', 'boundary'].includes(category) && ![true, false, 'depends'].includes(/** @type {boolean | string} */ (row.shouldTrigger))) {
    errors.push(`invalid_should_trigger:${id}`)
  }
  if (!validRoutes.has(route)) errors.push(`invalid_route:${id}`)
  if (typeof row.expected?.checkpoint !== 'string' || !row.expected.checkpoint.trim()) errors.push(`invalid_checkpoint:${id}`)
  if (!Array.isArray(row.expected?.must) || !Array.isArray(row.expected?.must_not)) errors.push(`invalid_expectations:${id}`)
  if (!Array.isArray(row.expected?.trace)) errors.push(`invalid_trace:${id}`)
}

for (const row of rows) {
  const id = typeof row.id === 'string' ? row.id : 'unknown'
  if (id === 'unknown' || ids.has(id)) errors.push(`invalid_or_duplicate_id:${id}`)
  ids.add(id)
  validateScenarioContract(row)
}
if (rows.length > 0) {
  for (const category of validCategories) {
    if (!rows.some((row) => row.category === category)) errors.push(`missing_eval_category:${category}`)
  }
  if (rows.filter((row) => row.category === 'positive').length < 3) errors.push('insufficient_positive_evals')
  if (rows.filter((row) => row.category === 'negative').length < 2) errors.push('insufficient_negative_evals')
  if (rows.filter((row) => row.category === 'boundary').length < 2) errors.push('insufficient_boundary_evals')
  if (rows.filter((row) => row.category === 'edge').length < 2) errors.push('insufficient_edge_evals')
  if (!rows.some((row) => row.language === 'ko')) errors.push('missing_korean_eval')
  for (const id of [
    'boundary-explicit-cross-agent',
    'regression-origin-omo-affinity',
    'regression-origin-claude-affinity',
    'regression-custom-omo-delivery-states',
    'regression-first-class-codex-worker-start',
    'regression-live-preamble-already-contains-task',
    'regression-parent-settles-native-child',
    'regression-parent-preserves-user-owned-omo',
    'regression-parent-closes-created-custom-child',
    'regression-stall-single-nudge',
    'regression-native-retry-of-once',
    'regression-custom-stall-no-auto-redispatch',
    'regression-wait-timeout-is-checkpoint',
  ]) {
    if (!ids.has(id)) errors.push(`missing_regression:${id}`)
  }
}
checks.push(`evals:${rows.length}`)

const selectionRule = requireFile(resolve(root, 'rules/agent-selection.md'))
const koreanSelectionRule = requireFile(resolve(root, 'rules/agent-selection.ko.md'))
for (const required of [
  'worker-start --task <task-id> --agent <id>',
  'Do not pre-create',
  '`worktree create --agent`',
  'effective worker agent',
  'fallback to a',
  'third agent',
  '## Unregistered CLI custom-dispatch worker path',
  'dispatch-show --task <task-id> --preamble --json',
  '## Parent cleanup responsibility',
]) {
  if (!selectionRule.includes(required)) errors.push(`selection_rule_missing:${required}`)
}
for (const required of [
  'worker-start --task <task-id> --agent <id>',
  '같은 worker를',
  '`worktree create --agent`로 미리 만들지 않으며',
  '유효 worker agent',
  '제3의 agent로 대체하거나',
  '## 미등록 CLI custom-dispatch 워커 경로',
  '## 부모 정리 책임',
]) {
  if (!koreanSelectionRule.includes(required)) errors.push(`korean_selection_rule_missing:${required}`)
}
checks.push('rules:selection-contract')

validateLocalLinks()
for (const stray of ['SKILL.backup.md', 'SKILL.backup.ko.md', 'README.md', 'CHANGELOG.md', 'QUICK_REFERENCE.md']) {
  if (existsSync(resolve(root, stray))) errors.push(`stray_file:${stray}`)
}
checks.push('package:no-stray-files')

/** @type {ValidationResult} */
const result = {
  schemaVersion: 1,
  ok: errors.length === 0,
  root: posix(root),
  evals: posix(evalsPath),
  checks,
  errors,
}
if (asJson) console.log(JSON.stringify(result, null, 2))
else console.log(result.ok ? 'orca-orchestration validation passed' : `orca-orchestration validation failed\n${errors.join('\n')}`)
process.exit(result.ok ? 0 : 1)
