# 六爻小程序 · 代码检索目录

> **怎么用（30 秒）**  
> 1. 先在下方「**一句话 → 先打开**」表里按你要改的事找到文件  
> 2. 改界面再改逻辑：`*.wxml` / `*.wxss` → `*.js` → 相关 `utils/`  
> 3. 改了原生页面后，同步 `preview/liuyao-standalone.html`（网页预览）  
> 4. 引擎类改动跑：`node tests/core-calculation.test.js`

工程根目录：`liuyao-miniprogram/`  
AppID：`wx2a67beceaff79138`（见 `project.config.json`）

---

## 1. 目录树（改哪里先认路径）

```text
liuyao-miniprogram/
├── app.js / app.json / app.wxss     # 全局入口、路由、主题
├── project.config.json             # 开发者工具工程配置
│
├── pages/                          # 页面（每页 .js .wxml .wxss .json）
│   ├── index/                      # 首页 · 罗盘 · 三入口
│   ├── ask/                        # 所问（类别 + 事项 + 时间）
│   ├── cast/                       # 六爻卜卦（摇钱）
│   ├── result/                     # 六爻排盘结果
│   ├── interpret/                  # 六爻断卦解读
│   ├── meihua/                     # 梅花起卦
│   ├── meihua-result/              # 梅花结果 + 断语
│   ├── learn/ · learn-detail/      # 研习目录 / 正文
│   ├── history/                    # 历史卦例
│   └── account/                    # 账户登录
│
├── components/
│   ├── luopan/                     # 首页罗盘（指南针 + 拖盘 + 方位助手）
│   ├── nav-back/                   # 自定义返回
│   └── learn-figure/               # 研习文稿插图
│
├── utils/                          # 纯逻辑（无 UI）
│   ├── coin.js                     # 三钱摇爻
│   ├── ganzhi.js                   # 干支历 · 旬空 · 旺衰
│   ├── paipan.js                   # 六爻排盘
│   ├── duangu.js                   # 六爻断卦主入口
│   ├── rules.js                    # 冲合 · 进退 · 反伏吟 · 应期
│   ├── ask.js · ask-options.js · ask-taxonomy.js  # 所问解析与分类
│   ├── meihua.js                   # 梅花起卦与体用
│   └── auth.js                     # 本机账户
│
├── data/
│   ├── bagua.js                    # 八卦 · 八宫 · 纳甲 · 64 卦名
│   ├── guaci.js                    # 卦辞 / 象辞对照
│   ├── learning.js                 # 研习正文（主库）
│   └── learning-extra.js           # 研习扩写
│
├── assets/                         # 铜钱图 · 品牌图 · 字体
├── behaviors/swipe-back.js         # 左划返回
├── preview/                        # 浏览器预览（含 standalone）
├── scripts/                        # 预览校验 / 同步
├── tests/                          # 计算与账户单测
├── CODE_INDEX.md                   # 本文件
├── ACCURACY-AUDIT.md               # 准确性审计边界
└── README.md · STORE-LISTING.md
```

---

## 2. 用户路径 → 页面（业务流）

```text
首页 index
  ├─ 研习典要 → learn → learn-detail
  ├─ 六爻卜卦 → ask?next=cast → cast → result → interpret
  ├─ 梅花易数 → ask?next=meihua → meihua → meihua-result
  ├─ 登录     → account
  └─ 历史卦例 → history →（点开）result / meihua-result
```

| 路由 | 路径 | 职责 |
|------|------|------|
| 首页 | `pages/index/index` | 品牌、罗盘组件、三入口、底栏 |
| 所问 | `pages/ask/ask` | 选类别 / 事项 / 时间，写入 `pendingAsk` |
| 六爻卜卦 | `pages/cast/cast` | 摇六次钱 / 手选爻，生成卦 |
| 排盘 | `pages/result/result` | 本变卦表、世应、六亲六神、象辞 |
| 断卦 | `pages/interpret/interpret` | 调用 `interpret()` 展示断语 |
| 梅花起卦 | `pages/meihua/meihua` | 报数 / 时间 / 随机 |
| 梅花结果 | `pages/meihua-result/meihua-result` | 本互变、体用、断语 |
| 研习 | `pages/learn/learn` | 八卷目录 |
| 研习正文 | `pages/learn-detail/learn-detail` | 单篇 + 插图组件 |
| 历史 | `pages/history/history` | 本地列表、删除、再看 |
| 账户 | `pages/account/account` | 微信登录壳、资料 |

