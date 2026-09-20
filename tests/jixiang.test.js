const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { luckyByGan, buildLuckyDirections, XI_SHEN, CAI_SHEN, FU_SHEN } = require('../utils/jixiang')

function testGanSong() {
  const xi = luckyByGan('甲')
  assert.deepStrictEqual(
    xi.map((item) => [item.label, item.dir, item.gua]),
    [['福神', '正北', '坎'], ['喜神·财神', '东北', '艮']],
    '甲日喜财同在艮、福神正北'
  )

  const yi = luckyByGan('乙')
  assert.deepStrictEqual(
    yi.map((item) => [item.label, item.dir, item.gua]),
    [['财神·福神', '西南', '坤'], ['喜神', '西北', '乾']],
    '乙日财福同在坤、喜神西北'
  )

  Object.keys(XI_SHEN).forEach((gan) => {
    const marks = luckyByGan(gan)
    const gods = marks.flatMap((item) => item.gods).sort()
    assert.deepStrictEqual(gods, ['喜神', '福神', '财神'].sort(), `${gan}日三神不全`)
    assert.strictEqual(marks[0].compass <= marks[marks.length - 1].compass, true)
    const xiHit = marks.find((item) => item.gods.includes('喜神'))
    const caiHit = marks.find((item) => item.gods.includes('财神'))
    const fuHit = marks.find((item) => item.gods.includes('福神'))
    assert.ok(xiHit && caiHit && fuHit)
    assert.strictEqual(xiHit.gua, require('../utils/jixiang').DIR[XI_SHEN[gan]].gua)
    assert.strictEqual(caiHit.gua, require('../utils/jixiang').DIR[CAI_SHEN[gan]].gua)
    assert.strictEqual(fuHit.gua, require('../utils/jixiang').DIR[FU_SHEN[gan]].gua)
  })
}

function testBuildLuckyDirections() {
  const pack = buildLuckyDirections(new Date(2026, 8, 20, 12, 0, 0))
  assert.ok(pack.gan && pack.zhi && pack.dayText === `${pack.gan}${pack.zhi}`)
  assert.ok(pack.summary.includes('神'))
  assert.ok(pack.marks.length >= 1)
  assert.ok(pack.marks.every((item) => item.label && item.dir && Number.isFinite(item.plateDeg)))
}

function testPreviewStrings() {
  const files = [
    'preview/app-preview.js',
    'preview/liuyao-standalone.html'
  ]
  files.forEach((rel) => {
    const text = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')
    assert.ok(text.includes('今日吉位'), `${rel} 缺少 今日吉位`)
    assert.ok(text.includes('点中间八卦'), `${rel} 缺少 点中间八卦`)
    assert.ok(text.includes('data-lucky-toggle'), `${rel} 缺少中间八卦点击热区`)
    assert.ok(text.includes('八卷跳转'), `${rel} 缺少八卷跳转`)
    assert.ok(!text.includes('方位助手'), `${rel} 仍含方位助手`)
    assert.ok(!text.includes('id="compass-info"'), `${rel} 仍含方位按钮`)
    assert.ok(!text.includes('id="compass-lock"'), `${rel} 仍含锁定按钮`)
  })
}

function testLuopanControlsRemoved() {
  const root = path.join(__dirname, '..')
  const wxml = fs.readFileSync(path.join(root, 'components/luopan/luopan.wxml'), 'utf8')
  const js = fs.readFileSync(path.join(root, 'components/luopan/luopan.js'), 'utf8')
  assert.ok(!wxml.includes('方位助手'), 'luopan.wxml 仍含方位助手')
  assert.ok(!wxml.includes('onToggleDirection'), 'luopan.wxml 仍含 onToggleDirection')
  assert.ok(!wxml.includes('onToggleLock'), 'luopan.wxml 仍含 onToggleLock')
  assert.ok(!js.includes('onToggleDirection'), 'luopan.js 仍含 onToggleDirection')
  assert.ok(!js.includes('onToggleLock'), 'luopan.js 仍含 onToggleLock')
  assert.ok(!js.includes('方位助手'), 'luopan.js 仍含方位助手')
}

function testLuopanWuxingStripRemoved() {
  const root = path.join(__dirname, '..')
  const wxml = fs.readFileSync(path.join(root, 'components/luopan/luopan.wxml'), 'utf8')
  const js = fs.readFileSync(path.join(root, 'components/luopan/luopan.js'), 'utf8')
  const wxss = fs.readFileSync(path.join(root, 'components/luopan/luopan.wxss'), 'utf8')
  assert.ok(!wxml.includes('wx-row'), 'luopan.wxml 仍含五行条 wx-row')
  assert.ok(!wxml.includes('wx-item'), 'luopan.wxml 仍含五行条 wx-item')
  assert.ok(!wxml.includes('wx-name'), 'luopan.wxml 仍含五行条 wx-name')
  assert.ok(!js.includes("wx: '木'"), 'luopan.js 仍含五行条数据')
  assert.ok(!wxss.includes('.wx-row'), 'luopan.wxss 仍含五行条样式')
  assert.ok(!wxss.includes('.wx-item'), 'luopan.wxss 仍含 .wx-item')
  ;['preview/app-preview.js', 'preview/liuyao-standalone.html'].forEach((rel) => {
    const text = fs.readFileSync(path.join(root, rel), 'utf8')
    assert.ok(!text.includes('const wxRow'), `${rel} 仍含罗盘下五行条 wxRow`)
    assert.ok(!text.includes("const wuxing = ['木', '火', '土', '金', '水']"), `${rel} 仍含罗盘下五行数组`)
  })
}

testGanSong()
testBuildLuckyDirections()
testPreviewStrings()
testLuopanControlsRemoved()
testLuopanWuxingStripRemoved()
console.log('jixiang: all checks passed')
