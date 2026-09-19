Page({
  data: {
    accountLabel: '登录',
    homeHeaderTop: 90
  },

  onLoad() {
    this.updateHomeSafeArea()
  },

  updateHomeSafeArea() {
    try {
      const windowInfo = typeof wx.getWindowInfo === 'function'
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync()
      const menu = typeof wx.getMenuButtonBoundingClientRect === 'function'
        ? wx.getMenuButtonBoundingClientRect()
        : null
      const statusBarHeight = Number(windowInfo.statusBarHeight) || 20
      const menuBottom = menu && Number(menu.bottom)
      // 首页采用自定义导航栏，品牌必须完整落在刘海和右上角胶囊下方。
      const homeHeaderTop = Math.ceil(
        menuBottom > statusBarHeight
          ? menuBottom + 10
          : statusBarHeight + 44
      )
      this.setData({ homeHeaderTop })
    } catch (e) {
      // 极旧基础库兜底，仍留出完整的状态栏和导航栏高度。
      this.setData({ homeHeaderTop: 90 })
    }
  },

  onShow() {
    this.updateHomeSafeArea()
    try {
      wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    } catch (e) {
      // ignore
    }
    const user = getApp().globalData.user
    this.setData({
      accountLabel: user && user.nickName ? user.nickName : '登录'
    })
  },

  goCast() {
    wx.navigateTo({ url: '/pages/ask/ask?next=cast' })
  },

  goMeihua() {
    wx.navigateTo({ url: '/pages/ask/ask?next=meihua' })
  },

  goLearn() {
    wx.navigateTo({ url: '/pages/learn/learn' })
  },

  goAccount() {
    wx.navigateTo({ url: '/pages/account/account' })
  },

  goHistory() {
    wx.navigateTo({ url: '/pages/history/history' })
  }
})
