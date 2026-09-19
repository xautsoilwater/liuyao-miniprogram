/**
 * 六爻常用地支关系与动化规则
 */

const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const LIU_CHONG = {
  子: '午', 午: '子',
  丑: '未', 未: '丑',
  寅: '申', 申: '寅',
  卯: '酉', 酉: '卯',
  辰: '戌', 戌: '辰',
  巳: '亥', 亥: '巳'
}

const LIU_HE = {
  子: '丑', 丑: '子',
  寅: '亥', 亥: '寅',
  卯: '戌', 戌: '卯',
  辰: '酉', 酉: '辰',
  巳: '申', 申: '巳',
  午: '未', 未: '午'
}

/** 三合局 */
const SAN_HE = [
  { name: '申子辰合水局', members: ['申', '子', '辰'], hui: '水' },
  { name: '亥卯未合木局', members: ['亥', '卯', '未'], hui: '木' },
  { name: '寅午戌合火局', members: ['寅', '午', '戌'], hui: '火' },
  { name: '巳酉丑合金局', members: ['巳', '酉', '丑'], hui: '金' }
]

/**
 * 化进神固定次序：
 * 亥→子、寅→卯、巳→午、申→酉；
 * 四土按丑→辰→未→戌→丑循环。
 */
const HUA_JIN = {
  亥: '子', 寅: '卯', 巳: '午', 申: '酉',
  丑: '辰', 辰: '未', 未: '戌', 戌: '丑'
}

const HUA_TUI = Object.keys(HUA_JIN).reduce((map, from) => {
  map[HUA_JIN[from]] = from
  return map
}, {})

const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const WUXING_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

function isChong(a, b) {
  return !!(a && b && LIU_CHONG[a] === b)
}

function isHe(a, b) {
  return !!(a && b && LIU_HE[a] === b)
}

function relationWuxing(a, b) {
  if (!a || !b) return '无关'
  if (a === b) return '比和'
  if (WUXING_SHENG[a] === b) return '生'
  if (WUXING_SHENG[b] === a) return '被生'
  if (WUXING_KE[a] === b) return '克'
  if (WUXING_KE[b] === a) return '被克'
  return '无关'
}

/**
 * 化进化退（同六亲同五行，按传统固定进退关系）
 */
function huaJinTui(fromYao, toYao) {
  if (!fromYao || !toYao) return null
  if (fromYao.liuqin !== toYao.liuqin || fromYao.wuxing !== toYao.wuxing) return null
  if (HUA_JIN[fromYao.zhi] === toYao.zhi) {
    return { type: '化进神', text: `${fromYao.ganZhi}化进${toYao.ganZhi}` }
  }
  if (HUA_TUI[fromYao.zhi] === toYao.zhi) {
    return { type: '化退神', text: `${fromYao.ganZhi}化退${toYao.ganZhi}` }
  }
  return null
}

/** 回头生克：动爻化出回头生/克自身 */
function huiTou(fromYao, toYao) {
  if (!fromYao || !toYao) return null
  const rel = relationWuxing(toYao.wuxing, fromYao.wuxing)
  if (rel === '生') return { type: '回头生', text: `化${toYao.ganZhi}${toYao.wuxing}回头生` }
  if (rel === '克') return { type: '回头克', text: `化${toYao.ganZhi}${toYao.wuxing}回头克` }
  if (rel === '比和') return { type: '化比肩', text: `化${toYao.ganZhi}比和` }
  if (rel === '被生') return { type: '化泄', text: `化${toYao.ganZhi}${toYao.wuxing}泄气` }
  if (rel === '被克') return { type: '化克', text: `动爻克化爻${toYao.ganZhi}（非回头克）` }
  return null
}

function analyzeChange(fromYao, toYao) {
  if (!fromYao || !toYao) return null
  const jinTui = huaJinTui(fromYao, toYao)
  const ht = huiTou(fromYao, toYao)
  const chong = isChong(fromYao.zhi, toYao.zhi)
  const he = isHe(fromYao.zhi, toYao.zhi)
  const tags = []
  if (jinTui) tags.push(jinTui.type)
  if (ht) tags.push(ht.type)
  if (chong) tags.push('化冲')
  if (he) tags.push('化合')
  return {
    jinTui,
    huiTou: ht,
    chong,
    he,
    tags,
    text: [
      `化${toYao.liuqin}${toYao.ganZhi}${toYao.wuxing}`,
      jinTui ? jinTui.type : '',
      ht ? ht.type : '',
      chong ? '化冲' : '',
      he ? '化合' : ''
    ].filter(Boolean).join('·')
  }
}

