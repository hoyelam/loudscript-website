import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteUrl = "https://loudscript.app";
const lastModified = "2026-08-19";
const locales = [
  { lang: "en", prefix: "" },
  { lang: "zh-Hant", prefix: "/zh-hant" },
  { lang: "zh-Hans", prefix: "/zh-hans" },
  { lang: "de", prefix: "/de" },
  { lang: "es", prefix: "/es" },
  { lang: "fr", prefix: "/fr" },
  { lang: "ja", prefix: "/ja" }
];
const routes = [
  "",
  "read-selected-text-aloud-mac",
  "screenshot-ocr-text-to-speech-mac",
  "offline-text-to-speech-mac"
];
const staticPages = [
  { route: "privacy.html", lastModified: "2026-05-21" },
  { route: "tos.html", lastModified: "2026-05-21" },
  { route: "support.html", lastModified: "2026-08-04" },
  { route: "changelog.html", lastModified: "2026-08-19" }
];

function localizedUrl(prefix, route) {
  return `${siteUrl}${prefix}/${route ? `${route}/` : ""}`;
}

function alternateLines(route) {
  const lines = locales.map(({ lang, prefix }) =>
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${localizedUrl(prefix, route)}" />`
  );
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${localizedUrl("", route)}" />`);
  return lines.join("\n");
}

const localizedBlocks = routes.flatMap((route) =>
  locales.map(({ prefix }) => [
    "  <url>",
    `    <loc>${localizedUrl(prefix, route)}</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    alternateLines(route),
    "  </url>"
  ].join("\n"))
);

const staticBlocks = staticPages.map(({ route, lastModified: pageLastModified }) => [
  "  <url>",
  `    <loc>${siteUrl}/${route}</loc>`,
  `    <lastmod>${pageLastModified}</lastmod>`,
  "  </url>"
].join("\n"));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...localizedBlocks,
  ...staticBlocks,
  "</urlset>",
  ""
].join("\n");

await writeFile(path.join(siteRoot, "sitemap.xml"), sitemap, "utf8");
console.log(`Built sitemap.xml with ${localizedBlocks.length + staticBlocks.length} URLs`);
