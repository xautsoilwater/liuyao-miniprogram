/**
 * 今日吉位：通书日干三神方位（喜神、财神、福神）。
 * 歌诀：
 *   喜神  甲己在艮乙庚乾，丙辛坤位丁壬离，戊癸原来在巽间
 *   财神  甲艮乙坤丙丁兑，戊己财神坐坎位，庚辛正东壬癸南
 *   福神  甲己正北是福神，丙辛西北乾宫存，乙庚坤位戊癸艮，丁壬巽上妙追寻
 * 仅作传统文化测向参考，不直接判断吉凶。
 */
const { getDayPillar } = require('./ganzhi')

const DIR = {
  北: { dir: '正北', gua: '坎', compass: 0, plateDeg: 180 },
  东北: { dir: '东北', gua: '艮', compass: 45, plateDeg: 225 },
  东: { dir: '正东', gua: '震', compass: 90, plateDeg: 270 },
  东南: { dir: '东南', gua: '巽', compass: 135, plateDeg: 315 },
  南: { dir: '正南', gua: '离', compass: 180, plateDeg: 0 },
  西南: { dir: '西南', gua: '坤', compass: 225, plateDeg: 45 },
  西: { dir: '正西', gua: '兑', compass: 270, plateDeg: 90 },
  西北: { dir: '西北', gua: '乾', compass: 315, plateDeg: 135 }
}

const XI_SHEN = {
  甲: '东北', 己: '东北',
  乙: '西北', 庚: '西北',
  丙: '西南', 辛: '西南',
  丁: '南', 壬: '南',
  戊: '东南', 癸: '东南'
}

const CAI_SHEN = {
  甲: '东北',
  乙: '西南',
  丙: '西', 丁: '西',
  戊: '北', 己: '北',
  庚: '东', 辛: '东',
  壬: '南', 癸: '南'
}

const FU_SHEN = {
  甲: '北', 己: '北',
  乙: '西南', 庚: '西南',
  丙: '西北', 辛: '西北',
  丁: '东南', 壬: '东南',
  戊: '东北', 癸: '东北'
}

const GOD_ORDER = ['喜神', '财神', '福神']

function dirOf(name) {
  const hit = DIR[name]
  if (!hit) throw new Error(`未知方位 ${name}`)
  return hit
}

function luckyByGan(gan) {
  if (!XI_SHEN[gan]) throw new Error(`未知日干 ${gan}`)
  const gods = [
    { god: '喜神', dir: XI_SHEN[gan] },
    { god: '财神', dir: CAI_SHEN[gan] },
    { god: '福神', dir: FU_SHEN[gan] }
  ]
  const grouped = []
  gods.forEach((item) => {
    let bucket = grouped.find((g) => g.dir === item.dir)
    if (!bucket) {
      const meta = dirOf(item.dir)
      bucket = {
        dir: meta.dir,
        gua: meta.gua,
        compass: meta.compass,
        plateDeg: meta.plateDeg,
        gods: []
      }
      grouped.push(bucket)
    }
    bucket.gods.push(item.god)
  })
  grouped.forEach((item) => {
    item.gods.sort((a, b) => GOD_ORDER.indexOf(a) - GOD_ORDER.indexOf(b))
    item.label = item.gods.join('·')
  })
  grouped.sort((a, b) => a.compass - b.compass)
  return grouped
}

function buildLuckyDirections(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('历日时间无效')
  const day = getDayPillar(date)
  const marks = luckyByGan(day.gan)
  const summary = marks.map((item) => `${item.label}${item.dir}`).join(' · ')
  return {
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    gan: day.gan,
    zhi: day.zhi,
    dayText: day.text,
    marks,
    summary
  }
}

module.exports = {
  DIR,
  XI_SHEN,
  CAI_SHEN,
  FU_SHEN,
  luckyByGan,
  buildLuckyDirections
}
