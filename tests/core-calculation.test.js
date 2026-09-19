const assert = require('assert')

const {
  TRIGRAMS,
  NAJIA,
  PALACES,
  GUA64_NAMES,
  WUXING_SHENG
} = require('../data/bagua')
const { manualYao, fromScore } = require('../utils/coin')
const { arrangeCast } = require('../utils/paipan')
const { castByNumbers, castByTime, tiYongVerdict, solarToLunar } = require('../utils/meihua')
const { buildCalendar, getMonthZhi } = require('../utils/ganzhi')
const { huaJinTui, fanFuYin } = require('../utils/rules')
const { TIME_SCOPES, listGroups, buildAskSelection } = require('../utils/ask-options')
const { TOPIC_YONGSHEN, interpret } = require('../utils/duangu')

const FIXED_DATE = new Date(2026, 6, 30, 12, 0, 0)

function yaoFromLine(line, changing = false) {
  if (line) return manualYao(changing ? 9 : 7)
  return manualYao(changing ? 6 : 8)
}

function testCoinScores() {
  const expected = {
    6: ['老阴', 0, true, '×'],
    7: ['少阳', 1, false, ''],
    8: ['少阴', 0, false, ''],
    9: ['老阳', 1, true, '○']
  }
  Object.entries(expected).forEach(([score, want]) => {
    const yao = manualYao(Number(score))
    assert.deepStrictEqual(
      [yao.type, yao.yinYang, yao.changing, yao.mark],
      want,
      `铜钱分值 ${score} 映射错误`
    )
    assert.strictEqual(
      yao.coins.reduce((sum, face) => sum + (face === 'yang' ? 3 : 2), 0),
      Number(score),
      `铜钱分值 ${score} 与币面不一致`
    )
  })
}

function testHexagramsAndPalaces() {
  assert.strictEqual(Object.keys(GUA64_NAMES).length, 64, '六十四卦名称表数量错误')
  assert.strictEqual(new Set(Object.values(GUA64_NAMES).map((item) => item.alias)).size, 64, '卦名不唯一')

  const palaceKeys = []
  Object.values(PALACES).forEach((palace) => {
    assert.strictEqual(palace.gua.length, 8, `${palace.name}宫不是八卦`)
    palace.gua.forEach((lines) => palaceKeys.push(lines.join('')))
  })
  assert.strictEqual(palaceKeys.length, 64, '八宫总数错误')
  assert.strictEqual(new Set(palaceKeys).size, 64, '八宫卦象存在重复')
  palaceKeys.forEach((key) => assert.ok(GUA64_NAMES[key], `八宫卦象 ${key} 缺少卦名`))

  palaceKeys.forEach((key) => {
    const lines = key.split('').map(Number)
    for (let movingMask = 0; movingMask < 64; movingMask += 1) {
      const yaos = lines.map((line, index) => yaoFromLine(line, !!(movingMask & (1 << index))))
      const cast = arrangeCast(yaos, { date: FIXED_DATE })
      assert.deepStrictEqual(cast.ben.lines, lines, `本卦爻序错误：${key}`)
      assert.notStrictEqual(cast.ben.name, '未知卦', `本卦未识别：${key}`)
      assert.strictEqual((cast.ben.shiPos + 3) % 6, cast.ben.yingPos, `世应位置错误：${key}`)
      const expectedIndexes = []
      const expected = lines.slice()
      for (let i = 0; i < 6; i += 1) {
        if (movingMask & (1 << i)) {
          expectedIndexes.push(i)
          expected[i] = 1 - expected[i]
        }
      }
      assert.deepStrictEqual(cast.changingIndexes, expectedIndexes, `动爻索引错误：${key} mask=${movingMask}`)
      if (movingMask === 0) {
        assert.strictEqual(cast.bian, null, `静卦不应生成变卦：${key}`)
      } else {
        assert.deepStrictEqual(cast.bian.lines, expected, `动爻翻转错误：${key} mask=${movingMask}`)
        assert.notStrictEqual(cast.bian.name, '未知卦', `变卦未识别：${key} mask=${movingMask}`)
      }
      TOPIC_YONGSHEN.forEach((topic) => {
        const reading = interpret(cast, topic.key)
        const serialized = JSON.stringify(reading)
        assert.ok(reading.summary && reading.judgment && reading.sections.length, `${key} mask=${movingMask} ${topic.key} 断卦输出不完整`)
        assert.doesNotMatch(serialized, /undefined|NaN|未知卦/, `${key} mask=${movingMask} ${topic.key} 断卦出现无效值`)
      })
    }
  })
}

