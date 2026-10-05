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
 * 构建发送给大模型的周易神机 Prompt
 */
function buildDivinationPrompt({ question, cast }) {
  const systemPrompt = `你是一位精通《周易》、《京房易传》、《卜筮正宗》、《增删卜易》与宋代理学义理的当代周易象数大师与心法导师。
问卦者向你呈上了心中关切的具体疑难，以及刚刚依据大衍蓍法/金钱课所得的纳甲六爻排盘。
请你以高深、典雅、透彻、通情达达理的文风，为问卦者抽丝剥茧地推演卦象天机。

【断卦法则要求】：
1. 【切中问题】：紧密围绕问卦者的【具体所问】，不可泛泛而谈。
2. 【辨明用神】：依据问事所属，精准指认本卦中的【用神】（求财看妻财，求功名事业看官鬼，求文书学业论文看父母，问健康看世爻与官鬼，求子嗣看子孙，问婚恋男看财女看官并参世应等），明确说明为何取该爻为用神。
3. 【察日月动化】：分析月建对用神之旺相休囚、日辰对用神之生克冲合，重点剖析动爻是回头生、回头克、化进神还是化退神，有无旬空或伏神。
4. 【周易理数结合】：文白相间，典雅温润，兼具传统纳甲精髓与当代现实启发。绝不搞恐吓式的江湖宿命论，重在指引问卦者修德、审势、定心、知止与明理。

【请必须按如下四段结构输出】：
### 【神机总断】
（给出8-16字的四字断语排律，例如：“大吉亨通 · 渐入佳境”、“时机未至 · 持重蓄力”等，紧跟100字左右的核心判词定性）

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
async function callAiDivinationApi({ question, cast }) {
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
 * 解析大模型返回的结构化文本
 */
function parseAiDivinationOutput(text, question, cast) {
  if (!text) throw new Error('AI返回内容为空')

  const sections = {
    summary: '',
    judgment: '',
    yongshen: '',
    yingqi: '',
    advice: '',
    raw: text
  }

  // 提取四大部分
  const parts = text.split(/###?\s*【/g)
  parts.forEach(part => {
    if (part.startsWith('神机总断】')) {
      const content = part.replace(/^神机总断】\s*/, '').trim()
      const lines = content.split('\n').filter(Boolean)
      sections.summary = lines[0] || '大成卦象 · 天机显现'
      sections.judgment = lines.slice(1).join('\n') || content
    } else if (part.startsWith('用神与爻象探微】')) {
      sections.yongshen = part.replace(/^用神与爻象探微】\s*/, '').trim()
    } else if (part.startsWith('机运演进与应期】')) {
      sections.yingqi = part.replace(/^机运演进与应期】\s*/, '').trim()
    } else if (part.startsWith('周易明理 · 趋吉避凶】')) {
      sections.advice = part.replace(/^周易明理 · 趋吉避凶】\s*/, '').trim()
    }
  })

  // 兜底提取
  if (!sections.judgment) sections.judgment = text.slice(0, 300)
  if (!sections.summary) sections.summary = '神机内蕴 · 顺时而动'

  // 判断倾向色调
  let tone = 'mid'
  if (text.includes('大吉') || text.includes('亨通') || text.includes('顺畅') || text.includes('大有可为')) {
    tone = 'good'
  } else if (text.includes('凶') || text.includes('受阻') || text.includes('险陷') || text.includes('退守')) {
    tone = 'bad'
  }

  return {
    source: 'ai_online',
    question,
    tone,
    summary: sections.summary,
    judgment: sections.judgment,
    yongshen: sections.yongshen,
    yingqi: sections.yingqi,
    advice: sections.advice,
    fullText: text
  }
}

/**
 * 智能象数离线理数推演引擎（当网络断开或用户未配置有效API Key时的全自动周易大师算法）
 */
function buildIntelligentFallbackInterpretation({ question, cast }) {
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
  if (benGuaName === '坎' || benGuaName === '蹇' || benGuaName === '困' || benGuaName === '明夷') {
    tone = 'bad'
    summary = '关山险阻 · 审慎待时'
  } else if (benGuaName === '需' || benGuaName === '屯' || benGuaName === '蛊' || benGuaName === '损') {
    tone = 'mid'
    summary = '静待蓄势 · 循序渐进'
  } else if (benGuaName === '泰' || benGuaName === '大有' || benGuaName === '同人' || benGuaName === '临') {
    tone = 'good'
    summary = '天开化育 · 顺势而上'
  }

  const cal = cast?.calendar || {}
  const dayGz = cal.day?.text || '吉日'
  const monthGz = cal.month?.text || '令月'

  // 智能推演用神
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

  // 智能推演应期
  const yingqiDesc = hasMove
    ? `卦中${changingCount}爻发动，变生不测。机运变转多应在动爻干支逢值、逢合之期，近期以逢冲开滞或月令交接之日（见${cal.month?.text || '本月'}中下旬）为关键分水岭。`
    : `此卦纯静无动爻，事态处于恒定蓄势之局。无变则主慢，宜静守其常，待逢值之日月方见枢机明朗。`

  // 周易明理
  const adviceDesc = `《易经·${benGuaName}卦》象曰：「${benGuaci.xiang || '君子以自强不息'}」。问事之要，不在贪求必应，而在知阴阳之消息。若顺应天时、修谨人事，则虽有阻滞亦可化险为夷。`

  return {
    source: 'ai_fallback',
    question: question || '综合运程',
    tone,
    summary,
    judgment: `所问「${question || '事由'}」，筮得本卦《${benGuaName}》${hasMove ? `，变卦《${bianGuaName}》` : '（静卦）'}。卦辞云：「${benGuaci.guaci || '利贞'}」。当前${dayGz}日辰，吉凶隐伏已现端倪。`,
    yongshen: yongshenDesc,
    yingqi: yingqiDesc,
    advice: adviceDesc,
    fullText: `${summary}\n\n${yongshenDesc}\n\n${yingqiDesc}\n\n${adviceDesc}`
  }
}

/**
 * 统一解卦对外接口（自动尝试在线大模型API，遇阻平滑降级至智能象数算法，确保100%可靠）
 */
async function interpretWithAi({ question, cast }) {
  try {
    return await callAiDivinationApi({ question, cast })
  } catch (err) {
    console.warn('AI API 调用受阻，自动启用本地智能理数神机推演:', err.message)
    return buildIntelligentFallbackInterpretation({ question, cast })
  }
}

module.exports = {
  buildDivinationPrompt,
  callAiDivinationApi,
  interpretWithAi,
  buildIntelligentFallbackInterpretation
}
