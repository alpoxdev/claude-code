#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const process = require('node:process');

const DEFAULT_CASES = 'skills/ai-design-slop-remover/assets/evals/detector-cases.jsonl';
const DETECTOR = 'skills/ai-design-slop-remover/scripts/detect-slop.cjs';

/** @param {string[]} argv */
function parseArgs(argv) {
  let cases = DEFAULT_CASES;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cases') {
      cases = argv[++index];
      if (!cases || cases.startsWith('--')) throw new Error('--cases requires a path');
    } else if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') return { help: true, cases, json };
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, cases, json };
}

/** @param {string} text */
function parseCases(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      const value = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('row must be an object');
      if (typeof value.id !== 'string' || typeof value.target !== 'string') throw new Error('id and target are required strings');
      return value;
    } catch (error) {
      throw new Error(`Invalid JSONL at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

/** @param {string[]} args */
function runNode(args) {
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, args, { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => resolveRun({ code: 2, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', (code) => resolveRun({ code: code ?? 2, stdout, stderr }));
  });
}

/** @param {Record<string, unknown>} testCase */
async function runCase(testCase) {
  const result = await runNode([DETECTOR, '--target', String(testCase.target), '--json']);
  if (testCase.expectError === true) {
    return { id: testCase.id, ok: result.code === 2, failures: result.code === 2 ? [] : [`Expected error exit 2, received ${result.code}`] };
  }
  if (result.code !== 0) return { id: testCase.id, ok: false, failures: [`Detector exited ${result.code}: ${result.stderr.trim()}`] };
  let output;
  try { output = JSON.parse(result.stdout); } catch { return { id: testCase.id, ok: false, failures: ['Detector did not emit JSON'] }; }
  const ids = new Set((output.findings ?? []).map((finding) => finding.id));
  const failures = [];
  if (testCase.expectedDetectorVersion !== undefined && output.detectorVersion !== testCase.expectedDetectorVersion) {
    failures.push(`Expected detectorVersion ${testCase.expectedDetectorVersion}, received ${String(output.detectorVersion)}`);
  }
  for (const id of testCase.expectedContains ?? []) if (!ids.has(id)) failures.push(`Missing finding: ${id}`);
  for (const id of testCase.expectedAbsent ?? []) if (ids.has(id)) failures.push(`Unexpected finding: ${id}`);
  if (testCase.expectedSummary) {
    for (const [severity, count] of Object.entries(testCase.expectedSummary)) {
      if (output.summary?.[severity] !== count) failures.push(`Expected ${severity}=${count}, received ${String(output.summary?.[severity])}`);
    }
  }
  for (const [id, status] of Object.entries(testCase.expectedExceptions ?? {})) {
    const finding = (output.findings ?? []).find((candidate) => candidate.id === id);
    if (!finding) failures.push(`Missing exception finding: ${id}`);
    else if (finding.exceptionStatus !== status) failures.push(`Expected ${id} exceptionStatus=${status}, received ${String(finding.exceptionStatus)}`);
  }
  return { id: testCase.id, ok: failures.length === 0, failures };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log('Usage: node run-detector-evals.cjs [--cases <cases.jsonl>] [--json]');
      return;
    }
    const cases = parseCases(await readFile(resolve(args.cases), 'utf8'));
    const results = [];
    for (const testCase of cases) results.push(await runCase(testCase));
    const output = { ok: results.every((result) => result.ok), cases: results };
    if (args.json) console.log(JSON.stringify(output, null, 2));
    else for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.id}${result.failures.length ? `: ${result.failures.join('; ')}` : ''}`);
    if (!output.ok) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 2;
  }
}

main();
