#!/usr/bin/env bun
// @ts-check

/** Exercise the immutable skill-script manifest and harmless Bun subprocess paths. */
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "bun:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = join(root, "scripts/fixtures/skill-script-parity/manifest.json");
const contractsPath = join(root, "scripts/fixtures/skill-script-parity/behavior/contracts.json");
const validatorPath = join(root, "scripts/validate-skills.mjs");
const currentVersionPath = join(root, "skills/version-update/scripts/version-current.mjs");
const versionApplyPath = join(root, "skills/version-update/scripts/version-apply.mjs");
const dashboardPath = join(root, "skills/autoresearch-code/scripts/render-dashboard.mjs");
const versionGitCommitPath = join(root, "skills/version-update/scripts/git-commit.mjs");
const versionGitPushPath = join(root, "skills/version-update/scripts/git-push.mjs");
const deployCheckPath = join(root, "skills/pre-deploy/scripts/deploy-check.mjs");
const gitMakerCommitPath = join(root, "skills/git-maker/scripts/git-commit.mjs");
const repoDiscoverPath = join(root, "skills/git-maker/scripts/repo-discover.mjs");
const repoStatusPath = join(root, "skills/git-maker/scripts/repo-status.mjs");
const gitMakerFastPath = join(root, "skills/git-maker/scripts/git-maker-fast.mjs");
const legacyPreimageBase = "990359457e2ccbf2bd4bb65065037d456c5940bc";
const hermesGeneratePath = join(root, "skills/hermes-agent-maker/scripts/generate.mjs");
const hermesPortableValidatorPath = join(root, "skills/hermes-agent-maker/scripts/validate-portable-v1-output.mjs");

/** @param {string} text @param {string} cwd */
function normalizeOutput(text, cwd) {
  return text
    .replaceAll(root, "<repo>")
    .replaceAll(`/private${cwd}`, "<cwd>")
    .replaceAll(cwd, "<cwd>")
    .replace(/\/(?:Users|home)\/[^/\n]+(?:\/[^:\n"' )]+)*/g, "<absolute-path>")
    .replace(/Bun v[\d.]+ \([^)]+\)/g, "Bun v<version> (<os> <arch>)")
    .replace(/:\d+:\d+/g, ":<line>:<column>");
}

/** @param {{ equals?: string, contains?: string[] }} expected @param {string} actual @param {string} cwd */
function expectOutput(expected, actual, cwd) {
  const normalized = normalizeOutput(actual, cwd);
  if (expected.equals !== undefined) expect(normalized).toBe(expected.equals);
  else for (const substring of expected.contains ?? []) expect(normalized).toContain(substring);
}

/** @param {string[]} command @param {string} cwd @param {Record<string, string | undefined>} [env] */
function run(command, cwd, env) {
  const result = Bun.spawnSync({ cmd: command, cwd, env, stdout: "pipe", stderr: "pipe" });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}
/** @param {string} directory */
function filesBelow(directory) {
  /** @type {string[]} */
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(file));
    else if (entry.isFile() && file.endsWith(".mjs")) files.push(file);
  }
  return files;
}

/** @param {string} fixture */
function initializeGit(fixture) {
  expect(run(["git", "init", "-q"], fixture).exitCode).toBe(0);
  expect(run(["git", "config", "user.name", "Test"], fixture).exitCode).toBe(0);
  expect(run(["git", "config", "user.email", "test@example.com"], fixture).exitCode).toBe(0);
}

/** @param {string} fixture @param {string} source */
function writeFakeGit(fixture, source) {
  const bin = join(fixture, "bin");
  mkdirSync(bin);
  const executable = join(bin, "git");
  writeFileSync(executable, source);
  chmodSync(executable, 0o755);
  return { ...process.env, PATH: bin };
}

/** Kill a fixture child recorded in a PID file, ignoring processes that already exited. @param {string} pidFile */
function killRecordedPid(pidFile) {
  if (!existsSync(pidFile)) return;
  const pid = Number(readFileSync(pidFile, "utf8").trim());
  if (!Number.isInteger(pid) || pid <= 1) return;
  try { process.kill(pid, "SIGKILL"); } catch {}
}


test("manifest centrally inventories 32 scripts including two authored baseline-absent MJS paths", () => {
  const manifest = /** @type {{ scripts: { path: string, family: string, legacyOrigin: string, usage: string, behavior: string }[], forbiddenDetectorReferences: { records: { literal: string, allowedLocations: { file: string, jsonPath: string }[] }[] }, versionUpdateDetectorAbsentCorrection: { detectorRestored: boolean, legacyFiles: { legacyPath: string, sha256: string, gitMode: string, finalPath: string }[], restoreOrder: string[] } }} */ (JSON.parse(readFileSync(manifestPath, "utf8")));
  expect(manifest.scripts).toHaveLength(32);
  expect(new Set(manifest.scripts.map((row) => row.path)).size).toBe(32);
  expect(manifest.scripts.every((row) => [row.path, row.family, row.legacyOrigin, row.usage, row.behavior].every(Boolean))).toBe(true);
  expect(Object.fromEntries(["former-sh", "former-py", "retained-mjs", "authored-mjs"].map((origin) => [
    origin,
    manifest.scripts.filter((row) => row.legacyOrigin === origin).length,
  ]))).toEqual({ "former-sh": 20, "former-py": 1, "retained-mjs": 9, "authored-mjs": 2 });
  const authored = [
    "skills/hermes-agent-maker/scripts/generate.mjs",
    "skills/hermes-agent-maker/scripts/validate-portable-v1-output.mjs",
  ];
  expect(manifest.scripts.map((row) => row.path).sort()).toEqual(filesBelow(join(root, "skills")).map((file) => relative(root, file)).sort());
  expect(manifest.scripts.filter((row) => row.legacyOrigin === "authored-mjs").map((row) => row.path).sort()).toEqual(authored);
  for (const path of authored) {
    const row = manifest.scripts.find((candidate) => candidate.path === path);
    expect(row.sourcePreimage.baselineAbsence).toEqual({ baselineRef: legacyPreimageBase, path, absent: true });
    expect(run(["git", "cat-file", "-e", `${legacyPreimageBase}:${path}`], root).exitCode).not.toBe(0);
  }
  expect(manifest.forbiddenDetectorReferences.records).toHaveLength(6);
  expect(manifest.forbiddenDetectorReferences.records.every((row) => row.literal && row.allowedLocations.length === 1)).toBe(true);
  expect(manifest.versionUpdateDetectorAbsentCorrection.detectorRestored).toBe(false);
  expect(manifest.versionUpdateDetectorAbsentCorrection.legacyFiles).toHaveLength(7);
  expect(manifest.versionUpdateDetectorAbsentCorrection.legacyFiles.every((row) => /^[a-f0-9]{64}$/.test(row.sha256) && row.gitMode === "100755")).toBe(true);
  expect(manifest.versionUpdateDetectorAbsentCorrection.restoreOrder.length).toBeGreaterThanOrEqual(4);
});
/** @param {string} directory */
function observableFiles(directory) {
  /** @type {{ path: string, bytes: number, sha256: string }[]} */
  const files = [];
  /** @type {Record<string, string>} */
  const modes = {};
  for (const entry of readdirSync(directory, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile()) continue;
    const path = relative(directory, join(entry.parentPath, entry.name));
    const bytes = readFileSync(join(directory, path));
    const normalized = Buffer.from(bytes.toString().replaceAll(directory, "<cwd>").replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, "<timestamp>"));
    files.push({ path, bytes: normalized.length, sha256: createHash("sha256").update(normalized).digest("hex") });
    modes[path] = (statSync(join(directory, path)).mode & 0o777).toString(8);
  }
  return { files: files.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0), modes };
}

