#!/usr/bin/env node
const { readFile, readdir, stat } = require('node:fs/promises');
const { extname, relative, resolve } = require('node:path');
const process = require('node:process');
const { RULES, RULE_BY_ID } = require('./rules/registry.cjs');
const { SUPPORTED, IGNORED_DIRS, fingerprint, sortFindings, summarize } = require('./rules/shared.cjs');
const { scanText } = require('./engines/text.cjs');
const { scanCss } = require('./engines/css.cjs');
const { scanMarkup } = require('./engines/markup.cjs');
const { resolveContext } = require('./resolve-context.cjs');

function parseArgs(argv) {
  const args = { json: false, onlyNew: false, rules: null, baseline: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--target') args.target = argv[++index];
    else if (arg === '--baseline') args.baseline = argv[++index];
    else if (arg === '--rules') args.rules = argv[++index]?.split(',').map((id) => id.trim()).filter(Boolean);
    else if (arg === '--only-new') args.onlyNew = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (!args.target) throw new Error('--target is required');
  if (args.onlyNew && !args.baseline) throw new Error('--only-new requires --baseline <result.json>');
  if (args.rules?.some((id) => !RULE_BY_ID.has(id))) throw new Error(`Unknown rule: ${args.rules.find((id) => !RULE_BY_ID.has(id))}`);
  return args;
}
async function collectFiles(target) {
  const info = await stat(target);
  if (info.isFile()) { if (!SUPPORTED.has(extname(target).toLowerCase())) throw new Error(`Unsupported file type: ${extname(target) || '(none)'}`); return [target]; }
  if (!info.isDirectory()) throw new Error('Target must be a supported file or directory');
  const files = []; const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const file = resolve(current, entry.name);
      if (entry.isDirectory() && !IGNORED_DIRS.has(entry.name)) stack.push(file);
      else if (entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())) files.push(file);
    }
  }
  return files.sort();
}
function exceptionStatus(rule, context, text) {
  if ((rule.id === 'surface.gradient-text' || rule.id === 'surface.purple-gradient') && context.brandGradient) return 'candidate';
  if (rule.id === 'structure.three-equal-cards' && (context.pricingComparison || /pricing|plan|tier|comparison/i.test(text))) return 'candidate';
  if ((rule.id === 'surface.status-dot' || rule.id === 'motion.pulse-without-state') && (context.realState || /recording|live|sync|unread/i.test(text))) return 'candidate';
  return 'not-checked';
}
function makeFinding(match, context, text) {
  const { rule, location, match: evidenceMatch } = match;
  const candidate = exceptionStatus(rule, context, text);
  return {
    id: rule.id, severity: rule.defaultSeverity, confidence: rule.class === 'universal' ? 'high' : 'medium', scope: rule.class,
    location, evidence: `${rule.evidence}: ${evidenceMatch}`, action: rule.action, fix: rule.fix,
    engine: match.engine, evidenceKind: 'static-source', detectionConfidence: rule.class === 'universal' ? 'high' : 'medium',
    remediationConfidence: candidate === 'candidate' ? 'low' : rule.dispositionPolicy === 'autofix-safe' ? 'medium' : 'low', ruleClass: rule.class,
    clusterKey: rule.clusterKey, renderConfirmationRequired: rule.class !== 'universal', exceptionStatus: candidate,
  };
}
async function baselineFingerprints(path) {
  let value;
  try { value = JSON.parse(await readFile(resolve(path), 'utf8')); } catch (error) { throw new Error(`Invalid baseline: ${error instanceof Error ? error.message : String(error)}`); }
  if (value.detectorVersion !== 2 || !Array.isArray(value.findings)) throw new Error('Invalid baseline: expected detectorVersion 2 with findings array');
  return new Set(value.findings.map(fingerprint));
}
function genericOutputRisk(findings) {
  const categories = new Set(findings.filter((finding) => finding.ruleClass === 'default-risk' && finding.exceptionStatus !== 'candidate').map((finding) => finding.id.split('.')[0]));
  return categories.size >= 2 ? 'medium' : 'low';
}
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) { console.log('Usage: node detect-slop.cjs --target <file-or-directory> [--json] [--rules a,b] [--baseline result.json --only-new]'); return; }
    const target = resolve(args.target); const files = await collectFiles(target); const root = (await stat(target)).isDirectory() ? target : resolve(target, '..');
    const context = await resolveContext(target); const selected = args.rules ? RULES.filter((rule) => args.rules.includes(rule.id)) : RULES;
    const byEngine = (engine) => selected.filter((rule) => rule.engines.includes(engine));
    const enginesRun = new Set(['context']);
    const findings = [];
    for (const file of files) {
      const text = await readFile(file, 'utf8'); const fileName = relative(root, file) || file; const extension = extname(file).toLowerCase();
      const matches = [];
      if (byEngine('text').length) { matches.push(...scanText(fileName, text, root, byEngine('text'), 'text')); enginesRun.add('text'); }
      if (byEngine('css').length) { matches.push(...scanCss(fileName, text, root, byEngine('css'))); enginesRun.add('css'); }
      if (['.html', '.jsx', '.tsx', '.vue', '.svelte'].includes(extension) && byEngine('markup').length) { matches.push(...scanMarkup(fileName, text, root, byEngine('markup'))); enginesRun.add('markup'); }
      for (const match of matches) findings.push(makeFinding(match, context, text));
    }
    const allText = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
    if (/(?:animation\s*:|@keyframes|\banimate-[\w-]+)/i.test(allText) && !context.reducedMotion) {
      const rule = { id: 'motion.missing-reduced-motion', defaultSeverity: 'P1', class: 'universal', engines: ['css'], evidence: 'Motion signature exists without a project reduced-motion signature.', action: 'review', fix: 'Check project-wide reduced-motion handling before adding a scoped fallback.', clusterKey: 'motion-reduced-preference', dispositionPolicy: 'review' };
      findings.push(makeFinding({ rule, engine: 'css', location: { file: relative(root, files[0]) || files[0], line: 1 }, match: 'animation signature' }, context, allText));
    }
    let finalFindings = sortFindings(findings);
    const baseline = args.baseline ? await baselineFingerprints(args.baseline) : null;
    if (args.onlyNew && baseline) finalFindings = finalFindings.filter((finding) => !baseline.has(fingerprint(finding)));
    const result = { target: args.target, version: 2, detectorVersion: 2, scannedFiles: files.length, enginesRun: [...enginesRun].sort(), findings: finalFindings, summary: summarize(finalFindings), genericOutputRisk: genericOutputRisk(finalFindings), baseline: { used: Boolean(baseline), onlyNew: args.onlyNew, knownFindingsFiltered: findings.length - finalFindings.length }, limitations: ['Static source signatures do not prove design intent, rendered appearance, contrast, usability, or accessibility conformance.', 'Candidate exceptions preserve findings for review; they do not suppress a rule or authorize automatic removal.', 'Rendered, keyboard, and accessibility claims require capability-provided evidence.'] };
    if (args.json) console.log(JSON.stringify(result, null, 2)); else console.log(`Scanned ${files.length} files; found ${finalFindings.length} findings (generic-output risk: ${result.genericOutputRisk}).`);
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : String(error), detectorVersion: 2 };
    if (args?.json || process.argv.includes('--json')) console.error(JSON.stringify(result)); else console.error(`Error: ${result.error}`);
    process.exitCode = 2;
  }
}
main();
