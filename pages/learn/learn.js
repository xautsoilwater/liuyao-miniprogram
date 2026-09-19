const { groupByCategory, CATEGORY_ORDER } = require('../../data/learning')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    groups: [],
    track: []
  },

  onLoad() {
    this.setData({
      groups: groupByCategory(),
      track: CATEGORY_ORDER
    })
  },

  openArticle(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/learn-detail/learn-detail?id=${id}` })
  }
})
