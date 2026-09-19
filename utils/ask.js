/**
 * 所问理解与直接答复（六爻 / 梅花共用）
 *
 * —— 怎么做才不容易「所答非所问」——
 * 1. 先定「答复形态」answerShape：问的人到底要听什么形式的答案
 *    （几点→时刻，哪天→日期，哪里→方位，会不会→是否，怎么办→对策…）
 * 2. 再抽「事件」event：在问的那件事本身（如下雨、回款、辞职）
 * 3. 最后才把卦象映射到该形态；形态对不上，绝不拿「宜推进」之类万能句搪塞
 * 4. 形态能答、精度有限时：仍按形态答 + 标明是象意/演示，而非假装知道精确钟点
 *
 * mode 与形态大致对应；when 再分 whenKind：clock（几点）/ day（哪天）/ span（多久）
 */

const {
  detectDomain,
  refineYesKind,
  isDegreeQuestion,
  occurPhrase,
  listDomains
} = require('./ask-taxonomy')

const MODE_LABEL = {
  where: '方位',
  when: '应期',
  jixiong: '吉凶',
  yesno: '成否',
  how: '对策',
  who: '人物',
  choice: '抉择',
  outlook: '走势',
  degree: '轻重'
}

const WHEN_KIND_LABEL = {
  clock: '时刻',
  day: '日期',
  span: '期限'
}

const ZHI_DIR = {
  子: '正北', 丑: '东北', 寅: '东北', 卯: '正东', 辰: '东南', 巳: '东南',
  午: '正南', 未: '西南', 申: '西南', 酉: '正西', 戌: '西北', 亥: '西北'
}

const GUA_DIR = {
  坎: '正北', 坤: '西南', 震: '正东', 巽: '东南',
  乾: '西北', 兑: '正西', 艮: '东北', 离: '正南'
}

const GUA_SCENE = {
  乾: '高处、开阔处、金属器物或管理区域',
  兑: '低洼、开口、近水或有缺口之处',
  离: '明亮、显眼、电器或热源附近',
  震: '道路、出入口、移动物或有声响之处',
  巽: '门窗、通风口、狭长通道或木器附近',
  坎: '低处、暗处、水边、管线或凹陷处',
  艮: '墙角、门槛、柜架、台阶或静止之处',
  坤: '地面、储物处、柔软织物或承载物附近'
}

/** 地支 → 时辰（传统十二时辰，供「几点」类作答） */
const ZHI_SHICHEN = {
  子: { zhi: '子', label: '子时', clock: '23:00–01:00', period: '深夜至凌晨' },
  丑: { zhi: '丑', label: '丑时', clock: '01:00–03:00', period: '凌晨' },
  寅: { zhi: '寅', label: '寅时', clock: '03:00–05:00', period: '黎明' },
  卯: { zhi: '卯', label: '卯时', clock: '05:00–07:00', period: '清晨' },
  辰: { zhi: '辰', label: '辰时', clock: '07:00–09:00', period: '上午偏早' },
  巳: { zhi: '巳', label: '巳时', clock: '09:00–11:00', period: '上午' },
  午: { zhi: '午', label: '午时', clock: '11:00–13:00', period: '中午' },
  未: { zhi: '未', label: '未时', clock: '13:00–15:00', period: '下午偏早' },
  申: { zhi: '申', label: '申时', clock: '15:00–17:00', period: '下午' },
  酉: { zhi: '酉', label: '酉时', clock: '17:00–19:00', period: '傍晚' },
  戌: { zhi: '戌', label: '戌时', clock: '19:00–21:00', period: '晚上' },
  亥: { zhi: '亥', label: '亥时', clock: '21:00–23:00', period: '夜间' }
}

/** 动爻 1–6 → 粗时段（梅花无地支时用） */
const DONG_PERIOD = {
  1: { label: '初爻', period: '清晨前后', clock: '约 05:00–07:00', zhi: '卯' },
  2: { label: '二爻', period: '上午', clock: '约 09:00–11:00', zhi: '巳' },
  3: { label: '三爻', period: '中午到午后', clock: '约 11:00–15:00', zhi: '午' },
  4: { label: '四爻', period: '傍晚前后', clock: '约 15:00–19:00', zhi: '申' },
  5: { label: '五爻', period: '晚上', clock: '约 19:00–21:00', zhi: '戌' },
  6: { label: '上爻', period: '夜间到凌晨', clock: '约 21:00–01:00', zhi: '亥' }
}

const TIME_WORDS = '今天|明天|后天|今晚|本周|下周|这周|本月|下月|下个月|上个月|这个月|今年|明年|最近|近期|年内|月底前|年前'

function stripTailNoise(s) {
  return String(s || '')
    .replace(/[？?！!。．\s]+$/g, '')
    .replace(/(呢|啊|呀|吧|啦|嘛)+$/g, '')
    .trim()
}

function cleanFocus(s) {
  let t = stripTailNoise(s)
  t = t
    .replace(new RegExp(`^(${TIME_WORDS})+`), '')
    .replace(/^(请问|想问|想测|测一下|帮我看|麻烦看下|想知道|我的|我)+/g, '')
    .replace(/^(还|再|就|的|会|能|要|可能)+/, '')
    .replace(/(吗|么|嘛|呢)$/g, '')
    .replace(/比较好$|更好$|为宜$/g, '')
    .trim()
  t = t
    .replace(/吉利|吉凶|顺不顺|好不好|顺利吗|有利吗/g, '')
    .replace(/适不适合|适合不适合|合不合适/g, '')
    .replace(/有没有|还有没有/g, '')
    .trim()
  if (t.length > 16) {
    const parts = t.split(/的/)
    t = parts.length > 1 ? parts[parts.length - 1] : t.slice(-12)
  }
  return t
}

