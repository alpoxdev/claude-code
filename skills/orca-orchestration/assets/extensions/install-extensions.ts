#!/usr/bin/env bun
// @ts-check
/** @typedef {{ name: string, sourcePath: string, targetPath: string, status: 'installed' | 'updated' | 'already-installed' | 'would-install' | 'would-update' | 'failed', sourceSha256: string, targetSha256: string | null, error?: string }} InstallResult */

const MANAGED_MARKER = '// @orca-managed-pi-extension'
const REPORTED_EXTENSION = 'omo-supervision-reporter.ts'

const args = process.argv.slice(2)
const asJson = args.includes('--json')
const checkOnly = args.includes('--check')

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: bun scripts/install-extensions.mjs [--check] [--target <dir>] [--json]

Provisions the Orca supervision extensions that this skill's supervision loop relies on into
the local OMO global extension directory. Today this installs one managed file:

  ${REPORTED_EXTENSION}  (sends accepted status/heartbeat mail from a dispatched OMO worker)

Behavior:
  default  installs the file when missing and replaces it when its bytes diverge from the
           skill's canonical copy, then reports installed / updated / already-installed.
  --check  reports what would happen without writing anything.
  --target overrides the installation directory (default: ~/.omo/agent/extensions).

It never runs shell commands, touches credentials, reads other extension files, or removes
anything already in the target directory.`)
  process.exit(0)
}

const targetFlagIndex = args.indexOf('--target')
const positional = args.filter((arg, index) => {
  if (targetFlagIndex !== -1 && (index === targetFlagIndex || index === targetFlagIndex + 1)) return false
  return !['--json', '--check'].includes(arg)
})
if (positional.length > 0) {
  console.error(`Unknown argument: ${positional[0]}`)
  process.exit(2)
}
let targetDir = `${process.env.HOME}/.omo/agent/extensions`
if (targetFlagIndex !== -1) {
  const value = args[targetFlagIndex + 1]
  if (!value || value.startsWith('--')) {
    console.error('--target requires a directory value')
    process.exit(2)
  }
  targetDir = value
}

import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** @param {string} filePath @returns {string} */
const sha256File = (filePath) => createHash('sha256').update(readFileSync(filePath)).digest('hex')

/**
 * Install one managed extension file into the target directory.
 * @param {string} sourcePath @param {string} destinationPath @param {boolean} dryRun @returns {InstallResult}
 */
const installExtension = (sourcePath, destinationPath, dryRun) => {
  const base = /** @type {InstallResult} */ ({
    name: REPORTED_EXTENSION,
    sourcePath,
    targetPath: destinationPath,
    sourceSha256: '',
    targetSha256: null,
  })
  try {
    const source = readFileSync(sourcePath, 'utf8')
    if (!source.startsWith(MANAGED_MARKER)) {
      return { ...base, status: 'failed', error: 'source file lacks the managed extension marker' }
    }
    base.sourceSha256 = sha256File(sourcePath)
    if (!existsSync(destinationPath)) {
      if (dryRun) return { ...base, status: 'would-install' }
      mkdirSync(dirname(destinationPath), { recursive: true })
      copyFileSync(sourcePath, destinationPath)
      return { ...base, status: 'installed', targetSha256: sha256File(destinationPath) }
    }
    base.targetSha256 = sha256File(destinationPath)
    if (base.sourceSha256 === base.targetSha256) {
      return { ...base, status: 'already-installed' }
    }
    if (dryRun) return { ...base, status: 'would-update' }
    copyFileSync(sourcePath, destinationPath)
    return { ...base, status: 'updated', targetSha256: sha256File(destinationPath) }
  } catch (error) {
    return { ...base, status: 'failed', error: error instanceof Error ? error.message : String(error) }
  }
}

const assetsDir = dirname(fileURLToPath(import.meta.url))

const results = [installExtension(join(assetsDir, REPORTED_EXTENSION), join(resolve(targetDir), REPORTED_EXTENSION), checkOnly)]
const errors = results.filter((result) => result.status === 'failed')
const report = {
  schemaVersion: 1,
  ok: errors.length === 0,
  mode: checkOnly ? 'check' : 'install',
  target: resolve(targetDir),
  results,
  errors: errors.map((result) => `${result.name}:${result.error}`),
}
if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  for (const result of results) {
    const suffix = result.error ? ` (${result.error})` : ''
    console.log(`${result.status}: ${result.name}${suffix}`)
  }
}
process.exit(report.ok ? 0 : 1)
