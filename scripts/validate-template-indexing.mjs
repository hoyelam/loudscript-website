import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Optional base URL exercises the same assertions against a local HTTP server.
const baseUrl = process.argv[2];
async function read(relativePath) {
  if (!baseUrl) return readFile(path.join(root, relativePath), "utf8");
  const response = await fetch(new URL(relativePath, baseUrl));
  assert.equal(response.status, 200, `${relativePath}: expected HTTP 200`);
  assert(!/noindex|none/i.test(response.headers.get("x-robots-tag") ?? ""),
    `${relativePath}: unexpected server-level indexing restriction`);
  return response.text();
}
function robots(html) {
  return [...html.matchAll(/<meta\b[^>]*>/gi)]
    .filter(([tag]) => /\bname=["']robots["']/i.test(tag))
    .map(([tag]) => tag.match(/\bcontent=["']([^"']+)["']/i)?.[1]);
}

const template = await read("templates/landing.html");
assert.deepEqual(robots(template), ["noindex, follow"],
  "Public source template must have exactly one noindex directive");
assert(template.includes('data-build-only="robots"'), "Missing build-only marker");
const sitemap = await read("sitemap.xml");
assert(!sitemap.includes("/templates/"), "Source template must not be in the sitemap");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url));
assert(urls.length > 0, "Sitemap must contain public pages");
for (const url of urls) {
  const relativePath = url.pathname.slice(1) + (url.pathname.endsWith("/") ? "index.html" : "");
  const html = await read(relativePath);
  assert.deepEqual(robots(html), ["index, follow"], `${relativePath}: indexing policy changed`);
  assert(!html.includes('data-build-only="robots"'), `${relativePath}: source marker leaked`);
  assert(!/\{\{{?[^{}]+}?\}\}/.test(html), `${relativePath}: unresolved template token`);
}
console.log(`Validated source-template noindex and ${urls.length} indexable sitemap pages${baseUrl ? " over HTTP" : ""}.`);
