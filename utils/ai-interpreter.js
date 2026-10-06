/**
 * 周易 AI 算卦解卦核心引擎
 * 负责将用户问题与纳甲六爻全量排盘数据转化为专业神机 Prompt，
 * 调度大模型 API 进行深度义理象数推演，并提供高水准的结构化断语与智能理数兜底。
 */

const { getAiConfig } = require('./ai-config')
const { getGuaCi } = require('../data/guaci')

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
      keyDilemma: '知常明变与审时度势'
    }
  }

  // 1. 抽取时间窗口
  let timeFrame = ''
  const timeMatch = q.match(/(今年下半年|今年上半年|下半年|上半年|今年年底|年底|明年|下个月|本月|近期|眼下|当下|未来三年|未来五年|这几天|未来半年|秋天|冬天|春天|夏天)/)
  if (timeMatch) {
    timeFrame = timeMatch[1]
  }

  // 2. 识别问事分类与动作标的
  let category = 'general'
  let actionVerb = '谋划行进'
  let targetNoun = '所测事宜'
  let keyDilemma = '把握机先与化解阻滞'

  if (/拓|辟|进军|新市场|新赛道|业务|获客|扩张|新项目/.test(q)) {
    category = 'expand'
    actionVerb = '开拓进取'
    targetNoun = '开拓新市场业务'
    keyDilemma = '外围获客与内部资金链防守'
  } else if (/合伙|合作|入股|搭伙|股份|分红/.test(q)) {
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

  // 提取用户问句的核心标的，过滤掉“能不能”、“是否合适”等提问词
  let cleanTopic = q
    .replace(/[吗呢吧呀？\?！!]/g, '')
    .replace(/(能不能|是否合适|是否可以|好不好|会怎样|如何|怎么样|能否顺利|成不成|可以吗|可否|行不行)/g, '')
    .trim()

  if (!cleanTopic) cleanTopic = targetNoun || '所测事宜'

  return {
    isEmpty: false,
    raw: q,
    cleanTopic,
    timeFrame,
    category,
    actionVerb,
    targetNoun: targetNoun || cleanTopic,
    keyDilemma
  }
}

/**
 * 构建发送给大模型的周易神机 Prompt
 */
