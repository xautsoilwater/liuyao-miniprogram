const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 2000-01-07 is a 甲子 day. Calendar dates are normalized with Date.UTC so
// daylight-saving and device timezone offsets cannot shift the day count.
const JIAZI_ANCHOR_UTC = Date.UTC(2000, 0, 7)
const DAY_MS = 86400000

const XUN_KONG = [
  ['戌', '亥'],
  ['申', '酉'],
  ['午', '未'],
  ['辰', '巳'],
  ['寅', '卯'],
  ['子', '丑']
]

/**
 * 1900–2100 农历年数据：低四位为闰月，0x10000 表闰月30天，
 * 0x8000–0x10 依次表示正月至十二月为30天（否则29天）。
 * 数据经 lunar-javascript 1.7.7 与香港天文台日期表抽样核对。
 */
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520
]

const LUNAR_YEAR_MIN = 1900
const LUNAR_YEAR_MAX = 2100
const SOLAR_DATE_MIN = '1900-01-31'
const SOLAR_DATE_MAX = '2100-12-31'
const LUNAR_BASE_UTC = Date.UTC(1900, 0, 31)
const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const LUNAR_DAY_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function mod(value, base) {
  return ((value % base) + base) % base
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('无效日期')
  return date
}

function getDayGanzhi(value = new Date()) {
  const date = normalizeDate(value)
  const localDateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const offset = Math.round((localDateUtc - JIAZI_ANCHOR_UTC) / DAY_MS)
  const cycleIndex = mod(offset, 60)
  const gan = GAN[cycleIndex % 10]
  const zhi = ZHI[cycleIndex % 12]
  const xunIndex = Math.floor(cycleIndex / 10)

  return {
    gan,
    zhi,
    text: `${gan}${zhi}`,
    cycleIndex,
    xunKong: XUN_KONG[xunIndex].slice()
  }
}

function pad2(value) {
  return String(value).padStart(2, '0')
}

