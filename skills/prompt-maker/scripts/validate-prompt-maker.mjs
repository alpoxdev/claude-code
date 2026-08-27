#!/usr/bin/env bun
// @ts-check
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * @typedef {{
 *   root: string,
 *   evals: string|null,
 *   json: boolean,
 *   help: boolean
 * }} CliArgs
 *
 * @typedef {Error & { code: string }} CliError
 *
 * @typedef {{ code: string, message: string } & Record<string, unknown>} ValidationError
 *
 * @typedef {{ message: string, extra: Record<string, unknown> }} EvalRowError
 *
 * @typedef {{ marker: string, length: number, line: number }} Fence
 *
 * @typedef {Record<string, unknown>} JsonObject
 *
 * @typedef {{
 *   id: string,
 *   category: string,
 *   language: string
 * }} EvalCase
 */
const DEFAULT_ROOT = "skills/prompt-maker";
const REQUIRED_MARKERS = [
  "output_language",
  "purpose",
  "routing_rule",
  "instruction_contract",
  "support_file_read_order",
  "activation_examples",
  "workflow",
  "validation",
];
const CONTRACT_LABELS = [
  "Intent",
  "Trigger",
  "Scope",
  "Authority",
  "Evidence",
  "Tools",
  "Output",
  "Verification",
  "Stop condition",
];
/** @type {Record<string, number>} */
const ACTIVATION_FLOORS = {
  positive: 3,
  negative: 2,
  boundary: 1,
};
/** @type {Record<string, number>} */
const EVAL_CATEGORY_FLOORS = {
  positive: 1,
  negative: 1,
  boundary: 1,
  source: 1,
  safety: 1,
  schema: 1,
  regression: 1,
  adversarial: 1,
};
/** @type {Record<string, number>} */
const RICH_EVAL_CATEGORY_FLOORS = {
  positive: 3,
  negative: 2,
  boundary: 2,
  source: 2,
  safety: 2,
  schema: 2,
  regression: 2,
  adversarial: 2,
};
/** @type {Record<string, number>} */
const EVAL_LANGUAGE_FLOORS = { en: 1, ko: 1, mixed: 1 };
/** @type {Record<string, number>} */
const EVAL_INVOCATION_FLOORS = { explicit: 1, implicit: 1, contextual: 1 };
const ALLOWED_EVAL_CATEGORIES = new Set(Object.keys(EVAL_CATEGORY_FLOORS));
const STRAY_DOC_NAMES = new Set(["README.md", "CHANGELOG.md", "QUICK_REFERENCE.md"]);
const REQUIRED_TEMPLATES = [
  "assets/prompt-pack.template.md",
  "assets/prompt-pack.template.ko.md",
  "assets/source-ledger.template.md",
  "assets/source-ledger.template.ko.md",
  "assets/eval-harness.template.json",
];
/** @type {{ name: string, pattern: RegExp }[]} */
const REQUIRED_TEMPLATE_CONCEPTS = [
  { name: "identity", pattern: /\bidentity\b/i },
  { name: "variables", pattern: /\bvariables?\b/i },
  { name: "context packet", pattern: /\bcontext[- ]packet\b/i },
  { name: "examples", pattern: /\bexamples?\b/i },
  { name: "constraints", pattern: /\bconstraints?\b/i },
  { name: "output schema", pattern: /\boutput[- ]schema\b/i },
  { name: "eval cases", pattern: /\beval[- ]cases?\b|\bevaluation[- ]cases?\b/i },
  { name: "version note", pattern: /\bversion[- ]note\b/i },
];

/**
 * Parses command-line options for the package validator.
 * @param {string[]} argv
 * @returns {CliArgs}
 * @throws {Error} When an option is unknown or missing its value.
 */
function parseArgs(argv) {
  /** @type {CliArgs} */
  const args = {
    root: DEFAULT_ROOT,
    evals: null,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = requireValue(argv, (index += 1), arg);
    } else if (arg === "--evals") {
      args.evals = requireValue(argv, (index += 1), arg);
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw makeCliError("ARG_UNKNOWN", `Unknown argument: ${arg}`);
    }
  }

  if (!args.evals) {
    args.evals = path.join(args.root, "assets/evals/prompt-maker-cases.jsonl");
  }
  return args;
}

