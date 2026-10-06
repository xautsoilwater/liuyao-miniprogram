const assert = require('assert')
const {
  cleanAiMarkdown,
  analyzeQuestionIntent,
  buildDivinationPrompt,
  buildIntelligentFallbackInterpretation,
  interpretWithAi,
  generateDivinationJiyu,
  parseAiDivinationOutput,
  explainAnswersQuestion
} = require('../utils/ai-interpreter')
const { manualYao } = require('../utils/coin')
const { arrangeCast } = require('../utils/paipan')
const { buildCalendar } = require('../utils/ganzhi')

console.log('Testing AI Interpreter module...')

// 0. 测试问题意图深度解构模块 analyzeQuestionIntent
const intent1 = analyzeQuestionIntent('今年下半年开拓新市场是否合适？')
assert.strictEqual(intent1.timeFrame, '今年下半年', '必须精准识别时间窗口')
assert.strictEqual(intent1.category, 'expand', '必须精准识别开拓新市场类别')
assert(intent1.cleanTopic.includes('开拓新市场'), '必须提炼核心标的物')

const intent2 = analyzeQuestionIntent('跟张三合伙开咖啡店能不能赚钱？')
assert.strictEqual(intent2.category, 'partner', '必须识别合伙合作类别')

const intent3 = analyzeQuestionIntent('明年换工作跳槽好不好？')
assert.strictEqual(intent3.timeFrame, '明年')
assert.strictEqual(intent3.category, 'career_switch')
console.log('✔ analyzeQuestionIntent 问题意图深度解构测试通过')

// 模拟一次六爻排盘
const dummyYaos = [
  manualYao(7), // 初爻少阳
  manualYao(6), // 二爻老阴
  manualYao(7), // 三爻少阳
  manualYao(7), // 四爻少阳
  manualYao(8), // 五爻少阴
  manualYao(7)  // 上爻少阳
]

const cal = buildCalendar(new Date('2026-10-05T12:00:00'))
const cast = arrangeCast(dummyYaos, cal)

// 1. 测试 Prompt 构建（深度聚焦）
const { systemPrompt, userPrompt } = buildDivinationPrompt({
  question: '今年下半年开拓新市场是否合适？',
  cast
})

assert(systemPrompt.includes('开拓新市场'), '系统Prompt应注入深度解构的标的物')
assert(systemPrompt.includes('今年下半年'), '系统Prompt应注入时间窗口')
assert(systemPrompt.includes('所问即所答') || systemPrompt.includes('不能答非所问') || systemPrompt.includes('所问'), '系统Prompt须强调紧扣所问')
assert(userPrompt.includes('开拓新市场'), '用户Prompt必须包含用户亲笔问题')
assert(userPrompt.includes(cast.ben.name), '用户Prompt必须包含本卦名称')
console.log('✔ AI 神机 Prompt 深度聚焦组装测试通过')

// 本地偈语须按所问类别生成，不能总是无关卦诗
const expandJiyu = generateDivinationJiyu(cast.ben.name, 'good', '今年下半年开拓新市场是否合适？')
assert(expandJiyu.some((l) => /开拓|所问/.test(l)), '开拓类问题的偈语须贴题')
const placeJiyu = generateDivinationJiyu(cast.ben.name, 'good', '东西丢在哪个方向？')
assert(placeJiyu.some((l) => /方位|所问/.test(l)), '方位类问题的偈语须贴题')
console.log('✔ 贴题偈语生成测试通过')

// AI 若已扣题作答，解析后不得被本地套话覆盖
const aiRaw = [
  '### 【神机四句偈】',
  '合伙开店须审详',
  '权责先明再开张',
  '利润分配防内耗',
  '白纸落笔免参商',
  '',
  '### 【偈语解释】',
  '「合伙开店须审详」：直断：跟张三合伙开咖啡店，倾向可行但须先定权责。',
  '「权责先明再开张」：何以见得：合作要边界清楚，才不致后患。',
  '「利润分配防内耗」：今年内尤防口头约定导致分利争议。',
  '「白纸落笔免参商」：下一步：先签合伙协议，写清出资、分成与退出。'
].join('\n')
assert(explainAnswersQuestion(aiRaw, '跟张三合伙开咖啡店能不能赚钱？'), 'AI扣题正文应被判定为切题')
const parsedAi = parseAiDivinationOutput(aiRaw, '跟张三合伙开咖啡店能不能赚钱？', cast)
assert(parsedAi.jiyu[0] === '合伙开店须审详', '须保留AI现场所写四句偈，不能换成无关卦诗')
assert(parsedAi.jiyuExplain.includes('张三') || parsedAi.jiyuExplain.includes('咖啡店') || parsedAi.jiyuExplain.includes('合伙'), '须保留AI对所问的直断')
assert(!parsedAi.jiyuExplain.includes('丽天丽地彩云飞'), '不得用离卦套诗覆盖AI切题断语')
console.log('✔ AI切题断语不被本地覆盖测试通过')

