#!/usr/bin/env bun
// @ts-check

/** Exercise deterministic source checks and the opt-in public upstream lifecycle. */
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "bun:test";

const scripts = fileURLToPath(new URL("..", import.meta.url));
const validator = join(scripts, "validate-vercel-skills.mjs");
const readmeFixture = join(scripts, "fixtures", "vercel-skills-lifecycle", "README.fixture.txt");

/** @param {string} root */
function materializeSource(root) {
  mkdirSync(join(root, "skills", "example"), { recursive: true });
  const frontmatter = "---\nname: example\ndescription: Deterministic lifecycle fixture.\n---\n\n# Example\n";
  writeFileSync(join(root, "skills", "example", "SKILL.md"), frontmatter);
  writeFileSync(join(root, "skills", "example", "SKILL.ko.md"), frontmatter);
  writeFileSync(join(root, "README.md"), readFileSync(readmeFixture, "utf8"));
}

/** @param {string} root */
function isolatedEnvironment(root) {
  const home = join(root, "home");
  const xdg = join(root, "xdg");
  const claude = join(root, "claude");
  const codex = join(root, "codex");
  for (const directory of [home, xdg, claude, codex]) mkdirSync(directory, { recursive: true });
  return {
    ...process.env,
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    XDG_STATE_HOME: xdg,
    CLAUDE_CONFIG_DIR: claude,
    CODEX_HOME: codex,
    CI: "1",
    NO_COLOR: "1",
  };
}

/** @param {string} root */
function validate(root) {
  return Bun.spawnSync({
    cmd: [process.execPath, validator, "--root", root],
    cwd: root,
    env: isolatedEnvironment(root),
    stdout: "pipe",
    stderr: "pipe",
  });
}

/** @param {ReturnType<typeof validate>} result */
function output(result) {
  return new TextDecoder().decode(result.stdout) + new TextDecoder().decode(result.stderr);
}

/** @param {string} root @param {string[]} arguments_ */
function runSkills(root, arguments_) {
  return Bun.spawnSync({
    cmd: ["npx", "--yes", "skills", ...arguments_],
    cwd: root,
    env: isolatedEnvironment(root),
    stdout: "pipe",
    stderr: "pipe",
  });
}