/** @param {{ path: string, text: string, mode?: string }[]} files @param {string} cwd */
function materializeFixture(files, cwd) {
  for (const file of files) {
    const target = join(cwd, file.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.text);
    if (file.mode) chmodSync(target, Number.parseInt(file.mode, 8));
  }
}

test("behavior contracts execute all 96 isolated semantic fixtures with exact observables", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const contracts = JSON.parse(readFileSync(contractsPath, "utf8"));
  const dimensions = ["stdout", "stderr", "exit", "files", "modes", "cwd", "env", "argv"];
  expect(contracts.requiredBy).toBe(relative(root, manifestPath));
  expect(manifest.legacyPreimageBase).toBe(legacyPreimageBase);
  expect(contracts.legacyPreimageBase).toBe(legacyPreimageBase);
  expect(contracts.coverage.expectedRows).toBe(32);
  expect(contracts.coverage.expectedFixtures).toBe(96);
  expect(contracts.coverage.legacyOriginCounts).toEqual({ "former-sh": 20, "former-py": 1, "retained-mjs": 9, "authored-mjs": 2 });
  expect(contracts.rows).toHaveLength(32);
  let cases = 0;
  for (const row of contracts.rows) {
    const manifestRow = manifest.scripts.find((candidate) => candidate.path === row.path);
    expect(manifestRow).toBeDefined();
    expect(row.id).toBe(manifestRow.behaviorContractId);
    expect(Object.keys(row.fixtures).sort()).toEqual(["familyEdge", "happy", "malformed"]);
    expect(Object.keys(row.dimensions).sort()).toEqual(dimensions.slice().sort());
    /** @type {string[]} */
    const normalizedObservables = [];
    for (const [kind, fixture] of Object.entries(row.fixtures)) {
      cases += 1;
      expect(fixture.scenario).toBe(kind);
      expect(fixture.command).toEqual({ executable: "bun", arguments: [row.path] });
      expect(fixture.input.cwd).toBe("isolated-temp-tree");
      expect(fixture.input.env).toEqual({ NO_COLOR: "1" });
      expect(Array.isArray(fixture.input.files)).toBe(true);
      const cwd = mkdtempSync(join(tmpdir(), "hypercore-skill-script-contract-"));
      try {
        materializeFixture(fixture.input.files, cwd);
        const env = { ...process.env, ...fixture.input.env };
        if (fixture.input.fakeGit) env.PATH = writeFakeGit(cwd, "#!/bin/sh\ncase \"$1\" in rev-parse) pwd;; status) echo \"## fixture\";; diff) exit 0;; *) exit 0;; esac\n").PATH;
        const result = run([process.execPath, join(root, ...fixture.command.arguments), ...fixture.input.argv], cwd, env);
        expect(result.exitCode).toBe(fixture.expected.exit);
        expectOutput(fixture.expected.stdout, result.stdout, cwd);
        expectOutput(fixture.expected.stderr, result.stderr, cwd);
        const observed = observableFiles(cwd);
        const byPath = (left, right) => left.path.localeCompare(right.path);
        expect(observed.files.sort(byPath)).toEqual([...fixture.expected.files].sort(byPath));
        expect(observed.modes).toEqual(fixture.expected.modes);
        normalizedObservables.push(JSON.stringify({
          exit: result.exitCode,
          stdout: normalizeOutput(result.stdout, cwd),
          stderr: normalizeOutput(result.stderr, cwd),
          files: observableFiles(cwd),
        }));
        expect(fixture.expected.cwd).toBe(fixture.input.cwd);
        expect(fixture.expected.env).toEqual(fixture.input.env);
        expect(fixture.expected.argv).toEqual(fixture.input.argv);
      } finally { rmSync(cwd, { recursive: true, force: true }); }
    }
    if (["nextjs-architecture", "prompt-maker", "skill-maker", "vite-architecture"].includes(row.family)) {
      expect(new Set(normalizedObservables).size).toBe(3);
    }
    if (manifestRow.legacyOrigin === "authored-mjs") {
      expect(row.sourcePreimage.baselineAbsence).toEqual({ baselineRef: legacyPreimageBase, path: row.path, absent: true });
      expect(run(["git", "cat-file", "-e", `${legacyPreimageBase}:${row.path}`], root).exitCode).not.toBe(0);
    } else {
      const source = run(["git", "show", `${manifest.legacyPreimageBase}:${row.sourcePreimage.path}`], root);
      expect(source.exitCode).toBe(0);
      expect(createHash("sha256").update(source.stdout).digest("hex")).toBe(row.sourcePreimage.sha256);
    }
  }
  expect(cases).toBe(96);
}, 30_000);

test("Hermes previews are deterministic across all seven artifact kinds and easy-Korean routing cases are mandatory", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-hermes-preview-"));
  try {
    const generatorSource = readFileSync(hermesGeneratePath, "utf8");
    expect(generatorSource).toContain("validatePortableV1Documents");
    expect(generatorSource).not.toContain("mkdtempSync");
    expect(generatorSource).not.toContain("tmpdir()");
    const kinds = ["skill", "native-plugin", "portable-plugin", "soul", "agents", "user-draft", "memory-draft"];
    const fixedTargets = { soul: "SOUL.md", agents: "AGENTS.md", "user-draft": "USER.md.draft.md", "memory-draft": "MEMORY.md.draft.md" };
    for (const kind of kinds) {
      const target = fixedTargets[kind] ?? `${kind}-output`;
      const manifest = {
        kind,
        intent: "artifact:generator",
        content: "Create a safe fixture artifact.",
        target,
        name: "fixture-agent",
        mode: "preview",
        template_version: "1.0.0",
      };
      const manifestPath = join(fixture, `${kind}.json`);
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const argv = [process.execPath, hermesGeneratePath, "--manifest", manifestPath, "--workspace", fixture];
      const first = run(argv, fixture);
      const second = run(argv, fixture);
      expect(first.exitCode).toBe(0);
      expect(second).toEqual(first);
      const preview = JSON.parse(first.stdout);
      expect(preview.kind).toBe(kind);
      expect(preview.changes.length).toBeGreaterThan(0);
      expect(existsSync(join(fixture, target))).toBe(false);
    }
    const evals = readFileSync(join(root, "skills/hermes-agent-maker/assets/evals/hermes-agent-maker-cases.jsonl"), "utf8")
      .trim().split("\n").map((line) => JSON.parse(line));
    const evaluator = run([
      process.execPath,
      join(root, "skills/skill-maker/scripts/validate-skill-maker.mjs"),
      "--root", join(root, "skills/hermes-agent-maker"),
      "--evals", join(root, "skills/hermes-agent-maker/assets/evals/hermes-agent-maker-cases.jsonl"),
      "--json",
    ], root);
    expect(evaluator.exitCode).toBe(0);
    expect(JSON.parse(evaluator.stdout).ok).toBe(true);
    const koreanRouting = readFileSync(join(root, "skills/hermes-agent-maker/rules/routing.ko.md"), "utf8");
    const englishRouting = readFileSync(join(root, "skills/hermes-agent-maker/rules/routing.md"), "utf8");
    const pairedContract = [
      readFileSync(join(root, "skills/hermes-agent-maker/SKILL.md"), "utf8"),
      readFileSync(join(root, "skills/hermes-agent-maker/SKILL.ko.md"), "utf8"),
      englishRouting,
      koreanRouting,
      readFileSync(join(root, "skills/hermes-agent-maker/rules/safety-and-approval.md"), "utf8"),
      readFileSync(join(root, "skills/hermes-agent-maker/rules/safety-and-approval.ko.md"), "utf8"),
    ].join("\n");
    /** @type {Record<string, RegExp[]>} */
    const expectationEvidence = {
      "positive-skill-ko": [/skill/u, /쉬운 한국어/u, /preview|미리보기/u, /approval|승인/u, /overwrite|덮어/u, /Discord/u],
      "positive-native-en": [/native-plugin/u, /normalized|정규화/u, /preview-bound|preview에 묶/u, /install/u, /enable/u],
      "positive-portable-mixed": [/portable-plugin/u, /Agent Plugins v1\.0\.0/u, /Hermes subset/u, /dynamic schema|동적 schema/u, /\bsse\b/iu],
      "negative-discord-ko": [/범위 밖|out of scope/u, /별도 작업|separate/u, /Discord/u, /gateway/u, /token/u],
      "negative-install-en": [/installation|install/u, /enable/u, /profile/u],
      "boundary-plugin-kind": [/native.*portable|portable.*native/isu, /한 번에 하나|one.*decision/isu, /infer native|추측하지/isu, /combine questions|질문을 합치지/isu],
      "workflow-preview-approval": [/complete preview|전체 preview/u, /preimage/u, /exact approval|정확한 승인/u, /stale|오래된/u, /before approval|승인 전/u, /scope|범위/u],
      "source-local-official": [/local|로컬/u, /Agent Plugins v1\.0\.0/u, /provenance|출처/u, /schema fetch|schema.*가져/u, /evidence.*authority|근거.*권한/isu],
      "safety-memory-draft": [/draft-only/u, /USER\.md\.draft\.md/u, /MEMORY\.md\.draft\.md/u, /apply guidance/u, /active memory|활성.*memory/isu, /credential/u],
      "adversarial-injected-content": [/reject|거절/u, /safety boundary|안전.*범위/isu, /Discord/u, /token/u, /gateway/u],
      "regression-bilingual-one-question": [/한 번에 한 결정|one.*decision/isu, /쉬운 한국어/u, /English.*Korean|영어.*한국어/isu, /combine questions|질문을 합치지/isu, /jargon|전문 용어/u],
    };
    for (const entry of evals) {
      expect(typeof entry.prompt).toBe("string");
      expect(entry.expected.must.length).toBeGreaterThan(0);
      expect(entry.expected.mustNot.length).toBeGreaterThan(0);
      const evidence = expectationEvidence[entry.id];
      expect(evidence.length).toBe(entry.expected.must.length + entry.expected.mustNot.length);
      for (const pattern of evidence) {
        if (!pattern.test(pairedContract)) throw new Error(`missing paired-contract evidence for ${entry.id}: ${String(pattern)}`);
      }
    }
    expect(koreanRouting).toContain("preview에 묶인 명시적 approval");
    expect(englishRouting).toContain("explicit preview-bound approval");
    for (const route of ["skill", "native-plugin", "portable-plugin", "soul", "agents", "user-draft", "memory-draft"]) {
      expect(koreanRouting).toContain(`\`${route}\``);
      expect(englishRouting).toContain(`\`${route}\``);
    }
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}, 20_000);

