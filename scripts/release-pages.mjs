import { readFile } from "node:fs/promises";
import { latestMacRelease, siteLastModified } from "./site-metadata.mjs";

export const releasePages = [
  { template: "download.html", output: "download/index.html" },
  { template: "llms.txt", output: "llms.txt" }
];

export const releasedDisplayUS = new Date(`${latestMacRelease.released}T00:00:00Z`)
  .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

export async function renderReleasePage(page) {
  let source = await readFile(new URL(`../templates/${page.template}`, import.meta.url), "utf8");
  if (page.template.endsWith(".html")) {
    const marker = '<meta name="robots" content="noindex, follow" data-build-only="robots">';
    if (source.split(marker).length !== 2) throw new Error(`${page.template}: expected exactly one source-template noindex marker`);
    source = source.replace(marker, '<meta name="robots" content="index, follow">');
  }
  const facts = {
    ...latestMacRelease, siteLastModified, releasedDisplayUS,
    downloadFileName: decodeURIComponent(new URL(latestMacRelease.downloadUrl).pathname.split("/").at(-1)),
    fileSizeBytesDisplay: latestMacRelease.fileSizeBytes.toLocaleString("en-US")
  };
  return source.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(facts, key)) throw new Error(`${page.template}: unknown release token ${key}`);
    const value = String(facts[key]);
    return page.template.endsWith(".html")
      ? value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      : value;
  });
}
