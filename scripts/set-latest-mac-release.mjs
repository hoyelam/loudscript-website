import { createHash } from "node:crypto";
import { open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

const recordPath = new URL("../data/latest-mac-release.json", import.meta.url);
const semver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function requireInput(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const { values } = parseArgs({
    options: Object.fromEntries(["version", "build", "released", "dmg", "download-url"]
      .map((key) => [key, { type: "string", multiple: true }]))
  });
  for (const key of ["version", "build", "released", "dmg", "download-url"]) {
    requireInput(values[key]?.length === 1 && values[key][0], `Expected exactly one --${key}`);
    values[key] = values[key][0];
  }
  const { version, build, released, dmg, "download-url": downloadUrl } = values;
  requireInput(semver.test(version), "--version must be a valid SemVer (for example 0.1.39)");
  requireInput(/^(0|[1-9]\d*)$/.test(build) && Number.isSafeInteger(Number(build)),
    "--build must be a non-negative safe integer without leading zeros");
  const date = new Date(`${released}T00:00:00Z`);
  requireInput(/^\d{4}-\d{2}-\d{2}$/.test(released) && !released.startsWith("0000")
    && !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === released,
  "--released must be a real ISO date (YYYY-MM-DD)");
  requireInput(path.extname(dmg) === ".dmg", "--dmg must name a .dmg file");
  let url;
  try { url = new URL(downloadUrl); } catch { throw new Error("--download-url must be a valid HTTPS URL"); }
  requireInput(url.protocol === "https:" && downloadUrl.startsWith("https://")
    && !url.username && !url.password && !url.search && !url.hash
    && !/[\s<>"'&\\]/.test(downloadUrl)
    && decodeURIComponent(url.pathname.split("/").at(-1)) === path.basename(dmg),
  "--download-url must be HTTPS, end in the DMG file name, and have no credentials, query, fragment, or unsafe characters");

  const file = await open(dmg, "r");
  let fileSizeBytes = 0;
  const hash = createHash("sha256");
  try {
    const stat = await file.stat();
    requireInput(stat.isFile() && stat.size > 0, "--dmg must be an existing, non-empty regular file");
    for await (const chunk of file.createReadStream({ autoClose: false })) {
      fileSizeBytes += chunk.length;
      hash.update(chunk);
    }
    requireInput(fileSizeBytes === stat.size, "--dmg changed while being read; retry with a finished DMG");
  } finally {
    await file.close();
  }

  const original = await readFile(recordPath, "utf8");
  const record = JSON.parse(original);
  record.siteLastModified = released > record.siteLastModified ? released : record.siteLastModified;
  record.latestMacRelease = {
    version, build, released,
    releasedDisplay: date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    fileSizeBytes,
    fileSizeDisplay: `${(fileSizeBytes / 1_000_000).toFixed(1)} MB`,
    sha256: hash.digest("hex"),
    downloadUrl,
    changelogAnchor: `#version-${version.replaceAll(".", "-")}`
  };
  const output = `${JSON.stringify(record, null, 2)}\n`;
  if (output === original) {
    console.log(`Mac release ${version} (build ${build}) is already current`);
    return;
  }
  // Rename on the same filesystem makes the record and site date one atomic update.
  const temporary = new URL(`./.latest-mac-release-${process.pid}.tmp`, recordPath);
  const pending = await open(temporary, "wx", 0o644);
  try {
    try { await pending.writeFile(output, "utf8"); } finally { await pending.close(); }
    await rename(temporary, recordPath);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(`Updated Mac release to ${version} (build ${build})`);
}

main().catch((error) => {
  console.error(`set-latest-mac-release: ${error.message}`);
  process.exitCode = 1;
});
