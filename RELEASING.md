# Mac website releases

Release facts live in `data/latest-mac-release.json`. `scripts/site-metadata.mjs`
exports that record for the builders and validators. Do not hand-edit release
facts in generated pages.

The release lane updates the record from the finished DMG with:

```sh
node scripts/set-latest-mac-release.mjs --version 0.1.39 --build 41 --released 2026-10-27 --dmg /abs/path/LoudScript-0.1.39.dmg --download-url https://github.com/hoyelam/loudscript-website/releases/download/loudscript-mac-v0.1.39/LoudScript-0.1.39.dmg
npm test
```

The command validates its arguments, computes byte size, decimal MB (one decimal),
SHA-256, display date and changelog anchor, and advances `siteLastModified` only
when the release date is newer. It atomically replaces the JSON record after all
validation succeeds. Repeating the same command leaves the file unchanged.
Build numbers are non-negative safe integers. Versions follow SemVer; dates are
real calendar dates in `YYYY-MM-DD` form. The HTTPS URL must end in the supplied
DMG filename, without credentials, query parameters or a fragment.

The lane must also put the matching release first in `changelog.html` and
`appcast.xml`. Keep exactly the latest three changelog entries open. `npm test`
builds first, runs the updater tests and indexing checks, then rejects release
drift, including the appcast version, build, date, URL and byte size. Fix those
source files through the release lane if validation reports drift; building
alone cannot create release notes or appcast entries.

`npm run build` derives `download/index.html` and `llms.txt` from
`templates/download.html` and `templates/llms.txt`, plus all eight landing pages'
release metadata and the sitemap. The HTML source templates carry a build-only
noindex directive; generated pages remain indexable. The sitemap dates landing
pages and the download page from `siteLastModified`, guides from their own date,
and the changelog from its newest public release date.

The validator checks version, build, date and DMG URL in `llms.txt`, and also size
and SHA-256 on the download page. To check existing generated files without
rebuilding them, run `node scripts/validate-localized-site.mjs`. Run the focused
updater tests with `npm run test:release`. Include generated files with release
updates because the website serves static files.
