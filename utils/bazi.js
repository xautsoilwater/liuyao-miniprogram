/**
 * 四柱八字命理分析核心算法库
 * 涵盖：生辰八字排盘、藏干、十神、纳音、长生十二宫、神煞、五行能量、大运排布与六维明理象解
 */

const {
  TIAN_GAN,
  DI_ZHI,
  ZHI_WUXING,
  getDayPillar,
  getMonthPillar,
  getYearPillar,
  getKongWang,
  solarTermWallTime
} = require('./ganzhi')

// 天干五行与阴阳
const GAN_PROPS = {
  甲: { wuxing: '木', yinyang: '阳' },
  乙: { wuxing: '木', yinyang: '阴' },
  丙: { wuxing: '火', yinyang: '阳' },
  丁: { wuxing: '火', yinyang: '阴' },
  戊: { wuxing: '土', yinyang: '阳' },
  己: { wuxing: '土', yinyang: '阴' },
  庚: { wuxing: '金', yinyang: '阳' },
  辛: { wuxing: '金', yinyang: '阴' },
  壬: { wuxing: '水', yinyang: '阳' },
  癸: { wuxing: '水', yinyang: '阴' }
}

const ZHI_PROPS = {
  子: { wuxing: '水', yinyang: '阳' },
  丑: { wuxing: '土', yinyang: '阴' },
  寅: { wuxing: '木', yinyang: '阳' },
  卯: { wuxing: '木', yinyang: '阴' },
  辰: { wuxing: '土', yinyang: '阳' },
  巳: { wuxing: '火', yinyang: '阴' },
  午: { wuxing: '火', yinyang: '阳' },
  未: { wuxing: '土', yinyang: '阴' },
  申: { wuxing: '金', yinyang: '阳' },
  酉: { wuxing: '金', yinyang: '阴' },
  戌: { wuxing: '土', yinyang: '阳' },
  亥: { wuxing: '水', yinyang: '阴' }
}

// 地支藏干
const ZHI_CANG_GAN = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '戊', '庚'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲']
}

// 纳音五行速查
const NAYIN_TABLE = {
  甲子: '海中金', 乙丑: '海中金', 丙寅: '炉中火', 丁卯: '炉中火', 戊辰: '大林木', 己巳: '大林木',
  庚午: '路旁土', 辛未: '路旁土', 壬申: '剑锋金', 癸酉: '剑锋金', 甲戌: '山头火', 乙亥: '山头火',
  丙子: '涧下水', 丁丑: '涧下水', 戊寅: '城头土', 己卯: '城头土', 庚辰: '白腊金', 辛巳: '白腊金',
  壬午: '杨柳木', 癸未: '杨柳木', 甲申: '泉中水', 乙酉: '泉中水', 丙戌: '屋上土', 丁亥: '屋上土',
  戊子: '霹雳火', 己丑: '霹雳火', 庚寅: '松柏木', 辛卯: '松柏木', 壬辰: '长流水', 癸巳: '长流水',
  甲午: '沙中金', 乙未: '沙中金', 丙申: '山下火', 丁酉: '山下火', 戊戌: '平地木', 己亥: '平地木',
  庚子: '壁上土', 辛丑: '壁上土', 壬寅: '金箔金', 癸卯: '金箔金', 甲辰: '覆灯火', 乙巳: '覆灯火',
  丙午: '天河水', 丁未: '天河水', 戊申: '大驿土', 己酉: '大驿土', 庚戌: '钗钏金', 辛亥: '钗钏金',
  壬子: '桑柘木', 癸丑: '桑柘木', 甲寅: '大溪水', 乙卯: '大溪水', 丙辰: '沙中土', 丁巳: '沙中土',
  戊午: '天上火', 己未: '天上火', 庚申: '石榴木', 辛酉: '石榴木', 壬戌: '大海水', 癸亥: '大海水'
}

// 五行生克关系
const WUXING_RELATIONS = {
  木: { 生: '火', 克: '土', 被生: '水', 被克: '金' },
  火: { 生: '土', 克: '金', 被生: '木', 被克: '水' },
  土: { 生: '金', 克: '水', 被生: '火', 被克: '木' },
  金: { 生: '水', 克: '木', 被生: '土', 被克: '火' },
  水: { 生: '木', 克: '火', 被生: '金', 被克: '土' }
}

