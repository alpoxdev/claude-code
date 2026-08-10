#!/usr/bin/env node
// @ts-check

/** Validate Hypercore's documented vercel-labs/skills lifecycle integration. */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arguments_ = process.argv.slice(2);
const rootArgument = arguments_.indexOf("--root");
const root = rootArgument === -1 ? scriptRoot : resolve(arguments_[rootArgument + 1] ?? "");
const live = arguments_.includes("--live");

/** @param {boolean} condition @param {string} message */
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** @param {string} file */
function content(file) {
  assert(existsSync(file) && statSync(file).isFile(), `${relative(root, file)} must be a file`);
  return readFileSync(file, "utf8");
}

/** @param {string} markdown @param {string} file */
function validateFrontmatter(markdown, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(markdown);
  assert(match !== null, `${file} must start with YAML frontmatter`);
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/u)) {
    const field = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/u.exec(line);
    if (field) fields.set(field[1], field[2].trim());
  }
  assert(fields.has("name") && fields.get("name") !== "", `${file} frontmatter requires name`);
  assert(fields.has("description") && fields.get("description") !== "", `${file} frontmatter requires description`);
}

function validateSkills() {
  const skills = join(root, "skills");
  assert(existsSync(skills) && statSync(skills).isDirectory(), "skills must be a directory");
  const directories = readdirSync(skills, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert(directories.length > 0, "skills must contain at least one skill directory");
  for (const directory of directories) {
    const english = join(skills, directory.name, "SKILL.md");
    const korean = join(skills, directory.name, "SKILL.ko.md");
    validateFrontmatter(content(english), relative(root, english));
    assert(content(korean).trim().length > 0, `${relative(root, korean)} must not be empty`);
  }
}

function validateNoPluginAdapters() {
  for (const adapter of [".claude-plugin", join(".agents", "plugins"), join("plugins", "hypercore"), join("scripts", "validate-codex-plugin.mjs")]) {
    assert(!existsSync(join(root, adapter)), `${adapter} must not remain after removing plugin adapters`);
  }
}

function validateReadme() {
  const readme = content(join(root, "README.md"));
  const required = [
    "npx skills",
    "npx skills add",
    "npx skills list",
    "npx skills update",
    "npx skills remove",
    "npx skills use",
    "npx skills init",
    "npx skills find",
    ".agents/skills",
    "CODEX_HOME",
  ];
  for (const phrase of required) assert(readme.includes(phrase), `README.md must document ${phrase}`);
  assert(/CODEX_HOME[^\n]*(?:not|아님|아닙|아니|primary destination)/iu.test(readme), "README.md must state that CODEX_HOME is not the primary destination");
  assert(/\.agents\/skills[^\n]*(?:Codex|Codex CLI)|(?:Codex|Codex CLI)[^\n]*\.agents\/skills/u.test(readme), "README.md must identify .agents/skills as Codex's canonical destination");
  assert(/(?:update|업데이트)[\s\S]{0,240}(?:agent|mode|에이전트|모드)[\s\S]{0,240}(?:not guaranteed|보장하지|비보장)/iu.test(readme), "README.md must document update agent/mode preservation as upstream-unverified");
  assert(/(?:partial|부분)[\s\S]{0,240}(?:remove|제거)[\s\S]{0,240}(?:provenance|출처)[\s\S]{0,240}(?:not guaranteed|보장하지|비보장)/iu.test(readme), "README.md must document partial-remove provenance as upstream-unverified");
}

function validateLiveGate() {
  assert(process.env.HYPERCORE_ENABLE_VERCEL_SKILLS_LIVE_GATE === "1", "--live requires HYPERCORE_ENABLE_VERCEL_SKILLS_LIVE_GATE=1");
  const commands = [
    ["add", "alpoxdev/hypercore", "--list"],
    ["find", "hypercore", "--owner", "alpoxdev"],
  ];
  const outputs = [];
  for (const arguments_ of commands) {
    const result = spawnSync("npx", ["--yes", "skills", ...arguments_], { cwd: root, encoding: "utf8" });
    assert(result.status === 0, `live skills ${arguments_[0]} gate failed: ${result.stderr || result.stdout}`);
    outputs.push(`${result.stdout}\n${result.stderr}`);
  }
  assert(outputs[0].includes("git-maker"), "live add --list did not discover Hypercore skills");
  assert(outputs[1].includes("alpoxdev/hypercore"), "live find returned a stale or missing Hypercore source identity");
}

try {
  validateSkills();
  validateNoPluginAdapters();
  validateReadme();
  if (live) validateLiveGate();
  console.log(`vercel skills lifecycle validation passed${live ? " (live gate)" : ""}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`vercel skills lifecycle validation failed: ${message}`);
  process.exitCode = 1;
}