/** 抽出事件：去掉问型壳，留下「下雨/回款」这类事体 */
function extractEvent(core, mode, whenKind) {
  let t = core
  t = t.replace(new RegExp(TIME_WORDS, 'g'), '')
  if (mode === 'when' || whenKind) {
    t = t.replace(/几点钟|几点|几时|哪个时辰|什么时辰|哪个点|什么点|啥时候|什么时候|何时|哪天|哪月|哪年|多久|应期|等到什么时候/g, '')
    t = t.replace(/上午还是下午|早上还是晚上|白天还是晚上/g, '')
  }
  if (mode === 'where') {
    t = t.replace(/在哪里|在哪儿|去哪里|去哪儿|往哪里|往哪儿|哪里|哪儿|何处|何方|什么地方|哪个方向|什么方向|方位|方向/g, '')
  }
  t = t
    .replace(/会不会|能不能|可不可能|有没有可能|有没有|还有没有|可能|大概|究竟|到底/g, '')
    .replace(/适合|合适|可以/g, '')
    .replace(/会|能|要|该/g, '')
    .replace(/吗|么|呢|了/g, '')
    .replace(/^(的|得|地)+/, '')
    .trim()
  return cleanFocus(t)
}

function shichenOfZhi(zhi) {
  return (zhi && ZHI_SHICHEN[zhi]) || null
}

function shichenOfDong(dongYao) {
  const n = Number(dongYao)
  return DONG_PERIOD[n] || null
}

function formatShichenHint(info) {
  if (!info) return ''
  if (info.label && info.clock && info.period) {
    return `${info.period}（${info.label || ''} ${info.clock}）`.replace(/\s+/g, ' ').trim()
  }
  if (info.period && info.clock) return `${info.period}（${info.clock}）`
  return info.period || info.clock || ''
}

/**
 * @param {string} question
 * @param {{label?: string}|null} topic
 */