function buildDivinationPrompt(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  const intent = analyzeQuestionIntent(question)

  const systemPrompt = `你是一位精通《周易》、《京房易传》、《卜筮正宗》、《增删卜易》与宋代理学义理的当代周易象数大师与心法导师。
问卦者向你呈上了心中关切的具体疑难，以及刚刚依据大衍蓍法/金钱课所得的纳甲六爻排盘。
请你以高深、典雅、透彻、通情达理的文风，为问卦者抽丝剥茧地推演卦象天机。

【问事深度解构与聚焦靶向要求（重中之重，严禁泛泛而谈）】：
1. 【精准锚定真实事务，拒绝万能套话】：
   - 问测核心标的：【${intent.cleanTopic}】
   - 时间跨度：【${intent.timeFrame || '当前阶段'}】
   - 核心考量：【${intent.keyDilemma}】
   大师断卦必须全神贯注于「${intent.cleanTopic}」这一具体真实生活/商业情境，字字扣准该事务的具体环节（资金流、客户开拓、同侪竞争、考核文书、合伙合同、情感心结等）。严禁输出换在其他事情上也能讲得通的空泛套话！
2. 【神机四句偈，居首量身定赋】：
   必须为问卦者关切的「${intent.cleanTopic}」专赋七言绝句一首（共4句，每句7字，共28字）。
   诗偈必须深嵌该事务的特定意象（如拓荒辟土、文曲折桂、商海淘金、情海连理等），言浅意深，工整押韵，专门指引问卦者在现实中如何「趋吉避凶」、定心成事。
3. 【偈语解释，靶向直断】：
   紧扣「${intent.cleanTopic}」深入解读四句诗偈的玄机：
   - 开篇第一句即对该事作出鲜明定性（可不可为、顺逆几何、胜算利弊）；
   - 结合问测的时间跨度（如「${intent.timeFrame || '当下'}」），正面剖析事情推进的关键节点与转机时令；
   - 明确指出该具体事务最大的隐性风险点（人际合作、财务成本、心态盲点等），并给出最核心的一条【当下破局先手策略】。
4. 【卦象解释，理数相扣】：
   精炼阐明本卦、变卦、用神与动爻之易理象数。精准指出该事在盘中对应何爻为用神、动静化象如何、如何以易理修德知止。
5. 【纯正文风，绝无技术痕迹】：通篇必须纯以易学宗师太史令的身份作答，严禁出现任何“AI”、“人工智能”、“大模型”、“算法提示”、“计算机”等现代词汇。
6. 【排版禁忌，严禁星号】：通篇绝对禁止输出任何 Markdown 星号（严禁出现 ** 加粗、严禁出现 * 列表符号或任何形式的星号），所有强调、重点字句请直接使用中文方头括号【】或书名号《》。

【请严格按如下三部分输出，结构精炼，层次分明】：
### 【神机四句偈】
（依卦理与所测事宜专赋七言四句诗偈，朗朗上口，言浅意深，每行一句，共四句，共28字）

### 【偈语解释】
（解读四句诗偈玄机，紧扣问卦者所测事宜给出相对具体的回答与趋吉避凶指引：可否成事、成败关键、人际/合同防范与当下行动策略）

### 【卦象解释】
（精练阐释本卦、变卦与动爻用神之易理象数，说明局势走向与易道修身处事之方）`

  const userPrompt = `问卦者呈上的具体困惑与所求之事：
「${question || '未注明具体事由，请就卦象吉凶作综合研判'}」

请大师务必将整场推演【深度定焦】于「${intent.cleanTopic}」！
紧扣其时间节奏（${intent.timeFrame || '近期'}）与核心矛盾（${intent.keyDilemma}），为问卦者开示天机神意。

当前筮得纳甲六爻盘面如下：
${formatCastForPrompt(cast)}`

  return { systemPrompt, userPrompt }
}

/**
 * 调用 AI 大模型 API 进行解卦
 */
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
    temperature: config.temperature || 0.7,
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
      signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined
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
 * 依据卦名、吉凶势态与所测问题，生成专属的四句趋吉避凶绝句偈语
 */