function testNajiaFixtures() {
  const expected = {
    qian: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
    kun: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
    zhen: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
    xun: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
    kan: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
    li: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
    gen: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
    dui: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未']
  }
  Object.entries(expected).forEach(([key, want]) => {
    assert.deepStrictEqual(NAJIA[key].map((item) => `${item.gan}${item.zhi}`), want, `${key}卦纳甲错误`)
  })
}

function testCalendarFixture() {
  const calendar = buildCalendar(FIXED_DATE)
  assert.strictEqual(calendar.year.text, '丙午', '2026-07-30 年柱错误')
  assert.strictEqual(calendar.month.text, '乙未', '2026-07-30 月柱错误')
  assert.strictEqual(calendar.day.text, '乙巳', '2026-07-30 日柱错误')
  assert.strictEqual(calendar.kongwang.text, '寅卯', '乙巳日空亡错误')

  assert.strictEqual(getMonthZhi(new Date(2026, 0, 3, 12)), '子', '小寒前仍应属子月')
  assert.strictEqual(getMonthZhi(new Date(2026, 0, 6, 12)), '丑', '小寒后应属丑月')
  assert.strictEqual(getMonthZhi(new Date(2026, 2, 5, 12)), '寅', '惊蛰交节前仍应属寅月')
  assert.strictEqual(getMonthZhi(new Date(2026, 2, 6, 12)), '卯', '惊蛰交节后应属卯月')

  const beforeLiChun = buildCalendar(new Date(2025, 1, 3, 12))
  const afterLiChun = buildCalendar(new Date(2025, 1, 4, 12))
  assert.strictEqual(beforeLiChun.year.text, '甲辰', '立春前不应提前换干支年')
  assert.strictEqual(afterLiChun.year.text, '乙巳', '立春后应换干支年')
}

function testMeihua() {
  const first = castByNumbers(1, 2, { date: FIXED_DATE })
  assert.strictEqual(first.ben.alias, '履', '报数 1、2 本卦应为履')
  assert.strictEqual(first.dongYao, 3, '报数 1、2 应动三爻')
  assert.strictEqual(first.bian.alias, '乾', '报数 1、2 变卦应为乾')
  assert.strictEqual(first.tiYong.ti.name, '乾', '动爻在下卦时上卦应为体')
  assert.strictEqual(first.tiYong.yong.name, '兑', '动爻在下卦时下卦应为用')

  const second = castByNumbers(8, 8, { date: FIXED_DATE })
  assert.strictEqual(second.ben.alias, '坤', '报数 8、8 本卦应为坤')
  assert.strictEqual(second.dongYao, 4, '报数 8、8 应动四爻')
  assert.strictEqual(second.bian.alias, '豫', '报数 8、8 变卦应为豫')

  ;[['', 2], [0, 2], [-1, 2], [1.5, 2], ['abc', 2]].forEach(([a, b]) => {
    assert.throws(() => castByNumbers(a, b), /两个正整数/, `无效报数 ${a},${b} 未被拒绝`)
  })

  const raw = castByNumbers(11, 23, { date: FIXED_DATE })
  assert.strictEqual(raw.nums.upperSrc, 11, '报数上数不应被余数覆盖')
  assert.strictEqual(raw.nums.lowerSrc, 23, '报数下数不应被余数覆盖')
  assert.strictEqual(raw.nums.upperRemainder, 3, '报数上数除8余数错误')
  assert.strictEqual(raw.nums.lowerRemainder, 7, '报数下数除8余数错误')

  assert.deepStrictEqual(solarToLunar(new Date(2026, 6, 30, 12)), {
    year: 2026, month: 6, day: 17, isLeap: false
  }, '2026-07-30 农历换算错误')
  assert.deepStrictEqual(solarToLunar(new Date(2026, 1, 17, 12)), {
    year: 2026, month: 1, day: 1, isLeap: false
  }, '2026 春节农历换算错误')
  assert.deepStrictEqual(solarToLunar(new Date(2026, 7, 13, 12)), {
    year: 2026, month: 7, day: 1, isLeap: false
  }, '2026-08-13 农历换月错误')

  const byTime = castByTime({ date: FIXED_DATE })
  assert.strictEqual(byTime.nums.yearNum, 7, '丙午农历年应取午数7')
  assert.strictEqual(byTime.nums.monthNum, 6, '时间起卦应取农历六月')
  assert.strictEqual(byTime.nums.dayNum, 17, '时间起卦应取农历十七')
  assert.strictEqual(byTime.ben.alias, '井', '2026-07-30 午时时间起卦本卦错误')
  assert.strictEqual(byTime.dongYao, 1, '2026-07-30 午时时间起卦动爻错误')

  assert.strictEqual(tiYongVerdict('木', '火').tone, 'bad', '体生用应按耗泄论，不应判吉')
  assert.strictEqual(tiYongVerdict('木', '木').tone, 'good', '体用比和传统应判吉')
}

