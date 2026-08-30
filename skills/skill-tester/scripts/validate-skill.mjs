#!/usr/bin/env bun
// @ts-check
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path';

/** @typedef {{ code: string, message: string, path?: string, [key: string]: unknown }} Issue */
/** @typedef {{ target: string, json: boolean, help: boolean }} Arguments */

/** @param {string[]} argv @returns {Arguments} @throws {Error} When arguments are malformed. */
function parseArgs(argv) {
  const args = { target: '', json: false, help: false };
  for (const arg of argv) {
    if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (arg.startsWith('--')) throw issue('ARG_UNKNOWN', `Unknown argument: ${arg}`);
    else if (args.target) throw issue('ARG_TARGET_COUNT', 'Provide exactly one target skill folder.');
    else args.target = arg;
  }
  if (!args.help && !args.target) throw issue('ARG_TARGET_MISSING', 'Usage: node scripts/validate-skill.mjs <skill-folder> [--json]');
  return args;
}

/** @param {string} code @param {string} message @param {Record<string, unknown>} [extra] */
function issue(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

/** @param {string} path @returns {string} */
function posix(path) {
  return path.split(sep).join('/');
}

/** @param {string} root @param {string} path @returns {boolean} */
function isInside(root, path) {
  const segment = relative(root, path);
  return segment === '' || (!segment.startsWith('..') && !segment.startsWith('/') && !/^[A-Za-z]:/.test(segment));
}

/** @param {string} directory @returns {string[]} */
function markdownFiles(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
    }
  }
  return files.sort();
}

/** @param {string} text @returns {string[]} */
function atLinks(text) {
  return [...text.matchAll(/^@([^\r\n]+)$/gm)].map((match) => match[1].trim());
}

/** @param {string} text @returns {string[]} */
function structuralTags(text) {
  return [...text.matchAll(/^<\/?([a-z][a-z0-9_]*)>\s*$/gim)].map((match) => match[0].toLowerCase());
}

/** @param {string} text @returns {boolean} */
function fencesBalanced(text) {
  /** @type {{ fence: string, line: number }[]} */
  const stack = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (!match) continue;
    const fence = match[2][0];
    if (stack.length > 0 && stack[stack.length - 1].fence === fence) stack.pop();
    else stack.push({ fence, line: index + 1 });
  }
  return stack.length === 0;
}