function generateDivinationJiyu(benGuaName, tone, question) {
  const intent = analyzeQuestionIntent(question)
  const cleanName = (benGuaName || '').replace(/为[天地水火山风雷泽]/g, '')

  // 1. 如果提问具有明确领域特征，优先给专属定制诗偈，更加切题聚焦
  if (intent.category === 'expand') {
    if (tone === 'good') {
      return ['扬帆踏浪辟新程', '天相吉星四海清', '最贵谋深防浪险', '步全根固自风行']
    } else if (tone === 'bad') {
      return ['关山涉远路犹偏', '莫向荒原拓险滩', '且敛锋芒修本固', '待时乘势步从宽']
    }
    return ['开拓图新莫急攀', '深耕一域度重关', '量材用度全周密', '云起风来上泰山']
  }

  if (intent.category === 'partner') {
    if (tone === 'good') {
      return ['同心合德利通津', '相照肝胆见诚真', '白纸明书无猜忌', '共赢风浪展经纶']
    } else if (tone === 'bad') {
      return ['同床异梦暗藏刀', '财利分张起浪涛', '莫信虚言轻托付', '早抽身手免徒劳']
    }
    return ['合伴同行且审详', '先明权责后图张', '公私分际清如水', '免使嫌生两断肠']
  }

  if (intent.category === 'career_switch') {
    if (tone === 'good') {
      return ['乘时变轨步青云', '下里明堂正待君', '果决前行休顾虑', '一朝借力建新勋']
    } else if (tone === 'bad') {
      return ['林暗风高莫弃枝', '空仓盲跳陷泥池', '安心守拙磨利刃', '春暖花开再待时']
    }
    return ['去留进退费思量', '未可轻离旧主场', '且把身家筹算定', '东风忽起再扬航']
  }

  if (intent.category === 'study') {
    if (tone === 'good') {
      return ['蟾宫折桂路非遥', '文运腾升气象高', '细理偏枯除隐患', '一朝金榜领风骚']
    } else if (tone === 'bad') {
      return ['寒窗苦志待春开', '莫为浮名乱步台', '查漏补缺深下力', '来时一举越金阶']
    }
    return ['读书穷理定心神', '戒躁防虚下苦因', '磨得胸中冰雪净', '天公终不负苦人']
  }

  if (intent.category === 'love_reconcile') {
    if (tone === 'good') {
      return ['历尽风波重拾温', '心扉敞处解疑痕', '宽容莫再翻陈账', '珍重当前月满门']
    } else if (tone === 'bad') {
      return ['覆水难收莫强牵', '残灯明灭结愁眠', '不如放手修宁静', '转角青山有善缘']
    }
    return ['情丝剪乱意如麻', '各自回头静看花', '冷暖随缘休执念', '心安何处不天涯']
  }

  // 2. 通用经典 64 卦诗偈库匹配
  if (GUA_JIYU_MAP[cleanName]) {
    return GUA_JIYU_MAP[cleanName]
  }
  for (const k of Object.keys(GUA_JIYU_MAP)) {
    if (cleanName.includes(k) || k.includes(cleanName)) {
      return GUA_JIYU_MAP[k]
    }
  }

  if (tone === 'good') {
    return ['天心顺遂好乘舟', '动变相生利道周', '得意莫忘持戒慎', '宽怀容物自优游']
  }
  if (tone === 'bad') {
    return ['关山万叠水流迟', '莫向穷途踏浪危', '退避守正修内省', '暗流过后现朝晖']
  }
  return ['阴阳代谢有恒程', '暂耐风霜莫急行', '待等春雷破残夜', '一朝昂首跃青溟']
}

/**
 * 依据问测事宜与卦爻机变，生成极度聚焦、切中痛点、直指事由的答复与策略
 */
