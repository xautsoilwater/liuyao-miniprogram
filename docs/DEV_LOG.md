# 周易研习 · 研发更新日志 (DEV_LOG)

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