/** @param {string} text @param {string} key @returns {string} */
function frontmatterValue(text, key) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] || '';
  return (new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(block)?.[1] || '').trim().replace(/^["']|["']$/g, '');
}

/** @param {Arguments} args @returns {{ ok: boolean, target: string, checks: Record<string, boolean>, failures: Issue[], warnings: Issue[] }} */
function validate(args) {
  /** @type {Issue[]} */
  const failures = [];
  /** @type {Issue[]} */
  const warnings = [];
  const target = resolve(normalize(args.target));
  const targetName = basename(target);
  const skillPath = join(target, 'SKILL.md');
  const koreanPath = join(target, 'SKILL.ko.md');
  const checks = {
    directory: false,
    metadata: false,
    supportLinks: false,
    bilingualPairs: false,
    coreParity: false,
    codeFences: false,
  };

  if (!existsSync(target) || !statSync(target).isDirectory()) {
    failures.push({ code: 'TARGET_NOT_DIRECTORY', message: `Target is not a directory: ${args.target}`, path: args.target });
    return result(target, checks, failures, warnings);
  }
  checks.directory = true;

  if (!existsSync(skillPath)) failures.push({ code: 'SKILL_MISSING', message: 'Missing SKILL.md', path: 'SKILL.md' });
  if (!existsSync(koreanPath)) failures.push({ code: 'KOREAN_CORE_MISSING', message: 'Missing SKILL.ko.md', path: 'SKILL.ko.md' });

  if (existsSync(skillPath)) {
    const core = readFileSync(skillPath, 'utf8');
    const name = frontmatterValue(core, 'name');
    const description = frontmatterValue(core, 'description');
    if (!/^---\r?\n/.test(core)) failures.push({ code: 'FRONTMATTER_MISSING', message: 'SKILL.md must start with YAML frontmatter.', path: 'SKILL.md' });
    if (name !== targetName) failures.push({ code: 'NAME_MISMATCH', message: `Frontmatter name must match folder name: ${targetName}`, path: 'SKILL.md', expected: targetName, actual: name });
    if (!description) failures.push({ code: 'DESCRIPTION_MISSING', message: 'Frontmatter needs a non-empty description.', path: 'SKILL.md' });
    else if (!/^Use this skill when\b/.test(description)) warnings.push({ code: 'DESCRIPTION_TRIGGER_STYLE', message: "Canonical description should start with 'Use this skill when'.", path: 'SKILL.md' });
    if (core.split(/\r?\n/).length > 300) warnings.push({ code: 'SKILL_LONG', message: 'SKILL.md exceeds 300 lines; consider progressive disclosure.', path: 'SKILL.md' });
    checks.metadata = failures.every((item) => !['FRONTMATTER_MISSING', 'NAME_MISMATCH', 'DESCRIPTION_MISSING'].includes(item.code));

    let linksOk = true;
    for (const link of atLinks(core)) {
      const resolved = resolve(dirname(skillPath), link);
      if (!isInside(target, resolved) || !existsSync(resolved)) {
        linksOk = false;
        failures.push({ code: 'SUPPORT_LINK_MISSING', message: `Direct support link does not resolve: ${link}`, path: 'SKILL.md', href: link });
      }
    }
    checks.supportLinks = linksOk;
  }

  if (existsSync(skillPath) && existsSync(koreanPath)) {
    const english = readFileSync(skillPath, 'utf8');
    const korean = readFileSync(koreanPath, 'utf8');
    const tagsMatch = JSON.stringify(structuralTags(english)) === JSON.stringify(structuralTags(korean));
    const linksMatch = JSON.stringify(atLinks(english).map((value) => value.replace(/\.ko\.md$/, '.md'))) === JSON.stringify(atLinks(korean).map((value) => value.replace(/\.ko\.md$/, '.md')));
    if (!tagsMatch) failures.push({ code: 'BILINGUAL_TAG_DRIFT', message: 'SKILL.md and SKILL.ko.md structural tags differ.' });
    if (!linksMatch) failures.push({ code: 'BILINGUAL_LINK_DRIFT', message: 'SKILL.md and SKILL.ko.md direct support links differ.' });
    checks.coreParity = tagsMatch && linksMatch;
  }

  if (checks.directory) {
    const files = markdownFiles(target);
    const paths = new Set(files.map((file) => posix(relative(target, file))));
    const pairFailures = [];
    for (const path of paths) {
      const sibling = path.endsWith('.ko.md') ? `${path.slice(0, -6)}.md` : path.replace(/\.md$/, '.ko.md');
      if (!paths.has(sibling)) pairFailures.push({ path, sibling });
    }
    for (const failure of pairFailures) failures.push({ code: 'BILINGUAL_PAIR_MISSING', message: `Markdown sibling is missing: ${failure.sibling}`, path: failure.path });
    checks.bilingualPairs = pairFailures.length === 0;

    const unbalanced = files.filter((file) => !fencesBalanced(readFileSync(file, 'utf8')));
    for (const file of unbalanced) failures.push({ code: 'CODE_FENCE_UNBALANCED', message: 'Unbalanced code fence.', path: posix(relative(target, file)) });
    checks.codeFences = unbalanced.length === 0;
  }

  return result(target, checks, failures, warnings);
}

/** @param {string} target @param {Record<string, boolean>} checks @param {Issue[]} failures @param {Issue[]} warnings */
function result(target, checks, failures, warnings) {
  return { ok: failures.length === 0, target: posix(relative(process.cwd(), target) || target), checks, failures, warnings };
}

function help() {
  console.log('Usage: node skills/skill-tester/scripts/validate-skill.mjs <skill-folder> [--json]\n\nChecks local metadata, direct links, bilingual structure, core parity, and code fences with Node built-ins only.');
}

try {
  const legacyTarget = process.argv[2];
  if (!legacyTarget) {
    console.error('Usage: node scripts/validate-skill.mjs <skill-folder>');
    process.exit(2);
  }
  if (legacyTarget.startsWith('--')) {
    console.log(JSON.stringify({ result: 'fail', target: legacyTarget, failures: [`Target is not a directory: ${legacyTarget}`], warnings: [] }, null, 2));
    process.exit(1);
  }
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    help();
    process.exit(0);
  }
  const checked = validate(args);
  if (args.json) console.log(JSON.stringify(checked, null, 2));
  else console.log(`${checked.ok ? 'skill validation passed' : 'skill validation failed'}: ${checked.target}`);
  process.exit(checked.ok ? 0 : 1);
} catch (error) {
  const failure = { ok: false, target: null, checks: null, failures: [{ code: error && typeof error === 'object' && 'code' in error ? error.code : 'ARG_ERROR', message: error instanceof Error ? error.message : String(error) }], warnings: [] };
  console.log(JSON.stringify(failure, null, 2));
  process.exit(2);
}
