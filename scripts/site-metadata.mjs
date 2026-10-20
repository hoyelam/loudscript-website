import { readFileSync } from "node:fs";

const record = JSON.parse(readFileSync(new URL("../data/latest-mac-release.json", import.meta.url), "utf8"));

export const siteLastModified = record.siteLastModified;
export const guideLastModified = "2026-08-20";
export const guideLastModifiedDisplay = "August 20, 2026";
export const latestMacRelease = Object.freeze(record.latestMacRelease);
