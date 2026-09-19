const { TIME_SCOPES, listGroups, buildAskSelection } = require('../../utils/ask-options')
const swipeBack = require('../../behaviors/swipe-back')

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
    askGroups: listGroups(),
    timeScopes: TIME_SCOPES,
    selectedGroupKey: '',
    selectedGroup: null,
    selectedOptionId: '',
    selectedTimeKey: '',
    selectedQuestion: '',
    canConfirm: false
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
    this.resetAskState()
  },

  resetAskState() {
    this.setData({
      selectedGroupKey: '',
      selectedGroup: null,
      selectedOptionId: '',
      selectedTimeKey: '',
      selectedQuestion: '',
      canConfirm: false
    })
    if (getApp().setPendingAsk) getApp().setPendingAsk(null)
  },

  syncAsk() {
    const { selectedOptionId, selectedTimeKey } = this.data
    if (!selectedOptionId) {
      this.setData({ selectedQuestion: '', canConfirm: false })
      return
    }
    const sel = buildAskSelection(selectedOptionId, selectedTimeKey)
    if (!sel) {
      this.setData({ selectedQuestion: '', canConfirm: false })
      return
    }
    this.setData({
      selectedQuestion: sel.question,
      canConfirm: true
    })
  },

  onSelectTime(e) {
    this.setData({ selectedTimeKey: e.currentTarget.dataset.key || '' }, () => this.syncAsk())
  },

  onSelectGroup(e) {
    const selectedGroupKey = e.currentTarget.dataset.key || ''
    const selectedGroup = this.data.askGroups.find((group) => group.key === selectedGroupKey) || null
    this.setData({
      selectedGroupKey,
      selectedGroup,
      selectedOptionId: '',
      selectedQuestion: '',
      canConfirm: false
    })
  },

  onChangeGroup() {
    this.setData({
      selectedGroupKey: '',
      selectedGroup: null,
      selectedOptionId: '',
      selectedQuestion: '',
      canConfirm: false
    })
  },

  onSelectOption(e) {
    this.setData({ selectedOptionId: e.currentTarget.dataset.id || '' }, () => this.syncAsk())
  },

  onConfirm() {
    const { selectedOptionId, selectedTimeKey, next } = this.data
    const sel = buildAskSelection(selectedOptionId, selectedTimeKey)
    if (!sel) {
      wx.showToast({ title: '请先选择所问', icon: 'none' })
      return
    }
    getApp().setPendingAsk({
      optionId: selectedOptionId,
      timeKey: selectedTimeKey || '',
      question: sel.question,
      askMeta: sel.askMeta,
      topicKey: sel.topicKey,
      next
    })
    const meta = NEXT_META[next] || NEXT_META.cast
    const pages = getCurrentPages()
    const prev = pages.length >= 2 ? pages[pages.length - 2] : null
    const targetRoute = meta.path.replace(/^\//, '')
    if (prev && prev.route === targetRoute) {
      wx.navigateBack()
      return
    }
    wx.navigateTo({ url: meta.path })
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