function parseQuestion(question, topic) {
  const raw = String(question || '').trim()
  const fallback = topic && topic.label ? topic.label : '此事'
  if (!raw) {
    return {
      raw: '',
      focus: fallback,
      event: fallback,
      mode: 'outlook',
      whenKind: '',
      yesKind: '',
      answerShape: 'outlook',
      domain: 'general',
      domainLabel: '综合事务',
      topicHint: 'general',
      modes: ['outlook'],
      timeHint: '',
      shortAsk: fallback,
      modeLabel: '走势',
      choice: null,
      negativeEvent: false
    }
  }

  let timeHint = ''
  const timeM = raw.match(new RegExp(TIME_WORDS))
  if (timeM) timeHint = timeM[0]

  const domainInfo = detectDomain(raw)

  // —— 1) 侦测可能的问法（可多选）——
  const modes = []
  let whenKind = ''

  // 时刻：比「哪天」更具体，必须单独识别
  if (/几点钟|几点|几时|哪个时辰|什么时辰|哪个点|什么点|上午还是下午|早上还是晚上|白天还是晚上/.test(raw)) {
    modes.push('when')
    whenKind = 'clock'
  } else if (/哪天|几号|哪月|哪年|几月|几年|几日/.test(raw)) {
    modes.push('when')
    whenKind = 'day'
  } else if (/多久|多长时间|要等多久|等到什么时候/.test(raw)) {
    modes.push('when')
    whenKind = 'span'
  } else if (/什么时候|何时|应期|何时能|什么时候能|什么时候适合|何时可以/.test(raw)) {
    modes.push('when')
    whenKind = 'day'
  }

  if (/哪里|哪儿|何处|何方|什么地方|哪个方向|什么方向|方位|落在哪|丢在哪|人在哪|在哪个|去哪个/.test(raw)
    || /东南|西北|东北|西南/.test(raw)
    || /在哪儿|在哪里|去哪儿|去哪里|往哪儿|往哪里/.test(raw)) {
    modes.push('where')
  }
  if (isDegreeQuestion(raw)) {
    modes.push('degree')
  }
  if (/吉凶|凶吉|顺逆|安危|利不利|好不好|顺利吗|有利吗|凶险|平安吗|吉还是凶|吉利吗|吉利不|凶不凶|顺不顺|安不安全/.test(raw)) {
    modes.push('jixiong')
  }
  if (/谁|何人|哪个人|什么人|是男是女|对方是谁|找谁|靠谁|问谁/.test(raw)) {
    modes.push('who')
  }
  if (/还是|或者|选哪个|选哪|二选一|A还是B|去还是留|分还是合/.test(raw)) {
    modes.push('choice')
  }
  if (/怎么办|如何是好|怎么处理|怎样应对|如何做|怎么做|对策|破法|怎么破/.test(raw)) {
    modes.push('how')
  }
  const hasYesNo =
    /能不能|可不可以|可否|能否|会不会|是否|成不成|行不行|有没有希望|有没有机会|该不该|要不要|找不找|回不回|过不过|签不签|去不去|离不离|辞不辞|赢不赢|好不好得了|宜不宜|当不当|应不应|找不找得到|找得到吗/.test(raw)
    || /有没有|还有没有|适不适合|适合不适合|合不合适|适合吗|合适吗|可不可能|有没有可能/.test(raw)
    || /(?:^|[^不])能[^否].{0,8}吗/.test(raw)
    || /有人来吗|客人来吗|能到吗|到了吗/.test(raw)
  if (hasYesNo) modes.push('yesno')

  if (/怎么样|如何|走势|前景|结果会|后来怎样|发展如何|结果如何/.test(raw)) {
    modes.push('outlook')
  }
  if (!modes.length) {
    if (/吗$|么$|嘛$/.test(stripTailNoise(raw))) modes.push('yesno')
    else modes.push('outlook')
  }

  // 优先级：方位 > 时刻/应期 > 抉择 > 何人 > 轻重 > 吉凶 > 成否 > 对策 > 走势
  const order = ['where', 'when', 'choice', 'who', 'degree', 'jixiong', 'yesno', 'how', 'outlook']
  let mode = 'outlook'
  for (let i = 0; i < order.length; i++) {
    if (modes.indexOf(order[i]) >= 0) {
      mode = order[i]
      break
    }
  }
  if (mode !== 'when') whenKind = ''

  let yesKind = ''
  if (mode === 'yesno') yesKind = refineYesKind(raw)

  let core = stripTailNoise(raw)
    .replace(/^(请问|想问|想测|测一下|帮我看|麻烦看下|想知道)+/g, '')
    .replace(/(到底|究竟)/g, '')

  let choice = null
  if (mode === 'choice') {
    const mChoice = core.match(/(.+?)(?:还是|或者)(.+)$/)
    if (mChoice) {
      choice = {
        a: cleanFocus(mChoice[1].replace(/^(该|是|要|选)/, '')),
        b: cleanFocus(mChoice[2])
      }
      if (!choice.a || !choice.b) choice = null
    }
  }

  // —— 2) 事件焦点 —— //
  let focus = ''
  if (mode === 'choice' && choice) {
    focus = `${choice.a}还是${choice.b}`
  } else if (mode === 'where') {
    focus = extractEvent(core, 'where')
    focus = focus.replace(/^(我的|我|丢的|丢失的)/, '').replace(/丢$/g, '').trim() || focus
  } else if (mode === 'when') {
    focus = extractEvent(core, 'when', whenKind)
  } else if (mode === 'who') {
    focus = core
      .replace(/该找谁|找谁|靠谁|问谁|何人|是谁|哪个人|什么人/g, '')
      .replace(/比较好|更好|为宜/g, '')
    focus = cleanFocus(focus) || '相关之人'
  } else if (mode === 'how') {
    focus = cleanFocus(core.replace(/怎么办|如何是好|怎么处理|怎样应对|如何做|怎么做|对策|破法|怎么破/g, ''))
  } else if (mode === 'degree') {
    focus = cleanFocus(
      core.replace(/严不严重|轻不轻|重不重|大不大|多不多|强不强|远不远|快不快|高不高|深不深|难不难/g, '')
    )
  } else if (mode === 'jixiong') {
    focus = cleanFocus(
      core
        .replace(/吉凶如何|吉凶怎样|吉凶|凶吉|顺逆|安危/g, '')
        .replace(/吉利吗|吉利不|好不好|顺利吗|有利吗|凶不凶|顺不顺|安不安全/g, '')
    )
  } else if (mode === 'yesno') {
    let m =
      core.match(/^(.*?)(?:还能不能|能不能|可不可以|可否|能否|会不会|是否|该不该|要不要|宜不宜|当不当|应不应|还有没有|有没有|可不可能|有没有可能|适不适合|适合不适合|找不找得到)(.+)$/)
      || core.match(/^(.*?)(?:找不找|回不回|过不过|签不签|去不去|离不离|辞不辞|赢不赢)(.+)$/)
    if (yesKind === 'find') {
      focus = cleanFocus(
        core
          .replace(/找不找得到|找得到吗|还能找到|找得回来吗|寻得回/g, '')
          .replace(/吗$/g, '')
      )
    } else if (m) {
      let left = cleanFocus((m[1] || '').replace(new RegExp(TIME_WORDS, 'g'), ''))
      let right = cleanFocus(m[2] || '')
      left = left.replace(/还$/g, '').trim()
      if (yesKind === 'have' && right) focus = right
      else if (yesKind === 'should' && (left || right)) {
        focus = cleanFocus((left + right).replace(/宜不宜|当不当|应不应|见客/g, (x) => (x === '见客' ? '见客' : '')))
        if (/见客|会客/.test(core)) focus = focus.includes('见') ? focus : (focus ? focus : '见客')
        if (/见客/.test(core) && !/见/.test(focus)) focus = '见客'
      } else if (left && right) {
        if (right.length <= 2 && /^(辞|去|留|签|离|分|合|嫁|娶|搬|换|投|买|卖)$/.test(right)) {
          focus = right + left
        } else {
          focus = left + right
        }
      } else focus = right || left
    } else {
      let body = core.replace(new RegExp(`^(${TIME_WORDS})`), '').replace(/吗$/g, '')
      if (/适合|合适/.test(body)) {
        yesKind = 'suit'
        focus = cleanFocus(body.replace(/适不适合|适合不适合|合不合适|适合|合适|能|会|要|可能/g, ''))
      } else {
        focus = cleanFocus(body.replace(/^(还|再|就)/, '').replace(/能|会|要|可能|宜不宜|当不当/g, ''))
      }
    }
    if (timeHint) {
      const stripped = (focus || '').replace(new RegExp(timeHint, 'g'), '').trim()
      if (stripped) focus = stripped
    }
  } else {
    focus = cleanFocus(core.replace(/怎么样|如何|走势|前景|结果会怎样|后来怎样|发展如何|结果如何/g, ''))
  }

  if (!focus) focus = fallback

  // 来访/送达等：焦点收成事体核心（客人来 → 客人）
  if ((yesKind === 'occur' || domainInfo.domain === 'visit' || domainInfo.domain === 'seek') && focus) {
    focus = focus
      .replace(/(来访|来找|上门|拜访|串门)$/g, '')
      .replace(/来$/g, '')
      .replace(/有人/g, '人')
      .trim() || focus
  }
  if (domainInfo.domain === 'delivery' && focus) {
    focus = focus.replace(/(送到|到货|到达|到)$/g, '').trim() || focus
  }
  const event = focus

  // —— 3) 答复形态（给下游作答合同）——
  let answerShape = mode
  if (mode === 'when') answerShape = whenKind === 'clock' ? 'clock' : whenKind === 'span' ? 'span' : 'day'
  if (mode === 'yesno') answerShape = yesKind || 'can'
  if (mode === 'degree') answerShape = 'degree'

  let modeLabel = MODE_LABEL[mode] || '走势'
  if (mode === 'when' && whenKind && WHEN_KIND_LABEL[whenKind]) {
    modeLabel = WHEN_KIND_LABEL[whenKind]
  }
  if (mode === 'yesno' && yesKind === 'occur') modeLabel = '发生'
  if (mode === 'yesno' && yesKind === 'find') modeLabel = '寻得'

  const shortAsk = timeHint ? `${timeHint}·${focus}` : focus
  const negativeEvent = /第三者|大问题|异常|丢失|口舌|事故|风险|被骗|受伤/.test(raw)

  return {
    raw,
    focus,
    event,
    mode,
    whenKind,
    yesKind,
    answerShape,
    domain: domainInfo.domain,
    domainLabel: domainInfo.domainLabel,
    topicHint: domainInfo.topicHint,
    modes,
    timeHint,
    shortAsk,
    modeLabel,
    choice,
    negativeEvent
  }
}