function generateConcreteAnswer(question, cast, benGuaName, tone) {
  const intent = analyzeQuestionIntent(question)
  const hasMove = !!(cast?.changingIndexes && cast.changingIndexes.length > 0)
  const timeDesc = intent.timeFrame ? `【时间节律 · ${intent.timeFrame}】：` : '【时间节律】：'

  let directVerdict = ''
  let keyRisk = ''
  let timeSchedule = ''
  let firstAction = ''

  if (intent.category === 'expand') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，天时与气数相助，向外拓展新版图、开拓新市场大势向好，可行性极高，利于主动出击。`
      keyRisk = `【核心痛点与风险防范】：切莫因为前景看好而粗放铺摊。当前最核心防范点在于「获客成本超支」与「战线拉长导致后方现金流承压」。${hasMove ? '盘中有动爻翻转，提示在新市场签约合作中务必白纸黑字划清权责与回款周期，严防拖欠或合作方甩手。' : '静卦利于持重，切忌同时多点开花，宜聚焦单一杀手级突破口。'}`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」内，` : ''}前段以低成本试错、样板客户验证为主；中后段待模式跑通再集中资源规模放量，切勿在起步阶段就重资产压注。`
      firstAction = `【当下第一步破局先手】：本周内即刻厘清「新市场首批种子客户画像」与「严格预算止损线」，先小步快跑跑通闭环，再图全面推进。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，外部险阻重重，当前强行跨界或大举开拓新市场易陷「进退两难、水土不服」之泥潭，目前非大张旗鼓之吉时。`
      keyRisk = `【核心痛点与风险防范】：外部环境存在隐性壁垒或同侪恶性低价拦截，且自身准备尚未扎实。盲目投入极易造成资金空转折损。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」期间，` : ''}切忌硬碰硬。宜将重心放在守稳既有基本盘、收缩非必要开支上，待外部阻力明朗化再做定夺。`
      firstAction = `【当下第一步破局先手】：立刻叫停重资产投入计划，重新审视可行性论证，先排除潜藏的合规与资金漏洞。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，事物正处于酝酿蓄势阶段。开拓之举成败参半，关键不在外部风口，而在自身护城河是否坚固。`
      keyRisk = `【核心痛点与风险防范】：切忌因同行焦虑而盲动跟风，防范因轻信口头承诺而仓促上马。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」之中，` : ''}宜采取「侦察兵策略」，以极小代价在边缘做探索，静观市场反馈。`
      firstAction = `【当下第一步破局先手】：找两位该领域的资深行家当面深度摸底，补齐信息差后再出方案。`
    }
  } else if (intent.category === 'partner') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦世应相生，合伙共事有相辅相成之象，各展所长能成合力。`
      keyRisk = `【核心痛点与风险防范】：合伙之大忌在于「亲兄弟明算账未落纸面」。必须提前把退出机制、增资规则、股权表决权和财务透明制度签定成法定文书，杜绝日后人情撕扯。`
      timeSchedule = `${timeDesc}合作起步期彼此激情尚在，关键看半年磨合期。`
      firstAction = `【当下第一步破局先手】：把双方出资、分工与最坏情况下的散伙退出协议白纸黑字写定。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦兄弟爻动克财星，或世应相克，此番合伙暗藏嫌隙与利益纷争，极大可能同床异梦。`
      keyRisk = `【核心痛点与风险防范】：防范权责不清、出资不对等，以及后期对方擅自挪用资源或甩锅推诿。`
      timeSchedule = `${timeDesc}短期看似热闹，一旦遇到利益分配或亏损分担立刻见真章。`
      firstAction = `【当下第一步破局先手】：谨慎注资，绝不代持或口头协议，尽可能保留随时可抽身的风控底线。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：合伙之事尚欠火候，双方对生意的预期与付出度存在温差。`
      keyRisk = `【核心痛点与风险防范】：沟通尚未充分，底层商业逻辑还需反复推敲。`
      timeSchedule = `${timeDesc}暂不宜签署长线排他合同，宜以单个项目短期试水。`
      firstAction = `【当下第一步破局先手】：就最核心的财务分配与亏损承担方式展开一次开诚布公的面对面推演。`
    }
  } else if (intent.category === 'career_switch') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦官印相生，职场变轨顺应天时，下家有更广阔空间或能遇得力上级，利于动变。`
      keyRisk = `【核心痛点与风险防范】：切忌裸辞！必须拿到具有法律效力的正式 Offer 且薪酬考核条款明确后再提离职，防范过渡期口头协议落空。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」内，` : ''}抓住金九银十或月令相生之季迅速办结交接，不宜拖泥带水。`
      firstAction = `【当下第一步破局先手】：全面优化履历与实操背调成果，低调行进，未成行前在原单位绝不走漏风声。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦世爻入墓或官鬼相克，当下职场大环境存在虚高陷阱，盲目跳槽容易「出狼窝又入虎穴」。`
      keyRisk = `【核心痛点与风险防范】：新坑的实际工作强度与待遇可能严重低于面试承诺，且试用期风险极高。`
      timeSchedule = `${timeDesc}眼下宜骑马找马、蓄力藏拙，切勿冲动意气用事。`
      firstAction = `【当下第一步破局先手】：在原单位稳住基本薪资与业绩留痕，利用业余时间考证补强核心竞争力。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：换与不换在伯仲之间，外部机会虽有但并无质的飞跃。`
      keyRisk = `【核心痛点与风险防范】：避免因一时受气而冲动决定，核心看新平台能否带来不可替代的经验积累。`
      timeSchedule = `${timeDesc}建议多看两到三家机会横向对比，不急于本周做决断。`
      firstAction = `【当下第一步破局先手】：列出当前工作的真实痛点与下家公司的硬性指标清单，做理性权衡。`
    }
  } else if (intent.category === 'study') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦父母爻旺相生世，文星拱照，应试登科胜算极高，大有上岸过关之喜！`
      keyRisk = `【核心痛点与风险防范】：功底已足，唯一防范考场心态浮躁、审题粗心漏题与文书书写规范。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」备考冲刺中，` : ''}按既定节奏推进即可，切莫中途推倒重来。`
      firstAction = `【当下第一步破局先手】：针对历年真题与最易丢分的偏难小专题集中扫盲，做全仿真模考。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦父母爻受克或子孙爻泄气，考学文书存在硬性短板，竞争极为惨烈。`
      keyRisk = `【核心痛点与风险防范】：复习方法存在虚假勤奋或偏科死角，切忌押宝侥幸押题。`
      timeSchedule = `${timeDesc}若时间尚早需果断换法补偏，若临考在即则需保住基础题基本盘。`
      firstAction = `【当下第一步破局先手】：彻底摒弃题海战术，找专业名师或上岸学长精准诊断薄弱板块。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：成绩处于临界线边缘，胜负在一两题之间。`
      keyRisk = `【核心痛点与风险防范】：心态起伏过大容易影响临场发挥。`
      timeSchedule = `${timeDesc}考前两周重在固化作息与解题肌肉记忆。`
      firstAction = `【当下第一步破局先手】：严格执行错题本清零计划，先把会做的题目拿满分。`
    }
  } else if (intent.category === 'love_reconcile') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦世应生合，前缘未断，彼此心底仍有挂碍，复合之机已现。`
      keyRisk = `【核心痛点与风险防范】：切莫急于质问翻旧账！必须建立在真诚倾听与改变自身旧习的基础上方能长久。`
      timeSchedule = `${timeDesc}宜选彼此心情平静、外界无干扰的周末当面沟通。`
      firstAction = `【当下第一步破局先手】：以一件轻巧、无压力的问候或共同回忆为切入点试探温度，切忌长篇大论施加心理压迫。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦世应相冲克或化绝，对方心意已决或已有新阻碍，强求复合只会徒增怨怼与自我消耗。`
      keyRisk = `【核心痛点与风险防范】：切忌卑微纠缠或自我感动，执迷于沉没成本会错失更好的机缘。`
      timeSchedule = `${timeDesc}短痛胜长痛，退后一步海阔天空。`
      firstAction = `【当下第一步破局先手】：断绝频繁窥探动态，将精力全面收回自身成长与生活建设。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：关系处于僵持观望之期，对方情绪也在拉扯。`
      keyRisk = `【核心痛点与风险防范】：急躁进逼必遭反弹，冷漠疏离又致渐行渐远。`
      timeSchedule = `${timeDesc}给彼此两到三周冷静沉淀期再做接触。`
      firstAction = `【当下第一步破局先手】：过好自己的日常，展现积极独立的状态，以静制动。`
    }
  } else if (intent.category === 'wealth') {
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦妻财星旺相有源，求财进账有实质吉象，现金流回款顺畅。`
      keyRisk = `【核心痛点与风险防范】：切忌盲目扩杠杆或将利润再次全仓滚入高风险项目，落袋为安才是真财。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」之中，` : ''}财源渐进式增长，以月令长生之月为收获高点。`
      firstAction = `【当下第一步破局先手】：做好资金池分层管理，预留至少 6 个月安全备用金，再行配置优质标的。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦财星逢空破受克，当前投入极易缩水折损，严重防范资金链断裂或踩坑被套。`
      keyRisk = `【核心痛点与风险防范】：严防熟人借贷、虚假高息理财、加杠杆炒作或接盘高估值资产。`
      timeSchedule = `${timeDesc}当前处于财运低谷期，宜收不宜放。`
      firstAction = `【当下第一步破局先手】：果断止血止损，核查个人负债结构，绝不再盲目追加一分钱。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：财运平稳，日常收支平衡，暴利难求，唯靠稳健经营。`
      keyRisk = `【核心痛点与风险防范】：防范隐性超支与非必要消费。`
      timeSchedule = `${timeDesc}平稳蓄积，不宜贪大求全。`
      firstAction = `【当下第一步破局先手】：理顺账目流水，把精力放在提升主业赚钱效率上。`
    }
  } else {
    // 综合兜底：同样深刻绑定用户的 cleanTopic
    if (tone === 'good') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，顺水行舟，诸事向好。针对你所关切的这桩事务，当下天时人际皆有策应，胜算颇大。`
      keyRisk = `【核心痛点与风险防范】：顺境最忌骄矜轻敌。${hasMove ? '盘中有爻象发动，暗示行进中会有细节变化，需保持应变机敏。' : '宜持重笃行，按部就班推进。'}`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」内，` : ''}事态将迎来实质性利好进展。`
      firstAction = `【当下第一步破局先手】：尽快落实执行计划，敲定关键协调人，切勿因迟疑坐失良机。`
    } else if (tone === 'bad') {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，局势多遇险隘关卡。针对你所问之事，当前外力制约较重，若贸然强推必有阻隔挫折。`
      keyRisk = `【核心痛点与风险防范】：切莫意气用事或盲目蛮干，防范因信息不对称导致的决策失误。`
      timeSchedule = `${timeDesc}${intent.timeFrame ? `在「${intent.timeFrame}」期间，` : ''}以守正藏拙为上策，静待机运反转。`
      firstAction = `【当下第一步破局先手】：按兵不动，全面排查当前计划中的潜在薄弱环节，以守代攻。`
    } else {
      directVerdict = `【就所测「${intent.cleanTopic}」靶向直断】：此卦得《${benGuaName}》，事态处于蓄力沉淀的转折期。问事吉凶各半，进退皆有讲究。`
      keyRisk = `【核心痛点与风险防范】：切勿焦虑烦躁，不宜仓促下注。`
      timeSchedule = `${timeDesc}静观其变，待关键信号浮现。`
      firstAction = `【当下第一步破局先手】：扎实做好手头准备，修齐自身内功，以不变应万变。`
    }
  }

  return `${directVerdict}\n\n${keyRisk}\n\n${timeSchedule}\n\n${firstAction}`
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
      const jiyuLines = jiyuContent.split('\n')
        .map(l => cleanAiMarkdown(l).replace(/^[0-9一二三四\.\、\-\s]+/g, '').trim())
        .filter(l => l.length >= 5 && l.length <= 16)
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

  // 1. 确保四句偈语 100% 存在且工整
  if (!parsed.jiyu || parsed.jiyu.length < 4) {
    parsed.jiyu = generateDivinationJiyu(benGuaName, tone, question)
  }

  // 2. 确保偈语解释 / 针对具体回答存在
  if (!parsed.jiyuExplain) {
    parsed.jiyuExplain = generateConcreteAnswer(question, cast, benGuaName, tone)
  }
  parsed.directAnswer = parsed.jiyuExplain

  // 3. 确保卦象解释存在
  if (!parsed.guaExplain) {
    parsed.guaExplain = cleanAiMarkdown(text.slice(0, 260))
  }
  parsed.judgment = parsed.guaExplain

  if (!parsed.summary) {
    parsed.summary = tone === 'good' ? '天开化育 · 顺势而上' : (tone === 'bad' ? '关山险阻 · 审慎待时' : '静待蓄势 · 循序渐进')
  }

  const sections = [
    {
      title: '一、神机四句偈',
      items: parsed.jiyu
    },
    {
      title: '二、偈语解释 · 趋吉避凶',
      items: toSectionItems(parsed.jiyuExplain)
    },
    {
      title: '三、卦象解释',
      items: toSectionItems(parsed.guaExplain)
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
    guaExplain: parsed.guaExplain,
    directAnswer: parsed.jiyuExplain,
    judgment: parsed.guaExplain,
    yongshen: parsed.yongshen || parsed.guaExplain,
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
  const bianGuaName = (cast?.bian && cast?.bian?.name) || benGuaName
  const benGuaci = getGuaCi(benGuaName) || {}

  // 分析卦象动静
  const hasMove = !!(cast?.changingIndexes && cast.changingIndexes.length > 0)
  const changingCount = cast?.changingIndexes ? cast.changingIndexes.length : 0

  // 判定吉凶大势
  let tone = 'good'
  let summary = '亨通吉利 · 顺水行舟'
  if (benGuaName === '坎' || benGuaName === '蹇' || benGuaName === '困' || benGuaName === '明夷' || benGuaName === '剥') {
    tone = 'bad'
    summary = '关山险阻 · 审慎待时'
  } else if (benGuaName === '需' || benGuaName === '屯' || benGuaName === '蛊' || benGuaName === '损' || benGuaName === '蒙') {
    tone = 'mid'
    summary = '静待蓄势 · 循序渐进'
  } else if (benGuaName === '泰' || benGuaName === '大有' || benGuaName === '同人' || benGuaName === '临' || benGuaName === '晋') {
    tone = 'good'
    summary = '天开化育 · 顺势而上'
  }

  const cal = cast?.calendar || {}
  const dayGz = cal.day?.text || '吉日'
  const monthGz = cal.month?.text || '令月'

  // 1. 置顶四句神机诗偈（深度切题）
  const jiyu = generateDivinationJiyu(benGuaName, tone, question)

  // 2. 偈语解释与针对所测落地具体答复
  const jiyuExplain = generateConcreteAnswer(question, cast, benGuaName, tone)

  // 3. 卦象精炼解释
  let guaExplain = ''
  if (hasMove) {
    guaExplain = `问测「${question || '所求诸事'}」，筮得本卦《${benGuaName}》，动化《${bianGuaName}》卦。卦中${changingCount}爻发动，逢${monthGz}值${dayGz}，机变丛生。象曰：「${benGuaci.xiang || '自强不息'}」。动爻翻转主事态见转枢，顺天休命、行所当行，虽有微滞亦能履险如夷。`
  } else {
    guaExplain = `问测「${question || '所求诸事'}」，筮得《${benGuaName}》静卦。卦辞云：「${benGuaci.guaci || '利贞'}」。六爻安静无动变，气机凝敛，主大势以稳健持重为根基。宜守正固本，待时而发，不宜轻举盲动。`
  }

  const sections = [
    {
      title: '一、神机四句偈',
      items: jiyu
    },
    {
      title: '二、偈语解释 · 趋吉避凶',
      items: toSectionItems(jiyuExplain)
    },
    {
      title: '三、卦象解释',
      items: toSectionItems(guaExplain)
    }
  ]

  const fullText = [
    summary,
    `【神机四句偈】\n${jiyu.join('\n')}`,
    `【偈语解释 · 趋吉避凶】\n${jiyuExplain}`,
    `【卦象解释】\n${guaExplain}`
  ].join('\n\n')

  return {
    source: 'fallback',
    question: question || '综合运程',
    tone,
    tendency: { tone },
    summary,
    jiyu,
    jiyuExplain,
    guaExplain,
    directAnswer: jiyuExplain,
    judgment: guaExplain,
    yongshen: guaExplain,
    yingqi: hasMove ? '动爻逢值逢合之期为转机' : '静卦守常待逢冲破局',
    advice: '顺天应人，修德明理，方见通达。',
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
  generateConcreteAnswer
}