页面注册顺序：`app.json` → `pages` 数组（第一项为启动页）。

---

## 3. 一句话 → 先打开（主检索表）

### 3.1 首页 / 品牌 / 罗盘

| 你想改… | 先打开 | 预览检索词 |
|---------|--------|------------|
| 首页布局、三入口、底栏 | `pages/index/index.wxml` · `index.wxss` · `index.js` | `home-brand`、`actions`、`foot-links` |
| 「周易」品牌图 | `assets/images/brand-zhouyi.png`（+ svg） | `brand-zhouyi` |
| 首页顶安全区（刘海/胶囊） | `pages/index/index.js` → `updateHomeSafeArea` | — |
| **罗盘盘面结构** | `components/luopan/luopan.wxml` | `luopan-plate` |
| **罗盘样式** | `components/luopan/luopan.wxss` | `.luopan` 段 |
| **罗盘跟手机转 / 指南针** | `components/luopan/luopan.js` → `startCompass` · `queueSensorHeading` · `plateFromHeading` | `applyLiveHeading`、`DeviceOrientation` |
| 罗盘拖动手势 | `luopan.js` → `onPlateTouch*` · `setManualPlate` | `dragMove` |
| 方位助手弹层 | `luopan.wxml` 中 `direction-card` · `luopan.js` 中 `onToggleDirection` | `direction-card` |
| 二十四山 / 八卦位数据 | `luopan.js` 顶部 `MOUNTAIN_NAMES` · `data.bagua` | `MOUNTAIN` |
| 左上角返回首页 | `components/nav-back/`（文案与 `reLaunch` 首页） | 预览顶栏 `#navBack` |
| 左划返回 | `behaviors/swipe-back.js` | — |

### 3.2 所问

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 所问页 UI | `pages/ask/ask.wxml` · `ask.wxss` · `ask.js` | 类别网格、时间网格 |
| **类别 / 约 130 细项** | `utils/ask-options.js` → `ASK_GROUPS` | `listGroups` · `buildAskSelection` |
| **时间范围** | `utils/ask-options.js` → `TIME_SCOPES` | `today` / `week` 等 |
| 问句解析（mode/focus/domain） | `utils/ask.js` → `parseQuestion` · `resolveParsed` | `MODE_LABEL` |
| 领域 / 是否类细分 | `utils/ask-taxonomy.js` → `DOMAINS` · `detectDomain` | |
| 写入全局「当前所问」 | `app.js` → `setPendingAsk` / `getPendingAsk` | storage: `liuyao_pending_ask` |

### 3.3 六爻卜卦 / 铜钱

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 卜卦页 UI · 摇卦按钮 | `pages/cast/cast.wxml` · `cast.wxss` · `cast.js` | `shake` · `coin-stage` |
| 铜钱正反面图 | `assets/coins/qianlong-yang.jpg` · `qianlong-yin.jpg` | |
| **三钱算法 6/7/8/9** | `utils/coin.js` → `tossThreeCoins` · `fromScore` · `manualYao` | |
| 六次成卦后保存 | `cast.js` + `app.js` → `setLastCast` | |

