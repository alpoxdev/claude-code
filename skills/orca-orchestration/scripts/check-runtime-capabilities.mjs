#!/usr/bin/env bun
// @ts-check
/** @typedef {{ name: string, command: string, args: string[], requiredTokens: string[], parseJson?: boolean, informational?: boolean }} Probe */
/** @typedef {{ name: string, command: string, status: 'passed' | 'failed' | 'skipped', exitCode: number | null, observations: Record<string, unknown>, missingTokens: string[], error?: string }} ProbeResult */

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const checkOrcaStatus = args.includes('--check-orca-status')

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: bun scripts/check-runtime-capabilities.mjs [--check-orca-status] [--json]

Runs bounded read-only version/help probes for Orca, OMO, and GJC. It never runs auth
commands, prints credentials, creates terminals, or sends prompts. --check-orca-status adds
an informational live runtime readiness probe that becomes required when explicitly selected.`)
  process.exit(0)
}

const unknown = args.filter((arg) => !['--json', '--check-orca-status'].includes(arg))
if (unknown.length > 0) {
  console.error(`Unknown argument: ${unknown[0]}`)
  process.exit(2)
}

/** @type {Probe[]} */
const probes = [
  { name: 'orca-help', command: 'orca', args: ['--help'], requiredTokens: ['orchestration worker-start', 'orchestration dispatch-show', 'terminal wait'] },
  { name: 'orca-worker-start-help', command: 'orca', args: ['orchestration', 'worker-start', '--help'], requiredTokens: ['--task', '--agent', '--terminal', '--model', '--effort'] },
  { name: 'orca-dispatch-show-help', command: 'orca', args: ['orchestration', 'dispatch-show', '--help'], requiredTokens: ['--task', '--preamble'] },
  { name: 'orca-worker-release-help', command: 'orca', args: ['orchestration', 'worker-release', '--help'], requiredTokens: ['--dispatch', 'settled supervised worker'] },
  { name: 'omo-version', command: 'omo', args: ['--version'], requiredTokens: ['omo'] },
  { name: 'omo-help', command: 'omo', args: ['--help'], requiredTokens: ['--model', '--thinking', '--permission-preset', '--no-model-fallback'] },
  { name: 'gjc-version', command: 'gjc', args: ['--version'], requiredTokens: ['gjc'] },
  { name: 'gjc-launch-help', command: 'gjc', args: ['launch', '--help'], requiredTokens: ['--model', '--thinking', '--mpreset', '--credential', '--prefer-credential'] },
  { name: 'gjc-accounts-help', command: 'gjc', args: ['accounts', '--help'], requiredTokens: ['list|check|pin|logout', '--json', '--persistent'] },
  { name: 'orca-check-help', command: 'orca', args: ['orchestration', 'check', '--help'], requiredTokens: ['--wait', '--types', '--ack'] },
  { name: 'orca-worker-show-help', command: 'orca', args: ['orchestration', 'worker-show', '--help'], requiredTokens: ['--dispatch'] },
  { name: 'orca-worker-read-help', command: 'orca', args: ['orchestration', 'worker-read', '--help'], requiredTokens: ['--dispatch', '--limit'] },
  { name: 'orca-send-help', command: 'orca', args: ['orchestration', 'send', '--help'], requiredTokens: ['--to', '--type'] },
  { name: 'orca-terminal-read-help', command: 'orca', args: ['terminal', 'read', '--help'], requiredTokens: ['--cursor', '--screen'] },
]
if (checkOrcaStatus) {
  probes.push({ name: 'orca-status', command: 'orca', args: ['status', '--json'], requiredTokens: [], parseJson: true })
}

/** @param {ReadableStream<Uint8Array>} stream @returns {Promise<string>} */
const readStream = async (stream) => new Response(stream).text()

/** @param {Probe} probe @returns {Promise<ProbeResult>} */
const runProbe = async (probe) => {
  /** @type {import('bun').Subprocess} */
  let child
  try {
    child = Bun.spawn({
      cmd: [probe.command, ...probe.args],
      cwd: process.cwd(),
      env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
  } catch (error) {
    return { name: probe.name, command: [probe.command, ...probe.args].join(' '), status: 'failed', exitCode: null, observations: {}, missingTokens: probe.requiredTokens, error: error instanceof Error ? error.message : String(error) }
  }
  const timer = setTimeout(() => child.kill('SIGTERM'), 15_000)
  const stdoutPromise = typeof child.stdout === 'number' || child.stdout === undefined ? Promise.resolve('') : readStream(child.stdout)
  const stderrPromise = typeof child.stderr === 'number' || child.stderr === undefined ? Promise.resolve('') : readStream(child.stderr)
  const [exitCode, stdout, stderr] = await Promise.all([child.exited, stdoutPromise, stderrPromise])
  clearTimeout(timer)
  const output = `${stdout}\n${stderr}`.trim()
  const missingTokens = probe.requiredTokens.filter((token) => !output.includes(token))
  /** @type {Record<string, unknown>} */
  const observations = { outputFirstLine: output.split(/\r?\n/)[0] ?? '' }
  if (probe.parseJson) {
    try {
      const parsed = JSON.parse(output)
      observations.runtimeState = parsed?.result?.runtime?.state ?? null
      observations.runtimeReachable = parsed?.result?.runtime?.reachable ?? null
      observations.appVersion = parsed?.result?.runtime?.appVersion ?? null
      if (observations.runtimeState !== 'ready' || observations.runtimeReachable !== true) missingTokens.push('runtime:ready-and-reachable')
    } catch {
      missingTokens.push('valid-json')
    }
  }
  return {
    name: probe.name,
    command: [probe.command, ...probe.args].join(' '),
    status: exitCode === 0 && missingTokens.length === 0 ? 'passed' : 'failed',
    exitCode,
    observations,
    missingTokens,
  }
}

const results = await Promise.all(probes.map(runProbe))
const result = {
  schemaVersion: 1,
  ok: results.every((probe) => probe.status === 'passed'),
  mode: checkOrcaStatus ? 'capabilities-and-runtime' : 'capabilities-only',
  safety: { authCommandsRun: false, credentialOutputRequested: false, terminalsCreated: false, promptsSent: false },
  results,
}
if (asJson) console.log(JSON.stringify(result, null, 2))
else {
  for (const probe of results) console.log(`${probe.status}: ${probe.name}`)
  console.log(result.ok ? 'runtime capability check passed' : 'runtime capability check failed')
}
process.exit(result.ok ? 0 : 1)