function invertTone(tone) {
  if (tone === 'good') return 'bad'
  if (tone === 'bad') return 'good'
  return 'mid'
}

function safetyAdvice(parsed) {
  const domain = parsed && parsed.domain
  const focus = String((parsed && parsed.focus) || '')
  if (domain === 'health' || domain === 'pregnancy') {
    return '现实校验：卦象不能诊断病情、判断手术适应证、推断胎儿性别或替代产检；请以医生、检查结果和紧急症状处置为准。'
  }
  if (domain === 'invest' || domain === 'property') {
    return '现实校验：投资和大额买卖须核对现金流、合同、估值与最坏损失，不可仅据卦象下注。'
  }
  if (domain === 'lawsuit') {
    return '现实校验：是否报警、起诉或和解应依据事实证据、时限与专业法律意见；有人身危险时应立即求助或报警。'
  }
  if (domain === 'weather') {
    return '现实校验：天气与出行安全以官方预报、预警和现场交通信息为准。'
  }
  if (domain === 'lost' && /寻人|人/.test(focus)) {
    return '现实校验：人员失联应先联系亲友、核对行程；存在危险或异常失联时应及时报警，不要等待卦象应期。'
  }
  return ''
}

/** 高风险所问不能把传统象意包装成现实结论。 */
function safetyLevel(parsed) {
  const domain = parsed && parsed.domain
  const focus = String((parsed && parsed.focus) || '')
  if (domain === 'health' || domain === 'pregnancy') return '须医学评估'
  if (domain === 'lawsuit') return '须法律评估'
  if (domain === 'invest' || domain === 'property') return '须现实评估'
  if (domain === 'lost' && /寻人|人/.test(focus)) return '须立即查找'
  return ''
}

/** 高风险所问的正文结论：保留象意，但明确不得据此作关键决定。 */
function safetyJudgmentLine(parsed, tone) {
  const guardedLevel = safetyLevel(parsed)
  if (!guardedLevel) return ''
  const focus = String((parsed && parsed.focus) || '此事')
  const symbolic = tone === 'good' ? '偏顺' : tone === 'bad' ? '偏滞' : '未明'
  if (parsed.domain === 'health' || parsed.domain === 'pregnancy') {
    if (parsed.negativeEvent) {
      const risk = tone === 'good' ? '偏有' : tone === 'bad' ? '偏弱' : '未明'
      return `判断：传统问事层面的「${focus}」迹象${risk}；这不是医学结论，须以症状、检查与医生评估为准。`
    }
    return `判断：传统象意对「${focus}」目前${symbolic}；卦象不能诊断、承诺疗效或决定手术和孕产方案。`
  }
  if (parsed.domain === 'lawsuit') {
    return `判断：传统象意对「${focus}」目前${symbolic}；不得据此判断输赢、决定报警起诉或替代法律策略。`
  }
  if (parsed.domain === 'invest' || parsed.domain === 'property') {
    return `判断：传统象意对「${focus}」目前${symbolic}；这不等于实际收益或适合买卖，须完成尽调与风险评估。`
  }
  return `判断：传统象意对「${focus}」目前${symbolic}；人员失联不得等待卦象，应立即按现实线索查找并在必要时报警。`
}

