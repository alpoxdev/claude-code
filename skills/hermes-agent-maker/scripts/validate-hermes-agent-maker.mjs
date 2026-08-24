#!/usr/bin/env bun
// @ts-check
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

/**
 * @typedef {{
 *   root: string,
 *   json: boolean,
 *   help?: boolean
 * }} CliArgs
 *
 * @typedef {{
 *   code: string,
 *   message: string,
 *   path?: string,
 *   detail?: string
 * }} ValidationIssue
 *
 * @typedef {Record<string, unknown>} JsonRecord
 *
 * @typedef {{
 *   $defs?: JsonRecord,
 *   required?: unknown,
 *   properties?: JsonRecord,
 *   allOf?: unknown
 * }} ManifestSchema
 */

/** Directories whose contents must be reachable from SKILL.md. */
const NAMED_DIRECTORIES = ["rules", "references", "scripts", "assets"];
/**
 * Directories that SKILL.md may name as a whole rather than file by file. A
 * pinned schema bundle and a per-kind example set are enumerated collections:
 * naming the directory keeps every member reachable.
 */
const DIRECTORY_LEVEL_NAMING = ["assets/schemas", "assets/examples"];
/** The four invocation modes every eval corpus must exercise. */
const INVOCATION_MODES = ["explicit", "implicit", "contextual", "negative-control"];

/**
 * Parses the standalone validator command line.
 * @param {string[]} argv
 * @returns {CliArgs}
 * @throws {Error} When an option is unknown or missing its value.
 */
function parseArgs(argv) {
  /** @type {CliArgs} */
  const args = { root: "skills/hermes-agent-maker", json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") {
      args.root = requireValue(argv, (index += 1), arg);
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw validationError("ARG_UNKNOWN", `Unknown argument: ${arg}. Use --root <dir> [--json].`);
    }
  }

  return args;
}

/**
 * Reads the value that follows a CLI flag.
 * @param {string[]} argv
 * @param {number} index
 * @param {string} flag
 * @returns {string}
 * @throws {Error} When the flag has no value.
 */
function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw validationError("ARG_VALUE_MISSING", `${flag} requires a value`);
  }
  return value;
}

/**
 * Builds a coded Error for CLI-level failures.
 * @param {string} code
 * @param {string} message
 * @returns {Error & { code: string }}
 */
function validationError(code, message) {
  const error = /** @type {Error & { code: string }} */ (new Error(message));
  error.code = code;
  return error;
}

/**
 * Builds a structured validation issue.
 * @param {string} code
 * @param {string} message
 * @param {JsonRecord} [extra]
 * @returns {ValidationIssue}
 */
function issue(code, message, extra = {}) {
  return { code, message, ...extra };
}

/**
 * Collects every regular file beneath a directory.
 * @param {string} root
 * @returns {string[]}
 */
function walkFiles(root) {
  /** @type {string[]} */
  const files = [];
  /** @type {string[]} */
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  return files.sort();
}

/**
 * Converts an absolute path to a POSIX package-relative path.
 * @param {string} root
 * @param {string} filePath
 * @returns {string}
 */
