#!/usr/bin/env bun
// @ts-check

import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaRoot = join(root, "assets", "schemas", "agent-plugins-v1.0.0");
const pluginSchemaUrl = "https://agentplugins.dev/schemas/v1.0.0/plugin.schema.json";
const mcpSchemaUrl = "https://agentplugins.dev/schemas/v1.0.0/mcp.schema.json";

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** @param {string[]} argv @returns {string} @throws {Error} for invalid arguments or root */
function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== "--root") throw new Error("E_ARGS");
  return realpathSync(resolve(argv[1]));
}
/** @param {string} path @returns {Record<string, unknown>} */
function readJson(path) {
  try {
    const value = JSON.parse(readFileSync(path, "utf8"));
    if (!record(value)) throw new Error();
    return value;
  } catch { throw new Error("E_JSON"); }
}
/** @param {string} path @returns {string} */
function sha256(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
/** @returns {{ plugin: Record<string, unknown>, mcp: Record<string, unknown> }} */
function loadPinnedSchemas() {
  const provenance = readJson(join(schemaRoot, "provenance.json"));
  if (provenance.schema_version !== "1.0.0" || provenance.retrieval !== "offline-vendored" || !Array.isArray(provenance.schemas)) throw new Error("E_SCHEMA_PROVENANCE");
  /** @type {Map<string, Record<string, unknown>>} */
  const schemas = new Map();
  for (const entry of provenance.schemas) {
    if (!record(entry) || typeof entry.path !== "string" || typeof entry.sha256 !== "string"
      || !/^[a-f0-9]{64}$/u.test(entry.sha256) || !entry.path.endsWith(".schema.json")
      || entry.path.includes("/") || entry.source_url !== `https://agentplugins.dev/schemas/v1.0.0/${entry.path}`
      || sha256(join(schemaRoot, entry.path)) !== entry.sha256) throw new Error("E_SCHEMA_PROVENANCE");
    schemas.set(entry.path, readJson(join(schemaRoot, entry.path)));
  }
  const plugin = schemas.get("plugin.schema.json");
  const mcp = schemas.get("mcp.schema.json");
  if (!plugin || !mcp || plugin.$id !== pluginSchemaUrl || mcp.$id !== mcpSchemaUrl) throw new Error("E_SCHEMA_PROVENANCE");
  return { plugin, mcp };
}
/** @param {unknown} value @param {Record<string, unknown>} schema @param {Record<string, unknown>} rootSchema @returns {boolean} */
function matches(value, schema, rootSchema) {
  if (typeof schema.$ref === "string") {
    if (!schema.$ref.startsWith("#/")) return false;
    let target = /** @type {unknown} */ (rootSchema);
    for (const part of schema.$ref.slice(2).split("/")) {
      if (!record(target) || !(part in target)) return false;
      target = target[part];
    }
    return record(target) && matches(value, target, rootSchema);
  }
  if (Array.isArray(schema.oneOf)) return schema.oneOf.filter((item) => record(item) && matches(value, item, rootSchema)).length === 1;
  if ("const" in schema && value !== schema.const) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => item === value)) return false;
  if (schema.type === "object") {
    if (!record(value)) return false;
    if (typeof schema.minProperties === "number" && Object.keys(value).length < schema.minProperties) return false;
    if (Array.isArray(schema.required) && schema.required.some((key) => typeof key !== "string" || !(key in value))) return false;
    const properties = record(schema.properties) ? schema.properties : {};
    if (schema.additionalProperties === false && Object.keys(value).some((key) => !(key in properties))) return false;
    const propertyNames = schema.propertyNames;
    if (record(propertyNames) && Object.keys(value).some((key) => !matches(key, propertyNames, rootSchema))) return false;
    for (const [key, child] of Object.entries(value)) {
      const childSchema = properties[key] ?? schema.additionalProperties;
      if (record(childSchema) && !matches(child, childSchema, rootSchema)) return false;
    }
  }
  if (schema.type === "array") {
    if (!Array.isArray(value) || (typeof schema.minItems === "number" && value.length < schema.minItems)) return false;
    if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) return false;
    const items = schema.items;
    if (record(items) && value.some((item) => !matches(item, items, rootSchema))) return false;
  }
  if (schema.type === "string") {
    if (typeof value !== "string" || (typeof schema.minLength === "number" && value.length < schema.minLength)
      || (typeof schema.maxLength === "number" && value.length > schema.maxLength)) return false;
    if (typeof schema.pattern === "string" && !(new RegExp(schema.pattern, "u")).test(value)) return false;
    if (schema.format === "uri") try { new URL(value); } catch { return false; }
  }
  return true;
}
/** @param {string} outputRoot @param {string} path @returns {string} */
function referencedPath(outputRoot, path) {
  if (typeof path !== "string" || !path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("E_REFERENCE");
  const candidate = resolve(outputRoot, path);
  if (!candidate.startsWith(`${outputRoot}${sep}`)) throw new Error("E_REFERENCE");
  try {
    let cursor = outputRoot;
    for (const part of relative(outputRoot, candidate).split(sep)) {
      cursor = join(cursor, part);
      if (lstatSync(cursor).isSymbolicLink()) throw new Error("E_CONTAINMENT");
    }
    const canonical = realpathSync(candidate);
    if (!canonical.startsWith(`${outputRoot}${sep}`)) throw new Error("E_CONTAINMENT");
    return canonical;
  } catch (error) { if (error instanceof Error && error.message.startsWith("E_")) throw error; throw new Error("E_REFERENCE"); }
}
/** @param {string} sentence @returns {boolean} */
function isPolicyDenial(sentence) {
  const policyTerms = "(?:network|credentials?|tokens?|passwords?|secrets?|installation|install|enabling|enable|gateway|discord|behavior|,|\\s|and|or)";
  const prohibition = "(?:install|enable|use|configure|connect(?:\\s+to)?|send(?:\\s+to)?)";
  const normalized = sentence.trim();
  return new RegExp(`^(?:(?:the\\s+)?(?:plugin|skill|component|package|output|this|it)\\s+(?:has\\s+)?no\\s+${policyTerms}*|(?:the\\s+)?(?:plugin|skill|component|package|output|this|it)\\s+does\\s+not\\s+${prohibition}(?:\\s+(?:a|an|the|any|to|with|plugin|package|extension|integration|gateway|discord))*|(?:do\\s+not|don't|never)\\s+${prohibition}(?:\\s+(?:a|an|the|any|to|with|plugin|package|extension|integration|gateway|discord))*)[.!]?$`, "iu").test(normalized);
}
/** @param {string} text @returns {boolean} */
function forbiddenBehavior(text) {
  const sentences = text.split(/(?<=[.!?])\s+|\r?\n/u);
  return sentences.some((sentence) => {
    if (isPolicyDenial(sentence)) return false;
    return /\bdiscord(?:\.com|app\.com|[_-](?:token|webhook))?\b/iu.test(sentence)
      || /\bgateway\b/iu.test(sentence)
      || /\b(?:npm|pnpm|yarn|bun|pipx?|brew)\s+install\b/iu.test(sentence)
      || /\b(?:install|enable)\s+(?:a\s+|an\s+|the\s+)?(?:plugin|package|extension|integration|gateway|discord)\b/iu.test(sentence)
      || /\b(?:api[_-]?key|token|password|secret|credential|authorization)\s*(?:=|:)\s*(?!["']?(?:none|never|redacted)\b)[^,\s}\]]+/iu.test(sentence);
  });
}
/** @param {unknown} value @returns {boolean} */
function hasCredentialValue(value) {
  if (typeof value === "string") return value.trim() !== "" && !/^(?:none|never|redacted)$/iu.test(value.trim());
  return value !== null && value !== undefined;
}
/** @param {unknown} value @returns {boolean} */
function forbiddenMetadata(value) {
  if (Array.isArray(value)) return value.some(forbiddenMetadata);
  if (!record(value)) return false;
  return Object.entries(value).some(([key, child]) => {
    if (/(?:^|[_-])(?:api[_-]?key|token|password|secret|credential|authorization)(?:$|[_-])/iu.test(key) && hasCredentialValue(child)) return true;
    return forbiddenMetadata(child);
  });
}
/** @param {string} outputRoot @param {string} componentPath @returns {string[]} */
function componentFiles(outputRoot, componentPath) {
  const component = referencedPath(outputRoot, componentPath);
  if (!lstatSync(component).isDirectory()) return [component];
  /** @param {string} path @returns {string[]} */
  const walk = (path) => readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isSymbolicLink()) throw new Error("E_CONTAINMENT");
    if (entry.isDirectory()) return walk(child);
    if (!entry.isFile()) throw new Error("E_REFERENCE");
    return [child];
  });
  return walk(component);
}
/** @param {string} path @returns {void} */
function validateComponentContent(path) {
  try {
    const text = readFileSync(path, "utf8");
    if (forbiddenBehavior(text)) throw new Error("E_HERMES_SUBSET");
    try { if (forbiddenMetadata(JSON.parse(text))) throw new Error("E_HERMES_SUBSET"); } catch (error) {
      if (error instanceof Error && error.message === "E_HERMES_SUBSET") throw error;
    }
  } catch (error) { if (error instanceof Error && error.message.startsWith("E_")) throw error; throw new Error("E_REFERENCE"); }
}
/** @param {string} text @returns {void} */
function validateComponentText(text) {
  if (forbiddenBehavior(text)) throw new Error("E_HERMES_SUBSET");
  try {
    if (forbiddenMetadata(JSON.parse(text))) throw new Error("E_HERMES_SUBSET");
  } catch (error) {
    if (error instanceof Error && error.message === "E_HERMES_SUBSET") throw error;
  }
}
/** @param {string} text @returns {void} */
function validateSkillText(text) {
  const lines = text.split(/\r?\n/u);
  if (lines[0] !== "---" || lines[1] === undefined || lines[2] === undefined || lines[3] !== "---"
    || !/^name: [a-z][a-z0-9-]{0,62}$/u.test(lines[1]) || !lines[2].startsWith("description: ")) throw new Error("E_HERMES_SUBSET");
  const rawDescription = lines[2].slice("description: ".length);
  if (!rawDescription) throw new Error("E_HERMES_SUBSET");
  if (rawDescription.startsWith("\"")) {
    try {
      const description = JSON.parse(rawDescription);
      if (typeof description !== "string" || !description) throw new Error();
    } catch { throw new Error("E_HERMES_SUBSET"); }
  } else if (/[\u0000-\u001f:{}[\]'"\\]/u.test(rawDescription)) throw new Error("E_HERMES_SUBSET");
}
/** @param {string} path @returns {void} */
function validateSkillYaml(path) {
  let text;
  try { text = readFileSync(path, "utf8"); } catch { throw new Error("E_REFERENCE"); }
  validateSkillText(text);
}
/** Validate a generated portable package without touching the filesystem. @param {Record<string, string>} documents @returns {void} */
export function validatePortableV1Documents(documents) {
  const { plugin: pluginSchema, mcp: mcpSchema } = loadPinnedSchemas();
  const pluginText = documents["plugin.json"];
  if (typeof pluginText !== "string") throw new Error("E_REFERENCE");
  let plugin;
  try { plugin = JSON.parse(pluginText); } catch { throw new Error("E_JSON"); }
  if (!record(plugin) || !matches(plugin, pluginSchema, pluginSchema)) throw new Error("E_PLUGIN_V1");
  validateComponentText(pluginText);
  const components = plugin.components;
  if (!record(components) || !Array.isArray(components.skills)) throw new Error("E_PLUGIN_V1");
  for (const skill of components.skills) {
    if (typeof skill !== "string" || !/^skills\/[a-z][a-z0-9-]{0,62}$/u.test(skill)) throw new Error("E_HERMES_SUBSET");
    const prefix = `${skill}/`, componentPaths = Object.keys(documents).filter((path) => path.startsWith(prefix)).sort();
    if (!componentPaths.includes(`${skill}/SKILL.md`)) throw new Error("E_REFERENCE");
    for (const path of componentPaths) {
      const text = documents[path];
      if (path === `${skill}/SKILL.md`) validateSkillText(text);
      validateComponentText(text);
    }
  }
  const mcpPaths = components.mcp === undefined ? [] : components.mcp;
  if (!Array.isArray(mcpPaths)) throw new Error("E_PLUGIN_V1");
  for (const path of mcpPaths) {
    if (typeof path !== "string" || !/^mcp\/[a-z][a-z0-9-]{0,62}\.json$/u.test(path) || typeof documents[path] !== "string") throw new Error("E_REFERENCE");
    let mcp;
    try { mcp = JSON.parse(documents[path]); } catch { throw new Error("E_JSON"); }
    if (!record(mcp) || !matches(mcp, mcpSchema, mcpSchema) || !record(mcp.servers)) throw new Error("E_MCP_V1");
    validateComponentText(documents[path]);
    for (const server of Object.values(mcp.servers)) {
      if (!record(server)) throw new Error("E_HERMES_SUBSET");
      validateRemotePolicy(server);
    }
  }
}
/** @param {Record<string, unknown>} server @returns {void} */
function validateRemotePolicy(server) {
  if (server.transport === "stdio") {
    if (typeof server.command !== "string" || !/^[A-Za-z0-9._/-]+$/u.test(server.command)
      || !Array.isArray(server.args) || server.args.some((arg) => typeof arg !== "string" || !arg || /[\u0000\r\n]/u.test(arg))) throw new Error("E_HERMES_SUBSET");
    return;
  }
  if (server.transport === "sse") throw new Error("E_HERMES_SUBSET");
  if (server.transport !== "http" && server.transport !== "streamable-http") throw new Error("E_HERMES_SUBSET");
  if (typeof server.url !== "string") throw new Error("E_HERMES_SUBSET");
  let url;
  try { url = new URL(server.url); } catch { throw new Error("E_HERMES_SUBSET"); }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password || url.hash) throw new Error("E_HERMES_SUBSET");
  const loopback = url.hostname === "localhost" || url.hostname === "::1" || /^127(?:\.\d{1,3}){3}$/u.test(url.hostname);
  if (url.protocol === "http:" && !loopback) throw new Error("E_HERMES_SUBSET");
  if (server.transport === "http" && !loopback) throw new Error("E_HERMES_SUBSET");
}
/** @param {string} outputRoot @param {Record<string, unknown>} plugin @param {Record<string, unknown>} mcpSchema @returns {Record<string, unknown>[]} */
function validateNormativeReferences(outputRoot, plugin, mcpSchema) {
  const components = /** @type {Record<string, unknown>} */ (plugin.components);
  /** @type {Record<string, unknown>[]} */
  const mcps = [];
  for (const skill of /** @type {string[]} */ (components.skills)) {
    const skillRoot = referencedPath(outputRoot, skill);
    if (relative(outputRoot, skillRoot) !== skill || lstatSync(skillRoot).isDirectory() === false) throw new Error("E_REFERENCE");
    referencedPath(outputRoot, `${skill}/SKILL.md`);
  }
  for (const path of /** @type {string[]} */ (components.mcp ?? [])) {
    const mcp = readJson(referencedPath(outputRoot, path));
    if (!matches(mcp, mcpSchema, mcpSchema)) throw new Error("E_MCP_V1");
    mcps.push(mcp);
  }
  return mcps;
}
/** @param {string} outputRoot @param {Record<string, unknown>} plugin @param {Record<string, unknown>[]} mcps @returns {void} */
function validateHermesSubset(outputRoot, plugin, mcps) {
  const components = /** @type {Record<string, unknown>} */ (plugin.components);
  validateComponentContent(referencedPath(outputRoot, "plugin.json"));
  for (const skill of /** @type {string[]} */ (components.skills)) {
    if (!/^skills\/[a-z][a-z0-9-]{0,62}$/u.test(skill)) throw new Error("E_HERMES_SUBSET");
    for (const file of componentFiles(outputRoot, skill)) {
      if (file === join(outputRoot, skill, "SKILL.md")) validateSkillYaml(file);
      validateComponentContent(file);
    }
  }
  for (const [index, mcp] of mcps.entries()) {
    const path = /** @type {string[]} */ (components.mcp)[index];
    if (!/^mcp\/[a-z][a-z0-9-]{0,62}\.json$/u.test(path)) throw new Error("E_HERMES_SUBSET");
    for (const file of componentFiles(outputRoot, path)) validateComponentContent(file);
    for (const server of Object.values(/** @type {Record<string, unknown>} */ (mcp.servers))) {
      if (!record(server)) throw new Error("E_HERMES_SUBSET");
      validateRemotePolicy(server);
    }
  }
}
/** @param {string} outputRoot @returns {void} @throws {Error} for invalid portable output */
export function validatePortableV1Output(outputRoot) {
  outputRoot = realpathSync(resolve(outputRoot));
  if (!lstatSync(outputRoot).isDirectory() || lstatSync(outputRoot).isSymbolicLink()) throw new Error("E_REFERENCE");
  const { plugin: pluginSchema, mcp: mcpSchema } = loadPinnedSchemas();
  const plugin = readJson(referencedPath(outputRoot, "plugin.json"));
  if (!matches(plugin, pluginSchema, pluginSchema)) throw new Error("E_PLUGIN_V1");
  const mcps = validateNormativeReferences(outputRoot, plugin, mcpSchema);
  validateHermesSubset(outputRoot, plugin, mcps);
}
/** @param {string[]} argv @returns {void} @throws {Error} for invalid portable output */
function main(argv) {
  const outputRoot = parseArgs(argv);
  validatePortableV1Output(outputRoot);
  process.stdout.write(`${JSON.stringify({ valid: true, profile: "agent-plugins-v1.0.0+hermes" })}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "E_UNKNOWN" })}\n`); process.exitCode = 1; }
}
