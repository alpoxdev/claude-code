#!/usr/bin/env node
// @ts-check
/** Proves every hermes-agent-maker example spec previews cleanly against the frozen generator. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const examplesDir = join(root, "skills/hermes-agent-maker/assets/examples");
const generatorPath = join(root, "skills/hermes-agent-maker/scripts/generate.mjs");
const expectedKinds = ["agents", "memory-draft", "native-plugin", "portable-plugin", "skill", "soul", "user-draft"];

/** @param {string[]} args @param {string} cwd */
function run(args, cwd) {
  const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

test("every hermes-agent-maker example spec exists for all seven kinds", () => {
  const files = readdirSync(examplesDir).filter((name) => name.startsWith("spec-") && name.endsWith(".json")).sort();
  assert.deepEqual(files, expectedKinds.map((kind) => `spec-${kind}.json`).sort());
});

test("every hermes-agent-maker example spec previews with exit 0 and a preview receipt", () => {
  const files = readdirSync(examplesDir).filter((name) => name.startsWith("spec-") && name.endsWith(".json")).sort();
  const workspace = mkdtempSync(join(tmpdir(), "hermes-examples-"));
  try {
    for (const file of files) {
      const manifestPath = join(examplesDir, file);
      const spec = JSON.parse(readFileSync(manifestPath, "utf8"));
      assert.equal(spec.mode, "preview", `${file} must use mode: preview for this test`);
      const result = run([generatorPath, "--manifest", manifestPath, "--workspace", workspace], root);
      assert.equal(result.status, 0, `${file} exited ${result.status}: ${result.stderr || result.stdout}`);
      const receipt = JSON.parse(result.stdout);
      assert.equal(receipt.receipt_kind, "preview", `${file} did not return a preview receipt`);
      assert.equal(receipt.kind, spec.kind, `${file} receipt kind mismatch`);
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});
