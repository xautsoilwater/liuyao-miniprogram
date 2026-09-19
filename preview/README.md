# 网页预览

## 固定长期链接（推荐）

**https://xautsoilwater.github.io/liuyao-web-preview/**

- HTTPS，长期有效，不依赖本机局域网 IP  
- 源码仓库（仅静态站）：https://github.com/xautsoilwater/liuyao-web-preview  
- 更新后约 1～2 分钟生效；强刷可用：`?v=时间戳`

## 发布最新预览

在 `liuyao-miniprogram` 目录：

```bash
bash scripts/publish-web-preview.sh
```

会把 `preview/liuyao-standalone.html` + `assets/` 推到 GitHub Pages。

## 本地临时预览

```bash
# 仅本机/局域网调试时用，IP 会变
python3 -m http.server 8765 --directory preview --bind 0.0.0.0
```
