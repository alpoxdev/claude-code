#!/usr/bin/env bun
// @ts-check

/** Validate the approved Bun skill-script inventory and safety boundaries. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(root, "scripts/fixtures/skill-script-parity/manifest.json");
const behaviorContractsPath = join(root, "scripts/fixtures/skill-script-parity/behavior/contracts.json");
const skillsPath = join(root, "skills");
const expectedForbiddenLiterals = ["git-commit-detect", ".agents/skills/git-commit", ".claude/skills/git-commit", ".codex/skills/git-commit", "installed|", "missing|"];
const expectedScanTargets = ["skills/version-update", "scripts/fixtures/skill-script-parity/behavior"];
const expectedEnforcementFiles = ["scripts/fixtures/skill-script-parity/manifest.json", "scripts/validate-skills.mjs", "scripts/tests/skill-scripts.test.mjs"];

/** @param {string} directory @returns {string[]} */
function filesBelow(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

/** @param {boolean} condition @param {string} message @returns {asserts condition} */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** @param {string[]} values @returns {string[]} */
function sorted(values) { return [...values].sort((left, right) => left.localeCompare(right)); }
/** @param {string[]} left @param {string[]} right @returns {boolean} */
function sameList(left, right) { return JSON.stringify(sorted(left)) === JSON.stringify(sorted(right)); }
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** @param {unknown} value @returns {value is string} */
function nonEmpty(value) { return typeof value === "string" && value.trim() !== ""; }
/** @param {string} path @returns {boolean} */
function existsInBaseline(path) {
  try { execFileSync("git", ["cat-file", "-e", `990359457e2ccbf2bd4bb65065037d456c5940bc:${path}`], { cwd: root, stdio: "ignore" }); return true; } catch { return false; }
}

/**
 * Validates JSDoc contracts for top-level command, parser, decoder, spawn, and main functions.
 *
 * @param {string} content
 * @param {string} file
 * @returns {void}
 */
function declarationName(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name && ts.isIdentifier(node.name)) return node.name.text;
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) return node.name.text;
  return undefined;
}
/** @param {ts.Node} node @param {ts.SourceFile} source */
function declarationParameters(node, source) {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node.parameters.map((parameter) => parameter.name.getText(source));
  if (ts.isVariableDeclaration(node) && node.initializer
    && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
    return node.initializer.parameters.map((parameter) => parameter.name.getText(source));
  }
  return [];
}
/** @param {ts.Node} node */
function declarationBody(node) {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node.body;
  if (ts.isVariableDeclaration(node) && node.initializer
    && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) return node.initializer.body;
  return undefined;
}
/**
 * Validates JSDoc contracts for top-level command, parser, decoder, spawn, and main declarations.
 *
 * @param {string} content
 * @param {string} file
 * @returns {void}
 */
function validateNamedFunctionDocs(content, file) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const contractName = /^(?:main|parse.*|decode.*|validate.*|spawn.*|git|.*Command|.*Parser|.*Decoder)$/iu;
  const declarations = [];
  const visit = (node, topLevel) => {
    if (topLevel || ts.isClassDeclaration(node) || ts.isObjectLiteralExpression(node)) {
      if (declarationName(node)) declarations.push(node);
      ts.forEachChild(node, (child) => visit(child, topLevel || ts.isClassDeclaration(node) || ts.isObjectLiteralExpression(node)));
    }
  };
  for (const statement of source.statements) visit(statement, true);
  for (const declaration of declarations) {
    const name = declarationName(declaration);
    if (!name || !contractName.test(name)) continue;
    const tags = ts.getJSDocTags(declaration);
    assert(tags.length > 0, `${file}:${name} requires a JSDoc contract`);
    const paramTags = tags
      .filter(ts.isJSDocParameterTag)
      .map((tag) => tag.name.getText(source).replace(/^\[|\]$/gu, ""));
    const parameters = declarationParameters(declaration, source);
    assert(sameList(parameters, paramTags), `${file}:${name} JSDoc @param names must exactly match named parameters`);
    const requiresResultTags = /^(?:main|parse.*|decode.*|spawn.*|git|.*Command|.*Parser|.*Decoder)$/iu.test(name);
    let returnsValue = false;
    let throws = false;
    const body = declarationBody(declaration);
    const inspect = (node) => {
      if (node !== body && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node))) return;
      if (ts.isReturnStatement(node) && node.expression) returnsValue = true;
      if (ts.isThrowStatement(node)) throws = true;
      ts.forEachChild(node, inspect);
    };
    if (body) inspect(body);
    assert(!requiresResultTags || !returnsValue || tags.some(ts.isJSDocReturnTag), `${file}:${name} requires @returns`);
    assert(!requiresResultTags || !throws || tags.some(ts.isJSDocThrowsTag), `${file}:${name} requires @throws`);
  }
}
/** @param {ts.TypeNode | undefined} type */
function hasForbiddenJSDocType(type) {
  if (!type) return false;
  if (type.kind === ts.SyntaxKind.AnyKeyword || type.kind === ts.SyntaxKind.ObjectKeyword) return true;
  if (ts.isTypeReferenceNode(type) && ts.isIdentifier(type.typeName)
    && /^(?:Object|object|any)$/u.test(type.typeName.text)) return true;
  return ts.forEachChild(type, hasForbiddenJSDocType) === true;
}
/**
 * Validates negative type, import, and subprocess policies.
 *
 * @param {string} content
 * @param {string} file
 * @returns {void}
 */
