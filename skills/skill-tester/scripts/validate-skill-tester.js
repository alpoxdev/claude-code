#!/usr/bin/env node
// @ts-check
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize, relative, resolve, sep } from 'node:path';

const REQUIRED_SECTIONS = [
  'output_language', 'purpose', 'routing_rule', 'instruction_contract', 'activation_examples',
  'required_inputs', 'skill_architecture', 'workflow', 'loop_policy', 'output_contract', 'validation',
];
const CATEGORY_FLOORS = { positive: 3, negative: 2, boundary: 2, edge: 2, workflow: 1, adversarial: 1, regression: 1 };
const LANGUAGE_FLOORS = { en: 1, ko: 1, mixed: 1 };
const VALID_CATEGORIES = new Set(Object.keys(CATEGORY_FLOORS));
const VALID_LANGUAGES = new Set(Object.keys(LANGUAGE_FLOORS));
const VALID_RISKS = new Set(['smoke', 'targeted', 'standard', 'thorough', 'high-stakes']);

/** @typedef {{ code: string, message: string, path?: string, line?: number, [key: string]: unknown }} Issue */
/** @typedef {{ root: string, evals: string, json: boolean, help: boolean }} Arguments */

/** @param {string[]} argv @returns {Arguments} */
function parseArgs(argv) {
  const args = { root: 'skills/skill-tester', evals: 'skills/skill-tester/assets/evals/skill-tester-cases.jsonl', json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') args.root = value(argv, ++index, arg);
    else if (arg === '--evals') args.evals = value(argv, ++index, arg);
    else if (arg === '--json') args.json = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw error('ARG_UNKNOWN', `Unknown argument: ${arg}`);
  }
  return args;
}

/** @param {string[]} argv @param {number} index @param {string} flag */
function value(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw error('ARG_VALUE_MISSING', `${flag} requires a value.`);
  return value;
}

/** @param {string} code @param {string} message */
function error(code, message) {
  return Object.assign(new Error(message), { code });
}

/** @param {string} filePath */
function pathText(filePath) {
  return filePath.split(sep).join('/');
}

/** @param {string} root @param {string} target */
function isInside(root, target) {
  const segment = relative(root, target);
  return segment === '' || (!segment.startsWith('..') && !segment.startsWith('/') && !/^[A-Za-z]:/.test(segment));
}

/** @param {string} root @param {Issue[]} errors */
function walkFiles(root, errors) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries;
    try { entries = readdirSync(current, { withFileTypes: true }); }
    catch (caught) {
      errors.push({ code: 'DIR_READ_FAILED', message: `Cannot read directory: ${pathText(relative(process.cwd(), current))}`, path: pathText(relative(process.cwd(), current)), detail: caught instanceof Error ? caught.message : String(caught) });
      continue;
    }
    for (const entry of entries) {
      const file = join(current, entry.name);
      if (entry.isDirectory()) stack.push(file);
      else if (entry.isFile()) files.push(file);
    }
  }
  return files.sort();
}

