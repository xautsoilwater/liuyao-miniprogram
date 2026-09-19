/**
 * 梅花易数（教学演示）
 * 先天数：乾1兑2离3震4巽5坎6艮7坤8
 * 起卦：报数 / 时间 / 随机
 * 断法重心：体用生克（本卦、互卦、变卦）
 */

const {
  TRIGRAMS,
  linesToTrigramKey,
  GUA64_NAMES
} = require('../data/bagua')
const { getGuaCi } = require('../data/guaci')
const { buildCalendar, DI_ZHI } = require('./ganzhi')
const { relationWuxing } = require('./rules')
const {
  resolveParsed,
  directReply,
  GUA_DIR,
  modeLabelList,
  yesNoLevel,
  yesNoJudgmentLine,
  yesNoAdvice,
  invertTone,
  safetyAdvice,
  safetyLevel,
  safetyJudgmentLine
} = require('./ask')

/** 八卦人物/事体象（教学用） */
const GUA_PERSON = {
  乾: '父辈/主管/权威方',
  坤: '母辈/众人/承载方',
  震: '长男/行动者/开创方',
  巽: '长女/协调者/传递方',
  坎: '中男/险阻之人/中间人',
  离: '中女/文书信息/亮面角色',
  艮: '少男/止步者/把门人',
  兑: '少女/口舌协商/悦人者'
}

/** 先天八卦数 → key */
const XIAN_TIAN_NUM = {
  1: 'qian',
  2: 'dui',
  3: 'li',
  4: 'zhen',
  5: 'xun',
  6: 'kan',
  7: 'gen',
  8: 'kun'
}

const XIAN_TIAN_NAME = {
  qian: 1, dui: 2, li: 3, zhen: 4, xun: 5, kan: 6, gen: 7, kun: 8
}

const ZHI_NUM = {
  子: 1, 丑: 2, 寅: 3, 卯: 4, 辰: 5, 巳: 6,
  午: 7, 未: 8, 申: 9, 酉: 10, 戌: 11, 亥: 12
}

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

const YAO_CN = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻']

function lunarLeapMonth(year) {
  return LUNAR_INFO[year - 1900] & 0xf
}

function lunarMonthDays(year, month) {
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29
}

function lunarLeapDays(year) {
  const leap = lunarLeapMonth(year)
  if (!leap) return 0
  return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29
}

function lunarYearDays(year) {
  let sum = 0
  for (let month = 1; month <= 12; month += 1) sum += lunarMonthDays(year, month)
  return sum + lunarLeapDays(year)
}

function solarToLunar(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) throw new Error('时间无效')
  const solarYear = date.getFullYear()
  if (solarYear < 1900 || solarYear > 2100) throw new Error('时间起卦仅支持 1900–2100 年')
  const base = Date.UTC(1900, 0, 31)
  const current = Date.UTC(solarYear, date.getMonth(), date.getDate())
  if (current < base) throw new Error('时间起卦仅支持 1900-01-31 至 2100-12-31')
  let offset = Math.floor((current - base) / 86400000)
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

function mod8(n) {
  const v = ((Number(n) % 8) + 8) % 8
  return v === 0 ? 8 : v
}

function mod6(n) {
  const v = ((Number(n) % 6) + 6) % 6
  return v === 0 ? 6 : v
}

function numToTrigram(n) {
  const key = XIAN_TIAN_NUM[mod8(n)]
  return { ...TRIGRAMS[key], xiantian: XIAN_TIAN_NAME[key] }
}

function linesKey(lines) {
  return lines.map((v) => (v ? '1' : '0')).join('')
}

function getGuaName(lines) {
  return GUA64_NAMES[linesKey(lines)] || { name: '未知卦', alias: '未知' }
}

function packGua(upper, lower) {
  const lines = lower.lines.concat(upper.lines)
  const info = getGuaName(lines)
  return {
    lines,
    name: info.name,
    alias: info.alias,
    upper,
    lower,
    text: `${upper.symbol}${upper.name}${upper.nature}／${lower.symbol}${lower.name}${lower.nature}`
  }
}

function flipLine(v) {
  return v ? 0 : 1
}

/** 互卦：二三四为下，三四五为上（下标 0=初） */
function buildHuGua(lines) {
  const lower = [lines[1], lines[2], lines[3]]
  const upper = [lines[2], lines[3], lines[4]]
  return packGua(
    { ...TRIGRAMS[linesToTrigramKey(upper)], xiantian: XIAN_TIAN_NAME[linesToTrigramKey(upper)] },
    { ...TRIGRAMS[linesToTrigramKey(lower)], xiantian: XIAN_TIAN_NAME[linesToTrigramKey(lower)] }
  )
}