function formatLocalDateTime(value = new Date()) {
  const date = normalizeDate(value)
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function formatSolarDate(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function lunarInfoOf(year) {
  const info = LUNAR_INFO[year - 1900]
  if (info == null) throw new Error('农历仅支持 1900–2100 年')
  return info
}

function lunarLeapMonth(year) {
  return lunarInfoOf(year) & 0xf
}

function lunarMonthDays(year, month) {
  return (lunarInfoOf(year) & (0x10000 >> month)) ? 30 : 29
}

function lunarLeapDays(year) {
  const leap = lunarLeapMonth(year)
  if (!leap) return 0
  return (lunarInfoOf(year) & 0x10000) ? 30 : 29
}

function lunarYearDays(year) {
  let sum = 0
  for (let month = 1; month <= 12; month += 1) sum += lunarMonthDays(year, month)
  return sum + lunarLeapDays(year)
}

function formatLunarDay(day) {
  const n = Number(day)
  if (n <= 10) return `初${n === 10 ? '十' : LUNAR_DAY_DIGITS[n]}`
  if (n < 20) return `十${LUNAR_DAY_DIGITS[n - 10]}`
  if (n === 20) return '二十'
  if (n < 30) return `廿${LUNAR_DAY_DIGITS[n - 20]}`
  return '三十'
}

function formatLunarMonth(month, isLeap = false) {
  return `${isLeap ? '闰' : ''}${LUNAR_MONTH_NAMES[month - 1]}月`
}

function formatLunarDate(lunar) {
  if (!lunar) return ''
  return `${lunar.year}年${formatLunarMonth(lunar.month, lunar.isLeap)}${formatLunarDay(lunar.day)}`
}

function solarToLunar(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) throw new Error('时间无效')
  const solarYear = date.getFullYear()
  if (solarYear < 1900 || solarYear > 2100) throw new Error('农历换算仅支持 1900–2100 年')
  const current = Date.UTC(solarYear, date.getMonth(), date.getDate())
  if (current < LUNAR_BASE_UTC) throw new Error('农历换算仅支持 1900-01-31 至 2100-12-31')
  let offset = Math.floor((current - LUNAR_BASE_UTC) / DAY_MS)
  let year = 1900
  while (year <= 2100) {
    const days = lunarYearDays(year)
    if (offset < days) break
    offset -= days
    year += 1
  }
  if (year > 2100) throw new Error('时间超出农历换算范围')
  const leap = lunarLeapMonth(year)
  for (let month = 1; month <= 12; month += 1) {
    const normalDays = lunarMonthDays(year, month)
    if (offset < normalDays) return { year, month, day: offset + 1, isLeap: false }
    offset -= normalDays
    if (month === leap) {
      const leapDays = lunarLeapDays(year)
      if (offset < leapDays) return { year, month, day: offset + 1, isLeap: true }
      offset -= leapDays
    }
  }
  throw new Error('农历换算失败')
}

function lunarToSolar({ year, month, day, isLeap = false } = {}) {
  const y = Number(year)
  const m = Number(month)
  const d = Number(day)
  if (!Number.isInteger(y) || y < LUNAR_YEAR_MIN || y > LUNAR_YEAR_MAX) {
    throw new Error('农历仅支持 1900–2100 年')
  }
  if (!Number.isInteger(m) || m < 1 || m > 12) throw new Error('农历月份无效')
  const leap = lunarLeapMonth(y)
  if (isLeap && leap !== m) throw new Error('该年无此闰月')
  const maxDays = isLeap ? lunarLeapDays(y) : lunarMonthDays(y, m)
  if (!Number.isInteger(d) || d < 1 || d > maxDays) throw new Error('农历日期无效')

  let offset = 0
  for (let cursor = 1900; cursor < y; cursor += 1) offset += lunarYearDays(cursor)
  for (let cursor = 1; cursor < m; cursor += 1) {
    offset += lunarMonthDays(y, cursor)
    if (cursor === leap) offset += lunarLeapDays(y)
  }
  if (isLeap) offset += lunarMonthDays(y, m)
  offset += d - 1

  const utc = LUNAR_BASE_UTC + offset * DAY_MS
  const solarYear = new Date(utc).getUTCFullYear()
  const solarMonth = new Date(utc).getUTCMonth() + 1
  const solarDay = new Date(utc).getUTCDate()
  if (solarYear > 2100) throw new Error('农历换算仅支持 1900-01-31 至 2100-12-31')
  return {
    year: solarYear,
    month: solarMonth,
    day: solarDay,
    date: new Date(solarYear, solarMonth - 1, solarDay)
  }
}

function listLunarMonths(year) {
  const leap = lunarLeapMonth(year)
  const months = []
  for (let month = 1; month <= 12; month += 1) {
    months.push({ month, isLeap: false, label: formatLunarMonth(month, false) })
    if (month === leap) {
      months.push({ month, isLeap: true, label: formatLunarMonth(month, true) })
    }
  }
  return months
}

function listLunarDays(year, month, isLeap = false) {
  const maxDays = isLeap ? lunarLeapDays(year) : lunarMonthDays(year, month)
  const days = []
  for (let day = 1; day <= maxDays; day += 1) {
    days.push({ day, label: formatLunarDay(day) })
  }
  return days
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getLunarPickerState(lunarInput = {}) {
  const year = clamp(Number(lunarInput.year) || 1995, LUNAR_YEAR_MIN, LUNAR_YEAR_MAX)
  const months = listLunarMonths(year)
  let monthIndex = months.findIndex((item) => (
    item.month === Number(lunarInput.month) && !!item.isLeap === !!lunarInput.isLeap
  ))
  if (monthIndex < 0) {
    monthIndex = months.findIndex((item) => item.month === Number(lunarInput.month) && !item.isLeap)
  }
  if (monthIndex < 0) monthIndex = 0
  const month = months[monthIndex]
  const days = listLunarDays(year, month.month, month.isLeap)
  const dayIndex = clamp((Number(lunarInput.day) || 1) - 1, 0, days.length - 1)
  const years = []
  for (let y = LUNAR_YEAR_MIN; y <= LUNAR_YEAR_MAX; y += 1) {
    years.push({ value: y, label: `${y}年` })
  }
  return {
    years,
    months,
    days,
    indexes: [year - LUNAR_YEAR_MIN, monthIndex, dayIndex],
    lunar: {
      year,
      month: month.month,
      day: days[dayIndex].day,
      isLeap: month.isLeap
    }
  }
}

function parseTimeParts(time = '00:00') {
  const parts = String(time || '00:00').split(':')
  return {
    hours: Number(parts[0]) || 0,
    minutes: Number(parts[1]) || 0
  }
}

function parseSolarDate(solarDate) {
  const parts = String(solarDate || '').split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  if (!year || !month || !day) throw new Error('公历日期无效')
  return { year, month, day }
}

function combineDateTime(year, month, day, time = '00:00') {
  const { hours, minutes } = parseTimeParts(time)
  const date = new Date(year, month - 1, day, hours, minutes, 0)
  if (Number.isNaN(date.getTime())) throw new Error('日期时间无效')
  return date
}

function resolveBirthInstant({ calendarType = 'solar', solarDate, lunar, time = '00:00' } = {}) {
  let solar
  if (calendarType === 'lunar') {
    solar = lunarToSolar(lunar)
  } else {
    solar = parseSolarDate(solarDate)
  }
  const date = combineDateTime(solar.year, solar.month, solar.day, time)
  const lunarInfo = solarToLunar(date)
  return {
    date,
    calendarType: calendarType === 'lunar' ? 'lunar' : 'solar',
    solarText: formatSolarDate(solar.year, solar.month, solar.day),
    lunarText: formatLunarDate(lunarInfo),
    lunar: lunarInfo
  }
}

module.exports = {
  GAN,
  ZHI,
  getDayGanzhi,
  formatLocalDateTime,
  pad2,
  LUNAR_YEAR_MIN,
  LUNAR_YEAR_MAX,
  SOLAR_DATE_MIN,
  SOLAR_DATE_MAX,
  lunarLeapMonth,
  lunarMonthDays,
  lunarLeapDays,
  solarToLunar,
  lunarToSolar,
  formatLunarDay,
  formatLunarMonth,
  formatLunarDate,
  formatSolarDate,
  listLunarMonths,
  listLunarDays,
  getLunarPickerState,
  resolveBirthInstant
}
