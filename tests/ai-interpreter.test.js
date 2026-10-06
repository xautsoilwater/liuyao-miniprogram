const assert = require('assert')
const {
  cleanAiMarkdown,
  buildDivinationPrompt,
  buildIntelligentFallbackInterpretation,
  interpretWithAi
} = require('../utils/ai-interpreter')
const { manualYao } = require('../utils/coin')
const { arrangeCast } = require('../utils/paipan')
const { buildCalendar } = require('../utils/ganzhi')

console.log('Testing AI Interpreter module...')

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

// 1. 测试 Prompt 构建
const { systemPrompt, userPrompt } = buildDivinationPrompt({
  question: '今年下半年申报科研基金能否顺利获批？',
  cast
})

assert(systemPrompt.includes('京房易传'), '系统Prompt应包含经典易书背景')
assert(userPrompt.includes('科研基金'), '用户Prompt必须包含用户亲笔问题')
assert(userPrompt.includes(cast.ben.name), '用户Prompt必须包含本卦名称')
console.log('✔ AI 神机 Prompt 组装测试通过')

// 2. 测试智能理数兜底推演
const fallbackResult = buildIntelligentFallbackInterpretation({
  question: '今年下半年申报科研基金能否顺利获批？',
  cast
})

assert(fallbackResult.summary, '必须有神机总断')
assert(fallbackResult.directAnswer, '必须包含针对具体问题的相对具体回答')
assert(Array.isArray(fallbackResult.jiyu) && fallbackResult.jiyu.length === 4, '必须包含四句趋吉避凶神机偈语')
assert(fallbackResult.yongshen, '必须有用神爻象探微')
assert(fallbackResult.yingqi, '必须有机运应期推演')
assert(fallbackResult.advice, '必须有周易明理之道')
console.log('✔ 智能理数兜底推演测试通过')
console.log('总断概要:', fallbackResult.summary)
console.log('针对答复:', fallbackResult.directAnswer)
console.log('四句偈语:\n' + fallbackResult.jiyu.join('\n'))

// 3. 测试对外主入口 interpretWithAi
interpretWithAi({
  question: '明年换工作跳槽是否合适？',
  cast
}).then(res => {
  assert(res.summary, '异步主入口必须返回有效解卦结果')
  assert(res.directAnswer, '统一主入口必须包含针对具体问题的落地指引')
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
