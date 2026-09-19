#!/usr/bin/env bash
# 将六爻网页预览上传到腾讯云 COS，得到长期 HTTPS 链接
#
# 依赖：
#   1) 安装 coscli：https://cloud.tencent.com/document/product/436/63143
#   2) 配置密钥：coscli config set
#   3) 已有存储桶，并开启「静态网站」或直接用对象 URL
#
# 用法：
#   export COS_BUCKET=your-bucket-1234567890
#   export COS_REGION=ap-guangzhou   # 例：ap-shanghai / ap-beijing
#   export COS_PREFIX=liuyao-preview  # 可选，对象前缀，默认 liuyao-preview
#   bash scripts/deploy-tencent-cos.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/deploy/tencent-static"
BUCKET="${COS_BUCKET:-}"
REGION="${COS_REGION:-ap-guangzhou}"
PREFIX="${COS_PREFIX:-liuyao-preview}"

if [[ -z "$BUCKET" ]]; then
  echo "请设置 COS_BUCKET=你的存储桶名称（含 appid 后缀）"
  exit 1
fi

if ! command -v coscli >/dev/null 2>&1; then
  echo "未找到 coscli。安装见：https://cloud.tencent.com/document/product/436/63143"
  exit 1
fi

if [[ ! -f "$DIST/index.html" ]]; then
  echo "缺少 $DIST/index.html，先准备静态包…"
  node "$ROOT/scripts/verify-preview-assets.mjs"
  mkdir -p "$DIST"
  cp "$ROOT/preview/liuyao-standalone.html" "$DIST/index.html"
  rm -rf "$DIST/assets"
  cp -R "$ROOT/preview/assets" "$DIST/assets"
fi

# 上传（覆盖）
coscli sync "$DIST/" "cos://${BUCKET}/${PREFIX}/" \
  --region "$REGION" \
  --delete \
  --force

echo ""
echo "上传完成。可用链接（任选其一）："
echo "  1) 对象直链："
echo "     https://${BUCKET}.cos.${REGION}.myqcloud.com/${PREFIX}/index.html"
echo "  2) 若已在控制台开启静态网站，用静态网站域名："
echo "     https://<静态网站域名>/"
echo "  3) 若绑定自定义域名 + CDN，用你的固定域名。"
echo ""
echo "iPhone 方向感应需要 HTTPS；COS 默认域名即为 HTTPS。"