/**
 * @param {string[]} argv
 * @param {number} index
 * @param {string} flag
 * @returns {string}
 */
function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw makeCliError("ARG_VALUE_MISSING", `${flag} requires a value`);
  }
  return value;
}

/**
 * @param {string} code
 * @param {string} message
 * @returns {CliError}
 */
function makeCliError(code, message) {
  const error = new Error(message);
  return Object.assign(error, { code });
}

/**
 * Runs validation and returns the process exit code.
 * @returns {number}
 */
function run() {
  /** @type {CliArgs} */
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const result = emptyResult(DEFAULT_ROOT, path.join(DEFAULT_ROOT, "assets/evals/prompt-maker-cases.jsonl"));
    const cliError = error instanceof Error && "code" in error && typeof error.code === "string"
      ? /** @type {CliError} */ (error)
      : makeCliError("ARG_ERROR", error instanceof Error ? error.message : String(error));
    result.errors.push(errorObject(cliError.code, cliError.message));
    writeResult(result, process.argv.includes("--json"));
    return result.ok ? 0 : 1;
  }

  if (args.help) {
    printHelp();
    return 0;
  }

  const rootAbs = path.resolve(args.root);
  const evals = args.evals || path.join(args.root, "assets/evals/prompt-maker-cases.jsonl");
  const evalsAbs = path.resolve(evals);
  /** @type {ValidationError[]} */
  const errors = [];
  /** @type {ValidationError[]} */
  const warnings = [];

  if (!existsDirectory(rootAbs)) {
    errors.push(errorObject("ROOT_MISSING", `Root directory is missing: ${displayPath(rootAbs)}`, {
      path: displayPath(rootAbs),
    }));
  }

  const files = existsDirectory(rootAbs) ? walkFiles(rootAbs, errors) : [];
  const markdownFiles = files.filter((filePath) => filePath.endsWith(".md"));
  const skillChecks = validateSkillFile(rootAbs, errors);
  const linkChecks = validateLinks(rootAbs, markdownFiles, errors);
  const fenceChecks = validateCodeFences(rootAbs, markdownFiles, errors);
  const bilingualChecks = validateBilingualPairs(rootAbs, markdownFiles, errors);
  const strayDocs = validateStrayDocs(rootAbs, files, errors);
  const authorityRefs = validateAuthorityReferences(rootAbs, files, errors);
  const templates = validateTemplates(rootAbs, errors);
  const evalCases = validateEvalCases(evalsAbs, errors);

  const result = {
    ok: errors.length === 0,
    root: normalizePath(args.root),
    evals: normalizePath(evals),
    errors,
    warnings,
    summary: {
      markdownFiles: markdownFiles.length,
      evalCases: evalCases.total,
      evalCategories: evalCases.categories,
      linksChecked: linkChecks.checked,
      skill: skillChecks,
      codeFences: fenceChecks,
      bilingualPairs: bilingualChecks,
      strayDocs,
      authorityRefs,
      templates,
    },
  };

  writeResult(result, args.json);
  return result.ok ? 0 : 1;
}

/**
 * @param {string} root
 * @param {string} evals
 * @returns {{ ok: false, root: string, evals: string, errors: ValidationError[], warnings: ValidationError[], summary: { markdownFiles: number, evalCases: number, evalCategories: Record<string, number>, linksChecked: number } }}
 */
function emptyResult(root, evals) {
  return {
    ok: false,
    root: normalizePath(root),
    evals: normalizePath(evals),
    /** @type {ValidationError[]} */
    errors: [],
    warnings: [],
    summary: {
      markdownFiles: 0,
      evalCases: 0,
      evalCategories: {},
      linksChecked: 0,
    },
  };
}

