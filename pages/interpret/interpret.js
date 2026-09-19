const { interpret } = require('../../utils/duangu')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    topicKey: 'general',
    result: null,
    cast: null
  },

  onShow() {
    const cast = getApp().globalData.lastCast
    if (!cast) {
      wx.showToast({ title: '请先卜卦', icon: 'none' })
      setTimeout(() => wx.navigateTo({ url: '/pages/ask/ask?next=cast' }), 400)
      return
    }
    const topicKey = (cast.askMeta && cast.askMeta.topicKey) || 'general'
    this.setData({
      cast,
      topicKey,
      result: interpret(cast, topicKey)
    })
  },

  goResult() {
    wx.navigateBack({ fail: () => wx.navigateTo({ url: '/pages/result/result' }) })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
