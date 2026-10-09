const assert = require('assert')
const fs = require('fs')
const path = require('path')
const {
  solarToLunar,
  lunarToSolar,
  formatLunarDate,
  listLunarMonths,
  getLunarPickerState,
  resolveBirthInstant
} = require('../utils/calendar')
const { calculateBazi } = require('../utils/bazi')
const { solarToLunar: meihuaSolarToLunar } = require('../utils/meihua')

console.log('Testing lunar/solar calendar conversion...')

assert.deepStrictEqual(solarToLunar(new Date(2026, 6, 30, 12)), {
  year: 2026, month: 6, day: 17, isLeap: false
}, '2026-07-30 农历换算错误')
assert.deepStrictEqual(solarToLunar(new Date(2026, 1, 17, 12)), {
  year: 2026, month: 1, day: 1, isLeap: false
}, '2026 春节农历换算错误')
assert.strictEqual(
  meihuaSolarToLunar(new Date(2026, 6, 30, 12)).day,
  17,
  '梅花模块应继续导出同一套农历换算'
)
console.log('✔ 公历转农历样本通过')

function assertRoundtrip(date) {
  const lunar = solarToLunar(date)
  const solar = lunarToSolar(lunar)
  assert.strictEqual(solar.year, date.getFullYear(), `${date.toDateString()} 回转到年失败`)
  assert.strictEqual(solar.month, date.getMonth() + 1, `${date.toDateString()} 回转到月失败`)
  assert.strictEqual(solar.day, date.getDate(), `${date.toDateString()} 回转到日失败`)
}

;[
  new Date(1995, 9, 24),
  new Date(1900, 0, 31),
  new Date(2020, 3, 23),
  new Date(2023, 2, 22),
  new Date(2026, 6, 30),
  new Date(2100, 11, 20)
].forEach(assertRoundtrip)

const cursor = new Date(2023, 0, 22)
const end = new Date(2023, 11, 31)
while (cursor <= end) {
  assertRoundtrip(cursor)
  cursor.setDate(cursor.getDate() + 1)
}
console.log('✔ 农历公历往返换算通过')

const leapSample = solarToLunar(new Date(2023, 2, 22))
assert.strictEqual(leapSample.isLeap, true, '2023-03-22 应为闰二月初一')
assert.strictEqual(leapSample.month, 2, '2023 闰月应为二月')
assert.strictEqual(leapSample.day, 1, '2023-03-22 应为闰月初一')
assert.strictEqual(formatLunarDate(leapSample), '2023年闰二月初一')
assert.throws(
  () => lunarToSolar({ year: 2022, month: 2, day: 1, isLeap: true }),
  /该年无此闰月/
)
const leapMonths = listLunarMonths(2023)
assert.ok(leapMonths.some((item) => item.isLeap && item.month === 2 && item.label === '闰二月'))
console.log('✔ 闰月换算与文案通过')

const picker = getLunarPickerState({ year: 2023, month: 2, day: 1, isLeap: true })
assert.strictEqual(picker.lunar.isLeap, true)
assert.ok(picker.months[picker.indexes[1]].isLeap)
const clamped = getLunarPickerState({ year: 2022, month: 2, day: 1, isLeap: true })
assert.strictEqual(clamped.lunar.isLeap, false, '无闰之年应回落到普通二月')
console.log('✔ 农历选择器闰月夹取通过')

const solarBirth = resolveBirthInstant({
  calendarType: 'solar',
  solarDate: '1995-10-24',
  time: '09:30'
})
assert.strictEqual(solarBirth.solarText, '1995-10-24')
assert.ok(solarBirth.lunarText.includes('1995年'))
const lunarBirth = resolveBirthInstant({
  calendarType: 'lunar',
  lunar: solarBirth.lunar,
  time: '09:30'
})
assert.strictEqual(lunarBirth.solarText, '1995-10-24')
assert.strictEqual(lunarBirth.date.getHours(), 9)
assert.strictEqual(lunarBirth.date.getMinutes(), 30)

const solarBazi = calculateBazi({ birthDate: solarBirth.date, gender: '男' })
const lunarBazi = calculateBazi({ birthDate: lunarBirth.date, gender: '男' })
assert.strictEqual(solarBazi.summary, lunarBazi.summary, '同一时刻公历/农历输入应排出同一八字')
console.log('✔ 命理排盘使用换算后的同一时刻通过')

const root = path.join(__dirname, '..')
const baziWxml = fs.readFileSync(path.join(root, 'pages/bazi/bazi.wxml'), 'utf8')
assert.ok(baziWxml.includes('出生历法'), '小程序命理表单应提供历法选择')
assert.ok(baziWxml.includes('setCalendarSolar') && baziWxml.includes('setCalendarLunar'), '小程序应能在输入时切换公历/农历')
assert.ok(baziWxml.includes('mode="multiSelector"'), '农历输入应使用多列日期选择')
;['preview/app-preview.js', 'preview/liuyao-standalone.html'].forEach((rel) => {
  const text = fs.readFileSync(path.join(root, rel), 'utf8')
  assert.ok(text.includes('出生历法'), `${rel} 命理表单缺少历法选择`)
  assert.ok(text.includes('btnCalSolar') && text.includes('btnCalLunar'), `${rel} 应能在输入时切换公历/农历`)
  assert.ok(text.includes('baziLunarYear'), `${rel} 农历输入应提供年月日选择`)
})
console.log('✔ 小程序与预览出生日期输入 UI 对齐')

console.log('calendar tests passed')