/**
 * 直接答复：形态必须对上所问
 * extra: { place, whenHint, clockHint, choicePick, whoHint }
 */
function directReply(parsed, tone, level, extra) {
  const focus = parsed.focus || '此事'
  const raw = parsed.raw || focus
  const timeHint = parsed.timeHint || ''
  const place = (extra && extra.place) || ''
  const whenHint = (extra && extra.whenHint) || ''
  const clockHint = (extra && extra.clockHint) || whenHint
  const choicePick = (extra && extra.choicePick) || ''
  const whoHint = (extra && extra.whoHint) || ''
  const lv = String(level || '')
  const mild = /偏|勉|虚|待|小|两可|未明/.test(lv)
  const head = `就你问的「${raw}」：`
  const dayRef = timeHint || '近段'
  const outcomeTone = (extra && extra.outcomeTone) || tone
  const symbolic = outcomeTone === 'good' ? '偏顺' : outcomeTone === 'bad' ? '偏滞' : '未明'

  if (parsed.domain === 'health' || parsed.domain === 'pregnancy') {
    if (parsed.mode === 'degree') {
      return `${head}卦象不能判断医学上的轻重；传统象意目前${symbolic}，请以症状、检查和医生评估为准。`
    }
    if (/手术/.test(focus)) {
      return `${head}卦象不能决定是否手术；传统象意目前${symbolic}，适应证、风险和替代方案须由医生评估。`
    }
    if (/体检|异常/.test(focus)) {
      const risk = tone === 'good' ? '偏有' : tone === 'bad' ? '偏弱' : '未明'
      return `${head}传统问事层面的异常迹象${risk}，但卦象不能判断体检是否有问题；结论须看正式报告和医生解释。`
    }
    if (parsed.mode === 'when' || parsed.mode === 'yesno' || parsed.mode === 'jixiong') {
      return `${head}传统象意目前${symbolic}，但不能据此承诺康复、怀孕或生产结果；请以医疗评估和随访为准。`
    }
  }

  if (parsed.domain === 'lawsuit' && /报警|起诉/.test(focus) && parsed.mode === 'yesno') {
    return `${head}传统象意目前${symbolic}，但不能据卦决定是否报警或起诉；请按人身安全、证据、法定时限和律师意见处理。`
  }
  if (parsed.domain === 'lawsuit' && ['yesno', 'jixiong', 'how'].includes(parsed.mode)) {
    return `${head}传统象意目前${symbolic}，但不能据此判断诉讼输赢或替代法律策略；关键仍是证据、程序、时限和专业意见。`
  }
  if ((parsed.domain === 'invest' || parsed.domain === 'property') && ['yesno', 'jixiong', 'when', 'how'].includes(parsed.mode)) {
    return `${head}传统象意目前${symbolic}，不代表实际收益或适合交易；请先核对现金流、合同、估值和最坏损失。`
  }
  if (parsed.domain === 'lost' && /寻人|人/.test(focus)) {
    return `${head}传统象意目前${symbolic}，但人员失联不能等待卦象应期；请立即核对行程，异常或危险情形及时报警。`
  }

  if (parsed.mode === 'where') {
    if (place) {
      if (tone === 'bad') return `${head}「${focus}」多半偏「${place}」一带，但阻隔较大，未必顺利。`
      if (tone === 'mid' || mild) return `${head}「${focus}」先往「${place}」一侧看，同时保留邻近方位作备选。`
      return `${head}「${focus}」重点看「${place}」一带。`
    }
    return `${head}「${focus}」方位信号偏弱，宜结合现场再核。`
  }

  // —— 时刻：必须答「几点/哪段时间」——
  if (parsed.mode === 'when' && parsed.whenKind === 'clock') {
    if (tone === 'bad') {
      return clockHint
        ? `${head}${dayRef}「${focus}」整体象偏弱，未必明显发生；若发生，相对更可留意${clockHint}。此为卦象时辰示意，非气象预报。`
        : `${head}${dayRef}「${focus}」整体象偏弱，时刻信号不清，不宜钉死某一点钟。`
    }
    if (tone === 'mid' || mild) {
      return clockHint
        ? `${head}${dayRef}「${focus}」若发生，较可留意${clockHint}；前后两三个时辰也留观察。此为卦象时辰示意，非气象预报。`
        : `${head}${dayRef}「${focus}」时刻未明朗，宜整日留意，勿只盯一个点。`
    }
    return clockHint
      ? `${head}${dayRef}「${focus}」更可能落在${clockHint}。此为卦象时辰示意，非气象预报。`
      : `${head}${dayRef}「${focus}」有时刻信号但不够清，宜按上午/下午分段观察。`
  }

  if (parsed.mode === 'when') {
    const win = whenHint ? `——${whenHint}` : ''
    if (tone === 'good') return `${head}「${focus}」的时机偏近${win}，可盯窗口推进。`
    if (tone === 'bad') return `${head}「${focus}」的时机偏迟或反复，近段不宜死等一个结果。`
    return `${head}「${focus}」的时机尚未明朗${win}，先筹备、待信号清楚再定。`
  }

  if (parsed.mode === 'jixiong') {
    const about = timeHint ? `${timeHint}办「${focus}」` : `「${focus}」`
    if (tone === 'good') return mild ? `${head}${about}小吉，有利但有波折。` : `${head}${about}偏吉，整体顺。`
    if (tone === 'bad') return mild ? `${head}${about}小凶，不太顺，宜缓。` : `${head}${about}偏凶，阻力大，宜避或改期。`
    return `${head}${about}吉凶未分，宜再观，勿一次押死。`
  }

  if (parsed.mode === 'who') {
    if (whoHint) {
      if (tone === 'good') return `${head}关键更像「${whoHint}」，宜主动对接。`
      if (tone === 'bad') return `${head}象在「${whoHint}」，但阻隔偏大，宜谨慎或另寻。`
      return `${head}可先参「${whoHint}」，人物尚未十分明朗。`
    }
    if (tone === 'good') return `${head}相关之人偏有助力，宜主动联络。`
    if (tone === 'bad') return `${head}相关之人多阻隔，不宜深交或一次押死。`
    return `${head}人物象未明朗，宜再观外应。`
  }

  if (parsed.mode === 'choice') {
    if (parsed.choice && choicePick) {
      const other = choicePick === parsed.choice.a ? parsed.choice.b : parsed.choice.a
      if (tone === 'good') return `${head}更宜选「${choicePick}」；「${other}」可作备案。`
      if (tone === 'bad') return `${head}两边都不宜猛冲，相对更稳的是先看「${choicePick}」，少动「${other}」的重仓。`
      return `${head}「${parsed.choice.a}」与「${parsed.choice.b}」优势不明显，建议小步试「${choicePick}」再定。`
    }
    if (parsed.choice) {
      return `${head}这一卦只能看当前抉择环境${symbolic}，不能仅按选项先后可靠判定「${parsed.choice.a}」或「${parsed.choice.b}」；宜用同一标准比较两项，必要时分别一事一占。`
    }
    return `${head}选项未写清，请用「A还是B」再问。`
  }

  if (parsed.mode === 'how') {
    if (tone === 'good') return `${head}宜主动推进「${focus}」，先做最能打开局面的一步。`
    if (tone === 'bad') return `${head}先止损「${focus}」，改条件或换时机，勿硬顶。`
    return `${head}先备后动，补「${focus}」的条件再加码。`
  }

  if (parsed.mode === 'degree') {
    const about = timeHint ? `${timeHint}「${focus}」` : `「${focus}」`
    if (tone === 'good') return mild ? `${head}${about}偏轻，可控。` : `${head}${about}不重，压力不大。`
    if (tone === 'bad') return mild ? `${head}${about}偏重，宜重视。` : `${head}${about}偏严重，勿掉以轻心。`
    return `${head}${about}轻重未分，宜再观变化。`
  }

  if (parsed.mode === 'yesno') {
    const kind = parsed.yesKind || 'can'
    const domain = parsed.domain || 'general'
    const dayRef = timeHint || ''

    if (kind === 'occur') {
      const phrase = occurPhrase(domain, focus)
      if (domain === 'visit' || domain === 'seek') {
        if (tone === 'good') {
          return mild
            ? `${head}${dayRef || '近段'}多半${domain === 'seek' ? '有人来找' : '有客人来'}，但未必准时、人未必多，宜留弹性。`
            : `${head}${dayRef || '近段'}有${domain === 'seek' ? '人来找' : '客人来'}的象，可以按「有客/有人」来准备。`
        }
        if (tone === 'bad') {
          return mild
            ? `${head}${dayRef || '近段'}${domain === 'seek' ? '来人' : '客人来'}的象偏弱，别空等。`
            : `${head}${dayRef || '近段'}暂看${domain === 'seek' ? '无人来找' : '无客人来'}，不必特意候客。`
        }
        return `${head}${dayRef || '近段'}是否${domain === 'seek' ? '有人来找' : '有客人来'}尚未明朗，宜两边都留准备。`
      }
      if (domain === 'weather') {
        if (tone === 'good') return `${head}${dayRef || '近段'}「${phrase}」象偏有，可按有天气变化来安排。`
        if (tone === 'bad') return `${head}${dayRef || '近段'}「${phrase}」象偏弱，不必按必有来死等。`
        return `${head}${dayRef || '近段'}「${phrase}」有无未定，宜对照预报。`
      }
      if (domain === 'delivery' || domain === 'arrival') {
        if (tone === 'good') return `${head}${dayRef || '近段'}「${phrase}」偏能实现。`
        if (tone === 'bad') return `${head}${dayRef || '近段'}「${phrase}」偏难准时，宜放宽预期。`
        return `${head}${dayRef || '近段'}「${phrase}」迟早未定。`
      }
      if (tone === 'good') return mild ? `${head}${dayRef}「${phrase}」迹象偏有。` : `${head}${dayRef}会发生「${phrase}」。`
      if (tone === 'bad') return mild ? `${head}${dayRef}「${phrase}」迹象偏弱。` : `${head}${dayRef}不太会发生「${phrase}」。`
      return `${head}${dayRef}「${phrase}」是否发生未明朗。`
    }

    if (kind === 'find') {
      if (tone === 'good') return mild ? `${head}「${focus}」大致找得到，但可能费一点周折。` : `${head}「${focus}」找得到。`
      if (tone === 'bad') return mild ? `${head}「${focus}」不好找，希望别太大。` : `${head}「${focus}」难找回。`
      return `${head}「${focus}」能否找到还定不了，宜再搜并改日再问。`
    }

    if (kind === 'should') {
      if (tone === 'good') return mild ? `${head}可以考虑「${focus}」，但别一次押满。` : `${head}宜「${focus}」，条件偏够。`
      if (tone === 'bad') return mild ? `${head}「${focus}」把握不大，能缓则缓。` : `${head}不宜「${focus}」，眼下硬做成本偏高。`
      return `${head}「${focus}」还定不了，宜再观两日或补条件。`
    }
    if (kind === 'suit') {
      if (tone === 'good') return mild ? `${head}「${focus}」大致合适，可推进但留余量。` : `${head}「${focus}」合适，可以办。`
      if (tone === 'bad') return mild ? `${head}「${focus}」不太合适，宜改期或改方案。` : `${head}「${focus}」不合适，暂缓为妥。`
      return `${head}「${focus}」合适与否未分，宜小范围先试。`
    }
    if (kind === 'have') {
      if (tone === 'good') return mild ? `${head}「${focus}」迹象偏有，但未十分落实。` : `${head}「${focus}」偏有，可以期待。`
      if (tone === 'bad') return mild ? `${head}「${focus}」迹象偏弱。` : `${head}「${focus}」偏无，不宜一厢情愿。`
      return `${head}「${focus}」有无未明，宜再观。`
    }
    const about = timeHint ? `${timeHint}「${focus}」` : `「${focus}」`
    if (tone === 'good') return mild ? `${head}${about}大致能成，可推进。` : `${head}${about}能，有望落实。`
    if (tone === 'bad') return mild ? `${head}${about}把握不大，现在硬推易耗力。` : `${head}${about}难，眼下不宜强求。`
    return `${head}${about}还定不了，宜再观。`
  }

  if (tone === 'good') return mild ? `${head}「${focus}」偏顺，可推进。` : `${head}「${focus}」走势偏好，宜推进。`
  if (tone === 'bad') return mild ? `${head}「${focus}」偏逆，不宜硬顶。` : `${head}「${focus}」走势偏逆，宜止或改道。`
  return `${head}「${focus}」走势两可，先备后动。`
}