test("Hermes applies every kind only with its exact preview approval, preserves preimages, and rejects unsafe roots", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-hermes-apply-"));
  try {
    const kinds = ["skill", "native-plugin", "portable-plugin", "soul", "agents", "user-draft", "memory-draft"];
    const fixedTargets = { soul: "SOUL.md", agents: "AGENTS.md", "user-draft": "USER.md.draft.md", "memory-draft": "MEMORY.md.draft.md" };
    for (const kind of kinds) {
      const target = fixedTargets[kind] ?? `${kind}-artifact`;
      const spec = { kind, intent: "artifact:generator", content: `Create ${kind} content for a reviewed fixture.`, target, name: "fixture-agent", mode: "preview", template_version: "1.0.0" };
      const specPath = join(fixture, `${kind}.json`);
      writeFileSync(specPath, JSON.stringify(spec));
      const preview = run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture);
      expect(preview.exitCode).toBe(0);
      const approval = JSON.parse(preview.stdout);
      expect(approval.files.length).toBeGreaterThan(0);
      expect(approval.changes.every((change) => change.operation === "create" && change.old_sha256 === null && change.old_mode === null)).toBe(true);
      spec.mode = "apply";
      spec.approved_change_set = approval;
      writeFileSync(specPath, JSON.stringify(spec));
      expect(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture).exitCode).toBe(0);
      const output = realpathSync(join(fixture, target));
      expect(existsSync(output)).toBe(true);
      if (kind === "skill") {
        const token = createHash("sha256").update(output).digest("hex").slice(0, 16);
        const journal = join(dirname(output), `.hermes-agent-maker-journal-${token}.json`);
        const expected = Object.fromEntries(approval.files.map((file) => [file.path.slice(`${target}/`.length), { sha256: file.sha256, mode: file.mode }]));
        const authorization = {
          artifact_id: approval.artifact_id,
          kind: approval.kind,
          target_identity: approval.target_identity,
          template_version: approval.template_version,
          preview_id: approval.preview_id,
          approval_digest: approval.approval_digest,
          changes: approval.changes,
          files: approval.files,
          directories: approval.directories,
          preimage: approval.preimage,
          mode: approval.mode,
          transaction_phase: approval.transaction_phase,
          recovery_disposition: approval.recovery_disposition,
        };
        const recovery = {
          version: 1,
          directory: true,
          target_identity: target,
          target: output,
          stage: join(dirname(output), `.hermes-agent-maker-stage-${token}-fixture`),
          backup: `${output}.hermes-backup`,
          expected,
          previous: {},
          authorization,
        };
        writeFileSync(journal, JSON.stringify(recovery));
        const recovered = run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture);
        expect(recovered.stderr).toBe("");
        expect(recovered.exitCode).toBe(0);
        expect(JSON.parse(recovered.stdout)).toMatchObject({ receipt_kind: "apply", mode: "apply", transaction_phase: "committed", recovery_disposition: "completed" });
        expect(existsSync(journal)).toBe(false);
        writeFileSync(journal, JSON.stringify(recovery));
        const changedSpec = { ...spec, content: "Create a different reviewed skill." };
        writeFileSync(specPath, JSON.stringify(changedSpec));
        expect(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture).stderr).toContain("E_APPROVAL_MISMATCH");
        expect(existsSync(journal)).toBe(true);
        writeFileSync(specPath, JSON.stringify(spec));
        writeFileSync(journal, JSON.stringify({ ...recovery, expected: { ...expected, "SKILL.md": { sha256: "0".repeat(64), mode: 420 } } }));
        expect(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture).stderr).toContain("E_JOURNAL_AUTHORIZATION");
        rmSync(journal);
        const updateSpec = { ...spec, content: "Create an updated reviewed skill.", mode: "preview" };
        delete updateSpec.approved_change_set;
        writeFileSync(specPath, JSON.stringify(updateSpec));
        const updateApproval = JSON.parse(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture).stdout);
        const updateStage = join(dirname(output), `.hermes-agent-maker-stage-${token}-rollback`);
        mkdirSync(updateStage);
        for (const file of updateApproval.files) {
          const relativePath = file.path.slice(`${target}/`.length);
          const stagedPath = join(updateStage, relativePath);
          mkdirSync(dirname(stagedPath), { recursive: true });
          writeFileSync(stagedPath, Buffer.from(file.content_bytes, "base64"));
          chmodSync(stagedPath, file.mode);
        }
        const updateExpected = Object.fromEntries(updateApproval.files.map((file) => [file.path.slice(`${target}/`.length), { sha256: file.sha256, mode: file.mode }]));
        const updatePrevious = Object.fromEntries(updateApproval.changes
          .filter((change) => change.old_sha256 !== null)
          .map((change) => [change.path.slice(`${target}/`.length), { sha256: change.old_sha256, mode: change.old_mode }]));
        const updateAuthorization = Object.fromEntries([
          "artifact_id", "kind", "target_identity", "template_version", "preview_id", "approval_digest", "changes", "files", "directories", "preimage", "mode", "transaction_phase", "recovery_disposition",
        ].map((key) => [key, updateApproval[key]]));
        writeFileSync(journal, JSON.stringify({
          version: 1, directory: true, target_identity: target, target: output, stage: updateStage,
          backup: `${output}.hermes-backup`, expected: updateExpected, previous: updatePrevious, authorization: updateAuthorization,
        }));
        updateSpec.mode = "apply";
        updateSpec.approved_change_set = updateApproval;
        writeFileSync(specPath, JSON.stringify(updateSpec));
        const rolledBack = run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture);
        expect(rolledBack.exitCode).toBe(0);
        expect(JSON.parse(rolledBack.stdout)).toMatchObject({ receipt_kind: "apply", transaction_phase: "committed", recovery_disposition: "rolled-back" });
      }
      const stale = { ...approval, preview_id: "0".repeat(64) };
      writeFileSync(join(fixture, "stale.json"), JSON.stringify(stale));
      expect(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture, "--approval", join(fixture, "stale.json")], fixture).stderr).toContain("E_APPROVAL_MISMATCH");
      if (["skill", "native-plugin", "portable-plugin"].includes(kind)) {
        const marker = join(output, ".hermes-agent-maker", "ownership.json");
        writeFileSync(marker, `${readFileSync(marker, "utf8")} `);
        expect(run([process.execPath, hermesGeneratePath, "--manifest", specPath, "--workspace", fixture], fixture).stderr).toContain("E_MARKER");
      }
    }
    const special = join(fixture, "special");
    mkdirSync(special);
    symlinkSync(join(fixture, "missing"), join(special, "leaf"));
    const unsafe = { kind: "skill", intent: "artifact:generator", content: "Create a safe fixture.", target: "special/leaf", name: "fixture-agent", mode: "preview", template_version: "1.0.0" };
    writeFileSync(join(fixture, "unsafe.json"), JSON.stringify(unsafe));
    expect(run([process.execPath, hermesGeneratePath, "--manifest", join(fixture, "unsafe.json"), "--workspace", fixture], fixture).stderr).toContain("E_SPECIAL_FILE");
    for (const invalid of [
      { kind: "soul", intent: "artifact:generator", content: "Create safe identity guidance.", target: ".env", mode: "preview", template_version: "1.0.0" },
      { kind: "agents", intent: "artifact:generator", content: "Create safe project guidance.", target: 42, mode: "preview", template_version: "1.0.0" },
      { kind: "skill", intent: "artifact:generator", content: "Write .env settings.", target: "forbidden-env-skill", name: "forbidden-env-skill", mode: "preview", template_version: "1.0.0" },
    ]) {
      const path = join(fixture, `invalid-${String(invalid.kind)}.json`);
      writeFileSync(path, JSON.stringify(invalid));
      expect(run([process.execPath, hermesGeneratePath, "--manifest", path, "--workspace", fixture], fixture).exitCode).toBe(1);
    }
    writeFileSync(join(fixture, "SOUL.md"), "private mode\n", { mode: 0o600 });
    chmodSync(join(fixture, "SOUL.md"), 0o600);
    const unsupportedMode = { kind: "soul", intent: "artifact:generator", content: "Create safe identity guidance.", target: "SOUL.md", mode: "preview", template_version: "1.0.0" };
    const unsupportedModePath = join(fixture, "unsupported-mode.json");
    writeFileSync(unsupportedModePath, JSON.stringify(unsupportedMode));
    expect(run([process.execPath, hermesGeneratePath, "--manifest", unsupportedModePath, "--workspace", fixture], fixture).stderr).toContain("E_PREIMAGE_MODE");
    rmSync(join(fixture, "SOUL.md"));
    const staleTarget = "stale-lock-skill";
    const staleSpec = { kind: "skill", intent: "artifact:generator", content: "Create stale lock recovery fixture.", target: staleTarget, name: staleTarget, mode: "preview", template_version: "1.0.0" };
    const staleSpecPath = join(fixture, "stale-lock.json");
    writeFileSync(staleSpecPath, JSON.stringify(staleSpec));
    const stalePreview = JSON.parse(run([process.execPath, hermesGeneratePath, "--manifest", staleSpecPath, "--workspace", fixture], fixture).stdout);
    staleSpec.mode = "apply";
    staleSpec.approved_change_set = stalePreview;
    writeFileSync(staleSpecPath, JSON.stringify(staleSpec));
    const lockToken = createHash("sha256").update(staleTarget).digest("hex").slice(0, 16);
    const staleLock = join(realpathSync(fixture), `.hermes-agent-maker-lock-${lockToken}`);
    mkdirSync(staleLock);
    writeFileSync(join(staleLock, "owner.json"), JSON.stringify({ pid: 2147483647, created_at: "2000-01-01T00:00:00.000Z" }));
    expect(run([process.execPath, hermesGeneratePath, "--manifest", staleSpecPath, "--workspace", fixture], fixture).exitCode).toBe(0);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}, 30_000);

