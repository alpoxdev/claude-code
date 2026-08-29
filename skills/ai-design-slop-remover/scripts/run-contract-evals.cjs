#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const { spawn } = require('node:child_process');
const process = require('node:process');

const DEFAULT_CASES = 'skills/ai-design-slop-remover/assets/evals/contract-cases.jsonl';
const COMMANDS = {
  report: 'skills/ai-design-slop-remover/scripts/validate-report.cjs',
  waiver: 'skills/ai-design-slop-remover/scripts/validate-waivers.cjs',
  rendered: 'skills/ai-design-slop-remover/scripts/collect-rendered-evidence.cjs',
};
function parseArgs(argv) {
  let cases = DEFAULT_CASES; let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--cases') { cases = argv[++index]; if (!cases || cases.startsWith('--')) throw new Error('--cases requires a path'); }
    else if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') return { help: true };
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return { help: false, cases, json };
}
function parseCases(text) {
  return text.split(/\r?\n/).filter(Boolean).map((line, index) => {
    let value; try { value = JSON.parse(line); } catch (error) { throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`); }
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !COMMANDS[value.command] || typeof value.input !== 'string' || !Number.isInteger(value.expectedExit)) throw new Error(`Invalid case at line ${index + 1}`);
    return value;
  });
}
function run(command, script, input) {
  return new Promise((done) => {
    const flag = command === 'report' ? '--report' : '--input';
    const child = spawn(process.execPath, [script, flag, input, '--json'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; }); child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => done({ code: 2, stdout, stderr: `${stderr}${error.message}` }));
    child.on('close', (code) => done({ code: code ?? 2, stdout, stderr }));
  });
}
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node run-contract-evals.cjs [--cases <cases.jsonl>] [--json]'); return; }
    const cases = parseCases(await readFile(resolve(args.cases), 'utf8')); const results = [];
    for (const testCase of cases) {
      const script = COMMANDS[testCase.command];
      const result = await run(testCase.command, script, testCase.input);
      const output = `${result.stdout}\n${result.stderr}`;
      const failures = [];
      if (result.code !== testCase.expectedExit) failures.push(`Expected exit ${testCase.expectedExit}, received ${result.code}`);
      if (testCase.expectedError && !output.includes(testCase.expectedError)) failures.push(`Missing expected error: ${testCase.expectedError}`);
      results.push({ id: testCase.id, ok: failures.length === 0, failures });
    }
    const output = { ok: results.every((result) => result.ok), cases: results };
    if (args.json) console.log(JSON.stringify(output, null, 2)); else for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.id}${result.failures.length ? `: ${result.failures.join('; ')}` : ''}`);
    if (!output.ok) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; }
}
main();
