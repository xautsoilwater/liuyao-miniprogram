const { interpretWithAi } = require('../../utils/ai-interpreter')
const { interpret } = require('../../utils/duangu')
const { getAiConfig, saveAiConfig, resetAiConfig } = require('../../utils/ai-config')
const swipeBack = require('../../behaviors/swipe-back')

Page({
  behaviors: [swipeBack],
  data: {
    topicKey: 'general',
    result: null,
    cast: null,
    loading: false,
    showConfig: false,
    aiConfig: null
  },

  onShow() {
    const cast = getApp().globalData.lastCast
    if (!cast) {
      wx.showToast({ title: '请先卜卦', icon: 'none' })
      setTimeout(() => wx.navigateTo({ url: '/pages/ask/ask?next=cast' }), 400)
      return
    }
    this.setData({
      cast,
      aiConfig: getAiConfig()
    })
    this.startAiInterpretation(cast)
  },

  async startAiInterpretation(cast) {
    this.setData({ loading: true })
    const question = (cast.askMeta && cast.askMeta.summary) || '心意默祷（诸事顺逆与进退机宜）'
    try {
      const res = await interpretWithAi(cast, question)
      this.setData({
        result: res,
        loading: false
      })
    } catch (e) {
      console.error(e)
      const fallback = interpret(cast, 'general')
      this.setData({
        result: fallback,
        loading: false
      })
    }
  },

  onOpenConfig() {
    this.setData({ showConfig: true, aiConfig: getAiConfig() })
  },

  onCloseConfig() {
    this.setData({ showConfig: false })
  },

  onSaveConfig(e) {
    const { apiBase, model, apiKey } = e.detail.value
    saveAiConfig({ apiBase, model, apiKey })
    this.setData({ showConfig: false, aiConfig: getAiConfig() })
    wx.showToast({ title: '配置已保存', icon: 'success' })
    if (this.data.cast) {
      this.startAiInterpretation(this.data.cast)
    }
  },

  onResetConfig() {
    resetAiConfig()
    this.setData({ showConfig: false, aiConfig: getAiConfig() })
    wx.showToast({ title: '已恢复默认', icon: 'success' })
    if (this.data.cast) {
      this.startAiInterpretation(this.data.cast)
    }
  },

  onReInterpret() {
    if (this.data.cast) {
      this.startAiInterpretation(this.data.cast)
    }
  },

  onCopyResult() {
    const r = this.data.result
    if (!r) return
    const c = this.data.cast
    let text = `【所测事宜】${r.question || '心意默祷'}\n`
    text += `【周易排盘】本卦《${c.ben?.name || ''}》 变卦《${c.bian?.name || '无变'}》\n`
    text += `【神机结论】${r.summary || ''}\n\n`
    if (r.directAnswer) {
      text += `【针对答复 · 明确指引】\n${r.directAnswer}\n\n`
    }
    if (r.jiyu && r.jiyu.length) {
      text += `【趋吉避凶 · 神机金偈】\n${r.jiyu.join('\n')}\n\n`
    }
    if (r.sections) {
      r.sections.forEach((s) => {
        text += `■ ${s.title}\n`
        s.items.forEach((it) => { text += `· ${it}\n` })
        text += '\n'
      })
    }
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制断语与偈语', icon: 'success' })
    })
  },

  goResult() {
    wx.navigateBack({ fail: () => wx.navigateTo({ url: '/pages/result/result' }) })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/index/index' })
  }
})
