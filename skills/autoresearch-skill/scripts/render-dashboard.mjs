#!/usr/bin/env bun
// @ts-check

import { closeSync, existsSync, fchmodSync, fsyncSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

/** @typedef {Record<string, unknown>} JsonObject */

/** @param {string} message @returns {never} */
function fail(message) {
  console.error(message);
  process.exit(1);
}

/** @param {string} path */
function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

/** @param {string} directory */
function collectFiles(directory) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(path));
    else if (statSync(path).isFile()) files.push(path);
  }
  return files.sort();
}

if (process.argv.length !== 3) fail("사용법: scripts/render-dashboard.mjs <artifact-dir>");

const artifactDir = process.argv[2];
const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = dirname(scriptDir);
const templatePath = join(skillDir, "assets", "dashboard-template.html");
const resultsPath = join(artifactDir, "results.json");
const dashboardPath = join(artifactDir, "dashboard.html");
const resultsJsPath = join(artifactDir, "results.js");

if (!isFile(templatePath)) fail(`대시보드 템플릿이 없습니다: ${templatePath}`);
if (!isFile(resultsPath)) fail(`results.json이 없습니다: ${resultsPath}`);

/** @type {JsonObject} */
let results;
try {
  const parsed = JSON.parse(readFileSync(resultsPath, "utf8"));
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) fail("results.json은 객체여야 합니다");
  results = parsed;
} catch (error) {
  if (error instanceof SyntaxError) fail(`results.json JSON 파싱에 실패했습니다: ${error.message}`);
  throw error;
}
const requiredTopLevel = ["skill_name", "status", "current_experiment", "baseline_score", "best_score", "metric_direction", "last_statuses", "best_experiment", "experiments"];
const missing = requiredTopLevel.filter((key) => !(key in results)).sort();
if (missing.length > 0) fail(`results.json 필수 키가 없습니다: ${missing.join(", ")}`);
const experiments = results.experiments;
if (!Array.isArray(experiments)) fail("results.json experiments는 배열이어야 합니다");
if (results.status === "complete" && !results.score_explanation && !isFile(join(artifactDir, "score-explanation.md"))) fail("완료 상태에는 results.json.score_explanation 또는 score-explanation.md가 필요합니다");

const allowedStatuses = new Set(["baseline", "keep", "keep-reworked", "discard", "tie", "inconclusive", "candidate-crash", "infra-flake", "timeout", "signaled", "no-op", "hook-blocked", "metric-error", "guard-failed", "guard-error", "cleanup-error", "rollback-error", "reset"]);
const requiredExperimentKeys = ["id", "commit", "score", "max_score", "metric", "delta", "pass_rate", "guard", "guard_metric", "status", "description"];
for (const [index, experiment] of experiments.entries()) {
  if (typeof experiment !== "object" || experiment === null || Array.isArray(experiment)) fail(`experiments[${index}]는 객체여야 합니다`);
  /** @type {JsonObject} */
  const item = experiment;
  const missingKeys = requiredExperimentKeys.filter((key) => !(key in item)).sort();
  if (missingKeys.length > 0) fail(`experiments[${index}] 필수 키가 없습니다: ${missingKeys.join(", ")}`);
  if (!allowedStatuses.has(/** @type {string} */ (item.status))) fail(`experiments[${index}].status 값이 유효하지 않습니다: ${item.status}`);
}

const knownDetailFiles = ["changelog.md", "score-explanation.md", "final-report.md", "run-contract.md", "source-ledger.md", "trace-summary.md"];
const allowedDetailSuffixes = new Set([".md", ".txt", ".json", ".tsv", ".log"]);
const knownDetailTitles = { "changelog.md": "변경 로그", "score-explanation.md": "점수 상승 설명", "final-report.md": "최종 보고", "run-contract.md": "실행 계약", "source-ledger.md": "출처 기록", "trace-summary.md": "추적 검증 요약" };

/** @param {string} path */
function detailTitle(path) {
  return knownDetailTitles[/** @type {keyof typeof knownDetailTitles} */ (path)] ?? path.replaceAll("-", " ").replaceAll("_", " ");
}
/** @param {string} relativePath */
function readDetail(relativePath) {
  const path = join(artifactDir, relativePath);
  return isFile(path) ? { path: relativePath, title: detailTitle(relativePath), content: readFileSync(path, "utf8") } : null;
}

