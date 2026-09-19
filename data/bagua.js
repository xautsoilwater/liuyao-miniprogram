/**
 * 八卦与五行基础数据
 * 爻位约定：数组下标 0 = 初爻（最下），5 = 上爻（最上）
 */

const TRIGRAMS = {
  qian: { key: 'qian', name: '乾', symbol: '☰', nature: '天', wuxing: '金', lines: [1, 1, 1] },
  dui: { key: 'dui', name: '兑', symbol: '☱', nature: '泽', wuxing: '金', lines: [1, 1, 0] },
  li: { key: 'li', name: '离', symbol: '☲', nature: '火', wuxing: '火', lines: [1, 0, 1] },
  zhen: { key: 'zhen', name: '震', symbol: '☳', nature: '雷', wuxing: '木', lines: [1, 0, 0] },
  xun: { key: 'xun', name: '巽', symbol: '☴', nature: '风', wuxing: '木', lines: [0, 1, 1] },
  kan: { key: 'kan', name: '坎', symbol: '☵', nature: '水', wuxing: '水', lines: [0, 1, 0] },
  gen: { key: 'gen', name: '艮', symbol: '☶', nature: '山', wuxing: '土', lines: [0, 0, 1] },
  kun: { key: 'kun', name: '坤', symbol: '☷', nature: '地', wuxing: '土', lines: [0, 0, 0] }
}

const TRIGRAM_ORDER = ['kun', 'zhen', 'kan', 'dui', 'gen', 'li', 'xun', 'qian']

function linesToTrigramKey(lines) {
  const code = lines.map((v) => (v ? '1' : '0')).join('')
  const map = {
    '111': 'qian',
    '110': 'dui',
    '101': 'li',
    '100': 'zhen',
    '011': 'xun',
    '010': 'kan',
    '001': 'gen',
    '000': 'kun'
  }
  return map[code]
}

/** 纳甲：乾内甲子乙丑… 简化用八宫纳甲常用表 */
const NAJIA = {
  qian: [
    { gan: '甲', zhi: '子', wuxing: '水' },
    { gan: '甲', zhi: '寅', wuxing: '木' },
    { gan: '甲', zhi: '辰', wuxing: '土' },
    { gan: '壬', zhi: '午', wuxing: '火' },
    { gan: '壬', zhi: '申', wuxing: '金' },
    { gan: '壬', zhi: '戌', wuxing: '土' }
  ],
  kun: [
    { gan: '乙', zhi: '未', wuxing: '土' },
    { gan: '乙', zhi: '巳', wuxing: '火' },
    { gan: '乙', zhi: '卯', wuxing: '木' },
    { gan: '癸', zhi: '丑', wuxing: '土' },
    { gan: '癸', zhi: '亥', wuxing: '水' },
    { gan: '癸', zhi: '酉', wuxing: '金' }
  ],
  zhen: [
    { gan: '庚', zhi: '子', wuxing: '水' },
    { gan: '庚', zhi: '寅', wuxing: '木' },
    { gan: '庚', zhi: '辰', wuxing: '土' },
    { gan: '庚', zhi: '午', wuxing: '火' },
    { gan: '庚', zhi: '申', wuxing: '金' },
    { gan: '庚', zhi: '戌', wuxing: '土' }
  ],
  xun: [
    { gan: '辛', zhi: '丑', wuxing: '土' },
    { gan: '辛', zhi: '亥', wuxing: '水' },
    { gan: '辛', zhi: '酉', wuxing: '金' },
    { gan: '辛', zhi: '未', wuxing: '土' },
    { gan: '辛', zhi: '巳', wuxing: '火' },
    { gan: '辛', zhi: '卯', wuxing: '木' }
  ],
  kan: [
    { gan: '戊', zhi: '寅', wuxing: '木' },
    { gan: '戊', zhi: '辰', wuxing: '土' },
    { gan: '戊', zhi: '午', wuxing: '火' },
    { gan: '戊', zhi: '申', wuxing: '金' },
    { gan: '戊', zhi: '戌', wuxing: '土' },
    { gan: '戊', zhi: '子', wuxing: '水' }
  ],
  li: [
    { gan: '己', zhi: '卯', wuxing: '木' },
    { gan: '己', zhi: '丑', wuxing: '土' },
    { gan: '己', zhi: '亥', wuxing: '水' },
    { gan: '己', zhi: '酉', wuxing: '金' },
    { gan: '己', zhi: '未', wuxing: '土' },
    { gan: '己', zhi: '巳', wuxing: '火' }
  ],
  gen: [
    { gan: '丙', zhi: '辰', wuxing: '土' },
    { gan: '丙', zhi: '午', wuxing: '火' },
    { gan: '丙', zhi: '申', wuxing: '金' },
    { gan: '丙', zhi: '戌', wuxing: '土' },
    { gan: '丙', zhi: '子', wuxing: '水' },
    { gan: '丙', zhi: '寅', wuxing: '木' }
  ],
  dui: [
    { gan: '丁', zhi: '巳', wuxing: '火' },
    { gan: '丁', zhi: '卯', wuxing: '木' },
    { gan: '丁', zhi: '丑', wuxing: '土' },
    { gan: '丁', zhi: '亥', wuxing: '水' },
    { gan: '丁', zhi: '酉', wuxing: '金' },
    { gan: '丁', zhi: '未', wuxing: '土' }
  ]
}

