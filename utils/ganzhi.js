/**
 * 干支历（节气近似）
 * 用于六爻：日柱六神/空亡、月建旺衰。非完整天文万年历，但日柱按公历连续日序，精度足够日常排盘。
 */

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const ZHI_WUXING = {
  子: '水', 亥: '水',
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  申: '金', 酉: '金',
  辰: '土', 戌: '土', 丑: '土', 未: '土'
}

/** 各旬空亡 */
const XUN_KONG = [
  { startGanZhi: '甲子', kong: ['戌', '亥'] },
  { startGanZhi: '甲戌', kong: ['申', '酉'] },
  { startGanZhi: '甲申', kong: ['午', '未'] },
  { startGanZhi: '甲午', kong: ['辰', '巳'] },
  { startGanZhi: '甲辰', kong: ['寅', '卯'] },
  { startGanZhi: '甲寅', kong: ['子', '丑'] }
]

/**
 * 二十四节气相对分钟常数（1900–2100 常用历算式）。
 * 六爻月建只用十二个「节」：小寒、立春、惊蛰……大雪。
 * 算式通常在真实交节时刻约两小时内；极靠近边界时在 buildCalendar 中标记复核提示。
 */
const SOLAR_TERM_MINUTES = [
  0, 21208, 42467, 63836, 85337, 107014,
  128867, 150921, 173149, 195551, 218072, 240693,
  263343, 285989, 308563, 331033, 353350, 375494,
  397447, 419210, 440795, 462224, 483532, 504758
]

const MONTH_JIE = [
  { name: '小寒', termIndex: 0, zhi: '丑' },
  { name: '立春', termIndex: 2, zhi: '寅' },
  { name: '惊蛰', termIndex: 4, zhi: '卯' },
  { name: '清明', termIndex: 6, zhi: '辰' },
  { name: '立夏', termIndex: 8, zhi: '巳' },
  { name: '芒种', termIndex: 10, zhi: '午' },
  { name: '小暑', termIndex: 12, zhi: '未' },
  { name: '立秋', termIndex: 14, zhi: '申' },
  { name: '白露', termIndex: 16, zhi: '酉' },
  { name: '寒露', termIndex: 18, zhi: '戌' },
  { name: '立冬', termIndex: 20, zhi: '亥' },
  { name: '大雪', termIndex: 22, zhi: '子' }
]

/** 月令下五行旺相休囚死 */
const YUE_LING_WANG = {
  寅: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  卯: { 木: '旺', 火: '相', 水: '休', 金: '囚', 土: '死' },
  巳: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  午: { 火: '旺', 土: '相', 木: '休', 水: '囚', 金: '死' },
  申: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  酉: { 金: '旺', 水: '相', 土: '休', 火: '囚', 木: '死' },
  亥: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  子: { 水: '旺', 木: '相', 金: '休', 土: '囚', 火: '死' },
  辰: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  戌: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  丑: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' },
  未: { 土: '旺', 金: '相', 火: '休', 木: '囚', 水: '死' }
}

function padPillar(gan, zhi) {
  return { gan, zhi, text: `${gan}${zhi}`, wuxing: ZHI_WUXING[zhi] }
}

function utcDateOnly(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

/** 把设备本地年月日时当作「墙上时间」比较，避免运行环境时区改变节令判断。 */
function localWallTime(date) {
  return Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  )
}

function solarTermWallTime(year, termIndex) {
  const raw = new Date(
    31556925974.7 * (year - 1900)
    + SOLAR_TERM_MINUTES[termIndex] * 60000
    + Date.UTC(1900, 0, 6, 2, 5)
  )
  return Date.UTC(
    raw.getUTCFullYear(),
    raw.getUTCMonth(),
    raw.getUTCDate(),
    raw.getUTCHours(),
    raw.getUTCMinutes(),
    raw.getUTCSeconds()
  )
}

/**
 * 日柱：1900-01-01 = 甲戌
 */
function getDayPillar(date) {
  const base = Date.UTC(1900, 0, 1)
  const cur = utcDateOnly(date).getTime()
  const days = Math.round((cur - base) / 86400000)
  const gan = TIAN_GAN[((0 + days) % 10 + 10) % 10]
  const zhi = DI_ZHI[((10 + days) % 12 + 12) % 12]
  return padPillar(gan, zhi)
}

