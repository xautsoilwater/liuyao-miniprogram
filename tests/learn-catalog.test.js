const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  CATEGORY_ORDER,
  CATEGORY_META,
  groupByCategory,
  volumeAnchorId,
  getArticle
} = require('../data/learning')
const { listGuaDian, filterGuaDian } = require('../data/guaci')

function testVolumeAnchors() {
  assert.deepStrictEqual(
    CATEGORY_ORDER,
    ['开宗', '易理', '象数', '卜卦', '排盘', '断卦', '梅花', '附录'],
    '八卷顺序被改动'
  )
  const groups = groupByCategory()
  assert.strictEqual(groups.length, 8, '目录卷数不是八卷')
  const ids = groups.map((grp) => grp.anchorId)
  assert.deepStrictEqual(
    ids,
    ['learn-vol-1', 'learn-vol-2', 'learn-vol-3', 'learn-vol-4', 'learn-vol-5', 'learn-vol-6', 'learn-vol-7', 'learn-vol-8'],
    '八卷锚点 id 不稳定'
  )
  assert.strictEqual(new Set(ids).size, 8, '八卷锚点 id 不唯一')
  groups.forEach((grp, idx) => {
    const meta = CATEGORY_META[grp.category]
    assert.ok(meta, `${grp.category} 缺少 CATEGORY_META`)
    assert.strictEqual(grp.vol, meta.vol, `${grp.category} 卷号不一致`)
    assert.strictEqual(grp.anchorId, volumeAnchorId(grp.category))
    assert.strictEqual(grp.anchorId, `learn-vol-${idx + 1}`)
    assert.ok(grp.items.length > 0, `${grp.category} 没有篇目`)
  })
}

function testPreviewJumpMarkup() {
  const files = [
    'pages/learn/learn.wxml',
    'preview/app-preview.js',
    'preview/liuyao-standalone.html'
  ]
  files.forEach((rel) => {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    assert.match(text, /八卷跳转/, `${rel} 缺少八卷跳转`)
    assert.match(text, /anchorId|learn-vol-/, `${rel} 缺少卷锚点`)
    assert.match(text, /vol-nav/, `${rel} 缺少卷导航`)
  })
}

function testGuaDianCatalog() {
  const groups = groupByCategory()
  const xiangshu = groups.find((grp) => grp.category === '象数')
  assert.ok(xiangshu, '卷三象数缺失')
  const ids = xiangshu.items.map((item) => item.id)
  const iLue = ids.indexOf('liushisi-gua')
  const iDian = ids.indexOf('gua-dian')
  assert.ok(iLue >= 0, '缺少六十四卦略说')
  assert.strictEqual(iDian, iLue + 1, '卦典应紧随六十四卦略说')
  const article = getArticle('gua-dian')
  assert.ok(article, 'getArticle(gua-dian) 失败')
  assert.strictEqual(article.kind, 'gua-dian')
  assert.strictEqual(article.title, '六十四卦卦典')
  assert.ok(article.blocks && article.blocks.length >= 3, '卦典引言过短')

  const list = listGuaDian()
  assert.strictEqual(list.length, 64, '卦典不是六十四卦')
  assert.strictEqual(list[0].alias, '乾')
  assert.strictEqual(list[29].alias, '离')
  assert.strictEqual(list[30].alias, '咸')
  assert.strictEqual(list[63].alias, '未济')
  list.forEach((g) => {
    assert.ok(g.guaci, `${g.alias} 缺卦辞`)
    assert.strictEqual(g.yaoci.length, 6, `${g.alias} 爻辞不是六条`)
    assert.ok(g.nameWhy, `${g.alias} 缺取象释名`)
    assert.ok(g.palace, `${g.alias} 缺八宫`)
    assert.strictEqual(g.yaoRows.length, 6)
  })
  const qianHits = filterGuaDian(list, { query: '潜龙' })
  assert.ok(qianHits.some((g) => g.alias === '乾'), '检索爻辞/释名未命中乾')
  const shang = filterGuaDian(list, { part: '上经' })
  const xia = filterGuaDian(list, { part: '下经' })
  assert.strictEqual(shang.length, 30)
  assert.strictEqual(xia.length, 34)
  const qianGong = filterGuaDian(list, { palace: '乾' })
  assert.strictEqual(qianGong.length, 8, '乾宫应为八卦')

  const previewFiles = [
    'preview/app-preview.js',
    'preview/liuyao-standalone.html',
    'pages/learn-detail/learn-detail.wxml'
  ]
  previewFiles.forEach((rel) => {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    assert.match(text, /gua-dian|gd-card|listGuaDian/, `${rel} 未接入卦典浏览`)
  })
}

testVolumeAnchors()
testPreviewJumpMarkup()
testGuaDianCatalog()
console.log('learn-catalog: all checks passed')
