Component({
  methods: {
    onNavBackTap() {
      this.triggerEvent('back')
      // 左上角统一回首页，避免多层栈只退一页
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})
