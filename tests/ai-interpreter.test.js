const assert = require('assert')
const {
  cleanAiMarkdown,
  analyzeQuestionIntent,
  buildDivinationPrompt,
  buildIntelligentFallbackInterpretation,
  interpretWithAi
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
assert(userPrompt.includes('开拓新市场'), '用户Prompt必须包含用户亲笔问题')
assert(userPrompt.includes(cast.ben.name), '用户Prompt必须包含本卦名称')
console.log('✔ AI 神机 Prompt 深度聚焦组装测试通过')

// 2. 测试智能理数兜底推演（高度聚焦）
const fallbackResult = buildIntelligentFallbackInterpretation({
  question: '今年下半年开拓新市场是否合适？',
  cast
})

assert(fallbackResult.summary, '必须有神机总断')
assert(fallbackResult.jiyuExplain.includes('开拓新市场'), '偈语解释必须靶向出现问卦者的具体标的')
assert(fallbackResult.jiyuExplain.includes('今年下半年') || fallbackResult.jiyuExplain.includes('时间节律'), '必须有时间节律回应')
assert(fallbackResult.jiyuExplain.includes('当下第一步破局先手'), '必须有具体先手动作指引')
assert(fallbackResult.guaExplain, '必须包含卦象解释')
assert(Array.isArray(fallbackResult.jiyu) && fallbackResult.jiyu.length === 4, '必须包含四句趋吉避凶神机偈语')
console.log('✔ 智能理数兜底推演高度聚焦测试通过')
console.log('总断概要:', fallbackResult.summary)
console.log('偈语解释:\n' + fallbackResult.jiyuExplain)
console.log('四句偈语:\n' + fallbackResult.jiyu.join('\n'))

// 3. 测试对外主入口 interpretWithAi
interpretWithAi({
  question: '明年换工作跳槽是否合适？',
  cast
}).then(res => {
  assert(res.summary, '异步主入口必须返回有效解卦结果')
  assert(res.directAnswer, '统一主入口必须包含针对具体问题的落地指引')
  assert(res.jiyuExplain, '统一主入口必须包含偈语解释')
  assert(res.guaExplain, '统一主入口必须包含卦象解释')
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