function testInputValidation() {
  assert.throws(() => fromScore(5), /6、7、8 或 9/, '非法铜钱分值未拒绝')
  assert.throws(() => fromScore(9, ['yang', 'yin', 'yin']), /分值与币面不一致/, '分值与币面矛盾未拒绝')
  assert.throws(() => arrangeCast([manualYao(7)], { date: FIXED_DATE }), /六个有效爻象/, '不足六爻未拒绝')
  assert.throws(
    () => arrangeCast([7, 7, 7, 7, 7, 7].map(manualYao), { date: 'not-a-date' }),
    /起卦时间无效/,
    '非法起卦时间未拒绝'
  )
}

function testTopicRules() {
  const map = Object.fromEntries(TOPIC_YONGSHEN.map((item) => [item.key, item]))
  assert.deepStrictEqual(
    [map.career.yongshen, map.career.yuanShen, map.career.jiShen],
    ['官鬼', '妻财', '子孙'],
    '事业元神忌神映射错误'
  )
  assert.deepStrictEqual(
    [map.exam.yongshen, map.exam.yuanShen, map.exam.jiShen],
    ['父母', '官鬼', '妻财'],
    '考试文书元神忌神映射错误'
  )
  assert.strictEqual(map.health.yongshen, '世爻', '自占健康不应把病气官鬼当成正向用神')
  assert.strictEqual(map.marriage.yongshen, '应爻', '未区分性别的感情问事应优先看应爻')
  assert.strictEqual(map.pregnancy.yongshen, '子孙', '孕产问事应以子孙为主要象意')
}

function testStrictFanFuYin() {
  const yao = (zhi) => ({ zhi })
  const ben = { yaosBottomUp: ['子', '丑', '寅', '卯', '辰', '巳'].map(yao) }
  const fiveChong = { yaosBottomUp: ['午', '未', '申', '酉', '戌', '巳'].map(yao) }
  const allChong = { yaosBottomUp: ['午', '未', '申', '酉', '戌', '亥'].map(yao) }
  assert.strictEqual(fanFuYin(ben, fiveChong).fanYin, false, '五爻冲不应冒充完整反吟')
  assert.strictEqual(fanFuYin(ben, allChong).fanYin, true, '六爻皆冲应识别为反吟')
}

function testHuaJinTui() {
  const yao = (zhi) => ({ zhi, ganZhi: zhi, wuxing: ['丑', '辰', '未', '戌'].includes(zhi) ? '土' : '木', liuqin: '兄弟' })
  ;[
    ['寅', '卯'],
    ['丑', '辰'],
    ['辰', '未'],
    ['未', '戌'],
    ['戌', '丑']
  ].forEach(([from, to]) => {
    assert.strictEqual(huaJinTui(yao(from), yao(to)).type, '化进神', `${from}化${to}应为化进神`)
    assert.strictEqual(huaJinTui(yao(to), yao(from)).type, '化退神', `${to}化${from}应为化退神`)
  })
}

