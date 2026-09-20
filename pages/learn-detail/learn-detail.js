const { getArticle } = require('../../data/learning')
const { listGuaDian, filterGuaDian, PALACE_CHIP_ORDER } = require('../../data/guaci')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    article: null,
    isGuaDian: false,
    query: '',
    part: '全部',
    palace: '',
    palaceChips: PALACE_CHIP_ORDER,
    list: [],
    openAlias: '',
    shown: 0,
    total: 0
  },

  onLoad(query) {
    const article = getArticle(query.id)
    if (!article) {
      wx.showToast({ title: '篇章不存在', icon: 'none' })
      return
    }
    if (article.openPage === 'guadian' || article.id === 'guadian-catalog' || /^guadian-/.test(article.id || '')) {
      wx.redirectTo({ url: '/pages/learn-detail/learn-detail?id=gua-dian' })
      return
    }
    wx.setNavigationBarTitle({ title: article.title })
    const isGuaDian = article.kind === 'gua-dian'
    this._all = isGuaDian ? listGuaDian() : []
    this.setData({
      article,
      isGuaDian,
      total: this._all.length
    })
    if (isGuaDian) this.applyFilter()
  },

  onSearch(e) {
    this.setData({ query: e.detail.value || '' })
    this.applyFilter()
  },

  onClearSearch() {
    this.setData({ query: '' })
    this.applyFilter()
  },

  onPart(e) {
    const part = e.currentTarget.dataset.part
    if (!part || part === this.data.part) return
    this.setData({ part })
    this.applyFilter()
  },

  onPalace(e) {
    const palace = e.currentTarget.dataset.palace || ''
    this.setData({ palace: palace === this.data.palace ? '' : palace })
    this.applyFilter()
  },

  onToggle(e) {
    const alias = e.currentTarget.dataset.alias
    this.setData({ openAlias: this.data.openAlias === alias ? '' : alias })
  },

  applyFilter() {
    const list = filterGuaDian(this._all, {
      query: this.data.query,
      part: this.data.part,
      palace: this.data.palace
    })
    const openAlias = list.some((g) => g.alias === this.data.openAlias)
      ? this.data.openAlias
      : ''
    this.setData({ list, shown: list.length, openAlias })
  }
})
