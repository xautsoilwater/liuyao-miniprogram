const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    list: []
  },

  onShow() {
    try {
      const list = wx.getStorageSync('liuyao_history') || []
      this.setData({ list })
    } catch (e) {
      this.setData({ list: [] })
    }
  },

  openItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find((x) => x.id === id)
    if (!item || !item.cast) {
      wx.showToast({ title: '该条无完整排盘', icon: 'none' })
      return
    }
    const app = getApp()
    if (item.type === 'meihua' || item.cast.type === 'meihua') {
      app.globalData.lastMeihua = item.cast
      wx.setStorageSync('liuyao_last_meihua', item.cast)
      wx.navigateTo({ url: '/pages/meihua-result/meihua-result' })
      return
    }
    app.globalData.lastCast = item.cast
    wx.setStorageSync('liuyao_last_cast', item.cast)
    wx.navigateTo({ url: '/pages/result/result' })
  },

  clearAll() {
    wx.showModal({
      title: '清空历史',
      content: '确定清空本地卦例记录？',
      success: (res) => {
        if (!res.confirm) return
        wx.removeStorageSync('liuyao_history')
        this.setData({ list: [] })
      }
    })
  }
})
