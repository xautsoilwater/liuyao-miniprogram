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
  if (a && typeof a === 'object' && ('cast' in a || 'question' in a)) {
    return {
      cast: a.cast || null,
      question: typeof a.question === 'string' ? a.question : ''
    }
  }
  if (a && typeof a === 'object' && (a.ben || a.changingIndexes || a.yaosBottomUp || a.lines)) {
    return {
      cast: a,
      question: typeof b === 'string' ? b : (b && b.question ? b.question : '')
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
 * 构建发送给大模型的周易神机 Prompt
 */
function buildDivinationPrompt(a, b) {
  const { question, cast } = normalizeArgs(a, b)
  const systemPrompt = `你是一位精通《周易》、《京房易传》、《卜筮正宗》、《增删卜易》与宋代理学义理的当代周易象数大师与心法导师。
问卦者向你呈上了心中关切的具体疑难，以及刚刚依据大衍蓍法/金钱课所得的纳甲六爻排盘。
请你以高深、典雅、透彻、通情达理的文风，为问卦者抽丝剥茧地推演卦象天机。

【断卦法则要求】：
1. 【切中问题，直断事由】：紧扣问卦者的【具体所问】，开门见山给出鲜明、相对具体的回答与直接推断。明确事情可否行进、成败关键、顺逆走向、人际/合同/沟通中的具体防范点，并给出具体的破局先手策略，严禁空泛套话。
2. 【神机四句偈，指明玄机】：必须为问卜者专赋一首七言绝句（四句诗偈，每句七字，共四句，共28字）。诗偈须融合本卦卦意、所问事宜与动变天机，言浅意深，工整押韵，专门指引问卦者在现实中如何「趋吉避凶」、转危为安。
3. 【辨明用神】：依据问事所属，精准指认本卦中的【用神】（求财看妻财，求功名事业看官鬼，求文书学业论文看父母，问健康看世爻与官鬼，求子嗣看子孙，问婚恋男看财女看官并参世应等），明确说明为何取该爻为用神。
4. 【察日月动化】：分析月建对用神之旺相休囚、日辰对用神之生克冲合，重点剖析动爻是回头生、回头克、化进神还是化退神，有无旬空或伏神。
5. 【周易理数结合】：文白相间，典雅温润，兼具传统纳甲精髓与当代现实启发。绝不搞恐吓式的江湖宿命论，重在指引问卦者修德、审势、定心、知止与明理。
6. 【纯正文风，绝无技术痕迹】：通篇必须纯以易学宗师太史令的身份作答，严禁出现任何“AI”、“人工智能”、“大模型”、“算法提示”、“语言模型”、“计算机”等现代词汇，言辞典雅纯正，深具古风易理底蕴。
7. 【排版禁忌，严禁星号】：通篇绝对禁止输出任何 Markdown 星号（严禁出现 ** 加粗、严禁出现 * 列表符号或任何形式的星号），所有强调、重点字句请直接使用中文方头括号【】或书名号《》，列表请直接使用数字序号或汉字段落，保持纯净典雅的书卷阅读质感。

【请必须按如下结构输出】：
### 【神机总断】
（给出8-16字的四字断语排律，例如：“大吉亨通 · 渐入佳境”、“时机未至 · 持重蓄力”等，紧跟100字左右的核心判词定性）

### 【切问切题 · 针对答复】
（就问卜者具体所问的问题给出具体针对的回答：可否成事、何时破局、核心阻力人/事为何、当下第一步该怎么做，给出明确落地指引）

### 【趋吉避凶 · 神机四句偈】
（依卦理为问卜者专赋七言四句趋吉避凶绝句偈语，朗朗上口，言浅意深，每行一句，共四句，共28字）

### 【用神与爻象探微】
（详细剖析所取用神、月建日辰旺衰、世应生克、动爻化象及深层机理）

### 【机运演进与应期】
（分析事情发展的阶段节律，推断关键转机时段、月令应期或注意事项）

### 【周易明理 · 趋吉避凶】
（结合《易经》象传义理与现实处事智慧，给出切实可行的心态调摄与应对良策）`

  const userPrompt = `问卦者所求之事：
「${question || '未注明具体事由，请就卦象吉凶与当前运势作综合总断'}」

当前筮得纳甲六爻盘面如下：
${formatCastForPrompt(cast)}

请大师即席研读卦象，为问卦者开示天机神意。`

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
      body: JSON.stringify(requestBody)
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
function generateDivinationJiyu(benGuaName, tone) {
  const cleanName = (benGuaName || '').replace(/为[天地水火山风雷泽]/g, '')
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
 * 依据问测事宜与卦爻机变，生成相对具体落地、直指事由的答复与策略
 */
function generateConcreteAnswer(question, cast, benGuaName, tone) {
  const q = question || ''
  const hasMove = !!(cast?.changingIndexes && cast.changingIndexes.length > 0)
  
  if (/钱|财|收益|买|卖|盈|利|投资|理财|股|货|款/.test(q)) {
    if (tone === 'good') {
      return `【就求财所断】：此卦财源得气，所谋求之财物与商业收益可行，主近期有实质进账或商机落地。但${hasMove ? '盘中有动爻翻转，提示合同细节与分成必须白纸黑字签定，严防兄弟爻争夺利润' : '静卦利于持重，宜在既有赛道精耕细作'}。具体策略：勿加杠杆，见好即收，现金流落袋为安为上策。`
    } else if (tone === 'bad') {
      return `【就求财所断】：此卦财星受克或入墓绝，当前求财切忌盲目扩资、合伙分羹或涉足不熟悉领域。容易发生货款拖欠、隐性成本超支或同行截流分财。具体对策：紧缩预算，止血保本，切勿借贷追加，待月令转旺再行定夺。`
    }
    return `【就求财所断】：此卦财运处于蓄势平衡阶段，小额回流顺畅，大额求财尚缺一股东风。具体建议：先稳住日常营运盘，厘清账目明细，防范因口头协议产生的后续扯皮，时机成熟自可稳步变现。`
  }

  if (/工作|事业|考|官|晋升|职位|项目|前途|换|跳槽|应聘|面试|创业/.test(q)) {
    if (tone === 'good') {
      return `【就事业前程所断】：此卦官印相涵，问晋升、求职、项目立项大有可为，近期贵人提携之象明显。具体落地指引：主动在关键文书、述职或方案上展现扎实成果；若考虑跳槽，下家已有确定眉目即可顺势而为，不宜反复摇摆延误良机。`
    } else if (tone === 'bad') {
      return `【就事业前程所断】：此卦官鬼动克或世爻失位，眼下职场环境存在暗流阻力，或竞争对手强势制肘。切忌此时贸然冲动裸辞或与上层正面较劲。具体破局策略：低调务实、守正藏拙，将工作留痕归档，静待人事动荡平息。`
    }
    return `【就事业前程所断】：此卦事业正值转换节点，进退皆有道理。关键不在外部环境，而在自身筹码是否充实。具体指引：现阶段以练内功、补齐专业资质为第一要义，切莫急于表态，下月自见明朗风向。`
  }

  if (/感情|婚|爱|喜欢|交往|他|她|对象|复合|相亲|伴侣/.test(q)) {
    if (tone === 'good') {
      return `【就情缘婚恋所断】：此卦世应生合相投，双方心意基础坚实，彼此间有较深默契。若问增进关系或谈婚论嫁，当下正是顺水推舟之吉机。具体行动：多注重现实关怀与面对面沟通，坦诚相待即可修成正果。`
    } else if (tone === 'bad') {
      return `【就情缘婚恋所断】：此卦世应相冲克或动爻化退，代表双方近期价值观存在温差，或有沟通堵塞、外界琐事干扰。具体指引：切忌紧逼质问或冷战较劲，先各自退后一步冷静心绪，以宽厚柔和姿态方能解冻。`
    }
    return `【就情缘婚恋所断】：此卦情缘处于相处磨合之常局，激情渐敛，需看细水长流。具体指引：莫被一时小矛盾牵引心神，多关注彼此实际生活需要，少翻旧账，彼此信任是破冰钥匙。`
  }

  if (/考|学|研|试|录取|论文|评定|证/.test(q)) {
    return `【就学业文书所断】：此卦专看父母爻与官星。文书印星得位，功底扎实，大有登科过关之望。具体应考指引：临考前务必注重规范书写与审题细致，查漏补缺，切勿押宝侥幸题目，以严谨自律稳拿胜券。`
  }

  if (/病|健康|医|身体|痛|伤|疾/.test(q)) {
    return `【就身心健康所断】：卦象提示此为气血失调或思虑过重之候，子孙爻为调养之吉神。具体调护建议：近期宜早睡固精、放空心神，远离焦虑源；易象重在指引心绪平复，身体有不适务必遵从专业医师当面诊断。`
  }

  if (/行|出差|走|旅游|迁|搬家|去/.test(q)) {
    return `【就出行迁徙所断】：卦中道路信息分明。若为公干商务，行程能有所收获；具体出行提点：提前核对交通班次、天气预警及随身证件，旅途待人谦和宽厚，即可一路平安顺遂。`
  }

  // 综合问事
  if (tone === 'good') {
    return `【就所问之事具体研判】：此卦得《${benGuaName}》，天时人脉相得益彰，所谋之事大势向好，可行性极高。具体落地策略：乘胜追击，尽快落实执行方案与关键对接人，切勿因迟疑拖延错失最佳窗口期。`
  } else if (tone === 'bad') {
    return `【就所问之事具体研判】：此卦得《${benGuaName}》，局势前行多有险隘暗礁，外力制约较重。当下强行推进行动极易受阻折损。具体应对锦囊：暂时按兵不动、止步自省，先排除潜藏漏洞，以守为攻方为上策。`
  }
  return `【就所问之事具体研判】：此卦得《${benGuaName}》，目前正处于量变积累、蓄势待发的转折阶段。既不可盲动躁进，亦无须灰心气馁。具体指引：按部就班扎实做好手头准备，待关键时机现身再顺势而发。`
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
    yongshen: '',
    yingqi: '',
    advice: '',
    raw: text
  }

  // 提取各部分
  const parts = text.split(/###?\s*【/g)
  parts.forEach(part => {
    if (part.startsWith('神机总断】')) {
      const content = cleanAiMarkdown(part.replace(/^神机总断】\s*/, '').trim())
      const lines = content.split('\n').map(l => cleanAiMarkdown(l).trim()).filter(Boolean)
      parsed.summary = cleanAiMarkdown(lines[0] || '大成卦象 · 天机显现')
      parsed.judgment = cleanAiMarkdown(lines.slice(1).join('\n') || content)
    } else if (part.startsWith('切问切题 · 针对答复】') || part.startsWith('针对答复】') || part.startsWith('直断事宜') || part.startsWith('具体指引】')) {
      parsed.directAnswer = cleanAiMarkdown(part.replace(/^(切问切题 · 针对答复|针对答复|直断事宜 · 具体指引|直断事宜|具体指引)】\s*/, '').trim())
    } else if (part.startsWith('趋吉避凶 · 神机四句偈】') || part.startsWith('神机四句偈】') || part.startsWith('神机偈语】') || part.startsWith('四句偈语】')) {
      const jiyuContent = cleanAiMarkdown(part.replace(/^(趋吉避凶 · 神机四句偈|神机四句偈|神机偈语|四句偈语)】\s*/, '').trim())
      const jiyuLines = jiyuContent.split('\n')
        .map(l => cleanAiMarkdown(l).replace(/^[0-9一二三四\.\、\-\s]+/g, '').trim())
        .filter(l => l.length >= 5 && l.length <= 16)
      if (jiyuLines.length >= 4) {
        parsed.jiyu = jiyuLines.slice(0, 4)
      }
    } else if (part.startsWith('用神与爻象探微】')) {
      parsed.yongshen = cleanAiMarkdown(part.replace(/^用神与爻象探微】\s*/, '').trim())
    } else if (part.startsWith('机运演进与应期】')) {
      parsed.yingqi = cleanAiMarkdown(part.replace(/^机运演进与应期】\s*/, '').trim())
    } else if (part.startsWith('周易明理 · 趋吉避凶】')) {
      parsed.advice = cleanAiMarkdown(part.replace(/^周易明理 · 趋吉避凶】\s*/, '').trim())
    }
  })

  // 兜底提取
  if (!parsed.judgment) parsed.judgment = cleanAiMarkdown(text.slice(0, 300))
  if (!parsed.summary) parsed.summary = '神机内蕴 · 顺时而动'

  // 判断倾向色调
  let tone = 'mid'
  if (text.includes('大吉') || text.includes('亨通') || text.includes('顺畅') || text.includes('大有可为') || text.includes('佳境')) {
    tone = 'good'
  } else if (text.includes('凶') || text.includes('受阻') || text.includes('险陷') || text.includes('退守') || text.includes('多险')) {
    tone = 'bad'
  }

  const benGuaName = cast?.ben?.name || '大成卦'

  // 确保四句偈语 100% 存在且工整
  if (!parsed.jiyu || parsed.jiyu.length < 4) {
    parsed.jiyu = generateDivinationJiyu(benGuaName, tone)
  }

  // 确保切题具体答复存在
  if (!parsed.directAnswer) {
    parsed.directAnswer = generateConcreteAnswer(question, cast, benGuaName, tone)
  }

  const sections = [
    {
      title: '一、神机总断',
      items: toSectionItems(parsed.judgment || parsed.summary)
    },
    {
      title: '二、切问切题 · 针对答复',
      items: toSectionItems(parsed.directAnswer)
    },
    {
      title: '三、趋吉避凶 · 神机金偈',
      items: parsed.jiyu
    },
    {
      title: '四、用神与爻象探微',
      items: toSectionItems(parsed.yongshen || '卦中用神清晰，察日月生克与动爻乘除，天机自现。')
    },
    {
      title: '五、机运演进与应期',
      items: toSectionItems(parsed.yingqi || '万物有时，事机发动逢值逢合之候为关键应期。')
    },
    {
      title: '六、周易明理 · 趋吉避凶',
      items: toSectionItems(parsed.advice || '知进知退，顺天应人，修德明理方能趋吉避凶。')
    }
  ]

  return {
    source: 'ai_online',
    question,
    tone,
    tendency: { tone },
    summary: parsed.summary,
    judgment: parsed.judgment,
    directAnswer: parsed.directAnswer,
    jiyu: parsed.jiyu,
    yongshen: parsed.yongshen,
    yingqi: parsed.yingqi,
    advice: parsed.advice,
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
  const bianGuaci = getGuaCi(bianGuaName) || {}

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

  // 1. 针对性落地答复
  const directAnswer = generateConcreteAnswer(question, cast, benGuaName, tone)

  // 2. 四句神机诗偈
  const jiyu = generateDivinationJiyu(benGuaName, tone)

  // 3. 智能推演用神
  let yongshenDesc = ''
  if (/钱|财|收益|买|卖|盈|利/.test(question)) {
    yongshenDesc = `问测求财获利，专以卦中【妻财】为用神。逢${monthGz}月建生助，财源有气；动爻生扶财爻，主利市可期，唯防兄弟爻暗动分夺。`
  } else if (/工作|事业|考|官|晋升|职位|项目|前途/.test(question)) {
    yongshenDesc = `问测功名事业与项目立项，首重卦中【官鬼】与【父母】爻。官鬼为职阶机运，父母为文书批文。今盘中世爻得地，官印相生，所图之事脉络分明。`
  } else if (/感情|婚|爱|喜欢|交往|他|她/.test(question)) {
    yongshenDesc = `问测姻缘情缘，重在参验【世爻】与【应爻】之相生相合。世应同心则吉，若逢相冲克害，则宜多假以时日，增进诚意相通。`
  } else {
    yongshenDesc = `综合审视卦象，以【世爻】为自身根基，以【动爻】为机变枢纽。今得《${benGuaName}》卦，动化《${bianGuaName}》卦，主事态正在推移演变之中。`
  }

  // 4. 智能推演应期
  const yingqiDesc = hasMove
    ? `卦中${changingCount}爻发动，变生不测。机运变转多应在动爻干支逢值、逢合之期，近期以逢冲开滞或月令交接之日（见${cal.month?.text || '本月'}中下旬）为关键分水岭。`
    : `此卦纯静无动爻，事态处于恒定蓄势之局。无变则主慢，宜静守其常，待逢值之日月方见枢机明朗。`

  // 5. 周易明理
  const adviceDesc = `《易经·${benGuaName}卦》象曰：「${benGuaci.xiang || '君子以自强不息'}」。问事之要，不在贪求必应，而在知阴阳之消息。若顺应天时、修谨人事，则虽有阻滞亦可化险为夷。`

  const judgmentDesc = `所问「${question || '事由'}」，筮得本卦《${benGuaName}》${hasMove ? `，变卦《${bianGuaName}》` : '（静卦）'}。卦辞云：「${benGuaci.guaci || '利贞'}」。当前${dayGz}日辰，吉凶隐伏已现端倪。`

  const sections = [
    {
      title: '一、神机总断',
      items: toSectionItems(judgmentDesc)
    },
    {
      title: '二、切问切题 · 针对答复',
      items: toSectionItems(directAnswer)
    },
    {
      title: '三、趋吉避凶 · 神机金偈',
      items: jiyu
    },
    {
      title: '四、用神与爻象探微',
      items: toSectionItems(yongshenDesc)
    },
    {
      title: '五、机运演进与应期',
      items: toSectionItems(yingqiDesc)
    },
    {
      title: '六、周易明理 · 趋吉避凶',
      items: toSectionItems(adviceDesc)
    }
  ]

  const fullText = [
    summary,
    `【针对答复】\n${directAnswer}`,
    `【神机四句偈】\n${jiyu.join('\n')}`,
    judgmentDesc,
    yongshenDesc,
    yingqiDesc,
    adviceDesc
  ].join('\n\n')

  return {
    source: 'fallback',
    question: question || '综合运程',
    tone,
    tendency: { tone },
    summary,
    judgment: judgmentDesc,
    directAnswer,
    jiyu,
    yongshen: yongshenDesc,
    yingqi: yingqiDesc,
    advice: adviceDesc,
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
  buildDivinationPrompt,
  callAiDivinationApi,
  interpretWithAi,
  buildIntelligentFallbackInterpretation,
  generateDivinationJiyu,
  generateConcreteAnswer
}
