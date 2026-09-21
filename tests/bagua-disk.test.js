const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  TRIGRAMS,
  XIANTIAN_LAYOUT,
  HOUTIAN_LAYOUT,
  buildBaguaDisk
} = require('../data/bagua')
const { EXTRA_ARTICLES } = require('../data/learning-extra')
const { ARTICLES } = require('../data/learning')

const COMPASS_KEYS = ['xiantian-bagua', 'houtian-bagua', 'bagua', 'bagua-table']

function testOrientations() {
  const xianExpect = { qian: 0, xun: 45, kan: 90, gen: 135, kun: 180, zhen: 225, li: 270, dui: 315 }
  const houExpect = { li: 0, kun: 45, dui: 90, qian: 135, kan: 180, gen: 225, zhen: 270, xun: 315 }
  const toMap = (layout) => Object.fromEntries(layout.map((item) => [item.key, item.deg]))
  assert.deepStrictEqual(toMap(XIANTIAN_LAYOUT), xianExpect, '先天方位与约定不符')
  assert.deepStrictEqual(toMap(HOUTIAN_LAYOUT), houExpect, '后天方位与约定不符')

  const xian = buildBaguaDisk('xiantian')
  const hou = buildBaguaDisk('houtian')
  assert.strictEqual(xian.title, '先天')
  assert.strictEqual(hou.title, '后天')
  xian.bagua.forEach((gua) => {
    assert.deepStrictEqual(gua.lines, TRIGRAMS[gua.key].lines, `${gua.name} 爻画未取自 TRIGRAMS.lines`)
    assert.strictEqual(gua.deg, xianExpect[gua.key])
  })
  hou.bagua.forEach((gua) => {
    assert.deepStrictEqual(gua.lines, TRIGRAMS[gua.key].lines, `${gua.name} 爻画未取自 TRIGRAMS.lines`)
    assert.strictEqual(gua.deg, houExpect[gua.key])
  })
  const qian = xian.bagua.find((g) => g.key === 'qian')
  const kun = xian.bagua.find((g) => g.key === 'kun')
  const li = hou.bagua.find((g) => g.key === 'li')
  const kan = hou.bagua.find((g) => g.key === 'kan')
  assert.deepStrictEqual(qian.lines, [1, 1, 1])
  assert.deepStrictEqual(kun.lines, [0, 0, 0])
  assert.deepStrictEqual(li.lines, [1, 0, 1])
  assert.deepStrictEqual(kan.lines, [0, 1, 0])
  assert.strictEqual(qian.ccw, 0)
  assert.strictEqual(kan.ccw, -180)
  assert.strictEqual(qian.tip, '天金', '乾应并写象与五行，去掉间隔点')
  assert.strictEqual(li.tip, '火', '离火象五行相同，只保留一字以免撞盘')
}

function testArticleKeys() {
  const article = EXTRA_ARTICLES.find((a) => a.id === 'xian-hou-tian')
  assert.ok(article, '缺少先天后天详解篇')
  const keys = article.blocks.filter((b) => b.type === 'figure').map((b) => b.key)
  assert.ok(keys.includes('xiantian-bagua'), '文章未引用 xiantian-bagua')
  assert.ok(keys.includes('houtian-bagua'), '文章未引用 houtian-bagua')
  assert.ok(keys.includes('bagua-table'), '文章未引用 bagua-table 对照')
}

