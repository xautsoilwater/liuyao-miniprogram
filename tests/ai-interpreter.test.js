const assert = require('assert')
const {
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
assert(fallbackResult.yongshen, '必须有用神爻象探微')
assert(fallbackResult.yingqi, '必须有机运应期推演')
assert(fallbackResult.advice, '必须有周易明理之道')
console.log('✔ 智能理数兜底推演测试通过')
console.log('总断概要:', fallbackResult.summary)
console.log('用神分析:', fallbackResult.yongshen)

// 3. 测试对外主入口 interpretWithAi
interpretWithAi({
  question: '明年换工作跳槽是否合适？',
  cast
}).then(res => {
  assert(res.summary, '异步主入口必须返回有效解卦结果')
  console.log('✔ 统一主入口 interpretWithAi 测试通过')
  console.log('All AI interpreter tests passed successfully!')
}).catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
