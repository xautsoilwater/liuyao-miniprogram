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
} = require('../data/bagua')
const { getGuaCi } = require('../data/guaci')
const { buildCalendar, wangshuaiOf, isKongWang, ZHI_WUXING } = require('./ganzhi')
const {
  analyzeChange,
  fanFuYin,
  dayMonthFlags,
  findSanHe,
  LIUSHEN_MEANING,
  isChong,
  isHe,
  relationWuxing
} = require('./rules')

function linesKey(lines) {
  return lines.map((v) => (v ? '1' : '0')).join('')
}

function getGuaName(lines) {
  const key = linesKey(lines)
  return GUA64_NAMES[key] || { name: '未知卦', alias: '未知' }
}

function findPalace(lines) {
  const key = linesKey(lines)
  const palaceKeys = Object.keys(PALACES)
  for (let i = 0; i < palaceKeys.length; i += 1) {
    const pk = palaceKeys[i]
    const palace = PALACES[pk]
    for (let j = 0; j < palace.gua.length; j += 1) {
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

function buildLiushen(dayGan) {
  const start = DAY_GAN_LIUSHEN_START[dayGan] || 0
  return YAO_NAMES.map((_, idx) => LIUSHEN[(start + idx) % 6])
}

function najiaAt(trigramKey, idx) {
  return (NAJIA[trigramKey] || NAJIA.qian)[idx]
}

function buildYaoList(lines, changingFlags, palace, calendar) {
  const lowerKey = linesToTrigramKey(lines.slice(0, 3))
  const upperKey = linesToTrigramKey(lines.slice(3, 6))
  const liushen = buildLiushen(calendar.day.gan)
  const monthZhi = calendar.month.zhi

  return lines.map((yinYang, idx) => {
    const nj = idx < 3 ? najiaAt(lowerKey, idx) : najiaAt(upperKey, idx)
    const changing = !!(changingFlags && changingFlags[idx])
    const zhi = nj.zhi
    const kong = isKongWang(zhi, calendar.kongwang)
    const wangshuai = wangshuaiOf(nj.wuxing, monthZhi)
    const dm = dayMonthFlags({ zhi }, calendar)
    const liushenName = liushen[idx]
    return {
      index: idx,
      name: `${YAO_NAMES[idx]}${yinYang ? '九' : '六'}`,
      shortName: YAO_NAMES[idx],
      yinYang,
      symbol: yinYang ? '━━━━━' : '━━　━━',
      mark: changing ? (yinYang ? '○' : '×') : '',
      changing,
      gan: nj.gan,
      zhi,
      ganZhi: `${nj.gan}${nj.zhi}`,
      wuxing: nj.wuxing,
      liuqin: liuqinOf(palace.palaceWuxing, nj.wuxing),
      liushen: liushenName,
      liushenMeaning: LIUSHEN_MEANING[liushenName] || '',
      role: idx === palace.shiPos ? '世' : idx === palace.yingPos ? '应' : '',
      kong,
      wangshuai,
      dayMonth: dm,
      tags: [kong ? '空' : '', wangshuai, ...dm.tags].filter(Boolean),
      tagText: [kong ? '空' : '', wangshuai, ...dm.tags].filter(Boolean).join('')
    }
  })
}

function buildGuaDetail(lines, changingFlags, calendar, palaceHint) {
  const info = getGuaName(lines)
  const palace = palaceHint || findPalace(lines)
  const lowerKey = linesToTrigramKey(lines.slice(0, 3))
  const upperKey = linesToTrigramKey(lines.slice(3, 6))
  const yaosBottomUp = buildYaoList(lines, changingFlags, palace, calendar)

  return {
    lines,
    name: info.name,
    alias: info.alias,
    lower: TRIGRAMS[lowerKey],
    upper: TRIGRAMS[upperKey],
    palaceKey: palace.palaceKey,
    palaceName: palace.palaceName,
    palaceWuxing: palace.palaceWuxing,
    palaceIndex: palace.index,
    shiPos: palace.shiPos,
    yingPos: palace.yingPos,
    yaos: yaosBottomUp.slice().reverse(),
    yaosBottomUp
  }
}

/** 本宫八纯卦六爻（下到上），用于伏神 */
function buildPalacePureYaos(palaceKey, palaceWuxing) {
  const pureLines = PALACES[palaceKey].gua[0]
  const trigramKey = palaceKey
  return pureLines.map((yinYang, idx) => {
    const nj = najiaAt(trigramKey, idx)
    return {
      index: idx,
      name: `${YAO_NAMES[idx]}${yinYang ? '九' : '六'}`,
      yinYang,
      ganZhi: `${nj.gan}${nj.zhi}`,
      zhi: nj.zhi,
      wuxing: nj.wuxing,
      liuqin: liuqinOf(palaceWuxing, nj.wuxing)
    }
  })
}

/**
 * 伏神：用神未现时，取本宫纯卦中该六亲，伏于本卦同位飞神之下
 */
function findFushen(ben, liuqinName, calendar) {
  if (!liuqinName || liuqinName === '世爻') return null
  const present = ben.yaosBottomUp.some((y) => y.liuqin === liuqinName)
  if (present) return null
  const pure = buildPalacePureYaos(ben.palaceKey, ben.palaceWuxing)
  const fu = pure.find((y) => y.liuqin === liuqinName)
  if (!fu) return null
  const fei = ben.yaosBottomUp[fu.index]
  return {
    liuqin: fu.liuqin,
    ganZhi: fu.ganZhi,
    wuxing: fu.wuxing,
    posName: fu.name,
    index: fu.index,
    feishen: {
      liuqin: fei.liuqin,
      ganZhi: fei.ganZhi,
      wuxing: fei.wuxing,
      name: fei.name,
      role: fei.role
    },
    kong: isKongWang(fu.zhi, calendar.kongwang),
    wangshuai: wangshuaiOf(fu.wuxing, calendar.month.zhi),
    text: `${fu.liuqin}${fu.ganZhi}${fu.wuxing}伏于${fei.name}${fei.liuqin}${fei.ganZhi}下`
  }
}

function attachChangeInfo(ben, bian) {
  if (!bian) return
  const bianMap = {}
  bian.yaosBottomUp.forEach((y) => {
    bianMap[y.index] = y
  })
  ben.yaosBottomUp.forEach((y) => {
    if (!y.changing) return
    const to = bianMap[y.index]
    if (!to) return
    const analysis = analyzeChange(y, to)
    y.changeTo = {
      ganZhi: to.ganZhi,
      zhi: to.zhi,
      wuxing: to.wuxing,
      liuqin: to.liuqin,
      name: to.name,
      wangshuai: to.wangshuai,
      kong: to.kong,
      analysis,
      jinTui: analysis && analysis.jinTui,
      text: analysis ? analysis.text : `化${to.liuqin}${to.ganZhi}${to.wuxing}`
    }
  })
  ben.yaos.forEach((y) => {
    const src = ben.yaosBottomUp[y.index]
    y.changeTo = src.changeTo
  })
}

/** 变爻六亲按本宫五行论（纳甲随变卦，世应仍用变卦宫位） */
function applyBenPalaceLiuqin(bian, palaceWuxing) {
  if (!bian || !palaceWuxing) return
  const fix = (y) => {
    y.liuqin = liuqinOf(palaceWuxing, y.wuxing)
  }
  bian.yaosBottomUp.forEach(fix)
  bian.yaos.forEach(fix)
}

function buildRelations(ben) {
  const yaos = ben.yaosBottomUp
  const moving = yaos.filter((y) => y.changing)
  const links = []
  for (let i = 0; i < moving.length; i += 1) {
    for (let j = 0; j < yaos.length; j += 1) {
      const a = moving[i]
      const b = yaos[j]
      if (a.index === b.index) continue
      if (isChong(a.zhi, b.zhi)) links.push({ type: '冲', from: a, to: b, text: `${a.name}冲${b.name}` })
      if (isHe(a.zhi, b.zhi)) links.push({ type: '合', from: a, to: b, text: `${a.name}合${b.name}` })
      const rel = relationWuxing(a.wuxing, b.wuxing)
      if (rel === '生' || rel === '克') {
        links.push({ type: rel, from: a, to: b, text: `动${a.name}${rel}${b.name}${b.liuqin}` })
      }
    }
  }
  const sanhe = findSanHe(yaos.map((y) => y.zhi))
  const dayLinks = yaos
    .map((y) => {
      const tags = (y.dayMonth && y.dayMonth.tags) || []
      if (!tags.length) return null
      return { yao: y, tags, text: `${y.name}${y.ganZhi}${tags.join('、')}` }
    })
    .filter(Boolean)
  return { links, sanhe, dayLinks }
}

function yaosToLines(yaos) {
  return yaos.map((y) => y.yinYang)
}

function buildChangedLines(yaos) {
  return yaos.map((y) => (y.changing ? 1 - y.yinYang : y.yinYang))
}

const PALACE_STAGE = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂']

const LIUQIN_PLAIN = {
  父母: '多主长辈、文书、房屋、庇护',
  兄弟: '多主同辈、竞争、分利耗财',
  子孙: '多主晚辈、医药、解忧，也能生财',
  妻财: '多主钱财、所求之物；男测亦常指对方',
  官鬼: '多主官职、压力、病症；女测亦常指夫星'
}

const WANG_PLAIN = {
  旺: '力气很足',
  相: '力气较足',
  休: '力气一般',
  囚: '力气偏弱',
  死: '力气很弱'
}

const STAGE_PLAIN = {
  本宫: '本宫起始，事体较「正」、根基在本宫',
  一世: '一世卦，变化刚起头',
  二世: '二世卦，变化推进一层',
  三世: '三世卦，变化到中段',
  四世: '四世卦，变化偏深',
  五世: '五世卦，接近转折',
  游魂: '游魂卦，常主游离、未定、心神外驰',
  归魂: '归魂卦，常主回归、收束、回到本宫气'
}

/**
 * 针对本卦例，生成排盘说明（专业说法并附说明；教学用）
 */
function buildPaipanGuide(cast) {
  if (!cast || !cast.ben) return []
  const { ben, bian, calendar, changingIndexes, fushenMap } = cast
  const sections = []
  const ci = getGuaCi(ben.alias)
  const shi = ben.yaosBottomUp.find((y) => y.role === '世')
  const ying = ben.yaosBottomUp.find((y) => y.role === '应')
  const movers = ben.yaosBottomUp.filter((y) => y.changing)
  const stage = PALACE_STAGE[ben.palaceIndex] || '本宫'

  // 0. 先看懂
  const lead = []
  lead.push(
    `先说这张盘：本卦是「${ben.name}」${ben.alias && ben.alias !== ben.name ? `（也叫「${ben.alias}」）` : ''}，下面「${ben.lower.symbol}${ben.lower.name}」、上面「${ben.upper.symbol}${ben.upper.name}」。`
  )
  lead.push(
    '下面三爻叫内卦（多主内里、自己这边），上面三爻叫外卦（多主外面、对方或环境）。两卦叠在一起，才是完整的六爻卦。'
  )
  if (movers.length) {
    lead.push(
      `这一卦有动爻：${movers.map((y) => `${y.name}${y.mark}`).join('、')}。动爻会阴阳对换，变出变卦「${bian ? bian.name : '—'}」。`
    )
    lead.push('本卦看眼下起点，变卦看往后怎么走；动爻是变化的关键，宜优先看。')
  } else {
    lead.push('这一卦六爻都没发动，没有另立变卦。')
    lead.push('局面相对稳，变化慢；重点看世应、用神和日月力量。')
  }
  if (shi) lead.push(`世爻在${shi.name}，代表你自己；应爻在${ying ? ying.name : '—'}，多代表对方或事体。`)
  lead.push('下面按「象辞 → 动变 → 世应纳甲 → 历日六神」分步说明；术语旁会附简短说明。')
  sections.push({ title: '先看懂这张盘', items: lead })

  // 1. 卦象与卦名
  const xiangItems = []
  xiangItems.push(
    `内卦「${ben.lower.symbol}${ben.lower.name}」：象${ben.lower.nature}，五行${ben.lower.wuxing}；外卦「${ben.upper.symbol}${ben.upper.name}」：象${ben.upper.nature}，五行${ben.upper.wuxing}。叠成「${ben.name}」。`
  )
  if (ci && ci.nameWhy) {
    xiangItems.push(ci.nameWhy)
  } else {
    xiangItems.push(
      `外${ben.upper.nature}、内${ben.lower.nature}相重，传统就用这个象来称呼本卦，再连到卦德与人事。`
    )
  }
  xiangItems.push(
    '先弄清「象」再读辞。象像一幅画——画没看清，后面的卦辞、爻辞和六亲就没有着落；别只看卦名两个字就断吉凶。'
  )
  sections.push({ title: '卦象与卦名', items: xiangItems })

  // 2. 卦辞
  if (ci && ci.guaci) {
    sections.push({
      title: '卦辞',
      items: [
        `《${ben.alias || ben.name}》卦辞：${ci.guaci}`,
        '卦辞是整卦的总提示，像开场白。占事时要和动爻、用神一起看，别单独摘一句当结论。'
      ]
    })
  }

  // 3. 爻辞
  if (ci && ci.yaoci && ci.yaoci.length) {
    const yaoItems = []
    if (movers.length) {
      yaoItems.push('六爻各有爻辞。动爻是变化关键，宜先读标了【动】的；静爻用来看全局时位。')
      yaoItems.push('【动】=这一爻正在变，最要紧；世=你，应=对方/事体。')
    } else {
      yaoItems.push('本卦六爻俱静，可通读六爻爻辞，看各阶段的进退；断事仍重世应、用神与日月。')
      yaoItems.push('没有动爻时，爻辞帮你理解「处在哪一步」；具体吉凶还要回到盘面数术。')
    }
    ben.yaosBottomUp.forEach((y, i) => {
      const line = ci.yaoci[i] || ''
      if (!line) return
      const tag = y.changing ? '【动】' : ''
      let role = ''
      if (y.role === '世') role = '（世·你）'
      else if (y.role === '应') role = '（应·对方/事体）'
      yaoItems.push(`${tag}${line}${role}`)
    })
    sections.push({ title: '爻辞', items: yaoItems })
  }

  // 4. 动爻与变卦
  const moveItems = []
  if (!movers.length) {
    moveItems.push('无老阳、老阴，六爻俱静，不另立变卦。')
    moveItems.push('辞象以本卦卦爻辞为主；力量与趋向则看世应、用神旺衰、日月生克。')
  } else {
    moveItems.push(
      `发动之爻：${movers.map((y) => `${y.name}${y.mark}`).join('、')}。动爻阴阳对换，得到变卦。`
    )
    moveItems.push('通例是「本卦看开始，变卦看结局与走向」。')
    if (bian) {
      moveItems.push(
        `变卦为「${bian.name}」：内${bian.lower.symbol}${bian.lower.name}（${bian.lower.nature}），外${bian.upper.symbol}${bian.upper.name}（${bian.upper.nature}）。`
      )
      const bianCi = getGuaCi(bian.alias)
      if (bianCi && bianCi.nameWhy) moveItems.push(`变卦取象：${bianCi.nameWhy}`)
      if (bianCi && bianCi.guaci) {
        moveItems.push(`变卦《${bian.alias || bian.name}》卦辞：${bianCi.guaci}`)
        moveItems.push('变卦卦辞提示「往后可能变成什么样」，宜与本卦对照读。')
      }
      movers.forEach((y) => {
        if (y.changeTo) {
          moveItems.push(`${y.name}动而化出：${y.changeTo.text}。`)
          const a = y.changeTo.analysis
          if (a && a.huiTou) {
            if (a.huiTou.type === '回头生') moveItems.push('变爻回头来生它，像自己给自己加油，偏顺。')
            if (a.huiTou.type === '回头克') moveItems.push('变爻回头来克它，像自己给自己添堵，偏滞。')
          }
          if (a && a.jinTui) {
            if (a.jinTui.type === '化进神') moveItems.push('化进神，事有向前推进的意思。')
            if (a.jinTui.type === '化退神') moveItems.push('化退神，事有回缩、放缓的意思。')
          }
        }
      })
    }
  }
  sections.push({ title: '动爻与变卦', items: moveItems })

  // 5. 八宫与世应
  const palaceItems = []
  palaceItems.push(
    `本卦「${ben.name}」属「${ben.palaceName}宫」（五行${ben.palaceWuxing}），宫次「${stage}」。${STAGE_PLAIN[stage] || ''}`
  )
  palaceItems.push(
    '八宫像八个「家族」，六十四卦各归一家。宫次告诉你这卦在本宫演变链条里走到哪一步；世爻随宫次移动，应爻与世爻隔两位。'
  )
  if (shi) {
    const wang = shi.wangshuai ? WANG_PLAIN[shi.wangshuai] || shi.wangshuai : ''
    palaceItems.push(
      `世爻（你）在${shi.name}：临${shi.liuqin}${shi.ganZhi}${shi.wuxing}${shi.kong ? '，逢空' : ''}${wang ? '，月令' + wang : ''}。`
    )
    palaceItems.push(
      `世爻=你自己。${LIUQIN_PLAIN[shi.liuqin] || ''}${shi.kong ? '；空亡表示眼下还不踏实。' : '。'}`
    )
  }
  if (ying) {
    const wang = ying.wangshuai ? WANG_PLAIN[ying.wangshuai] || ying.wangshuai : ''
    palaceItems.push(
      `应爻（对方/事体）在${ying.name}：临${ying.liuqin}${ying.ganZhi}${ying.wuxing}${ying.kong ? '，逢空' : ''}${wang ? '，月令' + wang : ''}。`
    )
    palaceItems.push(
      `应爻多指对方、环境或你问的那件事本身。${LIUQIN_PLAIN[ying.liuqin] || ''}`
    )
  }
  sections.push({ title: '八宫与世应', items: palaceItems })

  // 6. 纳甲与六亲
  const najiaItems = []
  najiaItems.push(
    `纳甲：内卦「${ben.lower.name}」装初、二、三爻，外卦「${ben.upper.name}」装四、五、上爻；以本宫五行「${ben.palaceWuxing}」为「我」，再定六亲。`
  )
  najiaItems.push(
    '纳甲=给每一爻配上天干地支。六亲=这爻相对「我」是什么角色（父母、兄弟、子孙、妻财、官鬼）。'
  )
  ben.yaosBottomUp.forEach((y) => {
    const role =
      y.role === '世' ? '（世·你）' : y.role === '应' ? '（应·对方/事体）' : ''
    const tags = y.tags && y.tags.length ? `；${y.tags.join('、')}` : ''
    const wang = y.wangshuai ? `，${WANG_PLAIN[y.wangshuai] || y.wangshuai}` : ''
    najiaItems.push(
      `${y.name}：${y.ganZhi}${y.wuxing}，六亲「${y.liuqin}」${role}${y.kong ? '，空' : ''}${wang}${tags}。`
    )
    najiaItems.push(`→ ${LIUQIN_PLAIN[y.liuqin] || '六亲角色见上'}。`)
  })
  sections.push({ title: '纳甲与六亲', items: najiaItems })

  // 7. 六神与历日
  const calItems = []
  if (calendar) {
    calItems.push(
      `历日：${calendar.year.text}年、${calendar.month.text}月、${calendar.day.text}日；旬空「${calendar.kongwang.text}」。`
    )
    if (calendar.calendarNote) calItems.push(`历法提示：${calendar.calendarNote}。`)
    calItems.push(
      '旬空=这旬里「落空」的两个地支，临空的爻常主虚而不实，要等冲实或出旬才踏实。'
    )
    calItems.push(
      `六神（从日干「${calendar.day.gan}」起）：${ben.yaosBottomUp.map((y) => `${y.shortName}${y.liushen}`).join('、')}。`
    )
    calItems.push(
      '六神是象意标签（如朱雀多主文书口舌，玄武多主隐匿），要和用神、动爻一起看，不能单独定吉凶。'
    )
    calItems.push(
      '月令定旺衰（力气大小）；爻旁若标「临日/临月」「冲/合」，用来权衡力量与大概何时有动静。'
    )
  } else {
    calItems.push('六神依日干而起；月令定旺衰，旬空看虚实。详见盘面标示。')
  }
  sections.push({ title: '六神与历日', items: calItems })

  // 8. 伏神
  const fuKeys = fushenMap ? Object.keys(fushenMap) : []
  if (fuKeys.length) {
    const fuItems = [
      `有的六亲没直接出现在盘上，就从本宫「${ben.palaceName}」纯卦里取出，伏在同位「飞神」下面，叫伏神。`,
      '伏神=目标或角色还藏着、没上台面；飞神=盖在它上面的那一爻。等飞神被冲开，或岁月引出伏神，事情更容易露出来。'
    ]
    fuKeys.forEach((k) => {
      const fu = fushenMap[k]
      fuItems.push(
        `「${k}」伏藏：${fu.text}${fu.kong ? '（伏空·更不踏实）' : ''}${fu.wangshuai ? '，' + (WANG_PLAIN[fu.wangshuai] || fu.wangshuai) : ''}。${LIUQIN_PLAIN[k] ? '（' + LIUQIN_PLAIN[k] + '）' : ''}`
      )
    })
    sections.push({ title: '伏神', items: fuItems })
  } else {
    sections.push({
      title: '伏神',
      items: [
        '本卦常见六亲都已出现（或未另取伏）。',
        '若断卦时发现用神不在盘上，再按本宫去查有没有伏藏。'
      ]
    })
  }

  // 9. 读盘提示
  sections.push({
    title: '读盘提示',
    items: [
      '建议顺序：先看卦象与卦名 → 读卦辞、动爻爻辞 → 看变卦 → 再落世应、纳甲六亲、日月六神。',
      '辞象帮你懂「是什么局面」，数术帮你估「力量与时机」。两边合参，比单抓一句断语更稳。',
      '盘面从上往下是上爻到初爻。具体吉凶要到「断卦」里取用神再推；这里的解读供对照学习，不作绝对预言。'
    ]
  })

  return sections
}


function arrangeCast(yaos, options = {}) {
  if (
    !Array.isArray(yaos)
    || yaos.length !== 6
    || yaos.some((y) => !y || (y.yinYang !== 0 && y.yinYang !== 1) || typeof y.changing !== 'boolean')
  ) {
    throw new Error('排卦必须提供从初爻到上爻的六个有效爻象')
  }
  const date = options.date ? new Date(options.date) : new Date()
  if (Number.isNaN(date.getTime())) throw new Error('起卦时间无效')
  const question = options.question || ''
  const askMeta = options.askMeta || null
  const calendar = buildCalendar(date)
  const changingFlags = yaos.map((y) => y.changing)
  const benLines = yaosToLines(yaos)
  const bianLines = buildChangedLines(yaos)
  const changingIndexes = []
  changingFlags.forEach((c, i) => {
    if (c) changingIndexes.push(i)
  })

  const palace = findPalace(benLines)
  const ben = buildGuaDetail(benLines, changingFlags, calendar, palace)
  const bian =
    changingIndexes.length > 0
      ? buildGuaDetail(bianLines, [false, false, false, false, false, false], calendar)
      : null
  // 变卦名/世应按变卦宫；变爻六亲与动化按本宫
  applyBenPalaceLiuqin(bian, ben.palaceWuxing)
  attachChangeInfo(ben, bian)

  const fushenMap = {}
  ;['父母', '兄弟', '子孙', '妻财', '官鬼'].forEach((name) => {
    const fu = findFushen(ben, name, calendar)
    if (fu) fushenMap[name] = fu
  })

  const relations = buildRelations(ben)
  const yinPattern = fanFuYin(ben, bian)
  const guide = buildPaipanGuide({
    createdAt: date.toISOString(),
    question,
    calendar,
    rawYaos: yaos,
    changingIndexes,
    ben,
    bian,
    fushenMap,
    relations,
    yinPattern
  })

  return {
    createdAt: date.toISOString(),
    question,
    askMeta,
    calendar,
    dayGan: calendar.day.gan,
    dayPillar: calendar.day.text,
    monthPillar: calendar.month.text,
    yearPillar: calendar.year.text,
    kongwang: calendar.kongwang,
    rawYaos: yaos,
    changingIndexes,
    ben,
    bian,
    fushenMap,
    relations,
    yinPattern,
    guide
  }
}

module.exports = {
  arrangeCast,
  buildPaipanGuide,
  buildGuaDetail,
  getGuaName,
  linesKey,
  findFushen,
  liuqinOf,
  ZHI_WUXING,
  WUXING_SHENG,
  WUXING_KE
}
