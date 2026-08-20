#!/usr/bin/env bun
// @ts-check

import { createHash, randomUUID } from "node:crypto";
import { chmodSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePortableV1Documents } from "./validate-portable-v1-output.mjs";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const markerPath = ".hermes-agent-maker/ownership.json";
const templates = JSON.parse(readFileSync(join(scriptRoot, "assets/templates/artifacts.json"), "utf8"));
const manifestSchema = JSON.parse(readFileSync(join(scriptRoot, "assets/manifest.schema.json"), "utf8"));
const directoryKinds = new Set(["skill", "native-plugin", "portable-plugin"]);
const kinds = new Set([...directoryKinds, "soul", "agents", "user-draft", "memory-draft"]);
/** @type {Readonly<Record<string, string>>} */
const singleFileTargets = Object.freeze({ soul: "SOUL.md", agents: "AGENTS.md", "user-draft": "USER.md.draft.md", "memory-draft": "MEMORY.md.draft.md" });
const forbiddenContent = /[\p{Cc}]/u;
const forbiddenTerms = /\b(?:install(?:ation)?|login|profile|trust|enable(?:ment)?|remove|gateway|discord|bot|adapter|credential|credentials|token|tokens|password|secret|private[ _-]?key|api[ _-]?key|\.env|network|external[ _-]?transmission|dynamic[ _-]?schema|schema[ _-]?(?:fetch|retrieval))\b/iu;

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function record(value) { return typeof value === "object" && value !== null && !Array.isArray(value); }
/** @param {string | Uint8Array} value */
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
/** @param {unknown} value @returns {string} */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  const json = JSON.stringify(value);
  if (typeof json !== "string") throw new Error("E_CANONICAL_JSON");
  return json;
}
/** @param {string} value */
function safePath(value) { return /^[A-Za-z0-9._-][A-Za-z0-9._/-]{0,511}$/u.test(value) && !value.includes("//") && !value.split("/").some((part) => part === "." || part === ".."); }
/** @param {number} value */
function fileMode(value) { return value === 0o644 || value === 0o755; }
/** @param {unknown} value @returns {value is {path:string,sha256:string,mode:number}} */
function ownedEntry(value) {
  return record(value) && Object.keys(value).sort().join(",") === "mode,path,sha256"
    && typeof value.path === "string" && safePath(value.path) && value.path !== markerPath
    && typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256)
    && typeof value.mode === "number" && fileMode(value.mode);
}
/** @param {string[]} argv @returns {{manifest:string,workspace:string,approval?:string}} @throws {Error} for invalid arguments */
function parseArgs(argv) {
  /** @type {Record<string, string | undefined>} */ const values = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i], value = argv[i + 1];
    if (!/^--(?:manifest|workspace|approval)$/u.test(key) || value === undefined || values[key.slice(2)] !== undefined) throw new Error("E_ARGS");
    values[key.slice(2)] = value;
  }
  if (!values.manifest || !values.workspace) throw new Error("E_ARGS");
  return /** @type {{manifest:string,workspace:string,approval?:string}} */ (values);
}
/** @param {string} path */
function readJson(path) { try { const value = JSON.parse(readFileSync(path, "utf8")); if (!record(value)) throw new Error(); return value; } catch { throw new Error("E_JSON"); } }
/** @param {Record<string, unknown>} spec */
function validateSpec(spec) {
  const allowed = new Set(["kind", "intent", "content", "target", "name", "mode", "template_version", "approved_change_set"]);
  const intents = manifestSchema.properties?.intent?.enum, kind = String(spec.kind), target = String(spec.target);
  if (!Array.isArray(intents) || Object.keys(spec).some((key) => !allowed.has(key)) || !kinds.has(kind)
    || !intents.includes(spec.intent) || typeof spec.content !== "string" || spec.content.length < 1 || spec.content.length > 500
    || forbiddenContent.test(spec.content) || /[\r\n"'\\:{}[\]<>]/u.test(spec.content) || forbiddenTerms.test(spec.content) || /\.env/iu.test(spec.content)
    || typeof spec.target !== "string" || !safePath(target) || spec.mode !== "preview" && spec.mode !== "apply"
    || spec.template_version !== "1.0.0" || (directoryKinds.has(kind) && !/^[a-z][a-z0-9-]{0,62}$/u.test(String(spec.name)))) throw new Error("E_SPEC");
  if (singleFileTargets[kind] !== undefined && target !== singleFileTargets[kind]) throw new Error("E_TARGET");
  if (spec.name !== undefined && (typeof spec.name !== "string" || !/^[a-z][a-z0-9-]{0,62}$/u.test(spec.name))) throw new Error("E_SPEC");
  if (spec.mode === "apply" !== record(spec.approved_change_set)) throw new Error("E_APPROVAL_REQUIRED");
}
/** Reject symlinks and special files in every existing component, then resolve the workspace's real root. @param {string} workspace @param {string} target */
function resolveSafeTarget(workspace, target) {
  const lexicalRoot = resolve(workspace); if (!existsSync(lexicalRoot) || !lstatSync(lexicalRoot).isDirectory() || lstatSync(lexicalRoot).isSymbolicLink()) throw new Error("E_WORKSPACE");
  const root = realpathSync(lexicalRoot), output = resolve(root, target);
  if (!output.startsWith(`${root}${sep}`)) throw new Error("E_CONTAINMENT");
  let cursor = root;
  for (const part of target.split("/")) {
    cursor = join(cursor, part);
    let stat;
    try {
      stat = lstatSync(cursor);
    } catch (error) {
      if (record(error) && error.code === "ENOENT") continue;
      throw error;
    }
    if (stat.isSymbolicLink() || (!stat.isDirectory() && cursor !== output) || (cursor === output && !stat.isDirectory() && !stat.isFile())) throw new Error("E_SPECIAL_FILE");
  }
  return { root, output };
}
/** @param {Record<string, unknown>} spec */
function renderFiles(spec) {
  const artifact = templates.artifacts?.[String(spec.kind)];
  if (!record(artifact) || !Array.isArray(artifact.files)) throw new Error("E_TEMPLATE");
  const files = artifact.files.map((value) => {
    if (!record(value) || typeof value.path !== "string" || typeof value.content !== "string" || typeof value.mode !== "number" || !safePath(value.path) || !fileMode(value.mode) || value.path === markerPath) throw new Error("E_TEMPLATE");
    const name = String(spec.name), content = String(spec.content);
    const path = value.path.replaceAll("agent-plugin", name).replaceAll("agent-skill", name);
    const renderedContent = spec.kind === "portable-plugin" && path === "plugin.json" ? JSON.stringify(content).slice(1, -1)
      : spec.kind === "portable-plugin" && path.endsWith("/SKILL.md") ? JSON.stringify(content)
        : content;
    return { path, content: value.content.replaceAll("agent-plugin", name).replaceAll("agent-skill", name).replaceAll("An agent skill.", renderedContent), mode: value.mode };
  });
  if (!files.length || new Set(files.map((file) => file.path)).size !== files.length) throw new Error("E_TEMPLATE");
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
/** @param {string} identity @param {Record<string, unknown>} spec @param {{path:string,content:string,mode:number}[]} files */
function addOwnershipMarker(identity, spec, files) {
  if (!directoryKinds.has(String(spec.kind))) return files;
  const owned_entries = files.map((file) => ({ path: file.path, sha256: sha256(file.content), mode: file.mode })).sort((a, b) => a.path.localeCompare(b.path));
  const ownedDirectorySet = new Set([".hermes-agent-maker"]);
  for (const file of files) {
    let directory = dirname(file.path);
    while (directory !== ".") {
      ownedDirectorySet.add(directory);
      directory = dirname(directory);
    }
  }
  const owned_directories = [...ownedDirectorySet].sort();
  const payload = { schema_version: 1, artifact_kind: spec.kind, target_identity: identity, template_version: spec.template_version, marker_path: markerPath, owned_directories, owned_entries };
  return [...files, { path: markerPath, content: `${canonicalJson({ ...payload, owned_set_digest: sha256(canonicalJson(payload)) })}\n`, mode: 0o644 }].sort((a, b) => a.path.localeCompare(b.path));
}
/** @param {{path:string,content:string,mode:number}[]} files */
function validateRenderedPortableOutput(files) {
  validatePortableV1Documents(Object.fromEntries(files.map((file) => [file.path, file.content])));
}
/** @param {string} base */
function treeMap(base) {
  /** @type {Map<string,{sha256:string,mode:number}>} */ const result = new Map();
  /** @param {string} path @param {string} rel */
  const walk = (path, rel) => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory())) throw new Error("E_SPECIAL_FILE");
    if (stat.isFile()) {
      const mode = stat.mode & 0o777;
      if (!fileMode(mode)) throw new Error("E_PREIMAGE_MODE");
      result.set(rel, { sha256: sha256(readFileSync(path)), mode });
      return;
    }
    for (const entry of readdirSync(path, { withFileTypes: true })) walk(join(path, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
  };
  if (existsSync(base)) walk(base, "");
  return result;
}
/** @param {string} base */
function treeDirectories(base) {
  /** @type {string[]} */ const result = [];
  /** @param {string} path @param {string} rel */
  const walk = (path, rel) => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("E_SPECIAL_FILE");
    if (rel) result.push(rel);
    for (const entry of readdirSync(path, { withFileTypes: true })) if (entry.isDirectory()) walk(join(path, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
  };
  if (existsSync(base)) walk(base, "");
  return result.sort();
}
/** @param {string} identity @param {{path:string}[]} files */
function treeDirectoriesFromFiles(identity, files) {
  const directories = new Set();
  for (const file of files) {
    let path = dirname(file.path);
    while (path !== ".") {
      directories.add(`${identity}/${path}`);
      path = dirname(path);
    }
  }
  return [...directories];
}
/** @param {Map<string,{sha256:string,mode:number}>} map */
function mapObject(map) { return Object.fromEntries([...map].sort(([a], [b]) => a.localeCompare(b))); }
/** @param {string} identity @param {string} path @param {boolean} directory @returns {string} */
function approvalPath(identity, path, directory) {
  const value = directory ? `${identity}/${path}` : identity;
  if (!safePath(value)) throw new Error("E_TARGET");
  return value;
}
/** @param {Record<string, unknown>} spec @param {string} identity @param {{path:string,content:string,mode:number}[]} files @param {boolean} directory */
function buildRenderedArtifact(spec, identity, files, directory) {
  const renderedFiles = files.map((file) => ({
    path: approvalPath(identity, file.path, directory),
    content_encoding: "base64",
    content_bytes: Buffer.from(file.content).toString("base64"),
    sha256: sha256(file.content),
    mode: file.mode,
  })).sort((a, b) => a.path.localeCompare(b.path));
  const directories = directory ? [identity, ...treeDirectoriesFromFiles(identity, files)].sort() : [];
  const artifactBase = { kind: spec.kind, target_identity: identity, template_version: spec.template_version, files: renderedFiles, directories };
  return { artifact_id: sha256(canonicalJson(artifactBase)), files: renderedFiles, directories };
}
/** @param {string} target @param {string} identity @param {{path:string,content:string,mode:number}[]} files @param {boolean} directory */
function buildChangeSet(target, identity, files, directory) {
  const desired = new Map(files.map((file) => [directory ? file.path : "", { sha256: sha256(file.content), mode: file.mode }]));
  const actual = treeMap(target);
  const paths = [...new Set([...desired.keys(), ...actual.keys()])].sort();
  return paths.map((path) => {
    const old = actual.get(path) ?? null, next = desired.get(path) ?? null;
    return { operation: /** @type {"create"|"update"|"delete"} */ (next ? old ? "update" : "create" : "delete"), path: approvalPath(identity, path, directory), old_sha256: old?.sha256 ?? null, old_mode: old?.mode ?? null, new_sha256: next?.sha256 ?? null, new_mode: next?.mode ?? null };
  });
}
/** @param {string} target @param {string} identity @param {Record<string, unknown>} spec */
function preflightOwnedRoot(target, identity, spec) {
  if (!existsSync(target)) return;
  if (!directoryKinds.has(String(spec.kind))) {
    const stat = lstatSync(target);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("E_UNOWNED_ROOT");
    return;
  }
  if (!lstatSync(target).isDirectory() || lstatSync(target).isSymbolicLink()) throw new Error("E_UNOWNED_ROOT");
  const marker = join(target, markerPath);
  if (!existsSync(marker) || lstatSync(marker).isSymbolicLink()) throw new Error("E_UNOWNED_ROOT");
  const bytes = readFileSync(marker, "utf8"), value = readJson(marker);
  const expectedKeys = ["artifact_kind", "marker_path", "owned_directories", "owned_entries", "owned_set_digest", "schema_version", "target_identity", "template_version"];
  if (Object.keys(value).sort().join(",") !== expectedKeys.join(",") || value.schema_version !== 1 || value.artifact_kind !== spec.kind || value.target_identity !== identity || value.template_version !== spec.template_version || value.marker_path !== markerPath || !Array.isArray(value.owned_entries) || !Array.isArray(value.owned_directories)) throw new Error("E_MARKER");
  const payload = { schema_version: value.schema_version, artifact_kind: value.artifact_kind, target_identity: value.target_identity, template_version: value.template_version, marker_path: value.marker_path, owned_directories: value.owned_directories, owned_entries: value.owned_entries };
  if (typeof value.owned_set_digest !== "string" || value.owned_set_digest !== sha256(canonicalJson(payload)) || bytes !== `${canonicalJson(value)}\n`) throw new Error("E_MARKER");
  const entries = value.owned_entries;
  if (!entries.every(ownedEntry)) throw new Error("E_MARKER");
  if (entries.some((entry, i) => i > 0 && entries[i - 1].path.localeCompare(entry.path) >= 0)) throw new Error("E_MARKER");
  const directorySet = new Set([".hermes-agent-maker"]);
  for (const entry of entries) {
    let directory = dirname(entry.path);
    while (directory !== ".") {
      directorySet.add(directory);
      directory = dirname(directory);
    }
  }
  const directories = [...directorySet].sort();
  if (canonicalJson(directories) !== canonicalJson(value.owned_directories) || canonicalJson(treeDirectories(target)) !== canonicalJson(directories)) throw new Error("E_MARKER");
  const actual = treeMap(target), allowed = new Set([markerPath, ...entries.map((entry) => entry.path)]);
  if (actual.size !== allowed.size || [...actual.keys()].some((path) => !allowed.has(path))) throw new Error("E_UNOWNED_ROOT");
  for (const entry of entries) { const actualEntry = actual.get(entry.path); if (!actualEntry || actualEntry.sha256 !== entry.sha256 || actualEntry.mode !== entry.mode) throw new Error("E_PREIMAGE"); }
}
/** @param {unknown} approval @param {Record<string, unknown>} expected */
function validateApprovalEnvelope(approval, expected) {
  if (!record(approval) || canonicalJson(approval) !== canonicalJson(expected)) throw new Error("E_APPROVAL_MISMATCH");
}
/** @param {unknown} approval @param {Record<string, unknown>} spec @param {string} identity @param {Record<string, unknown>} [expected] @returns {asserts approval is Record<string, unknown>} */
function validateApprovalIntegrity(approval, spec, identity, expected) {
  if (!record(approval)) throw new Error("E_APPROVAL_MISMATCH");
  if (approval.kind !== spec.kind || approval.target_identity !== identity || approval.template_version !== spec.template_version
    || typeof approval.artifact_id !== "string" || typeof approval.preview_id !== "string" || typeof approval.approval_digest !== "string") throw new Error("E_APPROVAL_MISMATCH");
  const { approval_digest, preview_id, ...base } = approval;
  if (preview_id !== sha256(canonicalJson(base)) || approval_digest !== sha256(canonicalJson({ ...base, preview_id }))) throw new Error("E_APPROVAL_MISMATCH");
  if (expected !== undefined && canonicalJson(approval) !== canonicalJson(expected)) throw new Error("E_APPROVAL_MISMATCH");
}
/** @param {string} path @param {Record<string,{sha256:string,mode:number}>} expected */
function matchesMap(path, expected) { try { return canonicalJson(mapObject(treeMap(path))) === canonicalJson(expected); } catch { return false; } }
/** @param {unknown} value @param {boolean} single */
function validJournalMap(value, single) {
  return record(value) && Object.entries(value).every(([path, entry]) => (single ? path === "" : safePath(path)) && record(entry)
    && Object.keys(entry).sort().join(",") === "mode,sha256" && typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/u.test(entry.sha256) && typeof entry.mode === "number" && fileMode(entry.mode));
}
/** @param {Record<string, unknown>} authorization */
function journalAuthorization(authorization) {
  return {
    artifact_id: authorization.artifact_id,
    kind: authorization.kind,
    target_identity: authorization.target_identity,
    template_version: authorization.template_version,
    preview_id: authorization.preview_id,
    approval_digest: authorization.approval_digest,
    changes: authorization.changes,
    files: authorization.files,
    directories: authorization.directories,
    preimage: authorization.preimage,
    mode: authorization.mode,
    transaction_phase: authorization.transaction_phase,
    recovery_disposition: authorization.recovery_disposition,
  };
}
/** @param {Record<string, unknown>} authorization @param {boolean} directory @returns {{expected: Record<string,{sha256:string,mode:number}>, previous: Record<string,{sha256:string,mode:number}>}} */
function mapsFromAuthorization(authorization, directory) {
  if (!Array.isArray(authorization.files) || !Array.isArray(authorization.changes) || typeof authorization.target_identity !== "string") throw new Error("E_JOURNAL_AUTHORIZATION");
  const prefix = `${authorization.target_identity}/`;
  /** @type {Record<string,{sha256:string,mode:number}>} */
  const expected = {};
  for (const entry of authorization.files) {
    if (!record(entry) || typeof entry.path !== "string" || typeof entry.sha256 !== "string" || typeof entry.mode !== "number") throw new Error("E_JOURNAL_AUTHORIZATION");
    const approvedPath = entry.path;
    const path = directory ? approvedPath.startsWith(prefix) ? approvedPath.slice(prefix.length) : "" : approvedPath === authorization.target_identity ? "" : "\0";
    if ((directory && !safePath(path)) || (!directory && path !== "")) throw new Error("E_JOURNAL_AUTHORIZATION");
    expected[path] = { sha256: entry.sha256, mode: entry.mode };
  }
  /** @type {Record<string,{sha256:string,mode:number}>} */
  const previous = {};
  for (const change of authorization.changes) {
    if (!record(change) || typeof change.path !== "string") throw new Error("E_JOURNAL_AUTHORIZATION");
    const path = directory ? change.path.startsWith(prefix) ? change.path.slice(prefix.length) : "" : change.path === authorization.target_identity ? "" : "\0";
    if ((directory && !safePath(path)) || (!directory && path !== "")) throw new Error("E_JOURNAL_AUTHORIZATION");
    if (change.old_sha256 !== null || change.old_mode !== null) {
      if (typeof change.old_sha256 !== "string" || typeof change.old_mode !== "number") throw new Error("E_JOURNAL_AUTHORIZATION");
      previous[path] = { sha256: change.old_sha256, mode: change.old_mode };
    }
  }
  return { expected, previous };
}
/** Deterministically complete or roll back only the transaction bound to this approval. @param {string} journal @param {Record<string, unknown>} authorization @returns {"completed" | "rolled-back"} */
function recoverJournal(journal, authorization) {
  const value = readJson(journal);
  if (value.version !== 1 || typeof value.directory !== "boolean" || !safePath(String(value.target_identity)) || typeof value.target !== "string" || typeof value.stage !== "string" || typeof value.backup !== "string") throw new Error("E_JOURNAL");
  if (!record(value.authorization) || canonicalJson(value.authorization) !== canonicalJson(journalAuthorization(authorization))) throw new Error("E_JOURNAL_AUTHORIZATION");
  const { target, stage, backup } = value;
  const parent = dirname(target), token = sha256(target).slice(0, 16);
  if (journal !== join(parent, `.hermes-agent-maker-journal-${token}.json`) || dirname(stage) !== parent || dirname(backup) !== parent
    || !stage.startsWith(join(parent, `.hermes-agent-maker-stage-${token}-`)) || backup !== `${target}.hermes-backup`) throw new Error("E_JOURNAL");
  if (!validJournalMap(value.expected, !value.directory) || !validJournalMap(value.previous, !value.directory)) throw new Error("E_JOURNAL");
  const derived = mapsFromAuthorization(authorization, value.directory);
  if (canonicalJson(value.expected) !== canonicalJson(derived.expected) || canonicalJson(value.previous) !== canonicalJson(derived.previous)) throw new Error("E_JOURNAL_AUTHORIZATION");
  const rootExpected = matchesMap(target, /** @type {Record<string,{sha256:string,mode:number}>} */ (value.expected));
  const rootPrevious = matchesMap(target, /** @type {Record<string,{sha256:string,mode:number}>} */ (value.previous));
  const stageExpected = matchesMap(stage, /** @type {Record<string,{sha256:string,mode:number}>} */ (value.expected));
  const backupPrevious = matchesMap(backup, /** @type {Record<string,{sha256:string,mode:number}>} */ (value.previous));
  if (rootExpected && (!existsSync(backup) || backupPrevious) && (!existsSync(stage) || stageExpected)) { if (existsSync(backup)) rmSync(backup, { recursive: true }); if (existsSync(stage)) rmSync(stage, { recursive: true }); rmSync(journal); return "completed"; }
  if (!existsSync(target) && stageExpected && (!existsSync(backup) || backupPrevious)) { renameSync(stage, target); if (existsSync(backup)) rmSync(backup, { recursive: true }); rmSync(journal); return "completed"; }
  if (rootPrevious && stageExpected && !existsSync(backup)) { rmSync(stage, { recursive: true }); rmSync(journal); return "rolled-back"; }
  if (!existsSync(target) && !existsSync(stage) && backupPrevious) { renameSync(backup, target); rmSync(journal); return "rolled-back"; }
  throw new Error("E_RECOVERY_AMBIGUOUS");
}
/** Callable recovery entry point for interrupted transactions. @param {string} target @param {Record<string, unknown>} authorization @returns {"none" | "completed" | "rolled-back"} */
function recoverTransaction(target, authorization) {
  const journal = join(dirname(target), `.hermes-agent-maker-journal-${sha256(target).slice(0, 16)}.json`);
  if (existsSync(journal)) {
    if (readJson(journal).target !== target) throw new Error("E_JOURNAL");
    return recoverJournal(journal, authorization);
  }
  return "none";
}
/** @param {string} target @param {string} identity @param {{path:string,content:string,mode:number}[]} files @param {boolean} directory @param {Record<string, unknown>} authorization */
function commitTransaction(target, identity, files, directory, authorization) {
  const parent = dirname(target); if (!existsSync(parent) || !lstatSync(parent).isDirectory() || lstatSync(parent).isSymbolicLink()) throw new Error("E_PARENT");
  const prefix = `.hermes-agent-maker-stage-${sha256(target).slice(0, 16)}-`, stage = join(parent, `${prefix}${randomUUID()}`), backup = `${target}.hermes-backup`, journal = join(parent, `.hermes-agent-maker-journal-${sha256(target).slice(0, 16)}.json`);
  if (existsSync(journal)) recoverJournal(journal, authorization);
  if (existsSync(backup)) throw new Error("E_STALE_TRANSACTION");
  const expected = mapObject(new Map(files.map((file) => [directory ? file.path : "", { sha256: sha256(file.content), mode: file.mode }])));
  try {
  if (directory) {
    mkdirSync(stage);
    for (const file of files) { const path = join(stage, file.path); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, file.content, { mode: file.mode }); chmodSync(path, file.mode); }
  } else {
    const file = files[0];
    writeFileSync(stage, file.content, { mode: file.mode }); chmodSync(stage, file.mode);
  }
  if (!matchesMap(stage, expected)) throw new Error("E_STAGE_VERIFY");
  } catch (error) { if (existsSync(stage)) rmSync(stage, { recursive: true }); throw error; }
  const previous = mapObject(treeMap(target));
  try {
    writeFileSync(journal, canonicalJson({ version: 1, directory, target_identity: identity, target, stage, backup, expected, previous, authorization: journalAuthorization(authorization) }) + "\n");
  } catch (error) {
    if (existsSync(stage)) rmSync(stage, { recursive: true });
    throw error;
  }
  if (!directory) {
    renameSync(stage, target);
    if (!matchesMap(target, expected)) throw new Error("E_COMMIT_VERIFY");
    rmSync(journal);
    return;
  }
  let backedUp = false;
  try {
    if (existsSync(target)) { renameSync(target, backup); backedUp = true; }
    renameSync(stage, target);
    if (!matchesMap(target, expected)) throw new Error("E_COMMIT_VERIFY");
    if (existsSync(backup)) rmSync(backup, { recursive: true });
    rmSync(journal);
  } catch (error) {
    if (backedUp && matchesMap(backup, previous)) {
      try {
        if (existsSync(target) && matchesMap(target, expected) && !existsSync(stage)) renameSync(target, stage);
        if (!existsSync(target)) renameSync(backup, target);
      } catch {
        // Preserve journal, stage, and backup evidence for authorization-bound recovery.
      }
    }
    throw error;
  }
}
/** @param {string} lock */
function lockOwnerIsLive(lock) {
  const owner = join(lock, "owner.json");
  try {
    const stat = lstatSync(owner);
    if (!stat.isFile() || stat.isSymbolicLink()) return true;
    const value = readJson(owner);
    if (Object.keys(value).sort().join(",") !== "created_at,pid" || typeof value.pid !== "number" || !Number.isSafeInteger(value.pid) || value.pid <= 0 || typeof value.created_at !== "string") return true;
    const pid = value.pid;
    try { process.kill(pid, 0); return true; }
    catch (error) { return !(record(error) && error.code === "ESRCH"); }
  } catch { return true; }
}
/** @param {string} lock */
function acquireLock(lock) {
  try { mkdirSync(lock); }
  catch (error) {
    if (!(record(error) && error.code === "EEXIST") || !existsSync(lock) || !lstatSync(lock).isDirectory() || lstatSync(lock).isSymbolicLink() || lockOwnerIsLive(lock)) throw new Error("E_LOCK");
    rmSync(lock, { recursive: true });
    try { mkdirSync(lock); } catch { throw new Error("E_LOCK"); }
  }
  try { writeFileSync(join(lock, "owner.json"), canonicalJson({ pid: process.pid, created_at: new Date().toISOString() }) + "\n", { mode: 0o600 }); }
  catch (error) { rmSync(lock, { recursive: true }); throw error; }
}
/** @param {string[]} argv @returns {void} @throws {Error} for invalid input, unsafe state, or failed transaction */
function main(argv) {
  const args = parseArgs(argv), spec = readJson(args.manifest); validateSpec(spec);
  const { root, output: target } = resolveSafeTarget(args.workspace, String(spec.target)), identity = String(spec.target), directory = directoryKinds.has(String(spec.kind));
  const files = addOwnershipMarker(identity, spec, renderFiles(spec));
  if (spec.kind === "portable-plugin") validateRenderedPortableOutput(files);
  const renderedArtifact = buildRenderedArtifact(spec, identity, files, directory);
  /** @returns {Record<string, unknown>} */
  const buildEnvelope = () => {
    preflightOwnedRoot(target, identity, spec);
    const changes = buildChangeSet(target, identity, files, directory);
    /** @type {[string, {sha256:string,mode:number}][]} */
    const preimageEntries = [...treeMap(target)]
      .map(([path, entry]) => /** @type {[string, {sha256:string,mode:number}]} */ ([approvalPath(identity, path, directory), entry]));
    preimageEntries.sort(([a], [b]) => a.localeCompare(b));
    const preimage = Object.fromEntries(preimageEntries);
    const base = { artifact_id: renderedArtifact.artifact_id, kind: spec.kind, target_identity: identity, template_version: spec.template_version, files: renderedArtifact.files, directories: renderedArtifact.directories, changes, preimage, mode: "preview", transaction_phase: "preview", recovery_disposition: "none" };
    const preview_id = sha256(canonicalJson(base)), unsigned = { ...base, preview_id };
    return { ...unsigned, approval_digest: sha256(canonicalJson(unsigned)) };
  };
  let envelope;
  let recoveryDisposition = "none";
  if (spec.mode === "apply") {
    const approval = args.approval ? readJson(args.approval) : /** @type {Record<string, unknown>} */ (spec.approved_change_set);
    validateApprovalIntegrity(approval, spec, identity);
    if (approval.artifact_id !== renderedArtifact.artifact_id
      || canonicalJson(approval.files) !== canonicalJson(renderedArtifact.files)
      || canonicalJson(approval.directories) !== canonicalJson(renderedArtifact.directories)) throw new Error("E_APPROVAL_MISMATCH");
    // The lock serializes final containment and preimage checks with the writer.
    const lock = join(root, `.hermes-agent-maker-lock-${sha256(identity).slice(0, 16)}`);
    let locked = false;
    try {
      acquireLock(lock); locked = true; const current = resolveSafeTarget(root, identity).output;
      if (current !== target) throw new Error("E_CONTAINMENT");
      // Interrupted state must be authenticated and repaired before deriving a
      // new preview from the filesystem it left behind.
      const recovery = recoverTransaction(target, approval);
      recoveryDisposition = recovery;
      if (recovery === "completed") {
        envelope = approval;
      } else {
        envelope = buildEnvelope();
        validateApprovalEnvelope(approval, envelope);
        commitTransaction(target, identity, files, directory, envelope);
      }
    } finally { if (locked && existsSync(lock) && lstatSync(lock).isDirectory() && !lstatSync(lock).isSymbolicLink()) rmSync(lock, { recursive: true }); }
  } else envelope = buildEnvelope();
  const output = spec.mode === "apply"
    ? {
        receipt_kind: "apply",
        mode: "apply",
        transaction_phase: "committed",
        recovery_disposition: recoveryDisposition,
        artifact_id: envelope.artifact_id,
        kind: envelope.kind,
        target_identity: envelope.target_identity,
        template_version: envelope.template_version,
        preview_id: envelope.preview_id,
        approval_digest: envelope.approval_digest,
        changes: envelope.changes,
      }
    : envelope;
  process.stdout.write(`${canonicalJson(output)}\n`);
}

export { main, recoverTransaction, buildChangeSet, preflightOwnedRoot };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`${JSON.stringify({ error: error instanceof Error ? error.message : "E_UNKNOWN" })}\n`); process.exitCode = 1; }
}
