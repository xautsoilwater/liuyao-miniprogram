# 网页预览

## 固定长期链接（推荐）

**https://xautsoilwater.github.io/liuyao-web-preview/**

- HTTPS，长期有效，不依赖本机局域网 IP  
- 源码仓库（仅静态站）：https://github.com/xautsoilwater/liuyao-web-preview  
- 更新后约 1～2 分钟生效；强刷可用：`?v=时间戳`

## 发布最新预览（唯一路径）

⚠️ **强制要求**：只能通过以下命令更新预览站点，禁止手动编辑发布仓库或推送任意 HTML。

在 `liuyao-miniprogram` 目录执行：

```bash
bash scripts/publish-web-preview.sh
```

**来源文件**：`preview/liuyao-standalone.html`  
**完整性要求**：源文件必须包含完整功能模块（今日吉位、点中间八卦等），发布脚本会自动校验。  
**禁止操作**：
- 直接推送到 `xautsoilwater/liuyao-web-preview`
- 拷贝不完整的 HTML 覆盖现有版本
- 绕过脚本的完整性检查

## 本地临时预览

```bash
# 仅本机/局域网调试时用，IP 会变
python3 -m http.server 8765 --directory preview --bind 0.0.0.0
```
