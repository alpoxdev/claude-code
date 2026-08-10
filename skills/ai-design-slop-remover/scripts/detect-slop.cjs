#!/usr/bin/env node
const { readFile, readdir, stat } = require('node:fs/promises');
const { extname, relative, resolve } = require('node:path');
const process = require('node:process');

/**
 * @typedef {'P0'|'P1'|'P2'|'P3'} Severity
 * @typedef {{ id: string, severity: Severity, confidence: string, scope: string, pattern: RegExp, evidence: string, action: string, fix: string }} Rule
 * @typedef {{ id: string, severity: Severity, confidence: string, scope: string, location: { file: string, line: number }, evidence: string, action: string, fix: string }} Finding
 */

const SUPPORTED = new Set(['.html', '.jsx', '.tsx', '.vue', '.svelte', '.css', '.scss', '.less']);
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', '.svelte-kit']);

const RULES = [
  rule('surface.gradient-text', 'P2', 'high', 'default-risk', /(?:background-clip\s*:\s*text|-webkit-background-clip\s*:\s*text|bg-clip-text)/gi, 'Gradient-clipped text source signature', 'review', 'Preserve explicit brand/reference typography; otherwise use a confirmed solid token.'),
  rule('surface.purple-gradient', 'P2', 'medium', 'default-risk', /(?:purple|violet|fuchsia|#(?:7c3aed|8b5cf6|a855f7|c026d3)).{0,100}(?:blue|pink|cyan|#(?:2563eb|3b82f6|ec4899))/gi, 'Purple-to-blue/pink gradient-like token sequence', 'review', 'Preserve documented brand gradients; otherwise review a confirmed solid token.'),
  rule('motion.transition-all', 'P2', 'high', 'universal', /(?:transition\s*:\s*all\b|\btransition-all\b)/gi, 'Broad transition declaration', 'replace', 'Replace all with only the properties that actually change.'),
  rule('motion.layout-property', 'P1', 'high', 'universal', /(?:transition(?:-property)?\s*:[^;]*(?:top|left|width|height|margin|padding)|(?:animate|transition)[\w:-]*\([^)]*(?:top|left|width|height|margin|padding))/gi, 'Layout property animation signature', 'review', 'Prefer transform/opacity only when behavior remains equivalent.'),
  rule('surface.thick-side-stripe', 'P2', 'medium', 'default-risk', /border-(?:left|inline-start)(?:-width)?\s*:\s*(?:[5-9]|\d{2,})px|\bborder-l-(?:4|8)\b/gi, 'Thick colored side-border signature', 'review', 'Confirm the stripe carries state or brand meaning before replacing.'),
  rule('structure.card-in-card', 'P2', 'medium', 'default-risk', /class(?:Name)?\s*=\s*["'`][^"'`]*\bcard\b[^"'`]*["'`][\s\S]{0,500}class(?:Name)?\s*=\s*["'`][^"'`]*\bcard\b/gi, 'Nearby nested/repeated card class signature', 'review', 'Inspect DOM nesting and preserve semantic groups.'),
  rule('quality.fake-chrome', 'P2', 'medium', 'default-risk', /(?:fake|mock)[-_ ]?(?:browser|phone|terminal|ide)|(?:browser|phone|terminal|ide)[-_ ]?chrome/gi, 'Fake device/application chrome naming signature', 'review', 'Preserve chrome that frames a real product asset or communicates context.'),
  rule('copy.placeholder-person', 'P1', 'high', 'default-risk', /\b(?:John Doe|Jane Doe|Lorem Ipsum)\b/gi, 'Obvious placeholder person or copy', 'remove', 'Remove only when it is not a documented fixture or functional test value.'),
  rule('copy.placeholder-brand', 'P1', 'medium', 'default-risk', /\b(?:Acme|SmartFlow|Nexus AI)\b/gi, 'Common placeholder brand signature', 'review', 'Confirm it is not the actual product or an intentional fixture.'),
  rule('copy.cliche', 'P3', 'medium', 'context-dependent', /\b(?:Elevate|Seamless(?:ly)?|Next-gen|Unleash|Game-changer)\b/gi, 'Generic marketing cliché', 'review', 'Review against product voice; do not rewrite sourced copy automatically.'),
  rule('copy.unsupported-metric', 'P1', 'medium', 'default-risk', /\b(?:\d{2,}(?:\.\d+)?%|\d+x)\s+(?:faster|better|growth|uptime|increase|improvement|more)\b/gi, 'Metric-like marketing claim', 'review', 'Require local provenance; never invent a replacement metric.'),
  rule('motion.scale-everywhere', 'P2', 'medium', 'default-risk', /\bhover:(?:scale-(?:105|110)|transform[^\s"'`]*)\b/gi, 'Generic hover-scale utility', 'review', 'Confirm scaling communicates hierarchy or interaction.'),
  rule('structure.three-equal-cards', 'P1', 'medium', 'context-dependent', /\b(?:grid-cols-3|repeat\(\s*3\s*,\s*(?:1fr|minmax\(0,\s*1fr\))\s*\))/gi, 'Three equal grid tracks', 'review', 'Preserve real three-peer comparisons and user-required cardinality.'),
  rule('surface.decorative-orb', 'P2', 'medium', 'default-risk', /(?:decorative|floating|gradient)[-_ ]?(?:orb|blob)|\b(?:orb|blob)[-_ ]?(?:decoration|glow)\b/gi, 'Decorative orb/blob naming signature', 'review', 'Remove only when source/DOM confirms no semantic, brand, state, or interaction role.'),
  rule('surface.status-dot', 'P3', 'medium', 'default-risk', /(?:decorative|pulse|status)[-_ ]?dot/gi, 'Status/decorative dot naming signature', 'review', 'Confirm whether the dot communicates a real state.'),
  rule('surface.version-label', 'P3', 'medium', 'default-risk', /(?:version|release)[-_ ]?(?:badge|pill|label)|\bv\d+(?:\.\d+)+\b/gi, 'Version-label signature', 'review', 'Preserve real release/version information.'),
  rule('quality.missing-alt', 'P1', 'medium', 'universal', /<img\b(?![^>]*\balt\s*=)[^>]*>/gi, 'Image element without an alt attribute', 'review', 'Determine whether the image is informative or decorative before adding alt.'),
  rule('quality.focus-suppressed', 'P1', 'medium', 'universal', /(?:outline\s*:\s*(?:none|0)|\bfocus:outline-none\b)/gi, 'Focus outline suppression signature', 'review', 'Confirm an equally visible focus-visible replacement exists.'),
];

/**
 * @param {string} id
 * @param {Severity} severity
 * @param {string} confidence
 * @param {string} scope
 * @param {RegExp} pattern
 * @param {string} evidence
 * @param {string} action
 * @param {string} fix
 * @returns {Rule}
 */
function rule(id, severity, confidence, scope, pattern, evidence, action, fix) {
  return { id, severity, confidence, scope, pattern, evidence, action, fix };
}

/** @param {string[]} argv */
function parseArgs(argv) {
  let target;
  let json = false;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--target') {
      target = argv[++index];
      if (!target || target.startsWith('--')) throw new Error('--target requires a path');
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--help' || arg === '-h') {
      return { help: true, json };
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!target) throw new Error('--target is required');
  return { target, json, help: false };
}

/** @param {string} target @returns {Promise<string[]>} */
async function collectFiles(target) {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    if (!SUPPORTED.has(extname(target).toLowerCase())) throw new Error(`Unsupported file type: ${extname(target) || '(none)'}`);
    return [target];
  }
  if (!targetStat.isDirectory()) throw new Error('Target must be a supported file or directory');
  const files = [];
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) stack.push(path);
      } else if (entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())) {
        files.push(path);
      }
    }
  }
  return files.sort();
}