// 2. 测试智能理数兜底推演（高度聚焦）
const fallbackResult = buildIntelligentFallbackInterpretation({
  question: '今年下半年开拓新市场是否合适？',
  cast
})

assert(fallbackResult.summary, '必须有神机总断')
assert(fallbackResult.jiyuExplain.includes('开拓新市场'), '偈语解释必须靶向出现问卦者的具体标的')
assert(fallbackResult.jiyuExplain.includes('今年下半年'), '必须有时间节律回应')
assert(fallbackResult.jiyuExplain.includes('直断'), '必须先给出明确直断')
assert(fallbackResult.jiyuExplain.includes('下一步'), '必须有具体下一步动作')
assert(fallbackResult.jiyuExplain.includes('本卦') || fallbackResult.jiyuExplain.includes('卦德'), '偈语解释须紧扣卦象')
assert(!fallbackResult.guaExplain, '不再单独输出卦象解释')
assert(Array.isArray(fallbackResult.jiyu) && fallbackResult.jiyu.length === 4, '必须包含四句趋吉避凶神机偈语')
assert(Array.isArray(fallbackResult.jiyuExplainItems) && fallbackResult.jiyuExplainItems.length === 4, '必须包含分段解释条目')
assert(fallbackResult.sections.length === 2, '页面结构应为偈语+解释两部分')
fallbackResult.jiyu.forEach((line, i) => {
  assert(fallbackResult.jiyuExplain.includes(line), `偈语解释必须引用第${i + 1}句原文以逐句对应`)
  assert(fallbackResult.jiyuExplainItems[i].quote === line, `分段条目第${i + 1}句须对齐偈文`)
  assert(fallbackResult.jiyuExplainItems[i].text.length >= 12, `分段解释须可读懂（第${i + 1}句过短）`)
  assert(fallbackResult.jiyuExplainItems[i].text.length <= 120, `分段解释仍宜克制篇幅（第${i + 1}句）`)
})

// 方位题必须给出具体方位
const placeResult = buildIntelligentFallbackInterpretation({
  question: '东西丢在哪个方向？',
  cast
})
assert(placeResult.jiyuExplain.includes('直断'), '方位题须有直断')
assert(/东|南|西|北/.test(placeResult.jiyuExplain), '方位题须给出具体方位')
assert(placeResult.jiyuExplain.includes('下一步'), '方位题须有下一步')
console.log('✔ 方位题直断测试通过')

// 时间题必须给出时间范围
const whenResult = buildIntelligentFallbackInterpretation({
  question: '开拓新市场什么时候合适？',
  cast
})
assert(whenResult.jiyuExplain.includes('直断'), '时间题须有直断')
assert(/日|月|近几|旬|窗口|应期/.test(whenResult.jiyuExplain), '时间题须给出具体时间范围')
console.log('✔ 时间题直断测试通过')

console.log('✔ 智能理数兜底推演高度聚焦测试通过')
console.log('总断概要:', fallbackResult.summary)
console.log('四句偈语:\n' + fallbackResult.jiyu.join('\n'))
console.log('偈语解释:\n' + fallbackResult.jiyuExplain)
console.log('分段条目:', JSON.stringify(fallbackResult.jiyuExplainItems, null, 2))

// 3. 测试对外主入口 interpretWithAi
interpretWithAi({
  question: '明年换工作跳槽是否合适？',
  cast
}).then(res => {
  assert(res.summary, '异步主入口必须返回有效解卦结果')
  assert(res.directAnswer, '统一主入口必须包含针对具体问题的落地指引')
  assert(res.jiyuExplain, '统一主入口必须包含偈语解释')
  assert(!res.guaExplain, '统一主入口不再单独输出卦象解释')
  assert(Array.isArray(res.jiyu) && res.jiyu.length === 4, '统一主入口必须包含四句绝句金偈')
  console.log('✔ 统一主入口 interpretWithAi 测试通过 (含针对答复与四句金偈)')

  // 4. 测试 cleanAiMarkdown 彻底清洗各类星号
  const dirtyText = '### **神机总断**：***大吉亨通***！\n* **用神分析**：专以卦中**【妻财】**为用神。\n* 另外* 包含孤立星号* 标记'
  const cleanedText = cleanAiMarkdown(dirtyText)
  assert(!cleanedText.includes('*'), '清洗后绝对不能残留任何星号*')
  assert(!cleanedText.includes('#'), '清洗后绝对不能残留Markdown标题#')
  assert(cleanedText.includes('神机总断：大吉亨通！'), '加粗星号剥离后文字内容完整保留')
  console.log('✔ Markdown 星号清洗引擎测试通过')

  console.log('All AI interpreter tests passed successfully!')
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