function buildBianGua(lines, dongIndex0) {
  const next = lines.slice()
  next[dongIndex0] = flipLine(next[dongIndex0])
  const lowerKey = linesToTrigramKey(next.slice(0, 3))
  const upperKey = linesToTrigramKey(next.slice(3, 6))
  return packGua(
    { ...TRIGRAMS[upperKey], xiantian: XIAN_TIAN_NAME[upperKey] },
    { ...TRIGRAMS[lowerKey], xiantian: XIAN_TIAN_NAME[lowerKey] }
  )
}

/**
 * 体用：动爻在下卦（初二三）→ 下为用、上为体；在上卦（四五上）→ 上为用、下为体
 */
function resolveTiYong(ben, dongYao1to6) {
  const dongInLower = dongYao1to6 <= 3
  const ti = dongInLower ? ben.upper : ben.lower
  const yong = dongInLower ? ben.lower : ben.upper
  return {
    ti,
    yong,
    tiSide: dongInLower ? '外卦（上）' : '内卦（下）',
    yongSide: dongInLower ? '内卦（下）' : '外卦（上）',
    rule: dongInLower
      ? '动爻在内卦，故内卦为用、外卦为体'
      : '动爻在外卦，故外卦为用、内卦为体'
  }
}

function tiYongVerdict(tiWx, yongWx) {
  const rel = relationWuxing(tiWx, yongWx)
  // relationWuxing(a,b): a相对b — 生=a生b, 被生=b生a, 克=a克b, 被克=b克a
  // 这里传入 (体, 用)：体生用 / 用生体 …
  if (rel === '被生') {
    return {
      rel: '用生体',
      level: '可成',
      tone: 'good',
      note: '用卦来生体卦：事体或外力在帮你，所问之事宜推进、偏可成。'
    }
  }
  if (rel === '生') {
    return {
      rel: '体生用',
      level: '耗力偏难',
      tone: 'bad',
      note: '体卦去生用卦：主体被事体耗泄。传统以此为不利，宜先保全自身、补足条件，勿硬撑。'
    }
  }
  if (rel === '克') {
    return {
      rel: '体克用',
      level: '可制',
      tone: 'good',
      note: '体卦克用卦：你能压住事体或对方，所问偏能拿住，但往往要费一番力气。'
    }
  }
  if (rel === '被克') {
    return {
      rel: '用克体',
      level: '难成',
      tone: 'bad',
      note: '用卦来克体卦：事体或外力压你，所问阻力大，宜缓或改道，勿硬顶。'
    }
  }
  return {
    rel: '体用比和',
    level: '比和可成',
    tone: 'good',
    note: '体用五行相同：同气相应，传统以比和为吉；仍须守常而行，不因象吉而冒进。'
  }
}

function describeGua(g) {
  const ci = getGuaCi(g.alias)
  const items = [
    `卦名「${g.name}」${g.alias && g.alias !== g.name ? `（${g.alias}）` : ''}：${g.text}。`
  ]
  if (ci && ci.nameWhy) items.push(ci.nameWhy)
  if (ci && ci.guaci) items.push(`卦辞：${ci.guaci}`)
  return items
}

function sideGua(huOrBian, tiYong, which) {
  const side = which === 'ti' ? tiYong.tiSide : tiYong.yongSide
  return side.indexOf('外') >= 0 ? huOrBian.upper : huOrBian.lower
}

function meihuaEvidence(cast, huVerdict, bianVerdict) {
  const { ben, tiYong, verdict, dongYao } = cast
  return [
    `本卦${ben.name}`,
    `体${tiYong.ti.name}${tiYong.ti.wuxing}/用${tiYong.yong.name}${tiYong.yong.wuxing}`,
    verdict.rel,
    `动${YAO_CN[dongYao - 1]}`,
    `互${huVerdict.rel}`,
    `变${bianVerdict.rel}`
  ].join('；')
}

function meihuaPlace(cast) {
  const yongDir = GUA_DIR[cast.tiYong.yong.name] || ''
  const tiDir = GUA_DIR[cast.tiYong.ti.name] || ''
  return yongDir || tiDir || ''
}