/** @param {string} rootAbs @param {ValidationError[]} errors @returns {{ exists: boolean, frontmatterName: boolean, markers: Record<string, boolean>, contractLabels: Record<string, boolean>, activationExamples: Record<string, number> }} */
function validateSkillFile(rootAbs, errors) {
  const skillPath = path.join(rootAbs, "SKILL.md");
  /** @type {{ exists: boolean, frontmatterName: boolean, markers: Record<string, boolean>, contractLabels: Record<string, boolean>, activationExamples: Record<string, number> }} */
  const checks = {
    exists: false,
    frontmatterName: false,
    markers: {},
    contractLabels: {},
    activationExamples: {},
  };

  if (!fs.existsSync(skillPath)) {
    errors.push(errorObject("SKILL_MISSING", "SKILL.md is missing", { path: "SKILL.md" }));
    for (const marker of REQUIRED_MARKERS) checks.markers[marker] = false;
    for (const label of CONTRACT_LABELS) checks.contractLabels[label] = false;
    return checks;
  }

  checks.exists = true;
  const text = readText(skillPath);
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    errors.push(errorObject("FRONTMATTER_MISSING", "SKILL.md must start with closed YAML frontmatter", {
      path: "SKILL.md",
    }));
  } else if (/^name:\s*prompt-maker\s*$/m.test(frontmatter)) {
    checks.frontmatterName = true;
  } else {
    errors.push(errorObject("NAME_MISMATCH", "SKILL.md frontmatter must contain name: prompt-maker", {
      path: "SKILL.md",
    }));
  }

  for (const marker of REQUIRED_MARKERS) {
    const found = new RegExp(`^##\\s+${escapeRegExp(marker)}\\s*$`, "im").test(text);
    checks.markers[marker] = found;
    if (!found) {
      errors.push(errorObject("MARKER_MISSING", `Required SKILL.md marker is missing: ## ${marker}`, {
        path: "SKILL.md",
        marker,
      }));
    }
  }

  const contractLabels = text.includes("## artifact_levels") ? [...CONTRACT_LABELS, "Loop"] : CONTRACT_LABELS;
  for (const label of contractLabels) {
    const found = new RegExp(`\\b${escapeRegExp(label)}\\b`, "i").test(text);
    checks.contractLabels[label] = found;
    if (!found) {
      errors.push(errorObject("CONTRACT_LABEL_MISSING", `Required contract label is missing: ${label}`, {
        path: "SKILL.md",
        label,
      }));
    }
  }

  for (const [label, floor] of Object.entries(ACTIVATION_FLOORS)) {
    const count = countWord(text, label);
    checks.activationExamples[label] = count;
    if (count < floor) {
      errors.push(errorObject("ACTIVATION_EXAMPLE_COUNT", `Expected at least ${floor} ${label} activation example label(s)`, {
        path: "SKILL.md",
        label,
        expected: floor,
        actual: count,
      }));
    }
  }

  return checks;
}

/** @param {string} rootAbs @param {string[]} markdownFiles @param {ValidationError[]} errors */
function validateLinks(rootAbs, markdownFiles, errors) {
  const missing = [];
  let checked = 0;
  for (const filePath of markdownFiles) {
    const relPath = relativePath(rootAbs, filePath);
    const text = readText(filePath);
    for (const href of extractLocalReferences(text)) {
      const cleanHref = stripAnchor(href);
      if (!cleanHref) continue;
      const target = resolvePackageReference(rootAbs, filePath, cleanHref);
      if (!target) continue;
      checked += 1;
      if (!isInside(rootAbs, target) || !fs.existsSync(target)) {
        const item = {
          from: relPath,
          href,
          resolved: target ? displayPath(target) : cleanHref,
        };
        missing.push(item);
        errors.push(errorObject("LINK_MISSING", `Local package reference does not resolve: ${relPath} -> ${href}`, item));
        continue;
      }
      if (relPath.endsWith(".ko.md") && cleanHref.endsWith(".md") && !cleanHref.endsWith(".ko.md")) {
        const localizedTarget = target.replace(/\.md$/, ".ko.md");
        if (fs.existsSync(localizedTarget)) {
          errors.push(errorObject(
            "LOCALIZED_LINK_EXPECTED",
            `Korean markdown must link the localized support file when one exists: ${relPath} -> ${href}`,
            {
              from: relPath,
              href,
              expected: relativePath(rootAbs, localizedTarget),
            },
          ));
        }
      }
    }
  }
  return { ok: missing.length === 0, checked, missing };
}

