#!/usr/bin/env node
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const process = require('node:process');
const STATES = new Set(['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'empty', 'error']);

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
function isRecord(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function positiveNumber(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
function validate(value) {
  const errors = []; const observations = [];
  if (!isRecord(value)) return { ok: false, errors: ['Evidence handoff must be an object.'], observations };
  if (value.version !== 1) errors.push('version must equal 1.');
  if (typeof value.surface !== 'string' || !value.surface.trim()) errors.push('surface must be a non-empty string.');
  if (!Array.isArray(value.captures) || value.captures.length === 0) errors.push('captures must be a non-empty array.');
  for (const [captureIndex, capture] of (value.captures ?? []).entries()) {
    const label = `captures[${captureIndex}]`;
    if (!isRecord(capture)) { errors.push(`${label} must be an object.`); continue; }
    if (!isRecord(capture.viewport) || !positiveNumber(capture.viewport.width) || !positiveNumber(capture.viewport.height)) errors.push(`${label}.viewport requires positive width and height.`);
    if (!STATES.has(capture.state)) errors.push(`${label}.state is invalid.`);
    if (typeof capture.capturedAt !== 'string' || Number.isNaN(Date.parse(capture.capturedAt))) errors.push(`${label}.capturedAt must be an ISO date-time.`);
    if (!Array.isArray(capture.observations) || capture.observations.length === 0) errors.push(`${label}.observations must be non-empty.`);
    for (const [observationIndex, observation] of (capture.observations ?? []).entries()) {
      const observationLabel = `${label}.observations[${observationIndex}]`;
      if (!isRecord(observation)) { errors.push(`${observationLabel} must be an object.`); continue; }
      if (typeof observation.locator !== 'string' || !observation.locator.trim()) errors.push(`${observationLabel}.locator must be non-empty.`);
      const hasRect = isRecord(observation.rect) && ['x', 'y', 'width', 'height'].every((key) => typeof observation.rect[key] === 'number');
      const hasOverflow = typeof observation.overflowX === 'boolean';
      const hasFocus = typeof observation.focusVisible === 'boolean';
      const hasMotion = typeof observation.reducedMotion === 'boolean';
      const hasComputed = isRecord(observation.computed) && Object.values(observation.computed).every((entry) => typeof entry === 'string');
      if (!hasRect && !hasOverflow && !hasFocus && !hasMotion && !hasComputed) errors.push(`${observationLabel} needs a rect, overflowX, focusVisible, reducedMotion, or string computed value.`);
      observations.push({ viewport: capture.viewport, state: capture.state, locator: observation.locator, rect: observation.rect, overflowX: observation.overflowX, focusVisible: observation.focusVisible, reducedMotion: observation.reducedMotion, computed: observation.computed });
    }
  }
  return { ok: errors.length === 0, errors, observations };
}
async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node collect-rendered-evidence.cjs --input <capture.json> [--json]'); return; }
    let value; try { value = JSON.parse(await readFile(resolve(args.input), 'utf8')); } catch (error) { throw new Error(`Invalid evidence JSON: ${error instanceof Error ? error.message : String(error)}`); }
    const result = validate(value);
    if (args.json) console.log(JSON.stringify(result, null, 2)); else console.log(result.ok ? `Validated ${result.observations.length} rendered observations.` : result.errors.join('\n'));
    if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 2; }
}
main();
