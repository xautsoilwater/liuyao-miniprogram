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
  })
}

testGanSong()
testBuildLuckyDirections()
testPreviewStrings()
console.log('jixiang: all checks passed')
