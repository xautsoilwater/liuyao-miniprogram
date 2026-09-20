const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  CATEGORY_ORDER,
  CATEGORY_META,
  groupByCategory,
  volumeAnchorId
} = require('../data/learning')

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

testVolumeAnchors()
testPreviewJumpMarkup()
console.log('learn-catalog: all checks passed')
