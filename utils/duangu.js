const {
  relationWuxing,
  suggestYingqi,
  LIUSHEN_MEANING
} = require('./rules')
const {
  parseQuestion,
  resolveParsed,
  directReply,
  ZHI_DIR,
  GUA_DIR,
  GUA_SCENE,
  modeLabelList,
  yesNoLevel,
  yesNoJudgmentLine,
  yesNoAdvice,
  shichenOfZhi,
  formatShichenHint,
  invertTone,
  safetyAdvice,
  safetyLevel,
  safetyJudgmentLine
} = require('./ask')
const { getGuaCi } = require('../data/guaci')

/** 问事类别：用神=主要看什么；元神=帮你的；忌神=碍事的 */
const TOPIC_YONGSHEN = [
  { key: 'wealth', label: '求财', yongshen: '妻财', yuanShen: '子孙', jiShen: '兄弟', tip: '求财主要看「妻财」（钱财）。「子孙」能生财，是助力；「兄弟」容易分财、争利，要小心。' },
  { key: 'career', label: '功名官运', yongshen: '官鬼', yuanShen: '妻财', jiShen: '子孙', tip: '功名官运主要看「官鬼」（职位/名分）。「妻财」生官，是助力；「子孙」克官，发动时要防绊脚。' },
  { key: 'health', label: '疾病健康', yongshen: '世爻', yuanShen: '子孙', jiShen: '官鬼', useShiYing: true, tip: '自占健康先看世爻承受力；「官鬼」常代表病气，「子孙」常代表医药、调养与化解。卦象不能代替诊断。' },
  { key: 'pregnancy', label: '孕产生育', yongshen: '子孙', yuanShen: '兄弟', jiShen: '父母', tip: '孕产问事以「子孙」为主要象意，再参世爻与医护现实；卦象不能判断胎儿性别或替代产检。' },
  { key: 'family_parent', label: '父母长辈', yongshen: '父母', yuanShen: '官鬼', jiShen: '妻财', tip: '问父母长辈以「父母」为用，合看旺衰、空破与动化；健康问题仍以现实医疗为准。' },
  { key: 'family_child', label: '子女晚辈', yongshen: '子孙', yuanShen: '兄弟', jiShen: '父母', tip: '问子女晚辈以「子孙」为用，合看旺衰、空破与动化；现实沟通与照护优先。' },
  { key: 'lawsuit', label: '官司是非', yongshen: '世爻', yuanShen: '父母', jiShen: '', useShiYing: true, tip: '官司宜比较世应强弱，并参「官鬼」（官方程序）与「父母」（证据文书）；不能只凭官鬼旺衰判输赢。' },
  { key: 'marriage', label: '婚姻感情', yongshen: '应爻', yuanShen: '', jiShen: '', useShiYing: true, tip: '未区分问卦者性别时，以应爻代表对方，合看世应生克；不强套男财女官，避免取错用神。' },
  { key: 'marriage_f', label: '婚姻（女测）', yongshen: '官鬼', yuanShen: '妻财', jiShen: '子孙', useShiYing: true, tip: '明确女测感情时可看「官鬼」（夫星），「妻财」生官为助力；仍须合看应爻与现实互动。' },
  { key: 'travel', label: '出行行人', yongshen: '父母', yuanShen: '官鬼', jiShen: '妻财', tip: '出行、行人多看「父母」（文书、行程、道路信息），并参世应与动爻；实时交通和天气应以官方信息为准。' },
  { key: 'weather_rain', label: '雨雪天气', yongshen: '父母', yuanShen: '官鬼', jiShen: '妻财', tip: '传统天气占以「父母」多主雨雪云气；这里只作象意，必须对照官方预报与预警。' },
  { key: 'weather_clear', label: '雨止天晴', yongshen: '子孙', yuanShen: '兄弟', jiShen: '父母', tip: '传统天气占以「子孙」多主晴霁、止雨；这里只作象意，必须对照官方预报与预警。' },
  { key: 'exam', label: '考试文书', yongshen: '父母', yuanShen: '官鬼', jiShen: '妻财', tip: '考试、论文与文书主要看「父母」。「官鬼」生父母，是助力；「妻财」克父母，发动时要防分心或手续受损。' },
  { key: 'lost', label: '失物寻人', yongshen: '妻财', yuanShen: '子孙', jiShen: '兄弟', tip: '失物常看「妻财」（所失之物）；寻人亦可参所求对应的六亲。玄武多主隐匿。' },
  { key: 'general', label: '综合问事', yongshen: '世爻', yuanShen: '', jiShen: '', useShiYing: true, tip: '问事不明确时，先看「世爻」（自己）与「应爻」（事体/对方），再合看动变。' }
]

/** 六十四卦的叙事主旨：用于把卦名、卦辞和所问连成自然断语。 */
const HEXAGRAM_THEME = {
  乾: '势在自强开创，但盛极之时尤其不可亢进',
  坤: '以承载和顺势成事，先安其位，再有所往',
  屯: '开端多阻，先立根基，不能急着求结果',
  蒙: '信息尚昧，宜先求明、求教，不可凭想当然行事',
  需: '条件未齐，等待是蓄势，不是无所作为',
  讼: '彼此意见相争，宜止争求理，不宜把冲突推到极处',
  师: '众事须有主次和纪律，靠组织而非一人逞强',
  比: '成事在亲近可信之人，关系是否相应尤为关键',
  小畜: '力量正在积蓄，眼下宜小步收拢，不宜一下铺开',
  履: '前路可行，但每一步都要守礼、知险、谨慎落脚',
  泰: '上下相通，宜把握交流顺畅之机推动事情',
  否: '上下不交，强推无益，先保存实力、等待闭塞松动',
  同人: '求同存异，转机来自公开合作而非私下猜度',
  大有: '资源与机会已聚，贵在善用，不可因有所得而自满',
  谦: '退一步并非示弱，守谦反而更容易得到承接',
  豫: '人心已有发动之意，但乐观之前仍要做好准备',
  随: '顺势而行可以通达，但所随之人、所随之势必须选对',
  蛊: '旧弊不除，新事难成，眼下重在整顿与修复',
  临: '机会正在靠近，宜亲自面对，也要防盛势不能长久',
  观: '先看清全局与人心，再决定是否介入',
  噬嗑: '中间有物相隔，必须先咬开具体障碍，事情才能重新合上',
  贲: '形式可以润色事情，但根本内容比表面好看更重要',
  剥: '基础正在受损，宜止损固本，不可再向外扩张',
  复: '转机已经萌生，宜循原路归正，不必急于求大',
  无妄: '守真守常可免过失，不宜以侥幸或妄念求成',
  大畜: '力量虽足仍须蓄养，待能力与时机一同成熟再发',
  颐: '成败取决于如何养其根本，也要谨慎言语与所求',
  大过: '承担已超过常度，必须调整结构，不能继续勉强支撑',
  坎: '险阻相重，宜辨路而行，切忌因急躁再入一险',
  离: '事情需要有所依附，越是明亮显眼，越要守住内在清醒',
  咸: '彼此感应是事情的起点，真变化来自双方相互触动',
  恒: '贵在持续与守常，短时热度不足以决定长久结果',
  遯: '退避是保存主动，不与眼前不利之势正面相争',
  遁: '退避是保存主动，不与眼前不利之势正面相争',
  大壮: '力量虽强，也要守正有节，强而失度反会受阻',
  晋: '局面正在向前显明，宜让成果被看见并顺势进阶',
  明夷: '光明受伤，眼下宜藏锋守正，不可把底牌尽露',
  家人: '先正内部次序与各自位置，外部事情才有根基',
  睽: '人心或方向暂不一致，小事可调，大事不宜强合',
  蹇: '前路有难，宜反身修整并求助，不宜孤身犯险',
  解: '紧张正在松动，宜及时处理余患，不可解除后又拖延',
  损: '有所减才能保全根本，眼下宜舍次要、守关键',
  益: '增益之机已现，利于行动，也要让所得真正流向要处',
  夬: '事情到了必须决断之时，但决断要公开、审慎，不可躁进',
  姤: '突来的相遇或机会不可轻忽，也不宜因一时相逢便全盘投入',
  萃: '人和资源正在聚集，关键在有没有共同中心',
  升: '积小而高，宜循序上升，不求一步登顶',
  困: '外在受困，先守住心志和根本，少作无效消耗',
  井: '资源一直都在，关键是能否修好取用它的路径',
  革: '旧局已难维持，变化宜顺时而作，并先取得信任',
  鼎: '事情进入更新与定型阶段，重在用人和安定结构',
  震: '变化来得突然，先定神应变，惊后反能看清方向',
  艮: '该止时止，先停住错误惯性，再决定下一步',
  渐: '事情只能渐进，次序比速度更重要',
  归妹: '关系或安排尚未正位，急于落定容易留下后患',
  丰: '声势与信息都很充足，宜在盛时办事，也要防盛极转衰',
  旅: '身在不稳定之局，宜守分寸，不把暂时状态当成长久归宿',
  巽: '以柔入事、反复沟通，才能逐渐进入核心',
  兑: '沟通能开局，但喜悦与口舌并存，言语必须真诚有度',
  涣: '原有束缚正在散开，宜重新聚心，不可任其离散',
  节: '有所节制才能长久，规则宜适度，不可过严也不可无度',
  中孚: '核心在真实可信，内外相应之后，事情才会由虚转实',
  小过: '可以处理小处、修正细节，大事不宜越级冒进',
  既济: '事情看似已成，后段反要防松懈与细小失序',
  未济: '已经接近结果，但最后一步最易失误，仍不可掉以轻心'
}

/** 根据所问文字自动匹配问事类别，便于断语对准所问 */
function guessTopicKey(question) {
  const q = String(question || '').trim()
  if (!q) return 'general'
  if (/雨停|停雨|天晴|放晴/.test(q)) return 'weather_clear'
  if (/下雨|下雪|雨雪|降温|天气/.test(q)) return 'weather_rain'
  // 先用事体域映射（来客→行人、失物→失物…）
  try {
    const parsed = parseQuestion(q)
    if (parsed && parsed.topicHint && parsed.topicHint !== 'general') return parsed.topicHint
  } catch (e) { /* ignore */ }
  const rules = [
    { key: 'wealth', re: /财|钱|生意|投资|买卖|进账|回款|赚|亏|项目|合同|签约|签下|甲方|成交|谈成|提成|开单|利润|客户单/ },
    { key: 'exam', re: /考试|考研|考公|面试笔试|分数|录取|论文|答辩|审批|证件|执照|报名|过关|上岸/ },
    { key: 'career', re: /升职|晋升|官运|功名|职位|岗位|职称|调动|仕途|当官|提拔|入职|跳槽|工作机会|转正/ },
    { key: 'health', re: /病|疾|疼|痛|手术|住院|康复|治疗|身体|发烧|炎症|孕产|体检|痊愈|好转|严重/ },
    { key: 'lawsuit', re: /官司|诉讼|起诉|纠纷|是非|仲裁|法院|警察|告状|口舌官非/ },
    { key: 'marriage_f', re: /嫁|夫君|老公|他会不会|男友.*婚|女方|我嫁|娶我/ },
    { key: 'marriage', re: /婚|恋|感情|对象|分手|复合|相亲|女友|老婆|妻子|相处|表白|在一起/ },
    { key: 'travel', re: /出行|出门|旅行|出差|行人|归来|航班|火车|路途|搬家远行|客人|来访|来客|快递|送达/ },
    { key: 'lost', re: /丢|失物|寻人|找不着|失踪|遗失|找回|钥匙|手机丢|找得到/ }
  ]
  for (let i = 0; i < rules.length; i++) {
    if (rules[i].re.test(q)) return rules[i].key
  }
  return 'general'
}

const WANG_PLAIN = {
  旺: '力气很足',
  相: '力气较足',
  休: '力气一般',
  囚: '力气偏弱',
  死: '力气很弱'
}

const SY_PLAIN = {
  生: '你主动付出、推动对方或这件事',
  被生: '对方或环境在帮你',
  克: '你能压住对方或主导局面',
  被克: '对方或环境对你有压力',
  比和: '双方力量相当、平行相处'
}

function findYongshenYaos(ben, yongshenName) {
  if (yongshenName === '世爻') return ben.yaos.filter((y) => y.role === '世')
  if (yongshenName === '应爻') return ben.yaos.filter((y) => y.role === '应')
  return ben.yaos.filter((y) => y.liuqin === yongshenName)
}

function yongPriority(y) {
  let score = 0
  if (y.changing) score += 6
  if (y.role === '世' || y.role === '应') score += 3
  if (y.dayMonth && (y.dayMonth.tags.includes('临日') || y.dayMonth.tags.includes('临月'))) score += 3
  if (y.wangshuai === '旺' || y.wangshuai === '相') score += 2
  if (y.kong) score -= 2
  if (y.dayMonth && y.dayMonth.chongYue) score -= 3
  return score
}

function primaryYongOf(yongList) {
  return (yongList || []).slice().sort((a, b) => yongPriority(b) - yongPriority(a))[0] || null
}

function yaoName(y) {
  if (!y) return '—'
  return `${y.name}的${y.liuqin}（${y.ganZhi}${y.wuxing}）`
}

function statusBits(y) {
  const bits = []
  if (y.wangshuai) bits.push(WANG_PLAIN[y.wangshuai] || y.wangshuai)
  if (y.kong) bits.push(y.changing ? '动而逢空' : '空亡（还不踏实）')
  if (y.changing) bits.push('正在发动')
  if (y.role === '世') bits.push('落在世爻（代表你）')
  if (y.role === '应') bits.push('落在应爻（代表对方/事体）')
  if (y.dayMonth && y.dayMonth.tags && y.dayMonth.tags.length) {
    bits.push(y.dayMonth.tags.join('、'))
  }
  return bits
}

function scoreTendency(parts) {
  const help = parts.help || 0
  const hinder = parts.hinder || 0
  const diff = help - hinder
  if (diff >= 2) {
    return { level: '可成', tone: 'good', note: '助力大于阻碍，所问之事有望落实。', diff }
  }
  if (diff >= 1) {
    return { level: '偏可成', tone: 'good', note: '略占上风，所问可推进，仍防空亡与反复。', diff }
  }
  if (diff <= -2) {
    return { level: '难成', tone: 'bad', note: '阻碍明显，所问难遂；宜止或改道。', diff }
  }
  if (diff <= -1) {
    return { level: '偏难成', tone: 'bad', note: '略落下风，所问推进费力；宜缓或另图。', diff }
  }
  return { level: '两可', tone: 'mid', note: '助力与阻碍相当，所问未分高下。', diff }
}

/** 应期要点：把用神状态落成「何时」可读句 */
function timingPoints(ctx) {
  const { yongList, fu, calendar, changingIndexes } = ctx
  const tips = []
  const y = ctx.primaryYong || (yongList && yongList[0])
  if (y) {
    suggestYingqi(y, calendar, y.dayMonth || {}).forEach((t) => tips.push(t))
    if (y.zhi) {
      tips.push(`可重点看「${y.zhi}」日、冲「${y.zhi}」日，或「${y.zhi}」月令当令之时。`)
    }
    if (y.kong) tips.push(`用神空亡：出空或冲实「${y.zhi}」后，事情更易应验。`)
    if (y.changing && y.changeTo && y.changeTo.analysis && y.changeTo.analysis.jinTui) {
      const jt = y.changeTo.analysis.jinTui
      if (jt.type === '化进神') tips.push('化进神，应期偏向前推进、由近及远发展。')
      if (jt.type === '化退神') tips.push('化退神，应期易拖、回缩，不宜盯死最近几天。')
    }
    if (y.dayMonth && y.dayMonth.chongRi) tips.push('日辰冲动用神：近应概率高，这几日宜留心。')
    if (y.dayMonth && y.dayMonth.heRi) tips.push('日辰合住用神：暂胶着，等破合之日更有戏。')
  } else if (fu) {
    tips.push('用神伏藏：等飞神被冲开，或岁月出现伏神地支，事情才容易露头。')
  }
  if (!changingIndexes || !changingIndexes.length) {
    tips.push('六爻安静：应期往往偏慢，少突发，多随日月推移。')
  } else {
    tips.push(`有动爻 ${changingIndexes.length} 处：变化窗口更明确，宜结合动爻地支看近应。`)
  }
  if (calendar && calendar.day && calendar.day.zhi) {
    tips.push(`起卦日支为「${calendar.day.zhi}」，可与用神地支的冲合关系对照看远近。`)
  }
  return tips
}