function validateStaticPolicy(content, file) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const checkedComments = new Set();
  const checkComments = (ranges) => {
    for (const range of ranges ?? []) {
      const key = `${range.pos}:${range.end}`;
      if (checkedComments.has(key)) continue;
      checkedComments.add(key);
      assert(!/@ts-(?:ignore|expect-error|nocheck)\b|eslint-disable(?:-next-line|-line)?\b/u.test(content.slice(range.pos, range.end)), `${file} must not suppress static checks`);
    }
  };
  const visit = (node) => {
    checkComments(ts.getLeadingCommentRanges(content, node.getFullStart()));
    checkComments(ts.getTrailingCommentRanges(content, node.end));
    if (ts.getJSDocTags(node).some((tag) => hasForbiddenJSDocType(tag.typeExpression?.type))
      || hasForbiddenJSDocType(ts.getJSDocType(node))) {
      assert(false, `${file} must not use generic Object/object/any JSDoc types`);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const approvedSiblingImport = file === "skills/hermes-agent-maker/scripts/generate.mjs"
        && node.moduleSpecifier.text === "./validate-portable-v1-output.mjs";
      assert(node.moduleSpecifier.text.startsWith("node:") || approvedSiblingImport, `${file} imports must use node: built-ins or its approved portable oracle`);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      assert(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.startsWith("node:"), `${file} dynamic imports must use node: built-ins`);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require") {
      assert(node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text.startsWith("node:"), `${file} require imports must use node: built-ins`);
    }
    if (ts.isCallExpression(node)
      && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(source) === "Bun"
      && node.expression.name.text === "spawn") {
      assert(node.arguments.length === 1 && ts.isObjectLiteralExpression(node.arguments[0]), `${file} Bun.spawn must use one object argument`);
      const properties = node.arguments[0].properties;
      assert([...properties].every((property) => ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property)), `${file} Bun.spawn fields must be explicit`);
      const names = properties.map((property) => property.name.getText(source).replace(/^["']|["']$/gu, ""));
      assert(sameList(names, ["cmd", "cwd", "env", "stdout", "stderr"]) && new Set(names).size === names.length, `${file} Bun.spawn fields must be exactly cmd, cwd, env, stdout, stderr`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const manifest = /** @type {Record<string, unknown>} */ (JSON.parse(readFileSync(manifestPath, "utf8")));
assert(Array.isArray(manifest.scripts), "manifest scripts must be an array");
assert(manifest.scripts.length === 32, "manifest must contain exactly 32 scripts");
assert(manifest.scripts.every(isRecord), "manifest rows must be objects");
const requiredRowFields = ["path", "family", "legacyOrigin", "usage", "behavior"];
const legacyOrigins = new Set(["former-sh", "former-py", "retained-mjs", "authored-mjs"]);
const usages = new Set(["apply-version", "build-preview", "calculate-version", "check-deployment", "check-lint", "commit-files", "detect-package-manager", "detect-stack", "discover-version", "generate-artifact", "inspect-repository", "push-commit", "read-version", "render-dashboard", "render-planning-map", "run-build", "validate-portable-output", "validate-skill", "validate-skill-corpus"]);
const behaviors = new Set(["deployment-readiness-check", "fast-git-commit", "git-push", "hermes-artifact-generation", "lint-readiness-check", "package-manager-detection", "planning-map-render", "portable-output-validation", "preview-build", "project-build", "render-dashboard", "repository-discovery", "repository-status", "scoped-git-commit", "skill-validation", "skills-corpus-validation", "stack-detection", "version-application", "version-calculation", "version-discovery", "version-reading"]);
const expectedMetadata = new Map([
  ["skills/autoresearch-code/scripts/render-dashboard.mjs", ["render-dashboard", "render-dashboard"]],
  ["skills/autoresearch-skill/scripts/render-dashboard.mjs", ["render-dashboard", "render-dashboard"]],
  ["skills/git-maker/scripts/git-commit.mjs", ["commit-files", "scoped-git-commit"]],
  ["skills/git-maker/scripts/git-maker-fast.mjs", ["commit-files", "fast-git-commit"]],
  ["skills/git-maker/scripts/git-push.mjs", ["push-commit", "git-push"]],
  ["skills/git-maker/scripts/repo-discover.mjs", ["inspect-repository", "repository-discovery"]],
  ["skills/git-maker/scripts/repo-status.mjs", ["inspect-repository", "repository-status"]],
  ["skills/git-worktree/scripts/validate-git-worktree-skill.mjs", ["validate-skill", "skill-validation"]],
  ["skills/image-maker/scripts/validate-image-maker.mjs", ["validate-skill", "skill-validation"]],
  ["skills/nextjs-architecture/scripts/validate-nextjs-architecture-skill.mjs", ["validate-skill", "skill-validation"]],
  ["skills/prd-maker/scripts/build-preview.mjs", ["build-preview", "preview-build"]],
  ["skills/prd-maker/scripts/render-planning-map.mjs", ["render-planning-map", "planning-map-render"]],
  ["skills/pre-deploy/scripts/build-run.mjs", ["run-build", "project-build"]],
  ["skills/pre-deploy/scripts/deploy-check.mjs", ["check-deployment", "deployment-readiness-check"]],
  ["skills/pre-deploy/scripts/lint-check.mjs", ["check-lint", "lint-readiness-check"]],
  ["skills/pre-deploy/scripts/pm-detect.mjs", ["detect-package-manager", "package-manager-detection"]],
  ["skills/pre-deploy/scripts/stack-detect.mjs", ["detect-stack", "stack-detection"]],
  ["skills/prompt-maker/scripts/validate-prompt-maker.mjs", ["validate-skill", "skill-validation"]],
  ["skills/seo-maker/scripts/render-dashboard.mjs", ["render-dashboard", "render-dashboard"]],
  ["skills/skill-maker/scripts/validate-skill-maker.mjs", ["validate-skill", "skill-validation"]],
  ["skills/skill-tester/scripts/validate-skill.mjs", ["validate-skill", "skill-validation"]],
  ["skills/skill-tester/scripts/validate-skills-corpus.mjs", ["validate-skill-corpus", "skills-corpus-validation"]],
  ["skills/version-update/scripts/git-commit.mjs", ["commit-files", "scoped-git-commit"]],
  ["skills/version-update/scripts/git-push.mjs", ["push-commit", "git-push"]],
  ["skills/version-update/scripts/stack-detect.mjs", ["detect-stack", "stack-detection"]],
  ["skills/version-update/scripts/version-apply.mjs", ["apply-version", "version-application"]],
  ["skills/version-update/scripts/version-bump.mjs", ["calculate-version", "version-calculation"]],
  ["skills/version-update/scripts/version-current.mjs", ["read-version", "version-reading"]],
  ["skills/version-update/scripts/version-find.mjs", ["discover-version", "version-discovery"]],
  ["skills/vite-architecture/scripts/validate-vite-architecture-skill.mjs", ["validate-skill", "skill-validation"]],
  ["skills/hermes-agent-maker/scripts/generate.mjs", ["generate-artifact", "hermes-artifact-generation"]],
  ["skills/hermes-agent-maker/scripts/validate-portable-v1-output.mjs", ["validate-portable-output", "portable-output-validation"]],
]);
assert(expectedMetadata.size === 32, "concrete metadata mapping must cover exactly 32 scripts");
const originCounts = { "former-sh": 0, "former-py": 0, "retained-mjs": 0, "authored-mjs": 0 };
for (const [index, row] of manifest.scripts.entries()) {
  for (const field of requiredRowFields) assert(nonEmpty(row[field]), `manifest scripts[${index}].${field} must be a non-empty string`);
  assert(legacyOrigins.has(row.legacyOrigin), `manifest scripts[${index}].legacyOrigin must be an approved enum value`);
  assert(usages.has(row.usage), `manifest scripts[${index}].usage must be an approved enum value`);
  assert(behaviors.has(row.behavior), `manifest scripts[${index}].behavior must be an approved enum value`);
  assert(row.path === `skills/${row.family}/scripts/${String(row.path).split("/").at(-1)}`, `manifest scripts[${index}] path/family must agree`);
  const expected = expectedMetadata.get(row.path);
  assert(expected !== undefined && row.usage === expected[0] && row.behavior === expected[1], `manifest scripts[${index}] metadata must match its concrete path mapping`);
  originCounts[row.legacyOrigin] += 1;
  assert(isRecord(row.sourcePreimage), `manifest scripts[${index}] requires source provenance evidence`);
  if (row.legacyOrigin === "authored-mjs") {
    const absence = row.sourcePreimage.baselineAbsence;
    assert(isRecord(absence)
      && absence.baselineRef === manifest.legacyPreimageBase
      && absence.path === row.path
      && absence.absent === true,
    `manifest scripts[${index}] requires baseline-absence proof`);
  } else {
    assert(nonEmpty(row.sourcePreimage.path)
      && /^[a-f0-9]{64}$/u.test(String(row.sourcePreimage.sha256))
      && (row.sourcePreimage.gitMode === "100755" || row.sourcePreimage.gitMode === "100644"),
    `manifest scripts[${index}] requires concrete source preimage evidence`);
  }
  assert(nonEmpty(row.behaviorContractId), `manifest scripts[${index}] requires a behavior contract id`);
}
assert(originCounts["former-sh"] === 20 && originCounts["former-py"] === 1 && originCounts["retained-mjs"] === 9 && originCounts["authored-mjs"] === 2, "manifest origin counts must be exactly 20/1/9/2");
const approved = manifest.scripts.map((row) => /** @type {string} */ (row.path));
assert(new Set(approved).size === approved.length, "manifest script paths must be unique");
const behaviorContracts = /** @type {Record<string, unknown>} */ (JSON.parse(readFileSync(behaviorContractsPath, "utf8")));
assert(behaviorContracts.requiredBy === relative(root, manifestPath), "behavior contracts must name the manifest as their central owner");
assert(isRecord(behaviorContracts.coverage)
  && behaviorContracts.coverage.expectedRows === 32
  && behaviorContracts.coverage.expectedFixtures === 96,
"behavior contract coverage must be exactly 32 rows and 96 fixtures");
assert(Array.isArray(behaviorContracts.rows) && behaviorContracts.rows.length === 32, "behavior contracts must contain exactly 32 rows");
for (const [index, contract] of behaviorContracts.rows.entries()) {
  assert(isRecord(contract) && nonEmpty(contract.path) && nonEmpty(contract.id) && isRecord(contract.fixtures),
    `behavior contracts.rows[${index}] must be a complete row`);
  const row = manifest.scripts.find((candidate) => candidate.path === contract.path);
  assert(row !== undefined && contract.id === row.behaviorContractId, `behavior contracts.rows[${index}] must match its manifest row`);
  assert(sameList(Object.keys(contract.fixtures), ["happy", "malformed", "familyEdge"]),
    `behavior contracts.rows[${index}] must contain exactly three fixture kinds`);
}

const references = manifest.forbiddenDetectorReferences;
assert(isRecord(references) && Array.isArray(references.records), "manifest forbiddenDetectorReferences.records must be an array");
assert(references.records.length === 6 && references.records.every(isRecord), "forbidden detector records must contain the exact six policy literals");
const forbiddenLiterals = references.records.map((record) => record.literal);
assert(forbiddenLiterals.every(nonEmpty), "every forbidden detector record requires a literal");
assert(new Set(forbiddenLiterals).size === forbiddenLiterals.length, "forbidden detector literals must be unique");
assert(sameList(forbiddenLiterals, expectedForbiddenLiterals), "forbidden detector literal set must match the validator-owned contract");
assert(Array.isArray(references.scanTargets) && sameList(references.scanTargets, expectedScanTargets), "forbidden detector scan targets must be exact");
assert(Array.isArray(references.enforcementFiles) && sameList(references.enforcementFiles, expectedEnforcementFiles), "forbidden detector enforcement files must be exact");
for (const record of references.records) {
  assert(Array.isArray(record.allowedLocations) && record.allowedLocations.length === 1, `forbidden literal ${record.literal} requires one enforcement location`);
  const location = record.allowedLocations[0];
  assert(isRecord(location)
    && location.file === "scripts/fixtures/skill-script-parity/manifest.json"
    && location.jsonPath === "$.forbiddenDetectorReferences.records[*].literal",
  `forbidden literal ${record.literal} enforcement location must be exact`);
  const manifestOccurrences = JSON.stringify(manifest).split(String(record.literal)).length - 1;
  assert(manifestOccurrences === 1, `forbidden literal ${record.literal} must occur only in its declared manifest data location`);
}
const correction = manifest.versionUpdateDetectorAbsentCorrection;
assert(isRecord(correction) && correction.detectorRestored === false, "detector must never be restored");
assert(Array.isArray(correction.legacyFiles) && correction.legacyFiles.length === 7, "correction baseline requires exactly seven legacy files");
for (const row of correction.legacyFiles) {
  assert(isRecord(row)
    && nonEmpty(row.legacyPath)
    && /^[a-f0-9]{64}$/u.test(String(row.sha256))
    && row.gitMode === "100755"
    && nonEmpty(row.finalPath),
  "every correction legacy file requires path, SHA-256, executable mode, and final path");
}
assert(isRecord(correction.documents)
  && Array.isArray(correction.documents.paths)
  && correction.documents.paths.length === 2
  && Array.isArray(correction.documents.legacyCommands)
  && Array.isArray(correction.documents.finalCommands),
"correction baseline requires paired document paths and exact legacy/final commands");
assert(isRecord(correction.callerEdge) && nonEmpty(correction.callerEdge.legacy) && nonEmpty(correction.callerEdge.final), "correction baseline requires legacy and final caller edges");
assert(Array.isArray(correction.restoreOrder) && correction.restoreOrder.length >= 4, "correction baseline requires an executable restoration order");

const scriptFiles = filesBelow(skillsPath).map((file) => relative(root, file));
const mjsFiles = scriptFiles.filter((file) => file.endsWith(".mjs"));
const legacyFiles = scriptFiles.filter((file) => /\/scripts\/.*\.(?:sh|py)$/u.test(file));
assert(legacyFiles.length === 0, `skill script directories must contain no .sh or .py files: ${legacyFiles.join(", ")}`);
assert(sameList(mjsFiles, approved), "MJS inventory must exactly match historical inventory plus authored scripts");

for (const target of expectedScanTargets) assert(existsSync(join(root, target)), `required forbidden-reference scan target is missing: ${target}`);
const auditFiles = expectedScanTargets.flatMap((target) => {
  const absolute = join(root, target);
  return existsSync(absolute) ? filesBelow(absolute) : [];
});
for (const absolute of auditFiles) {
  if (!statSync(absolute).isFile()) continue;
  const content = readFileSync(absolute, "utf8");
  for (const literal of expectedForbiddenLiterals) assert(!content.includes(literal), `forbidden detector reference outside enforcement data: ${relative(root, absolute)}: ${literal}`);
}

for (const file of approved) {
  const absolute = join(root, file);
  const content = readFileSync(absolute, "utf8");
  const mode = statSync(absolute).mode;
  assert(content.startsWith("#!/usr/bin/env bun\n"), `${file} must use the Bun shebang`);
  assert(/^\/\/ @ts-check\s*$/mu.test(content), `${file} must enable @ts-check`);
  assert((mode & 0o111) !== 0, `${file} must be executable`);
  assert(!/\b(?:exec|execFile|spawn)\s*\([^\n]*\{[^\n]*\bshell\s*:\s*true/u.test(content), `${file} must not invoke a shell`);
  assert(!/\bBun\.\$|\b(?:bash|sh|zsh)\s+-c\b/u.test(content), `${file} must not use shell command patterns`);
  assert(!/\b(?:import\s*\{[^}]*\bspawnSync\b[^}]*\}|(?:const|let|var)\s+spawnSync\s*=)\b/u.test(content), `${file} must not use spawnSync`);
  const localImports = [...content.matchAll(/\b(?:import|export)\s+(?:[^"']+?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/gu)].map((match) => match[1]);
  const approvedLocalImports = file === "skills/hermes-agent-maker/scripts/generate.mjs"
    ? ["./validate-portable-v1-output.mjs"]
    : [];
  assert(localImports.every((value) => approvedLocalImports.includes(value)) && localImports.length === approvedLocalImports.length,
    `${file} must not have unapproved runtime local imports`);
  assert(!/\bimport\s*\(\s*["']\.{1,2}\//u.test(content), `${file} must not dynamically import local modules`);
  assert(!/\brequire\s*\(\s*["']\.{1,2}\//u.test(content), `${file} must not require local modules`);
  assert(!/["']node:child_process["']/u.test(content), `${file} must not import shell process helpers`);
  validateNamedFunctionDocs(content, file);
  validateStaticPolicy(content, file);
  const row = manifest.scripts.find((candidate) => candidate.path === file);
  if (row.legacyOrigin === "authored-mjs") assert(!existsInBaseline(file), `${file} authored-mjs path must be absent from immutable baseline`);
}

console.log(`Validated ${approved.length} Bun MJS skill scripts (20 former-sh, 1 former-py, 9 retained-mjs, 2 authored-mjs baseline-absence).`);
