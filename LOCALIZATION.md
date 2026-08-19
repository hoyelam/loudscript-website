# Website localization

## State

The landing page and all three SEO guides support English, Traditional Chinese under `/zh-hant/`, Simplified Chinese under `/zh-hans/`, German under `/de/`, and Spanish under `/es/`. Changelog, support, terms, and privacy pages remain English and are marked with `EN` on localized landing pages.

## Edit and build

1. Edit shared markup in `templates/landing.html`.
2. Edit source copy in `locales/en.json`.
3. Add the same keys to every translated locale file.
4. Edit Chinese guide translations in `scripts/build-localized-guides.mjs`, German guide translations in `locales/guides-de.json`, and Spanish guide translations in `locales/guides-es.json` when guide source copy changes.
5. Run `npm run build` to generate deployable HTML.
6. Run `npm test` to validate translation parity, links, metadata, structured data, accessibility references, and sitemap coverage.

Generated files are committed because the site deploys as static files:

- `index.html`
- `zh-hant/index.html`
- `zh-hans/index.html`
- `de/index.html`
- `es/index.html`
- `read-selected-text-aloud-mac/index.html` and all four localized variants
- `screenshot-ocr-text-to-speech-mac/index.html` and all four localized variants
- `offline-text-to-speech-mac/index.html` and all four localized variants

## Traditional Chinese glossary

Use Apple Taiwan terminology consistently. Preserve literal product commands, such as `Read with LoudScript`, when the app does not provide a localized command name.

| English | Traditional Chinese |
| --- | --- |
| Selected Text | 選取文字 |
| Screen OCR | 截圖 OCR |
| PDF Reading | PDF 朗讀 |
| Reading History | 朗讀歷史 |
| Voice & Playback | 語音與播放 |
| Background Playback | 背景播放 |
| Local voices | 本機語音 |
| Apple silicon | Apple 晶片 |
| AI formatting | AI 格式化 |
| Privacy | 隱私權 |
| Email | 電子郵件 |
| Details | 詳細資訊 |

Product and engine names remain unchanged: LoudScript, macOS, Apple, Supertonic, Kokoro, and PocketTTS.

## German glossary

Use Apple Germany terminology consistently and address readers informally with `du`. Preserve literal product commands, such as `Read with LoudScript`, because the Mac app does not provide a localized command name.

| English | German |
| --- | --- |
| Selected Text | Ausgewählter Text |
| Screen OCR | Bildschirm-OCR |
| PDF Reading | PDF vorlesen |
| Reading History | Leseverlauf |
| Voice & Playback | Stimme & Wiedergabe |
| Background Playback | Wiedergabe im Hintergrund |
| Local voices | Lokale Stimmen |
| Apple silicon | Apple-Chip |
| AI formatting | KI-Formatierung |
| Accessibility | Bedienungshilfen |
| Screen Recording | Bildschirmaufnahme |
| System Settings | Systemeinstellungen |
| Spoken Content | Lesen & Sprechen |
| Text to Speech | Text-to-Speech / Text vorlesen |
| Highlight | Hervorheben |
| Privacy | Datenschutz |

## Simplified Chinese glossary

Use Apple China terminology consistently. Preserve literal product commands, such as `Read with LoudScript`, when the app does not provide a localized command name.

| English | Simplified Chinese |
| --- | --- |
| Selected Text | 所选文本 |
| Screen OCR | 截屏 OCR |
| PDF Reading | PDF 朗读 |
| Reading History | 朗读历史记录 |
| Voice & Playback | 语音与播放 |
| Background Playback | 后台播放 |
| Local voices | 本地语音 |
| Apple silicon | Apple 芯片 |
| Intel-based Mac | 基于 Intel 的 Mac |
| AI formatting | AI 格式化 |
| Accessibility | 辅助功能 |
| Screen Recording & System Audio | 录屏与系统录音 |
| Text to Speech | 文本转语音 |
| Highlight | 高亮标记 |
| Privacy | 隐私 |
| Email | 电子邮件 |
| Details | 详细信息 |

## Spanish glossary

Use Apple Spain terminology consistently and address readers informally with `tú`. Preserve literal product commands, such as `Read with LoudScript`, because the Mac app does not provide a localized command name.

| English | Spanish |
| --- | --- |
| Selected Text | Texto seleccionado |
| Screen OCR | OCR de capturas |
| PDF Reading | Lectura de PDF |
| Reading History | Historial de lectura |
| Voice & Playback | Voz y reproducción |
| Background Playback | Reproducción en segundo plano |
| Speech engine | Motor de voz |
| Local voices | Voces locales |
| Apple silicon | Chip de Apple |
| AI formatting | Formato con IA |
| Accessibility | Accesibilidad |
| Screen Recording & System Audio | Grabación de pantalla y del audio del sistema |
| System Settings | Ajustes del Sistema |
| Spoken Content | Lectura y voz |
| Text to Speech | Texto a voz |
| Privacy | Privacidad |

## Adding a locale

1. Copy `locales/en.json` to a correctly cased BCP 47 locale filename.
2. Translate every value without changing keys or product names.
3. Add locale metadata and the output path in `scripts/build-localized-landing.mjs`.
4. Add the locale to the language navigation and reciprocal `hreflang` links.
5. Add its canonical URL and alternates to `sitemap.xml`.
6. Add the locale specification to `scripts/validate-localized-site.mjs`.
7. Build, validate, review at desktop/mobile widths, and obtain native-speaker approval before deployment.

## SEO launch checklist

1. Deploy every generated locale page before, or atomically with, the sitemap that references it.
2. Confirm `https://loudscript.app/zh-hans/`, `https://loudscript.app/zh-hant/`, `https://loudscript.app/de/`, and `https://loudscript.app/es/` return HTTP 200 in production.
3. Confirm the live pages retain their self-referencing canonicals and the complete reciprocal `en`, `zh-Hans`, `zh-Hant`, `de`, `es`, and `x-default` hreflang set.
4. Confirm the live sitemap contains the same alternate set for each localized URL, then submit it in Google Search Console and Bing Webmaster Tools.
5. Inspect all localized URLs in Search Console after deployment and request indexing if discovery is delayed.
6. Monitor impressions for `texto a voz para Mac`, `leer texto seleccionado en Mac`, `OCR de capturas en Mac`, `texto a voz sin conexión para Mac`, `Text auf dem Mac vorlesen`, `Offline Text-to-Speech Mac`, `Mac 文本转语音`, `Mac 文字转语音`, `Mac 文字轉語音`, and related PDF/OCR queries before changing keyword targeting.
7. Keep every guide's complete main content, metadata, schema, internal links, and reciprocal language annotations synchronized across all five locales.