function guaDirName(gua) {
  if (!gua || !gua.name) return ''
  return GUA_DIR[gua.name] || ''
}

function modeLabelList(modes) {
  return (modes || []).map((m) => MODE_LABEL[m] || m).join('、') || '走势'
}

function yesNoLevel(parsed, tone, mild) {
  const kind = parsed.yesKind || 'can'
  if (kind === 'should') {
    if (tone === 'good') return mild ? '可考虑' : '宜做'
    if (tone === 'bad') return mild ? '宜缓' : '不宜'
    return '未定'
  }
  if (kind === 'suit') {
    if (tone === 'good') return mild ? '大致合适' : '合适'
    if (tone === 'bad') return mild ? '不太合适' : '不合适'
    return '未定'
  }
  if (kind === 'occur') {
    const domain = parsed.domain || ''
    if (domain === 'visit' || domain === 'seek') {
      if (tone === 'good') return mild ? '或有客来' : '有客来'
      if (tone === 'bad') return mild ? '客象弱' : '暂无客来'
      return '客来未明'
    }
    if (tone === 'good') return mild ? '或将发生' : '会发生'
    if (tone === 'bad') return mild ? '象偏弱' : '不太发生'
    return '发生未明'
  }
  if (kind === 'find') {
    if (tone === 'good') return mild ? '大致找得到' : '找得到'
    if (tone === 'bad') return mild ? '不好找' : '难找回'
    return '未定'
  }
  if (kind === 'have') {
    if (tone === 'good') return mild ? '迹象偏有' : '偏有'
    if (tone === 'bad') return mild ? '迹象偏弱' : '偏无'
    return '未明'
  }
  if (tone === 'good') return mild ? '大致能成' : '能'
  if (tone === 'bad') return mild ? '把握不大' : '难'
  return '未定'
}

