/**
 * 铜钱卜卦
 * 字=阳(3)，背=阴(2)
 * 9老阳动 / 8少阴静 / 7少阳静 / 6老阴动
 */

function tossOneCoin() {
  return Math.random() < 0.5 ? 'yang' : 'yin'
}

function fromScore(score, coins) {
  score = Number(score)
  if (![6, 7, 8, 9].includes(score)) {
    throw new Error('铜钱分值必须为 6、7、8 或 9')
  }
  if (coins != null) {
    if (!Array.isArray(coins) || coins.length !== 3 || coins.some((c) => c !== 'yang' && c !== 'yin')) {
      throw new Error('币面必须由三个阴阳面组成')
    }
    const coinScore = coins.reduce((sum, face) => sum + (face === 'yang' ? 3 : 2), 0)
    if (coinScore !== Number(score)) throw new Error('铜钱分值与币面不一致')
  }
  let type
  let yinYang
  let changing = false
  if (score === 9) {
    type = '老阳'
    yinYang = 1
    changing = true
  } else if (score === 8) {
    type = '少阴'
    yinYang = 0
    changing = false
  } else if (score === 7) {
    type = '少阳'
    yinYang = 1
    changing = false
  } else if (score === 6) {
    type = '老阴'
    yinYang = 0
    changing = true
  }
  const yangCount = coins ? coins.filter((c) => c === 'yang').length : undefined
  return {
    coins: coins || null,
    yangCount,
    yinCount: coins ? 3 - yangCount : undefined,
    score,
    type,
    yinYang,
    changing,
    mark: changing ? (yinYang ? '○' : '×') : ''
  }
}

function tossThreeCoins() {
  const coins = [tossOneCoin(), tossOneCoin(), tossOneCoin()]
  const yangCount = coins.filter((c) => c === 'yang').length
  const score = yangCount * 3 + (3 - yangCount) * 2
  return fromScore(score, coins)
}

/** 手动指定：老阳9 / 少阴8 / 少阳7 / 老阴6 */
function manualYao(typeKey) {
  const map = { laoYang: 9, shaoYin: 8, shaoYang: 7, laoYin: 6, 9: 9, 8: 8, 7: 7, 6: 6 }
  const score = map[typeKey]
  if (!score) throw new Error('未知爻象')
  const coins =
    score === 9
      ? ['yang', 'yang', 'yang']
      : score === 8
        ? ['yang', 'yang', 'yin']
        : score === 7
          ? ['yang', 'yin', 'yin']
          : ['yin', 'yin', 'yin']
  return fromScore(score, coins)
}

function castSixYao() {
  const yaos = []
  for (let i = 0; i < 6; i += 1) {
    yaos.push(tossThreeCoins())
  }
  return yaos
}

module.exports = {
  tossOneCoin,
  tossThreeCoins,
  castSixYao,
  manualYao,
  fromScore
}
