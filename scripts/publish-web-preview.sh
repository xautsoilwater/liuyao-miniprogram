#!/usr/bin/env bash
# 发布六爻网页预览到固定 GitHub Pages 地址（长期有效、HTTPS）
#
# ⚠️  唯一授权发布路径 ⚠️
#
# 本脚本是更新以下链接的 **唯一允许方式**：
#   https://xautsoilwater.github.io/liuyao-web-preview/
#
# 禁止操作：
#   - 手动编辑/推送 xautsoilwater/liuyao-web-preview 仓库
#   - 拷贝任意 HTML 文件直接覆盖
#   - 强推历史预览快照绕过下方完整性检查
#
# 用法（在 liuyao-miniprogram 目录）：
#   bash scripts/publish-web-preview.sh
#
# 改完 preview/ 后执行本脚本，约 1～2 分钟后刷新上述链接即可看到最新版。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/deploy/tencent-static"
WORK="${LIUYAO_PREVIEW_WORK:-/tmp/liuyao-web-preview-deploy}"
REPO="${LIUYAO_PREVIEW_REPO:-xautsoilwater/liuyao-web-preview}"
URL="https://xautsoilwater.github.io/liuyao-web-preview/"

echo "==> 校验资源"
node "$ROOT/scripts/verify-preview-assets.mjs"

echo "==> 打包静态站"
mkdir -p "$DIST"
cp "$ROOT/preview/liuyao-standalone.html" "$DIST/index.html"
rm -rf "$DIST/assets"
cp -R "$ROOT/preview/assets" "$DIST/assets"
# 可选壳页面
if [[ -f "$ROOT/preview/index.html" ]]; then
  cp "$ROOT/preview/index.html" "$DIST/app.html"
fi

echo "==> 校验打包完整性"
# 硬性门禁：确保 index.html 包含完整的核心功能模块
# 要求：今日吉位 + 点中间八卦（吉位模块的关键标识）
MISSING=""
if ! grep -q "今日吉位" "$DIST/index.html"; then
  MISSING="${MISSING}今日吉位 "
fi
if ! grep -q "点中间八卦" "$DIST/index.html"; then
  MISSING="${MISSING}点中间八卦 "
fi

if [[ -n "$MISSING" ]]; then
  echo "❌ 错误：打包后的 index.html 缺少核心功能模块"
  echo "   缺失标识：${MISSING}"
  echo "   来源文件 preview/liuyao-standalone.html 不完整或吉位模块尚未集成。"
  echo "   禁止发布不完整的包到预览站点。"
  exit 1
fi
echo "✓ 完整性校验通过"

echo "==> 同步到发布仓库 $REPO"
if [[ -d "$WORK/.git" ]]; then
  git -C "$WORK" fetch origin main 2>/dev/null || true
  git -C "$WORK" checkout main 2>/dev/null || git -C "$WORK" checkout -B main
  git -C "$WORK" pull --rebase origin main 2>/dev/null || true
else
  rm -rf "$WORK"
  gh repo clone "$REPO" "$WORK"
fi

# 同步文件：优先 rsync，不可用时回退到 cp -a
if command -v rsync &>/dev/null; then
  rsync -a --delete --exclude '.git' "$DIST/" "$WORK/"
else
  # 回退方案：删除旧内容（保留 .git），复制新内容
  find "$WORK" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
  cp -a "$DIST/." "$WORK/"
fi
date -u +"%Y-%m-%dT%H:%M:%SZ" > "$WORK/BUILD.txt"

# 轻量防缓存：给 index 加 build 注释
BUILD_ID="$(cat "$WORK/BUILD.txt")"
if ! grep -q "liuyao-preview-build" "$WORK/index.html"; then
  # insert after <head>
  perl -i -0pe "s#<head>#<head>\n  <!-- liuyao-preview-build:${BUILD_ID} -->#" "$WORK/index.html" || true
else
  perl -i -pe "s/liuyao-preview-build:[^ ]*/liuyao-preview-build:${BUILD_ID}/" "$WORK/index.html" || true
fi

cd "$WORK"
git add -A
if git diff --cached --quiet; then
  echo "==> 无内容变更，跳过推送"
else
  git commit -m "preview: update web preview $(date -u +%Y-%m-%dT%H:%MZ)"
  git push origin HEAD:main
  echo "==> 已推送"
fi

echo ""
echo "固定预览链接（HTTPS，长期有效）："
echo "  $URL"
echo "  ${URL}?v=$(date +%s)   # 强制刷新缓存时可加"
echo ""
echo "说明：GitHub Pages 构建通常 30 秒～2 分钟生效。"
