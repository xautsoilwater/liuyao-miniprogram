/* 浏览器预览：铜钱 / 排盘 / 断卦（与小程序 utils 同源思路） */
(function () {
  const {
    TRIGRAMS,
    linesToTrigramKey,
    NAJIA,
    PALACES,
    SHI_POS,
    GUA64_NAMES,
    YAO_NAMES,
    LIUSHEN,
    DAY_GAN_LIUSHEN_START,
    WUXING_SHENG,
    WUXING_KE
  } = window.BaguaData

  function tossThreeCoins() {
    const coins = [0, 1, 2].map(() => (Math.random() < 0.5 ? 'yang' : 'yin'))
    const yangCount = coins.filter((c) => c === 'yang').length
    const score = yangCount * 3 + (3 - yangCount) * 2
    let type, yinYang, changing
    if (score === 9) { type = '老阳'; yinYang = 1; changing = true }
    else if (score === 8) { type = '少阴'; yinYang = 0; changing = false }
    else if (score === 7) { type = '少阳'; yinYang = 1; changing = false }
    else { type = '老阴'; yinYang = 0; changing = true }
    return {
      coins, yangCount, yinCount: 3 - yangCount, score, type, yinYang, changing,
      mark: changing ? (yinYang ? '○' : '×') : ''
    }
  }

  function linesKey(lines) {
    return lines.map((v) => (v ? '1' : '0')).join('')
  }

  function getGuaName(lines) {
    return GUA64_NAMES[linesKey(lines)] || { name: '未知卦', alias: '未知' }
  }

  function findPalace(lines) {
    const key = linesKey(lines)
    for (const pk of Object.keys(PALACES)) {
      const palace = PALACES[pk]
      for (let j = 0; j < palace.gua.length; j++) {
        if (linesKey(palace.gua[j]) === key) {
          return {
            palaceKey: pk,
            palaceName: palace.name,
            palaceWuxing: palace.wuxing,
            index: j,
            shiPos: SHI_POS[j],
            yingPos: (SHI_POS[j] + 3) % 6
          }
        }
      }
    }
    const upper = linesToTrigramKey(lines.slice(3, 6))
    const palace = PALACES[upper]
    return {
      palaceKey: upper,
      palaceName: palace.name,
      palaceWuxing: palace.wuxing,
      index: 0,
      shiPos: 5,
      yingPos: 2
    }
  }

  function liuqinOf(palaceWuxing, yaoWuxing) {
    if (yaoWuxing === palaceWuxing) return '兄弟'
    if (WUXING_SHENG[yaoWuxing] === palaceWuxing) return '父母'
    if (WUXING_SHENG[palaceWuxing] === yaoWuxing) return '子孙'
    if (WUXING_KE[palaceWuxing] === yaoWuxing) return '妻财'
    if (WUXING_KE[yaoWuxing] === palaceWuxing) return '官鬼'
    return '未知'
  }

  function getDayGanRough(date) {
    const gans = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
    const base = new Date(1900, 0, 1).getTime()
    const days = Math.floor((date.getTime() - base) / 86400000)
    return gans[((days % 10) + 10) % 10]
  }

  function buildLiushen(date) {
    const gan = getDayGanRough(date)
    const start = DAY_GAN_LIUSHEN_START[gan] || 0
    return YAO_NAMES.map((_, idx) => LIUSHEN[(start + idx) % 6])
  }

  function buildGuaDetail(lines, changingFlags, date) {
    const info = getGuaName(lines)
    const palace = findPalace(lines)
    const lowerKey = linesToTrigramKey(lines.slice(0, 3))
    const upperKey = linesToTrigramKey(lines.slice(3, 6))
    const lowerNajia = NAJIA[lowerKey]
    const upperNajia = NAJIA[upperKey]
    const liushen = buildLiushen(date)
    const yaos = lines.map((yinYang, idx) => {
      const nj = idx < 3 ? lowerNajia[idx] : upperNajia[idx]
      const changing = !!(changingFlags && changingFlags[idx])
      return {
        index: idx,
        name: `${YAO_NAMES[idx]}${yinYang ? '九' : '六'}`,
        yinYang,
        symbol: yinYang ? '━━━━━' : '━━　━━',
        mark: changing ? (yinYang ? '○' : '×') : '',
        changing,
        ganZhi: `${nj.gan}${nj.zhi}`,
        wuxing: nj.wuxing,
        liuqin: liuqinOf(palace.palaceWuxing, nj.wuxing),
        liushen: liushen[idx],
        role: idx === palace.shiPos ? '世' : idx === palace.yingPos ? '应' : ''
      }
    })
    return {
      lines, name: info.name, alias: info.alias,
      lower: TRIGRAMS[lowerKey], upper: TRIGRAMS[upperKey],
      palaceName: palace.palaceName, palaceWuxing: palace.palaceWuxing,
      shiPos: palace.shiPos, yingPos: palace.yingPos,
      yaos: yaos.slice().reverse()
    }
  }

  function arrangeCast(yaos, options = {}) {
    const date = options.date ? new Date(options.date) : new Date()
    const changingFlags = yaos.map((y) => y.changing)
    const benLines = yaos.map((y) => y.yinYang)
    const bianLines = yaos.map((y) => (y.changing ? 1 - y.yinYang : y.yinYang))
    const changingIndexes = []
    changingFlags.forEach((c, i) => { if (c) changingIndexes.push(i) })
    const ben = buildGuaDetail(benLines, changingFlags, date)
    const bian = changingIndexes.length
      ? buildGuaDetail(bianLines, [0, 0, 0, 0, 0, 0], date)
      : null
    return {
      createdAt: date.toISOString(),
      question: options.question || '',
      dayGan: getDayGanRough(date),
      rawYaos: yaos,
      changingIndexes,
      ben,
      bian
    }
  }

  const TOPIC_YONGSHEN = [
    { key: 'wealth', label: '求财', yongshen: '妻财', tip: '妻财为用，子孙为原神；官鬼克身需察有制否。' },
    { key: 'career', label: '功名官运', yongshen: '官鬼', tip: '官鬼为用，父母为原神；忌子孙发动克官。' },
    { key: 'health', label: '疾病', yongshen: '官鬼', tip: '官鬼为病，子孙为医药；世爻旺相较吉。' },
    { key: 'lawsuit', label: '官司是非', yongshen: '官鬼', tip: '官鬼为官府，朱雀主口舌；宜看世应生克。' },
    { key: 'marriage', label: '婚姻感情', yongshen: '妻财', tip: '男看妻财，女看官鬼；应爻常主对方。' },
    { key: 'travel', label: '出行行人', yongshen: '父母', tip: '父母为文书行程，玄武勾陈参看阻滞。' },
    { key: 'general', label: '综合问事', yongshen: '世爻', tip: '未明事项时，先以世爻为主体，应爻为事体。' }
  ]

  function relation(a, b) {
    if (a === b) return '比和'
    if (WUXING_SHENG[a] === b) return '生'
    if (WUXING_SHENG[b] === a) return '被生'
    if (WUXING_KE[a] === b) return '克'
    if (WUXING_KE[b] === a) return '被克'
    return '无关'
  }

  function interpret(cast, topicKey = 'general') {
    const topic = TOPIC_YONGSHEN.find((t) => t.key === topicKey) || TOPIC_YONGSHEN[TOPIC_YONGSHEN.length - 1]
    const { ben, bian, changingIndexes, question } = cast
    const yongList = topic.yongshen === '世爻'
      ? ben.yaos.filter((y) => y.role === '世')
      : ben.yaos.filter((y) => y.liuqin === topic.yongshen)
    const moving = ben.yaos.filter((y) => y.changing)
    const shi = ben.yaos.find((y) => y.role === '世')
    const ying = ben.yaos.find((y) => y.role === '应')
    const points = []
    points.push(`所问：${question || '未题所问'}。本题按「${topic.label}」取用，用神侧重「${topic.yongshen}」。`)
    points.push(`本卦「${ben.name}」，属${ben.palaceName}宫（${ben.palaceWuxing}）。世在${shi ? shi.name : '—'}，应在${ying ? ying.name : '—'}。`)
    if (!yongList.length) {
      points.push(`用神「${topic.yongshen}」未上卦，传统上多主事体未现、需伏藏或改日再问；亦可先以世应论大势。`)
    } else {
      points.push(`用神现于：${yongList.map((y) => `${y.name}${y.liuqin}${y.ganZhi}${y.wuxing}${y.role ? '（' + y.role + '）' : ''}${y.changing ? '动' : ''}`).join('、')}。`)
    }
    if (!changingIndexes.length) points.push('六爻俱静。宜以用神、世应旺衰与卦宫生克论事，变化较少，事多缓成或局势稳定。')
    else if (changingIndexes.length === 1) {
      const m = moving[0]
      points.push(`一爻独动：${m.name}${m.liuqin}${m.ganZhi}（${m.liushen}）。独动多为此事关键，优先察其生克用神与世爻。`)
    } else points.push(`共有 ${changingIndexes.length} 爻发动。宜合看动爻之间生克、以及动化对用神的生扶或克损，不可只盯一爻。`)
    moving.forEach((m) => {
      yongList.forEach((y) => {
        if (m.index === y.index) return
        const rel = relation(m.wuxing, y.wuxing)
        if (rel === '生') points.push(`动爻${m.name}生用神${y.name}，传统上多主有助、事体得生扶。`)
        if (rel === '克') points.push(`动爻${m.name}克用神${y.name}，传统上多主阻碍、压力或损耗，需看有无解救。`)
      })
    })
    if (shi && ying) points.push(`世（${shi.wuxing}）与应（${ying.wuxing}）关系为「${relation(shi.wuxing, ying.wuxing)}」，可辅助判断主客、彼我之势。`)
    if (bian) points.push(`动而化成变卦「${bian.name}」。本卦看事始，变卦看事终与发展方向。`)
    points.push(topic.tip)
    points.push('说明：以上为传统六爻规则化提示，供学习与参考，不作绝对吉凶承诺。')
    return {
      topic, yongList, points,
      summary: !changingIndexes.length ? '静卦为主，重用神与世应。'
        : changingIndexes.length === 1 ? '一爻动，抓住独动与用神关系。'
          : '多爻动，综合生克与变卦趋向。'
    }
  }

  const ARTICLES = [
    { id: 'coin-method', category: '卜卦', title: '三枚铜钱卜卦法', summary: '传统摇钱成爻，自下而上，六次成卦。', content: ['准备三枚铜钱。心中默念所问之事。', '字为阳、背为阴：三阳老阳○，两阳一阴少阴，一阳两阴少阳，三阴老阴×。', '六次成卦；动爻变出变卦。'] },
    { id: 'yao-types', category: '基础', title: '老少阴阳与动爻', summary: '少阳少阴为静，老阳老阴为动。', content: ['少阳少阴静，老阳老阴动。', '动爻是断卦重心；无动爻则以世爻、用神旺衰论。'] },
    { id: 'shiying', category: '排盘', title: '世应与八宫', summary: '世为自己，应为对方或所问之方。', content: ['八宫统六十四卦。世为自己，应对外方。'] },
    { id: 'liuqin', category: '排盘', title: '六亲取用', summary: '父母、兄弟、子孙、妻财、官鬼。', content: ['以卦宫五行为我：生我父母，同我兄弟，我生子孙，我克妻财，克我官鬼。'] },
    { id: 'duan-basic', category: '断卦', title: '断卦入门次序', summary: '先定用神，再看动变生克。', content: ['取用神 → 看动爻 → 合参世应六神 → 结论留有余地。'] }
  ]

  window.LiuYao = {
    tossThreeCoins,
    arrangeCast,
    interpret,
    TOPIC_YONGSHEN,
    ARTICLES
  }
})()
