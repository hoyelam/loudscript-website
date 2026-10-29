import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function fixture(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "mac-release-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, "scripts"));
  await mkdir(path.join(dir, "data"));
  await copyFile(new URL("scripts/set-latest-mac-release.mjs", root), path.join(dir, "scripts/set-latest-mac-release.mjs"));
  const recordPath = path.join(dir, "data/latest-mac-release.json");
  const record = JSON.parse(await readFile(new URL("data/latest-mac-release.json", root), "utf8"));
  await writeFile(recordPath, JSON.stringify({ ...record, siteLastModified: "2026-01-01" }, null, 2) + "\n");
  const dmg = path.join(dir, "LoudScript-0.1.39.dmg");
  const bytes = Buffer.alloc(33_845_215, 42);
  await writeFile(dmg, bytes);
  const options = {
    version: "0.1.39", build: "41", released: "2026-10-27", dmg,
    "download-url": "https://github.com/hoyelam/loudscript-website/releases/download/loudscript-mac-v0.1.39/LoudScript-0.1.39.dmg"
  };
  function run(overrides = {}, extra = []) {
    const args = Object.entries({ ...options, ...overrides })
      .filter(([, value]) => value !== undefined).flatMap(([key, value]) => [`--${key}`, value]);
    const result = spawnSync(process.execPath, [path.join(dir, "scripts/set-latest-mac-release.mjs"), ...args, ...extra], {
      cwd: os.tmpdir(), encoding: "utf8"
    });
    assert.ifError(result.error);
    return result;
  }
  return { dir, dmg, bytes, options, recordPath, run };
}

test("derives the complete record from DMG bytes, advances the date, and is idempotent", async (t) => {
  const f = await fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const first = await readFile(f.recordPath, "utf8");
  assert.deepEqual(JSON.parse(first), {
    siteLastModified: "2026-10-27",
    latestMacRelease: {
      version: "0.1.39", build: "41", released: "2026-10-27", releasedDisplay: "27 October 2026",
      fileSizeBytes: 33_845_215, fileSizeDisplay: "33.8 MB",
      sha256: createHash("sha256").update(f.bytes).digest("hex"),
      downloadUrl: f.options["download-url"], changelogAnchor: "#version-0-1-39"
    }
  });
  const before = await stat(f.recordPath);
  const repeated = f.run();
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.match(repeated.stdout, /already current/);
  assert.equal(await readFile(f.recordPath, "utf8"), first);
  assert.equal((await stat(f.recordPath)).mtimeMs, before.mtimeMs);
  assert.deepEqual(await readdir(path.dirname(f.recordPath)), ["latest-mac-release.json"]);
});

test("keeps a newer site date and formats a leap date deterministically", async (t) => {
  const f = await fixture(t);
  const record = JSON.parse(await readFile(f.recordPath, "utf8"));
  record.siteLastModified = "2030-01-01";
  await writeFile(f.recordPath, JSON.stringify(record));
  const result = f.run({ released: "2024-02-29", version: "1.0.0-rc.1+build.2" });
  assert.equal(result.status, 0, result.stderr);
  const updated = JSON.parse(await readFile(f.recordPath, "utf8"));
  assert.equal(updated.siteLastModified, "2030-01-01");
  assert.equal(updated.latestMacRelease.releasedDisplay, "29 February 2024");
  assert.equal(updated.latestMacRelease.changelogAnchor, "#version-1-0-0-rc-1+build-2");
});

test("bad inputs fail clearly without changing any fixture file", async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, "empty.dmg"), "");
  await mkdir(path.join(f.dir, "directory.dmg"));
  const cases = [
    ...["", "v0.1.39", "0.1", "01.1.39", "1.2.3-01", "1.2.3+", "1.2.3\n"].map((version) => [{ version }, [], /version/]),
    ...["-1", "1.5", "01", "1e2", "9007199254740992", "abc"].map((build) => [{ build }, [], /build/]),
    ...["2026-02-29", "2026-04-31", "0000-01-01", "2026-13-01", "2026-1-01", "2026-10-27T00:00:00Z"].map((released) => [{ released }, [], /released/]),
    ...["not a url", "http://example.com/LoudScript-0.1.39.dmg", "https://example.com/wrong.dmg",
      "https://example.com/LoudScript-0.1.39.dmg?download=1", "https://example.com/LoudScript-0.1.39.dmg#fragment",
      "https://user:password@example.com/LoudScript-0.1.39.dmg"].map((url) => [{ "download-url": url }, [], /download-url/]),
    [{ version: undefined }, [], /version/],
    [{}, ["--version", "0.1.40"], /version/],
    [{}, ["--unknown", "value"], /unknown/],
    [{}, ["positional"], /argument/],
    [{ dmg: path.join(f.dir, "file.zip") }, [], /dmg/],
    ...["missing.dmg", "empty.dmg", "directory.dmg"].map((name) => [{
      dmg: path.join(f.dir, name), "download-url": `https://example.com/${name}`
    }, [], /dmg|ENOENT/])
  ];
  async function snapshot(dir) {
    const files = {};
    for (const name of (await readdir(dir)).sort()) {
      const target = path.join(dir, name);
      files[name] = (await stat(target)).isDirectory() ? await snapshot(target)
        : createHash("sha256").update(await readFile(target)).digest("hex");
    }
    return files;
  }
  const before = await snapshot(f.dir);
  for (const [overrides, extra, message] of cases) {
    const result = f.run(overrides, extra);
    assert.equal(result.status, 1, JSON.stringify({ overrides, extra, result }));
    assert.match(result.stderr, /set-latest-mac-release:/);
    assert.match(result.stderr, message);
    assert.deepEqual(await snapshot(f.dir), before, `Files changed for ${JSON.stringify(overrides)}`);
  }
  console.log(`Rejected ${cases.length} bad-input cases; all fixture files unchanged`);
});
