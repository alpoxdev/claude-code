#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const process = require('node:process');
const { RULE_BY_ID } = require('./rules/registry.cjs');

function parseArgs(argv) {
  let input; let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--input') input = argv[++index];
    else if (arg === '--json') json = true;
    else if (arg === '--help' || arg === '-h') return { help: true, json };
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!input) throw new Error('--input requires a path');
  return { help: false, input, json };
}
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)); }
function validate(value) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['Waiver document must be an object.'] };
  if (value.version !== 1) errors.push('version must equal 1.');
  if (!Array.isArray(value.waivers)) errors.push('waivers must be an array.');
  for (const [index, waiver] of (value.waivers ?? []).entries()) {
    const label = `waivers[${index}]`;
    if (!waiver || typeof waiver !== 'object' || Array.isArray(waiver)) { errors.push(`${label} must be an object.`); continue; }
    if (!RULE_BY_ID.has(waiver.ruleId)) errors.push(`${label}.ruleId must name a known rule.`);
    if (typeof waiver.reason !== 'string' || !waiver.reason.trim()) errors.push(`${label}.reason must be non-empty.`);
    if (!['user-confirmed', 'documented-brand', 'fixture', 'generated-output'].includes(waiver.source)) errors.push(`${label}.source is invalid.`);
    const hasValue = typeof waiver.value === 'string' && waiver.value.trim();
    const hasFile = typeof waiver.file === 'string' && waiver.file.trim();
    if (Boolean(hasValue) === Boolean(hasFile)) errors.push(`${label} requires exactly one of value or file.`);
    if (hasFile && (waiver.file === '*' || waiver.file.includes('**'))) errors.push(`${label}.file must be a narrow file path, not a broad glob.`);
    if (waiver.reviewAfter !== undefined && !validDate(waiver.reviewAfter)) errors.push(`${label}.reviewAfter must be an absolute valid YYYY-MM-DD date.`);
    for (const key of Object.keys(waiver)) if (!['ruleId', 'value', 'file', 'reason', 'source', 'reviewAfter'].includes(key)) errors.push(`${label}.${key} is not allowed.`);
  }
  return { ok: errors.length === 0, errors };
}
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node validate-waivers.cjs --input <.ai-slop-remover.json> [--json]'); return; }
    let value; try { value = JSON.parse(await readFile(resolve(args.input), 'utf8')); } catch (error) { throw new Error(`Invalid waiver JSON: ${error instanceof Error ? error.message : String(error)}`); }
    const result = validate(value);
    if (args.json) console.log(JSON.stringify(result, null, 2)); else console.log(result.ok ? 'Waiver document is valid.' : result.errors.join('\n'));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; }
}
main();