/** 反吟：本卦与变卦六爻皆冲；伏吟：本变六爻地支皆同（简化用卦宫/爻支对比） */
function fanFuYin(ben, bian) {
  if (!bian) return { fanYin: false, fuYin: false, text: '' }
  const a = ben.yaosBottomUp
  const b = bian.yaosBottomUp
  let chongCount = 0
  let sameCount = 0
  for (let i = 0; i < 6; i += 1) {
    if (isChong(a[i].zhi, b[i].zhi)) chongCount += 1
    if (a[i].zhi === b[i].zhi) sameCount += 1
  }
  const fanYin = chongCount === 6
  const fuYin = sameCount === 6
  let text = ''
  if (fanYin) text = '本变六爻皆冲，属反吟，传统多主反复波折'
  if (fuYin) text = '本变六爻地支皆同，属伏吟，传统多主沉滞难进'
  return { fanYin, fuYin, chongCount, sameCount, text }
}

function dayMonthFlags(yao, calendar) {
  if (!yao || !calendar) return { chongRi: false, heRi: false, chongYue: false, heYue: false, tags: [] }
  const ri = calendar.day.zhi
  const yue = calendar.month.zhi
  const chongRi = isChong(yao.zhi, ri)
  const heRi = isHe(yao.zhi, ri)
  const chongYue = isChong(yao.zhi, yue)
  const heYue = isHe(yao.zhi, yue)
  const tags = []
  if (chongRi) tags.push('日冲')
  if (heRi) tags.push('日合')
  if (chongYue) tags.push('月冲')
  if (heYue) tags.push('月合')
  if (yao.zhi === ri) tags.push('临日')
  if (yao.zhi === yue) tags.push('临月')
  return { chongRi, heRi, chongYue, heYue, tags }
}

function findSanHe(zhis) {
  const set = new Set(zhis.filter(Boolean))
  return SAN_HE.filter((g) => g.members.every((m) => set.has(m)))
}

/** 应期粗推（通俗说明） */
function suggestYingqi(yao, calendar, opts = {}) {
  if (!yao || !calendar) return []
  const tips = []
  if (yao.kong) {
    tips.push(`目标逢空：可等冲开「${yao.zhi}」的日子，或出旬填实之后，事情更容易落地。`)
  }
  if (opts.chongRi) tips.push('今天日辰正好冲动这一爻：近几天有动静的机会较大。')
  if (opts.heRi) tips.push('今天日辰合住这一爻：容易粘着、定住，暂时发不出去。')
  if (yao.changeTo && yao.changeTo.jinTui && yao.changeTo.jinTui.type === '化进神') {
    tips.push('化进神：事情有往前推进、继续发展的意思。')
  }
  if (yao.changeTo && yao.changeTo.jinTui && yao.changeTo.jinTui.type === '化退神') {
    tips.push('化退神：事情有回缩、放缓、迟滞的意思。')
  }
  return tips
}

const LIUSHEN_MEANING = {
  青龙: '喜庆、财帛、酒色',
  朱雀: '文书、口舌、信息',
  勾陈: '田土、迟滞、纠缠',
  螣蛇: '虚惊、怪梦、牵连',
  白虎: '凶丧、道路、血光',
  玄武: '盗贼、暧昧、隐秘'
}

module.exports = {
  DI_ZHI,
  LIU_CHONG,
  LIU_HE,
  SAN_HE,
  HUA_JIN,
  HUA_TUI,
  WUXING_SHENG,
  WUXING_KE,
  isChong,
  isHe,
  relationWuxing,
  analyzeChange,
  fanFuYin,
  dayMonthFlags,
  findSanHe,
  suggestYingqi,
  LIUSHEN_MEANING,
  huaJinTui,
  huiTou
}