function meihuaWhenHint(cast, tone, whenKind) {
  if (whenKind === 'clock') {
    // 动爻序号没有公认的一一对应钟点表，不在这里伪造精确时段。
    return ''
  }
  const bits = []
  if (cast.calendar && cast.calendar.day && cast.calendar.day.zhi) {
    bits.push(`对照「${cast.calendar.day.zhi}」日支与体用顺逆`)
  }
  bits.push(`动在${cast.dongLabel}，变化窗口宜盯近几步`)
  if (tone === 'good') bits.push('用生体或体克用时，近应偏多')
  if (tone === 'bad') bits.push('用克体时宜再等转机，勿钉死最近几天')
  return bits.slice(0, 2).join('；')
}

function meihuaWhoHint(cast) {
  const y = cast.tiYong.yong
  const person = GUA_PERSON[y.name] || `${y.name}卦所象之人`
  const dir = GUA_DIR[y.name] || ''
  return dir ? `${person}（偏${dir}）` : person
}

function meihuaChoicePick(parsed, tone) {
  return ''
}

function philosophyGuidance(tone, focus, parsed) {
  if (parsed && parsed.negativeEvent) {
    return tone === 'good'
      ? '明理之道：风险之象偏弱，也不可据卦指认他人或放弃核验；以事实、坦诚沟通与清楚边界守住关系。'
      : tone === 'bad'
        ? '避凶之道：风险之象偏强，先核事实、留证据、定边界；不以猜疑伤人，也不以侥幸纵患。'
        : '指迷之要：风险未明时，不猜、不纵、不武断；以事实核验和可执行的边界减少后悔。'
  }
  if (parsed && (parsed.domain === 'health' || parsed.domain === 'pregnancy')) {
    return '明理之道：安其心而不轻其患，尽人事而遵医理；能控制的是就医、复查、作息与支持，不能控制的结果不以一卦强求。'
  }
  if (parsed && parsed.domain === 'weather') {
    return '明理之道：天时有变，备而不惧；以预报和现场为据，卦象只提醒人保留余地。'
  }
  if (parsed && parsed.domain === 'lost' && /寻人|人/.test(String(parsed.focus || ''))) {
    return '寻人之要：以行动争取时间，以事实缩小范围；卦象不可替代联络、搜索与必要的报警求助。'
  }
  if (parsed && parsed.mode === 'choice') {
    return '取舍之道：不求卦替人承担后果，只求看清得失；所选若有据、可承受、能修正，进退皆可少悔。'
  }
  if (tone === 'good') {
    return `趋吉之道：顺势而行，却不因一时有利而躁进；守正、守信、留有余地，方能使「${focus}」之吉延续。体得其安，行方能久。`
  }
  if (tone === 'bad') {
    return `避凶之道：先止损，再变通；莫把一时阻滞当作终局，也莫以执念强求「${focus}」。穷则变，变则通，调整自身与条件便是在育新机。`
  }
  return `指迷之要：象在变，事亦在变；先安其心，再辨轻重缓急，对「${focus}」小步求证、随势修正。知进退而守其中，方可少悔。`
}