function testComponentWiring() {
  const root = path.join(__dirname, '..')
  const js = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.js'), 'utf8')
  const wxml = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.wxml'), 'utf8')
  const wxss = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.wxss'), 'utf8')
  assert.match(js, /buildBaguaDisk/, 'learn-figure.js 未接入 buildBaguaDisk')
  assert.match(js, /disks:/, 'learn-figure.js 未写入 disks 数据')
  assert.match(wxml, /wx:for="\{\{disks\}\}"/, 'WXML 未循环 disks')
  assert.match(wxml, /gua\.lines\[2\]/, 'WXML 未用 lines 画上爻')
  assert.match(wxml, /lf-bar/, 'WXML 未使用 lf-bar')
  assert.match(wxml, /lf-tick/, 'WXML 未使用刻度')
  assert.match(wxml, /lf-spoke/, 'WXML 未使用辐条')
  assert.doesNotMatch(wxml, /☰|☱|☲|☳|☴|☵|☶|☷/, 'WXML 仍以 unicode 卦符作主图')
  assert.doesNotMatch(wxml, /lf-core-title/, '盘心不应再写先天/后天')
  assert.match(wxml, /lf-gua-meta/, '卦名下应保留象与数')
  assert.match(wxml, /rotate\(\{\{gua\.ccw\}\}deg\)/, '卦签须回正，避免东西侧横躺')
  assert.match(wxml, /translateY\(calc\(var\(--yt\) \* -0\.32\)\)/, '卦签应落在中外环，勿挤太极')
  assert.match(wxml, /lf-legend/, '盘外仍需图例标明先后天')
  assert.match(wxml, /lf-dirs/, '方位层应独立于盘面')
  assert.match(wxml, /deg-\{\{dir\.deg\}\}/, '方位应按 deg 锚定在盘外')
  const plateIdx = wxml.indexOf('class="lf-plate"')
  const dirsIdx = wxml.indexOf('class="lf-dirs"')
  const southIdx = wxml.indexOf('class="lf-south"')
  assert.ok(dirsIdx >= 0 && dirsIdx < plateIdx, '东南西北应在 lf-plate 外侧')
  assert.ok(southIdx >= 0 && southIdx < plateIdx, '南针 ▲ 应在 lf-plate 外侧')
  assert.match(wxss, /\.lf-disk\s*\{/, 'WXSS 缺少 .lf-disk')
  assert.match(wxss, /--yt:\s*70vw/, '单盘直径应为 70vw（界面/视口宽 70%）')
  assert.doesNotMatch(wxss, /--yt:\s*488rpx/, '旧 488rpx 直径应已替换')
  assert.match(wxss, /overflow:\s*visible/, '盘外图例/光晕不应被裁切')
  assert.match(wxss, /\.lf-dir-lab\.deg-0/, '南应锚定在盘外上方')
  assert.match(wxss, /calc\(-100%\s*-\s*22rpx\)/, '方位字须离开盘缘')
  assert.match(wxss, /rotate\(0deg\)/, '东南西北须强制正立')
  assert.match(wxss, /writing-mode:\s*horizontal-tb/, '方位字不得竖排/侧躺')
  assert.match(wxss, /font-size:\s*34rpx/, '卦名应放大')
  assert.match(wxss, /font-size:\s*22rpx/, '象·五行应放大')
  assert.match(wxss, /font-size:\s*26rpx/, '盘内数字应放大')
  assert.match(wxss, /width:\s*52rpx/, '爻画应保持可读宽度')
  assert.match(wxss, /\.lf-gua-meta\s*\{[\s\S]*?flex-direction:\s*column/, '象与数应纵向叠放，避免横向撞字')
  assert.match(wxss, /\.lf-bar\.is-yin/, 'WXSS 缺少阴爻分段样式')
  assert.match(wxss, /\.lf-tick\.major/, 'WXSS 缺少主刻度')
}

function testPreviewWiring() {
  const files = [
    'preview/app-preview.js',
    'preview/liuyao-standalone.html',
    'preview/index.html'
  ]
  files.forEach((rel) => {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    assert.match(text, /lf-disk/, `${rel} 缺少盘面标记`)
    assert.match(text, /lf-bar/, `${rel} 缺少爻画标记`)
    if (rel !== 'preview/index.html') {
      assert.match(text, /xiantian-bagua/, `${rel} 未处理 xiantian-bagua`)
      assert.match(text, /houtian-bagua/, `${rel} 未处理 houtian-bagua`)
      assert.match(text, /buildBaguaDiskHtml/, `${rel} 缺少盘面 HTML 构建`)
      assert.doesNotMatch(text, /lf-core-title/, `${rel} 盘心仍写先天/后天`)
      assert.match(text, /lf-gua-meta/, `${rel} 未保留卦内象与数`)
      assert.match(text, /translateY\(calc\(var\(--yt\) \* -0\.32\)\)/, `${rel} 卦签未放到中外环`)
      assert.match(text, /rotate\(\$\{ccw\}deg\)|rotate\(\$\{gua\.ccw\}deg\)/, `${rel} 卦签未回正`)
      assert.match(text, /lf-dirs/, `${rel} 方位层应独立于盘面`)
      assert.match(text, /deg-\$\{dir\.deg\}/, `${rel} 方位未按 deg 放到盘外`)
      const plateIdx = text.indexOf('<div class="lf-plate">')
      const dirsIdx = text.indexOf('<div class="lf-dirs">')
      assert.ok(dirsIdx >= 0 && dirsIdx < plateIdx, `${rel} 东南西北仍在盘内`)
    }
    if (rel !== 'preview/app-preview.js') {
      assert.match(text, /min\(393px,\s*100vw\)\s*\*\s*0\.7/, `${rel} 单盘直径应为界面/视口宽 70%`)
      assert.doesNotMatch(text, /--yt:\s*244px/, `${rel} 旧 244px 直径应已替换`)
      assert.match(text, /overflow:\s*visible/, `${rel} 盘外图例不应被裁切`)
      assert.match(text, /\.lf-gua-meta\s*\{[^}]*flex-direction:\s*column/, `${rel} 象与数应纵向叠放`)
      assert.match(text, /writing-mode:\s*horizontal-tb/, `${rel} 方位字不得竖排`)
      assert.match(text, /rotate\(0deg\)/, `${rel} 东南西北须强制正立`)
    }
  })
  const standalone = fs.readFileSync(path.join(__dirname, '..', 'preview/liuyao-standalone.html'), 'utf8')
  const previewJs = fs.readFileSync(path.join(__dirname, '..', 'preview/app-preview.js'), 'utf8')
  ;['今日吉位', '点中间八卦', '八卷跳转'].forEach((token) => {
    assert.match(standalone, new RegExp(token), `standalone 丢失 ${token}`)
    assert.match(previewJs, new RegExp(token), `app-preview.js 丢失 ${token}`)
  })
}

function collectCompassFigures() {
  const rows = []
  ARTICLES.forEach((article) => {
    ;(article.blocks || []).forEach((block) => {
      if (block.type === 'figure' && COMPASS_KEYS.includes(block.key)) {
        rows.push({
          key: block.key,
          id: article.id,
          title: article.title,
          caption: block.caption || ''
        })
      }
    })
  })
  return rows
}

function testAllCompassFiguresShareDisk() {
  const rows = collectCompassFigures()
  assert.ok(rows.length >= 12, `研习罗盘图过少：只扫到 ${rows.length} 处`)
  const used = new Set(rows.map((row) => row.key))
  COMPASS_KEYS.forEach((key) => {
    assert.ok(used.has(key), `文稿未再引用 ${key}，盘点清单需更新`)
  })
  rows.forEach((row) => {
    assert.ok(COMPASS_KEYS.includes(row.key), `${row.title} 的 ${row.key} 未纳入共享盘面`)
  })

  const root = path.join(__dirname, '..')
  const js = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.js'), 'utf8')
  const wxml = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.wxml'), 'utf8')
  const previewJs = fs.readFileSync(path.join(root, 'preview/app-preview.js'), 'utf8')
  COMPASS_KEYS.forEach((key) => {
    assert.match(js, new RegExp(key === 'bagua' ? 'bagua:' : `'${key}'`), `learn-figure.js 未把 ${key} 接入 DISK_KEYS`)
    assert.match(wxml, new RegExp(key), `WXML 未处理 ${key}`)
  })
  assert.match(previewJs, /key === 'xiantian-bagua'/, '预览未处理 xiantian-bagua')
  assert.match(previewJs, /houtian-bagua' \|\| key === 'bagua'/, '预览未把 bagua / houtian-bagua 接到同一盘面')
  assert.match(previewJs, /key === 'bagua-table'/, '预览未处理 bagua-table')
  assert.doesNotMatch(
    previewJs,
    /key === 'bagua'[\s\S]{0,200}fig-bagua/,
    '预览仍用旧 fig-bagua 文字环画 bagua'
  )
  assert.doesNotMatch(wxml, /fig-bagua/, '小程序不应再保留旧文字环')
}

function collectAllFigureKeys() {
  const keys = new Set()
  ARTICLES.forEach((article) => {
    ;(article.blocks || []).forEach((block) => {
      if (block && block.type === 'figure' && block.key) keys.add(block.key)
    })
  })
  return keys
}

function testEveryFigureKeyHasRenderer() {
  const keys = collectAllFigureKeys()
  assert.ok(keys.size >= 20, `研习插图种类过少：只扫到 ${keys.size} 种`)

  const root = path.join(__dirname, '..')
  const wxml = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.wxml'), 'utf8')
  const js = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.js'), 'utf8')
  const wxss = fs.readFileSync(path.join(root, 'components/learn-figure/learn-figure.wxss'), 'utf8')
  const previewJs = fs.readFileSync(path.join(root, 'preview/app-preview.js'), 'utf8')
  const previewHtml = fs.readFileSync(path.join(root, 'preview/index.html'), 'utf8')
  const standalone = fs.readFileSync(path.join(root, 'preview/liuyao-standalone.html'), 'utf8')

  const MISSING_BEFORE = ['bagua-grid', 'wuxing', 'neiwai', 'hugua', 'vols8', 'steps6']
  MISSING_BEFORE.forEach((key) => {
    assert.ok(keys.has(key), `文稿应引用 ${key}（boost 补图）`)
  })

  keys.forEach((key) => {
    assert.match(wxml, new RegExp(`name==='${key}'`), `小程序 WXML 未给 ${key} 专属分支，会落到☯`)
    assert.match(previewJs, new RegExp(`key === '${key}'`), `预览未给 ${key} 专属分支，会落到☯`)
    assert.match(standalone, new RegExp(`key === '${key}'`), `standalone 未给 ${key} 专属分支`)
  })

  assert.match(js, /baguaGrid:/, 'learn-figure.js 未准备 bagua-grid 数据')
  assert.match(js, /vols8:/, 'learn-figure.js 未准备 vols8 数据')
  assert.match(js, /steps6:/, 'learn-figure.js 未准备 steps6 数据')
  assert.match(js, /wuxing:/, 'learn-figure.js 未准备 wuxing 数据')
  assert.match(wxml, /fig-stage \{\{showDisks \? 'is-disk' : ''\}\}/, '只有罗盘图才应加 is-disk 内边距')
  assert.match(wxss, /\.fig-stage\.is-disk/, 'WXSS 缺少盘面专用内边距')
  assert.match(wxss, /\.taiji \.yang/, '太极阴阳色应限定在 .taiji，避免涂掉爻画')
  assert.match(wxss, /\.bg-grid/, 'WXSS 缺少八卦格')
  assert.match(wxss, /\.wx-cycle/, 'WXSS 缺少五行环')
  assert.match(wxml, /wx-cycle/, 'WXML 未画五行环')
  assert.match(previewJs, /fig-wx-cycle/, '预览未画五行环')
  assert.doesNotMatch(wxml, /gua-big">☯/, 'fallback 不应再用 ☯ 表情，手机上会变成紫色太极方块')
  assert.doesNotMatch(previewJs, /fig-fallback">☯/, '预览 fallback 不应再用 ☯ 表情')
  assert.match(wxss, /\.nw \{/, 'WXSS 缺少内外图')
  assert.match(wxss, /\.hg \{/, 'WXSS 缺少互卦图')
  assert.match(previewJs, /DISK_FIGURE_KEYS/, '预览未标记盘面 fig.is-disk')
  assert.match(previewJs, /buildBaguaGridHtml/, '预览未实现 bagua-grid')
  assert.match(previewHtml, /\.fig\.is-disk/, '预览 CSS 缺少盘面专用内边距')
  assert.match(previewHtml, /\.fig-bg-grid/, '预览 CSS 缺少八卦格')
  assert.match(previewHtml, /\.fig-wx-cycle/, '预览 CSS 缺少五行环')
  assert.match(previewHtml, /\.fig-nw/, '预览 CSS 缺少内外图')
  assert.match(previewHtml, /\.fig-hg/, '预览 CSS 缺少互卦图')
  assert.match(standalone, /\.fig\.is-disk/, 'standalone CSS 缺少盘面专用内边距')
  assert.match(standalone, /\.fig-bg-grid/, 'standalone CSS 缺少八卦格')
}

testOrientations()
testArticleKeys()
testComponentWiring()
testPreviewWiring()
testAllCompassFiguresShareDisk()
testEveryFigureKeyHasRenderer()
console.log('bagua-disk: all checks passed')