// 十神简称对照
const SHISHEN_MAP = {
  比肩: '比', 劫财: '劫', 食神: '食', 伤官: '伤',
  偏财: '才', 正财: '财', 七杀: '杀', 正官: '官',
  偏印: '枭', 正印: '印'
}

/**
 * 根据日元天干和目标天干计算十神
 */
function getShiShen(dayGan, targetGan) {
  if (!dayGan || !targetGan) return ''
  const dProp = GAN_PROPS[dayGan]
  const tProp = GAN_PROPS[targetGan]
  if (!dProp || !tProp) return ''

  const sameYang = dProp.yinyang === tProp.yinyang

  if (dProp.wuxing === tProp.wuxing) {
    return sameYang ? '比肩' : '劫财'
  }
  if (WUXING_RELATIONS[dProp.wuxing].生 === tProp.wuxing) {
    return sameYang ? '食神' : '伤官'
  }
  if (WUXING_RELATIONS[dProp.wuxing].克 === tProp.wuxing) {
    return sameYang ? '偏财' : '正财'
  }
  if (WUXING_RELATIONS[dProp.wuxing].被克 === tProp.wuxing) {
    return sameYang ? '七杀' : '正官'
  }
  if (WUXING_RELATIONS[dProp.wuxing].被生 === tProp.wuxing) {
    return sameYang ? '偏印' : '正印'
  }
  return ''
}

// 十天干生旺死绝长生十二宫
const CHANGSHENG_STAGES = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养']

const CHANGSHENG_STARTS = {
  甲: { startZhi: '亥', forward: true },
  丙: { startZhi: '寅', forward: true },
  戊: { startZhi: '寅', forward: true },
  庚: { startZhi: '巳', forward: true },
  壬: { startZhi: '申', forward: true },
  乙: { startZhi: '午', forward: false },
  丁: { startZhi: '酉', forward: false },
  己: { startZhi: '酉', forward: false },
  辛: { startZhi: '子', forward: false },
  癸: { startZhi: '卯', forward: false }
}

function getChangSheng(dayGan, targetZhi) {
  const rule = CHANGSHENG_STARTS[dayGan]
  if (!rule) return '平'
  const startIdx = DI_ZHI.indexOf(rule.startZhi)
  const targetIdx = DI_ZHI.indexOf(targetZhi)
  let step = 0
  if (rule.forward) {
    step = (targetIdx - startIdx + 12) % 12
  } else {
    step = (startIdx - targetIdx + 12) % 12
  }
  return CHANGSHENG_STAGES[step]
}

/**
 * 计算时柱（日上起时法）
 * 甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸何方发，壬子是真途
 */
function getHourPillar(date, dayGan) {
  const hour = date.getHours()
  // 计算地支序号：23点后归子时
  // 23-1:0(子), 1-3:1(丑), 3-5:2(寅), 5-7:3(卯), 7-9:4(辰), 9-11:5(巳), 11-13:6(午), 13-15:7(未), 15-17:8(申), 17-19:9(酉), 19-21:10(戌), 21-23:11(亥)
  const zhiIdx = Math.floor(((hour + 1) % 24) / 2)
  const zhi = DI_ZHI[zhiIdx]

  const dayGanIdx = TIAN_GAN.indexOf(dayGan)
  // 甲己(0,5)->0(甲), 乙庚(1,6)->2(丙), 丙辛(2,7)->4(戊), 丁壬(3,8)->6(庚), 戊癸(4,9)->8(壬)
  const startMap = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const startGan = startMap[dayGanIdx]
  const gan = TIAN_GAN[(startGan + zhiIdx) % 10]

  return {
    gan,
    zhi,
    text: `${gan}${zhi}`,
    wuxing: ZHI_WUXING[zhi]
  }
}

/**
 * 神煞查询辅助库
 */
