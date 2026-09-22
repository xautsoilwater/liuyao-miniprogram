# 网页预览

## 固定长期链接（推荐）

**https://xautsoilwater.github.io/liuyao-miniprogram/**

推送到 `main` 或 `cursor/**`（且改了 `preview/`、所问页或 `utils/ask-options.js`）后，GitHub Actions 会自动发布，约 1～2 分钟生效。强刷：`?v=时间戳`。

旧地址 `https://xautsoilwater.github.io/liuyao-web-preview/` 不再作为发布目标。

## 本地临时预览

```bash
# 仅本机/局域网调试时用，IP 会变
python3 -m http.server 8765 --directory preview --bind 0.0.0.0
```