/** @param {string} text @param {string} key */
function frontmatterValue(text, key) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] || '';
  return (new RegExp(`^${key}:\\s*(.+)$`, 'm').exec(block)?.[1] || '').trim().replace(/^["']|["']$/g, '');
}

/** @param {string} text */
function atLinks(text) {
  return [...text.matchAll(/^@([^\s]+\.md)\s*$/gm)].map((match) => match[1]);
}

/** @param {string} text */
function markdownLinks(text) {
  const links = [];
  for (const match of text.matchAll(/!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const link = match[1];
    if (!/^(https?:|mailto:|#)/.test(link)) links.push(link);
  }
  return links;
}

/** @param {string} text */
function tags(text) {
  return [...text.matchAll(/^<\/?([a-z][a-z0-9_]*)>\s*$/gim)].map((match) => match[0].toLowerCase());
}

/** @param {string} text */
function fences(text) {
  /** @type {{ marker: string, line: number }[]} */
  const stack = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    const match = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (!match) continue;
    const marker = match[2][0];
    if (stack.length && stack[stack.length - 1].marker === marker) stack.pop();
    else stack.push({ marker, line: index + 1 });
  }
  return stack;
}

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @returns {value is string} */
function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/** @param {string} root @param {Issue[]} errors */
function checkCore(root, errors) {
  const englishPath = join(root, 'SKILL.md');
  const koreanPath = join(root, 'SKILL.ko.md');
  const expectedName = basename(root);
  const result = { metadata: false, sections: false, parity: false, directLinks: false };
  if (!existsSync(englishPath) || !existsSync(koreanPath)) {
    if (!existsSync(englishPath)) errors.push({ code: 'SKILL_MISSING', message: 'Missing SKILL.md', path: 'SKILL.md' });
    if (!existsSync(koreanPath)) errors.push({ code: 'KOREAN_CORE_MISSING', message: 'Missing SKILL.ko.md', path: 'SKILL.ko.md' });
    return result;
  }
  const english = readFileSync(englishPath, 'utf8');
  const korean = readFileSync(koreanPath, 'utf8');
  const metadataFiles = [['SKILL.md', english], ['SKILL.ko.md', korean]];
  let metadata = true;
  for (const [file, body] of metadataFiles) {
    const name = frontmatterValue(body, 'name');
    const description = frontmatterValue(body, 'description');
    if (name !== expectedName || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      metadata = false;
      errors.push({ code: 'FRONTMATTER_NAME', message: `Skill name must be kebab-case and match ${expectedName}`, path: file, actual: name });
    }
    if (!description || description.length > 1024) {
      metadata = false;
      errors.push({ code: 'FRONTMATTER_DESCRIPTION', message: 'Description must contain 1–1024 characters.', path: file });
    }
  }
  if (!/^Use this skill when\b/.test(frontmatterValue(english, 'description'))) {
    metadata = false;
    errors.push({ code: 'FRONTMATTER_TRIGGER', message: "Canonical description must start with 'Use this skill when'.", path: 'SKILL.md' });
  }
  result.metadata = metadata;

  const missingSections = REQUIRED_SECTIONS.filter((section) => !new RegExp(`<${section}\\b`, 'i').test(english));
  for (const section of missingSections) errors.push({ code: 'SECTION_MISSING', message: `Required section missing: ${section}`, path: 'SKILL.md' });
  result.sections = missingSections.length === 0;

  const tagsMatch = JSON.stringify(tags(english)) === JSON.stringify(tags(korean));
  const linksEn = atLinks(english).map((link) => link.replace(/\.ko\.md$/, '.md'));
  const linksKo = atLinks(korean).map((link) => link.replace(/\.ko\.md$/, '.md'));
  const linksMatch = JSON.stringify(linksEn) === JSON.stringify(linksKo);
  if (!tagsMatch) errors.push({ code: 'BILINGUAL_TAG_DRIFT', message: 'Core structural tags differ.' });
  if (!linksMatch) errors.push({ code: 'BILINGUAL_LINK_DRIFT', message: 'Core direct links differ.' });
  result.parity = tagsMatch && linksMatch;

  let directLinks = true;
  for (const link of atLinks(english)) {
    const target = resolve(dirname(englishPath), link);
    if (!isInside(root, target) || !existsSync(target)) {
      directLinks = false;
      errors.push({ code: 'DIRECT_LINK_MISSING', message: `Direct support link does not resolve: ${link}`, path: 'SKILL.md', href: link });
    }
  }
  result.directLinks = directLinks;
  return result;
}

/** @param {string} root @param {string[]} markdown @param {Issue[]} errors */
function checkMarkdown(root, markdown, errors) {
  const set = new Set(markdown.map((file) => pathText(relative(root, file))));
  let pairs = true;
  let fencesOk = true;
  let linksOk = true;
  for (const file of markdown) {
    const rel = pathText(relative(root, file));
    const sibling = rel.endsWith('.ko.md') ? `${rel.slice(0, -6)}.md` : rel.replace(/\.md$/, '.ko.md');
    if (!set.has(sibling)) {
      pairs = false;
      errors.push({ code: 'BILINGUAL_PAIR_MISSING', message: `Missing markdown sibling: ${sibling}`, path: rel });
    }
    const content = readFileSync(file, 'utf8');
    const unclosed = fences(content);
    if (unclosed.length) {
      fencesOk = false;
      errors.push({ code: 'CODE_FENCE_UNBALANCED', message: 'Unbalanced code fence.', path: rel, unclosed });
    }
    for (const link of [...atLinks(content), ...markdownLinks(content)]) {
      const target = resolve(dirname(file), decodeURIComponent(link.split('#')[0]));
      if (!isInside(root, target) || !existsSync(target)) {
        linksOk = false;
        errors.push({ code: 'LINK_MISSING', message: `Local markdown link does not resolve: ${rel} -> ${link}`, path: rel, href: link });
      }
    }
  }
  return { pairs, fences: fencesOk, links: linksOk };
}

/** @param {string} evalPath @param {Issue[]} errors */
function checkEvals(evalPath, errors) {
  /** @type {Record<string, number>} */
  const count = {};
  /** @type {Record<string, number>} */
  const languages = {};
  /** @type {Set<string>} */
  const ids = new Set();
  let total = 0;
  if (!existsSync(evalPath)) {
    errors.push({ code: 'EVAL_FILE_MISSING', message: `Eval fixture is missing: ${evalPath}`, path: evalPath });
    return { total, count, languages, ok: false };
  }
  for (const [offset, line] of readFileSync(evalPath, 'utf8').split(/\r?\n/).entries()) {
    const lineNumber = offset + 1;
    if (!line.trim()) continue;
    /** @type {unknown} */
    let row;
    try { row = JSON.parse(line); }
    catch (caught) {
      errors.push({ code: 'EVAL_JSON_INVALID', message: `Eval row is not valid JSON: ${caught instanceof Error ? caught.message : String(caught)}`, path: evalPath, line: lineNumber });
      continue;
    }
    total += 1;
    if (!record(row)) {
      errors.push({ code: 'EVAL_ROW_INVALID', message: 'Eval row must be an object.', path: evalPath, line: lineNumber });
      continue;
    }
    /** @param {string} message */
    const fail = (message) => errors.push({ code: 'EVAL_ROW_INVALID', message, path: evalPath, line: lineNumber, id: row.id });
    if (!text(row.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.id)) fail('Eval row requires a unique kebab-case id.');
    else if (ids.has(row.id)) fail(`Duplicate eval id: ${row.id}`);
    else ids.add(row.id);
    if (!text(row.category) || !VALID_CATEGORIES.has(row.category)) fail('Eval row has unsupported category.');
    else count[row.category] = (count[row.category] || 0) + 1;
    if (!text(row.language) || !VALID_LANGUAGES.has(row.language)) fail('Eval row has unsupported language.');
    else languages[row.language] = (languages[row.language] || 0) + 1;
    if (!text(row.risk) || !VALID_RISKS.has(row.risk)) fail('Eval row has unsupported risk.');
    if (!text(row.intent) || !text(row.prompt)) fail('Eval row requires non-empty intent and prompt.');
    if (!record(row.context) || !Array.isArray(row.context.files) || !Array.isArray(row.context.sources)) fail('Eval row context requires files and sources arrays.');
    if (!Array.isArray(row.metrics) || !row.metrics.length || row.metrics.some((item) => !text(item))) fail('Eval row requires non-empty metrics.');
    if (!record(row.expected) || !Array.isArray(row.expected.must) || !row.expected.must.length || !Array.isArray(row.expected.mustNot) || !row.expected.mustNot.length) fail('Eval row expected requires non-empty must and mustNot arrays.');
    const category = text(row.category) ? row.category : '';
    const triggerValue = row.shouldTrigger;
    if (['positive', 'negative', 'boundary'].includes(category) && !(triggerValue === true || triggerValue === false || triggerValue === 'depends')) {
      fail('Trigger eval requires shouldTrigger true, false, or depends.');
    }
  }
  for (const [category, floor] of Object.entries(CATEGORY_FLOORS)) if ((count[category] || 0) < floor) errors.push({ code: 'EVAL_CATEGORY_FLOOR', message: `Expected at least ${floor} ${category} case(s).`, path: evalPath, actual: count[category] || 0 });
  for (const [language, floor] of Object.entries(LANGUAGE_FLOORS)) if ((languages[language] || 0) < floor) errors.push({ code: 'EVAL_LANGUAGE_FLOOR', message: `Expected at least ${floor} ${language} case(s).`, path: evalPath, actual: languages[language] || 0 });
  return { total, count, languages, ok: !errors.some((entry) => entry.code.startsWith('EVAL_')) };
}

function help() {
  console.log('Usage: node skills/skill-tester/scripts/validate-skill-tester.js [--root <skill-dir>] [--evals <jsonl>] [--json]\n\nValidates the skill-tester core, local markdown resources, and machine-readable regression fixture with Node built-ins only.');
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { help(); process.exit(0); }
  /** @type {Issue[]} */
  const errors = [];
  const root = resolve(normalize(args.root));
  const evals = resolve(normalize(args.evals));
  if (!existsSync(root) || !statSync(root).isDirectory()) errors.push({ code: 'ROOT_MISSING', message: `Skill root is not a directory: ${args.root}`, path: args.root });
  const files = errors.length ? [] : walkFiles(root, errors);
  const markdown = files.filter((file) => file.endsWith('.md'));
  const result = {
    ok: false,
    root: pathText(relative(process.cwd(), root) || root),
    core: errors.length ? null : checkCore(root, errors),
    markdown: errors.length ? null : checkMarkdown(root, markdown, errors),
    evals: checkEvals(evals, errors),
    errors,
  };
  result.ok = errors.length === 0;
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else console.log(result.ok ? 'skill-tester validation passed' : 'skill-tester validation failed');
  process.exit(result.ok ? 0 : 1);
} catch (caught) {
  console.log(JSON.stringify({ ok: false, errors: [{ code: caught && typeof caught === 'object' && 'code' in caught ? caught.code : 'ARG_ERROR', message: caught instanceof Error ? caught.message : String(caught) }] }, null, 2));
  process.exit(2);
}
