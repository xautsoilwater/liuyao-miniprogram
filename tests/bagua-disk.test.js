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
  assert.match(wxss, /\.lf-disk\s*\{/, 'WXSS 缺少 .lf-disk')
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
    }
  })
  const standalone = fs.readFileSync(path.join(__dirname, '..', 'preview/liuyao-standalone.html'), 'utf8')
  const previewJs = fs.readFileSync(path.join(__dirname, '..', 'preview/app-preview.js'), 'utf8')
  ;['今日吉位', '点中间八卦', '八卷跳转'].forEach((token) => {
    assert.match(standalone, new RegExp(token), `standalone 丢失 ${token}`)
    assert.match(previewJs, new RegExp(token), `app-preview.js 丢失 ${token}`)
  })
}

testOrientations()
testArticleKeys()
testComponentWiring()
testPreviewWiring()
console.log('bagua-disk: all checks passed')
