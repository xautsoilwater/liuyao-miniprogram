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

module.exports = {
  GAN,
  ZHI,
  getDayGanzhi,
  formatLocalDateTime
}