/** 按所问类型组织梅花明确答复（与六爻同构） */
function buildAskJudgment(cast, huVerdict, bianVerdict) {
  const topic = { label: '梅花所问' }
  const parsed = resolveParsed(cast.question, topic, cast.askMeta)
  let tone = cast.verdict.tone
  let level = cast.verdict.level

  // 互、变参校：过程/结局转逆则略下调，转顺则略上调
  if (tone === 'good' && (huVerdict.tone === 'bad' || bianVerdict.tone === 'bad')) {
    tone = 'mid'
    level = '宜量力'
  } else if (tone === 'bad' && (huVerdict.tone === 'good' || bianVerdict.tone === 'good')) {
    tone = 'mid'
    level = '有转机'
  }
  const answerTone = parsed.mode === 'yesno' && parsed.negativeEvent ? invertTone(tone) : tone

  const place = meihuaPlace(cast)
  const whenHint = meihuaWhenHint(cast, tone, parsed.whenKind)
  const clockHint = parsed.whenKind === 'clock' ? whenHint : ''
  const whoHint = meihuaWhoHint(cast)
  const choicePick = meihuaChoicePick(parsed, tone)
  const evidence = meihuaEvidence(cast, huVerdict, bianVerdict)
  const focus = parsed.focus

  if (parsed.mode === 'when') {
    if (parsed.whenKind === 'clock') {
      level = clockHint
        ? (tone === 'bad' ? `时刻信号弱·${clockHint}` : `时刻偏${clockHint}`)
        : '时刻未明'
    } else if (tone === 'good') level = '应期偏近'
    else if (tone === 'bad') level = '应期迟滞'
    else level = '应期未明'
  } else if (parsed.mode === 'where') {
    level = place ? `方位偏${place}` : '方位未明'
  } else if (parsed.mode === 'jixiong') {
    if (tone === 'good') level = '偏吉'
    else if (tone === 'bad') level = '偏凶'
    else level = '平'
  } else if (parsed.mode === 'who') {
    level = tone === 'good' ? '宜对接' : tone === 'bad' ? '宜慎择' : '宜再观'
  } else if (parsed.mode === 'choice') {
    level = parsed.choice ? '两项待比较' : '选项未明'
  } else if (parsed.mode === 'yesno') {
    level = yesNoLevel(parsed, answerTone, /耗力|有转机/.test(String(level)))
  } else if (parsed.mode === 'degree') {
    if (parsed.domain === 'health' || parsed.domain === 'pregnancy') level = '须医学评估'
    else if (tone === 'good') level = '偏轻'
    else if (tone === 'bad') level = '偏重'
    else level = '轻重未分'
  } else if (parsed.mode === 'how') {
    if (tone === 'good') level = '宜进取'
    else if (tone === 'bad') level = '宜先守'
    else level = '宜备后动'
  }
  const guardedLevel = safetyLevel(parsed)
  if (guardedLevel) level = guardedLevel

  const askRef = parsed.raw
    ? `你问的是「${parsed.raw}」（按「${parsed.modeLabel}」来断）`
    : `本次按梅花「${parsed.modeLabel}」来断`

  let judgment = `${askRef}。`

  const guardedJudgment = safetyJudgmentLine(
    parsed,
    parsed.mode === 'yesno' ? answerTone : tone
  )
  if (guardedJudgment) {
    judgment += guardedJudgment
  } else if (parsed.mode === 'where') {
    judgment += place
      ? `判断：你问的方位，重点看「${place}」（事体「${focus}」，用卦「${cast.tiYong.yong.name}」后天位）。`
      : '判断：你问的方位信号不足，暂不宜钉死一处。'
  } else if (parsed.mode === 'when' && parsed.whenKind === 'clock') {
    judgment += clockHint
      ? `判断：你问的是「几点」——「${focus}」象意时刻偏${clockHint}（取动爻合十二时辰）。`
      : '判断：你问的是「几点」，但卦上时刻信号不足，不宜钉死钟点。'
  } else if (parsed.mode === 'when') {
    judgment += `判断：你问的时机——「${focus}」${tone === 'good' ? '偏有可盼' : tone === 'bad' ? '偏迟或反复' : '尚不明朗'}。`
    if (whenHint) judgment += `${whenHint}。`
  } else if (parsed.mode === 'jixiong') {
    judgment += `判断：你问的吉凶——「${focus}」整体${tone === 'good' ? '偏吉' : tone === 'bad' ? '偏凶' : '吉凶交杂'}。`
  } else if (parsed.mode === 'who') {
    judgment += `判断：你问找谁——人物象偏「${whoHint}」。`
  } else if (parsed.mode === 'choice') {
    if (parsed.choice) {
      judgment += `判断：你问「${parsed.choice.a}」还是「${parsed.choice.b}」——本卦只显示当前抉择环境${tone === 'good' ? '偏顺' : tone === 'bad' ? '偏滞' : '未明'}，不能把选项排列顺序强行对应吉凶。`
    } else {
      judgment += '判断：抉择题请写成「A还是B」，本卦再据此取舍。'
    }
  } else if (parsed.mode === 'how') {
    judgment += `判断：你问怎么办——办「${focus}」宜${tone === 'good' ? '进取' : tone === 'bad' ? '先守后改' : '备而后动'}。`
  } else if (parsed.mode === 'degree') {
    judgment += (parsed.domain === 'health' || parsed.domain === 'pregnancy')
      ? `判断：你问医学轻重——卦象不具备诊断能力；「${focus}」须由症状、检查和医生评估。`
      : `判断：你问轻重——「${focus}」${tone === 'good' ? '偏轻' : tone === 'bad' ? '偏重' : '轻重未分'}。`
  } else if (parsed.mode === 'yesno') {
    judgment += yesNoJudgmentLine(parsed, answerTone)
  } else {
    judgment += `判断：你问的走势——「${focus}」${tone === 'good' ? '偏好' : tone === 'bad' ? '偏逆' : '两可'}。`
  }

  if (parsed.timeHint && parsed.mode !== 'when') {
    if (tone === 'good') judgment += `你提到的时间「${parsed.timeHint}」可作窗口。`
    else if (tone === 'bad') judgment += `你提到的时间「${parsed.timeHint}」不宜死磕。`
    else judgment += `你提到的时间「${parsed.timeHint}」还不宜钉死。`
  }

  judgment += `卦上依据：${evidence}。本卦体用「${cast.verdict.rel}」；互卦「${huVerdict.rel}」看过程，变卦「${bianVerdict.rel}」看趋向。`

  const reply = directReply(parsed, parsed.mode === 'yesno' ? answerTone : tone, level, {
    place,
    whenHint,
    clockHint,
    whoHint,
    choicePick,
    outcomeTone: tone
  })

  let advice = ''
  if (parsed.mode === 'where') {
    advice = place
      ? `当下怎么做：先往「${place}」一侧排查/行动，再对照用卦物象与现场；勿只认一个点。`
      : '当下怎么做：方位未明，宜改问「具体何方」，或到现场核验。'
  } else if (parsed.mode === 'when' && parsed.whenKind === 'clock') {
    advice = clockHint
      ? `当下怎么做：按${clockHint}前后观察「${focus}」；并对照实况/预报。卦象只给时辰区间，不是精确到分钟。`
      : `当下怎么做：整日分段留意「${focus}」，本卦时刻信号不足。`
  } else if (parsed.mode === 'when') {
    advice = `当下怎么做：结合${whenHint}；体用转顺再加码，转逆则缓。`
  } else if (parsed.mode === 'who') {
    advice = tone === 'good'
      ? `当下怎么做：优先对接「${whoHint}」，带具体方案一次说清。`
      : tone === 'bad'
        ? `当下怎么做：对「${whoHint}」先观再动；可另寻生扶之象。`
        : `当下怎么做：可接触「${whoHint}」，同时准备备选。`
  } else if (parsed.mode === 'choice') {
    if (parsed.choice) {
      advice = `当下怎么做：给「${parsed.choice.a}」与「${parsed.choice.b}」使用同一组标准，比较收益、代价、可逆性和最坏结果；信息不足时先做低成本验证。`
    } else {
      advice = '当下怎么做：用「甲还是乙」把两个选项写清楚再起一卦。'
    }
  } else if (parsed.mode === 'jixiong') {
    advice = tone === 'good'
      ? `当下怎么做：吉中仍看互变是否转逆；可推进「${focus}」，留退路。`
      : tone === 'bad'
        ? `当下怎么做：凶象当前，收缩「${focus}」风险，勿扩大敞口。`
        : `当下怎么做：平局则小步试错，不为「${focus}」一次押死。`
  } else if (parsed.mode === 'how') {
    advice = tone === 'good'
      ? '当下怎么做：主动推进，借用生体/体克用之势，避开用克体窗口。'
      : tone === 'bad'
        ? '当下怎么做：先止损、改条件；用克体时尤其别硬闯。'
        : '当下怎么做：补条件、作两手准备，体用转顺再加码。'
  } else if (parsed.mode === 'degree') {
    advice = (parsed.domain === 'health' || parsed.domain === 'pregnancy')
      ? `当下怎么做：记录「${focus}」的症状、持续时间和检查结果；有加重或警示症状及时就医。`
      : tone === 'good'
        ? `当下怎么做：「${focus}」按较轻压力处理，仍保持观察。`
        : tone === 'bad'
          ? `当下怎么做：「${focus}」宜重视，该求助时别拖。`
          : `当下怎么做：持续观察「${focus}」变化。`
  } else if (parsed.mode === 'yesno') {
    advice = yesNoAdvice(parsed, answerTone)
  } else if (tone === 'good') {
    advice = `当下怎么做：围绕「${focus}」推进；盯互变是否转逆。`
  } else if (tone === 'bad') {
    advice = `当下怎么做：先放下对「${focus}」的硬攻，改条件或换时机。`
  } else {
    advice = `当下怎么做：先为「${focus}」补条件，待体用转顺再拍板。`
  }
  advice += philosophyGuidance(tone, focus, parsed)
  const safety = safetyAdvice(parsed)
  if (safety) advice += safety

  return {
    level,
    tone,
    reply,
    judgment,
    advice,
    parsed,
    place,
    whenHint,
    clockHint,
    whoHint,
    choicePick,
    answerTone
  }
}

