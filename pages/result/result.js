const swipeBack = require('../../behaviors/swipe-back')
const { buildPaipanGuide } = require('../../utils/paipan')

Page({
  behaviors: [swipeBack],
  data: {
    cast: null,
    rows: [],
    guide: [],
    fushenList: [],
    changeLines: [],
    relationTexts: []
  },

  onShow() {
    const cast = getApp().globalData.lastCast
    if (!cast) {
      wx.showToast({ title: '请先卜卦', icon: 'none' })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/ask/ask?next=cast' })
      }, 400)
      return
    }
    const fushenList = cast.fushenMap
      ? Object.keys(cast.fushenMap).map((k) => cast.fushenMap[k])
      : []
    const changeLines = (cast.ben.yaos || [])
      .filter((y) => y.changing && y.changeTo)
      .map((y) => `${y.name}${y.liuqin}${y.ganZhi} → ${y.changeTo.text}`)
    const relationTexts = []
    if (cast.relations) {
      ;(cast.relations.links || []).slice(0, 10).forEach((l) => relationTexts.push(l.text))
      ;(cast.relations.sanhe || []).forEach((s) => relationTexts.push(s.name))
      ;(cast.relations.dayLinks || []).forEach((d) => relationTexts.push(d.text))
    }
    const rows = (cast.ben.yaos || []).map((ben, i) => ({
      key: `yao-${i}`,
      ben,
      // 有变卦则六爻皆显（动静皆画）；无动则变爻列留空
      bian: cast.bian && cast.bian.yaos ? cast.bian.yaos[i] : null
    }))
    const guide = cast.guide && cast.guide.length ? cast.guide : buildPaipanGuide(cast)
    this.setData({ cast, rows, guide, fushenList, changeLines, relationTexts })
  },

  goInterpret() {
    wx.navigateTo({ url: '/pages/interpret/interpret' })
  },

  recast() {
    wx.navigateTo({ url: '/pages/ask/ask?next=cast' })
  }
})