function testAllAskOptions() {
  const sampleYaos = [7, 8, 9, 7, 6, 8].map(manualYao)
  const groups = listGroups()
  const validTopicKeys = new Set(TOPIC_YONGSHEN.map((topic) => topic.key))
  assert.strictEqual(groups.length, 17, '所问类别数量应为 17')
  groups.forEach((group) => {
    assert.ok(group.options.length > 0, `${group.label}没有具体事项`)
    group.options.forEach((option) => {
      TIME_SCOPES.forEach((time) => {
        const selected = buildAskSelection(option.id, time.key)
        assert.ok(selected && selected.question && selected.askMeta, `${option.id} 所问组装失败`)
        assert.ok(validTopicKeys.has(selected.topicKey), `${option.id} 指向不存在的断卦类别 ${selected.topicKey}`)
        const cast = arrangeCast(sampleYaos, {
          date: FIXED_DATE,
          question: selected.question,
          askMeta: selected.askMeta
        })
        const reading = interpret(cast, selected.topicKey)
        assert.ok(reading.reply && reading.judgment && reading.advice, `${option.id} 六爻断卦输出不完整`)
        assert.match(reading.advice, /趋吉之道|避凶之道|指迷之要|明理之道|取舍之道|寻人之要/, `${option.id} 六爻缺少趋吉避凶指引`)
        assert.strictEqual(reading.judgment.parsed.mode, selected.askMeta.parsed.mode, `${option.id} 六爻答复形态与所问不一致`)
        assert.strictEqual(reading.judgment.parsed.focus, selected.askMeta.parsed.focus, `${option.id} 六爻答复焦点与所问不一致`)
        if (selected.askMeta.parsed.mode === 'choice') {
          assert.doesNotMatch(reading.reply, /更宜选|宜选「/, `${option.id} 六爻不应按选项顺序武断二选一`)
        }
        const highRiskDomain = ['health', 'pregnancy', 'invest', 'property', 'lawsuit'].includes(selected.askMeta.parsed.domain)
        const lostPerson = selected.askMeta.parsed.domain === 'lost'
          && /寻人|人/.test(String(selected.askMeta.parsed.focus || ''))
        if (highRiskDomain || lostPerson) {
          assert.match(reading.advice, /现实校验/, `${option.id} 六爻高风险事项缺少现实校验`)
          assert.match(reading.summary, /须医学评估|须法律评估|须现实评估|须立即查找/, `${option.id} 六爻高风险标题仍在武断下结论`)
          assert.match(reading.judgment.judgment, /不能|不得|不是医学结论|不等于|须立即/, `${option.id} 六爻高风险判断缺少明确边界`)
        }
        if (selected.askMeta.parsed.negativeEvent) {
          const expectedAnswerTone = reading.judgment.tone === 'good'
            ? 'bad'
            : reading.judgment.tone === 'bad' ? 'good' : 'mid'
          assert.strictEqual(reading.judgment.answerTone, expectedAnswerTone, `${option.id} 六爻负面事件有无语义未反转`)
        }

        const meihua = castByNumbers(11, 23, {
          date: FIXED_DATE,
          question: selected.question,
          askMeta: selected.askMeta
        })
        assert.ok(meihua.reply && meihua.judgment && meihua.advice, `${option.id} 梅花输出不完整`)
        assert.match(meihua.advice, /趋吉之道|避凶之道|指迷之要|明理之道|取舍之道|寻人之要/, `${option.id} 梅花缺少趋吉避凶指引`)
        assert.strictEqual(meihua.parsed.mode, selected.askMeta.parsed.mode, `${option.id} 梅花答复形态与所问不一致`)
        assert.strictEqual(meihua.parsed.focus, selected.askMeta.parsed.focus, `${option.id} 梅花答复焦点与所问不一致`)
        if (selected.askMeta.parsed.mode === 'choice') {
          assert.doesNotMatch(meihua.reply, /更宜选|宜选「/, `${option.id} 梅花不应按选项顺序武断二选一`)
        }
        if (highRiskDomain || lostPerson) {
          assert.match(meihua.advice, /现实校验/, `${option.id} 梅花高风险事项缺少现实校验`)
          assert.match(meihua.verdict.level, /须医学评估|须法律评估|须现实评估|须立即查找/, `${option.id} 梅花高风险标题仍在武断下结论`)
          assert.match(meihua.judgment, /不能|不得|不是医学结论|不等于|须立即/, `${option.id} 梅花高风险判断缺少明确边界`)
        }
      })
    })
  })
}

testCoinScores()
testHexagramsAndPalaces()
testNajiaFixtures()
testCalendarFixture()
testMeihua()
testInputValidation()
testTopicRules()
testStrictFanFuYin()
testHuaJinTui()
testAllAskOptions()

console.log('core-calculation: all checks passed')