/** 方位要点 */
function placePoints(ctx) {
  const { yongList, fu, ben, shi, ying, topic } = ctx
  const tips = []
  const y = ctx.primaryYong || (yongList && yongList[0])
  if (y && y.zhi && ZHI_DIR[y.zhi]) {
    tips.push(`用神地支「${y.zhi}」，传统方位偏「${ZHI_DIR[y.zhi]}」。`)
  }
  if (ben) {
    if (ben.lower && GUA_DIR[ben.lower.name]) tips.push(`内卦「${ben.lower.name}」后天位在「${GUA_DIR[ben.lower.name]}」（多主近处、己方、目前）。`)
    if (ben.upper && GUA_DIR[ben.upper.name]) tips.push(`外卦「${ben.upper.name}」后天位在「${GUA_DIR[ben.upper.name]}」（多主远处、对方、外部）。`)
    if (ben.palaceName && GUA_DIR[ben.palaceName.replace(/宫$/, '')]) {
      const pn = ben.palaceName.replace(/宫$/, '')
      tips.push(`本宫「${ben.palaceName}」可参「${GUA_DIR[pn]}」一侧。`)
    }
  }
  if (ying && ying.zhi && ZHI_DIR[ying.zhi]) {
    tips.push(`应爻地支「${ying.zhi}」，事体/对方方位可参「${ZHI_DIR[ying.zhi]}」。`)
  }
  if (fu) tips.push('用神伏藏：方位信号偏弱，先定事体浮现，再细看方位。')
  if (!tips.length) tips.push('卦上方位信号不足，宜改日再问，或结合现场罗盘核验。')
  return tips
}

function primaryPlace(ctx) {
  const { yongList, ying, ben } = ctx
  const y = ctx.primaryYong || (yongList && yongList[0])
  if (y && y.zhi && ZHI_DIR[y.zhi]) return ZHI_DIR[y.zhi]
  if (ying && ying.zhi && ZHI_DIR[ying.zhi]) return ZHI_DIR[ying.zhi]
  if (ben && ben.upper && GUA_DIR[ben.upper.name]) return GUA_DIR[ben.upper.name]
  if (ben && ben.lower && GUA_DIR[ben.lower.name]) return GUA_DIR[ben.lower.name]
  return ''
}

/** 本卦一句依据 */
function evidenceLine(ctx) {
  const { topic, yongList, fu, shi, ying, changingIndexes, ben } = ctx
  const bits = []
  if (ben && ben.name) bits.push(`本卦${ben.name}`)
  if (yongList && yongList.length) {
    const y = ctx.primaryYong || yongList[0]
    let s = `用神在${yaoName(y)}`
    if (y.wangshuai) s += `，月令${y.wangshuai}`
    if (y.kong) s += y.changing ? '，动而逢空' : '，逢空'
    if (y.changing && y.changeTo) s += `，动化${y.changeTo.text}`
    bits.push(s)
  } else if (fu) {
    bits.push(`${topic.yongshen}伏藏（${fu.text}）`)
  } else if (topic.yongshen === '世爻' && shi) {
    bits.push(`以世为主：${yaoName(shi)}${shi.wangshuai ? '，' + shi.wangshuai : ''}`)
  } else {
    bits.push(`${topic.yongshen}未现`)
  }
  if (shi && ying && topic.useShiYing) bits.push(`世应${relationWuxing(shi.wuxing, ying.wuxing)}`)
  if (changingIndexes && changingIndexes.length) bits.push(`动爻${changingIndexes.length}处`)
  else bits.push('六爻安静')
  return bits.join('；')
}

function adjustToneLevel(ctx, tone, level) {
  const { topic, yongList, fu, yinPattern } = ctx
  const judgedYong = ctx.primaryYong ? [ctx.primaryYong] : yongList
  const yongWeak = judgedYong.some((y) => y.wangshuai === '囚' || y.wangshuai === '死')
  const yongKong = judgedYong.some((y) => y.kong) || (fu && fu.kong)
  const yongMovingGood = judgedYong.some((y) => {
    const a = y.changeTo && y.changeTo.analysis
    return a && a.huiTou && a.huiTou.type === '回头生'
  })
  const yongMovingBad = judgedYong.some((y) => {
    const a = y.changeTo && y.changeTo.analysis
    return a && a.huiTou && a.huiTou.type === '回头克'
  })

  if (!yongList.length && !fu && topic.yongshen !== '世爻') {
    return { tone: 'mid', level: '事未明' }
  }
  if (!yongList.length && fu) {
    if (tone === 'good') return { tone, level: '可望·待引出' }
    if (tone === 'bad') return { tone, level: '难成·仍伏' }
    return { tone, level: '未出台·宜等' }
  }
  if (tone === 'good' && (yongKong || yongWeak || yongMovingBad)) {
    return { tone, level: level === '可成' ? '可成·待实' : '偏可成·有虚' }
  }
  if (tone === 'bad' && yongMovingGood) return { tone, level: '偏难·有转机' }
  if (tone === 'mid') {
    if (judgedYong.some((y) => y.wangshuai === '旺' || y.wangshuai === '相') && !yongKong) {
      return { tone: 'good', level: '勉强可成' }
    }
    if (yongWeak || yongKong) return { tone: 'bad', level: '把握不大' }
  }
  return { tone, level }
}

function whoHintFromCtx(ctx) {
  const { yongList, shi, ying, topic } = ctx
  const y = (ctx.parsed && ctx.parsed.mode === 'who' && ying)
    || ctx.primaryYong
    || (yongList && yongList[0])
  if (y) {
    const role =
      y.liuqin === '官鬼' ? '管事/上级/制度方'
        : y.liuqin === '父母' ? '长辈/文书/平台方'
          : y.liuqin === '妻财' ? '对方（利益或情感相关）'
            : y.liuqin === '子孙' ? '晚辈/下属/执行人'
              : y.liuqin === '兄弟' ? '同行/竞争/平辈'
                : '关键当事人'
    const side = y.role === '应' ? '应爻·对方侧' : y.role === '世' ? '世爻·我方侧' : `${y.name}`
    return `${role}，落在${side}`
  }
  if (ying) return `应爻所指之人（${ying.liuqin || '对方'}）`
  if (shi) return '世应关系中的对方一侧'
  return topic && topic.yongshen ? `与「${topic.yongshen}」相关之人` : ''
}

function choicePickFromParsed(parsed, tone) {
  // 单凭整体顺逆，不能把选项排列顺序强行对应吉凶。
  return ''
}

function philosophyGuidance(tone, focus, parsed) {
  if (parsed && parsed.negativeEvent) return '先核事实，再定边界，不以卦象替代证据。'
  if (parsed && (parsed.domain === 'health' || parsed.domain === 'pregnancy')) return '卦可定心，不可代医；以检查、复诊和专业意见为准。'
  if (parsed && parsed.domain === 'weather') return '以官方预报和现场情况为准，卦象只作趋避提醒。'
  if (parsed && parsed.domain === 'lost' && /寻人|人/.test(String(parsed.focus || ''))) return '先联络、查找和报警，勿因卦象耽误行动。'
  if (parsed && parsed.mode === 'choice') return '先做可逆的小步验证，再决定是否重注。'
  if (tone === 'good') return '可进，但以守正、守信并留有余地为度。'
  if (tone === 'bad') return `宜先止损换势，不与「${focus}」的逆势硬争。`
  return `先小步求证「${focus}」，条件明朗后再定。`
}

