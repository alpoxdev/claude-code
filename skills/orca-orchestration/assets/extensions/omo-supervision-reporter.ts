// @orca-managed-pi-extension

const HEARTBEAT_INTERVAL_MS = 5 * 60_000
const SEND_TIMEOUT_MS = 1_000

type SpawnedProcess = {
  readonly kill: (signal: string) => void
  readonly once: (event: 'close' | 'error', listener: () => void) => void
  readonly unref: () => void
}

type ChildProcessBuiltin = {
  readonly execFileSync: (file: string, args: readonly string[], options: { readonly encoding: 'utf8' }) => string
  readonly spawn: (command: string, args: readonly string[], options: { readonly stdio: 'ignore' }) => SpawnedProcess
}

function isChildProcessBuiltin(value: unknown): value is ChildProcessBuiltin {
  return (
    value !== null &&
    typeof value === 'object' &&
    'execFileSync' in value &&
    typeof value.execFileSync === 'function' &&
    'spawn' in value &&
    typeof value.spawn === 'function'
  )
}

function getChildProcessBuiltin(): ChildProcessBuiltin | null {
  const builtin: unknown = process.getBuiltinModule?.('child_process')
  return isChildProcessBuiltin(builtin) ? builtin : null
}

function isAncestorProcess(ownerPid: string): boolean {
  const owner = Number(ownerPid)
  if (!Number.isInteger(owner) || owner <= 0 || owner === process.pid) return owner === process.pid
  const childProcess = getChildProcessBuiltin()
  if (childProcess === null) return false
  try {
    let current = process.ppid
    const seen = new Set<number>()
    while (current > 1 && !seen.has(current)) {
      if (current === owner) return true
      seen.add(current)
      const output = childProcess.execFileSync('/bin/ps', ['-o', 'ppid=', '-p', String(current)], { encoding: 'utf8' })
      current = Number.parseInt(output.trim(), 10)
      if (!Number.isInteger(current)) return false
    }
  } catch {
    return false
  }
  return false
}

type DispatchContext = {
  readonly workerHandle: string
  readonly taskId: string
  readonly dispatchId: string
}

type PendingReport = {
  readonly context: DispatchContext
  readonly phase: string
  readonly type: 'status' | 'heartbeat'
}

function parseDispatchContext(prompt: unknown): DispatchContext | null {
  if (typeof prompt !== 'string') return null
  const workerHandle = prompt.match(/--from\s+(term_[A-Za-z0-9-]+)/)?.[1]
  const taskId = prompt.match(/--task-id\s+(task_[A-Za-z0-9]+)/)?.[1]
  const dispatchId = prompt.match(/--dispatch-id\s+(ctx_[A-Za-z0-9]+)/)?.[1]
  if (!workerHandle || !taskId || !dispatchId) return null
  return { workerHandle, taskId, dispatchId }
}

function normalizePhase(value: unknown): string {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.slice(0, 80) || 'working'
}

export default function (pi): void {
  if (!process.env.ORCA_PANE_KEY) return
  const extensionKey = Symbol.for('omo-supervision-reporter-extension')
  if (globalThis[extensionKey]) return

  const ownerPid = process.env.ORCA_PI_SUPERVISION_OWNED
  if (ownerPid && ownerPid !== String(process.pid) && isAncestorProcess(ownerPid)) return
  globalThis[extensionKey] = true
  process.env.ORCA_PI_SUPERVISION_OWNED = String(process.pid)
  let context: DispatchContext | null = null
  let activeSend = false
  let pending: PendingReport | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null

  function stopHeartbeat(): void {
    if (heartbeatTimer === null) return
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }

  function startHeartbeat(): void {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => queueReport('heartbeat', 'working'), HEARTBEAT_INTERVAL_MS)
    if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref()
  }

  function queueReport(type: PendingReport['type'], phase: string): void {
    if (context === null) return
    pending = { context, type, phase }
    drainReports()
  }

  function drainReports(): void {
    if (activeSend || pending === null) return
    const report = pending
    pending = null
    activeSend = true

    try {
      const childProcess = getChildProcessBuiltin()
      if (childProcess === null) {
        activeSend = false
        return
      }
      const child = childProcess.spawn('orca', [
        'orchestration',
        'send',
        '--from', report.context.workerHandle,
        '--type', report.type,
        '--subject', 'OMO supervision report',
        '--task-id', report.context.taskId,
        '--dispatch-id', report.context.dispatchId,
        '--phase', report.phase,
        '--json'
      ], { stdio: 'ignore' })
      let timeout: ReturnType<typeof setTimeout>
      const complete = (): void => {
        clearTimeout(timeout)
        activeSend = false
        drainReports()
      }
      timeout = setTimeout(() => child.kill('SIGTERM'), SEND_TIMEOUT_MS)
      if (typeof timeout.unref === 'function') timeout.unref()
      child.once('close', complete)
      child.once('error', complete)
      child.unref()
    } catch {
      activeSend = false
      drainReports()
    }
  }

  pi.on('before_agent_start', (event): void => {
    context = parseDispatchContext(event.prompt)
    if (context === null) stopHeartbeat()
  })

  pi.on('agent_start', (): void => {
    queueReport('status', 'active')
    startHeartbeat()
  })

  pi.on('tool_execution_start', (event): void => {
    queueReport('status', `tool:${normalizePhase(event.toolName)}`)
  })

  pi.on('tool_execution_end', (): void => {
    queueReport('status', 'working')
  })

  pi.on('agent_settled', (): void => {
    stopHeartbeat()
    context = null
  })

  pi.on('agent_end', (): void => {
    // worker_done is owned by the delivered Task contract; never duplicate it here.
  })
}
