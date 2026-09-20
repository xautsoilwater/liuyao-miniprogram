const { groupByCategory, getArticle } = require('../../data/learning')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    groups: [],
    volumes: [],
    activeAnchor: '',
    volNavTop: 20
  },

  onLoad() {
    this.updateVolNavTop()
    const groups = groupByCategory()
    const volumes = groups.map((grp) => ({
      category: grp.category,
      vol: grp.vol || grp.category,
      anchorId: grp.anchorId
    }))
    this.setData({
      groups,
      volumes,
      activeAnchor: volumes[0] ? volumes[0].anchorId : ''
    })
  },

  onReady() {
    this.measureSections()
    setTimeout(() => this.measureSections(), 240)
  },

  onShow() {
    this.updateVolNavTop()
  },

  updateVolNavTop() {
    try {
      const windowInfo = typeof wx.getWindowInfo === 'function'
        ? wx.getWindowInfo()
        : wx.getSystemInfoSync()
      const menu = typeof wx.getMenuButtonBoundingClientRect === 'function'
        ? wx.getMenuButtonBoundingClientRect()
        : null
      const statusBarHeight = Number(windowInfo.statusBarHeight) || 20
      const menuBottom = menu && Number(menu.bottom)
      const volNavTop = Math.ceil(
        menuBottom > statusBarHeight
          ? menuBottom + 8
          : statusBarHeight + 8
      )
      this.setData({ volNavTop })
    } catch (e) {
      this.setData({ volNavTop: 20 })
    }
  },

  measureSections() {
    const volumes = this.data.volumes || []
    if (!volumes.length) return
    const query = wx.createSelectorQuery()
    volumes.forEach((vol) => {
      query.select(`#${vol.anchorId}`).boundingClientRect()
    })
    query.select('.vol-nav').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (!res || res.length < volumes.length + 2) return
      const view = res[res.length - 1] || {}
      const nav = res[res.length - 2] || {}
      const scrollTop = Number(view.scrollTop) || 0
      this._navHeight = Number(nav.height) || 0
      this._sectionTops = volumes.map((vol, idx) => {
        const rect = res[idx]
        return {
          id: vol.anchorId,
          top: rect ? Number(rect.top) + scrollTop : 0
        }
      })
    })
  },

  jumpToVolume(e) {
    const id = e.currentTarget.dataset.anchor
    if (!id) return
    this._jumping = true
    this.setData({ activeAnchor: id })
    const query = wx.createSelectorQuery()
    query.select(`#${id}`).boundingClientRect()
    query.select('.vol-nav').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      const rect = res && res[0]
      const nav = res && res[1]
      const view = res && res[2]
      if (!rect || !view) {
        this._jumping = false
        return
      }
      const navHeight = nav ? Number(nav.height) || 0 : 0
      const nextTop = Math.max(0, Number(view.scrollTop) + Number(rect.top) - navHeight - 8)
      try {
        wx.pageScrollTo({
          scrollTop: nextTop,
          duration: 320
        })
      } catch (err) {
        this._jumping = false
      }
      setTimeout(() => {
        this._jumping = false
        this.measureSections()
      }, 360)
    })
  },

  onPageScroll(e) {
    if (this._jumping) return
    const tops = this._sectionTops
    if (!tops || !tops.length) return
    const offset = (this._navHeight || 0) + 16
    const y = (e && e.scrollTop) || 0
    let current = tops[0].id
    tops.forEach((section) => {
      if (section.top - offset <= y) current = section.id
    })
    if (current && current !== this.data.activeAnchor) {
      this.setData({ activeAnchor: current })
    }
  },

  openGuadian() {
    wx.navigateTo({ url: '/pages/learn-detail/learn-detail?id=gua-dian' })
  },

  openArticle(e) {
    const id = e.currentTarget.dataset.id
    const article = getArticle(id)
    if (article && (article.openPage === 'guadian' || article.id === 'guadian-catalog' || /^guadian-/.test(article.id || ''))) {
      this.openGuadian()
      return
    }
    wx.navigateTo({ url: `/pages/learn-detail/learn-detail?id=${id}` })
  }
})