function yesNoJudgmentLine(parsed, tone) {
  const focus = parsed.focus
  const kind = parsed.yesKind || 'can'
  const time = parsed.timeHint || ''
  const domain = parsed.domain || ''
  if (kind === 'occur') {
    const phrase = occurPhrase(domain, focus)
    if (tone === 'good') return `判断：就「${parsed.raw || focus}」而言，${time}${phrase}的象偏有。`
    if (tone === 'bad') return `判断：就「${parsed.raw || focus}」而言，${time}${phrase}的象偏弱。`
    return `判断：就「${parsed.raw || focus}」而言，${time}${phrase}是否发生未明。`
  }
  if (kind === 'find') {
    return `判断：就「${parsed.raw || focus}」而言，${tone === 'good' ? `「${focus}」找得到` : tone === 'bad' ? `「${focus}」难找回` : `「${focus}」能否找到未定`}。`
  }
  if (kind === 'should') {
    return `判断：就「${parsed.raw || focus}」而言，${tone === 'good' ? `宜「${focus}」` : tone === 'bad' ? `不宜「${focus}」` : `「${focus}」尚定不了`}。`
  }
  if (kind === 'suit') {
    return `判断：就「${parsed.raw || focus}」而言，${tone === 'good' ? `「${focus}」合适` : tone === 'bad' ? `「${focus}」不合适` : `「${focus}」合适与否未分`}。`
  }
  if (kind === 'have') {
    return `判断：就「${parsed.raw || focus}」而言，${tone === 'good' ? `「${focus}」偏有` : tone === 'bad' ? `「${focus}」偏无` : `「${focus}」有无未明`}。`
  }
  return `判断：就「${parsed.raw || focus}」而言，${time ? time : ''}${tone === 'good' ? `「${focus}」可成` : tone === 'bad' ? `「${focus}」难成` : `「${focus}」未定`}。`
}

