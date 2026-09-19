const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    cast: null,
    yaoRows: []
  },

  onShow() {
    const cast = getApp().globalData.lastMeihua
    if (!cast) {
      wx.showToast({ title: '请先梅花起卦', icon: 'none' })
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/ask/ask?next=meihua' })
      }, 400)
      return
    }
    const dong = cast.dongYao
    const tiIsUpper = cast.tiYong.tiSide.indexOf('外') >= 0
    const labels = ['初', '二', '三', '四', '五', '上']
    const yaoRows = []
    for (let i = 5; i >= 0; i -= 1) {
      const pos = i + 1
      const isUpper = pos > 3
      const role = (isUpper && tiIsUpper) || (!isUpper && !tiIsUpper) ? '体' : '用'
      yaoRows.push({
        idx: i,
        name: labels[i] + '爻',
        yang: !!cast.ben.lines[i],
        dong: pos === dong,
        tag: pos === dong ? '动·' + role : role
      })
    }
    this.setData({ cast, yaoRows })
  },

  recast() {
    wx.redirectTo({ url: '/pages/ask/ask?next=meihua' })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
