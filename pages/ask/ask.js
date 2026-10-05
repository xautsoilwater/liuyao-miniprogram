const swipeBack = require('../../behaviors/swipe-back')
const { guessTopicKey } = require('../../utils/duangu')

const ASK_PRESETS = [
  '近期事业升迁与前程发展',
  '求职跳槽面试吉凶如何',
  '创业合伙与求财投资前景',
  '二人感情缘分及未来走向',
  '学业考试与考核能否过关',
  '外出远行与差旅安否吉凶',
  '买房置业与搬迁适宜与否',
  '身体健康与调养平安吉凶'
]

const NEXT_META = {
  cast: { label: '六爻卜卦', path: '/pages/cast/cast', confirm: '去卜卦' },
  meihua: { label: '梅花起卦', path: '/pages/meihua/meihua', confirm: '去卜卦' }
}

Page({
  behaviors: [swipeBack],
  data: {
    next: 'cast',
    nextLabel: '六爻卜卦',
    confirmLabel: '去卜卦',
    question: '',
    askPresets: ASK_PRESETS
  },

  onLoad(query) {
    const next = query && query.next === 'meihua' ? 'meihua' : 'cast'
    const meta = NEXT_META[next]
    this.setData({
      next,
      nextLabel: meta.label,
      confirmLabel: meta.confirm
    })
  },

  onShow() {
    this.setData({ question: '' })
    if (getApp().setPendingAsk) getApp().setPendingAsk(null)
  },

  onInputQuestion(e) {
    this.setData({ question: e.detail.value })
  },

  onSelectPreset(e) {
    const text = e.currentTarget.dataset.text || ''
    this.setData({ question: text })
  },

  onConfirm() {
    let question = (this.data.question || '').trim()
    if (!question) {
      question = '心意默祷（诸事顺逆与进退机宜）'
    }
    const topicKey = guessTopicKey ? guessTopicKey(question) : 'general'
    const askSelection = {
      question,
      askMeta: {
        summary: question,
        topicKey
      }
    }

    if (getApp().setPendingAsk) {
      getApp().setPendingAsk(askSelection)
    }

    const nextMeta = NEXT_META[this.data.next] || NEXT_META.cast
    wx.navigateTo({ url: nextMeta.path })
  },

  onBack() {
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/index/index' }) })
  }
})
