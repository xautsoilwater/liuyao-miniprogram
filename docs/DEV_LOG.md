# 周易研习 · 研发更新日志 (DEV_LOG)

---

## [2026-10-05] 重大重构：算卦问事自由输入与 AI 深度智能解卦 (AI Divination & Free Asking)

### 1. 业务背景与改造目标
- **所问简化**：全面废弃原有死板的 11 大类与层级选项树，改为让用户在优雅的文本框中直接自由输入心中所惑，辅以 8 个高频灵感便签一键填入，实现“心诚意专，随念而测”。
- **AI 智能解卦**：彻底废弃基于固定文本拼接的传统解卦机制，全面升级为大模型纳甲义理推演引擎，结合排盘全量信息（本卦、变卦、动爻、六神、六亲、世应、月建日辰、空亡、伏神等）进行深度神机断卦。
- **开箱即用 API**：系统已内置开箱即用的 DeepSeek AI 官方端点与模型密钥，同时提供“AI灵匙设置”浮窗，允许用户自由切换自定义 API 端点与 Key。
- **智能理数保底**：内置高水准的本地理数象数推演备用引擎，确保在断网、API 超时或离线状态下 100% 优雅兜底，绝不白屏。

### 2. 核心架构与代码变更
- **AI 配置中心 (`utils/ai-config.js`)**：
  - 内置 DeepSeek API 端点（`https://api.deepseek.com/chat/completions`）与模型（`deepseek-chat`），以及系统内置通信密钥；
  - 提供多端持久化配置（浏览器 `localStorage` 与微信小程序 `wx.getStorageSync` / `wx.setStorageSync`）。
- **AI 解卦引擎 (`utils/ai-interpreter.js`)**：
  - `formatCastForPrompt`：将复杂排盘对象结构化提取为易理报单；
  - `buildDivinationPrompt`：设定严谨的“周易太史令”神机角色，按【神机总断】、【用神爻象】、【机运应期】、【周易明理】四段式结构化输出；
  - `callAiDivinationApi`：支持浏览器 `fetch` 与小程序 `wx.request`；
  - `buildIntelligentFallbackInterpretation`：离线/报错下的全自动象数理气推演，确保鲁棒性。
- **前端网页预览 (`preview/`)**：
  - `preview/build.js` 打包 `ai-config` 与 `ai-interpreter` 并导出到 `window.LiuYao`；
  - `preview/index.html` 增加自定义输入框、灵感便签、太极旋转加载动画、AI徽标与设置弹窗的宋代古典雅致样式；
  - `preview/app-preview.js` 重构 `renderAsk`（自由输入与灵感便签填入）、`renderResult`（AI解卦按钮）、`renderInterpret`（太极加载态、四段式神机解卦呈现、AI灵匙弹窗配置与一键复制）。
- **微信小程序端原生落地 (`pages/ask/` & `pages/interpret/` & `pages/result/`)**：
  - 重构 `pages/ask/` 为自由输入框与 8 类灵感便签；
  - 重构 `pages/interpret/` 为异步 AI 解卦加载与四段式展示，支持弹窗配置自定义 API；
  - 更新 `pages/result/result.wxml` 按钮文案为“AI 智能解卦”。

---

## [2026-10-05] 功能新增：四柱八字命理分析 (Bazi Fortune & Mingli Analysis)

### 1. 业务背景与设计理念
- 根据周易「知天命以修己身 · 五行节律与生辰象解」的精神体系，新增「命理分析」核心功能。
- 摒弃市面宿命恐吓套路，承袭宋代理学与周易义理，重在剖析五行偏枯、大运节律与修德成己之道。

### 2. 核心架构与代码变更
- **算法内核 (`utils/bazi.js`)**：
  - 实现精准的年柱（立春界）、月柱（节令界）、日柱、时柱（五鼠遁日上起时法）排盘；
  - 实现地支藏干人元（本气/中气/余气）及藏干十神映射；
  - 实现六十甲子纳音、长生十二宫星运、神煞矩阵（天乙贵人、文昌、禄神、羊刃、将星、华盖、桃花、驿马等）；
  - 实现四柱五行能量权重视角（金木水火土占比）；
  - 实现阳男阴女顺行、阴男阳女逆行的大运排盘（十年一运与起运年龄）；
  - 输出六维周易明理象解（元亨心性、功名学业、利见事业、丰亨财禄、同人姻缘、保和养生、明理趋吉）。
- **单元测试 (`tests/bazi.test.js`)**：
  - 覆盖十神推算、日上起时、排盘集成测试，全部验证通过。
- **网页单页独立预览 (`preview/`)**：
  - 更新 `preview/build.js`，将 `utils/bazi.js` 打包整合入 `engine.bundle.js` 与 `liuyao-standalone.html`；
  - 更新 `preview/index.html`，追加宋代美学专属四柱大盘、五行能量条、大运滑块与明理卡片 CSS 样式，并优化首页功能按钮间距，确保四项不折行；
  - 更新 `preview/app-preview.js`，实现 `renderBaziInputView`（生辰输入）与 `renderBaziResultView`（四柱大盘与象解），完成路由接入。
- **微信小程序端原生落地 (`pages/bazi/` & `pages/index/`)**：
  - 新建 `pages/bazi/bazi.json`、`bazi.wxml`、`bazi.wxss`、`bazi.js`；
  - 在全局配置 `app.json` 中注册 `"pages/bazi/bazi"` 路由；
  - 首页 `pages/index/index.wxml`、`index.wxss`、`index.js` 同步增加「命理分析」入口与自适应防折行样式。