function getShenSha(dayGan, dayZhi, yearZhi, zhi, gan) {
  const list = []
  // 天乙贵人：甲戊并牛羊，乙己鼠猴乡，丙丁猪鸡位，壬癸兔蛇藏，庚辛逢马虎
  const tianyiMap = {
    甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
    乙: ['子', '申'], 己: ['子', '申'],
    丙: ['亥', '酉'], 丁: ['亥', '酉'],
    壬: ['卯', '巳'], 癸: ['卯', '巳'],
    辛: ['午', '寅']
  }
  if (tianyiMap[dayGan] && tianyiMap[dayGan].includes(zhi)) list.push('天乙贵人')

  // 文昌贵人：甲乙巳午报，丙戊申宫丁己酉，庚亥辛子壬寅癸卯
  const wenchangMap = {
    甲: '巳', 乙: '午', 丙: '申', 戊: '申', 丁: '酉', 己: '酉',
    庚: '亥', 辛: '子', 壬: '寅', 癸: '卯'
  }
  if (wenchangMap[dayGan] === zhi) list.push('文昌贵人')

  // 禄神：甲禄在寅，乙禄在卯，丙戊禄在巳，丁己禄在午，庚禄在申，辛禄在酉，壬禄在亥，癸禄在子
  const luMap = {
    甲: '寅', 乙: '卯', 丙: '巳', 戊: '巳', 丁: '午', 己: '午',
    庚: '申', 辛: '酉', 壬: '亥', 癸: '子'
  }
  if (luMap[dayGan] === zhi) list.push('禄神')

  // 羊刃：甲羊刃在卯，丙戊羊刃在午，庚羊刃在酉，壬羊刃在子
  const yangrenMap = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }
  if (yangrenMap[dayGan] === zhi) list.push('羊刃')

  // 桃花（咸池）：申子辰在酉，寅午戌在卯，巳酉丑在午，亥卯未在子
  const taohuaRef = ['申', '子', '辰'].includes(dayZhi) || ['申', '子', '辰'].includes(yearZhi) ? '酉' :
    (['寅', '午', '戌'].includes(dayZhi) || ['寅', '午', '戌'].includes(yearZhi) ? '卯' :
    (['巳', '酉', '丑'].includes(dayZhi) || ['巳', '酉', '丑'].includes(yearZhi) ? '午' : '子'))
  if (zhi === taohuaRef) list.push('桃花')

  // 驿马：申子辰在寅，寅午戌在申，巳酉丑在亥，亥卯未在巳
  const yimaRef = ['申', '子', '辰'].includes(dayZhi) || ['申', '子', '辰'].includes(yearZhi) ? '寅' :
    (['寅', '午', '戌'].includes(dayZhi) || ['寅', '午', '戌'].includes(yearZhi) ? '申' :
    (['巳', '酉', '丑'].includes(dayZhi) || ['巳', '酉', '丑'].includes(yearZhi) ? '亥' : '巳'))
  if (zhi === yimaRef) list.push('驿马')

  // 华盖：申子辰见辰，寅午戌见戌，巳酉丑见丑，亥卯未见未
  const huagaiRef = ['申', '子', '辰'].includes(dayZhi) || ['申', '子', '辰'].includes(yearZhi) ? '辰' :
    (['寅', '午', '戌'].includes(dayZhi) || ['寅', '午', '戌'].includes(yearZhi) ? '戌' :
    (['巳', '酉', '丑'].includes(dayZhi) || ['巳', '酉', '丑'].includes(yearZhi) ? '丑' : '未'))
  if (zhi === huagaiRef) list.push('华盖')

  // 将星：申子辰见子，寅午戌见午，巳酉丑见酉，亥卯未见卯
  const jiangxingRef = ['申', '子', '辰'].includes(dayZhi) || ['申', '子', '辰'].includes(yearZhi) ? '子' :
    (['寅', '午', '戌'].includes(dayZhi) || ['寅', '午', '戌'].includes(yearZhi) ? '午' :
    (['巳', '酉', '丑'].includes(dayZhi) || ['巳', '酉', '丑'].includes(yearZhi) ? '酉' : '卯'))
  if (zhi === jiangxingRef) list.push('将星')

  return list
}

/**
 * 五行能量统计与百分比
 */
function calculateWuxingEnergy(pillars) {
  const scores = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }

  // 天干各记 10 分
  pillars.forEach(p => {
    const wx = GAN_PROPS[p.gan]?.wuxing
    if (wx) scores[wx] += 10
  })

  // 地支本气 12 分，余气 4 分
  pillars.forEach(p => {
    const cangs = ZHI_CANG_GAN[p.zhi] || []
    if (cangs.length === 1) {
      const wx = GAN_PROPS[cangs[0]]?.wuxing
      if (wx) scores[wx] += 15
    } else if (cangs.length === 2) {
      scores[GAN_PROPS[cangs[0]]?.wuxing] += 10
      scores[GAN_PROPS[cangs[1]]?.wuxing] += 5
    } else if (cangs.length >= 3) {
      scores[GAN_PROPS[cangs[0]]?.wuxing] += 8
      scores[GAN_PROPS[cangs[1]]?.wuxing] += 4
      scores[GAN_PROPS[cangs[2]]?.wuxing] += 3
    }
  })

  const total = Object.values(scores).reduce((a, b) => a + b, 0)
  const percents = {}
  Object.keys(scores).forEach(k => {
    percents[k] = Math.round((scores[k] / total) * 100)
  })

  return { scores, percents, total }
}

