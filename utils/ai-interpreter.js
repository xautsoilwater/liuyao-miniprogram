/**
 * 周易 AI 算卦解卦核心引擎
 * 负责将用户问题与纳甲六爻全量排盘数据转化为专业神机 Prompt，
 * 调度大模型 API 进行深度义理象数推演，并提供高水准的结构化断语与智能理数兜底。
 */

const { getAiConfig } = require('./ai-config')
const { getGuaCi } = require('../data/guaci')
const { getGuaXiangjie } = require('../data/gua64-xiangjie')
const { parseQuestion, ZHI_DIR, GUA_DIR } = require('./ask')

/**
 * 将六爻排盘数据格式化为适合大模型理解的周易象数报单
 */
function formatCastForPrompt(cast) {
  if (!cast || !cast.ben) return '（暂无详细盘面）'

  const benName = cast.ben.name || '本卦'
  const palace = cast.ben.palaceName || ''
  const element = cast.ben.palaceWuxing || ''
  const lines = []
  lines.push(`【本卦】《${benName}》（${palace}，五行属${element}）`)

  if (cast.bian && cast.bian.name && cast.changingIndexes && cast.changingIndexes.length > 0) {
    lines.push(`【变卦】《${cast.bian.name}》（${cast.bian.palaceName || ''}）`)
  } else {
    lines.push('【变卦】静卦无变')
  }

  // 筮历干支
  const cal = cast.calendar || {}
  lines.push(`【筮历干支】${cal.year?.text || cast.yearPillar?.text || ''}年 ${cal.month?.text || cast.monthPillar?.text || ''}月 ${cal.day?.text || cast.dayPillar?.text || ''}日`)
  if (cast.kongwang) {
    lines.push(`【日柱空亡】${cast.kongwang.text || ''}`)
  }

  // 动爻位置
  const moveNames = []
  if (cast.changingIndexes && cast.changingIndexes.length) {
    cast.changingIndexes.forEach(idx => {
      moveNames.push(['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][idx])
    })
  }
  lines.push(`【动爻状态】${moveNames.length ? moveNames.join('、') + '发动' : '六爻安静（静卦）'}`)

  // 六爻盘面详细逐爻结构（自上而下：上爻到初爻）
  lines.push('\n【六爻盘面明细（自上而下）：】')
  const yaos = cast.ben.yaosBottomUp || []
  if (yaos.length === 6) {
    for (let i = 5; i >= 0; i--) {
      const y = yaos[i]
      const posName = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i]
      const liushen = y.liushen || ''
      const qin = y.liuqin || ''
      const gz = y.ganZhi || ''
      const role = y.role ? `【${y.role}】` : ''
      const moving = y.changing && y.changeTo ? `(发动 -> 变${y.changeTo.liuqin || ''}${y.changeTo.ganZhi || ''})` : (y.changing ? '(动爻)' : '')
      const fushen = y.fushen ? `[伏神: ${y.fushen.liuqin || ''}${y.fushen.ganZhi || ''}]` : ''
      const tags = y.tags && y.tags.length ? `[${y.tags.join('/')}]` : ''
      lines.push(`- ${posName}（${y.name}）：${liushen} ${qin} ${gz} ${role} ${moving} ${fushen} ${tags}`)
    }
  }

  return lines.join('\n')
}

/**
 * 参数归一化：无缝支持 ({ question, cast })、(cast, question)、(question, cast) 等多种调用签名
 */
function normalizeArgs(a, b) {
  if (a && typeof a === 'object' && 'cast' in a) {
    return {
      cast: a.cast || null,
      question: typeof a.question === 'string' ? a.question : (typeof b === 'string' ? b : '')
    }
  }
  if (a && typeof a === 'object' && (a.ben || a.changingIndexes || a.rawYaos || a.yaosBottomUp || a.lines)) {
    return {
      cast: a,
      question: typeof b === 'string' ? b : (b && b.question ? b.question : (typeof a.question === 'string' ? a.question : ''))
    }
  }
  if (typeof a === 'string') {
    return {
      cast: b || null,
      question: a
    }
  }
  return {
    cast: a || null,
    question: typeof b === 'string' ? b : ''
  }
}

/**
 * 彻底清洗 AI 输出中混入的 Markdown 标记与各类星号符号
 */
function cleanAiMarkdown(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    // 移除三阶或二阶加粗/斜体星号（保留内部文本）: ***文本*** -> 文本, **文本** -> 文本, *文本* -> 文本
    .replace(/\*{1,3}([^\*\n]+?)\*{1,3}/g, '$1')
    // 移除行首的 Markdown 列表星号或减号: * 文本 -> 文本
    .replace(/^[\s]*[\*\-]\s+/gm, '')
    // 移除可能散落遗留的任何孤立星号
    .replace(/\*+/g, '')
    // 移除 Markdown 标题井号: ### 文本 -> 文本
    .replace(/^[\s]*#{1,6}\s*/gm, '')
    // 移除多余的波浪线和反引号
    .replace(/[`~]/g, '')
    .trim()
}

/**
 * 将文本切分为条目数组并彻底清理星号
 */
function toSectionItems(text) {
  if (!text) return []
  const cleaned = cleanAiMarkdown(text)
  const lines = cleaned.split('\n')
    .map((l) => cleanAiMarkdown(l).trim())
    .filter(Boolean)
  return lines.length > 0 ? lines : [cleaned]
}

/**
 * 从盘面取主方位（妻财/应爻/动爻/世爻地支 → 外卦后天位）
 */
function resolvePlaceFromCast(cast) {
  const ben = cast && cast.ben
  if (!ben) return ''
  const yaos = ben.yaosBottomUp || []
  const prefer = [
    yaos.find((y) => y.liuqin === '妻财'),
    yaos.find((y) => y.role === '应'),
    yaos.find((y) => y.changing),
    yaos.find((y) => y.role === '世')
  ].filter(Boolean)
  for (const y of prefer) {
    if (y.zhi && ZHI_DIR[y.zhi]) return ZHI_DIR[y.zhi]
  }
  if (ben.upper && GUA_DIR[ben.upper.name]) return GUA_DIR[ben.upper.name]
  if (ben.lower && GUA_DIR[ben.lower.name]) return GUA_DIR[ben.lower.name]
  const palace = (ben.palaceName || '').replace(/宫$/, '')
  if (palace && GUA_DIR[palace]) return GUA_DIR[palace]
  return ''
}

/**
 * 给出可读的具体应期/时间范围
 */
function resolveYingqiFromCast(cast, tone, timeFrame) {
  const yaos = (cast && cast.ben && cast.ben.yaosBottomUp) || []
  const moving = yaos.filter((y) => y.changing)
  const y = moving[0] || yaos.find((y) => y.role === '世') || yaos[0]
  const zhi = (y && y.zhi) || ''
  const dayZhi = (cast && cast.calendar && cast.calendar.day && cast.calendar.day.zhi) || ''
  const keyZhi = zhi || dayZhi
  const zhiHint = keyZhi ? `${keyZhi}日左右（及其前后冲合日）` : '关键日及其前后几天'

  if (timeFrame) {
    if (tone === 'good') return `按你问的「${timeFrame}」，整体可以动；重点看${zhiHint}`
    if (tone === 'bad') return `按你问的「${timeFrame}」，现在硬推容易碰壁；可放到后半段，或等${zhiHint}再看`
    return `「${timeFrame}」里吉凶各半，先小步试，到${zhiHint}再决定是否加码`
  }
  if (tone === 'good' && moving.length) return `时间偏近，近几天到本月内有机会；重点看${zhiHint}`
  if (tone === 'good') return `时间偏稳，宜按月推进；可留意${zhiHint}`
  if (tone === 'bad') return `容易拖、容易反复，近十天别死磕；等${zhiHint}后再动更稳`
  return `时间还不明朗，先观察半个月；${zhiHint}前后值得留意`
}

/**
 * 深度解构问卦者的问题意图、核心标的物、时间窗口与动作焦点
 */
function analyzeQuestionIntent(rawQuestion) {
  const q = (rawQuestion || '').trim()
  if (!q) {
    return {
      isEmpty: true,
      raw: '',
      cleanTopic: '综合运程进退',
      timeFrame: '当前阶段',
      actionVerb: '行事进退',
      targetNoun: '万事机缘',
      category: 'general',
      keyDilemma: '知常明变与审时度势',
      askMode: 'outlook',
      whenKind: '',
      modeLabel: '走势',
      focus: '综合运程进退'
    }
  }

  const parsed = parseQuestion(q) || {}

  // 1. 抽取时间窗口（用户原话优先）
  let timeFrame = parsed.timeHint || ''
  const timeMatch = q.match(/(今年下半年|今年上半年|下半年|上半年|今年年底|年底前|年底|明年上半年|明年下半年|明年|下个月|本月|这个月|近期|眼下|当下|未来三年|未来五年|这几天|近一周|本周|下周|未来半年|秋天|冬天|春天|夏天|年内|月底前)/)
  if (timeMatch) {
    timeFrame = timeMatch[1]
  }

  // 2. 识别问事分类与动作标的
  let category = 'general'
  let actionVerb = '谋划行进'
  let targetNoun = '所测事宜'
  let keyDilemma = '把握机先与化解阻滞'

  if (/哪里|哪儿|何处|何方|什么地方|哪个方向|什么方向|方位|丢在哪|在哪个|往哪/.test(q) || parsed.mode === 'where') {
    category = 'place'
    actionVerb = '寻位定向'
    targetNoun = '所求方位'
    keyDilemma = '主方位与邻近方位的取舍'
  } else if (/拓|辟|进军|新市场|新赛道|业务|获客|扩张|新项目/.test(q)) {
    category = 'expand'
    actionVerb = '开拓进取'
    targetNoun = '开拓新市场业务'
    keyDilemma = '外围获客与内部资金链防守'
  } else if (/合伙|合作|入股|搭伙|股份|加盟/.test(q)) {
    category = 'partner'
    actionVerb = '合伙共事'
    targetNoun = '合伙商业合作'
    keyDilemma = '权责利润分配与合伙人信任'
  } else if (/钱|财|收益|买|卖|盈|利|投资|理财|股|货|款|买房|置业|房产/.test(q)) {
    category = 'wealth'
    actionVerb = '求财投资'
    targetNoun = '资产收益与商业求财'
    keyDilemma = '本金安全与变现利润'
  } else if (/换工作|跳槽|离职|辞职|转行|换行业/.test(q)) {
    category = 'career_switch'
    actionVerb = '跳槽变轨'
    targetNoun = '职场变动与新旧交替'
    keyDilemma = '下家发展机缘与盲动风险'
  } else if (/工作|事业|升职|晋升|提拔|岗位|竞聘|评职称|官/.test(q)) {
    category = 'career'
    actionVerb = '求取晋升'
    targetNoun = '事业前程与职阶机运'
    keyDilemma = '贵人提携与同侪暗中竞争'
  } else if (/考研|考公|考编|考|学|研|试|录取|论文|评定|证|面试/.test(q)) {
    category = 'study'
    actionVerb = '应试登科'
    targetNoun = '学业功名与文书过关'
    keyDilemma = '考场发挥与薄弱环节防守'
  } else if (/复合|挽回|和好|破镜/.test(q)) {
    category = 'love_reconcile'
    actionVerb = '旧缘复合'
    targetNoun = '旧情和解与情缘重续'
    keyDilemma = '历史心结未解与现实温差'
  } else if (/感情|婚|爱|喜欢|交往|他|她|对象|相亲|伴侣|结婚|离婚/.test(q)) {
    category = 'love'
    actionVerb = '姻缘相处'
    targetNoun = '情缘婚恋与世应交感'
    keyDilemma = '价值观契合度与沟通坦诚'
  } else if (/病|健康|医|身体|痛|伤|疾|手术|康复/.test(q)) {
    category = 'health'
    actionVerb = '调养身心'
    targetNoun = '气血安康与病疾调摄'
    keyDilemma = '遵从医嘱与心态放松'
  } else if (/官司|诉讼|仲裁|纠纷|起诉|打官司/.test(q)) {
    category = 'law'
    actionVerb = '定分止争'
    targetNoun = '法务诉讼与权益争端'
    keyDilemma = '证据扎实度与和解退让时机'
  } else if (/行|出差|走|旅游|迁|搬家|去/.test(q)) {
    category = 'travel'
    actionVerb = '出行迁徙'
    targetNoun = '行程通达与水土安和'
    keyDilemma = '旅途防备与人际和气'
  }

  // 提取用户问句的核心标的
  let cleanTopic = (parsed.focus || q)
    .replace(/[吗呢吧呀？\?！!]/g, '')
    .replace(/(能不能|是否合适|是否可以|好不好|会怎样|如何|怎么样|能否顺利|成不成|可以吗|可否|行不行|合适)$/g, '')
    .replace(/(能不能|是否合适|是否可以|好不好|会怎样|如何|怎么样|能否顺利|成不成|可以吗|可否|行不行)/g, '')
    .trim()

  if (timeFrame) {
    cleanTopic = cleanTopic.replace(timeFrame, '').trim()
  }

  if (!cleanTopic) cleanTopic = targetNoun || '所测事宜'

  return {
    isEmpty: false,
    raw: q,
    cleanTopic,
    timeFrame,
    category,
    actionVerb,
    targetNoun: targetNoun || cleanTopic,
    keyDilemma,
    askMode: parsed.mode || 'outlook',
    whenKind: parsed.whenKind || '',
    modeLabel: parsed.modeLabel || '走势',
    focus: cleanTopic,
    parsed
  }
}

/**
 * 构建发送给大模型的周易神机 Prompt
 */
function buildDivinationPrompt(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  const intent = analyzeQuestionIntent(question)
  const asked = (question || intent.raw || intent.cleanTopic || '所问之事').trim()

  const benAlias = (cast?.ben?.name || '').replace(/为[天地水火山风雷泽]/g, '')
  const bianAlias = (cast?.bian?.name || '').replace(/为[天地水火山风雷泽]/g, '')
  const benDetail = getGuaXiangjie(benAlias) || {}
  const bianDetail = getGuaXiangjie(bianAlias) || {}
  const placeHint = resolvePlaceFromCast(cast) || '待由用神地支细参'
  const mode = intent.askMode || 'outlook'
  const modeHint = mode === 'where'
    ? `用户在问方位。你必须给出具体方位（如东南、正北），可参考「${placeHint}」。`
    : mode === 'when'
      ? '用户在问时间/应期。你必须给出具体时间范围（如近几日、本月内、某地支日及其冲合日）。'
      : mode === 'yesno'
        ? '用户在问成否/可否。第一句解释必须明确：可行 / 暂不宜 / 宜先试探。'
        : mode === 'how'
          ? '用户在问怎么办。必须给出可执行的下一步。'
          : '必须直接回答用户这句问话，禁止答成与所问无关的空话。'

  const systemPrompt = `你是会看六爻的师傅，用大白话帮人断事。先听懂用户问什么，再结合卦象直接回答。

【所问即所答】
- 用户原话：「${asked}」
- 核心标的：「${intent.cleanTopic}」
- 先分清：成否、时间、方位、怎么办，还是看走势
- 禁止套话、空话、只背卦名不回答问题

【盘面参考】
- 本卦：《${cast?.ben?.name || '本卦'}》${benDetail.theme ? `（${benDetail.theme}）` : ''}
- 变卦：${cast?.bian?.name ? `《${cast.bian.name}》` : '无变卦'}
- 问法：${intent.modeLabel || '走势'}；时间：${intent.timeFrame || '未特别指定'}
- 方位参考：${placeHint}

【输出要求】
1. 只输出两部分：神机四句偈、偈语解释。不要单独写「卦象解释」。
2. ${modeHint}
3. 四句偈：为这一问现场写七言四句，把「${intent.cleanTopic}」写进诗里。
4. 偈语解释：逐句对应上面四句，固定四行，每行约35～50字，像跟朋友聊天：
「第一句原文」：第一句先直接回答「${asked}」——说清能/不能、何时、何方或怎么办
「第二句原文」：第二句说为什么这么看，用白话讲卦象在提示什么（别堆术语）
「第三句原文」：第三句说时间范围、方位细节，或这阶段最该防什么
「第四句原文」：第四句说接下来具体怎么做，一步能落地
5. 解释禁用套话标签：不要用「直断」「何以见得」「卦德」「取象」「应期」「尤须戒」「用神」等行话。
6. 禁止 AI、大模型等词；禁止 Markdown 星号。

### 【神机四句偈】
（七言四句，每行一句）

### 【偈语解释】
（四行，每行「该句原文」：大白话解释）`

  const userPrompt = `请用大白话回答这句问话，不要跑题：
「${asked}」

本卦《${cast?.ben?.name || '本卦'}》。先给明确结论，再给时间或方位（若问到），最后说下一步怎么做。

盘面：
${formatCastForPrompt(cast)}`

  return { systemPrompt, userPrompt }
}

async function callAiDivinationApi(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  const config = getAiConfig()
  const { systemPrompt, userPrompt } = buildDivinationPrompt({ question, cast })

  const requestBody = {
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: typeof config.temperature === 'number' ? Math.min(config.temperature, 0.45) : 0.45,
    max_tokens: config.maxTokens || 2000
  }

  let rawContent = ''

  // 适配微信小程序环境与浏览器/Node环境
  if (typeof wx !== 'undefined' && wx.request) {
    rawContent = await new Promise((resolve, reject) => {
      wx.request({
        url: config.apiUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        data: requestBody,
        timeout: 25000,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300 && res.data) {
            const reply = res.data.choices?.[0]?.message?.content
            if (reply) resolve(reply)
            else reject(new Error('API响应格式异常'))
          } else {
            reject(new Error(`API请求失败: ${res.statusCode}`))
          }
        },
        fail: (err) => reject(err)
      })
    })
  } else if (typeof fetch !== 'undefined') {
    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(25000) : undefined
    })

    if (!response.ok) {
      throw new Error(`API HTTP Error: ${response.status}`)
    }

    const json = await response.json()
    rawContent = json.choices?.[0]?.message?.content || ''
  } else {
    throw new Error('当前环境不支持网络请求')
  }

  return parseAiDivinationOutput(rawContent, question, cast)
}

/**
 * 64 卦精妙趋吉避凶神机七言绝句金偈库
 */
const GUA_JIYU_MAP = {
  乾: ['天行健劲势凌云', '动变潜升自有因', '最戒骄狂争第一', '终朝惕厉福常新'],
  坤: ['厚德方圆利涉川', '先迷后得莫慌盘', '随顺安常含蓄养', '西南有助吉连绵'],
  屯: ['开端草创步履难', '深扎根基莫急攀', '守正待机休妄动', '春风一拂过重关'],
  蒙: ['山下出泉云雾遮', '求师点化辨真邪', '虚心向善休狂断', '雾散云开见碧霞'],
  需: ['云在青天势且徐', '随安饮食莫空虚', '耐得浮沉守宁静', '风云际会跃天衢'],
  讼: ['利刃交加多是非', '止争罢讼是先机', '退让三分非示弱', '安心守己远祸危'],
  师: ['地中有水聚师行', '法令森严纪律明', '量力用人防有折', '凯旋知止免虚惊'],
  比: ['亲比同舟结善缘', '辅车相依路途宽', '择交审慎防虚妄', '诚意孚诚万事全'],
  小畜: ['密云不雨待和风', '收敛微芒步履轻', '点滴积累成大势', '莫因微滞乱初盟'],
  履: ['尾随猛虎履薄冰', '敬慎安详礼法行', '知险不慌安步度', '终无咎责步青云'],
  泰: ['小往大来天地通', '乘时进取建丰功', '居安思危防峻坂', '包容广纳福恒融'],
  否: ['闭塞天时不与通', '强推盲进陷泥中', '深藏利器全锋锐', '静待春雷破土封'],
  同人: ['出处同行志意同', '求同存异大亨通', '开怀相照除私虑', '共济江湖唱大风'],
  大有: ['火照天高日月光', '丰盈富足纳吉祥', '遏恶扬善承天命', '谦恭自守寿源长'],
  谦: ['地中高岳势藏深', '受益由谦品若金', '高而不骄天下服', '福源润泽入平心'],
  豫: ['雷出地奋意欣荣', '顺应时机乐事生', '戒纵贪欢先戒备', '安和乐处保清宁'],
  随: ['顺天应人任卷舒', '从善如流意气舒', '莫随邪僻迷真性', '适得其宜乐有余'],
  蛊: ['积弊如山事已迟', '振衰起废正当时', '三思先甲后三甲', '更易新章步坦夷'],
  临: ['居高临下物萌生', '渐入佳境喜气迎', '莫谓眼前长盛景', '八月防衰早筹行'],
  观: ['风行地上蔚大观', '澄虑澄心鉴胆肝', '省察自身防过错', '正人正己步从宽'],
  噬嗑: ['雷电交合法令张', '除奸去梗莫迟忙', '秉公明断除障碍', '事到通时见艳阳'],
  贲: ['山下有火锦绣开', '华饰须防假伪排', '务实返纯存本色', '白贲无咎自康泰'],
  剥: ['山附于地势将倾', '小人得势莫相争', '藏精保性全元气', '留得生机待复生'],
  复: ['一阳初起见天心', '返本归真福自临', '休急躁进贪捷径', '七日来复听佳音'],
  无妄: ['天命循环自自然', '守真无妄得完全', '莫凭侥幸生非分', '坦荡做人远祸愆'],
  大畜: ['天在山中蓄力宏', '不家食者养贤声', '笃实辉光涵养厚', '时来一跃上天庭'],
  颐: ['自求口实省言行', '养德修身百病轻', '休逐物欲迷眼乱', '清虚守正见神灵'],
  大过: ['栋桡负重势如崩', '调整结构步须轻', '挺拔守中防断折', '量力而行自得平'],
  坎: ['重重险水路难通', '守信前行辨顺风', '莫因急切贪虚进', '出幽向明水朝东'],
  离: ['丽天丽地彩云飞', '柔顺文明正德威', '最忌烈炎伤根本', '养神凝气照光辉'],
  咸: ['山泽通气感相通', '心诚相契意相容', '莫随私念生浮躁', '以虚受人万古同'],
  恒: ['风雷相与势长生', '恒守正道事必成', '久耐平淡防轻变', '始终如一享泰平'],
  遁: ['天山悬阻势宜藏', '避退非退是良方', '远害全身存浩气', '待时复出展轩昂'],
  大壮: ['雷震天上气昂扬', '正大光明利四方', '莫借威势逞刚猛', '防触藩篱自退让'],
  晋: ['旭日东升万象新', '顺时推进贵逢亲', '勤加自勉扬善道', '万里康庄步步真'],
  明夷: ['日入地中晦暗沉', '韬光养晦守贞心', '艰危莫把精神泄', '内明外柔渡深林'],
  家人: ['风自火出礼法严', '修身齐家万代全', '正位各安明分际', '和气致祥乐绵延'],
  睽: ['火上泽下性难齐', '求同存异莫强拘', '小事可通休作大', '异中寻契转凶吉'],
  蹇: ['山上有水路多蹇', '进取维艰莫强穿', '反身修德求良策', '西南方有利人全'],
  解: ['雷雨交作解寒霜', '赦过宥罪释忧伤', '夙兴夙夜清余患', '从此舒眉步坦途'],
  损: ['山下有泽损浮华', '节俭持身俭是家', '舍小存大存根本', '转害成益见新芽'],
  益: ['风雷鼓荡利乘时', '见善而迁改过宜', '利人即是修己福', '大展宏图正当时'],
  夬: ['泽上于天决断明', '发号施令莫用兵', '公正除弊防刚愎', '审慎居中步履平'],
  姤: ['风行天下势相逢', '偶遇机缘莫强融', '见微知著防潜患', '守正居常利久通'],
  萃: ['泽上于地聚英贤', '假庙致孝福运联', '防患未然修武备', '同心协力结良缘'],
  升: ['地中生木节节高', '积小而成大浪涛', '用见大人休畏惧', '南征进取领风骚'],
  困: ['泽无水困锁龙泉', '致命遂志性犹坚', '困穷莫乱方寸意', '言而无信终脱险'],
  井: ['改邑不改井泉香', '汲引滋润利民康', '井甃修理防羸繘', '源远流长福寿长'],
  革: ['泽中有火变新章', '顺天应人去旧疮', '巩固信任行其制', '大亨利贞焕朝光'],
  鼎: ['木上有火化生成', '正位凝命铸重衡', '耳目聪明求贤辅', '大吉元亨享太平'],
  震: ['雷声百里起惊惶', '恐惧修省见纯良', '震动不失匕鬯守', '笑言哑哑化祯祥'],
  艮: ['兼山阻隔步宜停', '该止则止意澄明', '不行其庭无尤过', '守分安常百患平'],
  渐: ['木植高山序次攀', '鸿渐于陆步徐看', '循规蹈矩防躁进', '终见安巢结凤鸾'],
  归妹: ['泽上有雷嫁娶时', '浮华轻动履差池', '见机知止休非分', '守分持常免后悔'],
  丰: ['雷电交合日正中', '丰大光芒照九垓', '日中则昃防亏损', '推恩济物福常怀'],
  旅: ['山上有火客心惊', '过客飘零重在正', '慎用刑狱防焚舍', '谦和自律免灾生'],
  巽: ['重风申命顺理行', '柔顺坚韧意志宁', '刚柔相济遵师训', '号令随风四海平'],
  兑: ['丽泽相资喜气添', '朋友讲习意相兼', '以正为和防谄媚', '利贞安泰乐天年'],
  涣: ['风行水上升波涛', '解散羁绊意气高', '享帝立庙安人心', '跨过险阻踏金鳌'],
  节: ['泽上有水制成节', '节制有度乐谐和', '苦节不可当适可', '安稳从容度风波'],
  中孚: ['泽上有风信意笃', '孚及豚鱼化顽夫', '虚心诚恪行王道', '利涉大川出畏途'],
  小过: ['山上有雷雀声飞', '可小事也莫大为', '密云不雨高飞损', '下从谦慎获祯祥'],
  既济: ['水火既济事已成', '初吉终乱要防生', '濡尾戒娇持敬慎', '慎始慎终保泰平'],
  未济: ['火在水上尚未平', '小狐汔济要留神', '审度时宜谋后着', '更立宏图启岁新']
}

/**
 * 健壮的六十四卦别名解析器（支持全名如“地天泰”、“水雷屯”、“离为火”精准转为“泰”、“屯”、“离”）
 */
function resolveGuaAlias(name) {
  if (!name) return ''
  if (typeof GUA_ESSENCE !== 'undefined' && GUA_ESSENCE[name]) return name
  const stripped = name.replace(/为[天地水火山风雷泽]/g, '')
  if (typeof GUA_ESSENCE !== 'undefined' && GUA_ESSENCE[stripped]) return stripped
  if (typeof GUA_ESSENCE !== 'undefined') {
    for (const k of Object.keys(GUA_ESSENCE)) {
      if (name.endsWith(k)) return k
    }
  }
  for (const k of Object.keys(GUA_JIYU_MAP)) {
    if (name.endsWith(k)) return k
  }
  return stripped
}

/**
 * 依据卦名、吉凶势态与所测问题，生成更贴题的四句偈
 * 优先按所问类别取诗，避免「卦诗漂亮但与所问无关」
 */
function generateDivinationJiyu(benGuaName, tone, question) {
  const intent = analyzeQuestionIntent(question)
  const cleanName = resolveGuaAlias(benGuaName)

  const byCategory = () => {
    if (intent.category === 'expand' || intent.askMode === 'yesno' && /市场|拓|业务|项目/.test(intent.raw || '')) {
      if (tone === 'good') return ['所问开拓有路通', '借势附丽莫逞雄', '窗口推进防过猛', '深根一域自昌隆']
      if (tone === 'bad') return ['所问开拓路犹偏', '莫向荒原猛加码', '先固本盘再外拓', '待时乘势步从宽']
      return ['所问开拓宜审详', '先试一域再铺张', '量力用度全周密', '稳中求进上高岗']
    }
    if (intent.category === 'place' || intent.askMode === 'where') {
      if (tone === 'good') return ['所问方位有主向', '东南西北细端详', '先循主位再旁探', '莫使多方乱步场']
      if (tone === 'bad') return ['所问方位信号弱', '不宜钉死一处找', '先循旧迹与动线', '旁侧扩展步步到']
      return ['所问方位宜审度', '主位邻近两相顾', '先查一处再扩散', '忌凭臆测空奔忙']
    }
    if (intent.askMode === 'when') {
      if (tone === 'good') return ['所问时机窗已开', '近应可期莫徘徊', '盯住冲合关键日', '依窗推进自迎来']
      if (tone === 'bad') return ['所问时机多迟滞', '近旬不宜强求成', '且待冲合日再现', '窗口后段再发功']
      return ['所问时机尚未明', '先观半月辨阴晴', '小步试水探应期', '逢值逢合再起程']
    }
    if (intent.category === 'partner') {
      if (tone === 'good') return ['所问合伙利通津', '权责先明见诚真', '白纸落笔无猜忌', '共赢风浪展经纶']
      if (tone === 'bad') return ['所问合伙藏暗礁', '财利分张起浪涛', '莫信虚言轻托付', '早定边界免徒劳']
      return ['所问合伙且审详', '先明权责后图张', '公私分际清如水', '免使嫌生两断肠']
    }
    if (intent.category === 'career_switch') {
      if (tone === 'good') return ['所问跳槽有新程', '下家明堂正待君', '果决衔接休空窗', '借力一跃建新勋']
      if (tone === 'bad') return ['所问跳槽且慢行', '空仓盲跳陷泥坑', '先磨利器稳旧阵', '春暖花开再动身']
      return ['所问去留费思量', '未可轻离旧主场', '把身家事筹算定', '东风忽起再扬航']
    }
    if (intent.category === 'study') {
      if (tone === 'good') return ['所问功名路非遥', '文运可期气象高', '细补短板除隐患', '临场沉着领风骚']
      if (tone === 'bad') return ['所问功名待厚积', '莫为浮名乱步履', '查漏补缺深下力', '来时一举越阶梯']
      return ['所问学业定心神', '戒躁防虚下苦功', '磨得胸中冰雪净', '天道终不负苦人']
    }
    if (intent.category === 'love_reconcile' || intent.category === 'love') {
      if (tone === 'good') return ['所问情缘有回温', '坦诚相待解疑痕', '少翻陈账多顾今', '珍重当前月满门']
      if (tone === 'bad') return ['所问情缘宜止争', '强求反使意难平', '先安己心修边界', '转角或有别样晴']
      return ['所问情丝意如麻', '各自冷静看真假', '冷暖随缘休执念', '心安之处即天涯']
    }
    if (intent.category === 'wealth') {
      if (tone === 'good') return ['所问求财有门路', '顺势推进勿贪速', '风控留白防回撤', '稳拿利润步步固']
      if (tone === 'bad') return ['所问求财多阻滞', '本金安全放第一', '暂停加码先止损', '另寻稳途再择机']
      return ['所问钱财宜稳健', '先算退路后求进', '分批试水控仓位', '忌一口吞成大饼']
    }
    return null
  }

  const cat = byCategory()
  if (cat) return cat

  // 类别不明时再回落卦诗
  if (GUA_JIYU_MAP[cleanName]) return GUA_JIYU_MAP[cleanName]
  for (const k of Object.keys(GUA_JIYU_MAP)) {
    if (cleanName.includes(k) || k.includes(cleanName)) return GUA_JIYU_MAP[k]
  }

  if (tone === 'good') {
    return ['天心顺遂好乘舟', '所问之事有望收', '得意莫忘持戒慎', '宽怀落实自优游']
  }
  if (tone === 'bad') {
    return ['关山万叠水流迟', '所问之事宜暂持', '退避守正修内省', '暗流过后现朝晖']
  }
  return ['阴阳代谢有恒程', '所问之事莫急行', '待等春雷破残夜', '一朝昂首跃青溟']
}

/**
 * 六十四卦深层卦德与人事映射心法大典
 */
const GUA_ESSENCE = {
  乾: {
    nature: '《乾》者健也，纯阳刚劲，天行健劲生生不息',
    spirit: '势道浩大、大有可为，然盛极必亢，成败关键在于「知进亦知退，戒骄戒狂」',
    pitfall: '切忌仗势冒进或盲目加杠杆，严防刚愎自用招致「亢龙有悔」',
    action: '稳住心态，终朝乾乾自强不息，在优势中预留三成风控退路'
  },
  坤: {
    nature: '《坤》者顺也，厚德载物，地道包容顺势而为',
    spirit: '此卦贵在「先迷后得主、后发制人」，宜以柔克刚，切忌争当激进出头鸟',
    pitfall: '切忌急功近利抢占C位，防范因过早暴露意图而陷入被动泥潭',
    action: '退居幕后做好支撑与蓄力，顺借强势方资源借力打力'
  },
  屯: {
    nature: '《屯》者难也，云雷郁结，正如破土幼芽刚柔始交',
    spirit: '万事开头难，此番谋划乃「草创扎根」之局，切不可贪图立竿见影',
    pitfall: '切忌心浮气躁拔苗助长，防范开局盘根错节导致信心动摇与资源空耗',
    action: '先建侯立规、扎稳底层样板与核心分工，打好地基待春风破局'
  },
  蒙: {
    nature: '《蒙》者昧也，山下出泉，前路云雾笼罩待启蒙求真',
    spirit: '当前信息不对称严重，此卦昭示「先明而后动」，切莫凭主观臆测盲断',
    pitfall: '切忌自以为是强行拍板，防范因认知盲区而踏入隐蔽坑洼',
    action: '虚心向行业老手或资深师长深度请教，摸透真实底牌与规则再行动'
  },
  需: {
    nature: '《需》者待也，水在天上，密云聚天从容饮食待时',
    spirit: '万事俱备唯欠东风，此卦昭示「等待即是蓄力」，当下切忌强推急躁',
    pitfall: '切忌因外界催促或同侪焦虑而仓促上马，急于求成必陷泥泞险滩',
    action: '保持定力沉心打磨手头内功，耐得浮沉，静待关键风口契机自然成熟'
  },
  讼: {
    nature: '《讼》者争也，天水违行，上下背道多生嫌隙是非',
    spirit: '利益分配或条款权责存在隐患，此卦昭示「止争息讼，退步为安」',
    pitfall: '切忌意气用事纠缠不休，防范口舌官非激化导致两败俱伤',
    action: '主动寻求中正第三方介入协调，白纸黑字厘清协议，退让三分保全大局'
  },
  师: {
    nature: '《师》者众也，地中有水，行军聚众法令纪律森严',
    spirit: '涉及多方利益协同，此卦昭示「以律驭众，正己化人」，须有统帅定力',
    pitfall: '最忌多头指挥、权责模糊与纪律散漫，防范内部推诿引发溃败',
    action: '明确唯一决策主帅，制定铁律般的推进时间表与问责赏罚机制'
  },
  比: {
    nature: '《比》者辅也，水在地上，相依相亲辅车相依结善缘',
    spirit: '成败全在「结盟亲附与得道多助」，单打独斗不如同舟共济',
    pitfall: '防范后至无诚、各怀私心之投机分子，切莫盲目轻信未经考验的伙伴',
    action: '主动拜访核心合伙人与得力贵人，开诚布公奠定利益共赢基石'
  },
  小畜: {
    nature: '《小畜》者塞也，风行天上，密云不雨力量尚在微蓄',
    spirit: '当前势能尚不足以支撑大动作大开大合，此卦昭示「以柔克刚，小步积蓄」',
    pitfall: '切忌急躁推进大项目，防范因力量单薄而中途搁浅受挫',
    action: '收敛过激动作，在核心关键点上做小幅度试点与耐心改良'
  },
  履: {
    nature: '《履》者礼也，天下泽上，如履薄冰尾随猛虎敬慎行',
    spirit: '所对局面强势且暗藏玄机，此卦昭示「恪守礼法，敬慎无咎」',
    pitfall: '切忌狂妄自大或逾矩越权，防范在合规、法律或等级分寸上踩雷',
    action: '严格核对每一个法务与流程细节，态度低调谦逊，步步为营'
  },
  泰: {
    nature: '《泰》者通也，天地交泰，小往大来生机盎然万物通',
    spirit: '天时人际皆顺的大吉通达之象，上下同心，大有作为正当时',
    pitfall: '切记「无平不陂」，顺境中最忌盲目自满挥霍，忽略未来转折',
    action: '趁势全速推进关键里程碑，同时为下阶段储备充足的备用粮草'
  },
  否: {
    nature: '《否》者塞也，天地不交，大往小来闭塞不通逆境临',
    spirit: '外界沟通阻滞、气场不和，此卦昭示「俭德辟难，保存实力」',
    pitfall: '严禁逆风硬闯或死磕到底，防范无谓内耗导致核心老本被拖垮',
    action: '果断收缩非必要战线，深藏利器隐忍蓄锐，静候外部气候松动'
  },
  同人: {
    nature: '《同人》者亲也，天火同人，文明健顺求大同存小异',
    spirit: '成败在于「走出狭隘私域，公开合众」，大公无私方得广泛支持',
    pitfall: '防范拉帮结派或局限于熟人小圈子，切莫因门户之见错失外围强援',
    action: '把方案推向更广阔的开放平台，以诚意和共享格局吸纳优质同行者'
  },
  大有: {
    nature: '《大有》者盛也，火在天上，日丽中天物华丰盈大收获',
    spirit: '资源富足、形势大好的丰盈之卦，得道多助，胜券在握',
    pitfall: '最忌奢靡傲慢与坐吃山空，防范因表面繁荣招致旁人嫉恨与反噬',
    action: '善用现有资源巩固护城河，让利团队与合作伙伴，保福运长久'
  },
  谦: {
    nature: '《谦》者退也，地中有山，高岳藏深尊而光大受益多',
    spirit: '大吉无咎之至德，此卦昭示「主动放低姿态，以退为进，功成不居」',
    pitfall: '切忌锋芒毕露夸夸其谈，防范因争风头而树立不必要的对立面',
    action: '少言多做，主动让利给合作方与一线执行者，厚德自能赢天下'
  },
  豫: {
    nature: '《豫》者乐也，雷出地奋，欢腾和乐顺时而动意气扬',
    spirit: '气势高昂、适逢动员的大好时机，利于顺应民心大步展开行动',
    pitfall: '切防沉迷于表面虚火与狂欢，警惕未雨绸缪不足而在狂欢后措手不及',
    action: '借势吹响冲锋号，但须在后台安排专人扎实紧盯资金与风控底线'
  },
  随: {
    nature: '《随》者顺也，泽中有雷，顺天应人随时而动借东风',
    spirit: '不可执拗于主观执念，此卦昭示「紧随真实风口与良师，顺势借力」',
    pitfall: '防范跟错人或被不良投机风气裹挟，切莫为一时小利迷失根本',
    action: '放下固有偏执，敏锐根据市场与对方的实际反馈灵活调整战术'
  },
  蛊: {
    nature: '《蛊》者乱也，山下有风，积弊日久生坏蠹必须整顿',
    spirit: '面对历史遗留的烂摊子，此卦昭示「先甲三日后甲三日，大破大立」',
    pitfall: '切忌粉饰太平或姑息养奸，拖延只会让毒瘤越积越深难以收拾',
    action: '拿出刮骨疗毒的魄力，彻查清理旧账与漏洞，出台全新的管理机制'
  },
  临: {
    nature: '《临》者大也，地泽临视，居高临下气势正盛渐入佳',
    spirit: '机运正步步逼近、势头强劲，利于亲临一线督导、大显身手',
    pitfall: '时刻警惕「至于八月有凶」，防范当前的火爆掩盖即将到来的周期性转冷',
    action: '亲自深入现场抓死细节交付，并提前制定淡季防衰预案'
  },
  观: {
    nature: '《观》者察也，风行地上，蔚为大观中正省察鉴人心',
    spirit: '此时宜静不宜动，此卦昭示「多看多听、深度调研、看清局势再定夺」',
    pitfall: '切忌走马观花盲目下注，防范被表面包装蒙蔽而忽略内在真实数据',
    action: '走访多位真实用户与一线老兵，全面摸清底层事实与真实意图'
  },
  噬嗑: {
    nature: '《噬嗑》者啮也，雷电交合，咬碎梗阻明罚敕法通途开',
    spirit: '事物面临硬性梗阻与卡点，此卦昭示「雷厉风行、依法合规坚决拔钉」',
    pitfall: '切忌优柔寡断和稀泥，拖泥带水只会让阻碍变本加厉',
    action: '对合同歧义、违规行为或关键卡点坚决亮出底线，快刀斩乱麻'
  },
  贲: {
    nature: '《贲》者饰也，山下有火，文饰锦绣质实为本白贲美',
    spirit: '包装与品牌形象能增色不少，此卦昭示「外修礼仪，根本仍须靠内功」',
    pitfall: '严防买椟还珠华而不实，切忌将全部精力投入表面营销而产品拉胯',
    action: '在做足体面宣发的同时，死磕底层服务质量，务实返纯'
  },
  剥: {
    nature: '《剥》者落也，山附于地，群阴剥阳基石松动势将倾',
    spirit: '外部大势处于下行侵蚀期，此卦昭示「不可强行逆势扩张，果断止损」',
    pitfall: '严禁抱侥幸心理加码下注，防范基础坍塌引发不可逆的惨重损失',
    action: '收缩所有边缘开支，保全最核心的骨干与火种（硕果不食），以守代攻'
  },
  复: {
    nature: '《复》者反也，雷在地中，一阳来复冬去春回生机萌',
    spirit: '最困难的寒冬已过，微弱的新转机正在底层萌芽，大势开始回暖',
    pitfall: '切莫刚见起色就急躁冒进，嫩苗禁不起折腾，严防拔苗助长重蹈覆辙',
    action: '沿着既定正确道路耐心培植，守好微小胜果，小步慢跑'
  },
  无妄: {
    nature: '《无妄》者诚也，天下雷行，自然真实不存侥幸顺天行',
    spirit: '光明磊落正道直行必获庇佑，此卦昭示「守真务实，忌走偏锋走捷径」',
    pitfall: '严防投机取巧或钻规则空子，但凡动半点歪心思必招飞来横祸',
    action: '堂堂正正以专业和诚意做人做事，恪守本分，不取非分之利'
  },
  大畜: {
    nature: '《大畜》者聚也，天在山中，刚健笃实涵养深厚蓄力宏',
    spirit: '所求之事前景宏大，然成败全在胸中积蓄，当下乃「深潜打底」之黄金期',
    pitfall: '切忌过早抛头露面或仓促变现，防范底蕴不足而半途露怯',
    action: '潜心打磨专业技能与产品护城河，储足弹药，蓄极而发自能跃登天衢'
  },
  颐: {
    nature: '《颐》者养也，山下有雷，观颐自养慎言节食修身心',
    spirit: '核心全在「自我养护与团队分配」，内外调和方能承受更大格局',
    pitfall: '谨防祸从口出与贪多嚼不烂，切忌无节制透支精力与资本储备',
    action: '理顺内部利益激励机制，谨言慎行，确保财务与身心节奏健康可持续'
  },
  大过: {
    nature: '《大过》者重也，泽灭木栋，横梁负重将倾急须减负',
    spirit: '承载的压力已逼近极限，此卦昭示「结构调整，主动卸荷，戒逞刚强」',
    pitfall: '切莫死要面子硬撑死扛，过度负荷一旦崩塌将无法挽回',
    action: '果断砍掉最沉重的负债与冗余项目，重构支点，轻装上阵'
  },
  坎: {
    nature: '《坎》者陷也，重重险水，波涛幽深行险而不失其信',
    spirit: '局势多遇险隘关卡，此卦昭示「行险守信、小步图稳、步步警惕」',
    pitfall: '切莫病急乱投医跳入新险滩，严防轻信虚假承诺导致连环中套',
    action: '守死财务与法律风控底线，步步为营，等水流平复再做进取'
  },
  离: {
    nature: '《离》者丽也，重明丽天，如火附柴薪依附借势照四方',
    spirit: '大势光明可期，但成败关键全在「借势附丽」——火无木柴不可孤燃',
    pitfall: '切忌单打独斗孤军突围，严防烈炎过盛导致资金链与精力无根空耗',
    action: '紧紧依附行业已有的成熟平台与优势渠道借船出海，借势生辉'
  },
  咸: {
    nature: '《咸》者感也，山泽通气，心意相通无心之感最为真',
    spirit: '人际交往或商业契合度极佳，此卦昭示「以诚换诚、虚怀受人」',
    pitfall: '切莫耍弄心机手段，防范因过分执着私利而破坏自然生发的信任',
    action: '坦诚敞开心扉与对方深入沟通，顺应彼此共鸣，水到渠成'
  },
  恒: {
    nature: '《恒》者久也，雷风相与，立不易方久于其道亨通长',
    spirit: '成败全在「耐得平淡、持之以恒」，长期主义方能建立不拔基业',
    pitfall: '最忌朝令夕改与三分钟热度，防范因短期未见暴利而频繁换道',
    action: '咬定核心方向不放松，制定长期坚持的标准作业流程并严格执行'
  },
  遁: {
    nature: '《遁》者退也，天下有山，见机知避远害全生退为上',
    spirit: '逆势渐显，此卦昭示「退避是保存主动权的最高智慧，见好就收」',
    pitfall: '切忌藕断丝连或逞强硬扛，拖泥带水必被拖入深渊泥潭',
    action: '果断抽身离场或收缩防守，保全资金与元气，待天时转好再谋复出'
  },
  大壮: {
    nature: '《大壮》者强也，雷在天上，声势刚烈羊触藩篱进退难',
    spirit: '自身实力虽强，但此卦警示「非礼弗履，戒逞刚暴，知止乃全」',
    pitfall: '切忌依仗优势蛮干冲撞规则，防范像公羊触篱一样进退两难陷入僵局',
    action: '收敛霸道作风，严格按照法律和行业公序良俗行事，知分寸懂礼让'
  },
  晋: {
    nature: '《晋》者进也，日出地上，光明昭彰顺理而上升阶荣',
    spirit: '正值上升黄金期，才华正被看见，此卦昭示「乘时借势、大方展现」',
    pitfall: '切莫因自卑怯懦而错失良机，亦防贪位冒进而遭同侪忌恨',
    action: '主动向上级或核心客户汇报真实成果，积极争取关键资源'
  },
  明夷: {
    nature: '《明夷》者伤也，日入地中，长夜幽暗内明外柔韬光隐',
    spirit: '正处至暗逆境，此卦昭示「学箕子之智，藏锋守正，晦迹远害」',
    pitfall: '切忌意气争锋或强出头，在暗箭丛生之时逞强必遭重创',
    action: '收起锋芒低调做人，暗中保全实力修身养性，耐心守候黎明拂晓'
  },
  家人: {
    nature: '《家人》者内也，风自火出，治家有道各安其位秩序明',
    spirit: '成败核心在内部大后方，此卦昭示「先理顺内部分工与规矩，外事自通」',
    pitfall: '防范祸起萧墙与后院起火，切莫在内部账目与权责不清时盲目对外铺开',
    action: '先坐下来开诚布公把团队内部利益机制与执行分工敲定清楚'
  },
  睽: {
    nature: '《睽》者违也，火上泽下，二女同居志向不同异中求',
    spirit: '立场观点存在温差分歧，此卦昭示「不可强求全同，只宜小事调谐」',
    pitfall: '切忌强行达成宏大协议，防范疑心生暗鬼导致矛盾激化',
    action: '搁置大争议，在双方皆认可的微小局部先尝试合作，求大同存小异'
  },
  蹇: {
    nature: '《蹇》者难也，山上有水，进退维谷见险而能止为吉',
    spirit: '前路已被险阻封堵，此卦昭示「见险而止，退步反安，反求诸己」',
    pitfall: '严禁硬着头皮撞南墙，盲目强冲只会陷得更深更惨',
    action: '立刻叫停原计划，向西南吉方或有经验的师友贵人借力求援，以迂为直'
  },
  解: {
    nature: '《解》者散也，雷雨交作，百果草木甲坼坚冰消融新',
    spirit: '长期的僵局即将打破，生机初显，此卦昭示「夙兴夜寐、速清余患」',
    pitfall: '最忌拖泥带水与优柔寡断，防范旧账未清导致好局再次陷入泥沼',
    action: '利索清结历史遗留问题，既往不咎，轻装上阵大步向前'
  },
  损: {
    nature: '《损》者减也，山下有泽，损下益上断舍离清保根本',
    spirit: '当前需要大魄力，此卦昭示「主动割舍次要枝节，让利于人换生机」',
    pitfall: '切忌贪大求全舍不得沉没成本，死抱不良资产只会拖垮整个大局',
    action: '果断砍掉亏损低效业务，主动让利给合作伙伴，舍车保帅'
  },
  益: {
    nature: '《益》者增也，风雷激荡，损上益下风调雨顺大有所',
    spirit: '得道多助的增益大成之象，此卦昭示「乘时进取，利人即是利己」',
    pitfall: '切忌贪得无厌独吞利益，防范因自私忘本招致天道人道反击',
    action: '把握难得窗口期大展宏图，将收益合理分润给团队，福禄共荣'
  },
  夬: {
    nature: '《夬》者决也，泽上于天，洪水决堤当断则断去隐患',
    spirit: '已到关键决断转折点，此卦昭示「光明正大、公开透明迅速决断」',
    pitfall: '当断不断反受其乱，严禁使用过激私暴手段，防狗急跳墙',
    action: '依据法律法规与合规章程，公开公正割除不良毒瘤，决不姑息'
  },
  姤: {
    nature: '《姤》者遇也，天下有风，意外邂逅见微知著防潜患',
    spirit: '偶遇诱人的新机会或新关系，此卦警示「切勿盲目全仓投入，防一阴消阳」',
    pitfall: '谨防甜蜜陷阱与表面热情，切莫在未经深查背景前轻信对方',
    action: '保持理性距离，以小试错深度尽调对方真实背景与财务状况'
  },
  萃: {
    nature: '《萃》者聚也，泽上于地，英华聚集同舟共济聚以正',
    spirit: '资源人脉正在汇聚，此卦昭示「立定共同愿景，严明防患于未然」',
    pitfall: '防范乌合之众各怀鬼胎与人浮于事，切忌缺少统一的纲领调度',
    action: '树立统一的精神旗帜与财务监管机制，选贤任能凝聚核心骨干'
  },
  升: {
    nature: '《升》者高也，地中生木，节节拔高积小成大顺时升',
    spirit: '步步登高的顺遂之卦，此卦昭示「脚踏实地，积少成多，前程似锦」',
    pitfall: '切莫妄图一步登天，防范脱离实际浮躁冒进破坏良好上升节奏',
    action: '按部就班扎实完成眼前的阶段任务，主动拜会提携自己的上层贵人'
  },
  困: {
    nature: '《困》者竭也，泽中无水，涸辙之鲋致命遂志熬寒冬',
    spirit: '处境艰难逼仄，此卦昭示「多言无益，唯有咬紧牙关守志待转」',
    pitfall: '切忌怨天尤人或病急乱投医，无谓挣扎只会更快耗尽仅存氧气',
    action: '彻底停掉无效消耗，保住最低生存底线，定心内省静候转机到来'
  },
  井: {
    nature: '《井》者养也，木上有水，改邑不改井修汲之道利民',
    spirit: '自身资源与才能本不贫乏，成败全在「理顺管道与变现路径」',
    pitfall: '防范临门一脚打烂水瓶（羸瓶之凶），严禁在最后交付环节掉以轻心',
    action: '全面排查销售通路、获客触点与交付链条，修通取水通道'
  },
  革: {
    nature: '《革》者变也，泽中有火，水火洗荡顺天应人去旧章',
    spirit: '旧模式已穷途末路，此卦昭示「下定决心大破大立，革故鼎新」',
    pitfall: '切莫抱残守缺修修补补，严防在改革方案尚未取得公信前仓促强推',
    action: '取得团队核心共识，发布明确的转型改制公告，全面拥抱新模式'
  },
  鼎: {
    nature: '《鼎》者新也，木上有火，化生成物正位凝命铸大器',
    spirit: '在破旧之后建立崭新基业，此卦昭示「选贤任能、稳固核心架构」',
    pitfall: '谨防任用非人导致「折足覆公餗」，切忌在核心岗位上安置不称职者',
    action: '重构顶层治理结构与品牌形象，重金延揽德才兼备的合伙人'
  },
  震: {
    nature: '《震》者动也，洊雷贯耳，震惊百里恐惧修省定心神',
    spirit: '突遇意外风波或震荡，此卦昭示「先定住心神不失主心骨，转危为安」',
    pitfall: '切忌惊慌失措自乱阵脚，防范在风暴中做出冲动盲目的灾难决策',
    action: '深呼吸定心安神，严守岗位职责，惊雷过后局势自会重归清明'
  },
  艮: {
    nature: '《艮》者止也，兼山叠峙，动静知止该止则止不妄行',
    spirit: '前路已被大山阻隔，此卦昭示「知止不殆，立刻踩刹车守住本分」',
    pitfall: '严禁撞向南墙，盲目冲锋必遭挫骨扬灰之重创',
    action: '全面叫停激进动作，退回自身阵地修养反省，守常以待来日'
  },
  渐: {
    nature: '《渐》者进也，山上有木，鸿渐于陆次序井然徐徐图',
    spirit: '事物进阶有其自然节奏，此卦昭示「次序重于速度，循序渐进」',
    pitfall: '切忌贪功冒进拔苗助长，防范因跳级抢跑留下致命基础隐患',
    action: '严格按照第一步、第二步的客观顺序稳扎稳打，从容铺垫'
  },
  归妹: {
    nature: '《归妹》者乱也，泽上有雷，情动少谋名分未正防后患',
    spirit: '开端建立在不成熟或冲动基础上，此卦警示「审慎审时，切莫草率定约」',
    pitfall: '严防名不正言不顺，切忌因一时感情或口头诱惑仓促签字落定',
    action: '暂缓签署排他协议，把名分、权责与长远法律责任逐条厘正'
  },
  丰: {
    nature: '《丰》者大也，雷电皆至，日丽中天声势盛大防转衰',
    spirit: '当下声势正处于顶点，此卦昭示「日中则昃，居安思危，未雨绸缪」',
    pitfall: '最忌盛气凌人盲目乐观，谨防被表面繁荣蒙蔽双眼而在退潮时裸泳',
    action: '趁着眼下声量与现金流高点多屯粮草，严密排查暗中损耗'
  },
  旅: {
    nature: '《旅》者羁也，山上有火，羁旅漂泊客地行事守本分',
    spirit: '身在客场或非主场环境，此卦昭示「低调敬慎、遵从客地礼俗」',
    pitfall: '切忌反客为主喧宾夺主，防范客地纷争招致焚巢断粮之祸',
    action: '凡事留三分余地，谦逊礼让，尽快在客地站稳脚跟安顿身心'
  },
  巽: {
    nature: '《巽》者入也，重风申命，柔顺坚韧无孔不入化坚冰',
    spirit: '不可用强力硬攻，此卦昭示「以柔克刚，反复渗透，春风化雨」',
    pitfall: '切忌刚愎急躁强加于人，防范过分卑屈丧失原则底线',
    action: '采取多轮次、柔和诚恳的当面沟通，小步试探耐心瓦解阻力'
  },
  兑: {
    nature: '《兑》者悦也，丽泽相资，朋友讲习言语和悦乐开局',
    spirit: '利于谈判、沟通与结交知己，此卦昭示「以正悦人，诚信开路」',
    pitfall: '谨防巧言令色与空头支票，切莫在欢谈中轻易许下无法兑现的诺言',
    action: '主动邀约核心关系人当面茶叙，以坦诚和幽默化解分歧促成共识'
  },
  涣: {
    nature: '《涣》者散也，风行水上，坚冰消散人心离析重聚神',
    spirit: '旧束缚虽已解散，但团队容易涣散，此卦昭示「立庙聚心，重立愿景」',
    pitfall: '防范团队各自为战人心涣散，切忌在关键时刻群龙无首',
    action: '召开全员核心会议，重申共同初心与利益分配方案，拧成一股绳'
  },
  节: {
    nature: '《节》者限也，泽上有水，立定规矩节制有度不伤民',
    spirit: '必须建立严明的纪律与预算红线，此卦昭示「规矩适度，张弛有方」',
    pitfall: '切忌过度严苛（苦节不可贞）导致怨声载道，亦防无底线放任',
    action: '立刻确立可落地的预算上限与交付考核标准，合情合理推行'
  },
  中孚: {
    nature: '《中孚》者信也，泽上有风，信及豚鱼至诚感通天地宽',
    spirit: '至诚可以通神明，此卦昭示「内外一如，言出必行，诚信立世」',
    pitfall: '严禁虚报浮夸或弄虚作假，但凡有一句虚言必致全盘信任崩塌',
    action: '哪怕承担短期损失也要坚决兑现承诺，以铁打的信誉赢得长久大市'
  },
  小过: {
    nature: '《小过》者微也，山上有雷，雀鸟低飞可小不可大过慎',
    spirit: '大动作当下难成，此卦昭示「宜下不宜上，专注于日常琐碎与细节打磨」',
    pitfall: '严禁启动宏图大计或越级硬冲，高飞盲跳必遭射落受创',
    action: '沉下心来处理眼前的细小报表、修补代码漏洞与文书勘误'
  },
  既济: {
    nature: '《既济》者定也，水火相济，初吉终乱事已大成慎始末',
    spirit: '表面看似大功告成，但危机已暗中滋生，此卦昭示「慎终如始，防范逆转」',
    pitfall: '最忌大意松懈坐享其成，防范「小狐濡尾」在收尾阶段功亏一篑',
    action: '打起十二分精神进行严苛复核验收，补齐收尾漏洞，严防翻车'
  },
  未济: {
    nature: '《未济》者续也，火在水上，事尚未竟小狐涉水慎终局',
    spirit: '距离胜利只有半步之遥，此卦昭示「审慎走好最后一着棋，大有希望」',
    pitfall: '越到终局越危险，谨防在最后关头放松警惕湿了尾巴前功尽弃',
    action: '戒骄戒躁，全神贯注盯紧最后交付环节，走稳每一步即见大吉'
  }
}

/**
 * 将卦德长句压成可读短注；优先贴近对应偈句用词
 * @param {number} [maxLen=28] 最长字数
 */
function compressEssence(text, fallback, hintLine, maxLen = 28) {
  if (!text) return fallback || '顺时而动'
  const limit = Math.max(12, maxLen || 28)
  let t = String(text)
    .replace(/《[^》]+》者[^，。；]*[，。；]?/g, '')
    .replace(/正如[^，。；]+[，。；]?/g, '')
    .replace(/此卦昭示「([^」]+)」[^，。；]*/g, '$1')
    .replace(/「([^」]+)」/g, '$1')
    .replace(/切忌|严禁|最忌/g, '忌')
    .replace(/务必|必须/g, '要')
    .replace(/\s+/g, '')
    .trim()
  const parts = t.split(/[，。；、——–−-]+/).map(p => p.trim()).filter(p => p.length >= 4)
  let pick = ''
  if (hintLine && parts.length) {
    const bigrams = []
    for (let i = 0; i < hintLine.length - 1; i++) {
      const bg = hintLine.slice(i, i + 2)
      if (!/[的之兮也于而与以莫最]/.test(bg)) bigrams.push(bg)
    }
    const scored = parts
      .map(p => ({ p, score: bigrams.filter(b => p.includes(b)).length }))
      .sort((a, b) => b.score - a.score || a.p.length - b.p.length)
    if (scored[0] && scored[0].score > 0) pick = scored[0].p
  }
  if (!pick) {
    const punch = parts.filter(p => p.length >= 6 && p.length <= limit)
    pick = punch.find(p => /宜|忌|在于|贵在|防范|莫|须|要|关键|借势|守|待/.test(p))
      || (punch.length ? punch[punch.length - 1] : '')
      || parts.find(p => /宜|忌|在于|贵在|防范|莫|须|要/.test(p))
      || parts[parts.length - 1]
      || parts[0]
      || t
  }
  // 过短则补上邻近分句，读起来才完整
  if (pick.length < 8) {
    const neighbor = parts.find(p => p !== pick && p.length >= 6 && p.length <= limit)
    if (neighbor) pick = `${pick}，${neighbor}`
  } else if (pick.length < 14) {
    const extra = parts.find(p => p !== pick && p.length >= 6 && p.length <= 18 && /宜|忌|关键|莫|须|要|借|守|待|防/.test(p))
    if (extra && (pick + extra).length <= limit + 4) pick = `${pick}，${extra}`
  }
  if (pick.length > limit) {
    const markers = ['导致', '从而', '以免', '以防']
    let cutAt = -1
    for (const m of markers) {
      const i = pick.indexOf(m)
      if (i >= 6 && i <= limit) { cutAt = i; break }
    }
    pick = cutAt > 0 ? pick.slice(0, cutAt) : pick.slice(0, limit)
    pick = pick.replace(/[与的和及于在，、]$/, '')
  }
  pick = pick.replace(/^[但然而故]/, '')
  return pick || fallback || '顺时而动'
}

/** 把卦德长句压成一句大白话 */
function toPlainSentence(text, fallback) {
  if (!text) return fallback || ''
  let t = String(text)
    .replace(/《[^》]+》者[^，。；]*[，。；]?/g, '')
    .replace(/正如[^，。；]+[，。；]?/g, '')
    .replace(/此卦昭示[「"]?([^」"]+)[」"]?[^，。；]*/g, '$1')
    .replace(/[「「]([^」」]+)[」」]/g, '$1')
    .replace(/成败关键(?:在于|全在)/g, '')
    .replace(/大势[^，。；]{0,12}[，。；]?/g, '')
    .replace(/千万不可|切莫|切忌|严禁|最忌/g, '别')
    .replace(/防范/g, '注意')
    .replace(/务必|必须/g, '要')
    .replace(/顺天应人|审时度势|顺应天机|知进知退|修德明理/g, '')
    .replace(/——+/g, '，')
    .replace(/\s+/g, '')
    .trim()
  const parts = t.split(/[，。；、——–−-]+/).map((p) => p.trim()).filter((p) => p.length >= 4)
  let pick = parts.find((p) => /别|要|宜|注意|先|再|借力|守|等|试|签|谈|查|停|缓|依附|合作|借力/.test(p) && p.length <= 36)
    || parts.find((p) => p.length >= 8 && p.length <= 36)
    || parts[0]
    || t
  pick = pick.replace(/^关键是+/, '').replace(/关键+/g, '关键')
  if (pick.length > 36) pick = pick.slice(0, 36).replace(/[与的和及于在，、]$/, '')
  return pick.replace(/^[，。、]/, '') || fallback || ''
}

/** 从卦象资料取一句白话依据/风险/行动 */
function essencePlainLine(cleanName, which) {
  const e = GUA_ESSENCE[cleanName]
  if (!e) return ''
  const src = which === 'why' ? e.spirit : which === 'risk' ? e.pitfall : which === 'how' ? e.action : e.nature
  return toPlainSentence(src, '')
}

/** 去掉解释里的套话标签与行话，统一成口语 */
function plainifyExplainText(text) {
  if (!text) return ''
  let t = String(text)
    .replace(/直断[：:\-—–\s]*/g, '')
    .replace(/何以见得[：:\-—–\s]*/g, '')
    .replace(/下一步[：:\-—–\s]*/g, '')
    .replace(/尤须戒[：:\-—–\s]*/g, '注意：')
    .replace(/本卦《[^》]+》，?取象[「"][^」"]+[」"]/g, '')
    .replace(/卦德[「"][^」"]+[」"]/g, '')
    .replace(/爻动化《[^》]+》，?事有转折/g, '卦有变化，后面可能转个弯')
    .replace(/六爻安静，?宜守常蓄力/g, '卦象较稳，宜按部就班')
    .replace(/象意[「"][^」"]+[」"]。?/g, '')
    .replace(/用神|应期|纳甲|世应/g, '')
    .replace(/[。；]{2,}/g, '。')
    .replace(/\s+/g, '')
    .trim()
  if (t.startsWith('，') || t.startsWith('。')) t = t.slice(1)
  return t
}

function plainifyExplainItems(items) {
  return (items || []).map((it) => ({
    quote: it.quote,
    text: plainifyExplainText(it.text)
  }))
}

/**
 * 偈语解释是否已与四句偈逐句对应（每句原文都出现在解释中）
 */
function isJiyuExplainAligned(jiyu, explain) {
  if (!explain || !Array.isArray(jiyu) || jiyu.length < 4) return false
  return jiyu.slice(0, 4).every(line => explain.includes(line))
}

/**
 * 从解释正文解析出「引句 + 短解」分段
 */
function parseJiyuExplainItems(explain, jiyu) {
  const items = []
  const re = /「([^」]{2,16})」\s*[：:]\s*([^\n]+)/g
  let m
  while ((m = re.exec(String(explain || '')))) {
    const text = m[2].replace(/^[—\-–\s]+/, '').replace(/[。；]+\s*$/, '').trim()
    if (text) items.push({ quote: m[1].trim(), text })
  }
  if (items.length >= 4) return items.slice(0, 4)

  // 按换行兜底：与四句偈顺序对齐
  if (Array.isArray(jiyu) && jiyu.length >= 4) {
    const lines = String(explain || '').split(/\n+/).map(l => l.trim()).filter(Boolean)
    if (lines.length >= 4) {
      return jiyu.slice(0, 4).map((quote, i) => {
        const raw = lines[i] || ''
        const text = raw
          .replace(new RegExp(`^[「"]?${quote}[」"]?[：:]\\s*`), '')
          .replace(/^[—\-–\s]+/, '')
          .replace(/[。；]+\s*$/, '')
          .trim() || raw
        return { quote, text }
      })
    }
  }
  return items
}

/**
 * 依据四句偈生成逐句解释：紧扣所问，给出明确答复、时间/方位与下一步
 */
function buildJiyuExplainItems(question, cast, benGuaName, tone, jiyu) {
  const intent = analyzeQuestionIntent(question)
  const cleanName = resolveGuaAlias(benGuaName)
  const benDetail = getGuaXiangjie(cleanName) || {}
  const benGuaci = getGuaCi(benGuaName) || getGuaCi(cleanName) || {}
  const bianRaw = (cast?.bian && cast.bian.name) || ''
  const bianAlias = resolveGuaAlias(bianRaw)
  const hasMove = !!(cast?.changingIndexes && cast.changingIndexes.length > 0)
  const lines = (Array.isArray(jiyu) && jiyu.length >= 4)
    ? jiyu.slice(0, 4)
    : generateDivinationJiyu(benGuaName, tone, question)

  const essence = GUA_ESSENCE[cleanName] || {
    nature: `《${benGuaName}》象天地运转、阴阳化合`,
    spirit: benDetail.theme ? `大势在于「${benDetail.theme}」` : '审时度势，顺应天机',
    pitfall: benDetail.zhan ? `防范「${benDetail.zhan[0] || '急躁冒进'}」` : '切忌轻举妄动',
    action: '坚守正道，以退为进'
  }

  const topic = intent.focus || intent.cleanTopic
  const timeStr = intent.timeFrame || ''
  const askMode = intent.askMode || 'outlook'
  const whyPlain = essencePlainLine(cleanName, 'why') || toPlainSentence(essence.spirit, '卦象提示先稳再动')
  const riskPlain = essencePlainLine(cleanName, 'risk') || '别贪快、别硬冲'
  const actionPlain = essencePlainLine(cleanName, 'how') || '先把眼前一件小事做到位'

  const place = resolvePlaceFromCast(cast)
  const yingqi = resolveYingqiFromCast(cast, tone, timeStr)
  const moveHint = hasMove && bianAlias && bianAlias !== cleanName
    ? '卦有变化，后面可能转个弯'
    : '卦象较稳，宜按部就班'

  // 第一句：直接回答所问
  let line1 = ''
  if (askMode === 'where' || intent.category === 'place') {
    line1 = place
      ? `你要找的方位，多半在${place}一带，先去那边找最靠谱。`
      : `方位信号不够清楚，暂时别只盯一个地方。`
  } else if (askMode === 'when') {
    line1 = yingqi.endsWith('。') ? yingqi : `${yingqi}。`
  } else if (askMode === 'yesno') {
    line1 = tone === 'good'
      ? `就你问的「${topic}」，卦象看可以推进，值得一试。`
      : tone === 'bad'
        ? `就你问的「${topic}」，卦象看先别急着上，缓一缓或换路子更稳。`
        : `就你问的「${topic}」，目前吉凶各半，适合先小范围试一下再定。`
  } else if (askMode === 'how') {
    line1 = `关于「${topic}」，第一步可以先：${actionPlain}。`
  } else {
    line1 = tone === 'good'
      ? `你问的「${topic}」，整体偏顺，可以推进。`
      : tone === 'bad'
        ? `你问的「${topic}」，眼下阻力偏大，先守再看更稳妥。`
        : `你问的「${topic}」，吉凶各半，宜稳扎稳打。`
  }

  // 第二句：为什么这么看
  const whySay = whyPlain || '卦象提示先看清局面再动手'
  const line2 = `之所以这么看，是因为${whySay.endsWith('。') ? whySay.slice(0, -1) : whySay}。`

  const riskSay = (riskPlain || '别贪快、别硬冲').replace(/^这卦提醒/, '')

  // 第三句：时间/方位/风险
  let line3 = ''
  if (askMode === 'where' || intent.category === 'place') {
    line3 = place
      ? `${moveHint}。重点查${place}，再向旁边相邻方向扩展；${riskSay}。`
      : `${moveHint}。先回到最后出现的地方和动线回溯；${riskSay}。`
  } else if (askMode === 'when') {
    line3 = `${moveHint}。${yingqi.replace(/。$/, '')}；这阶段${riskSay.startsWith('别') ? riskSay : `注意${riskSay}`}。`
  } else if (timeStr) {
    line3 = `${moveHint}。${yingqi.replace(/。$/, '')}；这阶段${riskSay.startsWith('别') ? riskSay : `注意${riskSay}`}。`
  } else {
    line3 = `${moveHint}。若问何时，${yingqi.replace(/。$/, '')}；${riskSay.startsWith('别') ? riskSay : `注意${riskSay}`}。`
  }
  if (!line3.endsWith('。')) line3 += '。'

  // 第四句：下一步怎么做
  let line4 = ''
  if (askMode === 'where' || intent.category === 'place') {
    line4 = place
      ? `先去${place}方向实地找一圈，找不到再扩到相邻方位，别漫无目的乱翻。`
      : `先沿最后动线往回找，别凭感觉只盯一个点。`
  } else if (askMode === 'when') {
    line4 = `按上面时间窗口排期，窗口外别硬推；先做一件能马上验证的小动作试水。`
  } else if (tone === 'bad') {
    line4 = `先暂停主攻，改为：${actionPlain}；把「${topic}」拆成小步，试完再决定要不要继续。`
  } else {
    const act = (actionPlain || '先把眼前一件小事做到位').replace(/^这卦提醒/, '')
    line4 = `接下来就做这一件：${act}；专攻「${topic}」，别同时铺太多线。`
  }
  if (!line4.endsWith('。')) line4 += '。'

  return plainifyExplainItems([
    { quote: lines[0], text: line1 },
    { quote: lines[1], text: line2 },
    { quote: lines[2], text: line3 },
    { quote: lines[3], text: line4 }
  ])
}

function formatJiyuExplain(items) {
  return (items || []).map(it => `「${it.quote}」：${it.text}`).join('\n')
}

/**
 * 依据四句偈逐句生成简明解释，与偈文一一对应
 */
function generateConcreteAnswer(question, cast, benGuaName, tone, jiyu) {
  return formatJiyuExplain(buildJiyuExplainItems(question, cast, benGuaName, tone, jiyu))
}

/**
 * 判断解释是否真正在回答所问（避免答非所问）
 */
function explainAnswersQuestion(explain, question) {
  if (!explain || !question) return false
  const intent = analyzeQuestionIntent(question)
  const raw = String(question)
  const topic = String(intent.cleanTopic || intent.focus || '')
  const core = raw
    .replace(/[吗呢吧呀？\?！!。，、：:；;]/g, '')
    .replace(/(能不能|是否合适|是否可以|好不好|会怎样|如何|怎么样|能否顺利|成不成|可以吗|可否|行不行|什么时候|何时|哪里|哪儿|哪个方向)/g, '')
  const chunks = new Set()
  const addChunks = (s) => {
    const t = String(s || '').trim()
    if (t.length < 2) return
    for (let i = 0; i <= t.length - 2; i++) chunks.add(t.slice(i, i + 2))
  }
  addChunks(topic)
  addChunks(core.slice(0, 16))
  if (intent.timeFrame) addChunks(intent.timeFrame)
  let hits = 0
  chunks.forEach((c) => { if (explain.includes(c)) hits += 1 })
  if (topic && explain.includes(topic)) return true
  if (intent.askMode === 'where' && /东|南|西|北|方位/.test(explain)) return hits >= 1
  if (intent.askMode === 'when' && /日|月|旬|应期|近几|窗口/.test(explain)) return hits >= 1
  return hits >= 2
}

/**
 * 从 AI 文本宽松抽取四句偈（避免格式稍偏就整段被本地套诗替换）
 */
function extractJiyuLines(content) {
  if (!content) return []
  const cleaned = cleanAiMarkdown(content)
  let lines = cleaned.split(/\n+/)
    .map((l) => cleanAiMarkdown(l).replace(/^[0-9一二三四\.\、\-\s]+/g, '').replace(/[。！？]/g, '').trim())
    .filter((l) => l.length >= 5 && l.length <= 20)
  if (lines.length >= 4) return lines.slice(0, 4)

  const compact = cleaned.replace(/\s+/g, '').replace(/[“”"']/g, '')
  const sevens = compact.match(/[\u4e00-\u9fff]{5,8}/g) || []
  if (sevens.length >= 4) return sevens.slice(0, 4)
  return lines.slice(0, 4)
}

/**
 * 把 AI 解释整理成与四句偈对应的条目，尽量保留 AI 原文，不改写其判断
 */
function structureExplainAgainstJiyu(explain, jiyu) {
  const aligned = parseJiyuExplainItems(explain, jiyu)
  if (aligned.length >= 4) return aligned

  const parts = String(explain || '').split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 4 && Array.isArray(jiyu) && jiyu.length >= 4) {
    return jiyu.slice(0, 4).map((quote, i) => ({
      quote,
      text: parts[i].replace(/^「[^」]+」\s*[：:]\s*/, '').replace(/^[—\-–\s]+/, '').trim() || parts[i]
    }))
  }

  const sents = String(explain || '')
    .split(/[。！？\n]+/)
    .map((s) => s.replace(/^「[^」]+」\s*[：:]\s*/, '').trim())
    .filter((s) => s.length >= 6)
  if (sents.length >= 4 && Array.isArray(jiyu) && jiyu.length >= 4) {
    return jiyu.slice(0, 4).map((quote, i) => ({
      quote,
      text: /[。！？]$/.test(sents[i]) ? sents[i] : `${sents[i]}。`
    }))
  }
  return aligned
}

/**
 * 解析大模型返回的结构化文本
 */
function parseAiDivinationOutput(text, question, cast) {
  if (!text) throw new Error('AI返回内容为空')

  const parsed = {
    summary: '',
    judgment: '',
    directAnswer: '',
    jiyu: [],
    jiyuExplain: '',
    guaExplain: '',
    yongshen: '',
    yingqi: '',
    advice: '',
    raw: text
  }

  // 提取各部分
  const parts = text.split(/###?\s*【/g)
  parts.forEach(part => {
    if (part.startsWith('神机四句偈】') || part.startsWith('趋吉避凶 · 神机四句偈】') || part.startsWith('神机偈语】') || part.startsWith('四句偈语】')) {
      const jiyuContent = cleanAiMarkdown(part.replace(/^(趋吉避凶 · 神机四句偈|神机四句偈|神机偈语|四句偈语)】\s*/, '').trim())
      const jiyuLines = extractJiyuLines(jiyuContent)
      if (jiyuLines.length >= 4) {
        parsed.jiyu = jiyuLines.slice(0, 4)
      }
    } else if (part.startsWith('偈语解释】') || part.startsWith('偈语解意】') || part.startsWith('切问切题 · 针对答复】') || part.startsWith('针对答复】') || part.startsWith('直断事宜') || part.startsWith('具体指引】')) {
      parsed.jiyuExplain = cleanAiMarkdown(part.replace(/^(偈语解释 · 趋吉避凶|偈语解释|偈语解意|切问切题 · 针对答复|针对答复|直断事宜 · 具体指引|直断事宜|具体指引)】\s*/, '').trim())
    } else if (part.startsWith('卦象解释】') || part.startsWith('卦象阐释】') || part.startsWith('用神与爻象探微】') || part.startsWith('卦象分析】')) {
      parsed.guaExplain = cleanAiMarkdown(part.replace(/^(卦象解释 · 易理象数|卦象阐释|卦象解释|用神与爻象探微|卦象分析)】\s*/, '').trim())
    } else if (part.startsWith('神机总断】')) {
      const content = cleanAiMarkdown(part.replace(/^神机总断】\s*/, '').trim())
      const lines = content.split('\n').map(l => cleanAiMarkdown(l).trim()).filter(Boolean)
      parsed.summary = cleanAiMarkdown(lines[0] || '大成卦象 · 天机显现')
      if (!parsed.guaExplain) parsed.guaExplain = cleanAiMarkdown(lines.slice(1).join('\n') || content)
    } else if (part.startsWith('机运演进与应期】')) {
      parsed.yingqi = cleanAiMarkdown(part.replace(/^机运演进与应期】\s*/, '').trim())
    } else if (part.startsWith('周易明理 · 趋吉避凶】')) {
      parsed.advice = cleanAiMarkdown(part.replace(/^周易明理 · 趋吉避凶】\s*/, '').trim())
    }
  })

  // 判断倾向色调
  let tone = 'mid'
  if (text.includes('大吉') || text.includes('亨通') || text.includes('顺畅') || text.includes('大有可为') || text.includes('佳境')) {
    tone = 'good'
  } else if (text.includes('凶') || text.includes('受阻') || text.includes('险陷') || text.includes('退守') || text.includes('多险')) {
    tone = 'bad'
  }

  const benGuaName = cast?.ben?.name || '大成卦'
  const hadAiJiyu = !!(parsed.jiyu && parsed.jiyu.length >= 4)
  const hadAiExplain = !!(parsed.jiyuExplain && parsed.jiyuExplain.trim())
  const aiExplainOnTopic = hadAiExplain && explainAnswersQuestion(parsed.jiyuExplain, question)

  // 1. 四句偈：优先保留 AI 专为所问写的偈；仅缺失时才本地补
  if (!hadAiJiyu) {
    parsed.jiyu = generateDivinationJiyu(benGuaName, tone, question)
  }

  // 2. 解释：优先保留 AI 对所问的理解；仅空缺或明显跑题时才本地重写
  let jiyuExplainItems = []
  if (aiExplainOnTopic) {
    jiyuExplainItems = structureExplainAgainstJiyu(parsed.jiyuExplain, parsed.jiyu)
    if (jiyuExplainItems.length >= 4) {
      parsed.jiyuExplain = formatJiyuExplain(jiyuExplainItems)
    } else {
      // AI 正文在题，但格式松散：原样保留，按行尽量分段
      const loose = String(parsed.jiyuExplain).split(/\n+/).map((s) => s.trim()).filter(Boolean)
      jiyuExplainItems = (parsed.jiyu || []).slice(0, 4).map((quote, i) => ({
        quote,
        text: (loose[i] || loose[0] || parsed.jiyuExplain).replace(/^「[^」]+」\s*[：:]\s*/, '')
      }))
    }
  } else {
    jiyuExplainItems = buildJiyuExplainItems(question, cast, benGuaName, tone, parsed.jiyu)
  }
  jiyuExplainItems = plainifyExplainItems(jiyuExplainItems)
  parsed.jiyuExplain = formatJiyuExplain(jiyuExplainItems)
  parsed.directAnswer = parsed.jiyuExplain

  // 3. 不再单独输出卦象解释；象理已融入偈语解释
  parsed.guaExplain = ''
  parsed.judgment = parsed.jiyuExplain

  if (!parsed.summary) {
    parsed.summary = tone === 'good' ? '大势偏顺，可顺势推进' : (tone === 'bad' ? '大势偏阻，先稳再看' : '吉凶各半，宜稳扎稳打')
  }

  const sections = [
    {
      title: '一、神机四句偈',
      items: parsed.jiyu
    },
    {
      title: '二、偈语解释 · 卦象直断',
      items: jiyuExplainItems.map(it => `「${it.quote}」：${it.text}`)
    }
  ]

  return {
    source: 'ai_online',
    question,
    tone,
    tendency: { tone },
    summary: parsed.summary,
    jiyu: parsed.jiyu,
    jiyuExplain: parsed.jiyuExplain,
    jiyuExplainItems,
    guaExplain: '',
    directAnswer: parsed.jiyuExplain,
    judgment: parsed.jiyuExplain,
    yongshen: parsed.yongshen || '',
    yingqi: parsed.yingqi || '',
    advice: parsed.advice || '',
    sections,
    fullText: text
  }
}

/**
 * 智能象数离线理数推演引擎（当网络断开或用户未配置有效API Key时的全自动周易大师算法）
 */
function buildIntelligentFallbackInterpretation(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  const benGuaName = cast?.ben?.name || '乾为天'

  // 分析卦象动静
  const hasMove = !!(cast?.changingIndexes && cast.changingIndexes.length > 0)

  // 判定吉凶大势（依据周易64卦深层卦性体系精准匹配别名与全名）
  const cleanAlias = resolveGuaAlias(benGuaName)
  const BAD_GUAS = ['坎', '蹇', '困', '明夷', '剥', '讼', '大过', '否', '归妹']
  const MID_GUAS = ['需', '屯', '蒙', '蛊', '损', '复', '大畜', '小畜', '颐', '艮', '小过', '随', '履', '噬嗑', '革', '鼎', '涣', '节', '中孚', '未济']

  let tone = 'good'
  let summary = '大势偏顺，可顺势推进'
  if (BAD_GUAS.includes(cleanAlias)) {
    tone = 'bad'
    summary = '大势偏阻，先稳再看'
  } else if (MID_GUAS.includes(cleanAlias)) {
    tone = 'mid'
    summary = '吉凶各半，宜稳扎稳打'
  }

  // 1. 置顶四句神机诗偈
  const jiyu = generateDivinationJiyu(benGuaName, tone, question)

  // 2. 偈语解释：卦象融入四句，不再另开卦象专段
  const jiyuExplainItems = buildJiyuExplainItems(question, cast, benGuaName, tone, jiyu)
  const jiyuExplain = formatJiyuExplain(jiyuExplainItems)

  const sections = [
    {
      title: '一、神机四句偈',
      items: jiyu
    },
    {
      title: '二、偈语解释 · 卦象直断',
      items: jiyuExplainItems.map(it => `「${it.quote}」：${it.text}`)
    }
  ]

  const fullText = [
    summary,
    `【神机四句偈】\n${jiyu.join('\n')}`,
    `【偈语解释 · 卦象直断】\n${jiyuExplain}`
  ].join('\n\n')

  return {
    source: 'fallback',
    question: question || '综合运程',
    tone,
    tendency: { tone },
    summary,
    jiyu,
    jiyuExplain,
    jiyuExplainItems,
    guaExplain: '',
    directAnswer: jiyuExplain,
    judgment: jiyuExplain,
    yongshen: '',
    yingqi: hasMove ? '近几天到本月内可能有转机' : '宜按月推进，别急于求成',
    advice: '守住本分，按上面建议一步步做。',
    sections,
    fullText
  }
}

/**
 * 统一解卦对外接口（自动尝试在线大模型API，遇阻平滑降级至智能象数算法，确保100%可靠）
 */
async function interpretWithAi(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  try {
    return await callAiDivinationApi({ question, cast })
  } catch (err) {
    console.warn('AI API 调用受阻，自动启用本地智能理数神机推演:', err.message)
    return buildIntelligentFallbackInterpretation({ question, cast })
  }
}

module.exports = {
  cleanAiMarkdown,
  analyzeQuestionIntent,
  buildDivinationPrompt,
  callAiDivinationApi,
  interpretWithAi,
  buildIntelligentFallbackInterpretation,
  generateDivinationJiyu,
  generateConcreteAnswer,
  buildJiyuExplainItems,
  parseJiyuExplainItems,
  parseAiDivinationOutput,
  explainAnswersQuestion,
  plainifyExplainText,
  plainifyExplainItems
}
