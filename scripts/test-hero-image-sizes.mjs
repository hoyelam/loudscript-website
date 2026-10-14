// Run with: node --test scripts/test-hero-image-sizes.mjs
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : defaultRoot;
const heroSizes = "(max-width: 600px) calc(100vw - 34px), (max-width: 908px) calc(100vw - 50px), 858px";
const heroSource = '<source media="(max-width: 600px)" srcset="/images/mac/mac-main-window-640.webp">';
const heroSrcset = "/images/mac/mac-main-window-640.webp 640w, /images/mac/mac-main-window-1280.webp 1280w, /images/mac/mac-main-window.webp 2560w";
const pages = ["templates/landing.html", "index.html", "zh-hant/index.html", "zh-hans/index.html", "de/index.html", "es/index.html", "fr/index.html", "ja/index.html", "nl/index.html"];
const candidates = [
  ["images/mac/mac-main-window-640.webp", 640, 353],
  ["images/mac/mac-main-window-1280.webp", 1280, 705],
  ["images/mac/mac-main-window.webp", 2560, 1410]
];

function heroPicture(html) {
  const match = html.match(/<figure class="mac-screenshot mac-screenshot-main">\s*<picture>([\s\S]*?)<\/picture>/);
  assert.ok(match, "main hero picture exists");
  return match[1];
}

function webpDimensions(bytes) {
  assert.equal(bytes.subarray(0, 4).toString(), "RIFF", "WebP has RIFF header");
  assert.equal(bytes.subarray(8, 12).toString(), "WEBP", "WebP has WEBP signature");
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const type = bytes.subarray(offset, offset + 4).toString();
    const size = bytes.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === "VP8 ") return [bytes.readUInt16LE(data + 6) & 0x3fff, bytes.readUInt16LE(data + 8) & 0x3fff];
    if (type === "VP8L") {
      const bits = bytes.readUInt32LE(data + 1);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (type === "VP8X") return [1 + bytes.readUIntLE(data + 4, 3), 1 + bytes.readUIntLE(data + 7, 3)];
    offset = data + size + (size % 2);
  }
  throw new Error("WebP dimensions chunk not found");
}

test("main hero uses CSS-accurate responsive sizes in template and localized pages", async () => {
  for (const page of pages) {
    const picture = heroPicture(await readFile(path.join(root, page), "utf8"));
    assert.ok(picture.includes(heroSource), `${page} preserves the mobile source fallback`);
    const image = picture.match(/<img\b[^>]*>/)?.[0];
    assert.ok(image, `${page} has main hero image`);
    assert.ok(image.includes(`sizes="${heroSizes}"`), `${page} has responsive hero sizes`);
    assert.doesNotMatch(image, /sizes="860px"/, `${page} does not restore the fixed hero size`);
    assert.ok(image.includes(`srcset="${heroSrcset}"`), `${page} preserves hero srcset`);
    assert.match(image, /width="2560" height="1410"/, `${page} preserves intrinsic size`);
    assert.match(image, /fetchpriority="high"/, `${page} preserves fetch priority`);
  }
});

test("main hero candidates exist and match their declared dimensions", async () => {
  for (const [relativePath, width, height] of candidates) {
    const file = path.join(root, relativePath);
    await access(file);
    assert.deepEqual(webpDimensions(await readFile(file)), [width, height], relativePath);
  }
});
