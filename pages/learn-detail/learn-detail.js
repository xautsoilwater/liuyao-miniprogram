const { getArticle } = require('../../data/learning')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    article: null
  },

  onLoad(query) {
    const article = getArticle(query.id)
    if (!article) {
      wx.showToast({ title: '篇章不存在', icon: 'none' })
      return
    }
    wx.setNavigationBarTitle({ title: article.title })
    this.setData({ article })
  }
})