### 3.4 排盘

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 排盘页展示 | `pages/result/result.wxml` · `result.js` | 本卦/变卦表 |
| **排盘主入口** | `utils/paipan.js` → `arrangeCast` | |
| 世应 · 八宫 | `paipan.js` → `findPalace` · `buildGuaDetail` | `data/bagua.js` 中 `PALACES` · `SHI_POS` |
| 纳甲 · 六亲 · 六神 | `paipan.js` → `najiaAt` · `liuqinOf` · `buildLiushen` | `data/bagua.js` 中 `NAJIA` · `LIUSHEN` |
| 伏神 | `paipan.js` → `findFushen` | |
| 动化信息（生克进退） | `paipan.js` → `attachChangeInfo` + `utils/rules.js` | `analyzeChange` · `huaJinTui` |
| 「如何排出此卦」说明文 | `paipan.js` → `buildPaipanGuide` | |
| 卦名 64 表 | `data/bagua.js` → `GUA64_NAMES` | |
| 卦辞象辞 | `data/guaci.js` → `getGuaCi` · `GUA64_CI` | |

### 3.5 断卦（六爻）

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 断卦页 UI | `pages/interpret/interpret.*` | |
| **断卦总入口** | `utils/duangu.js` → `interpret(cast, topicKey)` | |
| 用神类别表 | `duangu.js` → `TOPIC_YONGSHEN` | `guessTopicKey` |
| 吉凶/判断骨架 | `duangu.js` → `buildJudgment` | |
| 叙事深读 / 分区标题 | `duangu.js` → `buildDeepReading` · `buildConciseSections` · `adviceNarrative` | |
| 所问答复话术 | `utils/ask.js` → `directReply` · `yesNoAdvice` · 安全边界 | `safetyAdvice` |
| 冲合 · 月破 · 三合 · 应期 | `utils/rules.js` | `fanFuYin` · `dayMonthFlags` · `suggestYingqi` |
| 干支历 · 旬空 · 旺衰 | `utils/ganzhi.js` → `buildCalendar` · `wangshuaiOf` | |

### 3.6 梅花

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 起卦 UI | `pages/meihua/meihua.*` | |
| 结果 UI | `pages/meihua-result/meihua-result.*` | |
| **报数起卦** | `utils/meihua.js` → `castByNumbers` | |
| **时间起卦（农历）** | `meihua.js` → `castByTime` · `solarToLunar` | |
| 随机起卦 | `meihua.js` → `castByRandom` | |
| 体用生克 | `meihua.js` → `resolveTiYong` · `tiYongVerdict` | |
| 本 / 互 / 变 | `meihua.js` → `buildHuGua` · `buildBianGua` | |
| 梅花断语组装 | `meihua.js` → `buildAskJudgment` · `buildGuide` | |

### 3.7 研习 / 账户 / 历史

| 你想改… | 先打开 | 关键符号 |
|---------|--------|----------|
| 研习目录 | `pages/learn/learn.*` | `groupByCategory` |
| 研习正文渲染 | `pages/learn-detail/learn-detail.*` | `getArticle` |
| **文稿内容** | `data/learning.js` · `data/learning-extra.js` | `ARTICLES` · `EXTRA_ARTICLES` |
| 文稿插图组件 | `components/learn-figure/` | |
| 历史列表 | `pages/history/history.*` | storage `liuyao_history` |
| 账户登录 / 资料 | `pages/account/account.*` · `utils/auth.js` | `loginWithWeChat` |

### 3.8 全局视觉 / 工程

| 你想改… | 先打开 |
|---------|--------|
| 全局色 · 按钮 · 字体 | `app.wxss` |
| 篆体注册 | `app.js` → `wx.loadFontFace` · `assets/fonts/` |
| 页面列表 / 权限文案 | `app.json` |
| 上架文案 | `STORE-LISTING.md` |
| 准确性说明 | `ACCURACY-AUDIT.md` |

---

## 4. 问题速查（现象 → 文件）