/**
 * 日元旺衰与用神喜忌判定
 */
function analyzeStrengthAndUseful(dayGan, monthZhi, energy) {
  const dayWx = GAN_PROPS[dayGan].wuxing
  const monthWx = ZHI_WUXING[monthZhi]

  // 月令得生或比
  const isDeLing = monthWx === dayWx || WUXING_RELATIONS[dayWx].被生 === monthWx
  const myPower = (energy.percents[dayWx] || 0) + (energy.percents[WUXING_RELATIONS[dayWx].被生] || 0)

  let strength = '中和'
  if (myPower >= 52 || (isDeLing && myPower >= 42)) {
    strength = '身旺'
  } else if (myPower <= 32 || (!isDeLing && myPower <= 38)) {
    strength = '身弱'
  }

  // 用神喜忌简断
  let xi = []
  let ji = []

  if (strength === '身旺') {
    // 身旺喜克泄耗（官杀、食伤、财星）
    xi = [WUXING_RELATIONS[dayWx].生, WUXING_RELATIONS[dayWx].克, WUXING_RELATIONS[dayWx].被克]
    ji = [dayWx, WUXING_RELATIONS[dayWx].被生]
  } else {
    // 身弱喜生扶（印星、比劫）
    xi = [WUXING_RELATIONS[dayWx].被生, dayWx]
    ji = [WUXING_RELATIONS[dayWx].克, WUXING_RELATIONS[dayWx].被克, WUXING_RELATIONS[dayWx].生]
  }

  return {
    dayWx,
    strength,
    isDeLing,
    xi,
    ji,
    pattern: `${dayWx}命 · ${strength}`
  }
}

/**
 * 排大运（十年一步运）
 * 阳男阴女顺排，阴男阳女逆排
 */
function calculateDayun(birthDate, gender = '男', yearGan, monthPillar, dayGan) {
  const isYangYear = GAN_PROPS[yearGan].yinyang === '阳'
  const isMale = gender === '男'
  // 阳男阴女为顺，阴男阳女为逆
  const forward = (isYangYear && isMale) || (!isYangYear && !isMale)

  // 估算起运年龄（简化精准推算：平均按 3-8 岁起运）
  const startAge = 6

  const monthGanIdx = TIAN_GAN.indexOf(monthPillar.gan)
  const monthZhiIdx = DI_ZHI.indexOf(monthPillar.zhi)

  const dayunList = []
  for (let i = 1; i <= 8; i++) {
    const step = forward ? i : -i
    const gan = TIAN_GAN[(monthGanIdx + step + 100) % 10]
    const zhi = DI_ZHI[(monthZhiIdx + step + 120) % 12]
    const ageStart = startAge + (i - 1) * 10
    const ageEnd = ageStart + 9
    const shishen = getShiShen(dayGan, gan)
    dayunList.push({
      step: i,
      gan,
      zhi,
      text: `${gan}${zhi}`,
      shishen,
      shishenShort: SHISHEN_MAP[shishen] || shishen,
      ageStart,
      ageEnd,
      ageRange: `${ageStart}-${ageEnd}岁`,
      nayin: NAYIN_TABLE[`${gan}${zhi}`] || ''
    })
  }

  return {
    forward,
    startAge,
    startAgeDesc: `约 ${startAge} 岁起运（每逢乙年交运）`,
    list: dayunList
  }
}

/**
 * 六维命理明理象解（融合周易哲学与义理，导向自省修身）
 */
