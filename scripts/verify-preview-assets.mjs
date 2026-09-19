import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

const miniRoot = path.resolve(import.meta.dirname, "..");
const previewRoot = path.join(miniRoot, "preview");
const standalonePath = path.join(previewRoot, "liuyao-standalone.html");

export async function verifyPreviewAssets() {
  const html = await readFile(standalonePath, "utf8");
  const references = new Set();
  const assetPattern = /(?:\.\/)?assets\/[A-Za-z0-9._/-]+/g;

  for (const match of html.matchAll(assetPattern)) {
    references.add(match[0].replace(/^\.\//, ""));
  }

  [
    "assets/images/brand-zhouyi.svg",
    "assets/coins/qianlong-yang.jpg",
    "assets/coins/qianlong-yin.jpg",
    "assets/fonts/zhouyi-zhuan.woff",
  ].forEach((item) => references.add(item));

  const problems = [];
  for (const reference of [...references].sort()) {
    const target = path.resolve(previewRoot, reference);
    if (!target.startsWith(`${previewRoot}${path.sep}`)) {
      problems.push(`${reference}: path escapes preview/`);
      continue;
    }
    try {
      await access(target);
      if ((await stat(target)).size === 0) problems.push(`${reference}: empty file`);
    } catch {
      problems.push(`${reference}: missing file`);
    }
  }

  if (!html.includes('src="./assets/images/brand-zhouyi.svg"')) {
    problems.push("homepage brand must use the SVG outline asset");
  }
  if (!html.includes("requestCompassPermission")) {
    problems.push("compass permission flow is missing");
  }

  if (problems.length) {
    throw new Error(`Preview verification failed:\n- ${problems.join("\n- ")}`);
  }

  console.log(`Preview verification passed (${references.size} local assets).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  await verifyPreviewAssets();
}