/** 京氏易八宫：宫名 -> 8 卦（本宫、一世…游魂、归魂），每卦六爻阴阳（下到上） */
const PALACES = {
  qian: {
    name: '乾',
    wuxing: '金',
    gua: [
      [1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1],
      [0, 0, 1, 1, 1, 1],
      [0, 0, 0, 1, 1, 1],
      [0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 1],
      [0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 1]
    ]
  },
  kun: {
    name: '坤',
    wuxing: '土',
    gua: [
      [0, 0, 0, 0, 0, 0],
      [1, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0],
      [1, 1, 1, 0, 0, 0],
      [1, 1, 1, 1, 0, 0],
      [1, 1, 1, 1, 1, 0],
      [1, 1, 1, 0, 1, 0],
      [0, 0, 0, 0, 1, 0]
    ]
  },
  zhen: {
    name: '震',
    wuxing: '木',
    gua: [
      [1, 0, 0, 1, 0, 0],
      [0, 0, 0, 1, 0, 0],
      [0, 1, 0, 1, 0, 0],
      [0, 1, 1, 1, 0, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 0],
      [1, 0, 0, 1, 1, 0]
    ]
  },
  xun: {
    name: '巽',
    wuxing: '木',
    gua: [
      [0, 1, 1, 0, 1, 1],
      [1, 1, 1, 0, 1, 1],
      [1, 0, 1, 0, 1, 1],
      [1, 0, 0, 0, 1, 1],
      [1, 0, 0, 1, 1, 1],
      [1, 0, 0, 1, 0, 1],
      [1, 0, 0, 0, 0, 1],
      [0, 1, 1, 0, 0, 1]
    ]
  },
  kan: {
    name: '坎',
    wuxing: '水',
    gua: [
      [0, 1, 0, 0, 1, 0],
      [1, 1, 0, 0, 1, 0],
      [1, 0, 0, 0, 1, 0],
      [1, 0, 1, 0, 1, 0],
      [1, 0, 1, 1, 1, 0],
      [1, 0, 1, 1, 0, 0],
      [1, 0, 1, 0, 0, 0],
      [0, 1, 0, 0, 0, 0]
    ]
  },
  li: {
    name: '离',
    wuxing: '火',
    gua: [
      [1, 0, 1, 1, 0, 1],
      [0, 0, 1, 1, 0, 1],
      [0, 1, 1, 1, 0, 1],
      [0, 1, 0, 1, 0, 1],
      [0, 1, 0, 0, 0, 1],
      [0, 1, 0, 0, 1, 1],
      [0, 1, 0, 1, 1, 1],
      [1, 0, 1, 1, 1, 1]
    ]
  },
  gen: {
    name: '艮',
    wuxing: '土',
    gua: [
      [0, 0, 1, 0, 0, 1],
      [1, 0, 1, 0, 0, 1],
      [1, 1, 1, 0, 0, 1],
      [1, 1, 0, 0, 0, 1],
      [1, 1, 0, 1, 0, 1],
      [1, 1, 0, 1, 1, 1],
      [1, 1, 0, 0, 1, 1],
      [0, 0, 1, 0, 1, 1]
    ]
  },
  dui: {
    name: '兑',
    wuxing: '金',
    gua: [
      [1, 1, 0, 1, 1, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 0, 1, 1, 0],
      [0, 0, 1, 1, 1, 0],
      [0, 0, 1, 0, 1, 0],
      [0, 0, 1, 0, 0, 0],
      [0, 0, 1, 1, 0, 0],
      [1, 1, 0, 1, 0, 0]
    ]
  }
}