function generateBaziInterpretation(baziData) {
  const { dayPillar, analysis, energy, pillars } = baziData
  const dayGan = dayPillar.gan
  const dayZhi = dayPillar.zhi
  const dayWx = GAN_PROPS[dayGan].wuxing
  const strength = analysis.strength

  // 1. 元亨·心性禀赋
  const ganTraits = {
    甲: '如参天之木，志向高远，仁德宽厚，有领导气魄；唯性直木讷，宜蓄涵养。',
    乙: '如花草藤萝，柔顺坚韧，机变灵通，善结善缘；唯多虑敏锐，须守定见。',
    丙: '如普照之日，光明磊落，热情豪迈，胸怀坦荡；唯急躁少忍，宜克浮躁。',
    丁: '如炉中烛火，内秀温润，深思熟虑，文雅知礼；唯心多郁思，宜宽心境。',
    戊: '如重厚之土，厚德载物，信实沉稳，笃行重诺；唯固执守常，宜化通达。',
    己: '如田园润土，含蓄包容，随和务实，艺能多面；唯少魄决断，须立自尊。',
    庚: '如百炼之金，刚毅果敢，棱角分明，重义好胜；唯刚极易折，宜贵圆融。',
    辛: '如温润之玉，清雅超拔，善感自尊，细腻缜密；唯虚荣任性，贵在韬光。',
    壬: '如江河大川，智虑宏阔，胸襟浩渺，奔涌变通；唯任性少束，须筑堤防。',
    癸: '如朝霞雨露，聪颖灵动，敏于洞察，润物无声；唯多愁柔靡，当树定力。'
  }

  // 2. 功名·学业科研
  const studyTexts = {
    木: '木主条达生发，利文史、社科、生命科学与教育研习。思维重脉络梳理，能耐长期沉淀。',
    火: '火主文明外显，利计算机、人工智能、传播传媒与理论创新。思维敏锐飞跃，善出亮点。',
    土: '土主承载沉潜，利地理地质、土木工程、古籍整理与基础材料。厚积薄发，持之以恒。',
    金: '金主条理明断，利数理逻辑、金融工程、精密仪器与算法推演。结构清晰，严谨缜密。',
    水: '水主通变智谋，利流体力学、海洋水利、数据分析与跨学科交叉。灵动触类旁通。'
  }

  // 3. 利见·事业赛道
  const careerTexts = strength === '身旺'
    ? '日元身强，任财任官。宜主动担当，走专业自主、技术攻坚或管理掌舵之路；喜独立成局，不喜受制于人。'
    : '日元偏柔，贵在借力。宜入平台依托、导师协同或团队合力；顺势借力生发，以巧劲与精深求胜。'

  // 4. 丰亨·财帛运途
  const wealthTexts = strength === '身旺'
    ? '命带财星有气，财由技生、由名引利。宜深耕主业以招自来之财，忌盲目跟风投机与借贷博彩。'
    : '宜求稳健积累，以知识产权、稳健薪俸与长线资产为主；理财宜求保本防守，重在细水长流。'

  // 5. 同人·姻缘相处
  const marriageTexts = `配偶宫坐【${dayZhi}】（五行属${ZHI_WUXING[dayZhi]}）。夫妻相处重在相知相敬，多换位体谅对方心境。婚姻之道，阴阳调和，不尚争胜，以默契合和为贵。`

  // 6. 保和·身心气血
  const healthGuide = {
    木: '木气主肝胆、筋骨。日常忌怒伤肝，宜多做拉伸舒展，春季防情志郁结。',
    火: '火气主心脑、小肠。忌熬夜劳神，夏季宜宁心安神，少嗜辛辣刺激。',
    土: '土气主脾胃、肌肉。饮食宜温软定时，忌过度思虑劳神，多食谷物健脾。',
    金: '金气主肺系、皮毛。秋冬宜润燥生津，调理呼吸吐纳，防呼吸道与咽喉劳损。',
    水: '水气主肾水、生殖与骨髓。忌受寒着凉，重在保养元阳，夜卧早起，调息养精。'
  }

  // 7. 明理·趋吉之道
  const mingliSummary = `《易·象》曰：「天行健，君子以自强不息；地势坤，君子以厚德载物。」此命五行喜【${analysis.xi.join('、')}】，忌【${analysis.ji.join('、')}】。命格乃先天禀赋之骨架，大运乃后天行进之时令。知五行盛衰，非为怨天尤人，而在顺时养晦、乘时展才。修德成器，自能逢凶化吉。`

  return [
    {
      title: '元亨 · 心性禀赋',
      summary: `${dayGan}${dayWx}日主 · ${strength}`,
      content: ganTraits[dayGan] || '天命赋予秉性，持之以正，克己复礼。'
    },
    {
      title: '功名 · 学业与科研',
      summary: `五行喜${analysis.xi.join('·')}吐秀`,
      content: studyTexts[dayWx] || '笃志向学，功不唐捐。'
    },
    {
      title: '利见 · 事业赛道',
      summary: strength === '身旺' ? '自强开局 · 宜担重任' : '依山借水 · 贵人提携',
      content: careerTexts
    },
    {
      title: '丰亨 · 财禄机变',
      summary: '正道经营 · 技以载财',
      content: wealthTexts
    },
    {
      title: '同人 · 姻缘眷属',
      summary: `夫妻宫坐${dayZhi} · 调和共济`,
      content: marriageTexts
    },
    {
      title: '保和 · 身心气血',
      summary: '五行颐养 · 顺应四时',
      content: healthGuide[dayWx] || '调和身心，动静有常。'
    },
    {
      title: '明理 · 趋吉之道',
      summary: '观变知几 · 修身立命',
      content: mingliSummary
    }
  ]
}

