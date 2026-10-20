import { writeFile } from "node:fs/promises";
import { releasePages, renderReleasePage } from "./release-pages.mjs";

for (const page of releasePages) {
  await writeFile(new URL(`../${page.output}`, import.meta.url), await renderReleasePage(page), "utf8");
  console.log(`Built ${page.output}`);
}