/** @param {string} text @param {number} offset */
function lineAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) if (text.charCodeAt(index) === 10) line += 1;
  return line;
}

/** @param {string} value */
function excerpt(value) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 180);
}

/** @param {string} file @param {string} text @param {string} root @returns {Finding[]} */
function scanFile(file, text, root) {
  /** @type {Finding[]} */
  const findings = [];
  for (const definition of RULES) {
    definition.pattern.lastIndex = 0;
    for (const match of text.matchAll(definition.pattern)) {
      findings.push({
        id: definition.id,
        severity: definition.severity,
        confidence: definition.confidence,
        scope: definition.scope,
        location: { file: relative(root, file) || file, line: lineAt(text, match.index ?? 0) },
        evidence: `${definition.evidence}: ${excerpt(match[0])}`,
        action: definition.action,
        fix: definition.fix,
      });
    }
  }
  if (/(?:animation\s*:|@keyframes|\banimate-[\w-]+)/i.test(text) && !/(?:prefers-reduced-motion|motion-reduce:)/i.test(text)) {
    findings.push({
      id: 'motion.missing-reduced-motion', severity: 'P1', confidence: 'medium', scope: 'universal',
      location: { file: relative(root, file) || file, line: 1 },
      evidence: 'Motion signature exists in this file without a local reduced-motion signature.',
      action: 'review', fix: 'Check project-wide reduced-motion handling before adding a scoped fallback.',
    });
  }
  return findings;
}

/** @param {Finding[]} findings */
function summarize(findings) {
  const summary = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const finding of findings) summary[finding.severity] += 1;
  return summary;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    if (args.help) {
      console.log('Usage: node detect-slop.cjs --target <file-or-directory> [--json]');
      return;
    }
    if (!args.target) throw new Error('--target is required');
    const target = resolve(args.target);
    const files = await collectFiles(target);
    const root = (await stat(target)).isDirectory() ? target : resolve(target, '..');
    const findings = [];
    for (const file of files) findings.push(...scanFile(file, await readFile(file, 'utf8'), root));
    const result = {
      target: args.target,
      version: 1,
      scannedFiles: files.length,
      findings,
      summary: summarize(findings),
      limitations: [
        'Static source signatures do not prove design intent, rendered appearance, contrast, usability, or accessibility conformance.',
        'Context-dependent and review-only patterns require brief and rendered evidence before remediation.',
      ],
    };
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Scanned ${files.length} files; found ${findings.length} signatures.`);
      for (const finding of findings) console.log(`${finding.severity} ${finding.id} ${finding.location.file}:${finding.location.line}`);
    }
  } catch (error) {
    const result = { error: error instanceof Error ? error.message : String(error), version: 1 };
    if (args?.json || process.argv.includes('--json')) console.error(JSON.stringify(result));
    else console.error(`Error: ${result.error}`);
    process.exitCode = 2;
  }
}

main();
