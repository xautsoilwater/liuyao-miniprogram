const { calculateBazi } = require('../../utils/bazi')

const WUXING_COLORS = {
  金: '#c5a059',
  木: '#4a8255',
  水: '#386f96',
  火: '#ba372d',
  土: '#8b6742'
}

Page({
  data: {
    gender: '男',
    birthDate: '1995-10-24',
    birthTime: '09:30',
    baziData: null,
    displayPillars: [],
    wuxingEnergies: []
  },

  onLoad() {
    // 默认展示输入页面
  },

  setGenderMale() {
    this.setData({ gender: '男' })
  },

  setGenderFemale() {
    this.setData({ gender: '女' })
  },

  onDateChange(e) {
    this.setData({ birthDate: e.detail.value })
  },

  onTimeChange(e) {
    this.setData({ birthTime: e.detail.value })
  },

  calculatePillars() {
    const { birthDate, birthTime, gender } = this.data
    const dt = new Date(`${birthDate}T${birthTime}:00`)
    if (Number.isNaN(dt.getTime())) {
      wx.showToast({ title: '日期时间无效', icon: 'none' })
      return
    }

    try {
      const baziData = calculateBazi({ birthDate: dt, gender })
      // 按照古典排盘顺序展示：时柱、日柱、月柱、年柱
      const displayPillars = [
        baziData.pillars[3],
        baziData.pillars[2],
        baziData.pillars[1],
        baziData.pillars[0]
      ]

      baziData.analysis.xiText = baziData.analysis.xi.join('、')
      baziData.analysis.jiText = baziData.analysis.ji.join('、')

      const wuxingList = ['金', '木', '水', '火', '土']
      const wuxingEnergies = wuxingList.map(wx => ({
        wx,
        pct: baziData.energy.percents[wx] || 0,
        color: WUXING_COLORS[wx]
      }))

      this.setData({
        baziData,
        displayPillars,
        wuxingEnergies
      })

      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    } catch (err) {
      wx.showToast({ title: '排盘计算失败', icon: 'none' })
    }
  },

  resetBazi() {
    this.setData({
      baziData: null,
      displayPillars: [],
      wuxingEnergies: []
    })
  },

  goBack() {
    if (this.data.baziData) {
      this.resetBazi()
    } else {
      wx.navigateBack({
        fail() {
          wx.reLaunch({ url: '/pages/index/index' })
        }
      })
    }
  }
})
