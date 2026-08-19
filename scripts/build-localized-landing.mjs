import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = path.join(siteRoot, "templates", "landing.html");

const locales = [
  {
    id: "en",
    htmlLang: "en",
    textDirection: "ltr",
    canonicalUrl: "https://loudscript.app/",
    outputPath: path.join(siteRoot, "index.html"),
    ogLocale: "en_US",
    ogAlternateLocales: ["zh_TW", "zh_CN"],
    guidePrefix: ""
  },
  {
    id: "zh-Hant",
    htmlLang: "zh-Hant",
    textDirection: "ltr",
    canonicalUrl: "https://loudscript.app/zh-hant/",
    outputPath: path.join(siteRoot, "zh-hant", "index.html"),
    ogLocale: "zh_TW",
    ogAlternateLocales: ["en_US", "zh_CN"],
    guidePrefix: "/zh-hant"
  },
  {
    id: "zh-Hans",
    htmlLang: "zh-Hans",
    textDirection: "ltr",
    canonicalUrl: "https://loudscript.app/zh-hans/",
    outputPath: path.join(siteRoot, "zh-hans", "index.html"),
    ogLocale: "zh_CN",
    ogAlternateLocales: ["en_US", "zh_TW"],
    guidePrefix: "/zh-hans"
  }
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function languageNavigation(locale, messages) {
  const englishCurrent = locale.id === "en" ? ' aria-current="page"' : "";
  const chineseCurrent = locale.id === "zh-Hant" ? ' aria-current="page"' : "";
  const simplifiedChineseCurrent = locale.id === "zh-Hans" ? ' aria-current="page"' : "";

  return [
    `<nav class="mac-language-links" aria-label="${escapeHtml(messages["nav.languageAria"])}">`,
    `    <a href="/" lang="en" hreflang="en"${englishCurrent}>${escapeHtml(messages["nav.english"])}</a>`,
    `    <a href="/zh-hant/" lang="zh-Hant" hreflang="zh-Hant"${chineseCurrent}>${escapeHtml(messages["nav.chinese"])}</a>`,
    `    <a href="/zh-hans/" lang="zh-Hans" hreflang="zh-Hans"${simplifiedChineseCurrent}>${escapeHtml(messages["nav.simplifiedChinese"])}</a>`,
    "</nav>"
  ].join("\n");
}

function ogAlternateLocaleTags(locale) {
  return locale.ogAlternateLocales
    .map((alternate) => `<meta property="og:locale:alternate" content="${alternate}">`)
    .join("\n    ");
}

function englishFallbackBadge(locale, messages) {
  if (locale.id === "en") return "";
  return ` <small class="mac-link-language" aria-label="${escapeHtml(messages["fallback.englishPage"])}">EN</small>`;
}

function replaceAllLiteral(source, search, replacement) {
  return source.split(search).join(replacement);
}

const template = await readFile(templatePath, "utf8");
const englishMessages = JSON.parse(
  await readFile(path.join(siteRoot, "locales", "en.json"), "utf8")
);

for (const locale of locales) {
  const messages = JSON.parse(
    await readFile(path.join(siteRoot, "locales", `${locale.id}.json`), "utf8")
  );

  const englishKeys = Object.keys(englishMessages).sort();
  const localeKeys = Object.keys(messages).sort();
  if (JSON.stringify(englishKeys) !== JSON.stringify(localeKeys)) {
    throw new Error(`${locale.id} locale keys do not match the English locale`);
  }

  let html = template
    .replaceAll("{{htmlLang}}", locale.htmlLang)
    .replaceAll("{{textDirection}}", locale.textDirection)
    .replaceAll("{{canonicalUrl}}", locale.canonicalUrl)
    .replaceAll("{{selectedGuideUrl}}", `${locale.guidePrefix}/read-selected-text-aloud-mac/`)
    .replaceAll("{{ocrGuideUrl}}", `${locale.guidePrefix}/screenshot-ocr-text-to-speech-mac/`)
    .replaceAll("{{offlineGuideUrl}}", `${locale.guidePrefix}/offline-text-to-speech-mac/`)
    .replaceAll("{{ogLocale}}", locale.ogLocale)
    .replace("{{{ogAlternateLocaleTags}}}", ogAlternateLocaleTags(locale))
    .replace("{{{languageNav}}}", languageNavigation(locale, messages))
    .replaceAll("{{{englishFallbackBadge}}}", englishFallbackBadge(locale, messages));

  const replacements = Object.keys(englishMessages)
    .filter((key) => !key.startsWith("nav.language"))
    .map((key) => ({ source: englishMessages[key], target: messages[key] }))
    .filter(({ source, target }) => source !== target)
    .sort((a, b) => b.source.length - a.source.length);

  for (const { source, target } of replacements) {
    html = replaceAllLiteral(html, source, target);
  }

  if (/\{\{{?[^{}]+}?\}\}/.test(html)) {
    throw new Error(`Unresolved template token in ${locale.id} output`);
  }

  await mkdir(path.dirname(locale.outputPath), { recursive: true });
  await writeFile(locale.outputPath, html, "utf8");
  console.log(`Built ${path.relative(siteRoot, locale.outputPath)}`);
}