/** 世爻位置：本宫=5，一世=0…五世=4，游魂=3，归魂=2（下标） */
const SHI_POS = [5, 0, 1, 2, 3, 4, 3, 2]

const GUA64_NAMES = {
  '111111': { name: '乾为天', alias: '乾' },
  '000000': { name: '坤为地', alias: '坤' },
  '100010': { name: '水雷屯', alias: '屯' },
  '010001': { name: '山水蒙', alias: '蒙' },
  '111010': { name: '水天需', alias: '需' },
  '010111': { name: '天水讼', alias: '讼' },
  '010000': { name: '地水师', alias: '师' },
  '000010': { name: '水地比', alias: '比' },
  '111011': { name: '风天小畜', alias: '小畜' },
  '110111': { name: '天泽履', alias: '履' },
  '111000': { name: '地天泰', alias: '泰' },
  '000111': { name: '天地否', alias: '否' },
  '101111': { name: '天火同人', alias: '同人' },
  '111101': { name: '火天大有', alias: '大有' },
  '001000': { name: '地山谦', alias: '谦' },
  '000100': { name: '雷地豫', alias: '豫' },
  '100110': { name: '泽雷随', alias: '随' },
  '011001': { name: '山风蛊', alias: '蛊' },
  '110000': { name: '地泽临', alias: '临' },
  '000011': { name: '风地观', alias: '观' },
  '100101': { name: '火雷噬嗑', alias: '噬嗑' },
  '101001': { name: '山火贲', alias: '贲' },
  '000001': { name: '山地剥', alias: '剥' },
  '100000': { name: '地雷复', alias: '复' },
  '111001': { name: '山天大畜', alias: '大畜' },
  '100111': { name: '天雷无妄', alias: '无妄' },
  '100001': { name: '山雷颐', alias: '颐' },
  '011110': { name: '泽风大过', alias: '大过' },
  '010010': { name: '坎为水', alias: '坎' },
  '101101': { name: '离为火', alias: '离' },
  '001110': { name: '泽山咸', alias: '咸' },
  '011100': { name: '雷风恒', alias: '恒' },
  '001111': { name: '天山遁', alias: '遁' },
  '111100': { name: '雷天大壮', alias: '大壮' },
  '000101': { name: '火地晋', alias: '晋' },
  '101000': { name: '地火明夷', alias: '明夷' },
  '101011': { name: '风火家人', alias: '家人' },
  '110101': { name: '火泽睽', alias: '睽' },
  '001010': { name: '水山蹇', alias: '蹇' },
  '010100': { name: '雷水解', alias: '解' },
  '110001': { name: '山泽损', alias: '损' },
  '100011': { name: '风雷益', alias: '益' },
  '111110': { name: '泽天夬', alias: '夬' },
  '011111': { name: '天风姤', alias: '姤' },
  '000110': { name: '泽地萃', alias: '萃' },
  '011000': { name: '地风升', alias: '升' },
  '010110': { name: '泽水困', alias: '困' },
  '011010': { name: '水风井', alias: '井' },
  '101110': { name: '泽火革', alias: '革' },
  '011101': { name: '火风鼎', alias: '鼎' },
  '100100': { name: '震为雷', alias: '震' },
  '001001': { name: '艮为山', alias: '艮' },
  '001011': { name: '风山渐', alias: '渐' },
  '110100': { name: '雷泽归妹', alias: '归妹' },
  '101100': { name: '雷火丰', alias: '丰' },
  '001101': { name: '火山旅', alias: '旅' },
  '011011': { name: '巽为风', alias: '巽' },
  '110110': { name: '兑为泽', alias: '兑' },
  '010011': { name: '风水涣', alias: '涣' },
  '110010': { name: '水泽节', alias: '节' },
  '110011': { name: '风泽中孚', alias: '中孚' },
  '001100': { name: '雷山小过', alias: '小过' },
  '101010': { name: '水火既济', alias: '既济' },
  '010101': { name: '火水未济', alias: '未济' }
}

const YAO_NAMES = ['初', '二', '三', '四', '五', '上']

const LIUSHEN = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武']

/** 日干起六神：甲乙青龙起… */
const DAY_GAN_LIUSHEN_START = {
  甲: 0,
  乙: 0,
  丙: 1,
  丁: 1,
  戊: 2,
  己: 3,
  庚: 4,
  辛: 4,
  壬: 5,
  癸: 5
}

const WUXING_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const WUXING_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

module.exports = {
  TRIGRAMS,
  TRIGRAM_ORDER,
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
}