function getMonthZhi(date) {
  const y = date.getFullYear()
  const cur = localWallTime(date)
  // 元旦至小寒仍属上一年的子月。
  let zhi = '子'
  for (let i = 0; i < MONTH_JIE.length; i += 1) {
    const item = MONTH_JIE[i]
    if (cur >= solarTermWallTime(y, item.termIndex)) zhi = item.zhi
  }
  return zhi
}

/**
 * 年柱：立春换年（约2月4日）
 * 1984 = 甲子年
 */
function getYearPillar(date) {
  let y = date.getFullYear()
  const lichun = solarTermWallTime(y, 2)
  const cur = localWallTime(date)
  if (cur < lichun) y -= 1
  const offset = y - 1984
  const gan = TIAN_GAN[((0 + offset) % 10 + 10) % 10]
  const zhi = DI_ZHI[((0 + offset) % 12 + 12) % 12]
  return padPillar(gan, zhi)
}

/**
 * 月柱：寅月起，甲己之年丙寅，乙庚戊寅，丙辛庚寅，丁壬壬寅，戊癸甲寅
 */
function getMonthPillar(date, yearGan) {
  const monthZhi = getMonthZhi(date)
  const zhiIdx = DI_ZHI.indexOf(monthZhi)
  // 寅=2 in DI_ZHI... wait 寅 index is 2. Month order from 寅: 寅0卯1...
  const monthOrder = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']
  const orderIdx = monthOrder.indexOf(monthZhi)
  const yearGanIdx = TIAN_GAN.indexOf(yearGan)
  // 甲己->丙(2), 乙庚->戊(4), 丙辛->庚(6), 丁壬->壬(8), 戊癸->甲(0)
  const startMap = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]
  const startGan = startMap[yearGanIdx]
  const gan = TIAN_GAN[(startGan + orderIdx) % 10]
  return padPillar(gan, monthZhi)
}

function getKongWang(dayPillar) {
  const ganIdx = TIAN_GAN.indexOf(dayPillar.gan)
  const zhiIdx = DI_ZHI.indexOf(dayPillar.zhi)
  // 回溯到甲日：日干为甲时的地支
  const back = ganIdx // 甲=0
  const xunZhiIdx = (zhiIdx - back + 12) % 12
  const xunGanZhi = `甲${DI_ZHI[xunZhiIdx]}`
  const hit = XUN_KONG.find((x) => x.startGanZhi === xunGanZhi) || XUN_KONG[0]
  return {
    xun: hit.startGanZhi,
    kong: hit.kong.slice(),
    text: hit.kong.join('')
  }
}

function wangshuaiOf(wuxing, monthZhi) {
  const table = YUE_LING_WANG[monthZhi]
  if (!table) return '平'
  return table[wuxing] || '平'
}

function buildCalendar(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('历日时间无效')
  const year = getYearPillar(date)
  const month = getMonthPillar(date, year.gan)
  const day = getDayPillar(date)
  const kongwang = getKongWang(day)
  const wall = localWallTime(date)
  const jieDistances = MONTH_JIE.map((item) => ({
    name: item.name,
    hours: Math.abs(wall - solarTermWallTime(date.getFullYear(), item.termIndex)) / 3600000
  })).sort((a, b) => a.hours - b.hours)
  const nearJie = jieDistances[0] && jieDistances[0].hours <= 3 ? jieDistances[0].name : ''
  return {
    date: utcDateOnly(date).toISOString().slice(0, 10),
    year,
    month,
    day,
    kongwang,
    nearJie,
    calendarNote: nearJie ? `接近${nearJie}交节，月柱宜用专业万年历复核` : '',
    display: `${year.text}年 ${month.text}月 ${day.text}日 空亡${kongwang.text}${nearJie ? ` · 近${nearJie}交节` : ''}`
  }
}

function isKongWang(zhi, kongwang) {
  return !!(kongwang && kongwang.kong && kongwang.kong.indexOf(zhi) >= 0)
}

module.exports = {
  TIAN_GAN,
  DI_ZHI,
  ZHI_WUXING,
  buildCalendar,
  getDayPillar,
  getMonthPillar,
  getYearPillar,
  getKongWang,
  getMonthZhi,
  solarTermWallTime,
  wangshuaiOf,
  isKongWang
}