/** @param {string} text @returns {string[]} */
function extractLocalReferences(text) {
  const refs = [];
  let match;
  const atPattern = /(?:^|[`(>\s])@(rules\/[^\s`)\]#]+|references\/[^\s`)\]#]+)(?:#[^\s`)]+)?/gm;
  while ((match = atPattern.exec(text)) !== null) {
    refs.push(match[1]);
  }

  const markdownPattern = /!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  while ((match = markdownPattern.exec(text)) !== null) {
    const href = match[1].trim();
    if (isExternalHref(href) || href.startsWith("#")) continue;
    refs.push(href);
  }
  return refs;
}

/** @param {string} rootAbs @param {string} filePath @param {string} href @returns {string} */
function resolvePackageReference(rootAbs, filePath, href) {
  if (href.startsWith("/")) {
    return path.resolve(rootAbs, `.${href}`);
  }
  if (href.startsWith("rules/") || href.startsWith("references/") || href.startsWith("assets/")) {
    return path.resolve(rootAbs, decodeURIComponent(href));
  }
  return path.resolve(path.dirname(filePath), decodeURIComponent(href));
}

/** @param {string} rootAbs @param {string[]} markdownFiles @param {ValidationError[]} errors */
function validateCodeFences(rootAbs, markdownFiles, errors) {
  const invalid = [];
  for (const filePath of markdownFiles) {
    const relPath = relativePath(rootAbs, filePath);
    const unclosed = unclosedFences(readText(filePath));
    if (unclosed.length > 0) {
      invalid.push({ path: relPath, unclosed });
      errors.push(errorObject("CODE_FENCE_UNBALANCED", `Unbalanced fenced code block in ${relPath}`, {
        path: relPath,
        unclosed,
      }));
    }
  }
  return { ok: invalid.length === 0, checked: markdownFiles.length, invalid };
}

