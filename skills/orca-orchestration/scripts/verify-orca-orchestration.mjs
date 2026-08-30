#!/usr/bin/env bun
// @ts-check
import { resolve } from 'node:path'

/** @typedef {{ name: string, status: 'passed' | 'failed' | 'skipped', exitCode: number | null, result: unknown, error?: string }} CheckResult */

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const includeRuntime = args.includes('--runtime')

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: bun scripts/verify-orca-orchestration.mjs [--root <path>] [--runtime] [--json]

Runs the package validator happy path and an isolated empty-fixture rejection. --runtime adds
the read-only capability checker plus Orca status. Child stdout is captured so --json emits
one aggregate document.`)
  process.exit(0)
}

const valueFlags = new Set(['--root'])
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]
  if (valueFlags.has(arg)) {
    const value = args[index + 1]
    if (!value || value.startsWith('--')) {
      console.error(`${arg} requires a value`)
      process.exit(2)
    }
    index += 1
  } else if (!['--json', '--runtime'].includes(arg)) {
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
const validator = resolve(root, 'scripts/validate-orca-orchestration.mjs')
const runtimeChecker = resolve(root, 'scripts/check-runtime-capabilities.mjs')

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

/** @param {ReadableStream<Uint8Array>} stream @returns {Promise<string>} */
const readStream = async (stream) => new Response(stream).text()

/** @param {string} name @param {string} script @param {string[]} scriptArgs @param {(exitCode: number | null, parsed: unknown) => boolean} accept @returns {Promise<CheckResult>} */
const run = async (name, script, scriptArgs, accept) => {
  /** @type {import('bun').Subprocess} */
  let child
  try {
    child = Bun.spawn({
      cmd: [process.execPath, script, ...scriptArgs],
      cwd: process.cwd(),
      env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
  } catch (error) {
    return { name, status: 'failed', exitCode: null, result: null, error: error instanceof Error ? error.message : String(error) }
  }
  const timer = setTimeout(() => child.kill('SIGTERM'), 120_000)
  const stdoutPromise = typeof child.stdout === 'number' || child.stdout === undefined ? Promise.resolve('') : readStream(child.stdout)
  const stderrPromise = typeof child.stderr === 'number' || child.stderr === undefined ? Promise.resolve('') : readStream(child.stderr)
  const [exitCode, stdout, stderr] = await Promise.all([child.exited, stdoutPromise, stderrPromise])
  clearTimeout(timer)
  /** @type {unknown} */
  let parsed = null
  try {
    parsed = JSON.parse(stdout)
  } catch {
    return { name, status: 'failed', exitCode, result: null, error: `invalid_json:${stdout.slice(0, 120)}:${stderr.slice(0, 120)}` }
  }
  return {
    name,
    status: accept(exitCode, parsed) ? 'passed' : 'failed',
    exitCode,
    result: parsed,
  }
}

/** @type {CheckResult[]} */
const checks = []
checks.push(await run('package', validator, ['--root', root, '--evals', 'assets/evals/agent-launch-policy.jsonl', '--json'], (exitCode, parsed) => exitCode === 0 && isRecord(parsed) && parsed.ok === true))
checks.push(await run('malformed-empty-fixture', validator, ['--root', root, '--evals', '/dev/null', '--json'], (exitCode, parsed) => exitCode === 1 && isRecord(parsed) && parsed.ok === false && Array.isArray(parsed.errors) && parsed.errors.length === 1 && parsed.errors[0] === 'evals_empty'))
if (includeRuntime) {
  checks.push(await run('runtime-capabilities', runtimeChecker, ['--check-orca-status', '--json'], (exitCode, parsed) => exitCode === 0 && isRecord(parsed) && parsed.ok === true))
} else {
  checks.push({ name: 'runtime-capabilities', status: 'skipped', exitCode: null, result: { reason: 'enable with --runtime' } })
}

const result = {
  schemaVersion: 1,
  ok: checks.every((check) => check.status === 'passed' || check.status === 'skipped'),
  root,
  checks,
}
if (asJson) console.log(JSON.stringify(result, null, 2))
else {
  for (const check of checks) console.log(`${check.status}: ${check.name}`)
  console.log(result.ok ? 'orca-orchestration verification passed' : 'orca-orchestration verification failed')
}
process.exit(result.ok ? 0 : 1)