test("portable oracle distinguishes normative validity from Hermes boundaries", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-hermes-portable-"));
  const invoke = () => run([process.execPath, hermesPortableValidatorPath, "--root", fixture], fixture);
  const writePortable = (mcp) => {
    mkdirSync(join(fixture, "skills", "fixture"), { recursive: true });
    writeFileSync(join(fixture, "skills", "fixture", "SKILL.md"), "---\nname: fixture\ndescription: Fixture portable skill.\n---\n\n# Fixture\n");
    writeFileSync(join(fixture, "plugin.json"), JSON.stringify({
      $schema: "https://agentplugins.dev/schemas/v1.0.0/plugin.schema.json", name: "fixture-plugin", version: "1.0.0",
      description: "Fixture", components: { skills: ["skills/fixture"], ...(mcp ? { mcp: ["mcp/fixture.json"] } : {}) },
    }));
    if (mcp) {
      mkdirSync(join(fixture, "mcp"), { recursive: true });
      writeFileSync(join(fixture, "mcp", "fixture.json"), JSON.stringify({ version: "1.0.0", ...mcp }));
    }
  };
  try {
    writePortable(null);
    expect(invoke().exitCode).toBe(0);
    writePortable({ $schema: "https://agentplugins.dev/schemas/v1.0.0/mcp.schema.json", servers: { loopback: { transport: "streamable-http", url: "http://127.0.0.1:3000" } } });
    expect(invoke().exitCode).toBe(0);
    for (const server of [
      { transport: "sse", url: "http://127.0.0.1:3000" },
      { transport: "http", url: "http://example.com" },
      { transport: "streamable-http", url: "http://user:pass@127.0.0.1:3000" },
    ]) {
      writePortable({ $schema: "https://agentplugins.dev/schemas/v1.0.0/mcp.schema.json", servers: { boundary: server } });
      expect(invoke().exitCode).toBe(1);
    }
    rmSync(join(fixture, "skills", "fixture", "SKILL.md"));
    expect(invoke().stderr).toContain("E_REFERENCE");
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test("detector-absent correction restores legacy bytes and reapplies the exact final filesystem state", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const contracts = JSON.parse(readFileSync(contractsPath, "utf8"));
  const correction = contracts.detectorAbsentCorrection;
  expect(correction.absenceEvidence).toContain("exact 30-entrypoint inventory");
  expect(correction.legacyFiles).toEqual(manifest.versionUpdateDetectorAbsentCorrection.legacyFiles);

  const fixture = mkdtempSync(join(tmpdir(), "hypercore-detector-absent-"));
  const restore = (path, content, mode) => {
    const target = join(fixture, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
    chmodSync(target, Number.parseInt(mode, 8) & 0o777);
    return target;
  };
  try {
    for (const baseline of correction.legacyFiles) {
      const restored = run(["git", "show", `${legacyPreimageBase}:${baseline.legacyPath}`], root);
      expect(restored.exitCode).toBe(0);
      const target = restore(baseline.legacyPath, restored.stdout, baseline.gitMode);
      expect(createHash("sha256").update(readFileSync(target)).digest("hex")).toBe(baseline.sha256);
      expect((statSync(target).mode & 0o777).toString(8)).toBe("755");
    }
    for (const baseline of correction.pairedDirectShDocuments) {
      const restored = run(["git", "show", `${legacyPreimageBase}:${baseline.path}`], root);
      expect(restored.exitCode).toBe(0);
      const target = restore(baseline.path, restored.stdout, baseline.gitMode);
      expect(createHash("sha256").update(readFileSync(target)).digest("hex")).toBe(baseline.sha256);
      expect((statSync(target).mode & 0o777).toString(8)).toBe("644");
      for (const command of baseline.commands) expect(readFileSync(target, "utf8")).toContain(command);
    }

    const caller = correction.callerRestoration;
    const restoredCaller = join(fixture, caller.legacyCaller);
    expect(createHash("sha256").update(readFileSync(restoredCaller)).digest("hex")).toBe(caller.legacyCallerSha256);
    expect(readFileSync(restoredCaller, "utf8")).toContain("version-find.sh");

    for (const baseline of correction.legacyFiles) {
      const final = join(root, baseline.finalPath);
      const target = restore(baseline.finalPath, readFileSync(final), `0${(statSync(final).mode & 0o777).toString(8)}`);
      expect(readFileSync(target)).toEqual(readFileSync(final));
      expect((statSync(target).mode & 0o777)).toBe(statSync(final).mode & 0o777);
      rmSync(join(fixture, baseline.legacyPath));
    }
    for (const baseline of correction.pairedDirectShDocuments) {
      const final = join(root, baseline.path);
      const target = restore(baseline.path, readFileSync(final), `0${(statSync(final).mode & 0o777).toString(8)}`);
      expect(readFileSync(target)).toEqual(readFileSync(final));
      for (const command of manifest.versionUpdateDetectorAbsentCorrection.documents.finalCommands) {
        expect(readFileSync(target, "utf8")).toContain(command);
      }
    }
    expect(existsSync(join(fixture, caller.legacyCaller))).toBe(false);
    expect(readFileSync(join(fixture, caller.finalCaller), "utf8")).toContain("version-find.mjs");
    expect(correction.restoreReapplyFixture.restoreOrder).toEqual(manifest.versionUpdateDetectorAbsentCorrection.restoreOrder);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("validator accepts the approved inventory", () => {
  const result = run([process.execPath, validatorPath], root);
  expect(result.stderr).toBe("");
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Validated 32 Bun MJS skill scripts (20 former-sh, 1 former-py, 9 retained-mjs, 2 authored-mjs baseline-absence).");
});
test("validator rejects AST-visible static policy and declaration mutations", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-validator-mutation-"));
  const scriptDirectory = join(fixture, "scripts");
  const target = join(fixture, "skills/version-update/scripts/version-current.mjs");
  try {
    mkdirSync(scriptDirectory, { recursive: true });
    copyFileSync(validatorPath, join(scriptDirectory, "validate-skills.mjs"));
    cpSync(join(root, "scripts/fixtures"), join(scriptDirectory, "fixtures"), { recursive: true });
    cpSync(join(root, "skills"), join(fixture, "skills"), { recursive: true });
    symlinkSync(join(root, "scripts/node_modules"), join(scriptDirectory, "node_modules"));
    const original = readFileSync(target, "utf8");
    const mutations = [
      ["nested Object type", "/** @type {Array<Object<string, string>>} */\nconst objectValue = [];"],
      ["nested object type", "/** @type {Promise<object[]>} */\nconst objectValue = Promise.resolve([]);"],
      ["nested any type", "/** @type {Map<string, Array<any>>} */\nconst anyValue = new Map();"],
      ["ts-ignore", "// @ts-ignore\nconst ignored = 1;"],
      ["ts-expect-error", "// @ts-expect-error\nconst expectedError = 1;"],
      ["ts-nocheck", "// @ts-nocheck\nconst unchecked = 1;"],
      ["eslint-disable", "// eslint-disable-next-line no-console\nconsole.log('suppressed');"],
      ["non-node import", "import 'typescript';"],
      ["dynamic non-node import", "await import('typescript');"],
      ["require non-node import", "require('typescript');"],
      ["function declaration", "function main(value) { return value; }"],
      ["arrow declaration", "const parseMutation = (value) => value;"],
      ["method declaration", "class MutationCommand { main(value) { return value; } }"],
      ["missing spawn field", "Bun.spawn({ cmd: ['true'], cwd: '.', env: process.env, stdout: 'pipe' });"],
      ["extra spawn field", "Bun.spawn({ cmd: ['true'], cwd: '.', env: process.env, stdout: 'pipe', stderr: 'pipe', shell: false });"],
      ["spread spawn field", "Bun.spawn({ ...{ cmd: ['true'] }, cwd: '.', env: process.env, stdout: 'pipe', stderr: 'pipe' });"],
    ];
    for (const [name, mutation] of mutations) {
      writeFileSync(target, `${original}\n${mutation}\n`);
      const result = run([process.execPath, join(scriptDirectory, "validate-skills.mjs")], fixture);
      expect(result.exitCode, name).not.toBe(0);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);

test("version-current reads an isolated package fixture without changing it", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-version-current-"));
  const packagePath = join(fixture, "package.json");
  const source = '{"name":"fixture","version":"1.2.3"}\n';
  writeFileSync(packagePath, source);
  try {
    const result = run([process.execPath, currentVersionPath, packagePath], fixture);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(`${packagePath}|1.2.3`);
    expect(readFileSync(packagePath, "utf8")).toBe(source);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
test("version scripts reject leading-zero semver and preserve paths with spaces", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore version fixture-"));
  const packagePath = join(fixture, "package.json");
  writeFileSync(packagePath, '{"name":"fixture","version":"1.2.3"}\n');
  try {
    const rejected = run([process.execPath, versionApplyPath, "01.2.3", packagePath], fixture);
    expect(rejected.exitCode).toBe(1);
    const applied = run([process.execPath, versionApplyPath, "2.0.0", packagePath], fixture);
    expect(applied.exitCode).toBe(0);
    expect(readFileSync(packagePath, "utf8")).toContain('"version":"2.0.0"');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
test("version-apply restores replaced files when a later temporary write fails", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-version-rollback-"));
  const firstDirectory = join(fixture, "first");
  const secondDirectory = join(fixture, "second");
  const first = join(firstDirectory, "package.json");
  const second = join(secondDirectory, "package.json");
  const firstSource = `{"name":"first","version":"1.2.3","padding":"${"x".repeat(16 * 1024 * 1024)}"}\n`;
  const secondSource = '{"name":"second","version":"1.2.3"}\n';
  mkdirSync(firstDirectory);
  mkdirSync(secondDirectory);
  writeFileSync(first, firstSource, { mode: 0o640 });
  writeFileSync(second, secondSource, { mode: 0o600 });
  try {
    const child = Bun.spawn({
      cmd: [process.execPath, versionApplyPath, "2.0.0", first, second],
      cwd: fixture,
      stdout: "pipe",
      stderr: "pipe",
    });
    const temporary = `${second}.version-apply-${child.pid}-1.tmp`;
    writeFileSync(temporary, "collision\n", { flag: "wx" });

    const exitCode = await child.exited;
    const stderr = await new Response(child.stderr).text();
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Version update failed; restored replaced files.");
    expect(readFileSync(first, "utf8")).toBe(firstSource);
    expect(statSync(first).mode & 0o7777).toBe(0o640);
    expect(readFileSync(second, "utf8")).toBe(secondSource);
    expect(statSync(second).mode & 0o7777).toBe(0o600);
    expect(existsSync(temporary)).toBe(false);
    expect(readdirSync(fixture).sort()).toEqual(["first", "second"]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});


test("dashboard validation leaves no partial output for malformed results", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-dashboard-"));
  writeFileSync(join(fixture, "results.json"), "{\"status\":\"complete\"}\n");
  try {
    const result = run([process.execPath, dashboardPath, fixture], fixture);
    expect(result.exitCode).toBe(1);
    expect(readdirSync(fixture).sort()).toEqual(["results.json"]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("dashboard produces both artifacts from a valid isolated result", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-dashboard-"));
  writeFileSync(join(fixture, "results.json"), JSON.stringify({ status: "running", codebase_name: "fixture", current_experiment: 0, baseline_score: 1, best_score: 1, experiments: [] }));
  try {
    const result = run([process.execPath, dashboardPath, fixture], fixture);
    expect(result.exitCode).toBe(0);
    expect(readdirSync(fixture).sort()).toEqual(["dashboard.html", "results.js", "results.json"]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
for (const renderer of [
  {
    name: "autoresearch-code",
    scriptPath: dashboardPath,
    templatePath: join(root, "skills/autoresearch-code/assets/dashboard-template.html"),
    results: { status: "running", codebase_name: "fixture", current_experiment: 0, baseline_score: 1, best_score: 1, experiments: [] },
  },
  {
    name: "autoresearch-skill",
    scriptPath: join(root, "skills/autoresearch-skill/scripts/render-dashboard.mjs"),
    templatePath: join(root, "skills/autoresearch-skill/assets/dashboard-template.html"),
    results: { skill_name: "fixture", status: "running", current_experiment: 0, baseline_score: 1, best_score: 1, metric_direction: "higher_is_better", last_statuses: [], best_experiment: 0, experiments: [] },
  },
  {
    name: "seo-maker",
    scriptPath: join(root, "skills/seo-maker/scripts/render-dashboard.mjs"),
    templatePath: join(root, "skills/seo-maker/assets/dashboard-template.html"),
    results: { project_name: "fixture", status: "running", keywords: [] },
  },
]) {
  for (const failure of ["second-write", "second-rename"]) {
    test(`${renderer.name} preserves both prior outputs when its ${failure} fails`, () => {
      const fixture = mkdtempSync(join(tmpdir(), `hypercore-${renderer.name}-dashboard-atomic-`));
      const scriptDirectory = join(fixture, "scripts");
      const assetsDirectory = join(fixture, "assets");
      mkdirSync(scriptDirectory);
      mkdirSync(assetsDirectory);
      copyFileSync(renderer.templatePath, join(assetsDirectory, "dashboard-template.html"));
      writeFileSync(join(fixture, "results.json"), JSON.stringify(renderer.results));
      writeFileSync(join(fixture, "dashboard.html"), "prior dashboard\n", { mode: 0o640 });
      writeFileSync(join(fixture, "results.js"), "prior results\n", { mode: 0o600 });
      try {
        const source = readFileSync(renderer.scriptPath, "utf8");
        const failingSource = failure === "second-write"
          ? source.replace("writeSyncedTemp(resultsTempPath, resultsJs, resultsSnapshot?.mode);", 'throw new Error("forced second write");')
          : source.replace("renameSync,", "renameSync as nativeRenameSync,").replace('import { randomUUID } from "node:crypto";', `import { randomUUID } from "node:crypto";
let renameCalls = 0;
function renameSync(from, to) {
  renameCalls += 1;
  if (renameCalls === 2) throw new Error("forced second rename");
  return nativeRenameSync(from, to);
}`);
        expect(failingSource).not.toBe(source);
        const failingScript = join(scriptDirectory, `${failure}.mjs`);
        writeFileSync(failingScript, failingSource);
        expect(run([process.execPath, failingScript, fixture], fixture).exitCode).toBe(1);
        expect(readFileSync(join(fixture, "dashboard.html"), "utf8")).toBe("prior dashboard\n");
        expect(readFileSync(join(fixture, "results.js"), "utf8")).toBe("prior results\n");
        expect(statSync(join(fixture, "dashboard.html")).mode & 0o7777).toBe(0o640);
        expect(statSync(join(fixture, "results.js")).mode & 0o7777).toBe(0o600);
        expect(readdirSync(fixture).filter((entry) => entry.endsWith(".tmp"))).toEqual([]);
      } finally {
        rmSync(fixture, { recursive: true, force: true });
      }
    });
  }
}

test("version Git helpers reject unrelated staged files without staging requested files", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-git-"));
  try {
    initializeGit(fixture);
    writeFileSync(join(fixture, "a.txt"), "initial\n");
    writeFileSync(join(fixture, "b.txt"), "initial\n");
    expect(run(["git", "add", "a.txt", "b.txt"], fixture).exitCode).toBe(0);
    expect(run(["git", "commit", "-qm", "initial"], fixture).exitCode).toBe(0);
    writeFileSync(join(fixture, "a.txt"), "changed\n");
    writeFileSync(join(fixture, "b.txt"), "changed\n");
    expect(run(["git", "add", "b.txt"], fixture).exitCode).toBe(0);

    const result = run([process.execPath, versionGitCommitPath, "test: scoped", "a.txt"], fixture);
    expect(result.exitCode).toBe(1);
    expect(run(["git", "diff", "--cached", "--name-only"], fixture).stdout.trim()).toBe("b.txt");
    expect(run(["git", "log", "-1", "--format=%s"], fixture).stdout.trim()).toBe("initial");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("version git-commit treats --all as a literal path and cannot stage unrelated files", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-git-option-"));
  try {
    initializeGit(fixture);
    writeFileSync(join(fixture, "requested.txt"), "initial\n");
    writeFileSync(join(fixture, "unrelated.txt"), "initial\n");
    expect(run(["git", "add", "."], fixture).exitCode).toBe(0);
    expect(run(["git", "commit", "-qm", "initial"], fixture).exitCode).toBe(0);
    writeFileSync(join(fixture, "requested.txt"), "changed\n");
    writeFileSync(join(fixture, "unrelated.txt"), "changed\n");

    const result = run([process.execPath, versionGitCommitPath, "test: injection", "--all"], fixture);

    expect(result.exitCode).toBe(1);
    expect(run(["git", "diff", "--cached", "--name-only"], fixture).stdout.trim()).toBe("");
    expect(run(["git", "log", "-1", "--format=%s"], fixture).stdout.trim()).toBe("initial");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("version git-commit stops at Git inspection failures and non-repository boundaries", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-git-boundary-"));
  const marker = join(fixture, "marker.txt");
  writeFileSync(marker, "unchanged\n");
  try {
    const nonRepository = run([process.execPath, versionGitCommitPath, "test: boundary", marker], fixture, { ...process.env, LC_ALL: "C", LANG: "C" });
    expect(nonRepository.exitCode).toBe(1);
    expect(nonRepository.stderr).toContain("Not a git repository");
    expect(readFileSync(marker, "utf8")).toBe("unchanged\n");

    const env = writeFakeGit(fixture, "#!/bin/sh\nprintf '%s\\n' \"$*\" >> git-calls.log\nprintf '%s\\n' 'fake rev-parse failure' >&2\nexit 97\n");
    const failedInspection = run([process.execPath, versionGitCommitPath, "test: inspection", marker], fixture, env);
    expect(failedInspection.exitCode).toBe(97);
    expect(failedInspection.stderr).toContain("fake rev-parse failure");
    expect(readFileSync(join(fixture, "git-calls.log"), "utf8").trim()).toBe("rev-parse --git-dir");
    expect(readFileSync(marker, "utf8")).toBe("unchanged\n");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("version-current forwards SIGTERM and SIGINT and reaps its ready discovery child", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-version-current-signal-"));
  const currentFixture = join(fixture, "version-current.mjs");
  const finderFixture = join(fixture, "version-find.mjs");
  copyFileSync(currentVersionPath, currentFixture);
  writeFileSync(finderFixture, `#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
const signalFile = process.env.SIGNAL_FILE;
const readyFile = process.env.READY_FILE;
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    writeFileSync(signalFile, signal);
    process.exit(signal === "SIGTERM" ? 143 : 130);
  });
}
writeFileSync(readyFile, String(process.pid));
const startedAt = Date.now();
while (process.ppid > 1 && Date.now() - startedAt < 90_000) await Bun.sleep(25);
process.exit(99);
`);
  chmodSync(finderFixture, 0o755);
  /** @type {(() => void) | null} */
  let reapChildren = null;
  try {
    for (const [signal, exitCode] of /** @type {const} */ ([["SIGTERM", 143], ["SIGINT", 130]])) {
      const readyFile = join(fixture, `ready-${signal}`);
      const signalFile = join(fixture, `signal-${signal}`);
      const child = Bun.spawn({
        cmd: [process.execPath, currentFixture],
        cwd: fixture,
        env: { ...process.env, READY_FILE: readyFile, SIGNAL_FILE: signalFile },
        stdout: "pipe",
        stderr: "pipe",
      });
      reapChildren = () => {
        try { child.kill("SIGKILL"); } catch {}
        killRecordedPid(readyFile);
      };
      for (let attempt = 0; attempt < 200 && !existsSync(readyFile); attempt++) await Bun.sleep(10);
      expect(existsSync(readyFile)).toBe(true);
      const discoveryPid = Number(readFileSync(readyFile, "utf8"));
      child.kill(signal);
      expect(await child.exited).toBe(exitCode);
      expect(readFileSync(signalFile, "utf8")).toBe(signal);
      let discoveryAlive = true;
      try { process.kill(discoveryPid, 0); } catch { discoveryAlive = false; }
      expect(discoveryAlive).toBe(false);
    }
  } finally {
    reapChildren?.();
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("version git-push rejects unknown arguments before touching a remote", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-push-"));
  try {
    expect(run(["git", "init", "-q"], fixture).exitCode).toBe(0);
    const result = run([process.execPath, versionGitPushPath, "--unknown"], fixture);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Usage:");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
test("version git-push stops before network push when upstream inspection fails", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-push-upstream-"));
  try {
    const env = writeFakeGit(fixture, `#!/bin/sh
printf '%s\n' "$*" >> git-calls.log
case "$*" in
  "rev-parse --git-dir") printf '%s\n' .git ;;
  "branch --show-current") printf '%s\n' topic ;;
  "for-each-ref --format=%(upstream:short) refs/heads/topic") printf '%s\n' 'fake upstream failure' >&2; exit 97 ;;
  *) printf '%s\n' "unexpected git invocation: $*" >&2; exit 98 ;;
esac
`);
    const result = run([process.execPath, versionGitPushPath], fixture, env);
    expect(result.exitCode).toBe(97);
    expect(result.stderr).toContain("fake upstream failure");
    expect(readFileSync(join(fixture, "git-calls.log"), "utf8").trim().split("\n")).toEqual([
      "rev-parse --git-dir",
      "branch --show-current",
      "for-each-ref --format=%(upstream:short) refs/heads/topic",
    ]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("git-maker commit rejects option-like paths without staging unrelated changes", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-git-maker-commit-"));
  try {
    initializeGit(fixture);
    writeFileSync(join(fixture, "requested.txt"), "initial\n");
    writeFileSync(join(fixture, "unrelated.txt"), "initial\n");
    expect(run(["git", "add", "."], fixture).exitCode).toBe(0);
    expect(run(["git", "commit", "-qm", "initial"], fixture).exitCode).toBe(0);
    writeFileSync(join(fixture, "requested.txt"), "changed\n");
    writeFileSync(join(fixture, "unrelated.txt"), "changed\n");

    const result = run([process.execPath, gitMakerCommitPath, "test: injection", "--all"], fixture);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Usage:");
    expect(run(["git", "diff", "--cached", "--name-only"], fixture).stdout.trim()).toBe("");
    expect(run(["git", "log", "-1", "--format=%s"], fixture).stdout.trim()).toBe("initial");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("git-maker discover and status reject option-like paths before Git inspection", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-git-maker-boundary-"));
  try {
    const env = writeFakeGit(fixture, "#!/bin/sh\nprintf '%s\\n' \"$*\" >> git-calls.log\nexit 99\n");
    for (const script of [repoDiscoverPath, repoStatusPath]) {
      const result = run([process.execPath, script, "--not-a-path"], fixture, env);
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("Usage:");
    }
    expect(existsSync(join(fixture, "git-calls.log"))).toBe(false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
test("pre-deploy drains multi-MiB children and forwards termination without orphaning sequential or parallel work", async () => {
  for (const mode of ["--sequential", "--parallel"]) {
    const fixture = mkdtempSync(join(tmpdir(), "hypercore-predeploy-signal-"));
    const scripts = join(fixture, "scripts");
    mkdirSync(scripts);
    copyFileSync(deployCheckPath, join(scripts, "deploy-check.mjs"));
    writeFileSync(join(scripts, "stack-detect.mjs"), "");
    const childSource = (role) => `import { writeFileSync, writeSync } from "node:fs";
const root = process.env.PROBE_ROOT;
writeFileSync(\`${"${root}"}/${role}.ready\`, String(process.pid));
process.on("SIGTERM", () => { writeFileSync(\`${"${root}"}/${role}.signal\`, "SIGTERM"); process.exit(143); });
writeSync(1, Buffer.alloc(2 * 1024 * 1024, "o"));
writeSync(2, Buffer.alloc(2 * 1024 * 1024, "e"));
writeFileSync(\`${"${root}"}/${role}.emitted\`, "done");
const startedAt = Date.now();
while (process.ppid > 1 && Date.now() - startedAt < 90_000) await new Promise((tick) => setTimeout(tick, 25));
process.exit(99);
`;
    writeFileSync(join(scripts, "lint-check.mjs"), childSource("lint"));
    writeFileSync(join(scripts, "build-run.mjs"), childSource("build"));
    /** @type {(() => void) | null} */
    let reapChildren = null;
    try {
      const child = Bun.spawn({ cmd: [process.execPath, join(scripts, "deploy-check.mjs"), mode], cwd: fixture, env: { ...process.env, PROBE_ROOT: fixture }, stdout: "pipe", stderr: "pipe" });
      reapChildren = () => {
        try { child.kill("SIGKILL"); } catch {}
        for (const role of ["lint", "build"]) killRecordedPid(join(fixture, `${role}.ready`));
      };
      const output = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]).then(([stdout, stderr]) => `${stdout}${stderr}`);
      for (let attempt = 0; attempt < 1000 && !existsSync(join(fixture, "lint.ready")); attempt++) await Bun.sleep(10);
      if (!existsSync(join(fixture, "lint.ready"))) {
        child.kill("SIGTERM");
        throw new Error(await output);
      }
      for (let attempt = 0; attempt < 1000 && !existsSync(join(fixture, "lint.emitted")); attempt++) await Bun.sleep(10);
      expect(existsSync(join(fixture, "lint.emitted"))).toBe(true);
      if (mode === "--parallel") {
        for (let attempt = 0; attempt < 1000 && !existsSync(join(fixture, "build.emitted")); attempt++) await Bun.sleep(10);
        expect(existsSync(join(fixture, "build.emitted"))).toBe(true);
        expect(existsSync(join(fixture, "build.ready"))).toBe(true);
      } else {
        expect(existsSync(join(fixture, "build.ready"))).toBe(false);
      }
      child.kill("SIGTERM");
      expect(await child.exited).toBe(143);
      expect((await output).length).toBeGreaterThanOrEqual(512 * 1024);
      expect(readFileSync(join(fixture, "lint.signal"), "utf8")).toBe("SIGTERM");
      if (mode === "--parallel") expect(readFileSync(join(fixture, "build.signal"), "utf8")).toBe("SIGTERM");
      else expect(existsSync(join(fixture, "build.signal"))).toBe(false);
    } finally {
      reapChildren?.();
      rmSync(fixture, { recursive: true, force: true });
    }
  }
}, 30_000);

test("git-maker-fast drains concurrent fake Git children, stops queued work, and reaps children on failures and signals", async () => {
  for (const [mode, signal, expectedExit] of /** @type {const} */ ([["failure", null, 1], ["signal", "SIGTERM", 143], ["signal", "SIGINT", 130]])) {
    const fixture = mkdtempSync(join(tmpdir(), `hypercore-git-maker-fast-${mode}-`));
    const repositories = ["repo-a", "repo-b", "repo-c"];
    for (const repository of repositories) mkdirSync(join(fixture, repository, ".git"), { recursive: true });
    const fakeGit = `#!${process.execPath}
import { existsSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const root = process.env.PROBE_ROOT;
const repository = basename(process.cwd());
const args = process.argv.slice(2);
const probe = (suffix) => join(root, \`\${repository}.\${suffix}\`);
const emit = async () => {
  const payload = "x".repeat(2 * 1024 * 1024);
  await Promise.all([
    new Promise((done) => process.stdout.write(payload, done)),
    new Promise((done) => process.stderr.write(payload, done)),
  ]);
  writeFileSync(probe("emitted"), "done");
};
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    writeFileSync(probe("signal"), signal);
    process.exit(signal === "SIGTERM" ? 143 : 130);
  });
}
if (args.join(" ") === "rev-parse --show-toplevel") {
  if (existsSync(join(process.cwd(), ".git"))) process.stdout.write(process.cwd() + "\\n");
  else { process.stderr.write("not a git repository\\n"); process.exitCode = 128; }
} else if (args.join(" ") === "rev-parse --is-inside-work-tree") {
  writeFileSync(probe("ready"), String(process.pid));
  await emit();
  if (process.env.MODE === "failure" && repository === "repo-a") {
    for (let attempt = 0; attempt < 1_000 && !existsSync(join(root, "repo-b.ready")); attempt++) await Bun.sleep(10);
    process.stderr.write("intentional worker failure\\n");
    process.exitCode = 97;
  } else {
    const startedAt = Date.now();
    while (process.ppid > 1 && Date.now() - startedAt < 90_000) await Bun.sleep(25);
    process.exit(99);
  }
} else {
  process.stderr.write(\`unexpected git invocation: \${args.join(" ")}\\n\`);
  process.exitCode = 98;
}
`;
    /** @type {(() => void) | null} */
    let reapChildren = null;
    try {
      const env = { ...writeFakeGit(fixture, fakeGit), PROBE_ROOT: fixture, MODE: mode };
      const child = Bun.spawn({
        cmd: [process.execPath, gitMakerFastPath, "inspect", fixture, "--jobs", "2"],
        cwd: fixture,
        env,
        stdout: "pipe",
        stderr: "pipe",
      });
      reapChildren = () => {
        try { child.kill("SIGKILL"); } catch {}
        for (const repository of repositories) killRecordedPid(join(fixture, `${repository}.ready`));
      };
      const output = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
      for (let attempt = 0; attempt < 1_000 && (!existsSync(join(fixture, "repo-a.ready")) || !existsSync(join(fixture, "repo-b.ready"))); attempt++) await Bun.sleep(10);
      expect(existsSync(join(fixture, "repo-a.ready"))).toBe(true);
      expect(existsSync(join(fixture, "repo-b.ready"))).toBe(true);
      expect(existsSync(join(fixture, "repo-c.ready"))).toBe(false);
      for (let attempt = 0; attempt < 1_000 && !existsSync(join(fixture, "repo-a.emitted")); attempt++) await Bun.sleep(10);
      expect(existsSync(join(fixture, "repo-a.emitted"))).toBe(true);
      if (signal) {
        for (let attempt = 0; attempt < 1_000 && !existsSync(join(fixture, "repo-b.emitted")); attempt++) await Bun.sleep(10);
        expect(existsSync(join(fixture, "repo-b.emitted"))).toBe(true);
      }

      if (signal) child.kill(signal);
      expect(await child.exited).toBe(expectedExit);
      const [, stderr] = await output;
      if (!signal) expect(stderr.length).toBeGreaterThanOrEqual(2 * 1024 * 1024);
      expect(existsSync(join(fixture, "repo-c.ready"))).toBe(false);

      if (signal) {
        for (const repository of ["repo-a", "repo-b"]) expect(readFileSync(join(fixture, `${repository}.signal`), "utf8")).toBe(signal);
      } else {
        expect(stderr).toContain("intentional worker failure");
        expect(readFileSync(join(fixture, "repo-b.signal"), "utf8")).toBe("SIGTERM");
      }
      for (const repository of ["repo-a", "repo-b"]) {
        const pid = Number(readFileSync(join(fixture, `${repository}.ready`), "utf8"));
        let alive = true;
        try { process.kill(pid, 0); } catch { alive = false; }
        expect(alive).toBe(false);
      }
    } finally {
      reapChildren?.();
      rmSync(fixture, { recursive: true, force: true });
    }
  }
}, 60_000);
test("git-maker-fast inspects a repository whose path contains spaces without remote access", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore git-maker fast-"));
  const repository = join(fixture, "repository with spaces");
  mkdirSync(repository);
  try {
    initializeGit(repository);
    writeFileSync(join(repository, "tracked.txt"), "initial\n");
    expect(run(["git", "add", "tracked.txt"], repository).exitCode).toBe(0);
    expect(run(["git", "commit", "-qm", "initial"], repository).exitCode).toBe(0);

    const result = run([process.execPath, gitMakerFastPath, "inspect", repository, "--jobs=1"], fixture);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("repos|begin");
    expect(result.stdout).toContain("repository with spaces");
    expect(result.stdout).toContain("repo|");
    expect(result.stdout).toContain("status|begin\nstatus|end");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("pre-deploy rejects malformed package metadata", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-predeploy-"));
  writeFileSync(join(fixture, "package.json"), "{broken");
  try {
    const result = run([process.execPath, deployCheckPath, "--sequential"], fixture);
    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toContain("package.json");
    expect(result.stdout).not.toContain("Ready to deploy");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("hermes generator preview approval applies a skill as a complete directory tree", () => {
  const fixture = mkdtempSync(join(tmpdir(), "hypercore-hermes-generator-"));
  const target = "demo-skill";
  const previewManifest = join(fixture, "preview.json");
  try {
    writeFileSync(previewManifest, JSON.stringify({
      kind: "skill", intent: "artifact:skill-package", content: "Create a complete demo skill.", target, name: "demo-skill", mode: "preview", template_version: "1.0.0",
    }));
    const preview = run([process.execPath, hermesGeneratePath, "--manifest", previewManifest, "--workspace", fixture], fixture);
    expect(preview.exitCode).toBe(0);
    expect(existsSync(join(fixture, target))).toBe(false);
    const rendered = JSON.parse(preview.stdout);
    const applyManifest = join(fixture, "apply.json");
    writeFileSync(applyManifest, JSON.stringify({
      kind: "skill", intent: "artifact:skill-package", content: "Create a complete demo skill.", target, name: "demo-skill", mode: "apply", template_version: "1.0.0",
      approved_change_set: rendered,
    }));
    const applied = run([process.execPath, hermesGeneratePath, "--manifest", applyManifest, "--workspace", fixture], fixture);
    expect(applied.exitCode).toBe(0);
    expect(JSON.parse(applied.stdout)).toMatchObject({ receipt_kind: "apply", mode: "apply", transaction_phase: "committed", recovery_disposition: "none" });
    expect(statSync(join(fixture, target)).isDirectory()).toBe(true);
    expect(existsSync(join(fixture, target, "SKILL.md"))).toBe(true);
    expect(existsSync(join(fixture, target, "SKILL.ko.md"))).toBe(true);
    expect(existsSync(join(fixture, target, ".hermes-agent-maker", "ownership.json"))).toBe(true);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