function buildGuide(cast) {
  const { ben, hu, bian, tiYong, verdict, dongYao, methodLabel, nums, calendar, ask } = cast
  const sections = []
  const huTiGua = sideGua(hu, tiYong, 'ti')
  const huYongGua = sideGua(hu, tiYong, 'yong')
  const huVerdict = tiYongVerdict(huTiGua.wuxing, huYongGua.wuxing)
  const bianTi = sideGua(bian, tiYong, 'ti')
  const bianYong = sideGua(bian, tiYong, 'yong')
  const bianVerdict = tiYongVerdict(bianTi.wuxing, bianYong.wuxing)

  const lead = []
  if (ask) {
    if (ask.reply) lead.push(ask.reply)
    lead.push(ask.judgment)
    if (ask.advice) lead.push(ask.advice)
    lead.push(`本题按「${ask.parsed.modeLabel}」断「${ask.parsed.focus}」（检出：${modeLabelList(ask.parsed.modes)}）。`)
  } else {
    lead.push(`先说结论：就所问而言「${verdict.level}」（${verdict.rel}）。${verdict.note}`)
  }
  lead.push(`起法：${methodLabel}。本卦「${ben.name}」，动在${YAO_CN[dongYao - 1]}。`)
  lead.push(`体卦是「${tiYong.ti.symbol}${tiYong.ti.name}」（${tiYong.ti.wuxing}，${tiYong.tiSide}），代表你自己或所问主体。`)
  lead.push(`用卦是「${tiYong.yong.symbol}${tiYong.yong.name}」（${tiYong.yong.wuxing}，${tiYong.yongSide}），代表事体、对方或所问对象。`)
  lead.push(tiYong.rule + '。')
  lead.push('梅花易数重「体用生克」：先看本卦体用，再参互卦、变卦的生克变化。')
  sections.push({ title: '对所问的判断', items: lead })

  const methodItems = []
  if (methodLabel.indexOf('报数') >= 0) {
    methodItems.push(`所报两数：上数 ${nums.upperSrc} 除8取 ${nums.upperRemainder} →「${ben.upper.name}」；下数 ${nums.lowerSrc} 除8取 ${nums.lowerRemainder} →「${ben.lower.name}」。`)
    methodItems.push(`动爻：(上数+下数)=${nums.sum}，${nums.sum}÷6 余 ${dongYao === 6 && nums.sum % 6 === 0 ? 0 : dongYao} → 取${YAO_CN[dongYao - 1]}（余0作6）。`)
  } else if (methodLabel.indexOf('时间') >= 0) {
    methodItems.push('时间起卦用：农历年支数+农历月+农历日得上卦；再加时支数得下卦；总数取动爻。')
    if (calendar) methodItems.push(`本次历日：${calendar.display}${nums.lunarText ? ` · 农历${nums.lunarText}` : ''}${nums.hourText ? ' · ' + nums.hourText : ''}。`)
    methodItems.push(`演算：上源 ${nums.upperSrc}→「${ben.upper.name}」；下源 ${nums.lowerSrc}→「${ben.lower.name}」；动爻源 ${nums.sum}→${YAO_CN[dongYao - 1]}。`)
  } else {
    methodItems.push(`随机得数：上 ${nums.upperSrc}、下 ${nums.lowerSrc}，动爻源 ${nums.sum} → ${YAO_CN[dongYao - 1]}。`)
  }
  methodItems.push('先天数口诀：乾1兑2离3震4巽5坎6艮7坤8。')
  sections.push({ title: '如何排出', items: methodItems })

  sections.push({
    title: '本卦 · 体用',
    items: [
      ...describeGua(ben),
      `体：${tiYong.ti.symbol}${tiYong.ti.name}${tiYong.ti.nature}（${tiYong.ti.wuxing}）。用：${tiYong.yong.symbol}${tiYong.yong.name}${tiYong.yong.nature}（${tiYong.yong.wuxing}）。`,
      `体用生克：${verdict.rel}。${verdict.note}`
    ]
  })

  sections.push({
    title: '互卦（过程）',
    items: [
      ...describeGua(hu),
      `互卦仍按本卦体用方位看：体方「${huTiGua.symbol}${huTiGua.name}」，用方「${huYongGua.symbol}${huYongGua.name}」。`,
      `互卦体用：${huVerdict.rel}。${huVerdict.note}`,
      '互卦多主事情发展的中间过程，宜与本卦对照。'
    ]
  })

  sections.push({
    title: '变卦（趋向）',
    items: [
      `动爻${YAO_CN[dongYao - 1]}阴阳对换，得变卦「${bian.name}」。`,
      ...describeGua(bian),
      `变后体方「${bianTi.symbol}${bianTi.name}」，用方「${bianYong.symbol}${bianYong.name}」。`,
      `变卦体用：${bianVerdict.rel}。${bianVerdict.note}`,
      '变卦多主结局与走向；本卦看目前，互卦看过程，变卦看将来。'
    ]
  })

  if (ask && ask.parsed && ask.parsed.mode === 'where') {
    const placeItems = []
    const yongDir = GUA_DIR[tiYong.yong.name]
    const tiDir = GUA_DIR[tiYong.ti.name]
    if (yongDir) placeItems.push(`用卦「${tiYong.yong.name}」后天位在「${yongDir}」，事体/所求方位多参此。`)
    if (tiDir) placeItems.push(`体卦「${tiYong.ti.name}」后天位在「${tiDir}」，多主己方或目前所在。`)
    placeItems.push('梅花方位取象宜与现场对照，勿只认一个点。')
    sections.push({ title: '方位怎么看', items: placeItems })
  } else if (ask && ask.parsed && ask.parsed.mode === 'when' && ask.parsed.whenKind === 'clock') {
    sections.push({
      title: '时刻怎么看（本题重点）',
      items: [
        '梅花动爻序号没有公认的固定钟点对应表，本盘不把初至上爻强配成六个时段。',
        `本卦体用「${verdict.rel}」只说明「${ask.parsed.focus}」的顺逆倾向，不伪造具体几点。`,
        '此类推演为教学示意，请结合实况与专业预报。'
      ]
    })
  } else if (ask && ask.parsed && ask.parsed.mode === 'when') {
    sections.push({
      title: '应期（本题重点）',
      items: [
        ask.whenHint || '宜结合动爻与体用顺逆看远近。',
        `本卦${verdict.rel}，互卦${huVerdict.rel}，变卦${bianVerdict.rel}——过程与结局是否转顺，影响应期快慢。`,
        calendar && calendar.day ? `起卦日支「${calendar.day.zhi}」，可作对照起点。` : '可逐日对照体用顺逆变化。'
      ]
    })
  } else if (ask && ask.parsed && ask.parsed.mode === 'who') {
    sections.push({
      title: '人物怎么看',
      items: [
        `用卦「${tiYong.yong.symbol}${tiYong.yong.name}」主事体/对方：${GUA_PERSON[tiYong.yong.name] || '参卦德取象'}。`,
        `体卦「${tiYong.ti.name}」主己方：${GUA_PERSON[tiYong.ti.name] || '参卦德取象'}。`,
        `体用「${verdict.rel}」决定此人目前是助力还是阻力。`
      ]
    })
  } else if (ask && ask.parsed && ask.parsed.mode === 'choice' && ask.parsed.choice) {
    sections.push({
      title: '抉择怎么看',
      items: [
        `选项：「${ask.parsed.choice.a}」／「${ask.parsed.choice.b}」。`,
        `本卦体用「${verdict.rel}」可看当前抉择环境；互看过程，变看趋向。`,
        '单卦整体顺逆不能按书写顺序直接判甲乙；宜同标准比较，必要时分别一事一占。'
      ]
    })
  }

  sections.push({
    title: '收束提醒',
    items: [
      '读盘次序建议：先定体用 → 看本卦生克 → 再看互、变是否转顺或转逆。',
      '梅花易数取象灵活，同一卦也可配物象、方位；此处以体用生克作教学主干。',
      '以上为传统梅花规则化推演，供研习对照；不是绝对预言，请结合实际自行判断。'
    ]
  })

  return sections
}

