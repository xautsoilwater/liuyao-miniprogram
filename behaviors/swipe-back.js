module.exports = Behavior({
  data: {
    _touchStartX: 0,
    _touchStartY: 0,
    _touchStartT: 0
  },
  pageLifetimes: {
    show() {
      // 每次进入页面（含返回）都回到顶部，避免长页残留滚动位置
      try {
        wx.pageScrollTo({ scrollTop: 0, duration: 0 })
      } catch (e) {
        // ignore
      }
    }
  },
  methods: {
    onSwipeTouchStart(e) {
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      this._touchStartX = t.clientX
      this._touchStartY = t.clientY
      this._touchStartT = Date.now()
    },
    onSwipeTouchEnd(e) {
      const t = e.changedTouches && e.changedTouches[0]
      if (!t) return
      const dx = t.clientX - this._touchStartX
      const dy = t.clientY - this._touchStartY
      const dt = Date.now() - this._touchStartT
      if (dt > 600) return
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      // 左划（手指左移）或从左缘右滑，均返回
      const fromEdge = this._touchStartX <= 28 && dx > 70
      const swipeLeft = dx < -70
      if (!fromEdge && !swipeLeft) return
      this.handleSwipeBack()
    },
    handleSwipeBack() {
      wx.navigateBack({
        fail: () => {
          wx.reLaunch({ url: '/pages/index/index' })
        }
      })
    },
    onNavBackTap() {
      this.handleSwipeBack()
    }
  }
})
