const { castByNumbers, castByTime, castByRandom } = require('../../utils/meihua')
const swipeBack = require('../../behaviors/swipe-back')

function formatNow() {
  const d = new Date()
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

Page({
  behaviors: [swipeBack],
  data: {
    question: '',
    askMeta: null,
    mode: 'number',
    numA: '',
    numB: '',
    nowText: formatNow(),
    rolling: false
  },

  onShow() {
    this.setData({ nowText: formatNow() })
    this.loadPendingAsk()
  },

  loadPendingAsk() {
    const pending = getApp().getPendingAsk && getApp().getPendingAsk()
    if (!pending || !pending.askMeta || !pending.question) {
      wx.showToast({ title: '请先选择所问', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/ask/ask?next=meihua' })
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
      fail: () => wx.redirectTo({ url: '/pages/ask/ask?next=meihua' })
    })
  },

  setMode(e) {
    this.setData({
      mode: e.currentTarget.dataset.mode,
      nowText: formatNow()
    })
  },

  onNumA(e) {
    this.setData({ numA: e.detail.value })
  },

  onNumB(e) {
    this.setData({ numB: e.detail.value })
  },

  goResult(cast) {
    getApp().setLastMeihua(cast)
    wx.navigateTo({ url: '/pages/meihua-result/meihua-result' })
  },

  askPayload() {
    return {
      question: (this.data.question || '').trim(),
      askMeta: this.data.askMeta
    }
  },

  submitNumber() {
    if (!this.data.askMeta && !this.loadPendingAsk()) return
    const { numA, numB } = this.data
    if (!String(numA).trim() || !String(numB).trim()) {
      wx.showToast({ title: '请填写两个正整数', icon: 'none' })
      return
    }
    try {
      const cast = castByNumbers(numA, numB, this.askPayload())
      this.goResult(cast)
    } catch (e) {
      wx.showToast({ title: e.message || '起卦失败', icon: 'none' })
    }
  },

  submitTime() {
    if (!this.data.askMeta && !this.loadPendingAsk()) return
    const cast = castByTime(this.askPayload())
    this.goResult(cast)
  },

  submitRandom() {
    if (this.data.rolling) return
    if (!this.data.askMeta && !this.loadPendingAsk()) return
    this.setData({ rolling: true })
    setTimeout(() => {
      const cast = castByRandom(this.askPayload())
      this.setData({ rolling: false })
      this.goResult(cast)
    }, 480)
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
