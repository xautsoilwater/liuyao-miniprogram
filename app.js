const { loadUser } = require('./utils/auth')

App({
  globalData: {
    lastCast: null,
    lastMeihua: null,
    pendingAsk: null,
    user: null
  },

  onLaunch() {
    try {
      const last = wx.getStorageSync('liuyao_last_cast')
      if (last) this.globalData.lastCast = last
      const lastM = wx.getStorageSync('liuyao_last_meihua')
      if (lastM) this.globalData.lastMeihua = lastM
      const user = loadUser()
      if (user) this.globalData.user = user
      const pendingAsk = wx.getStorageSync('liuyao_pending_ask')
      if (pendingAsk) this.globalData.pendingAsk = pendingAsk
    } catch (e) {
      // ignore
    }
    // 崇羲篆体子集「周易」；首页品牌图已直出篆形，此处仍注册供兜底
    try {
      wx.loadFontFace({
        global: true,
        family: 'ZhouYiZhuan',
        source: 'url("/assets/fonts/zhouyi-zhuan.ttf")'
      })
    } catch (e) {
      // ignore
    }
    // 预加载铜钱图，进入卜卦页时减少等待
    try {
      if (typeof wx.preloadAssets === 'function') {
        wx.preloadAssets({
          data: [
            { type: 'image', src: '/assets/coins/qianlong-yang.jpg' },
            { type: 'image', src: '/assets/coins/qianlong-yin.jpg' }
          ]
        })
      } else {
        ;['/assets/coins/qianlong-yang.jpg', '/assets/coins/qianlong-yin.jpg'].forEach((src) => {
          wx.getImageInfo({ src })
        })
      }
    } catch (e) {
      // ignore
    }
  },

  setPendingAsk(ask) {
    this.globalData.pendingAsk = ask || null
    try {
      if (ask) wx.setStorageSync('liuyao_pending_ask', ask)
      else wx.removeStorageSync('liuyao_pending_ask')
    } catch (e) {
      // ignore
    }
  },

  getPendingAsk() {
    return this.globalData.pendingAsk || null
  },

  setLastCast(cast) {
    this.globalData.lastCast = cast
    try {
      wx.setStorageSync('liuyao_last_cast', cast)
      const list = wx.getStorageSync('liuyao_history') || []
      list.unshift({
        id: Date.now(),
        type: 'liuyao',
        time: cast.createdAt,
        question: cast.question || '未题所问',
        name: cast.ben.name,
        changingCount: cast.changingIndexes.length,
        cast
      })
      wx.setStorageSync('liuyao_history', list.slice(0, 50))
    } catch (e) {
      // ignore
    }
  },

  setLastMeihua(cast) {
    this.globalData.lastMeihua = cast
    try {
      wx.setStorageSync('liuyao_last_meihua', cast)
      const list = wx.getStorageSync('liuyao_history') || []
      list.unshift({
        id: Date.now(),
        type: 'meihua',
        time: cast.createdAt,
        question: cast.question || '未题所问',
        name: cast.ben.name,
        changingCount: 1,
        summary: cast.summary,
        cast
      })
      wx.setStorageSync('liuyao_history', list.slice(0, 50))
    } catch (e) {
      // ignore
    }
  }
})
