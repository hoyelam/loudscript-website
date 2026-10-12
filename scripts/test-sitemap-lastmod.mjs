import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const original = await readFile(path.join(root, "sitemap.xml"), "utf8");
const changelog = await readFile(path.join(root, "changelog.html"), "utf8");
const start = "<!-- PUBLIC_RELEASES_START -->";
const end = "<!-- PUBLIC_RELEASES_END -->";
const entry = (date) => `<details class="release-entry"><time datetime="${date}">Release</time></details>`;
const releases = (...dates) => `${start}${dates.map(entry).join("\n")}${end}`;
const withLastmod = (date) => original.replace(
  /(<loc>https:\/\/loudscript\.app\/changelog\.html<\/loc>\s*<lastmod>)[^<]+/,
  `$1${date}`
);

async function fixture(t, html) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sitemap-lastmod-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, "scripts"));
  for (const file of ["build-sitemap.mjs", "site-metadata.mjs"]) {
    await copyFile(path.join(root, "scripts", file), path.join(dir, "scripts", file));
  }
  await writeFile(path.join(dir, "changelog.html"), html);
  await writeFile(path.join(dir, "sitemap.xml"), original);
  const result = spawnSync(process.execPath, [path.join(dir, "scripts/build-sitemap.mjs")], {
    cwd: dir, encoding: "utf8"
  });
  assert.ifError(result.error);
  return { ...result, sitemap: await readFile(path.join(dir, "sitemap.xml"), "utf8") };
}

test("checked-in public releases preserve the entire sitemap byte-for-byte", async (t) => {
  const result = await fixture(t, changelog);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.sitemap, original);
});

test("a newer public release changes only changelog lastmod", async (t) => {
  const current = original.match(
    /<loc>https:\/\/loudscript\.app\/changelog\.html<\/loc>\s*<lastmod>([^<]+)/
  )[1];
  const next = new Date(`${current}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const newer = next.toISOString().slice(0, 10);
  const result = await fixture(t, changelog.replace(end, `${entry(newer)}${end}`));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.sitemap, withLastmod(newer));
});

for (const dates of [
  ["2026-01-01", "2026-12-31", "2026-06-15"],
  ["2026-12-31", "2026-06-15", "2026-01-01"],
  ["2026-06-15", "2026-01-01", "2026-12-31", "2026-12-31"],
  ["2024-02-29"], ["2000-02-29"], ["0001-01-01"]
]) {
  test(`latest valid date: ${dates.join(", ")}`, async (t) => {
    // Neither dates outside the markers nor commented-out releases are public releases.
    const html = entry("9999-12-31") + releases(...dates).replace(end,
      `<!-- ${entry("9998-12-31")} -->${end}`) + entry("9999-12-31");
    const result = await fixture(t, html);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.sitemap, withLastmod([...dates].sort().at(-1)));
  });
}

const invalid = [
  ["missing markers", entry("2026-10-10")],
  ["missing start", `${entry("2026-10-10")}${end}`],
  ["missing end", `${start}${entry("2026-10-10")}`],
  ["reversed markers", `${end}${entry("2026-10-10")}${start}`],
  ["duplicate markers", `${start}${releases("2026-10-10")}`],
  ["empty releases", releases()],
  ["date only outside markers", entry("2026-10-10") + releases()],
  ["missing datetime", `${start}<details class="release-entry"><time>Today</time></details>${end}`],
  ["one release missing its time", releases("2026-10-10").replace(end,
    `<details class="release-entry">Undated release</details>${end}`)],
  ["multiple dates in one release", `${start}<details class="release-entry"><time datetime="2026-10-10"></time><time datetime="2026-10-11"></time></details>${end}`],
  ...["", "2026-2-01", "2026-02-29", "1900-02-29", "2100-02-29", "2026-04-31",
    "2026-00-10", "2026-13-01", "2026-01-00", "0000-01-01", "nonsense",
    "2026-10-10T00:00:00Z", " 2026-10-10"].map((date) => [
    `invalid date ${JSON.stringify(date)} alongside a valid release`, releases("2026-10-10", date)
  ])
];
for (const [name, html] of invalid) {
  test(`${name} fails without overwriting sitemap`, async (t) => {
    const result = await fixture(t, html);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid public changelog:/);
    assert.equal(result.sitemap, original);
  });
}
