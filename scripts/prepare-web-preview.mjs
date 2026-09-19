import { cp, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { verifyPreviewAssets } from "./verify-preview-assets.mjs";

const outputRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!outputRoot) {
  console.error("Usage: node scripts/prepare-web-preview.mjs /path/to/site/public");
  process.exit(64);
}

const miniRoot = path.resolve(import.meta.dirname, "..");
const previewRoot = path.join(miniRoot, "preview");

await verifyPreviewAssets();
await mkdir(outputRoot, { recursive: true });
await copyFile(
  path.join(previewRoot, "liuyao-standalone.html"),
  path.join(outputRoot, "preview.html"),
);
await cp(path.join(previewRoot, "assets"), path.join(outputRoot, "assets"), {
  recursive: true,
  force: true,
});

console.log(`Web preview prepared in ${outputRoot}`);