function assembleCast({ method, methodLabel, question, askMeta, date, upperSrc, lowerSrc, sum, dongYao, numsExtra }) {
  const upper = numToTrigram(upperSrc)
  const lower = numToTrigram(lowerSrc)
  const ben = packGua(upper, lower)
  const dong = mod6(dongYao != null ? dongYao : sum)
  const tiYong = resolveTiYong(ben, dong)
  const verdict = tiYongVerdict(tiYong.ti.wuxing, tiYong.yong.wuxing)
  const hu = buildHuGua(ben.lines)
  const bian = buildBianGua(ben.lines, dong - 1)
  const calendar = buildCalendar(date)

  const huTiGua = sideGua(hu, tiYong, 'ti')
  const huYongGua = sideGua(hu, tiYong, 'yong')
  const huVerdict = tiYongVerdict(huTiGua.wuxing, huYongGua.wuxing)
  const bianTi = sideGua(bian, tiYong, 'ti')
  const bianYong = sideGua(bian, tiYong, 'yong')
  const bianVerdict = tiYongVerdict(bianTi.wuxing, bianYong.wuxing)

  const cast = {
    type: 'meihua',
    createdAt: (date ? new Date(date) : new Date()).toISOString(),
    question: question || '',
    askMeta: askMeta || null,
    method,
    methodLabel,
    calendar,
    nums: {
      upperSrc,
      lowerSrc,
      upperRemainder: mod8(upperSrc),
      lowerRemainder: mod8(lowerSrc),
      sum,
      ...numsExtra
    },
    dongYao: dong,
    dongLabel: YAO_CN[dong - 1],
    ben,
    hu,
    bian,
    tiYong,
    verdict,
    huVerdict,
    bianVerdict
  }

  const ask = buildAskJudgment(cast, huVerdict, bianVerdict)
  cast.ask = ask
  cast.parsed = ask.parsed
  cast.reply = ask.reply
  cast.advice = ask.advice
  cast.judgment = ask.judgment
  cast.summary = ask.level
  cast.summaryNote = ask.judgment
  // 展示语气以问法判断为准（可能因互变下调）
  cast.verdict = Object.assign({}, verdict, { tone: ask.tone, level: ask.level })
  cast.guide = buildGuide(cast)
  return cast
}