/**
 * 完整八字命理排盘主入口
 */
function calculateBazi({ birthDate, gender = '男', name = '命主' }) {
  const date = birthDate instanceof Date ? birthDate : new Date(birthDate)
  if (Number.isNaN(date.getTime())) throw new Error('无效出生时间')

  const yearPillar = getYearPillar(date)
  const monthPillar = getMonthPillar(date, yearPillar.gan)
  const dayPillar = getDayPillar(date)
  const hourPillar = getHourPillar(date, dayPillar.gan)

  const dayGan = dayPillar.gan
  const dayZhi = dayPillar.zhi
  const yearZhi = yearPillar.zhi

  // 构建四柱明细
  const rawPillars = [
    { name: '年柱', ...yearPillar },
    { name: '月柱', ...monthPillar },
    { name: '日柱', ...dayPillar },
    { name: '时柱', ...hourPillar }
  ]

  const pillars = rawPillars.map(p => {
    const isDay = p.name === '日柱'
    const shishen = isDay ? '日主' : getShiShen(dayGan, p.gan)
    const cangGans = ZHI_CANG_GAN[p.zhi] || []
    const cangDetails = cangGans.map(cg => ({
      gan: cg,
      wuxing: GAN_PROPS[cg]?.wuxing,
      shishen: getShiShen(dayGan, cg),
      shishenShort: SHISHEN_MAP[getShiShen(dayGan, cg)] || ''
    }))
    const nayin = NAYIN_TABLE[p.text] || '—'
    const changsheng = getChangSheng(dayGan, p.zhi)
    const shensha = getShenSha(dayGan, dayZhi, yearZhi, p.zhi, p.gan)

    return {
      pillarName: p.name,
      gan: p.gan,
      zhi: p.zhi,
      text: p.text,
      ganWuxing: GAN_PROPS[p.gan]?.wuxing,
      zhiWuxing: ZHI_WUXING[p.zhi],
      shishen,
      shishenShort: isDay ? '元' : (SHISHEN_MAP[shishen] || shishen),
      cangDetails,
      nayin,
      changsheng,
      shensha
    }
  })

  // 旬空
  const kongwang = getKongWang(dayPillar)

  // 五行能量
  const energy = calculateWuxingEnergy(rawPillars)

  // 旺衰与用神喜忌
  const analysis = analyzeStrengthAndUseful(dayGan, monthPillar.zhi, energy)

  // 大运
  const dayun = calculateDayun(date, gender, yearPillar.gan, monthPillar, dayGan)

  // 命理明理断解
  const interpretation = generateBaziInterpretation({
    dayPillar,
    monthPillar,
    analysis,
    energy,
    pillars
  })

  return {
    name,
    gender,
    genderLabel: gender === '男' ? '乾造' : '坤造',
    birthTimeStr: date.toISOString().replace('T', ' ').slice(0, 16),
    dayGan,
    dayZhi,
    dayWuxing: GAN_PROPS[dayGan]?.wuxing,
    pillars,
    kongwang,
    energy,
    analysis,
    dayun,
    interpretation,
    summary: `${gender === '男' ? '乾造' : '坤造'} · ${yearPillar.text} ${monthPillar.text} ${dayPillar.text} ${hourPillar.text}`
  }
}

module.exports = {
  calculateBazi,
  getShiShen,
  getHourPillar,
  getChangSheng,
  calculateWuxingEnergy,
  NAYIN_TABLE,
  GAN_PROPS,
  ZHI_PROPS
}