| 现象 / 用户说法 | 先查 |
|-----------------|------|
| 罗盘不跟手机转 | `components/luopan/luopan.js`（`startCompass` / `startMotionFallback` / `queueSensorHeading`） |
| 罗盘自己慢慢转 | 已移除装饰自转；确认无旧缓存；检索 `plateAutoSpin` 应不存在 |
| 顶部度数不对 | `luopan.js` → `hudFromHeading` · `plateFromHeading` |
| 所问类别不对 / 缺选项 | `utils/ask-options.js` → `ASK_GROUPS` |
| 断语不回扣所问 | `utils/ask.js` → `parseQuestion`；`duangu.js` → `interpret` |
| 用神取错（官鬼/妻财） | `duangu.js` → `TOPIC_YONGSHEN` |
| 日柱 / 月柱 / 空亡错 | `utils/ganzhi.js` → `buildCalendar` |
| 变卦六亲不对 | `paipan.js` → `applyBenPalaceLiuqin` |
| 铜钱 老阳/老阴 错 | `utils/coin.js` → `fromScore` |
| 梅花体用吉凶反了 | `meihua.js` → `tiYongVerdict` |
| 历史丢了 / 清不掉 | `app.js` · `pages/history` · key `liuyao_history` |
| 登录态丢了 | `utils/auth.js` · keys `liuyao_account_v2` / `liuyao_session_v2` |
| 网页预览和真机不一致 | 同步改 `preview/liuyao-standalone.html`；跑 `scripts/verify-preview-assets.mjs` |
| 自动化测试挂了 | `tests/core-calculation.test.js` · `ACCURACY-AUDIT.md` |

---

## 5. `utils/` 模块出口一览（API 地图）

| 模块 | 主要导出 | 何时改 |
|------|----------|--------|
| `coin.js` | `tossThreeCoins` · `manualYao` · `fromScore` · `castSixYao` | 摇卦规则 |
| `ganzhi.js` | `buildCalendar` · `getDayPillar` · `getMonthZhi` · `wangshuaiOf` · `isKongWang` | 历法 |
| `paipan.js` | **`arrangeCast`** · `buildPaipanGuide` · `findFushen` · `getGuaName` | 六爻盘 |
| `duangu.js` | **`interpret`** · `TOPIC_YONGSHEN` · `guessTopicKey` | 六爻断 |
| `rules.js` | `analyzeChange` · `fanFuYin` · `huaJinTui` · `dayMonthFlags` · `suggestYingqi` | 细则 |
| `ask-options.js` | `ASK_GROUPS` · `TIME_SCOPES` · `buildAskSelection` · `listGroups` | 所问菜单 |
| `ask.js` | `parseQuestion` · `resolveParsed` · `directReply` · `safety*` | 问句与答复 |
| `ask-taxonomy.js` | `DOMAINS` · `detectDomain` | 领域分类 |
| `meihua.js` | `castByNumbers` · `castByTime` · `castByRandom` · `tiYongVerdict` | 梅花 |
| `auth.js` | `loginWithWeChat` · `loadUser` · `updateProfile` · `logout` | 账户 |

`data/`：

| 模块 | 主要导出 |
|------|----------|
| `bagua.js` | `TRIGRAMS` · `NAJIA` · `PALACES` · `GUA64_NAMES` · `LIUSHEN` · `WUXING_*` |
| `guaci.js` | `GUA64_CI` · `getGuaCi` |
| `learning.js` | `ARTICLES` · `getArticle` · `groupByCategory` · `CATEGORY_*` |
| `learning-extra.js` | `EXTRA_ARTICLES` |

---

## 6. 全局状态与本地存储

### `app.globalData`（`app.js`）

| 字段 | 含义 |
|------|------|
| `lastCast` | 最近六爻完整盘 |
| `lastMeihua` | 最近梅花完整盘 |
| `pendingAsk` | 所问页选中的事项（进卜卦/梅花前） |
| `user` | 当前用户展示对象 |

方法：`setPendingAsk` · `getPendingAsk` · `setLastCast` · `setLastMeihua`

### Storage keys

| Key | 用途 |
|-----|------|
| `liuyao_last_cast` | 最近六爻 |
| `liuyao_last_meihua` | 最近梅花 |
| `liuyao_pending_ask` | 待起卦所问 |
| `liuyao_history` | 历史列表（最多约 50） |
| `liuyao_account_v2` | 账户 |
| `liuyao_session_v2` | 会话 |
| `liuyao_user` | 旧版账户（迁移用） |

---

## 7. 组件明细