/** 报数起卦：两个正整数 */
function castByNumbers(a, b, options = {}) {
  const n1 = Number(a)
  const n2 = Number(b)
  if (!Number.isSafeInteger(n1) || !Number.isSafeInteger(n2) || n1 <= 0 || n2 <= 0) {
    throw new Error('请输入两个正整数')
  }
  const sum = n1 + n2
  return assembleCast({
    method: 'number',
    methodLabel: '报数起卦',
    question: options.question,
    askMeta: options.askMeta,
    date: options.date,
    upperSrc: n1,
    lowerSrc: n2,
    sum
  })
}

function hourZhi(date) {
  const h = date.getHours()
  const idx = Math.floor(((h + 1) % 24) / 2)
  return DI_ZHI[idx]
}

function lunarYearZhi(year) {
  return DI_ZHI[((year - 4) % 12 + 12) % 12]
}

/** 时间起卦：农历年支数+农历月+农历日(+时) */
function castByTime(options = {}) {
  const date = options.date ? new Date(options.date) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('起卦时间无效')
  const cal = buildCalendar(date)
  const lunar = solarToLunar(date)
  const yearZhi = lunarYearZhi(lunar.year)
  const yearNum = ZHI_NUM[yearZhi]
  const monthNum = lunar.month
  const dayNum = lunar.day
  const hz = hourZhi(date)
  const hourNum = ZHI_NUM[hz]
  const upperSrc = yearNum + monthNum + dayNum
  const lowerSrc = upperSrc + hourNum
  const sum = lowerSrc
  return assembleCast({
    method: 'time',
    methodLabel: '时间起卦',
    question: options.question,
    askMeta: options.askMeta,
    date,
    upperSrc,
    lowerSrc,
    sum,
    numsExtra: {
      yearNum,
      monthNum,
      dayNum,
      hourNum,
      hourText: `${hz}时`,
      lunarText: `${lunar.year}年${lunar.isLeap ? '闰' : ''}${lunar.month}月${lunar.day}日`,
      yearZhi
    }
  })
}

/** 随机起卦（教学用） */
function castByRandom(options = {}) {
  const n1 = 1 + Math.floor(Math.random() * 64)
  const n2 = 1 + Math.floor(Math.random() * 64)
  return assembleCast({
    method: 'random',
    methodLabel: '随机起卦',
    question: options.question,
    askMeta: options.askMeta,
    date: options.date,
    upperSrc: n1,
    lowerSrc: n2,
    sum: n1 + n2
  })
}

module.exports = {
  XIAN_TIAN_NUM,
  castByNumbers,
  castByTime,
  castByRandom,
  numToTrigram,
  resolveTiYong,
  tiYongVerdict,
  buildHuGua,
  buildBianGua,
  solarToLunar
}