function relative(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

/**
 * Reads a UTF-8 text file.
 * @param {string} filePath
 * @returns {string}
 */
function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Splits a regular-expression alternation body at depth zero only.
 *
 * A naive `split("|")` over the summary blocklist is wrong: the body contains
 * the NESTED group `schema[ _-]?(?:fetch|retrieval)`, whose inner `|` would be
 * miscounted as a top-level alternative and inflate the term count by one.
 * Tracking parenthesis depth (and skipping escaped characters, so an escaped
 * `\(` never opens a group) keeps that nested alternation as a single term.
 * @param {string} body
 * @returns {string[]}
 */
function splitAlternationDepthAware(body) {
  /** @type {string[]} */
  const parts = [];
  let depth = 0;
  let current = "";
  let inClass = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (char === "\\") {
      current += char + (body[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (char === "[") inClass = true;
    else if (char === "]") inClass = false;
    else if (!inClass && char === "(") depth += 1;
    else if (!inClass && char === ")") depth -= 1;
    else if (!inClass && char === "|" && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts;
}

/**
 * Rewrites case-insensitive character classes such as `[Ee]` back to a letter.
 * @param {string} term
 * @returns {string}
 */
function normalizeCaseClasses(term) {
  return term.replace(/\[([A-Za-z])([A-Za-z])\]/gu, (match, upper, lower) =>
    String(upper).toLowerCase() === String(lower).toLowerCase() ? String(lower).toLowerCase() : match);
}

/**
 * Expands optional quantifiers into the concrete spellings they accept, so a
 * schema term such as `credentials?` reconciles against a document that spells
 * out `credential` and `credentials` separately.
 * @param {string} term
 * @returns {string[]}
 */
function expandOptionalGroups(term) {
  /** @type {Set<string>} */
  const results = new Set();
  /** @type {string[]} */
  const queue = [term];
  while (queue.length > 0) {
    const value = queue.pop();
    if (value === undefined) continue;
    const group = /\(\?:([^()]*)\)\?/u.exec(value);
    if (group) {
      queue.push(value.slice(0, group.index) + group[1] + value.slice(group.index + group[0].length));
      queue.push(value.slice(0, group.index) + value.slice(group.index + group[0].length));
      continue;
    }
    const letter = /(?<!\\)([A-Za-z])\?/u.exec(value);
    if (letter) {
      queue.push(value.slice(0, letter.index) + letter[1] + value.slice(letter.index + letter[0].length));
      queue.push(value.slice(0, letter.index) + value.slice(letter.index + letter[0].length));
      continue;
    }
    results.add(value);
  }
  return [...results].sort();
}

/**
 * Derives the forbidden summary terms from the live manifest schema pattern.
 * @param {string} pattern
 * @returns {string[]}
 */
function deriveForbiddenTerms(pattern) {
  /** @type {string[]} */
  const terms = [];
  const literal = /\(\?!\.\*(\\\.\[[A-Za-z]{2}\](?:\[[A-Za-z]{2}\])*)\\b\)/u.exec(pattern);
  if (literal) terms.push(normalizeCaseClasses(literal[1]).replace(/\\\./u, "."));
  const alternation = /\(\?!\.\*\\b\(\?:([\s\S]*?)\)\\b\)/u.exec(pattern);
  if (alternation) {
    for (const part of splitAlternationDepthAware(alternation[1])) {
      terms.push(normalizeCaseClasses(part));
    }
  }
  return terms;
}

/**
 * (a) Asserts the routing rule's required-field list matches the schema's
 * `required` array exactly, and that the schema's forbidden summary terms are
 * all documented in the same rule.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, schemaRequired: string[], documentedRequired: string[], forbiddenTerms: string[], undocumentedTerms: string[] }}
 */
function checkRoutingRequiredFields(root, errors) {
  const routingPath = path.join(root, "rules", "routing.md");
  const schemaPath = path.join(root, "assets", "manifest.schema.json");
  /** @type {string[]} */
  const schemaRequired = [];
  /** @type {string[]} */
  const documentedRequired = [];
  /** @type {string[]} */
  const forbiddenTerms = [];
  /** @type {string[]} */
  const undocumentedTerms = [];

  if (!fs.existsSync(routingPath) || !fs.existsSync(schemaPath)) {
    errors.push(issue("ROUTING_SOURCE_MISSING",
      `Invariant (a) routing/schema parity: both rules/routing.md and assets/manifest.schema.json must exist under ${relative(process.cwd(), root)}`));
    return { ok: false, schemaRequired, documentedRequired, forbiddenTerms, undocumentedTerms };
  }

  /** @type {ManifestSchema} */
  const schema = JSON.parse(readText(schemaPath));
  if (Array.isArray(schema.required)) {
    for (const field of schema.required) if (typeof field === "string") schemaRequired.push(field);
  }

  const routing = readText(routingPath);
  const sentence = /`NormalizedArtifactSpec`\s+needs\s+([^\n]*?)(?::|\.)\s*$/mu.exec(routing);
  if (!sentence) {
    errors.push(issue("ROUTING_FIELD_LIST_MISSING",
      "Invariant (a) routing/schema parity: rules/routing.md must state the required fields in a sentence beginning '`NormalizedArtifactSpec` needs ...'"));
    return { ok: false, schemaRequired, documentedRequired, forbiddenTerms, undocumentedTerms };
  }
  const beforeOptional = sentence[1].split(/\bplus\b/u)[0];
  for (const match of beforeOptional.matchAll(/`([a-z_]+)`/gu)) documentedRequired.push(match[1]);

  const missing = schemaRequired.filter((field) => !documentedRequired.includes(field));
  const extra = documentedRequired.filter((field) => !schemaRequired.includes(field));
  if (missing.length > 0 || extra.length > 0) {
    errors.push(issue("ROUTING_REQUIRED_FIELD_DRIFT",
      `Invariant (a) routing/schema parity: rules/routing.md required-field list must match assets/manifest.schema.json "required". Missing from routing.md: [${missing.join(", ")}]. Not in schema: [${extra.join(", ")}]. Schema requires [${schemaRequired.join(", ")}].`,
      { missing, extra, schemaRequired, documentedRequired }));
  }

  const summaryPattern = /** @type {{ pattern?: unknown } | undefined} */ (
    /** @type {JsonRecord | undefined} */ (schema.$defs)?.summary)?.pattern;
  if (typeof summaryPattern === "string") {
    forbiddenTerms.push(...deriveForbiddenTerms(summaryPattern));
    // COVERAGE, never a literal count: the schema pattern is the source of
    // truth, and routing.md may document one schema term either verbatim
    // (`install(?:ation)?`) or expanded into its concrete spellings
    // (`credential` and `credentials` for `credentials?`). Both are correct, so
    // a term counts as documented when the verbatim form OR every expansion
    // appears. Asserting a term total against a literal would be wrong: the
    // two spellings do not produce the same count.
    for (const term of forbiddenTerms) {
      const spellings = expandOptionalGroups(term);
      const documented = routing.includes(`\`${term}\``)
        || spellings.every((spelling) => routing.includes(`\`${spelling}\``));
      if (!documented) undocumentedTerms.push(term);
    }
    if (undocumentedTerms.length > 0) {
      errors.push(issue("ROUTING_FORBIDDEN_TERM_UNDOCUMENTED",
        `Invariant (a) routing/schema parity: every forbidden summary term in the manifest schema must be documented in rules/routing.md. Undocumented: [${undocumentedTerms.join(", ")}]. Derived ${forbiddenTerms.length} term(s) from the schema pattern.`,
        { undocumentedTerms, forbiddenTerms }));
    }
  } else {
    errors.push(issue("SCHEMA_SUMMARY_PATTERN_MISSING",
      "Invariant (a) routing/schema parity: assets/manifest.schema.json must define $defs.summary.pattern"));
  }

  return {
    ok: missing.length === 0 && extra.length === 0 && undocumentedTerms.length === 0 && typeof summaryPattern === "string",
    schemaRequired,
    documentedRequired,
    forbiddenTerms,
    undocumentedTerms,
  };
}

/**
 * (b) Asserts every `E_*` code emitted by the two package scripts is documented
 * in references/error-codes.md.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, emitted: string[], undocumented: string[], bareTokenExcluded: boolean }}
 */
function checkErrorCodeCoverage(root, errors) {
  const sources = ["generate.mjs", "validate-portable-v1-output.mjs"].map((name) => path.join(root, "scripts", name));
  const docPath = path.join(root, "references", "error-codes.md");
  /** @type {Set<string>} */
  const emittedSet = new Set();
  let bareTokenExcluded = false;

  for (const source of sources) {
    if (!fs.existsSync(source)) {
      errors.push(issue("ERROR_CODE_SOURCE_MISSING",
        `Invariant (b) error-code coverage: source script is missing: ${relative(root, source)}`, { path: relative(root, source) }));
      continue;
    }
    for (const match of readText(source).matchAll(/\bE_[A-Z0-9_]*/gu)) {
      const token = match[0];
      // DELIBERATE EXCLUSION: the bare `E_` token is NOT an emitted error code.
      // It is the sentinel prefix in the guard `error.message.startsWith("E_")`
      // inside validate-portable-v1-output.mjs, which re-throws an
      // already-coded error rather than masking it as E_REFERENCE. Including it
      // would demand a nonexistent `E_` row in error-codes.md.
      if (token === "E_") {
        bareTokenExcluded = true;
        continue;
      }
      emittedSet.add(token);
    }
  }

  const emitted = [...emittedSet].sort();
  /** @type {string[]} */
  const undocumented = [];
  if (!fs.existsSync(docPath)) {
    errors.push(issue("ERROR_CODE_DOC_MISSING",
      "Invariant (b) error-code coverage: references/error-codes.md is missing", { path: "references/error-codes.md" }));
    return { ok: false, emitted, undocumented: emitted, bareTokenExcluded };
  }

  const doc = readText(docPath);
  /** @type {Set<string>} */
  const documented = new Set([...doc.matchAll(/`(E_[A-Z0-9_]+)`/gu)].map((match) => match[1]));
  for (const code of emitted) if (!documented.has(code)) undocumented.push(code);

  if (undocumented.length > 0) {
    errors.push(issue("ERROR_CODE_UNDOCUMENTED",
      `Invariant (b) error-code coverage: every E_* code emitted by scripts/generate.mjs and scripts/validate-portable-v1-output.mjs must appear in references/error-codes.md. Undocumented: [${undocumented.join(", ")}]. Add a row for each, then re-run.`,
      { undocumented, emittedCount: emitted.length }));
  }

  return { ok: undocumented.length === 0, emitted, undocumented, bareTokenExcluded };
}

/**
 * (c) Asserts every support file is NAMED in SKILL.md. The repository corpus
 * validator checks that links resolve, not that files are reachable, so this is
 * the only gate that catches an orphaned support file.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, checked: number, orphaned: string[] }}
 */
function checkSupportFileReachability(root, errors) {
  const skillPath = path.join(root, "SKILL.md");
  /** @type {string[]} */
  const orphaned = [];
  if (!fs.existsSync(skillPath)) {
    errors.push(issue("SKILL_MISSING", "Invariant (c) reachability: SKILL.md is missing", { path: "SKILL.md" }));
    return { ok: false, checked: 0, orphaned };
  }

  const skill = readText(skillPath);
  /** @type {string[]} */
  const candidates = [];
  for (const directory of NAMED_DIRECTORIES) {
    const full = path.join(root, directory);
    if (!fs.existsSync(full)) continue;
    for (const filePath of walkFiles(full)) candidates.push(relative(root, filePath));
  }

  for (const candidate of candidates) {
    // A Korean mirror inherits its English source's reachability; SKILL.ko.md
    // names the mirrors and invariant (f) enforces the pairing.
    if (candidate.endsWith(".ko.md")) continue;
    const umbrella = DIRECTORY_LEVEL_NAMING.find((directory) => candidate.startsWith(`${directory}/`));
    const named = umbrella
      ? skill.includes(umbrella)
      : skill.includes(candidate) || skill.includes(path.posix.basename(candidate));
    if (!named) orphaned.push(candidate);
  }

  if (orphaned.length > 0) {
    errors.push(issue("SUPPORT_FILE_ORPHANED",
      `Invariant (c) reachability: every support file under ${NAMED_DIRECTORIES.map((d) => `${d}/`).join(", ")} must be named in SKILL.md (or its containing directory for ${DIRECTORY_LEVEL_NAMING.join(", ")}). Orphaned: [${orphaned.join(", ")}]. Name each in the SKILL.md package map, then re-run.`,
      { orphaned }));
  }

  return { ok: orphaned.length === 0, checked: candidates.length, orphaned };
}

/**
 * Reports whether a value is a plain JSON object.
 * @param {unknown} value
 * @returns {value is JsonRecord}
 */
function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Validates one example spec against the manifest schema's structural rules:
 * declared `required` fields, `additionalProperties: false`, `enum`/`const`
 * property values, and the `allOf` conditional branches.
 * @param {JsonRecord} spec
 * @param {ManifestSchema} schema
 * @returns {string[]}
 */
function validateSpecAgainstSchema(spec, schema) {
  /** @type {string[]} */
  const failures = [];
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const defs = isRecord(schema.$defs) ? schema.$defs : {};

  /** @param {unknown} node @returns {JsonRecord} */
  const resolve = (node) => {
    if (!isRecord(node)) return {};
    const ref = node.$ref;
    if (typeof ref === "string") {
      const key = ref.replace("#/$defs/", "");
      return isRecord(defs[key]) ? /** @type {JsonRecord} */ (defs[key]) : {};
    }
    return node;
  };

  /** @param {string} key @param {unknown} value @param {JsonRecord} rule */
  const checkValue = (key, value, rule) => {
    if (Array.isArray(rule.enum) && !rule.enum.includes(value)) {
      failures.push(`${key} must be one of [${rule.enum.join(", ")}] but was ${JSON.stringify(value)}`);
    }
    if ("const" in rule && value !== rule.const) {
      failures.push(`${key} must equal ${JSON.stringify(rule.const)} but was ${JSON.stringify(value)}`);
    }
    if (rule.type === "string") {
      if (typeof value !== "string") {
        failures.push(`${key} must be a string but was ${JSON.stringify(value)}`);
        return;
      }
      if (typeof rule.minLength === "number" && value.length < rule.minLength) {
        failures.push(`${key} must be at least ${rule.minLength} characters`);
      }
      if (typeof rule.maxLength === "number" && value.length > rule.maxLength) {
        failures.push(`${key} must be at most ${rule.maxLength} characters but was ${value.length}`);
      }
      if (typeof rule.pattern === "string" && !new RegExp(rule.pattern, "u").test(value)) {
        failures.push(`${key} must match the schema pattern but was ${JSON.stringify(value)}`);
      }
    }
    if (rule.type === "boolean" && typeof value !== "boolean") {
      failures.push(`${key} must be a boolean but was ${JSON.stringify(value)}`);
    }
  };

  for (const field of Array.isArray(schema.required) ? schema.required : []) {
    if (typeof field === "string" && !(field in spec)) failures.push(`missing required field ${field}`);
  }
  for (const key of Object.keys(spec)) {
    if (!(key in properties)) {
      failures.push(`unknown field ${key} is rejected by additionalProperties: false`);
      continue;
    }
    checkValue(key, spec[key], resolve(properties[key]));
  }

  for (const branch of Array.isArray(schema.allOf) ? schema.allOf : []) {
    if (!isRecord(branch)) continue;
    const condition = isRecord(branch.if) ? branch.if : null;
    if (!condition) continue;
    const conditionProperties = isRecord(condition.properties) ? condition.properties : {};
    const matches = Object.entries(conditionProperties).every(([key, rule]) => {
      if (!isRecord(rule)) return false;
      if (Array.isArray(rule.enum)) return rule.enum.includes(spec[key]);
      if ("const" in rule) return spec[key] === rule.const;
      return false;
    }) && (Array.isArray(condition.required) ? condition.required.every((key) => typeof key === "string" && key in spec) : true);

    const outcome = matches ? branch.then : branch.else;
    if (!isRecord(outcome)) continue;
    for (const field of Array.isArray(outcome.required) ? outcome.required : []) {
      if (typeof field === "string" && !(field in spec)) failures.push(`missing conditionally required field ${field}`);
    }
    const negated = isRecord(outcome.not) ? outcome.not : null;
    for (const field of negated && Array.isArray(negated.required) ? negated.required : []) {
      if (typeof field === "string" && field in spec) failures.push(`field ${field} is forbidden for kind ${JSON.stringify(spec.kind)}`);
    }
    const outcomeProperties = isRecord(outcome.properties) ? outcome.properties : {};
    for (const [key, rule] of Object.entries(outcomeProperties)) {
      if (!(key in spec) || !isRecord(rule)) continue;
      checkValue(key, spec[key], { type: "string", ...rule });
    }
  }

  return failures;
}

/**
 * (d) Asserts every assets/examples/spec-*.json validates against the manifest
 * schema's structural rules.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, checked: number, invalid: Array<{ path: string, failures: string[] }> }}
 */
function checkExampleSpecs(root, errors) {
  const schemaPath = path.join(root, "assets", "manifest.schema.json");
  const examplesDir = path.join(root, "assets", "examples");
  /** @type {Array<{ path: string, failures: string[] }>} */
  const invalid = [];

  if (!fs.existsSync(schemaPath) || !fs.existsSync(examplesDir)) {
    errors.push(issue("EXAMPLE_SOURCE_MISSING",
      "Invariant (d) example specs: assets/manifest.schema.json and assets/examples/ must both exist"));
    return { ok: false, checked: 0, invalid };
  }

  /** @type {ManifestSchema} */
  const schema = JSON.parse(readText(schemaPath));
  const specs = walkFiles(examplesDir).filter((filePath) => /\/spec-[^/]+\.json$/u.test(relative(root, filePath)));
  if (specs.length === 0) {
    errors.push(issue("EXAMPLE_SPECS_ABSENT",
      "Invariant (d) example specs: assets/examples/ must contain at least one spec-*.json example"));
    return { ok: false, checked: 0, invalid };
  }

  for (const specPath of specs) {
    const display = relative(root, specPath);
    /** @type {unknown} */
    let parsed;
    try {
      parsed = JSON.parse(readText(specPath));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      invalid.push({ path: display, failures: [`not valid JSON: ${detail}`] });
      errors.push(issue("EXAMPLE_SPEC_INVALID",
        `Invariant (d) example specs: ${display} is not valid JSON: ${detail}`, { path: display }));
      continue;
    }
    if (!isRecord(parsed)) {
      invalid.push({ path: display, failures: ["must be a JSON object"] });
      errors.push(issue("EXAMPLE_SPEC_INVALID",
        `Invariant (d) example specs: ${display} must be a JSON object`, { path: display }));
      continue;
    }
    const failures = validateSpecAgainstSchema(parsed, schema);
    if (failures.length > 0) {
      invalid.push({ path: display, failures });
      errors.push(issue("EXAMPLE_SPEC_INVALID",
        `Invariant (d) example specs: ${display} violates assets/manifest.schema.json: ${failures.join("; ")}`,
        { path: display, failures }));
    }
  }

  return { ok: invalid.length === 0, checked: specs.length, invalid };
}

/**
 * (e) Asserts every eval row carries a supported invocationMode and that all
 * four modes occur in the corpus.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, path: string, total: number, counts: Record<string, number>, missingModes: string[] }}
 */
function checkEvalInvocationModes(root, errors) {
  const evalsDir = path.join(root, "assets", "evals");
  /** @type {Record<string, number>} */
  const counts = {};
  for (const mode of INVOCATION_MODES) counts[mode] = 0;

  if (!fs.existsSync(evalsDir)) {
    errors.push(issue("EVAL_DIR_MISSING",
      "Invariant (e) invocation modes: assets/evals/ is missing", { path: "assets/evals" }));
    return { ok: false, path: "assets/evals", total: 0, counts, missingModes: [...INVOCATION_MODES] };
  }

  const jsonlFiles = walkFiles(evalsDir).filter((filePath) => filePath.endsWith(".jsonl"));
  if (jsonlFiles.length === 0) {
    errors.push(issue("EVAL_FILE_MISSING",
      "Invariant (e) invocation modes: assets/evals/ must contain a .jsonl eval corpus", { path: "assets/evals" }));
    return { ok: false, path: "assets/evals", total: 0, counts, missingModes: [...INVOCATION_MODES] };
  }

  const evalsPath = relative(root, jsonlFiles[0]);
  let total = 0;
  let rowFailures = 0;
  for (const filePath of jsonlFiles) {
    const display = relative(root, filePath);
    const lines = readText(filePath).split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      if (line.trim() === "") return;
      /** @type {unknown} */
      let row;
      try {
        row = JSON.parse(line);
      } catch (error) {
        rowFailures += 1;
        errors.push(issue("EVAL_ROW_INVALID",
          `Invariant (e) invocation modes: ${display} line ${lineNumber} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
          { path: display, line: lineNumber }));
        return;
      }
      total += 1;
      const mode = isRecord(row) ? row.invocationMode : undefined;
      if (typeof mode !== "string" || !INVOCATION_MODES.includes(mode)) {
        rowFailures += 1;
        const id = isRecord(row) && typeof row.id === "string" ? row.id : `line ${lineNumber}`;
        errors.push(issue("EVAL_INVOCATION_MODE_INVALID",
          `Invariant (e) invocation modes: eval row ${id} in ${display} must carry an invocationMode in {${INVOCATION_MODES.join(", ")}} but had ${JSON.stringify(mode)}`,
          { path: display, line: lineNumber, id }));
        return;
      }
      counts[mode] += 1;
    });
  }

  const missingModes = INVOCATION_MODES.filter((mode) => counts[mode] === 0);
  if (missingModes.length > 0) {
    errors.push(issue("EVAL_INVOCATION_MODE_UNCOVERED",
      `Invariant (e) invocation modes: the eval corpus must exercise all four invocation modes; none present for [${missingModes.join(", ")}]. Add at least one row per missing mode.`,
      { missingModes, counts }));
  }

  return { ok: rowFailures === 0 && missingModes.length === 0, path: evalsPath, total, counts, missingModes };
}

/**
 * (f) Asserts every English `*.md` in the package has a `*.ko.md` sibling.
 * @param {string} root
 * @param {ValidationIssue[]} errors
 * @returns {{ ok: boolean, checked: number, missing: string[], orphaned: string[] }}
 */
function checkBilingualPairs(root, errors) {
  const markdown = new Set(walkFiles(root)
    .filter((filePath) => filePath.endsWith(".md"))
    .map((filePath) => relative(root, filePath)));
  /** @type {string[]} */
  const missing = [];
  /** @type {string[]} */
  const orphaned = [];

  for (const file of [...markdown].sort()) {
    if (file.endsWith(".ko.md")) {
      const source = `${file.slice(0, -6)}.md`;
      if (!markdown.has(source)) orphaned.push(file);
      continue;
    }
    const parsed = path.posix.parse(file);
    const korean = path.posix.join(parsed.dir, `${parsed.name}.ko.md`);
    if (!markdown.has(korean)) missing.push(korean);
  }

  if (missing.length > 0) {
    errors.push(issue("BILINGUAL_PAIR_MISSING",
      `Invariant (f) bilingual pairs: every *.md must have a *.ko.md sibling. Missing: [${missing.join(", ")}]. Author each Korean mirror, then re-run.`,
      { missing }));
  }
  if (orphaned.length > 0) {
    errors.push(issue("BILINGUAL_PAIR_ORPHANED",
      `Invariant (f) bilingual pairs: Korean mirror has no English source: [${orphaned.join(", ")}]`,
      { orphaned }));
  }

  return { ok: missing.length === 0 && orphaned.length === 0, checked: markdown.size, missing, orphaned };
}

/**
 * Prints the CLI usage banner.
 * @returns {void}
 */
function printHelp() {
  console.log(`Usage: node skills/hermes-agent-maker/scripts/validate-hermes-agent-maker.mjs --root <dir> [--json]

Asserts six self-consistency invariants over the hermes-agent-maker package,
deriving every expected value from the live package sources at runtime.

  (a) rules/routing.md required-field list matches the manifest schema
  (b) every emitted E_* code is documented in references/error-codes.md
  (c) every support file is named in SKILL.md
  (d) every assets/examples/spec-*.json validates against the manifest schema
  (e) every eval row carries an invocationMode and all four modes occur
  (f) every *.md has a *.ko.md sibling

Options:
  --root <dir>   Skill package root. Defaults to skills/hermes-agent-maker.
  --json         Emit structured JSON.
  --help         Show this help.
`);
}

/**
 * Builds the empty result envelope used when the CLI fails before validation.
 * @returns {{ ok: boolean, routingSchemaParity: null, errorCodeCoverage: null, supportFileReachability: null, exampleSpecs: null, evalInvocationModes: null, bilingualPairs: null, errors: ValidationIssue[] }}
 */
function emptyResult() {
  return {
    ok: false,
    routingSchemaParity: null,
    errorCodeCoverage: null,
    supportFileReachability: null,
    exampleSpecs: null,
    evalInvocationModes: null,
    bilingualPairs: null,
    errors: [],
  };
}

/**
 * Writes the validation outcome to stdout or stderr.
 * @param {{ ok: boolean, errors: ValidationIssue[] }} result
 * @param {boolean} json
 * @returns {void}
 */
function writeResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.ok) {
    console.log("hermes-agent-maker validation passed");
    return;
  }
  console.error("hermes-agent-maker validation failed");
  for (const error of result.errors) console.error(`${error.code}: ${error.message}`);
}

/**
 * Runs the validator and returns its process exit code.
 * @returns {number}
 */
function run() {
  /** @type {CliArgs} */
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    const result = emptyResult();
    result.errors.push(issue(
      error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "ARG_ERROR",
      error instanceof Error ? error.message : String(error),
    ));
    writeResult(result, true);
    return 2;
  }

  if (args.help) {
    printHelp();
    return 0;
  }

  const root = path.resolve(args.root);
  /** @type {ValidationIssue[]} */
  const errors = [];

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    const result = emptyResult();
    result.errors.push(issue("ROOT_MISSING", `Root directory is missing: ${args.root}. Pass --root <package dir>.`, { path: args.root }));
    writeResult(result, args.json);
    return 1;
  }

  const result = {
    ok: false,
    routingSchemaParity: checkRoutingRequiredFields(root, errors),
    errorCodeCoverage: checkErrorCodeCoverage(root, errors),
    supportFileReachability: checkSupportFileReachability(root, errors),
    exampleSpecs: checkExampleSpecs(root, errors),
    evalInvocationModes: checkEvalInvocationModes(root, errors),
    bilingualPairs: checkBilingualPairs(root, errors),
    errors,
  };
  result.ok = errors.length === 0;

  writeResult(result, args.json);
  return result.ok ? 0 : 1;
}

process.exit(run());
