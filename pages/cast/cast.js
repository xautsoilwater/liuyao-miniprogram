const { tossThreeCoins, manualYao } = require('../../utils/coin')
const { arrangeCast } = require('../../utils/paipan')
const swipeBack = require('../../behaviors/swipe-back')

const IDLE_COINS = ['', '', '']

function buildGuaLines(yaos) {
  const lines = []
  for (let i = 5; i >= 0; i -= 1) {
    const y = yaos[i]
    if (!y) {
      lines.push({ index: i, filled: false, yinYang: 0, changing: false })
    } else {
      lines.push({
        index: i,
        filled: true,
        yinYang: y.yinYang,
        changing: !!y.changing
      })
    }
  }
  return lines
}

const EMPTY_GUA = buildGuaLines([])

Page({
  behaviors: [swipeBack],
  data: {
    question: '',
    askMeta: null,
    mode: 'shake',
    step: 0,
    yaos: [],
    guaLines: EMPTY_GUA,
    current: null,
    shaking: false,
    finished: false,
    displayCoins: IDLE_COINS,
    coinSlots: [0, 1, 2],
    progressSlots: [0, 1, 2, 3, 4, 5],
    manualOptions: [
      { key: 'laoYang', label: '老阳 ○', score: 9 },
      { key: 'shaoYin', label: '少阴 --', score: 8 },
      { key: 'shaoYang', label: '少阳 —', score: 7 },
      { key: 'laoYin', label: '老阴 ×', score: 6 }
    ]
  },

  onLoad() {
    // 进页再触达一次图片缓存（与 app 预加载互补）
    try {
      ;['/assets/coins/qianlong-yang.jpg', '/assets/coins/qianlong-yin.jpg'].forEach((src) => {
        wx.getImageInfo({ src })
      })
    } catch (e) {
      // ignore
    }
  },

  onShow() {
    this.loadPendingAsk()
  },

  loadPendingAsk() {
    const pending = getApp().getPendingAsk && getApp().getPendingAsk()
    if (!pending || !pending.askMeta || !pending.question) {
      wx.showToast({ title: '请先选择所问', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/ask/ask?next=cast' })
      }, 350)
      return false
    }
    this.setData({
      question: pending.question,
      askMeta: pending.askMeta
    })
    return true
  },

  goChangeAsk() {
    wx.navigateBack({
      fail: () => wx.redirectTo({ url: '/pages/ask/ask?next=cast' })
    })
  },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      mode,
      step: 0,
      yaos: [],
      guaLines: EMPTY_GUA,
      current: null,
      shaking: false,
      finished: false,
      displayCoins: IDLE_COINS
    })
  },

  pushYao(result) {
    const yaos = this.data.yaos.concat([result])
    const step = yaos.length
    const finished = step >= 6
    this.setData({
      current: result,
      yaos,
      guaLines: buildGuaLines(yaos),
      step,
      finished,
      shaking: false,
      displayCoins: result.coins
    })
    if (finished) {
      try { wx.vibrateShort({ type: 'medium' }) } catch (e) { /* ignore */ }
    }
  },

  shake() {
    if (this.data.shaking || this.data.finished || this.data.mode !== 'shake') return
    if (this.data.step >= 6) return
    if (!this.data.askMeta) {
      this.loadPendingAsk()
      return
    }
    const result = tossThreeCoins()
    this.setData({
      shaking: true,
      current: null,
      displayCoins: result.coins
    })
    setTimeout(() => {
      this.pushYao(result)
    }, 1600)
  },

  pickManual(e) {
    if (this.data.finished || this.data.mode !== 'manual') return
    if (!this.data.askMeta) {
      this.loadPendingAsk()
      return
    }
    const key = e.currentTarget.dataset.key
    this.pushYao(manualYao(key))
  },

  undoLast() {
    if (!this.data.step || this.data.shaking) return
    const yaos = this.data.yaos.slice(0, -1)
    const current = yaos.length ? yaos[yaos.length - 1] : null
    this.setData({
      yaos,
      step: yaos.length,
      guaLines: buildGuaLines(yaos),
      current,
      finished: false,
      shaking: false,
      displayCoins: current && current.coins ? current.coins : IDLE_COINS
    })
  },

  reset() {
    this.setData({
      step: 0,
      yaos: [],
      guaLines: EMPTY_GUA,
      current: null,
      shaking: false,
      finished: false,
      displayCoins: IDLE_COINS
    })
  },

  submit() {
    const { yaos, question, askMeta } = this.data
    if (!askMeta) {
      this.loadPendingAsk()
      return
    }
    if (yaos.length < 6) {
      wx.showToast({ title: '请摇满六爻', icon: 'none' })
      return
    }
    const cast = arrangeCast(yaos, {
      question: (question || '').trim(),
      askMeta,
      date: new Date()
    })
    getApp().setLastCast(cast)
    wx.navigateTo({ url: '/pages/result/result' })
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