| 组件 | 路径 | 属性 / 要点 |
|------|------|-------------|
| 罗盘 | `components/luopan/` | 无装饰自转；`startCompass` + 姿态兜底；`plateDeg` 驱动旋转 |
| 返回 | `components/nav-back/` | 自定义导航返回 |
| 研习图 | `components/learn-figure/` | 文稿 `figure` 块 |

在页面 `*.json` 的 `usingComponents` 中注册。

---

## 8. 预览与同步

| 文件 | 作用 |
|------|------|
| `preview/liuyao-standalone.html` | **主预览**（单文件，手机浏览器可开） |
| `preview/index.html` · `app-preview.js` · `engine*.js` | 另一套预览组装 |
| `scripts/verify-preview-assets.mjs` | 校验字体/铜钱/品牌图 |
| `scripts/prepare-web-preview.mjs` | 拷贝资源到站点 `public/` |

约定：

1. 先改 `pages/` / `components/` / `utils/`  
2. 再改 `preview/liuyao-standalone.html` 对应逻辑  
3. `node scripts/verify-preview-assets.mjs`

本地预览示例：

```text
http://<电脑局域网IP>:8765/liuyao-standalone.html
```

---

## 9. 测试

| 文件 | 覆盖 |
|------|------|
| `tests/core-calculation.test.js` | 铜钱、64 卦排盘、干支样本、所问×时间×断卦结构、梅花 |
| `tests/auth.test.js` | 账户归一化 / 迁移 |

```bash
cd liuyao-miniprogram
node tests/core-calculation.test.js
node tests/auth.test.js
node --check utils/*.js components/*/*.js pages/*/*.js
```

准确性边界说明：`ACCURACY-AUDIT.md`。

---

## 10. 终端快速检索（在 `liuyao-miniprogram` 下）

```bash
# 所问
rg -n "ASK_GROUPS|TIME_SCOPES|buildAskSelection" utils/ask-options.js pages/ask

# 罗盘 / 指南针
rg -n "startCompass|queueSensorHeading|plateDeg|plateFromHeading" components/luopan

# 排盘 / 断卦
rg -n "arrangeCast|buildPaipanGuide" utils/paipan.js
rg -n "function interpret|TOPIC_YONGSHEN|buildJudgment|adviceNarrative" utils/duangu.js

# 梅花
rg -n "castByNumbers|castByTime|tiYongVerdict" utils/meihua.js

# 铜钱
rg -n "tossThreeCoins|fromScore|manualYao" utils/coin.js pages/cast

# 历法
rg -n "buildCalendar|getMonthZhi|solarTerm" utils/ganzhi.js

# 存储
rg -n "liuyao_" app.js utils/auth.js pages/history

# 预览同步点
rg -n "applyLiveHeading|ASK_GROUPS|tossThreeCoins" preview/liuyao-standalone.html
```

---

## 11. 按层改代码的建议顺序

```text
视觉/文案  →  pages/* 或 components/* 的 wxml + wxss
交互接线  →  同目录 .js（setData、跳转、调用 utils）
业务规则  →  utils/*（保持无 wx UI）
静态数据  →  data/*
全局主题  →  app.wxss / app.json
校验      →  tests/* + ACCURACY-AUDIT.md
预览对齐  →  preview/liuyao-standalone.html
```

**边界约定（与 AGENTS/历史约定一致）**

- `utils/`、`data/` 不依赖页面组件  
- 断语须区分演示 / 教学边界；高风险事项走 `ask.js` 安全话术  
- 改规则优先补 `tests/core-calculation.test.js` 断言  

---

## 12. 文档索引

| 文档 | 内容 |
|------|------|
| **CODE_INDEX.md（本文件）** | 改代码定位 |
| `README.md` | 打开方式、功能列表 |
| `ACCURACY-AUDIT.md` | 已核对规则与限制 |
| `STORE-LISTING.md` | 上架名「观变知几」与简介 |
| `design-qa.md` | 设计走查记录 |
| `assets/coins/README.md` | 铜钱图说明 |

---

*维护：新增页面 / 导出 / 存储 key / 关键入口时，在同一 PR 内更新本文件对应小节。*