/** 按问题类型组织判断与建议 */
function buildJudgment(ctx) {
  const {
    topic, tendency, question, yongList, fu, changingIndexes, yinPattern, shi, ying, ben, calendar
  } = ctx
  const parsed = resolveParsed(question, topic, ctx.askMeta)
  const quiet = !changingIndexes.length
  const fanYin = yinPattern && yinPattern.fanYin
  const fuYin = yinPattern && yinPattern.fuYin

  let { tone, level } = adjustToneLevel(ctx, tendency.tone, tendency.level)
  const answerTone = parsed.mode === 'yesno' && parsed.negativeEvent ? invertTone(tone) : tone
  const mild = /偏|勉|虚|待|小|两可|未明|把握/.test(String(level))

  const place = primaryPlace(ctx)
  const tPoints = timingPoints(ctx)
  const pPoints = placePoints(ctx)
  ctx.parsed = parsed
  const whoHint = whoHintFromCtx(ctx)
  const choicePick = choicePickFromParsed(parsed, tone)
  const primaryYong = ctx.primaryYong || yongList[0]
  let whenHint = ''
  let clockHint = ''
  if (primaryYong && primaryYong.zhi) {
    whenHint = `重点看「${primaryYong.zhi}」日/冲「${primaryYong.zhi}」日`
    if (primaryYong.kong) whenHint += `，以及出空填实之后`
  } else if (fu) {
    whenHint = '等伏神引出或飞神冲开'
  }

  // 「几点」：用地支映射时辰；优先用神，其次动爻，再次世爻
  if (parsed.whenKind === 'clock') {
    let zhi = ''
    if (primaryYong && primaryYong.zhi) zhi = primaryYong.zhi
    else {
      const moving = (ctx.ben && ctx.ben.yaos) ? ctx.ben.yaos.filter((y) => y.changing) : []
      if (moving[0] && moving[0].zhi) zhi = moving[0].zhi
      else if (shi && shi.zhi) zhi = shi.zhi
    }
    const sc = shichenOfZhi(zhi)
    clockHint = formatShichenHint(sc)
    if (clockHint) whenHint = clockHint
  }

  if (parsed.mode === 'when') {
    if (parsed.whenKind === 'clock') {
      level = clockHint
        ? (tone === 'bad' ? `时刻信号弱·${clockHint}` : `时刻偏${clockHint}`)
        : '时刻未明'
    } else if (tone === 'good') level = quiet ? '应期偏稳偏慢' : '应期偏近'
    else if (tone === 'bad') level = '应期迟滞'
    else level = '应期未明'
  } else if (parsed.mode === 'where') {
    level = place ? `方位偏${place}` : '方位未明'
  } else if (parsed.mode === 'jixiong') {
    if (tone === 'good') level = mild ? '小吉' : '偏吉'
    else if (tone === 'bad') level = mild ? '小凶' : '偏凶'
    else level = '平'
  } else if (parsed.mode === 'who') {
    level = whoHint ? (tone === 'good' ? '宜对接' : tone === 'bad' ? '宜慎择' : '宜再观') : '人物未明'
  } else if (parsed.mode === 'choice') {
    level = parsed.choice ? '两项待比较' : '选项未明'
  } else if (parsed.mode === 'degree') {
    if (parsed.domain === 'health' || parsed.domain === 'pregnancy') level = '须医学评估'
    else if (tone === 'good') level = mild ? '偏轻' : '不重'
    else if (tone === 'bad') level = mild ? '偏重' : '偏严重'
    else level = '轻重未分'
  } else if (parsed.mode === 'yesno') {
    level = yesNoLevel(parsed, answerTone, mild)
  } else if (parsed.mode === 'how') {
    if (tone === 'good') level = '宜进取'
    else if (tone === 'bad') level = '宜先守'
    else level = '宜备后动'
  }
  const guardedLevel = safetyLevel(parsed)
  if (guardedLevel) level = guardedLevel

  const focus = parsed.focus
  const askRef = parsed.raw
    ? `你问的是「${parsed.raw}」（按「${parsed.modeLabel}」来断）`
    : `本次按「${topic.label}·${parsed.modeLabel}」来断`
  const evidence = evidenceLine(ctx)

  let judgment = ''

  const guardedJudgment = safetyJudgmentLine(
    parsed,
    parsed.mode === 'yesno' ? answerTone : tone
  )
  if (guardedJudgment) {
    judgment += guardedJudgment
  } else if (parsed.mode === 'where') {
    judgment += place
      ? `判断：你问的方位，重点看「${place}」（事体「${focus}」）。`
      : `判断：你问的方位信号不足，暂不宜钉死一处。`
    judgment += pPoints.slice(0, 3).join('')
  } else if (parsed.mode === 'when' && parsed.whenKind === 'clock') {
    judgment += clockHint
      ? `判断：你问的是「几点」——「${focus}」象意时刻偏${clockHint}（取用神/动爻地支合十二时辰）。`
      : `判断：你问的是「几点」，但卦上时刻信号不足，不宜钉死钟点。`
  } else if (parsed.mode === 'when') {
    judgment += `判断：你问的时机——「${focus}」${tone === 'good' ? '偏有可盼' : tone === 'bad' ? '偏迟或反复' : '尚不明朗'}。`
    if (whenHint) judgment += `${whenHint}。`
    judgment += tPoints.slice(0, 3).join('')
  } else if (parsed.mode === 'jixiong') {
    judgment += `判断：你问的吉凶——「${focus}」整体${tone === 'good' ? '偏吉' : tone === 'bad' ? '偏凶' : '吉凶交杂'}。`
  } else if (parsed.mode === 'who') {
    judgment += whoHint
      ? `判断：你问找谁——关键偏「${whoHint}」。`
      : '判断：人物象不足，宜改问「找谁/靠谁」或参应爻。'
  } else if (parsed.mode === 'choice') {
    if (parsed.choice) {
      judgment += `判断：你问「${parsed.choice.a}」还是「${parsed.choice.b}」——本卦只显示当前抉择环境${tone === 'good' ? '偏顺' : tone === 'bad' ? '偏滞' : '未明'}，不能把先写的选项自动当吉、后写的自动当凶。`
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

  judgment += `卦上依据：${evidence}。`
  if (fanYin) judgment += '另有反吟，结果易反复。'
  if (fuYin) judgment += '另有伏吟，局面易胶着。'

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
      ? `当下怎么做：先往「${place}」一侧排查/行动，再对照应爻与现场核验；勿只认一个点。`
      : '当下怎么做：方位未明，宜改问「具体何方」，或到现场用罗盘辅助。'
  } else if (parsed.mode === 'when' && parsed.whenKind === 'clock') {
    advice = clockHint
      ? `当下怎么做：按${clockHint}前后观察「${focus}」；同时看天气预报作对照。卦象只给时辰区间，不是精确到分钟。`
      : `当下怎么做：整日分段留意「${focus}」，并对照实况；本卦时刻信号不足。`
  } else if (parsed.mode === 'when') {
    advice = whenHint
      ? `当下怎么做：把日程对到${whenHint}；空亡则等出空，合住则等破合。`
      : '当下怎么做：先记用神地支与动爻，逐日对照冲合，不空等。'
  } else if (parsed.mode === 'who') {
    advice = whoHint
      ? (tone === 'good'
        ? `当下怎么做：优先对接「${whoHint}」，带具体方案一次说清。`
        : tone === 'bad'
          ? `当下怎么做：对「${whoHint}」先观再动，勿一次押死；可另寻生扶之源。`
          : `当下怎么做：可接触「${whoHint}」，同时准备备选联系人。`)
      : '当下怎么做：人物未明，先看应爻与用神六亲，再决定找谁。'
  } else if (parsed.mode === 'choice') {
    if (parsed.choice) {
      advice = `当下怎么做：给「${parsed.choice.a}」与「${parsed.choice.b}」使用同一组标准，比较收益、代价、可逆性和最坏结果；信息不足时先做低成本验证。`
    } else {
      advice = '当下怎么做：用「甲还是乙」把两个选项写清楚再起一卦。'
    }
  } else if (parsed.mode === 'jixiong') {
    advice = tone === 'good'
      ? `当下怎么做：吉中仍防忌神；可推进「${focus}」，但留退路。`
      : tone === 'bad'
        ? `当下怎么做：凶象当前，收缩「${focus}」风险，勿扩大敞口。`
        : `当下怎么做：平局则小步试错，不为「${focus}」一次押死。`
  } else if (parsed.mode === 'how') {
    advice = tone === 'good'
      ? '当下怎么做：主动推进，借元神生扶，避开忌神发动窗口。'
      : tone === 'bad'
        ? '当下怎么做：先止损、改条件；忌神发动时尤其别硬闯。'
        : '当下怎么做：补条件、作两手准备，用神有气再加码。'
  } else if (parsed.mode === 'degree') {
    advice = (parsed.domain === 'health' || parsed.domain === 'pregnancy')
      ? `当下怎么做：记录「${focus}」的症状、持续时间和检查结果；有加重或警示症状及时就医。`
      : tone === 'good'
        ? `当下怎么做：「${focus}」按较轻压力处理，仍保持观察。`
        : tone === 'bad'
          ? `当下怎么做：「${focus}」宜重视，该求助时别拖。`
          : `当下怎么做：持续观察「${focus}」变化，勿自行下死结论。`
  } else if (parsed.mode === 'yesno') {
    advice = yesNoAdvice(parsed, answerTone)
  } else if (tone === 'good') {
    advice = `当下怎么做：围绕「${focus}」推进；盯近应，防忌神搅局。`
  } else if (tone === 'bad') {
    advice = `当下怎么做：先放下对「${focus}」的硬攻，改条件或换时机。`
  } else {
    advice = `当下怎么做：先为「${focus}」补条件，待用神有气再拍板。`
  }

  if (
    shi && ying
    && parsed.mode !== 'where'
    && parsed.mode !== 'who'
    && parsed.mode !== 'choice'
    && parsed.whenKind !== 'clock'
    && parsed.yesKind !== 'occur'
    && !parsed.negativeEvent
    && !['health', 'pregnancy', 'lawsuit', 'invest', 'property'].includes(parsed.domain)
    && !(parsed.domain === 'lost' && /寻人|人/.test(String(parsed.focus || '')))
  ) {
    const sy = relationWuxing(shi.wuxing, ying.wuxing)
    if (sy === '被克') advice += '你（世）受对方/环境所克，接触对方时宜守。'
    if (sy === '被生') advice += `你（世）得对方/环境所生，可借力办「${focus}」。`
    if (sy === '克') advice += `你能压住对方/事体，办「${focus}」时可主导，但勿过刚。`
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
    label: level,
    parsed,
    timingTips: tPoints,
    placeTips: pPoints,
    place,
    whenHint,
    clockHint,
    whoHint,
    choicePick,
    answerTone
  }
}

function uniqueText(items) {
  return (items || []).filter((item, index, list) => item && list.indexOf(item) === index)
}

function guaCiOf(gua) {
  if (!gua) return null
  return getGuaCi(gua.alias || gua.name) || null
}

/**
 * 所问推理画像：同一卦用于不同问题时，证据权重必须不同。
 * 每个轴都对应一个现实问题，同时指定要观察的卦爻角色。
 */
function questionProfile(ctx, judgment) {
  const parsed = judgment.parsed || {}
  const id = (ctx.askMeta && ctx.askMeta.optionId) || ''
  const domain = parsed.domain || 'general'
  const base = {
    kind: 'general',
    result: parsed.focus || '此事',
    premise: '这不是只看一个“吉凶分数”，而要分别判断你、目标、外部承接与实际阻力。',
    axes: [
      { key: 'self', label: '你的承接能力', role: 'shi', purpose: '你是否有能力把事情接住' },
      { key: 'target', label: '目标是否成形', role: 'yong', purpose: '所求结果是否已有现实基础' },
      { key: 'outside', label: '外部是否配合', role: 'ying', purpose: '对方或环境是否愿意配合' }
    ],
    action: `先验证「${parsed.focus || '此事'}」最关键的现实条件，再决定是否继续投入。`
  }

  if (/^em-(have|like)$/.test(id)) return {
    kind: 'emotion-feeling', result: '对方心意',
    premise: '问“有没有感情”，不能只看关系吉凶；要分开看对方心里是否有你、是否愿意向你靠近，以及这种心意能否变成持续行动。',
    axes: [
      { key: 'other', label: '对方真实心意', role: 'ying', purpose: '对方是否有稳定回应' },
      { key: 'mutual', label: '双方是否相向', role: 'shi-ying', purpose: '感情是双向流动还是单方投入' },
      { key: 'interference', label: '外部干扰', role: 'liuqin:兄弟', polarity: 'risk', purpose: '竞争、旁人或资源分流是否介入' }
    ],
    action: '不要继续猜“喜欢不喜欢”；观察对方是否主动联系、安排见面并承担关系责任。只有连续行动，才算卦上心意真正落地。'
  }
  if (/^em-(together|back)$/.test(id)) return {
    kind: 'emotion-union', result: id === 'em-back' ? '复合' : '在一起',
    premise: '问能否走到一起，重点不是还剩多少情绪，而是旧有冲突能否解除、双方能否重新对接并形成新的相处方式。',
    axes: [
      { key: 'mutual', label: '双方重新对接', role: 'shi-ying', purpose: '双方是否仍有牵引并愿意靠近' },
      { key: 'other', label: '对方是否落实', role: 'ying', purpose: '对方是否会把态度变成行动' },
      { key: 'interference', label: '旧问题与旁人干扰', role: 'liuqin:兄弟', polarity: 'risk', purpose: '原有矛盾或第三方是否继续分散关系' }
    ],
    action: '先谈清导致分离或迟迟不能确定关系的那个具体问题，并约定一个可验证的下一步；只有态度、时间和行动同时出现，才宜继续投入。'
  }
  if (id === 'em-marry') return {
    kind: 'emotion-marriage', result: '成婚',
    premise: '成婚是“关系落地”，除感情外还要看双方意愿、家庭与证件礼仪能否承接，不能把有感情直接等同于能结婚。',
    axes: [
      { key: 'mutual', label: '双方婚意', role: 'shi-ying', purpose: '双方是否真正同向' },
      { key: 'other', label: '对方落实程度', role: 'ying', purpose: '对方是否愿意承担婚姻责任' },
      { key: 'formal', label: '家庭与手续', role: 'liuqin:父母', purpose: '家庭、礼仪、证件和现实安排是否具备' }
    ],
    action: '把婚期、家庭意见、居住与经济安排逐项谈清。若只有口头承诺而没有时间表和实际准备，应把它视为尚未成形。'
  }
  if (id === 'em-third') return {
    kind: 'emotion-third', result: '第三者迹象', negativeOutcome: true,
    premise: '卦象只能提示关系中是否存在竞争、隐情或资源分流，不能把某一爻直接当作“第三者证据”。',
    axes: [
      { key: 'mutual', label: '双方关系稳定度', role: 'shi-ying', purpose: '双方是否仍然相向' },
      { key: 'interference', label: '竞争与分心信号', role: 'liuqin:兄弟', polarity: 'risk', purpose: '是否出现明显竞争或资源分流' },
      { key: 'hidden', label: '隐情信号', role: 'liushen:玄武', polarity: 'risk', purpose: '是否有隐瞒、暧昧或信息不透明' }
    ],
    action: '不要凭卦指认任何人。先核对可验证事实：联系是否异常、承诺是否反复、时间去向是否无法解释；没有事实证据，不宜下“有第三者”的结论。'
  }
  if (domain === 'emotion') return {
    kind: 'emotion', result: parsed.focus || '这段感情',
    premise: '感情题不能把“有感情、愿行动、能长期相处”混成一个答案；要分别看双方是否相向、对方是否落实，以及现实阻力是否能被处理。',
    axes: [
      { key: 'mutual', label: '双方关系方向', role: 'shi-ying', purpose: '双方是相向、单方投入还是彼此牵制' },
      { key: 'other', label: '对方行动', role: 'ying', purpose: '对方是否会把态度变成持续行动' },
      { key: 'interference', label: '关系阻力', role: 'liuqin:兄弟', polarity: 'risk', purpose: '旁人、旧问题或资源分流是否持续干扰' },
      { key: 'formal', label: '现实承接', role: 'liuqin:父母', purpose: '见面、家庭、承诺和实际安排是否能落地' }
    ],
    action: '把问题落到一个可验证的行动上：是否主动联系、是否安排见面、是否给出明确承诺。若只有情绪表达而没有连续行动，应降低预期。'
  }
  if (/^ex-paper$/.test(id)) return {
    kind: 'research-paper', result: '论文接收',
    premise: '论文能否接收，要同时看稿件本身、评审或编辑的裁量，以及修改回应能否消除关键质疑。',
    axes: [
      { key: 'paper', label: '稿件与证据链', role: 'liuqin:父母', purpose: '论文、数据和论证是否站得住' },
      { key: 'review', label: '评审与录用门槛', role: 'liuqin:官鬼', purpose: '评审标准和正式决定是否承接' },
      { key: 'editor', label: '编辑或评审态度', role: 'ying', purpose: '决定方是否愿意继续推进' },
      { key: 'author', label: '修改执行力', role: 'shi', purpose: '你是否能把关键问题改到位' }
    ],
    action: '不要平均用力润色全文；先找出最可能导致拒稿的一条核心质疑，补证据或收缩结论，再逐条建立“意见—修改—证据位置”的闭环。'
  }
  if (/^ex-(pass|score|admit|school|interview|jx|how)$/.test(id)) return {
    kind: 'exam', result: parsed.focus || '考试结果',
    premise: '考试题要把“会不会”拆成三件事：你的发挥、知识与答卷是否成形，以及录取或评分门槛是否对你有利。',
    axes: [
      { key: 'self', label: '临场承接与发挥', role: 'shi', purpose: '你能否稳定发挥已有能力' },
      { key: 'paper', label: '知识与答卷', role: 'liuqin:父母', purpose: '复习、答题和材料是否扎实' },
      { key: 'rank', label: '名次与录取门槛', role: 'liuqin:官鬼', purpose: '评分、竞争和录取环节是否承接' },
      { key: 'gate', label: '决定方反馈', role: 'ying', purpose: '考官、学校或用人方是否放行' }
    ],
    action: '把剩余准备集中到最薄弱且最影响得分的一项；同时逐项核对报名、材料、时间与答题规范，避免能力够而在程序环节失分。'
  }
  if (/^ex-(project|experiment)$/.test(id)) return {
    kind: 'research-project', result: parsed.focus || '科研事项',
    premise: '科研事项不能只问“做不做得成”，要区分方案是否成立、证据能否复现，以及评审或资源是否愿意支持。',
    axes: [
      { key: 'method', label: '方案与材料', role: 'liuqin:父母', purpose: '方法、数据和申请材料是否完整' },
      { key: 'result', label: '可见成果', role: 'liuqin:子孙', purpose: '实验结果或项目产出是否能出现' },
      { key: 'gate', label: '评审与管理门槛', role: 'liuqin:官鬼', purpose: '审批、规范和评价体系是否承接' },
      { key: 'self', label: '执行能力', role: 'shi', purpose: '你能否持续推进并处理偏差' }
    ],
    action: '先验证最关键假设，保留失败判据和替代路线；若涉及申报，把创新点、证据、预算和执行人对应到同一条逻辑链。'
  }
  if (/^ca-/.test(id) || domain === 'career') return {
    kind: 'career', result: parsed.focus || '事业事项',
    premise: '事业题要区分你的能力、职位名分、组织决定和合同手续；其中任何一环没有承接，都可能出现“有机会但不落地”。',
    axes: [
      { key: 'self', label: '你的筹码', role: 'shi', purpose: '能力、业绩和主动权是否足够' },
      { key: 'position', label: '职位与名分', role: 'liuqin:官鬼', purpose: '岗位、提拔或正式认可是否存在' },
      { key: 'organization', label: '组织决定', role: 'ying', purpose: '上级或用人方是否愿意承接' },
      { key: 'formal', label: '合同与手续', role: 'liuqin:父母', purpose: '通知、合同和流程是否能够落地' }
    ],
    action: '先确认真正的决策人和决定节点，再把可量化成果递到对方手里；若只是口头认可而没有岗位、时间表或书面流程，不宜当作已经落实。'
  }
  if (/^we-(back|debt)$/.test(id)) return {
    kind: 'receivable', result: parsed.focus || '回款',
    premise: '回款不只是“有没有财”，还要看付款方是否行动、合同凭据是否完整，以及资金是否被其他支出或争议分流。',
    axes: [
      { key: 'money', label: '款项本身', role: 'liuqin:妻财', purpose: '资金是否真实存在并可调动' },
      { key: 'payer', label: '付款方意愿', role: 'ying', purpose: '对方是否会实际付款' },
      { key: 'contract', label: '合同与凭据', role: 'liuqin:父母', purpose: '付款条件、票据和证据是否完整' },
      { key: 'diversion', label: '分流与拖欠', role: 'liuqin:兄弟', polarity: 'risk', purpose: '竞争性支出、争议或他人分财是否阻碍回款' }
    ],
    action: '立即确认付款责任人、金额、触发条件和确切日期，并形成书面记录；若对方只说“尽快”而不给日期，应按拖延处理。'
  }
  if (/^we-/.test(id) || domain === 'wealth' || domain === 'partner') return {
    kind: 'wealth', result: parsed.focus || '求财经营',
    premise: '求财要分清钱是否存在、客户是否成交、合同能否锁定，以及成本和竞争是否吞掉利润。',
    axes: [
      { key: 'money', label: '真实财源', role: 'liuqin:妻财', purpose: '收入或利润是否有现实来源' },
      { key: 'customer', label: '客户与对手方', role: 'ying', purpose: '对方是否愿意成交和履约' },
      { key: 'contract', label: '合同与交付', role: 'liuqin:父母', purpose: '条款、凭据和交付是否锁得住' },
      { key: 'cost', label: '成本与分利', role: 'liuqin:兄弟', polarity: 'risk', purpose: '竞争、成本和分成是否侵蚀收益' }
    ],
    action: '先算净收益而不是只看成交额；把付款节点、违约责任和退出条件写入合同，利润不足以覆盖最坏损失时不宜勉强成交。'
  }
  if (/^in-/.test(id) || domain === 'invest' || domain === 'property') return {
    kind: 'investment', result: parsed.focus || '投资置业', guarded: true,
    premise: '投资题必须把资产、收益、风险和退出分开判断；“财爻有气”不等于价格合理，更不等于适合重仓。',
    axes: [
      { key: 'value', label: '资产与合同基础', role: 'liuqin:父母', purpose: '标的、产权、合同和信息是否可靠' },
      { key: 'return', label: '收益来源', role: 'liuqin:妻财', purpose: '收益是否真实且可持续' },
      { key: 'risk', label: '债务与潜在风险', role: 'liuqin:官鬼', polarity: 'risk', purpose: '杠杆、责任和隐藏风险是否放大' },
      { key: 'cost', label: '成本与竞争', role: 'liuqin:兄弟', polarity: 'risk', purpose: '价格、费用和竞争是否侵蚀回报' }
    ],
    action: '先做现金流、最坏损失和退出测试，再核产权、合同和负债；即使卦象偏顺，也只应在承受得起损失的范围内行动。'
  }
  if (/^do-/.test(id) || domain === 'document') return {
    kind: 'document', result: parsed.focus || '审批事项',
    premise: '审批能否通过，关键在材料是否合规、经办或决定方是否承接，以及申请人能否及时补正。',
    axes: [
      { key: 'file', label: '材料完整度', role: 'liuqin:父母', purpose: '申请、证明和格式是否合规' },
      { key: 'authority', label: '审批门槛', role: 'liuqin:官鬼', purpose: '规则、审核和正式决定是否放行' },
      { key: 'handler', label: '经办方反馈', role: 'ying', purpose: '经办人或机构是否愿意推进' },
      { key: 'self', label: '补正与跟进', role: 'shi', purpose: '你能否及时回应并补齐条件' }
    ],
    action: '按清单逐项复核材料，并直接询问经办人“目前缺哪一项、下一节点是什么、何时反馈”；不要只等系统状态变化。'
  }
  if (/^la-/.test(id) || domain === 'lawsuit') return {
    kind: 'lawsuit', result: parsed.focus || '纠纷', guarded: true,
    premise: '纠纷不能只比世应强弱；证据是否成立、程序是否启动、对方是否有反制，才决定现实走向。',
    axes: [
      { key: 'self', label: '你方位置', role: 'shi', purpose: '你方是否站得住并能持续应对' },
      { key: 'opponent', label: '对方力量', role: 'ying', polarity: 'risk', purpose: '对方是否占有资源或形成反制' },
      { key: 'evidence', label: '证据与文书', role: 'liuqin:父母', purpose: '证据链和书面材料是否完整' },
      { key: 'procedure', label: '程序与公权力', role: 'liuqin:官鬼', purpose: '正式程序是否真正介入并有效运转' }
    ],
    action: '先固定证据、梳理时间线并确认法定时限，再咨询专业人士。卦象只能帮助整理风险，不能替代法律判断或决定是否报警、起诉。'
  }
  if (/^fa-/.test(id) || domain === 'family') return {
    kind: 'family', result: parsed.focus || '家事',
    premise: '家事不能只看一方旺衰，要分清所问亲人的状态、你能否承接、家庭环境是否配合，以及矛盾是否正在被激化。',
    axes: [
      { key: 'person', label: '所问亲人或家事', role: 'yong', purpose: '所问对象是否稳定并有承接' },
      { key: 'self', label: '你的照应能力', role: 'shi', purpose: '你是否能有效沟通和处理' },
      { key: 'family', label: '家庭环境', role: 'ying', purpose: '其他家人和现实环境是否配合' },
      { key: 'conflict', label: '矛盾压力', role: 'liuqin:官鬼', polarity: 'risk', purpose: '担忧、冲突或现实压力是否加剧' }
    ],
    action: '先找出家庭中最具体的一处矛盾，分别确认各方真实诉求和可接受底线；不要把所有问题一次解决，先处理最容易引发连锁反应的一项。'
  }
  if (/^he-/.test(id) || domain === 'health' || domain === 'pregnancy') return {
    kind: 'health', result: parsed.focus || '健康事项', safe: true,
    premise: '健康题只能把卦象当作风险提醒：世爻看承受状态，官鬼看病气压力，子孙看治疗与缓解；不能用来诊断或预测医学结果。',
    axes: [
      { key: 'body', label: '身体承受状态', role: 'shi', purpose: '当前是否有足够恢复与承受能力' },
      { key: 'illness', label: '病气与压力', role: 'liuqin:官鬼', polarity: 'risk', purpose: '症状或风险压力是否明显' },
      { key: 'care', label: '治疗与缓解条件', role: 'liuqin:子孙', purpose: '就医、治疗和照护是否有承接' }
    ],
    action: '记录症状、持续时间、用药和检查结果，按医生建议复诊；出现加重或警示症状立即就医，不等待卦象应期。'
  }
  if (/^tr-/.test(id) || domain === 'travel' || domain === 'arrival') return {
    kind: 'travel', result: parsed.focus || '出行',
    premise: '出行题要分开看人是否能动、路线与交通是否可靠、目的地是否承接，以及途中风险是否发动。',
    axes: [
      { key: 'traveler', label: '行人状态', role: 'shi', purpose: '人是否有力按计划行动' },
      { key: 'route', label: '路线与交通', role: 'liuqin:父母', purpose: '道路、票务和行程信息是否可靠' },
      { key: 'destination', label: '目的地承接', role: 'ying', purpose: '目的地或接应方是否顺畅' },
      { key: 'hazard', label: '途中风险', role: 'liuqin:官鬼', polarity: 'risk', purpose: '延误、阻碍或安全压力是否明显' }
    ],
    action: '先核实票务、天气、道路和接应信息，并准备可替代路线；实际交通信息与安全预警优先于卦象。'
  }
  if (/^so-/.test(id) || ['visit', 'seek', 'message', 'meeting', 'social'].includes(domain)) return {
    kind: 'social', result: parsed.focus || '往来事项',
    premise: '人际往来题要分清对方有没有行动、联系路径是否畅通、双方是否相向，以及约定是否会被临时因素打断。',
    axes: [
      { key: 'other', label: '来人或对方动作', role: 'ying', purpose: '对方是否真正准备行动' },
      { key: 'contact', label: '联系与行程信息', role: 'liuqin:父母', purpose: '消息、约定和路线是否清楚' },
      { key: 'mutual', label: '双方承接', role: 'shi-ying', purpose: '双方是否能顺利对接' },
      { key: 'trigger', label: '实际触发', role: 'moving', purpose: '事情是否已进入行动阶段' }
    ],
    action: '不要空等。主动确认对方是否出发、何时到达、在哪里见面；若没有明确回复和行程信息，就按尚未落实准备。'
  }
  if (/^dl-/.test(id) || domain === 'delivery') return {
    kind: 'delivery', result: parsed.focus || '送达',
    premise: '送达题要看物流路径、承运方动作、收件端是否能接，以及中途是否出现滞留或遗失信号。',
    axes: [
      { key: 'route', label: '物流路径', role: 'liuqin:父母', purpose: '运单、路线和运输状态是否正常' },
      { key: 'carrier', label: '承运方动作', role: 'ying', purpose: '配送方是否真正推进' },
      { key: 'delay', label: '滞留与遗失风险', role: 'liuqin:兄弟', polarity: 'risk', purpose: '分流、错投或延误是否增强' }
    ],
    action: '先查最新扫描节点并直接联系承运方；若超过承诺时限，立即留存运单与沟通记录并发起查询或理赔。'
  }
  if (/^lo-/.test(id) || domain === 'lost') return {
    kind: 'lost', result: parsed.focus || '失物寻人', guarded: /寻人|人/.test(parsed.focus || ''),
    premise: '失物题要看物是否仍有气、是否被人或环境遮蔽，以及搜索行动能否触及正确线索；方位只能辅助，不能替代回溯。',
    axes: [
      { key: 'object', label: '失物或目标状态', role: 'yong', purpose: '所寻对象是否仍可接触' },
      { key: 'search', label: '搜索行动', role: 'shi', purpose: '当前查找方式是否有效' },
      { key: 'hidden', label: '遮蔽与隐匿', role: 'liushen:玄武', polarity: 'risk', purpose: '是否存在被遮挡、遗忘或信息不透明' },
      { key: 'outside', label: '外部线索', role: 'ying', purpose: '场所、他人或监控是否能提供线索' }
    ],
    action: '按最后出现时间、行动路线、接触人员和监控记录倒序排查；人员失联或存在危险时立即报警，不等待卦象应期。'
  }
  if (/^ho-/.test(id) || domain === 'home') return {
    kind: 'home', result: parsed.focus || '家宅事项',
    premise: '家宅题不只看居住吉凶，还要看房屋与合同、居住者承受、外部环境，以及维修或债务风险。',
    axes: [
      { key: 'house', label: '房屋与合同', role: 'liuqin:父母', purpose: '房屋本体、产权或租约是否可靠' },
      { key: 'resident', label: '居住者状态', role: 'shi', purpose: '你是否真正适应并能承担' },
      { key: 'environment', label: '环境与邻里', role: 'ying', purpose: '外部环境是否配合' },
      { key: 'risk', label: '维修与隐患', role: 'liuqin:官鬼', polarity: 'risk', purpose: '结构、费用或纠纷风险是否显现' }
    ],
    action: '实地核查采光、噪声、结构、费用和合同退出条款；搬迁或签约前，把最难逆转的一项风险先查清。'
  }
  if (domain === 'weather') return {
    kind: 'weather', result: parsed.focus || '天气变化',
    premise: '天气占只能作传统象意：父母多取云雨，子孙多取晴霁，再看发动与时辰；实际安排必须服从官方预报和预警。',
    axes: [
      { key: 'rain', label: '云雨信号', role: 'liuqin:父母', purpose: '雨雪云气是否增强' },
      { key: 'clear', label: '晴霁信号', role: 'liuqin:子孙', polarity: /停|晴/.test(parsed.focus || '') ? 'support' : 'risk', purpose: '天气是否转晴或削弱雨势' },
      { key: 'time', label: '触发时段', role: 'moving', purpose: '天气变化何时容易被触发' }
    ],
    action: '把卦象时段只当作观察窗口，并立即对照雷达、短临预报和预警；涉及出行与安全时以官方信息为准。'
  }
  if (parsed.mode === 'choice') return {
    kind: 'choice', result: parsed.focus || '当前抉择',
    premise: '二选一不能靠选项顺序硬判。此卦先判断你是否适合变动、外部是否承接和变化成本；若要严格比较两个具体方案，仍应给两项同一评价标准。',
    axes: [
      { key: 'self', label: '你的准备程度', role: 'shi', purpose: '你是否已经具备作出改变的条件' },
      { key: 'outside', label: '外部承接', role: 'ying', purpose: '新选择或外部环境是否真正接得住' },
      { key: 'change', label: '变化动能', role: 'moving', purpose: '局面是否已经进入必须改变的阶段' },
      { key: 'cost', label: '选择代价', role: 'liuqin:兄弟', polarity: 'risk', purpose: '机会成本、竞争或损失是否过大' }
    ],
    action: '用同一张表比较两项的收益、代价、可逆性和最坏结果；先做低成本、可回退的验证，不要用一次占问替代必要的信息核对。'
  }
  return base
}

function linePower(y) {
  if (!y) return -2
  let score = ({ 旺: 2, 相: 1, 休: 0, 囚: -1, 死: -2 })[y.wangshuai] || 0
  if (y.kong) score -= y.changing ? 1 : 2
  if (y.dayMonth) {
    if (y.dayMonth.tags && (y.dayMonth.tags.includes('临日') || y.dayMonth.tags.includes('临月'))) score += 1
    if (y.dayMonth.chongYue && !(y.dayMonth.tags || []).includes('临日')) score -= 2
    if (y.dayMonth.heRi) score -= 1
    if (y.dayMonth.chongRi) score += y.changing ? 1 : 0
  }
  if (y.changeTo && y.changeTo.analysis) {
    const a = y.changeTo.analysis
    if (a.huiTou && a.huiTou.type === '回头生') score += 2
    if (a.huiTou && a.huiTou.type === '回头克') score -= 2
    if (a.jinTui && a.jinTui.type === '化进神') score += 1
    if (a.jinTui && a.jinTui.type === '化退神') score -= 1
  }
  return Math.max(-3, Math.min(3, score))
}

function pickProfileLine(ctx, axis) {
  const role = axis.role || ''
  if (role === 'shi') return ctx.shi || null
  if (role === 'ying') return ctx.ying || null
  if (role === 'yong') return ctx.primaryYong || (ctx.yongList && ctx.yongList[0]) || null
  if (role === 'moving') {
    return (ctx.ben.yaos || []).filter((y) => y.changing).sort((a, b) => Math.abs(linePower(b)) - Math.abs(linePower(a)))[0] || null
  }
  if (role.indexOf('liuqin:') === 0) {
    const name = role.slice(7)
    return (ctx.ben.yaos || []).filter((y) => y.liuqin === name).sort((a, b) => {
      const activeA = a.changing ? 1 : 0
      const activeB = b.changing ? 1 : 0
      return (linePower(b) + activeB) - (linePower(a) + activeA)
    })[0] || null
  }
  if (role.indexOf('liushen:') === 0) {
    const name = role.slice(8)
    return (ctx.ben.yaos || []).filter((y) => y.liushen === name).sort((a, b) => (b.changing ? 2 : 0) + linePower(b) - (a.changing ? 2 : 0) - linePower(a))[0] || null
  }
  return null
}

function powerPhrase(y) {
  if (!y) return '卦中未见明确落点'
  const parts = []
  if (y.wangshuai) parts.push(y.wangshuai)
  if (y.kong) parts.push('空亡')
  if (y.changing) parts.push('发动')
  if (y.dayMonth && y.dayMonth.chongYue) parts.push('月破')
  if (y.dayMonth && y.dayMonth.heRi) parts.push('被日合住')
  if (y.dayMonth && y.dayMonth.chongRi) parts.push('受日冲触发')
  if (y.changeTo && y.changeTo.analysis && y.changeTo.analysis.huiTou) parts.push(y.changeTo.analysis.huiTou.type)
  if (y.changeTo && y.changeTo.analysis && y.changeTo.analysis.jinTui) parts.push(y.changeTo.analysis.jinTui.type)
  return parts.length ? parts.join('、') : '力量平常'
}

function deepYaoName(y) {
  if (!y) return '—'
  const num = ['初', '二', '三', '四', '五', '上'][y.index] || ''
  const yinYang = y.yinYang ? '九' : '六'
  const label = y.index === 0 ? `${num}${yinYang}` : y.index === 5 ? `${num}${yinYang}` : `${yinYang}${num}`
  return `${label}·${y.liuqin}（${y.ganZhi}${y.wuxing}）`
}

function shiYingReading(ctx) {
  if (!ctx.shi || !ctx.ying) return { value: 0, text: '世应有一方未明，双方是否相向暂难坐实' }
  const rel = relationWuxing(ctx.shi.wuxing, ctx.ying.wuxing)
  const map = {
    被生: { value: 2, text: '应爻生世，对方或环境有向你回流、扶助之意' },
    生: { value: 0, text: '世爻生应，主要是你在向对方投入，关系能否成立仍要看对方回应' },
    被克: { value: -2, text: '应爻克世，对方或环境掌握更多主动权，你方承压' },
    克: { value: 0, text: '世爻克应，你能推动局面，但过度用力也容易让对方退避' },
    比和: { value: 1, text: '世应比和，双方处在相近位置，有协商与并行空间' }
  }
  const base = map[rel] || { value: 0, text: '世应生克不显，双方关系需看实际互动' }
  if (ctx.shi.kong || ctx.ying.kong) return { value: Math.min(0, base.value - 1), text: `${base.text}；但${ctx.shi.kong ? '世' : '应'}爻空亡，承诺尚未落实` }
  return base
}

function analyzeProfileAxis(ctx, axis) {
  if (axis.role === 'shi-ying') {
    const r = shiYingReading(ctx)
    return Object.assign({}, axis, { value: r.value, line: null, text: `${axis.label}：${r.text}；就本题而言，要看${axis.purpose}。` })
  }
  const line = pickProfileLine(ctx, axis)
  let raw = linePower(line)
  const risk = axis.polarity === 'risk'
  if (!line) raw = risk ? -1 : -2
  let value = risk ? -raw : raw
  value = Math.max(-2, Math.min(2, value))
  let effect = ''
  if (risk) {
    if (!line) effect = `${axis.purpose}的信号不强`
    else if (raw >= 1) effect = `${axis.purpose}，已经构成实际阻力`
    else if (raw <= -1) effect = `${axis.purpose}，虽有其象但目前力量有限`
    else effect = `${axis.purpose}，仍需核实，不能夸大`
  } else if (!line) {
    effect = `${axis.purpose}尚未在卦中形成清楚承接`
  } else if (raw >= 1) {
    effect = `${axis.purpose}，卦上已有承接`
  } else if (raw <= -1) {
    effect = `${axis.purpose}，目前偏弱，尚难落实`
  } else {
    effect = `${axis.purpose}，已有基础但还不稳定`
  }
  let relation = ''
  if (line && ctx.shi && line.index !== ctx.shi.index && (axis.role === 'ying' || axis.role === 'yong')) {
    const rel = relationWuxing(ctx.shi.wuxing, line.wuxing)
    if (rel === '被生') relation = '；该爻生世，力量能回到你方'
    else if (rel === '生') relation = '；世去生它，当前更多靠你投入'
    else if (rel === '被克') relation = '；该爻克世，你方受其约束'
    else if (rel === '克') relation = '；世能克它，你方可推动但不宜过刚'
    else if (rel === '比和') relation = '；与世比和，双方较易并行'
  }
  const where = line ? `${deepYaoName(line)}（${powerPhrase(line)}）` : '未见明确对应爻'
  return Object.assign({}, axis, { value, line, text: `${axis.label}：${where}${relation}；就本题而言，${effect}。` })
}

function deepSummary(profile, judgment, total) {
  const parsed = judgment.parsed || {}
  if (profile.safe || profile.guarded) return judgment.level
  if (parsed.mode === 'when' || parsed.mode === 'where' || parsed.mode === 'who' || parsed.mode === 'choice') return judgment.level
  if (profile.negativeOutcome) {
    if (total >= 2) return '暂未见强迹象'
    if (total <= -2) return '风险信号偏强'
    return '有疑点但不能坐实'
  }
  if (parsed.mode === 'how') return total >= 2 ? '可主动推进' : total <= -2 ? '先止损补条件' : '先验证再行动'
  if (parsed.mode === 'jixiong') return total >= 2 ? '偏吉但有条件' : total <= -2 ? '偏凶宜收缩' : '吉凶取决于关键条件'
  if (total >= 3) return '偏能成'
  if (total >= 1) return '有机会，但须补一环'
  if (total <= -3) return '当前难成'
  if (total <= -1) return '把握偏小'
  return '尚未定局'
}

function toneFromDeepTotal(total) {
  if (total >= 2) return 'good'
  if (total <= -2) return 'bad'
  return 'mid'
}

function axisEvidence(axis) {
  if (!axis) return ''
  if (axis.role === 'shi-ying') {
    const fact = String(axis.text || '')
      .replace(new RegExp(`^${axis.label}：`), '')
      .replace(/；就本题而言.*$/, '')
      .replace(/。$/, '')
    return `「${axis.label}」所见：${fact}`
  }
  if (!axis.line) return `「${axis.label}」在卦中未见明确承接`
  return `「${axis.label}」落${deepYaoName(axis.line)}，呈${powerPhrase(axis.line)}之势`
}

function classicalProfileCounsel(kind) {
  const counsel = {
    general: '凡事都有时机与位置。条件未成时宜守，条件成熟时再进。',
    'emotion-feeling': '感情贵在真诚，也贵在持续行动；应观察对方是否长期回应，不要因一句话便下结论。',
    'emotion-union': '两人相合，重在同心。旧有矛盾若不化解，即使复合也容易再散；应先解旧结，再谈重新开始。',
    'emotion-marriage': '婚姻贵在有始有终。感情、家庭、礼节与现实安排都能安顿，关系才容易真正落定。',
    'emotion-third': '心中有疑，最易伤情。应先查明事实、守住边界，不可仅凭卦象便指认他人。',
    emotion: '感情重在彼此回应；若只有一方不断用力，关系便难以长久。',
    'research-paper': '文章贵在论证端正、证据扎实；与其处处润色，不如先补最关键的一处薄弱。',
    exam: '学业贵在日积月累，临事则要专一守正；补足短板、谨守规则，所下的功夫才不会落空。',
    'research-project': '谋事要先验证根本条件，知道边界之后才能定下方向；关键假设尚未查明，不宜全面铺开。',
    career: '事业进退，贵在名实相符。官鬼有力，多见职位或责任可承接；若应爻迟滞，则机会虽在，决定仍会延后。',
    receivable: '回款先看财爻是否有气，再看付款方是否发动。财有气而应爻迟，多是款在而迟；财弱受制，则要防周期拉长或金额折减。',
    wealth: '求财不只看有没有机会，还要看财能否聚、兄弟爻是否分耗。财旺可进，分耗重则宜收；重点在财势能否聚，不在表面上的热闹。',
    investment: '见到收益时，也要想到潜在风险；先算清最坏损失与退出办法，再考虑可能所得。',
    document: '文书审批看父母爻与官鬼爻能否相承。父母旺，多见材料可用；官鬼发动，则常是审核、规则或决定节点正在起作用。',
    lawsuit: '争讼不宜久拖，重点在证据清楚、时限不误、程序合规；声势不能代替事实，有理也要有据。',
    family: '家人相处，贵在各安其位、彼此体谅；应先处理最关键的一件事，避免小矛盾累积成大争执。',
    health: '《易》重在防患于未然；身体有不适应及时就医、谨慎调养，不可用卦象代替检查与诊断。',
    travel: '行动与停留各有时机。动爻有力多主行程将启，静而受合则多见等待；内外卦的变化还可判断是近行还是远行。',
    social: '人与人相应，贵在信息真实、约定明确；没有具体时间和行动，往来便仍未落实。',
    delivery: '物品流转自有次序，也会留下路径；应先查明停留节点，再判断何时送达。',
    lost: '失物必有其迹。应从最后出现的时间与路线向前回溯，不要只执着于一个方位。',
    home: '安宅先要审察根基，慎重开始，才能减少后忧；越是难以改变的条件，越应优先核实。',
    weather: '天时不可强求，应观察变化并提前防备；卦象只作参考，仍以正式预报为依据。',
    choice: '《易》讲“见几而作”，但行动也要留有余地；先选择可验证、可回退的路径，进退才有依据。'
  }
  return counsel[kind] || counsel.general
}

function classicalTurnFromCast(ctx, driver, blocker, profile) {
  const benCi = guaCiOf(ctx.ben)
  const bianCi = guaCiOf(ctx.bian)
  const moving = (ctx.ben && ctx.ben.yaos ? ctx.ben.yaos : []).filter((y) => y.changing)
  const relatedIndexes = [blocker, driver]
    .filter((axis) => axis && axis.line)
    .map((axis) => axis.line.index)
  const keyMoving = moving.find((y) => relatedIndexes.includes(y.index)) || moving[0]
  const lineText = keyMoving && benCi && benCi.yaoci ? benCi.yaoci[keyMoving.index] : ''
  const text = [lineText, benCi && benCi.guaci, bianCi && bianCi.guaci].filter(Boolean).join('；')
  if (/利见大人/.test(text) && /朋来|得朋/.test(text)) return '本卦有“利见大人”“朋来”之意：遇到阻力时不宜独自硬闯，找到能作主、能相助的人，并守正行事，事情才有转机。'
  if (/利见大人/.test(text)) return '本卦取“利见大人”之意：事情有困难时，宜求助于有经验、有决定权的人，不宜独断。'
  if (/朋来|得朋/.test(text)) return '本卦取“朋来”之意：困局的化解在于得到同道相助，不在独自强撑。'
  if (/有孚/.test(text)) {
    if (profile && profile.kind === 'lost') return '本卦重“有孚”：线索须前后相应。方位、最后动线与现场物象若能相合，查找范围便可进一步收窄。'
    if (profile && profile.kind === 'lawsuit') return '本卦重“有孚”：判断应以证据、书面记录与程序事实为凭，不能只听口头说法。'
    if (profile && ['wealth', 'receivable'].includes(profile.kind)) return '本卦重“有孚”：财来要有真实承接。若财爻得力，多为迟而可见；若受克受空，则表面有意，实际仍虚。'
    if (profile && profile.kind === 'investment') return '本卦重“有孚”：所见收益要能前后相应。卦象可看进退之势，但不替代对风险与退出条件的判断。'
    if (profile && /^emotion/.test(profile.kind)) return '本卦重“有孚”：真心要由持续行动来证明，不能只听一时表态。'
    return '本卦重“有孚”：前后能够相应、所言能够见于行动，事情才容易由虚转实。'
  }
  if (/勿用|不利|征凶|凶|厉|灾|眚/.test(text)) return '本卦有戒进之意：时机未到，不宜硬推；先把位置站稳，等待条件变化再行动。'
  if (/利涉大川|利有攸往/.test(text)) return '本卦有利往之意：先把路径与准备做实，再采取行动，才能较稳地渡过风险。'
  if (/贞吉|利贞|安贞|无咎/.test(text)) return '本卦以守正为吉：守规则、守次序、守信用，进退才不容易失当。'
  if (/悔|吝/.test(text)) return '本卦提醒知错能改：及时反省并纠正偏差，仍可减少后悔。'
  if (/亨|吉|元亨/.test(text)) return '本卦已有亨通之机，但吉意仍要靠行动落实，不能只看一个“吉”字。'
  return '《易》重视时机与位置；应先审势、守正、知变，再决定进退。'
}

function trendRangeItems(ctx, judgment, deep) {
  const parsed = judgment.parsed || {}
  const y = ctx.primaryYong || (ctx.yongList && ctx.yongList[0]) || (deep.driver && deep.driver.line) || ctx.ying || ctx.shi
  const moving = (ctx.ben && ctx.ben.yaos ? ctx.ben.yaos : []).filter((item) => item.changing)
  const items = []
  const reasons = []
  let trend = deep.total >= 2 ? '后势偏向推进' : deep.total <= -2 ? '短期仍以迟滞、收缩为主' : '先有反复，随后才会逐渐明朗'

  if (y && y.changeTo && y.changeTo.analysis) {
    const analysis = y.changeTo.analysis
    if (analysis.jinTui && analysis.jinTui.type === '化进神') {
      reasons.push(`${deepYaoName(y)}化进神`)
      trend = '后势比当前更有推进力，往往先小后大、由近及远'
    } else if (analysis.jinTui && analysis.jinTui.type === '化退神') {
      reasons.push(`${deepYaoName(y)}化退神`)
      trend = '后势有回缩或降温之象，宜防先有消息、随后放缓'
    }
    if (analysis.huiTou && analysis.huiTou.type === '回头生') {
      reasons.push('动而回头生')
      trend = '变化之后反得助力，转机多出现在行动以后'
    } else if (analysis.huiTou && analysis.huiTou.type === '回头克') {
      reasons.push('动而回头克')
      trend = '越往后阻力越明显，宜防事情启动后再生掣肘'
    }
  }
  if (y && y.kong) reasons.push(`${deepYaoName(y)}逢空，眼下有象未实`)
  if (ctx.yinPattern && ctx.yinPattern.fanYin) {
    reasons.push('卦见反吟')
    trend = '过程容易往返反复，不宜把一次进展当作最终结果'
  } else if (ctx.yinPattern && ctx.yinPattern.fuYin) {
    reasons.push('卦见伏吟')
    trend = '局面暂时停滞，变化多在原处酝酿，不会一下跨得很远'
  } else if (!moving.length) {
    reasons.push('六爻俱静')
    trend = deep.total >= 2 ? '有利条件能够维持，但进展偏慢' : deep.total <= -2 ? '阻力短期延续，局面不易骤变' : '原有状态仍将延续，变化幅度不会太大'
  } else if (moving.length === 1 && !reasons.length) {
    reasons.push(`仅${deepYaoName(moving[0])}发动`)
    trend = '变化集中在一个环节，先看这一点发生转折，再看全局'
  }
  items.push(`趋势：${reasons.length ? reasons.join('；') + '，所以' : '综合用神旺衰与动变，'}${trend}。`)

  if (y) {
    const position = y.index <= 1
      ? '爻位属初、二层，取近、取内、取事情初段'
      : y.index <= 3
        ? '爻位属三、四层，正处内外交接和事情中段'
        : '爻位属五、上层，取远、取外、取事情后段'
    const breadth = moving.length >= 3
      ? '多爻发动，牵涉面较宽，结果不宜锁在单一节点'
      : moving.length === 2
        ? '两爻发动，多见前后两步或两个环节相继变化'
        : moving.length === 1
          ? '一爻独发，变化范围相对集中'
          : '静卦主守成，可能范围以原有人事和环境为主'
    items.push(`可能范围：${deepYaoName(y)}${position}；${breadth}。`)
  }

  const dir = y && y.zhi && ZHI_DIR[y.zhi]
  const trigram = y && ctx.ben ? (y.index <= 2 ? ctx.ben.lower : ctx.ben.upper) : null
  const guaName = trigram && trigram.name
  const guaDir = guaName && GUA_DIR[guaName]
  const physical = ['lost', 'travel', 'delivery', 'home'].includes(deep.profile.kind) || parsed.mode === 'where'
  if (dir || guaDir) {
    const mainDir = dir || guaDir
    const supportDir = dir && guaDir && dir !== guaDir ? guaDir : ''
    let direction = `方位取象：${y && y.zhi ? `${deepYaoName(y)}临「${y.zhi}」，地支取${dir}` : `${guaName}卦后天位取${guaDir}`}`
    if (supportDir) direction += `；其所在${guaName}卦又取${supportDir}作第二层参考。两象不一时，以${mainDir}为主并连同相邻方位观察，不把两个方向硬拼成一条直线`
    else if (dir && guaDir === dir) direction += `，又与${guaName}卦的${guaDir}相合，此方向信号较集中`
    else direction += '，宜连同相邻方位一起观察'
    if (physical && guaName && GUA_SCENE[guaName]) direction += `；${guaName}象还可参${GUA_SCENE[guaName]}`
    else direction += '；若所问并非地点，此方位只作人物来源、机会来向或行动方向的辅助象'
    items.push(`${direction}。`)
  }
  return uniqueText(items).slice(0, 3)
}

function tailoredAction(ctx, profile, driver, blocker) {
  let first = '宜先小范围尝试，观察反馈后再决定是否推进。'
  if (blocker && blocker.value < 0 && driver && driver.value > 0 && blocker.key !== driver.key) {
    first = blocker.polarity === 'risk'
      ? `应先降低「${blocker.label}」带来的风险，再借「${driver.label}」之力推进。`
      : `应先补足「${blocker.label}」，再借「${driver.label}」之力推进。`
  } else if (blocker && blocker.value < 0) {
    first = blocker.polarity === 'risk'
      ? `应先控制「${blocker.label}」这一风险，不宜强行推进。`
      : `应先化解「${blocker.label}」这一阻碍，不宜强行推进。`
  } else if (driver && driver.value > 0) {
    first = `应守住「${driver.label}」这一有利条件，顺势推进。`
  }
  return `${first}${classicalProfileCounsel(profile.kind)}${classicalTurnFromCast(ctx, driver, blocker, profile)}`
}

function pointerFromDeep(ctx, deep) {
  const benCi = guaCiOf(ctx.ben)
  const bianCi = guaCiOf(ctx.bian)
  const moving = (ctx.ben && ctx.ben.yaos ? ctx.ben.yaos : []).filter((y) => y.changing)
  const keyMoving = moving.slice().sort((a, b) => {
    const hit = (y) => (deep.axes.some((axis) => axis.line && axis.line.index === y.index) ? 10 : 0)
      + (ctx.primaryYong && ctx.primaryYong.index === y.index ? 6 : 0)
    return hit(b) - hit(a)
  })[0]
  const lineText = keyMoving && benCi && benCi.yaoci ? benCi.yaoci[keyMoving.index] : ''
  const classicText = [lineText, bianCi && bianCi.guaci, benCi && benCi.guaci].filter(Boolean).join('；')
  let classicTurn = '先把现实条件做实，再谈成败'
  if (/利见大人/.test(classicText)) classicTurn = '门在能作主、能担责的人'
  else if (/朋来|得朋/.test(classicText)) classicTurn = '转机在可信助力，不在独力硬撑'
  else if (/有孚/.test(classicText)) classicTurn = '关键在前后相应、言行相符'
  else if (/勿用|不利|征凶|凶|厉|灾|眚/.test(classicText)) classicTurn = '风险未除，不可硬推'
  else if (/贞吉|利贞|安贞|无咎/.test(classicText)) classicTurn = '守正守序，吉意才有落处'
  else if (/亨|吉|元亨/.test(classicText)) classicTurn = '有路可走，但须用行动落实'

  const driver = deep.driver && deep.driver.value > 0 ? deep.driver : null
  const blocker = deep.blocker && deep.blocker.value < 0 ? deep.blocker : null
  if (deep.profile.kind === 'health') return '卦可提醒轻重缓急，不可替代检查与诊断；身体有警讯，先就医。'
  if (deep.profile.kind === 'lawsuit') return '先固定证据、守住时限，再谈胜负；卦象不能替代法律判断。'
  if (deep.profile.kind === 'investment') return '先算最坏损失与退出路径，再谈收益；卦顺也不可替代尽调。'
  if (deep.profile.kind === 'lost') return '先回溯最后出现的时间与动线，逐处核实；方位只作辅助。'
  if (deep.profile.kind === 'emotion-third') return '卦只提示疑点，不替你指认任何人；先看事实，再定关系边界。'
  if (driver && blocker && driver.key !== blocker.key) {
    return `先解「${blocker.label}」，再借「${driver.label}」；${classicTurn}。`
  }
  if (blocker) return `先解「${blocker.label}」；${classicTurn}。`
  if (driver) return `守住「${driver.label}」这一支点；${classicTurn}。`
  return `${classicTurn}。`
}

function buildDeepReading(ctx, judgment) {
  const profile = questionProfile(ctx, judgment)
  const axes = profile.axes.map((axis) => analyzeProfileAxis(ctx, axis))
  const baseTone = judgment.parsed && judgment.parsed.mode === 'yesno' ? judgment.answerTone : judgment.tone
  let total = axes.reduce((sum, axis) => sum + axis.value, 0)
  total += baseTone === 'good' ? 1 : baseTone === 'bad' ? -1 : 0
  const driverPool = axes.filter((axis) => axis.polarity !== 'risk')
  const driver = (driverPool.length ? driverPool : axes).slice().sort((a, b) => b.value - a.value)[0]
  const blocker = axes.slice().sort((a, b) => a.value - b.value)[0]
  const summary = deepSummary(profile, judgment, total)
  let thesis = ''
  if (profile.safe) {
    thesis = `卦上只可把${axisEvidence(blocker || driver)}看作风险提醒，不能据此诊断、承诺疗效或预测医学结果；真正的判断必须回到症状、检查与医生意见。`
  } else if (profile.guarded) {
    thesis = `卦上，${axisEvidence(driver)}；同时${axisEvidence(blocker)}。这些只能用来整理风险和核查重点，不能替代现实证据、专业评估或必要处置。`
  } else if (profile.negativeOutcome) {
    thesis = total <= -2
      ? `卦上，${axisEvidence(blocker)}，所以疑点偏强；但这仍只是风险信号，不足以据此认定${profile.result}已经发生。`
      : `卦上未见足以坐实${profile.result}的完整证据链。即使${axisEvidence(blocker)}，也只能说明关系中有卡点，不能把疑点直接当事实。`
  } else if (driver && driver.value > 0 && blocker && blocker.value < 0) {
    thesis = `卦上，${axisEvidence(driver)}，这是可用的支点；但${axisEvidence(blocker)}，这是当前卡点。${profile.result}并非全无机会，成败取决于能否先解后者。`
  } else if (blocker && blocker.value < 0) {
    thesis = `当前主要矛盾是${axisEvidence(blocker)}。若这一点不改变，其他吉象也难把${profile.result}落到实处。`
  } else if (driver && driver.value > 0) {
    thesis = `${axisEvidence(driver)}，这是${profile.result}最有力的支点。卦上已有承接，但仍须以现实行动确认，不能把有利之象当成既成结果。`
  } else {
    thesis = `${profile.result}目前没有出现一锤定音的力量，关键条件彼此牵制。此时最重要的不是继续问吉凶，而是找出哪一项现实条件先发生变化。`
  }
  const mode = judgment.parsed && judgment.parsed.mode
  const deepTone = toneFromDeepTotal(total)
  const replyTone = profile.negativeOutcome ? invertTone(deepTone) : deepTone
  const keepGuardedReply = profile.safe || profile.guarded || ['when', 'where', 'who', 'choice'].includes(mode)
  const answer = keepGuardedReply
    ? judgment.reply
    : directReply(judgment.parsed, replyTone, Math.abs(total) < 3 ? `偏·${summary}` : summary, {
      place: judgment.place,
      whenHint: judgment.whenHint,
      clockHint: judgment.clockHint,
      whoHint: judgment.whoHint,
      choicePick: judgment.choicePick,
      outcomeTone: deepTone
    })
  const action = tailoredAction(ctx, profile, driver, blocker)
  return { profile, axes, total, tone: deepTone, summary, thesis, answer, driver, blocker, action }
}

function classicLanding(text, deep, axis) {
  const raw = String(text || '')
  const anchor = axis ? axis.label : ((deep.blocker && deep.blocker.value < 0) ? deep.blocker.label : (deep.driver && deep.driver.label))
  const target = anchor ? `“${anchor}”` : `“${deep.profile.result}”`
  if (/利见大人/.test(raw)) return `据此辞看${target}：关键要通过有决定权的人、正式制度或专业帮助来解决。`
  if (/朋来|得朋/.test(raw)) return `据此辞看${target}：困局的转机来自可信同伴或内部助力，不宜独力硬撑。`
  if (/有孚/.test(raw)) {
    if (deep.profile.kind === 'lost') return `据此辞看${target}：方位、最后动线与现场物象能够前后相应时，查找范围才可由宽转窄。`
    if (deep.profile.kind === 'lawsuit') return `据此辞看${target}：以证据、书面记录和程序事实为凭，不能只凭口头说法。`
    if (deep.profile.kind === 'wealth' || deep.profile.kind === 'receivable') return `据此辞看${target}：先看财爻能否由虚转实，再看对方是否真正发动；不能只凭一句承诺判断财会到手。`
    if (deep.profile.kind === 'investment') return `据此辞看${target}：收益之象须前后相应，卦可提示进退，但不能替代风险与退出判断。`
    if (/^emotion/.test(deep.profile.kind)) return `据此辞看${target}：真心要由持续行动兑现，不能只听一时表态。`
    return `据此辞看${target}：关键在言行相符、前后相应，事情才会由虚转实。`
  }
  if (/勿用|不利|征凶|凶|厉|灾|眚/.test(raw)) return `据此辞看${target}：条件未稳时不可硬推，先除去已经显出的风险。`
  if (/利涉大川|利有攸往/.test(raw)) return `据此辞看${target}：可以行动，但要有明确路径、准备和承担，不宜盲动。`
  if (/贞吉|利贞|安贞|无咎/.test(raw)) return `据此辞看${target}：守规则、守承诺并按次序推进，吉意才有落处。`
  if (/悔|吝/.test(raw)) return `据此辞看${target}：已有偏差仍可修正，但拖延或固执会把小问题累积成后悔。`
  if (/亨|吉|元亨/.test(raw)) return `据此辞看${target}：通达条件已经出现，但必须化为具体行动，不能只取“吉”字。`
  return `此辞重在辨明${target}所处阶段，再定进退。`
}

function classicMeaning(text, judgment) {
  const parsed = judgment.parsed || {}
  const focus = parsed.focus || '所问之事'
  const raw = String(text || '')
  let principle = ''
  if (/勿用|不利|征凶|凶|厉|灾|眚/.test(raw)) {
    principle = '经文主戒进与防失，眼下不宜凭一时冲动强求。'
  } else if (/利见大人|利有攸往|利涉大川/.test(raw)) {
    principle = '经文提示可借助可信之人、制度或成熟路径推动，不宜独断。'
  } else if (/贞吉|利贞|安贞|无咎/.test(raw)) {
    principle = '经文所许不在侥幸，而在守正、守约、按次序行事。'
  } else if (/悔|吝/.test(raw)) {
    principle = '经文提示已有偏差，但及时收敛、纠正，仍可减少后悔。'
  } else if (/亨|吉|元亨/.test(raw)) {
    principle = '经文显示有通达条件，可以推进，但吉意须靠行动落实。'
  } else {
    principle = '经文重在审时度势：看清所处阶段，再决定进退。'
  }

  let landing = ''
  if (parsed.domain === 'emotion') landing = `落到「${focus}」，应看对方是否持续回应，而不是只听一时表态。`
  else if (['wealth', 'invest', 'property'].includes(parsed.domain)) landing = `落到「${focus}」，先核现金、合同、成本与退出条件，再谈得失。`
  else if (['career', 'exam'].includes(parsed.domain)) landing = `落到「${focus}」，关键在资格、文书、节点和能真正作主的人。`
  else if (parsed.domain === 'lawsuit') landing = `落到「${focus}」，证据、程序和时限比口头胜负更要紧。`
  else if (parsed.domain === 'health' || parsed.domain === 'pregnancy') landing = `落到「${focus}」，宜把提醒转为检查、复诊和照护，不以吉凶替代医学判断。`
  else if (parsed.domain === 'lost') landing = `落到「${focus}」，应按动线、时间点和可核实线索立即排查。`
  else if (parsed.domain === 'travel' || parsed.domain === 'weather') landing = `落到「${focus}」，以行程、天气和现场信息校正卦上提示。`
  else landing = `落到「${focus}」，先处理最关键且可控的一步，再观察局势是否应卦。`
  return principle + landing
}

function classicItems(ctx, judgment, deep) {
  const { ben, bian, primaryYong } = ctx
  const benCi = guaCiOf(ben)
  const bianCi = guaCiOf(bian)
  const moving = (ben && ben.yaos ? ben.yaos : []).filter((y) => y.changing)
  const picked = moving.slice().sort((a, b) => {
    const score = (y) => (deep && deep.axes.some((axis) => axis.line && axis.line.index === y.index) ? 10 : 0)
      + (primaryYong && y.index === primaryYong.index ? 6 : 0)
      + (y.role === '世' || y.role === '应' ? 3 : 0)
      + (y.wangshuai === '旺' || y.wangshuai === '相' ? 1 : 0)
    return score(b) - score(a)
  }).slice(0, 1)
  const items = []
  if (benCi && benCi.guaci) {
    items.push(`本卦《${ben.alias || ben.name}》：“${benCi.guaci}”`)
    items.push(classicLanding(benCi.guaci, deep, null))
  }
  picked.forEach((y) => {
    const line = benCi && benCi.yaoci ? benCi.yaoci[y.index] : ''
    if (line) {
      const axis = deep && deep.axes.find((item) => item.line && item.line.index === y.index)
      items.push(`关键动爻${axis ? `（${axis.label}）` : ''}：${line}`)
      items.push(classicLanding(line, deep, axis || null))
    }
  })
  if (bian && bianCi && bianCi.guaci) {
    items.push(`变卦《${bian.alias || bian.name}》：“${bianCi.guaci}”`)
    const landingAxis = (deep.blocker && deep.blocker.value < 0) ? deep.blocker : deep.driver
    const image = bianCi.nameWhy ? `${bianCi.nameWhy}` : ''
    items.push(`后势取象：${image}${classicLanding(bianCi.guaci, deep, landingAxis)}`)
  }
  return uniqueText(items).slice(0, 6)
}

function keyEvidenceItems(ctx) {
  const { topic, primaryYong, yongList, fu, shi, ying, ben, relations, yinPattern } = ctx
  const items = []
  const y = primaryYong || (yongList && yongList[0])
  if (y) {
    const state = [y.wangshuai, y.kong ? '空亡' : '', y.changing ? '发动' : ''].filter(Boolean).join('、')
    let line = `用神「${topic.yongshen}」落${yaoName(y)}，当前${state || '平常'}`
    if (y.changeTo) line += `，并化${y.changeTo.text}`
    items.push(line + '。')
  } else if (fu) {
    items.push(`用神「${topic.yongshen}」伏藏，事情尚未完全显露；须待引出或冲开后才容易落实。`)
  } else if (topic.yongshen !== '世爻') {
    items.push(`用神「${topic.yongshen}」未现，说明题中条件尚未齐备，不宜过早下死结论。`)
  }
  if (shi && ying && topic.useShiYing) {
    const sy = relationWuxing(shi.wuxing, ying.wuxing)
    items.push(`世应关系为「${sy}」：${SY_PLAIN[sy] || '双方力量需结合具体爻位判断'}。`)
  }
  const moving = (ben && ben.yaos ? ben.yaos : []).filter((item) => item.changing)
  if (!moving.length) {
    items.push('六爻俱静，局面短期不易骤变，成败更取决于现有条件是否成熟。')
  } else {
    const relevant = relations && relations.links
      ? relations.links.find((link) => y && (link.to.index === y.index || link.from.index === y.index))
      : null
    items.push(relevant
      ? `关键变化：${relevant.text}，这是推动或牵制所问的直接力量。`
      : `${moving.length}爻发动，事情已进入变化期；以关键动爻和变卦定后势。`)
  }
  if (yinPattern && yinPattern.fanYin) items.push('卦见反吟，过程容易反复，口头承诺须等事实落地。')
  if (yinPattern && yinPattern.fuYin) items.push('卦见伏吟，局面容易停滞或原地打转，宜主动改变条件。')
  return uniqueText(items).slice(0, 4)
}

function timingSummary(ctx, judgment) {
  const parsed = judgment.parsed || {}
  const items = []
  if (parsed.mode === 'when') {
    if (parsed.whenKind === 'clock' && judgment.clockHint) items.push(`重点时段：${judgment.clockHint}。`)
    else (judgment.timingTips || []).slice(0, 2).forEach((tip) => items.push(tip))
  } else {
    const y = ctx.primaryYong || (ctx.yongList && ctx.yongList[0])
    if (y && y.kong) items.push(`用神逢空，宜等「${y.zhi}」出空或被冲实后再看落实。`)
    if (y && y.dayMonth && y.dayMonth.heRi) items.push('用神被合住，当前有牵绊；待破合时更容易有明确进展。')
    if (y && y.dayMonth && y.dayMonth.chongRi) items.push('日辰冲动用神，近期容易出现消息或转折。')
    if (!ctx.changingIndexes.length) items.push('静卦主缓，先看既定节奏，不宜频繁催逼或重复起卦。')
  }
  return uniqueText(items).slice(0, 2)
}

function shortGuaName(gua) {
  if (!gua) return ''
  return gua.alias || gua.shortName || String(gua.name || '').replace(/^[乾坤震巽坎离艮兑天地雷风水火山泽]{2}/, '') || gua.name || ''
}

function hexagramTheme(gua) {
  const name = shortGuaName(gua)
  return HEXAGRAM_THEME[name] || '先辨清眼下所处的时位，再决定应进还是应守'
}

function naturalAxisFact(axis) {
  if (!axis) return ''
  const power = axis.line ? linePower(axis.line) : 0
  const at = axis.line ? `，所落之爻力量${power >= 1 ? '较足' : power <= -1 ? '偏弱' : '平常'}` : ''
  const riskAt = axis.line ? `，其象${power >= 1 ? '较强' : power <= -1 ? '偏弱' : '尚未坐实'}` : ''
  if (axis.polarity === 'risk') {
    if (axis.value <= -1) return `${axis.label}已经形成牵制${riskAt}`
    if (axis.value >= 1) return `${axis.label}虽有其象，但眼下力量有限`
    return `${axis.label}仍是隐忧，却还没有强到足以定局`
  }
  if (axis.value >= 2) return `${axis.label}这一边最有力${at}`
  if (axis.value >= 1) return `${axis.label}已有支撑${at}`
  if (axis.value <= -2) return `${axis.label}明显接不住${at}`
  if (axis.value <= -1) return `${axis.label}仍偏弱${at}`
  return `${axis.label}尚未显出明确倾向`
}

function domainOutcome(profile, total) {
  const kind = profile.kind || 'general'
  const tone = total >= 2 ? 'good' : total <= -2 ? 'bad' : 'mid'
  const table = {
    emotion: { good: '双方仍有继续靠近的空间', mid: '心意与实际行动还没有完全同步', bad: '关系短期更容易疏远或反复' },
    career: { good: '机会有望从接触走向真正落位', mid: '机会与职位名分还没有同步', bad: '短期难见明确落位，强争反而更耗' },
    wealth: { good: '财势有聚拢的可能', mid: '有财机，但从机会到进账还隔着一层', bad: '财气容易被拖延、分耗或落空' },
    receivable: { good: '款项并非无望，更像迟中有回', mid: '钱与付款动作尚未接上', bad: '回款容易继续拖延，甚至出现折减' },
    investment: { good: '传统象意偏顺，但收益仍有条件', mid: '进退得失尚未拉开', bad: '风险一侧更重，不宜因一时之象加码' },
    exam: { good: '已有过关或取得进展的基础', mid: '能力与结果之间还差临门一环', bad: '眼下短板更容易影响结果' },
    'research-paper': { good: '稿件仍有被接住和继续推进的可能', mid: '论文价值与评审门槛尚在拉扯', bad: '关键质疑若不解，结果难以扭转' },
    'research-project': { good: '方案有继续推进并形成结果的空间', mid: '方法、资源与结果还没有真正合拢', bad: '根本条件不足，全面铺开只会增加消耗' },
    document: { good: '审批或文书事项有望继续过关', mid: '材料与决定节点尚未衔接', bad: '程序阻力仍重，短期不易放行' },
    lawsuit: { good: '传统象意稍有承接，但不能据此预断输赢', mid: '双方力量仍在拉扯，胜负不可由卦代断', bad: '风险压力偏重，更应回到法律程序处置' },
    family: { good: '家事仍有缓和与重新协调的余地', mid: '各方立场尚未真正安定', bad: '矛盾短期容易继续累积' },
    health: { good: '传统象意稍见缓和，但不构成医学判断', mid: '卦上轻重未定，仍须以检查和医生意见为准', bad: '卦只提示应提高警觉，不能据此判断病情' },
    travel: { good: '行程有望启动并逐步顺开', mid: '人想动，但路线或接应还没有接好', bad: '延误与阻隔偏重，宜先缓一步' },
    social: { good: '双方有重新接上或见面的可能', mid: '有往来之意，尚未化成明确行动', bad: '对方动作偏弱，空等难有结果' },
    delivery: { good: '流转仍在继续，后续有到达可能', mid: '物品尚在途中或节点之间', bad: '滞留、错转或延误的可能偏高' },
    lost: { good: '线索仍能收拢，所寻之物并非全无着落', mid: '线索有方向，但范围还没有缩到一点', bad: '遮蔽较重，短期查找会费周折' },
    home: { good: '家宅之事有安定或改善的空间', mid: '房屋条件与居住感受尚在权衡', bad: '隐患一侧偏重，不宜仓促落定' },
    weather: { good: '传统天气象偏向所问变化', mid: '天气之象尚不集中', bad: '所问天气变化的象偏弱或受阻' },
    choice: { good: '局面允许往前试一步', mid: '两个方向尚未拉开明显差距', bad: '眼下不适合做不可逆的重注' },
    general: { good: '事情已有可以借力向前的地方', mid: '几股力量互相牵制，尚未定局', bad: '阻力暂时压过助力，硬推不利' }
  }
  let key = kind
  if (/^emotion/.test(kind)) key = 'emotion'
  else if (['wealth'].includes(kind)) key = 'wealth'
  else if (!table[key]) key = 'general'
  return table[key][tone]
}

function narrativeHeadline(judgment, deep) {
  const mode = judgment.parsed && judgment.parsed.mode
  if (deep.profile.safe || deep.profile.guarded || ['where', 'when', 'who', 'choice'].includes(mode)) return deep.summary
  if (deep.profile.negativeOutcome) return deep.summary
  if (deep.total >= 3) return '可望推进，但宜循序而进'
  if (deep.total >= 1) return '有转机，尚未完全落定'
  if (deep.total <= -3) return '眼下难进，宜先退后谋'
  if (deep.total <= -1) return '阻力偏重，不宜硬推'
  return '局面未定，关键在下一步'
}

function narrativeDirectAnswer(judgment, deep) {
  const parsed = judgment.parsed || {}
  const focus = parsed.focus || deep.profile.result || '这件事'
  const mode = parsed.mode || 'outlook'
  if (deep.profile.safe || deep.profile.guarded || deep.profile.negativeOutcome || ['where', 'when', 'who', 'choice'].includes(mode)) return deep.answer
  if (mode === 'yesno') {
    if (deep.total >= 2) return `“${focus}”偏向能成，但仍要经过眼前这一处转折。`
    if (deep.total <= -2) return `“${focus}”眼下偏难，继续硬推只会增加消耗。`
    return `“${focus}”目前还不能断成或不成，关键条件尚未接上。`
  }
  if (mode === 'jixiong') {
    if (deep.total >= 2) return `“${focus}”利多于弊，但吉处有条件。`
    if (deep.total <= -2) return `“${focus}”阻力重于助力，宜收不宜放。`
    return `“${focus}”吉凶相杂，下一步的选择会改变结果。`
  }
  if (mode === 'how') return deep.total >= 2 ? `“${focus}”可以主动推进，但要沿最有力的一环发力。` : deep.total <= -2 ? `“${focus}”先不要正面硬攻，换条件比加力更重要。` : `“${focus}”宜先做一步可回退的试探，再看反馈。`
  return `“${focus}”${domainOutcome(deep.profile, deep.total)}。`
}

function narrativeOpening(ctx, judgment, deep) {
  const focus = (judgment.parsed && judgment.parsed.focus) || deep.profile.result || '所问之事'
  const guaName = shortGuaName(ctx.ben)
  const driver = deep.driver && deep.driver.value > 0 ? deep.driver : null
  const blocker = deep.blocker && deep.blocker.value < 0 ? deep.blocker : null
  let text = `本卦为《${guaName}》，它的主旨是${hexagramTheme(ctx.ben)}。`
  if (driver && blocker && driver.key !== blocker.key) {
    text += `落到你问的“${focus}”，卦里的矛盾不在“全有”或“全无”，而在两股力量还没有接上：${naturalAxisFact(driver)}；但${naturalAxisFact(blocker)}。这正是眼下有机会却还不能直接落定的原因。`
  } else if (blocker) {
    text += `落到你问的“${focus}”，眼下的主因不在运气，而在${naturalAxisFact(blocker)}。这一处不松动，其他吉象也难真正接上。`
  } else if (driver) {
    text += `落到你问的“${focus}”，${naturalAxisFact(driver)}，这是事情能够继续向前的主要支点。`
  } else {
    text += `落到你问的“${focus}”，用神、世应与动爻之间尚未形成一股足以定局的力量，因此现在不宜把一时现象当作最终结果。`
  }
  return text
}

function classicalLineName(y) {
  if (!y) return ''
  const value = y.yinYang ? '九' : '六'
  const position = ['初', '二', '三', '四', '五', '上'][y.index] || ''
  if (y.index === 0 || y.index === 5) return `${position}${value}`
  return `${value}${position}`
}

function keyMovingForNarrative(ctx, deep) {
  const moving = (ctx.ben && ctx.ben.yaos ? ctx.ben.yaos : []).filter((y) => y.changing)
  if (!moving.length) return null
  const related = deep.axes.filter((axis) => axis.line && axis.line.changing).map((axis) => axis.line.index)
  if (ctx.primaryYong && ctx.primaryYong.changing) return ctx.primaryYong
  return moving.find((y) => related.includes(y.index)) || moving[0]
}

function movingMeaning(y) {
  if (!y) return ''
  const parts = []
  const phase = [
    '事情刚起，尚在试探',
    '基础正在形成，还没有走到决定层',
    '事情走到内外转换的关口',
    '外部条件开始真正介入',
    '事情已到决定与落实的位置',
    '事情走到极处，容易转向'
  ][y.index] || '事情正在变化'
  parts.push(phase)
  const a = y.changeTo && y.changeTo.analysis
  if (a && a.jinTui && a.jinTui.type === '化进神') parts.push('又化进，说明后劲强于眼下，常见先小后大')
  else if (a && a.jinTui && a.jinTui.type === '化退神') parts.push('却化退，说明后劲不足，容易先动后缓')
  if (a && a.huiTou && a.huiTou.type === '回头生') parts.push('变化之后反得生扶，转机多在行动以后')
  else if (a && a.huiTou && a.huiTou.type === '回头克') parts.push('变化之后反受克制，启动以后仍会遇到掣肘')
  if (y.kong) parts.push('同时逢空，眼下所见还虚，消息未必马上成为事实')
  if (y.dayMonth && y.dayMonth.heRi) parts.push('又被日辰合住，当前有牵绊，进展不会很快')
  else if (y.dayMonth && y.dayMonth.chongRi) parts.push('又受日辰冲动，近期较容易出现消息或转折')
  return parts.join('；')
}

function processNarrative(ctx, deep) {
  const moving = (ctx.ben && ctx.ben.yaos ? ctx.ben.yaos : []).filter((y) => y.changing)
  const key = keyMovingForNarrative(ctx, deep)
  let text = ''
  if (!moving.length) {
    text = `六爻俱静，这件事短期不会突然翻转。${deep.total >= 2 ? '有利条件可以维持，但进展多半是缓慢累积。' : deep.total <= -2 ? '眼前阻力仍会延续，先改变条件比反复催促更重要。' : '局面更像维持现状，真正变化要等外部条件介入。'}`
  } else if (key) {
    text = `关键变化落在${classicalLineName(key)}。${movingMeaning(key)}。`
    if (moving.length > 1) text += `全卦共有${moving.length}爻发动，说明事情不是一条直线推进，还会有其他环节先后加入。`
  }
  if (ctx.yinPattern && ctx.yinPattern.fanYin) text += '卦又见反吟，过程容易往返；一次好转或一次受阻，都不能当作最终结果。'
  else if (ctx.yinPattern && ctx.yinPattern.fuYin) text += '卦又见伏吟，变化多在原处酝酿；若现实条件不变，局面容易反复停在同一点。'
  if (ctx.bian) {
    text += `事情往后变为《${shortGuaName(ctx.bian)}》，后势的重点是${hexagramTheme(ctx.bian)}。`
  }
  return text
}

function naturalClassicBridge(raw, profile, gua) {
  const text = String(raw || '')
  if (/利见大人/.test(text)) return '这不是泛泛地说“找贵人”，而是说转机要经过真正能作主、能承担结果的人。'
  if (/朋来|得朋/.test(text)) return '它指向同道相助：靠可信的配合，比一个人硬撑更容易打开局面。'
  if (/有孚/.test(text)) {
    if (profile.kind === 'lost') return '这里的“孚”是线索前后相应；方位、动线与现场物象能够互相印证，范围才会收窄。'
    if (/^emotion/.test(profile.kind)) return '这里的“孚”是心意能够见于持续行动，不是一时说得好听。'
    if (['wealth', 'receivable'].includes(profile.kind)) return '这里的“孚”是财与行动能够真正相接；财爻有气还要看对方是否发动。'
    return '这里的“孚”是内外相应、言行相符，事情才会由虚转实。'
  }
  if (/勿用|不利|征凶|凶|厉|灾|眚/.test(text)) return '经文所戒的不是永远不能做，而是眼下时位不对，继续硬推会把小阻力放大。'
  if (/利涉大川|利有攸往/.test(text)) return '经文许其前往，但前提是路径清楚、准备足够，不能把“可行”理解成“可以冒进”。'
  if (/贞吉|利贞|安贞|无咎/.test(text)) return '吉处落在守正与守序；做法不偏，才能把卦里的有利条件接住。'
  if (/悔|吝/.test(text)) return '它说明已有偏差，但还来得及调整；越早回头，代价越小。'
  if (/亨|吉|元亨/.test(text)) return '卦里确有可通之处，但“吉”只说明有路，不等于结果已经到手。'
  return `这句不能只按表面的吉凶来读，它把《${shortGuaName(gua)}》的主旨落到了这一爻：${hexagramTheme(gua)}。`
}

function classicQuote(text) {
  return String(text || '').replace(/[。；;，,]+$/g, '')
}

function classicNarrative(ctx, deep) {
  const benCi = guaCiOf(ctx.ben)
  if (!benCi) return ''
  const key = keyMovingForNarrative(ctx, deep)
  const line = key && benCi.yaoci ? benCi.yaoci[key.index] : ''
  if (line) {
    return `本卦卦辞为“${classicQuote(benCi.guaci)}”，但真正主变化的是${classicalLineName(key)}。爻辞说“${classicQuote(line)}”。${naturalClassicBridge(line || benCi.guaci, deep.profile, ctx.ben)}`
  }
  if (benCi.guaci) {
    return `此卦没有动爻，主要依本卦卦辞“${classicQuote(benCi.guaci)}”来定调。${naturalClassicBridge(benCi.guaci, deep.profile, ctx.ben)}`
  }
  return ''
}

function locationNarrative(ctx, deep) {
  const y = ctx.primaryYong || (ctx.yongList && ctx.yongList[0]) || (deep.driver && deep.driver.line) || ctx.ying
  if (!y) return ''
  const dir = y.zhi && ZHI_DIR[y.zhi]
  const trigram = ctx.ben && (y.index <= 2 ? ctx.ben.lower : ctx.ben.upper)
  const guaName = trigram && trigram.name
  const guaDir = guaName && GUA_DIR[guaName]
  const scene = guaName && GUA_SCENE[guaName]
  const range = y.index <= 1 ? '范围偏近、偏内，多在身边或原有环境' : y.index <= 3 ? '范围在内外交界，常见门口、通道或往返动线' : '范围偏外、偏远，也可能在较高位置或由他人经手'
  if (!dir && !guaDir) return ''
  let text = `方位以${classicalLineName(y)}${y.zhi ? `临“${y.zhi}”` : ''}为主，先看${dir || guaDir}`
  if (guaDir && guaDir !== dir) text += `；它所在的${guaName}卦取${guaDir}，作为相邻方向和环境的辅助，不与主方向硬拼`
  if (scene) text += `。${guaName}象还指向${scene}`
  text += `。从爻位看，${range}。`
  return text
}

function timeNarrative(ctx, judgment) {
  const parsed = judgment.parsed || {}
  const y = ctx.primaryYong || (ctx.yongList && ctx.yongList[0])
  if (parsed.mode === 'when') {
    if (parsed.whenKind === 'clock' && judgment.clockHint) return `时段上重点留意${judgment.clockHint}，这是用神或动爻地支所对应的时辰范围，不是精确到分钟。`
    if (judgment.whenHint) return `应期不取一个死日期，先看${judgment.whenHint}；若此前条件没有变化，时间仍会顺延。`
  }
  if (y && y.kong) return `时间上不会立刻落实。用神逢空，要等“${y.zhi}”出空或被冲实后，事情才更容易由虚转实。`
  if (y && y.dayMonth && y.dayMonth.heRi) return '时间上当前仍被牵住，等破合之后，进展会比现在明显。'
  if (y && y.dayMonth && y.dayMonth.chongRi) return '日辰已经冲动用神，消息或转折偏近，近期比远期更值得留意。'
  return ''
}

function adviceNarrative(ctx, deep) {
  if (deep.profile.safe || deep.profile.guarded || deep.profile.negativeOutcome) return deep.profile.action
  const kind = deep.profile.kind || 'general'
  const action = deep.profile.action || ''
  if (/^emotion/.test(kind)) return `先不要继续猜对方心意，把卦里的“有无”交给一次具体行动验证。${action}`
  if (kind === 'career') return `眼下不宜同时追逐多个可能，先让机会从口头认可变成明确的位置和节点。${action}`
  if (['wealth', 'receivable'].includes(kind)) return `财上要先分清“看见机会”与“真正落袋”，不要被表面的热度带着走。${action}`
  if (kind === 'investment') return `先把可得与可失分开，不因卦象偏顺就放大投入。${action}`
  if (['exam', 'research-paper', 'research-project', 'document'].includes(kind)) return `不要平均用力，先处理最可能改变结果的一环。${action}`
  if (kind === 'lost') return `不要漫无目的扩大查找范围，先按主方向和内外交界处查一轮，再沿最后动线往回收。${action}`
  if (kind === 'family') return `先把家事拆开，不要试图一次说清所有旧账。${action}`
  if (kind === 'travel') return `这卦更重行程是否真正接上，不在于勉强赶路。${action}`
  const driver = deep.driver && deep.driver.value > 0 ? deep.driver : null
  const blocker = deep.blocker && deep.blocker.value < 0 ? deep.blocker : null
  let lead = ''
  if (driver && blocker && driver.key !== blocker.key) {
    lead = `现在不要平均用力。先处理${blocker.label}，待这一处不再牵制，再顺着${driver.label}推进；顺序颠倒，越用力越容易空耗。`
  } else if (blocker) {
    lead = `眼下先别急着求结果，先把${blocker.label}这一处松开；它不变，局面就难变。`
  } else if (driver) {
    lead = `可以往前走，但要沿着${driver.label}这一支点发力，不必同时铺开所有方向。`
  } else {
    lead = '此时最合适的是做一步可观察、可回退的动作，让现实反馈替你缩小判断范围。'
  }
  return `${lead}${action}`
}

function progressSectionTitle(kind) {
  if (/^emotion/.test(kind)) return '这段关系会怎样走'
  if (kind === 'career') return '事业上的转折在哪里'
  if (['wealth', 'receivable', 'investment'].includes(kind)) return '财势接下来如何变化'
  if (['exam', 'research-paper', 'research-project', 'document'].includes(kind)) return '成败会落在哪一环'
  if (kind === 'lost') return '线索会怎样收拢'
  if (kind === 'travel') return '行程会怎样发展'
  if (kind === 'family') return '家事会怎样演变'
  return '事情接下来会怎样'
}

function adviceSectionTitle(kind) {
  if (/^emotion/.test(kind)) return '这段关系如何拿捏'
  if (kind === 'career') return '此时宜进还是宜守'
  if (['wealth', 'receivable', 'investment'].includes(kind)) return '财上如何取舍'
  if (kind === 'lost') return '查找应从哪里下手'
  if (kind === 'family') return '家事如何处置'
  return '你现在最该做什么'
}

function buildConciseSections(ctx, judgment) {
  const deep = buildDeepReading(ctx, judgment)
  deep.summary = narrativeHeadline(judgment, deep)
  deep.thesis = narrativeOpening(ctx, judgment, deep)
  deep.answer = narrativeDirectAnswer(judgment, deep)
  deep.action = adviceNarrative(ctx, deep)
  deep.pointer = ''
  const sections = []
  const process = processNarrative(ctx, deep)
  if (process) sections.push({ title: progressSectionTitle(deep.profile.kind), items: [process] })
  const classic = classicNarrative(ctx, deep)
  if (classic) sections.push({ title: '卦爻为什么这样说', items: [classic] })
  const parsed = judgment.parsed || {}
  const hints = []
  let hasPlace = false
  let hasTime = false
  if (parsed.mode === 'where' || deep.profile.kind === 'lost') {
    const place = locationNarrative(ctx, deep)
    if (place) { hints.push(place); hasPlace = true }
  }
  if (parsed.mode === 'when') {
    const time = timeNarrative(ctx, judgment)
    if (time) { hints.push(time); hasTime = true }
  } else if (parsed.mode !== 'where') {
    const time = timeNarrative(ctx, judgment)
    if (time) { hints.push(time); hasTime = true }
  }
  if (hints.length) sections.push({ title: hasPlace && hasTime ? '方位、范围与应期' : hasPlace ? '方位与范围' : '应期怎么看', items: hints })
  sections.push({
    title: adviceSectionTitle(deep.profile.kind),
    items: [deep.action]
  })
  return { sections, deep }
}

function buildPlainLead(topic, judgment, yongList, fu, changingIndexes, yinPattern) {
  const lines = []
  if (judgment.reply) lines.push(judgment.reply)
  lines.push(judgment.judgment)
  lines.push(judgment.advice)

  const focus = (judgment.parsed && judgment.parsed.focus) || topic.label
  const modeLabel = (judgment.parsed && judgment.parsed.modeLabel) || '走势'
  lines.push(`本题按「${modeLabel}」断「${focus}」，类别「${topic.label}」，主盯「${topic.yongshen === '世爻' ? '世应' : topic.yongshen}」。`)

  if (judgment.parsed && judgment.parsed.mode === 'when' && judgment.timingTips) {
    if (judgment.parsed.whenKind === 'clock' && judgment.clockHint) {
      lines.push(`时刻象意：${judgment.clockHint}。`)
    } else {
      judgment.timingTips.slice(0, 4).forEach((t) => lines.push(t))
    }
  }
  if (judgment.parsed && judgment.parsed.mode === 'where' && judgment.placeTips) {
    judgment.placeTips.slice(0, 4).forEach((t) => lines.push(t))
  }
  if (judgment.parsed && judgment.parsed.mode === 'who' && judgment.whoHint) {
    lines.push(`人物象：${judgment.whoHint}。`)
  }
  if (judgment.parsed && judgment.parsed.mode === 'choice' && judgment.parsed.choice) {
    lines.push(`选项：「${judgment.parsed.choice.a}」／「${judgment.parsed.choice.b}」。`)
  }

  if (yongList.length) lines.push(`与「${focus}」对应的用神：${yongList.map(yaoName).join('、')}。`)
  else if (fu) lines.push(`与「${focus}」对应的用神暂时伏藏。`)
  else if (topic.yongshen !== '世爻') lines.push(`与「${focus}」对应的用神未现。`)

  if (!changingIndexes.length) lines.push('六爻安静，变化偏慢。')
  else if (changingIndexes.length === 1) lines.push('一爻独发，线索集中。')
  else lines.push(`动爻 ${changingIndexes.length} 处，须合看生克。`)

  if (yinPattern && yinPattern.text) lines.push(yinPattern.text + '。')
  return lines
}

function interpret(cast, topicKey = 'general') {
  const topic = TOPIC_YONGSHEN.find((t) => t.key === topicKey) || TOPIC_YONGSHEN[TOPIC_YONGSHEN.length - 1]
  const { ben, bian, changingIndexes, question, calendar, fushenMap, relations, yinPattern } = cast
  const yongList = findYongshenYaos(ben, topic.yongshen)
  const moving = ben.yaos.filter((y) => y.changing)
  const shi = ben.yaos.find((y) => y.role === '世')
  const ying = ben.yaos.find((y) => y.role === '应')
  const fu = topic.yongshen !== '世爻' && fushenMap ? fushenMap[topic.yongshen] : null
  const primaryYong = primaryYongOf(yongList)

  const sections = []
  const score = { help: 0, hinder: 0 }

  // —— 先算分（与后文条目同步），再组织说明 —— //
  // 用神计分
  if (!yongList.length) {
    if (fu) {
      if (fu.kong) score.hinder += 1
    } else {
      score.hinder += 1
    }
  } else if (primaryYong) {
    const y = primaryYong
    if (y.wangshuai === '旺' || y.wangshuai === '相') score.help += 1
    else if (y.wangshuai === '囚' || y.wangshuai === '死') score.hinder += 1
    if (y.kong && !y.changing) score.hinder += 1
    if (y.dayMonth) {
      if (y.dayMonth.tags.includes('临日') || y.dayMonth.tags.includes('临月')) score.help += 1
      if (y.dayMonth.chongYue && !y.dayMonth.tags.includes('临日')) score.hinder += 2
    }
    if (y.changeTo && y.changeTo.analysis) {
      const a = y.changeTo.analysis
      if (a.huiTou) {
        if (a.huiTou.type === '回头生') score.help += 2
        if (a.huiTou.type === '回头克') score.hinder += 2
      }
      if (a.jinTui) {
        if (a.jinTui.type === '化进神') score.help += 1
        if (a.jinTui.type === '化退神') score.hinder += 1
      }
    }
  }
  if (topic.yuanShen) {
    ben.yaos
      .filter((y) => y.liuqin === topic.yuanShen && y.changing)
      .forEach((y) => {
        if (!y.kong || (y.dayMonth && (y.dayMonth.chongRi || y.dayMonth.tags.includes('临日')))) score.help += 1
      })
  }
  if (topic.jiShen) {
    ben.yaos
      .filter((y) => y.liuqin === topic.jiShen && y.changing)
      .forEach((y) => {
        if (y.wangshuai !== '死' || (y.dayMonth && y.dayMonth.tags.includes('临日'))) score.hinder += 1
      })
  }
  if (changingIndexes.length && relations && relations.links) {
    const important = relations.links.filter((l) => {
      if (!yongList.length) return l.type === '生' || l.type === '克' || l.type === '冲' || l.type === '合'
      return yongList.some((y) => l.to.index === y.index || l.from.index === y.index)
    })
    important.slice(0, 8).forEach((l) => {
      if (primaryYong && primaryYong.index === l.to.index) {
        if (l.type === '生') score.help += 1
        if (l.type === '克' || l.type === '冲') score.hinder += 1
      }
    })
  }
  if (shi && (topic.yongshen === '世爻' || topic.useShiYing)) {
    if (shi.wangshuai === '旺' || shi.wangshuai === '相') score.help += 1
    if (shi.wangshuai === '死' || shi.wangshuai === '囚') score.hinder += 1
  }
  if (shi && ying && topic.useShiYing) {
    const sy = relationWuxing(shi.wuxing, ying.wuxing)
    if (sy === '被生') score.help += 1
    if (sy === '被克') score.hinder += 1
  }

  const tendency = scoreTendency(score)
  const judgment = buildJudgment({
    topic,
    tendency,
    question,
    yongList,
    primaryYong,
    fu,
    changingIndexes,
    yinPattern,
    shi,
    ying,
    ben,
    calendar,
    askMeta: cast.askMeta || null
  })
  // 展示用倾向：以对所问的判断为准（可能因空亡/伏藏下调）
  const shownTendency = {
    level: judgment.level,
    tone: judgment.tone,
    note: judgment.judgment
  }

  // 0. 总说
  sections.push({
    title: '对所问的判断',
    items: buildPlainLead(topic, judgment, yongList, fu, changingIndexes, yinPattern)
  })

  // 1. 题面
  const topicItems = [
    `所问：${question || '（未填写）'}。`,
    `问法类型：${judgment.parsed ? judgment.parsed.modeLabel : '走势'}（${modeLabelList(judgment.parsed && judgment.parsed.modes)}）。`,
    `按「${topic.label}」取用：主看「${topic.yongshen}」${topic.yuanShen ? `；帮你的是「${topic.yuanShen}」` : ''}${topic.jiShen ? `；容易碍事的是「${topic.jiShen}」` : ''}。`
  ]
  if (calendar) topicItems.push(`卜卦时日：${calendar.display}。`)
  if (calendar && calendar.calendarNote) topicItems.push(`历法提示：${calendar.calendarNote}。`)
  topicItems.push(`本卦是「${ben.name}」（${ben.palaceName}宫·${ben.palaceWuxing}）。`)
  if (shi) topicItems.push(`世爻代表你：${yaoName(shi)}。`)
  if (ying) topicItems.push(`应爻代表对方或事体：${yaoName(ying)}。`)
  sections.push({ title: '一、你问的是什么', items: topicItems })

  // 2. 用神
  const yongItems = []
  if (!yongList.length) {
    if (fu) {
      yongItems.push(`主目标「${topic.yongshen}」没有直接上卦，而是伏藏：${fu.text}。`)
      yongItems.push('事情还没摆上台面，机会或对象还在暗处。可等冲开飞神、或岁月引出伏神时再看进展。')
      if (fu.kong) yongItems.push('伏神还逢空亡，更说明目前不落实，宜耐心等待。')
    } else {
      yongItems.push(`主目标「${topic.yongshen}」既没出现也没伏藏。`)
      yongItems.push('事体不够清楚。可改日再问，或先用世应看大方向。')
    }
  } else {
    yongItems.push(`主目标「${topic.yongshen}」出现在：${yongList.map(yaoName).join('；')}。`)
    if (primaryYong) {
      yongItems.push(`本次主取：${yaoName(primaryYong)}${yongList.length > 1 ? '（优先取发动、临日月、旺而不破者）' : ''}。`)
    }
    yongList.forEach((y) => {
      const bits = statusBits(y)
      if (bits.length) yongItems.push(`${yaoName(y)}目前：${bits.join('；')}。`)
      if (y.wangshuai === '旺' || y.wangshuai === '相') {
        yongItems.push('这个目标眼下有气、有力，成事的底子不错。')
      } else if (y.wangshuai === '囚' || y.wangshuai === '死') {
        yongItems.push('目标力气偏弱，推进会吃力，要靠生扶或换时机。')
      }
      if (y.kong && !y.changing) {
        yongItems.push('空亡且静：多半是虚而不实，像看见了却抓不住；常要等冲实或出旬才踏实。')
      } else if (y.kong && y.changing) {
        yongItems.push('动而逢空：虽在变化，但仍虚；看日辰能否冲实、或化出能否落地。')
      }
      if (y.dayMonth) {
        if (y.dayMonth.chongRi) yongItems.push('今天日辰正好冲到它：容易触发、变动，近应的机会较大。')
        if (y.dayMonth.heRi) yongItems.push('今天日辰合住它：容易粘住、定住，暂时发不动。')
        if (y.dayMonth.tags.includes('临日') || y.dayMonth.tags.includes('临月')) {
          yongItems.push('它临日或临月：得天时之助，力量更实。')
        }
      }
      if (y.changeTo) {
        yongItems.push(`它发动后变成：${y.changeTo.text}。`)
        const a = y.changeTo.analysis
        if (a && a.huiTou) {
          if (a.huiTou.type === '回头生') yongItems.push('变爻回头来生它，像自己给自己加油，偏吉。')
          if (a.huiTou.type === '回头克') yongItems.push('变爻回头来克它，像自己给自己添堵，偏凶。')
        }
        if (a && a.jinTui) {
          if (a.jinTui.type === '化进神') yongItems.push('化进神，事有向前推进、进取的意思。')
          if (a.jinTui.type === '化退神') yongItems.push('化退神，事有回缩、放缓的意思。')
        }
      }
      if (y.liushen) {
        const mean = y.liushenMeaning || LIUSHEN_MEANING[y.liushen] || ''
        yongItems.push(`它还临「${y.liushen}」${mean ? `（${mean}）` : ''}，可作象意参考。`)
      }
    })
  }
  sections.push({ title: '二、主目标现在怎样', items: yongItems })

  // 3. 元神忌神
  const yuanItems = []
  if (topic.yuanShen) {
    const yuan = ben.yaos.filter((y) => y.liuqin === topic.yuanShen)
    if (yuan.length) {
      yuanItems.push(`帮你的「${topic.yuanShen}」在：${yuan.map(yaoName).join('、')}。`)
      yuan.forEach((y) => {
        if (y.changing) {
          const effective = !y.kong || (y.dayMonth && (y.dayMonth.chongRi || y.dayMonth.tags.includes('临日')))
          yuanItems.push(effective
            ? `${yaoName(y)}正在发动且当前可用：传统上多主助力生扶目标。`
            : `${yaoName(y)}虽发动但逢空未实：有助力之象，现阶段仍要核验是否真正到位。`)
        }
      })
    } else if (fushenMap && fushenMap[topic.yuanShen]) {
      yuanItems.push(`帮你的「${topic.yuanShen}」暂时伏藏：${fushenMap[topic.yuanShen].text}。助力还没明朗。`)
    } else {
      yuanItems.push(`帮你的「${topic.yuanShen}」这卦里没见到。`)
    }
  }
  if (topic.jiShen) {
    const ji = ben.yaos.filter((y) => y.liuqin === topic.jiShen)
    if (ji.length) {
      yuanItems.push(`容易碍事的「${topic.jiShen}」在：${ji.map(yaoName).join('、')}。`)
      ji.forEach((y) => {
        if (y.changing) {
          const effective = y.wangshuai !== '死' || (y.dayMonth && y.dayMonth.tags.includes('临日'))
          yuanItems.push(effective
            ? `${yaoName(y)}正在发动且仍有力：要防它克损目标、分利或添乱。`
            : `${yaoName(y)}虽发动但力弱：阻碍已有信号，现阶段不宜夸大。`)
        }
      })
    } else {
      yuanItems.push(`忌神「${topic.jiShen}」这卦里没明显发动，阻碍不突出。`)
    }
  }
  if (yuanItems.length) sections.push({ title: '三、谁帮你、谁碍你', items: yuanItems })

  // 4. 动爻
  const moveItems = []
  if (!changingIndexes.length) {
    moveItems.push('六爻俱静：没有爻在动。')
    moveItems.push('局面相对稳，少突发转折；多看日月旺衰和目标本身强弱，事往往来得慢一些。')
  } else {
    moveItems.push(`发动的爻：${moving.map((m) => `${yaoName(m)}${m.changeTo ? ' → ' + m.changeTo.text : ''}`).join('；')}。`)
    if (relations && relations.links) {
      const important = relations.links.filter((l) => {
        if (!yongList.length) return l.type === '生' || l.type === '克' || l.type === '冲' || l.type === '合'
        return yongList.some((y) => l.to.index === y.index || l.from.index === y.index)
      })
      if (important.length) {
        moveItems.push('和主目标相关的生克合冲：')
        important.slice(0, 8).forEach((l) => {
          let plain = ''
          if (l.type === '生') plain = '（在帮忙）'
          else if (l.type === '克') plain = '（在克损）'
          else if (l.type === '冲') plain = '（在冲击、触发）'
          else if (l.type === '合') plain = '（在合住、牵绊）'
          moveItems.push(`${l.text}${plain}。`)
        })
      }
    }
    if (relations && relations.sanhe && relations.sanhe.length) {
      moveItems.push(`卦中地支具备三合组合：${relations.sanhe.map((s) => s.name).join('、')}。是否真正成局，还须结合发动、日月与旺衰，不能单凭三个字支定吉。`)
    }
  }
  sections.push({ title: '四、有没有变化在发生', items: moveItems })

  // 5. 世应
  const shiItems = []
  if (shi) {
    const bits = statusBits(shi)
    shiItems.push(`你（世爻）：${yaoName(shi)}${bits.length ? '。目前：' + bits.join('；') : ''}。`)
  }
  if (ying) {
    const bits = statusBits(ying)
    shiItems.push(`对方/事体（应爻）：${yaoName(ying)}${bits.length ? '。目前：' + bits.join('；') : ''}。`)
  }
  if (shi && ying) {
    const sy = relationWuxing(shi.wuxing, ying.wuxing)
    shiItems.push(`你和对方的五行关系是「${sy}」：${SY_PLAIN[sy] || '宜合看具体爻位'}。`)
  }
  sections.push({ title: '五、你和对方处在什么位置', items: shiItems })

  // 6. 应期 / 方位 / 时刻（按问法加重）
  const mode = judgment.parsed && judgment.parsed.mode
  const whenKind = judgment.parsed && judgment.parsed.whenKind
  if (mode === 'where') {
    const placeItems = (judgment.placeTips && judgment.placeTips.length)
      ? judgment.placeTips.slice()
      : ['方位信号不足，宜改日再问或现场核验。']
    sections.push({ title: '六、方位怎么看', items: placeItems })
  } else if (mode === 'when' && whenKind === 'clock') {
    const clockItems = []
    if (judgment.clockHint) clockItems.push(`象意时刻：${judgment.clockHint}（用地支合十二时辰，给的是时段不是精确分钟）。`)
    clockItems.push('问「几点」时，先答时段；吉凶强弱只说明此事是否明显、是否值得死等。')
    clockItems.push('此类推演为教学示意，重大安排请结合实况与专业预报。')
    sections.push({ title: '六、时刻怎么看（本题重点）', items: clockItems })
  } else {
    const yingqi = []
    if (mode === 'when' && judgment.timingTips && judgment.timingTips.length) {
      judgment.timingTips.forEach((t) => yingqi.push(t))
    }
    yongList.forEach((y) => {
      suggestYingqi(y, calendar, y.dayMonth || {}).forEach((t) => {
        if (yingqi.indexOf(t) < 0) yingqi.push(t)
      })
    })
    if (fu) yingqi.push('目标伏藏时：可等飞神被冲开，或岁月出现伏神地支，事情更容易「露出来」。')
    if (!yingqi.length) {
      yingqi.push('这卦没有特别强的时间信号。')
      yingqi.push('可继续观察：目标被冲/被合、出空、或助力变旺的月日。')
    }
    sections.push({ title: mode === 'when' ? '六、应期（本题重点）' : '六、大概什么时候有动静', items: yingqi })
  }

  // 7. 结语
  const endItems = []
  if (bian) endItems.push(`变卦是「${bian.name}」（${bian.palaceName}宫）。本卦看眼下起点，变卦看发展方向与结局倾向。`)
  endItems.push(topic.tip)
  endItems.push('以上断语按传统六爻规则推演，供研习对照；重大决策请结合现实条件自行取舍。')
  sections.push({ title: '七、收束提醒', items: endItems })

  const focus = []
  if (yongList.length) focus.push('目标已现')
  else if (fu) focus.push('目标伏藏')
  else focus.push('目标未明')
  if (changingIndexes.length === 1) focus.push('一爻动')
  else if (changingIndexes.length > 1) focus.push('多爻动')
  else focus.push('静卦')
  if (yongList.some((y) => y.kong) || (fu && fu.kong)) focus.push('逢空')
  if (yinPattern && yinPattern.fanYin) focus.push('反吟')
  if (yinPattern && yinPattern.fuYin) focus.push('伏吟')

  const concise = buildConciseSections({
    topic,
    ben,
    bian,
    question,
    askMeta: cast.askMeta || null,
    yongList,
    primaryYong,
    fu,
    shi,
    ying,
    relations,
    yinPattern,
    changingIndexes,
    calendar
  }, judgment)
  const conciseSections = concise.sections
  const deep = concise.deep
  const finalJudgment = Object.assign({}, judgment, {
    level: deep.summary,
    label: deep.summary,
    reply: deep.answer,
    judgment: deep.thesis,
    advice: deep.action
  })
  const finalTendency = {
    level: deep.summary,
    tone: deep.tone,
    note: deep.thesis
  }

  const points = []
  conciseSections.forEach((sec) => {
    points.push(`【${sec.title}】`)
    sec.items.forEach((it) => points.push(it))
  })

  return {
    topic,
    yongList,
    fushen: fu,
    question: question || '',
    sections: conciseSections,
    tendency: finalTendency,
    judgment: finalJudgment,
    score,
    points,
    summary: deep.summary,
    summaryNote: deep.thesis,
    reply: deep.answer,
    advice: deep.action,
    pointer: deep.pointer
  }
}

module.exports = {
  TOPIC_YONGSHEN,
  guessTopicKey,
  interpret
}
