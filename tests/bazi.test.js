const assert = require('assert')
const { calculateBazi, getShiShen, getHourPillar } = require('../utils/bazi')

console.log('Testing bazi calculation module...')

// 1. 测试十神逻辑
assert.strictEqual(getShiShen('甲', '甲'), '比肩')
assert.strictEqual(getShiShen('甲', '乙'), '劫财')
assert.strictEqual(getShiShen('甲', '丙'), '食神')
assert.strictEqual(getShiShen('甲', '丁'), '伤官')
assert.strictEqual(getShiShen('甲', '戊'), '偏财')
assert.strictEqual(getShiShen('甲', '己'), '正财')
assert.strictEqual(getShiShen('甲', '庚'), '七杀')
assert.strictEqual(getShiShen('甲', '辛'), '正官')
assert.strictEqual(getShiShen('甲', '壬'), '偏印')
assert.strictEqual(getShiShen('甲', '癸'), '正印')
console.log('✔ 十神推算通过')

// 2. 测试时柱推算 (五鼠遁)
// 假设日干为甲，10:00 (巳时)，应为己巳
const d1 = new Date('2024-05-20T10:00:00')
const hp1 = getHourPillar(d1, '甲')
assert.strictEqual(hp1.zhi, '巳')
assert.strictEqual(hp1.gan, '己')
assert.strictEqual(hp1.text, '己巳')
console.log('✔ 五鼠遁日上起时通过')

// 3. 测试完整排盘
const res = calculateBazi({
  birthDate: new Date('1995-10-24T10:30:00'),
  gender: '男'
})

assert.strictEqual(res.genderLabel, '乾造')
assert.strictEqual(res.pillars.length, 4)
assert(res.pillars[0].nayin, '年柱必须有纳音')
assert(res.pillars[2].shishen, '日柱必须有日主')
assert(res.energy.percents.金 !== undefined, '必须有五行百分比')
assert(res.dayun.list.length === 8, '大运必须有8步')
assert(res.interpretation.length >= 6, '必须有六维明理断解')

console.log('✔ 完整排盘与大运断解全部通过')
console.log('排盘样例:', res.summary)
console.log('五行能量:', res.energy.percents)
console.log('格局喜忌:', res.analysis.pattern, '喜:', res.analysis.xi.join(','), '忌:', res.analysis.ji.join(','))