test("accepts a deterministic source without reading isolated agent homes", () => {
  const root = mkdtempSync(join(tmpdir(), "vercel-skills-lifecycle-"));
  try {
    materializeSource(root);
    const result = validate(root);
    expect(result.exitCode).toBe(0);
    expect(output(result)).toContain("vercel skills lifecycle validation passed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("classifies frontmatter, bilingual, adapter, and README contract failures", () => {
  const cases = [
    ["frontmatter", (root) => writeFileSync(join(root, "skills", "example", "SKILL.md"), "# Missing frontmatter\n"), "skills/example/SKILL.md must start with YAML frontmatter"],
    ["bilingual", (root) => rmSync(join(root, "skills", "example", "SKILL.ko.md")), "skills/example/SKILL.ko.md must be a file"],
    ["adapter", (root) => mkdirSync(join(root, ".claude-plugin")), ".claude-plugin must not remain"],
    ["readme", (root) => writeFileSync(join(root, "README.md"), "npx skills\n"), "README.md must document npx skills add"],
  ];
  for (const [name, change, expected] of cases) {
    const root = mkdtempSync(join(tmpdir(), `vercel-skills-${name}-`));
    try {
      materializeSource(root);
      change(root);
      const result = validate(root);
      expect(result.exitCode).toBe(1);
      expect(output(result)).toContain(`vercel skills lifecycle validation failed: ${expected}`);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test.skipIf(process.env.HYPERCORE_ENABLE_VERCEL_SKILLS_LIVE_GATE !== "1")(
  "runs the public remote lifecycle in isolated project and global scopes",
  () => {
    const root = mkdtempSync(join(tmpdir(), "vercel-skills-live-"));
    try {
      const useRoot = join(root, "use-only");
      mkdirSync(useRoot);
      const use = runSkills(useRoot, ["use", "alpoxdev/hypercore", "--skill", "git-maker"]);
      expect(use.exitCode).toBe(0);
      expect(output(use)).toContain("git-maker");
      expect(existsSync(join(useRoot, "skills-lock.json"))).toBe(false);
      expect(existsSync(join(useRoot, ".agents"))).toBe(false);
      expect(existsSync(join(useRoot, ".claude"))).toBe(false);

      const projectAdd = runSkills(root, ["add", "alpoxdev/hypercore", "--skill", "git-maker", "-a", "codex", "-y"]);
      expect(projectAdd.exitCode).toBe(0);

      const projectLockPath = join(root, "skills-lock.json");
      const projectLock = JSON.parse(readFileSync(projectLockPath, "utf8"));
      expect(projectLock.version).toBe(1);
      expect(projectLock.skills["git-maker"].source).toBe("alpoxdev/hypercore");
      expect(projectLock.skills["git-maker"].computedHash).toBeTruthy();

      const projectUpdate = runSkills(root, ["update", "git-maker", "-y"]);
      expect(projectUpdate.exitCode).toBe(0);
      const projectLockAfterUpdate = JSON.parse(readFileSync(projectLockPath, "utf8"));
      expect(projectLockAfterUpdate.skills["git-maker"].source).toBe(projectLock.skills["git-maker"].source);
      expect(projectLockAfterUpdate.skills["git-maker"].computedHash).toBe(projectLock.skills["git-maker"].computedHash);

      const projectList = runSkills(root, ["list", "--json"]);
      expect(projectList.exitCode).toBe(0);
      const installed = JSON.parse(new TextDecoder().decode(projectList.stdout));
      expect(installed).toHaveLength(1);
      expect(installed[0].source).toBe("alpoxdev/hypercore");
      expect(installed[0].path).toContain("/.agents/skills/git-maker");

      expect(runSkills(root, ["remove", "git-maker", "-y"]).exitCode).toBe(0);
      expect(JSON.parse(new TextDecoder().decode(runSkills(root, ["list", "--json"]).stdout))).toHaveLength(0);
      expect(existsSync(join(root, ".agents", "skills", "git-maker"))).toBe(false);
      const projectLockAfterRemove = JSON.parse(readFileSync(projectLockPath, "utf8"));
      expect(projectLockAfterRemove.skills["git-maker"]).toBeUndefined();

      const copyAdd = runSkills(root, ["add", "alpoxdev/hypercore", "--skill", "git-maker", "-a", "claude-code", "--copy", "-y"]);
      expect(copyAdd.exitCode).toBe(0);
      const claudeCopy = join(root, ".claude", "skills", "git-maker");
      expect(lstatSync(claudeCopy).isDirectory()).toBe(true);
      expect(lstatSync(claudeCopy).isSymbolicLink()).toBe(false);
      expect(runSkills(root, ["remove", "git-maker", "-y"]).exitCode).toBe(0);

      const multiAdd = runSkills(root, ["add", "alpoxdev/hypercore", "--skill", "git-maker", "-a", "claude-code", "-a", "codex", "-y"]);
      expect(multiAdd.exitCode).toBe(0);
      expect(existsSync(join(root, ".agents", "skills", "git-maker"))).toBe(true);
      expect(existsSync(join(root, ".claude", "skills", "git-maker"))).toBe(true);

      const partialRemove = runSkills(root, ["remove", "git-maker", "-a", "claude-code", "-y"]);
      expect(partialRemove.exitCode).toBe(0);
      expect(existsSync(join(root, ".agents", "skills", "git-maker"))).toBe(true);
      const partialLock = JSON.parse(readFileSync(projectLockPath, "utf8"));
      expect(partialLock.skills["git-maker"]).toBeUndefined();

      const managedReAdd = runSkills(root, ["add", "alpoxdev/hypercore", "--skill", "git-maker", "-a", "codex", "-y"]);
      expect(managedReAdd.exitCode).toBe(0);
      const restoredLock = JSON.parse(readFileSync(projectLockPath, "utf8"));
      expect(restoredLock.skills["git-maker"].source).toBe("alpoxdev/hypercore");
      expect(restoredLock.skills["git-maker"].computedHash).toBeTruthy();
      expect(runSkills(root, ["remove", "git-maker", "-y"]).exitCode).toBe(0);

      const globalAdd = runSkills(root, ["add", "alpoxdev/hypercore", "--skill", "git-maker", "-a", "codex", "-g", "-y"]);
      expect(globalAdd.exitCode).toBe(0);
      const globalLockPath = join(root, "xdg", "skills", ".skill-lock.json");
      const globalLock = JSON.parse(readFileSync(globalLockPath, "utf8"));
      expect(globalLock.version).toBe(3);
      expect(globalLock.skills["git-maker"].source).toBe("alpoxdev/hypercore");
      expect(globalLock.skills["git-maker"].skillFolderHash).toBeTruthy();
      expect(runSkills(root, ["update", "git-maker", "-g", "-y"]).exitCode).toBe(0);
      const globalLockAfterUpdate = JSON.parse(readFileSync(globalLockPath, "utf8"));
      expect(globalLockAfterUpdate.skills["git-maker"].source).toBe(globalLock.skills["git-maker"].source);
      expect(globalLockAfterUpdate.skills["git-maker"].skillFolderHash).toBe(globalLock.skills["git-maker"].skillFolderHash);

      const globalList = runSkills(root, ["list", "-g", "--json"]);
      expect(globalList.exitCode).toBe(0);
      const globalInstalled = JSON.parse(new TextDecoder().decode(globalList.stdout));
      expect(globalInstalled[0].path).toContain("/home/.agents/skills/git-maker");
      expect(globalInstalled[0].path).not.toContain("/codex/");
      expect(runSkills(root, ["remove", "git-maker", "-g", "-y"]).exitCode).toBe(0);
      expect(existsSync(join(root, "home", ".agents", "skills", "git-maker"))).toBe(false);
      const globalLockAfterRemove = JSON.parse(readFileSync(globalLockPath, "utf8"));
      expect(globalLockAfterRemove.skills["git-maker"]).toBeUndefined();

      const init = runSkills(root, ["init", "fixture-skill"]);
      expect(init.exitCode).toBe(0);
      expect(existsSync(join(root, "fixture-skill", "SKILL.md"))).toBe(true);
      const generatedSkill = join(root, "fixture-skill", "SKILL.md");
      const generatedBefore = readFileSync(generatedSkill, "utf8");
      expect(runSkills(root, ["init", "fixture-skill"]).exitCode).toBe(0);
      expect(readFileSync(generatedSkill, "utf8")).toBe(generatedBefore);

      const find = runSkills(root, ["find", "hypercore", "--owner", "alpoxdev"]);
      expect(find.exitCode).toBe(0);
      expect(output(find)).toContain("hypercore");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
  180_000,
);