/** @type {{ path: string, title: string, content: string }[]} */
const details = [];
const seen = new Set();
for (const relativePath of knownDetailFiles) {
  const item = readDetail(relativePath);
  if (item) {
    details.push(item);
    seen.add(relativePath);
  }
}
const detailsDir = join(artifactDir, "details");
if (existsSync(detailsDir) && statSync(detailsDir).isDirectory()) {
  for (const path of collectFiles(detailsDir)) {
    if (!allowedDetailSuffixes.has(extname(path).toLowerCase())) continue;
    const relativePath = relative(artifactDir, path).split(sep).join("/");
    if (seen.has(relativePath)) continue;
    details.push({ path: relativePath, title: detailTitle(relativePath), content: readFileSync(path, "utf8") });
    seen.add(relativePath);
  }
}

/**
 * @param {string} path
 * @returns {{ content: Buffer, mode: number } | null}
 */
function snapshotOutput(path) {
  if (!existsSync(path)) return null;
  const stats = statSync(path);
  if (!stats.isFile()) throw new Error(`출력 경로가 일반 파일이 아닙니다: ${path}`);
  return { content: readFileSync(path), mode: stats.mode & 0o7777 };
}

/** @param {string} path */
function temporaryPath(path) {
  return `${path}.${process.pid}.${randomUUID()}.tmp`;
}

/**
 * @param {string} path
 * @param {string | Buffer} content
 * @param {number | undefined} mode
 */
function writeSyncedTemp(path, content, mode) {
  const descriptor = openSync(path, "wx", 0o666);
  try {
    if (mode !== undefined) fchmodSync(descriptor, mode);
    writeFileSync(descriptor, content);
    fsyncSync(descriptor);
  } catch (error) {
    closeSync(descriptor);
    unlinkSync(path);
    throw error;
  }
  closeSync(descriptor);
}

/** @param {string} path */
function removeTemp(path) {
  if (existsSync(path)) unlinkSync(path);
}

/**
 * @param {string} path
 * @param {{ content: Buffer, mode: number } | null} snapshot
 */
function restoreOutput(path, snapshot) {
  if (snapshot === null) {
    if (existsSync(path)) unlinkSync(path);
    return;
  }

  const tempPath = temporaryPath(path);
  try {
    writeSyncedTemp(tempPath, snapshot.content, snapshot.mode);
    renameSync(tempPath, path);
  } finally {
    removeTemp(tempPath);
  }
}

/**
 * @param {string | Buffer} dashboard
 * @param {string} resultsJs
 */
function writeOutputPair(dashboard, resultsJs) {
  const dashboardSnapshot = snapshotOutput(dashboardPath);
  const resultsSnapshot = snapshotOutput(resultsJsPath);
  const dashboardTempPath = temporaryPath(dashboardPath);
  const resultsTempPath = temporaryPath(resultsJsPath);

  try {
    writeSyncedTemp(dashboardTempPath, dashboard, dashboardSnapshot?.mode);
    writeSyncedTemp(resultsTempPath, resultsJs, resultsSnapshot?.mode);
    renameSync(dashboardTempPath, dashboardPath);
    try {
      renameSync(resultsTempPath, resultsJsPath);
    } catch (error) {
      try {
        restoreOutput(dashboardPath, dashboardSnapshot);
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], "results.js 커밋 실패 후 dashboard.html 복원에 실패했습니다");
      }
      throw error;
    }
  } finally {
    removeTemp(dashboardTempPath);
    removeTemp(resultsTempPath);
  }
}

mkdirSync(artifactDir, { recursive: true });
writeOutputPair(readFileSync(templatePath), `window.__AUTORESEARCH_RESULTS__ = ${JSON.stringify(results)};\nwindow.__AUTORESEARCH_DETAILS__ = ${JSON.stringify(details)};\n`);
console.log(`렌더 완료: ${dashboardPath}`);
console.log(`렌더 완료: ${resultsJsPath}`);