function yesNoAdvice(parsed, tone) {
  const focus = parsed.focus
  const kind = parsed.yesKind || 'can'
  const domain = parsed.domain || ''
  const time = parsed.timeHint || '近段'
  if (domain === 'health' || domain === 'pregnancy') {
    return `当下怎么做：整理与「${focus}」有关的症状、病史、检查和疑问，与医生共同评估方案；不要按卦象自行停药、延误检查或决定手术。`
  }
  if (domain === 'lawsuit') {
    return `当下怎么做：围绕「${focus}」保存原始证据、核对程序和时限，并咨询合格法律专业人士；先保护人身与财产安全。`
  }
  if (domain === 'invest' || domain === 'property') {
    return `当下怎么做：先核验「${focus}」的现金流、合同、估值和退出条件，设定可承受损失；未尽调前不作不可逆投入。`
  }
  if (domain === 'lost' && /寻人|人/.test(String(focus))) {
    return '当下怎么做：立即联系亲友、单位和常去地点并核对行程；异常失联或存在危险时及时报警，不等待卦象。'
  }
  if (parsed.negativeEvent) {
    if (tone === 'good') return `当下怎么做：按「${focus}可能存在」核验事实、保留证据并准备止损；不要只凭卦象指认他人。`
    if (tone === 'bad') return `当下怎么做：「${focus}」目前象偏弱，仍以事实核验，不因一卦放松必要的检查与防范。`
    return `当下怎么做：「${focus}」未明，先查事实、留证据并准备两种预案。`
  }
  if (kind === 'occur') {
    if (domain === 'visit' || domain === 'seek') {
      if (tone === 'good') return `当下怎么做：按${time}可能有客/有人来准备（茶水、时间窗口），但留弹性，勿空等过久。`
      if (tone === 'bad') return `当下怎么做：${time}不必特意候客；有要事可照常安排，来了再接待。`
      return `当下怎么做：两手准备——有客也能接，无客也不耽误正事。`
    }
    if (domain === 'weather') {
      if (tone === 'good') return '当下怎么做：按有雨/有天气变化备伞或改行程，并对照预报。'
      if (tone === 'bad') return '当下怎么做：不必按必有雨死等，照常安排并关注临近预报。'
      return '当下怎么做：备一路案，临近再看预报。'
    }
    if (tone === 'good') return `当下怎么做：按「可能发生」准备，留余量。`
    if (tone === 'bad') return `当下怎么做：按「不太发生」安排，少空等。`
    return `当下怎么做：两边都留准备。`
  }
  if (kind === 'find') {
    if (tone === 'good') return `当下怎么做：按原路与常去处再搜「${focus}」，并问知情者。`
    if (tone === 'bad') return `当下怎么做：先挂失/备用方案，搜归搜，期望放低。`
    return `当下怎么做：再搜一轮并改日再问。`
  }
  if (kind === 'should') {
    if (tone === 'good') return `当下怎么做：若决定「${focus}」，先做可逆的一步并留退路。`
    if (tone === 'bad') return `当下怎么做：先不要「${focus}」；把条件与时机补齐再议。`
    return `当下怎么做：「${focus}」先挂起，补信息后再拍板。`
  }
  if (kind === 'suit') {
    if (tone === 'good') return `当下怎么做：「${focus}」可安排，留一点余量。`
    if (tone === 'bad') return `当下怎么做：「${focus}」宜改期或改方案。`
    return `当下怎么做：小范围试「${focus}」，再决定是否铺开。`
  }
  if (kind === 'have') {
    if (tone === 'good') return `当下怎么做：可按「有」来准备，但勿一次押死。`
    if (tone === 'bad') return `当下怎么做：按「无/弱」做预案，少做一厢情愿的投入。`
    return `当下怎么做：先观外应与近几日变动，再下「有/无」的定论。`
  }
  if (tone === 'good') return `当下怎么做：围绕「${focus}」推进；盯近应。`
  if (tone === 'bad') return `当下怎么做：先放下对「${focus}」的硬攻，改条件或换时机。`
  return `当下怎么做：先为「${focus}」补条件，再拍板。`
}

/**
 * 优先用起卦页选项带来的结构化 parsed，否则再解析自由文本（兼容旧盘）
 * @param {string} question
 * @param {{label?: string}|null} topic
 * @param {{parsed?: object}|null} askMeta
 */
function resolveParsed(question, topic, askMeta) {
  if (askMeta && askMeta.parsed && askMeta.parsed.mode) {
    const base = askMeta.parsed
    return Object.assign({}, base, {
      raw: question || base.raw || '',
      shortAsk: base.shortAsk || base.focus || question || '此事'
    })
  }
  return parseQuestion(question, topic)
}

module.exports = {
  MODE_LABEL,
  WHEN_KIND_LABEL,
  ZHI_DIR,
  GUA_DIR,
  GUA_SCENE,
  ZHI_SHICHEN,
  DONG_PERIOD,
  parseQuestion,
  resolveParsed,
  directReply,
  guaDirName,
  modeLabelList,
  yesNoLevel,
  yesNoJudgmentLine,
  yesNoAdvice,
  shichenOfZhi,
  shichenOfDong,
  formatShichenHint,
  listDomains,
  occurPhrase,
  invertTone,
  safetyAdvice,
  safetyLevel,
  safetyJudgmentLine
}
