const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { buildPalaceCatalog, getGuaXiangjie, STAGE } = require('../data/gua64-xiangjie')

function testPalaceCatalog() {
  const palaces = buildPalaceCatalog()
  assert.strictEqual(palaces.length, 8, '八宫数量不对')
  palaces.forEach((p) => {
    assert.ok(p.title, `${p.key} 缺宫名`)
    assert.strictEqual((p.guas || []).length, 8, `${p.title} 不是八卦`)
    p.guas.forEach((g) => {
      assert.ok(g.alias, `${p.title} 缺卦名`)
      assert.strictEqual((g.yaoView || []).length, 6, `${g.alias} 爻画不是六爻`)
    })
  })
  const qian = palaces.find((p) => p.key === 'qian')
  assert.ok(qian, '缺乾宫')
  assert.strictEqual(qian.guas[0].alias, '乾')
  assert.deepStrictEqual(STAGE, ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'])
}

function testXiangjie() {
  const qian = getGuaXiangjie('乾')
  assert.ok(qian, 'getGuaXiangjie(乾) 失败')
  assert.ok(qian.guaci, '乾缺卦辞')
  assert.ok(qian.plainGuaci, '乾缺卦辞解释')
  assert.ok(qian.plainYili, '乾缺义理')
  assert.ok(qian.plainZhan && qian.plainZhan.length, '乾缺占事')
  assert.strictEqual((qian.yaoBoard || []).length, 6, '乾爻板不是六爻')
  assert.ok(qian.xiangExplain, '乾缺取象')
  const kun = getGuaXiangjie('坤')
  assert.ok(kun && kun.alias === '坤')
}

function testPreviewShell() {
  const files = [
    'preview/app-preview.js',
    'preview/liuyao-standalone.html',
    'preview/index.html'
  ]
  files.forEach((rel) => {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    assert.match(text, /guadian/, `${rel} 缺少 guadian 路由/样式`)
    if (rel === 'preview/index.html' || rel === 'preview/liuyao-standalone.html') {
      assert.match(text, /min\(86vw,\s*352px\)/, `${rel} 罗盘尺寸未恢复`)
    }
    if (rel !== 'preview/index.html') {
      assert.match(text, /renderGuadian/, `${rel} 未接入卦典总图`)
      assert.match(text, /renderGuadianDetail/, `${rel} 未接入单卦详解`)
      assert.match(text, /openGuadianBanner/, `${rel} 缺少八宫横幅`)
      assert.match(text, /今日吉位/, `${rel} 缺少今日吉位`)
      assert.match(text, /点中间八卦/, `${rel} 缺少点中间八卦`)
      assert.match(text, /八卷跳转/, `${rel} 缺少八卷跳转`)
      const banners = text.match(/gb-title">六十四卦卦典/g) || []
      assert.strictEqual(banners.length, 1, `${rel} 卦典横幅应只出现一次`)
    }
  })
  const standalone = fs.readFileSync(path.join(__dirname, '..', 'preview/liuyao-standalone.html'), 'utf8')
  assert.match(standalone, /gua64-xiangjie/, 'standalone 未打包 gua64-xiangjie')
  assert.match(standalone, /buildPalaceCatalog/, 'standalone 未导出 buildPalaceCatalog')
}

testPalaceCatalog()
testXiangjie()
testPreviewShell()
console.log('guadian-palace: all checks passed')