/** @param {string} text @returns {Fence[]} */
function unclosedFences(text) {
  /** @type {Fence[]} */
  const stack = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)(`{3,}|~{3,})/.exec(lines[index]);
    if (!match) continue;
    const marker = match[2][0];
    const length = match[2].length;
    const current = stack[stack.length - 1];
    if (current && current.marker === marker && length >= current.length) {
      stack.pop();
    } else {
      stack.push({ marker, length, line: index + 1 });
    }
  }
  return stack;
}

/** @param {string} rootAbs @param {string[]} markdownFiles @param {ValidationError[]} errors */
function validateBilingualPairs(rootAbs, markdownFiles, errors) {
  const eligible = markdownFiles
    .map((filePath) => relativePath(rootAbs, filePath))
    .filter((relPath) => !relPath.startsWith("assets/evals/"));
  const markdownSet = new Set(eligible);
  const missing = [];
  const orphan = [];

  for (const relPath of markdownSet) {
    if (relPath.endsWith(".ko.md")) {
      const english = `${relPath.slice(0, -6)}.md`;
      if (!markdownSet.has(english)) {
        orphan.push(relPath);
        errors.push(errorObject("BILINGUAL_PAIR_ORPHAN", `Korean markdown file has no English pair: ${relPath}`, {
          path: relPath,
          expected: english,
        }));
      }
    } else {
      const korean = relPath.replace(/\.md$/, ".ko.md");
      if (!markdownSet.has(korean)) {
        missing.push(korean);
        errors.push(errorObject("BILINGUAL_PAIR_MISSING", `English markdown file has no Korean pair: ${relPath}`, {
          path: relPath,
          expected: korean,
        }));
      }
    }
  }

  return { ok: missing.length === 0 && orphan.length === 0, checked: eligible.length, missing, orphan };
}

/** @param {string} rootAbs @param {string[]} files @param {ValidationError[]} errors */
function validateStrayDocs(rootAbs, files, errors) {
  const found = [];
  for (const filePath of files) {
    const name = path.basename(filePath);
    if (!STRAY_DOC_NAMES.has(name)) continue;
    const relPath = relativePath(rootAbs, filePath);
    found.push(relPath);
    errors.push(errorObject("STRAY_DOC", `Stray broad documentation file is not allowed: ${relPath}`, {
      path: relPath,
    }));
  }
  return { ok: found.length === 0, found };
}

/** @param {string} rootAbs @param {string[]} files @param {ValidationError[]} errors */
function validateAuthorityReferences(rootAbs, files, errors) {
  const forbidden = [
    "~/" + ".agents",
    "~/" + ".codex",
    "/" + "Users/",
    ["global", "skill", "dir"].join(" "),
  ];
  const hits = [];
  for (const filePath of files) {
    if (!isTextLike(filePath)) continue;
    const relPath = relativePath(rootAbs, filePath);
    const text = readText(filePath);
    const lowerText = text.toLowerCase();
    for (const phrase of forbidden) {
      if (!lowerText.includes(phrase.toLowerCase())) continue;
      const item = { path: relPath, phrase };
      hits.push(item);
      errors.push(errorObject("GLOBAL_AUTHORITY_REFERENCE", `Forbidden global or home authority reference in ${relPath}`, item));
    }
  }
  return { ok: hits.length === 0, hits };
}

/** @param {string} rootAbs @param {ValidationError[]} errors */
function validateTemplates(rootAbs, errors) {
  const missing = [];
  const present = [];
  let combined = "";
  for (const relPath of REQUIRED_TEMPLATES) {
    const filePath = path.join(rootAbs, relPath);
    if (!fs.existsSync(filePath)) {
      missing.push(relPath);
      errors.push(errorObject("TEMPLATE_MISSING", `Required template is missing: ${relPath}`, {
        path: relPath,
      }));
      continue;
    }
    present.push(relPath);
    combined += `\n${readText(filePath)}`;
  }

  /** @type {Record<string, boolean>} */
  const concepts = {};
  for (const concept of REQUIRED_TEMPLATE_CONCEPTS) {
    const found = concept.pattern.test(combined);
    concepts[concept.name] = found;
    if (!found) {
      errors.push(errorObject("TEMPLATE_CONCEPT_MISSING", `Required template concept is missing: ${concept.name}`, {
        concept: concept.name,
      }));
    }
  }

  return {
    ok: missing.length === 0 && Object.values(concepts).every(Boolean),
    required: REQUIRED_TEMPLATES,
    present,
    missing,
    concepts,
  };
}

/** @param {string} evalsAbs @param {ValidationError[]} errors */
function validateEvalCases(evalsAbs, errors) {
  /** @type {Record<string, number>} */
  const categories = {};
  /** @type {Record<string, number>} */
  const languages = {};
  /** @type {Record<string, number>} */
  const invocations = {};
  let richCases = 0;
  let total = 0;
  /** @type {Map<string, number>} */
  const seenIds = new Map();
  if (!fs.existsSync(evalsAbs)) {
    errors.push(errorObject("EVAL_FILE_MISSING", `Eval JSONL file is missing: ${displayPath(evalsAbs)}`, {
      path: displayPath(evalsAbs),
    }));
    return { ok: false, total, categories };
  }

  const lines = readText(evalsAbs).split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    const lineNumber = index + 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      pushEvalCaseError(errors, `Eval case line ${lineNumber} is not valid JSON: ${detail}`, { line: lineNumber });
      continue;
    }

    const rowErrors = validateEvalRow(row, lineNumber, seenIds);
    for (const rowError of rowErrors) {
      pushEvalCaseError(errors, rowError.message, rowError.extra);
    }

    if (isJsonObject(row)) {
      total += 1;
      if (isRichEvalRow(row)) richCases += 1;
      if (nonEmptyString(row.category) && ALLOWED_EVAL_CATEGORIES.has(row.category.trim())) {
        const category = row.category.trim();
        categories[category] = (categories[category] || 0) + 1;
      }
      if (nonEmptyString(row.language)) {
        const language = row.language.trim();
        languages[language] = (languages[language] || 0) + 1;
      }
      if (nonEmptyString(row.invocation)) {
        const invocation = row.invocation.trim();
        invocations[invocation] = (invocations[invocation] || 0) + 1;
      }
    }
  }

  const categoryFloors = richCases > 0 ? RICH_EVAL_CATEGORY_FLOORS : EVAL_CATEGORY_FLOORS;
  for (const [category, floor] of Object.entries(categoryFloors)) {
    if ((categories[category] || 0) < floor) {
      errors.push(errorObject("EVAL_CATEGORY_FLOOR", `Expected at least ${floor} eval case(s) for category: ${category}`, {
        category,
        expected: floor,
        actual: categories[category] || 0,
      }));
    }
  }

  if (richCases > 0) {
    for (const [language, floor] of Object.entries(EVAL_LANGUAGE_FLOORS)) {
      if ((languages[language] || 0) < floor) {
        errors.push(errorObject("EVAL_LANGUAGE_FLOOR", `Expected at least ${floor} eval case(s) for language: ${language}`, {
          language,
          expected: floor,
          actual: languages[language] || 0,
        }));
      }
    }

    for (const [invocation, floor] of Object.entries(EVAL_INVOCATION_FLOORS)) {
      if ((invocations[invocation] || 0) < floor) {
        errors.push(errorObject("EVAL_INVOCATION_FLOOR", `Expected at least ${floor} eval case(s) for invocation: ${invocation}`, {
          invocation,
          expected: floor,
          actual: invocations[invocation] || 0,
        }));
      }
    }
  }

  return {
    ok: !errors.some((error) => error.code.startsWith("EVAL_")),
    total,
    categories,
    languages,
    invocations,
    richCases,
  };
}

/**
 * @param {unknown} row
 * @param {number} lineNumber
 * @param {Map<string, number>} seenIds
 * @returns {EvalRowError[]}
 */
function validateEvalRow(row, lineNumber, seenIds) {
  /** @type {EvalRowError[]} */
  const errors = [];
  /** @type {(message: string, extra?: Record<string, unknown>) => void} */
  const fail = (message, extra = {}) => {
    errors.push({ message, extra: { line: lineNumber, ...extra } });
  };
  if (!isJsonObject(row)) {
    fail("Eval case must be a JSON object");
    return errors;
  }
  if (!nonEmptyString(row.id)) {
    fail("Eval case requires non-empty string id", { id: row.id });
  } else {
    const id = row.id.trim();
    if (seenIds.has(id)) {
      fail("Eval case id must be unique", { id, firstLine: seenIds.get(id) });
    } else {
      seenIds.set(id, lineNumber);
    }
  }
  if (!nonEmptyString(row.category)) {
    fail("Eval case requires non-empty string category", { id: row.id });
  } else if (!ALLOWED_EVAL_CATEGORIES.has(row.category.trim())) {
    fail("Eval case category is not allowed", {
      id: row.id,
      category: row.category,
      allowed: Array.from(ALLOWED_EVAL_CATEGORIES),
    });
  }
  if (!nonEmptyString(row.prompt)) fail("Eval case requires non-empty string prompt", { id: row.id });
  if (isRichEvalRow(row)) {
    for (const field of ["language", "invocation", "risk", "runner", "judge", "gate"]) {
      if (!nonEmptyString(row[field])) fail(`Eval case requires non-empty string ${field}`, { id: row.id, field });
    }
    if (!Array.isArray(row.trace) || row.trace.length === 0) {
      fail("Eval case trace must contain at least one non-empty string", { id: row.id });
    } else {
      validateStringArray(row.trace, "trace", row.id, fail);
    }
  }
  if (!isJsonObject(row.expected)) {
    fail("Eval case requires expected object", { id: row.id });
    return errors;
  }
  if (!Array.isArray(row.expected.must)) {
    fail("Eval case expected.must must be an array", { id: row.id });
  } else if (row.expected.must.length === 0) {
    fail("Eval case expected.must must contain at least one non-empty string", { id: row.id });
  } else {
    validateStringArray(row.expected.must, "expected.must", row.id, fail);
  }
  if (!Array.isArray(row.expected.mustNot)) {
    fail("Eval case expected.mustNot must be an array", { id: row.id });
  } else {
    validateStringArray(row.expected.mustNot, "expected.mustNot", row.id, fail);
  }
  return errors;
}

/** @param {JsonObject} row @returns {boolean} */
function isRichEvalRow(row) {
  return ["language", "invocation", "risk", "runner", "judge", "trace", "gate"].some((field) => field in row);
}

/**
 * @param {unknown[]} values
 * @param {string} field
 * @param {unknown} id
 * @param {(message: string, extra?: Record<string, unknown>) => void} fail
 */
function validateStringArray(values, field, id, fail) {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!nonEmptyString(value)) {
      fail(`Eval case ${field} item must be a non-empty string`, { id, index, value });
    }
  }
}

/** @param {ValidationError[]} errors @param {string} message @param {Record<string, unknown>} extra */
function pushEvalCaseError(errors, message, extra) {
  errors.push(errorObject("EVAL_CASE_INVALID", message, extra));
}

/** @param {string} text @returns {string|null} */
function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end === -1) return null;
  return text.slice(4, end);
}

/** @param {string} rootAbs @param {ValidationError[]} errors @returns {string[]} */
function walkFiles(rootAbs, errors) {
  const files = [];
  /** @type {string[]} */
  const stack = [rootAbs];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (error) {
      errors.push(errorObject("DIR_READ_FAILED", `Cannot read directory: ${displayPath(current)}`, {
        path: displayPath(current),
        detail: error instanceof Error ? error.message : String(error),
      }));
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

/** @param {string} filePath @returns {boolean} */
function existsDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

/** @param {string} filePath @returns {string} */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/** @param {string} filePath @returns {boolean} */
function isTextLike(filePath) {
  return /\.(?:md|markdown|txt|json|jsonl|mjs|js|yaml|yml)$/i.test(filePath);
}

/** @param {string} href @returns {boolean} */
function isExternalHref(href) {
  return /^(?:https?:|mailto:|tel:)/i.test(href);
}

/** @param {string} href @returns {string} */
function stripAnchor(href) {
  return href.split("#")[0];
}

/** @param {string} rootAbs @param {string} targetAbs @returns {boolean} */
function isInside(rootAbs, targetAbs) {
  const rel = path.relative(rootAbs, targetAbs);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

/** @param {string} rootAbs @param {string} filePath @returns {string} */
function relativePath(rootAbs, filePath) {
  return normalizePath(path.relative(rootAbs, filePath));
}

/** @param {string} filePath @returns {string} */
function displayPath(filePath) {
  return normalizePath(path.relative(process.cwd(), filePath) || filePath);
}

/** @param {string} filePath @returns {string} */
function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

/** @param {string} text @param {string} word @returns {number} */
function countWord(text, word) {
  const matches = text.match(new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi"));
  return matches ? matches.length : 0;
}

/** @param {unknown} value @returns {value is string} */
function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {value is JsonObject}
 */
function isJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** @param {string} code @param {string} message @param {Record<string, unknown>} [extra] @returns {ValidationError} */
function errorObject(code, message, extra = {}) {
  return { code, message, ...extra };
}

/** @param {string} value @returns {string} */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function printHelp() {
  console.log(`Usage: node skills/prompt-maker/scripts/validate-prompt-maker.mjs [--root <dir>] [--evals <jsonl>] [--json]

Validates the repository-local prompt-maker package with Node built-ins only.

Options:
  --root <dir>     Skill root directory. Defaults to skills/prompt-maker.
  --evals <file>   JSONL eval cases. Defaults to <root>/assets/evals/prompt-maker-cases.jsonl.
  --json           Emit one structured JSON object.
  --help           Show this help.
`);
}

/** @param {{ ok: boolean, errors: ValidationError[], summary: { markdownFiles: number, evalCases: number } }} result @param {boolean} json */
function writeResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.ok) {
    console.log(`PASS prompt-maker validation (${result.summary.markdownFiles} markdown files, ${result.summary.evalCases} eval cases)`);
    return;
  }

  console.error(`FAIL prompt-maker validation (${result.errors.length} error${result.errors.length === 1 ? "" : "s"})`);
  for (const error of result.errors) {
    console.error(`${error.code}: ${error.message}`);
  }
}

process.exit(run());
