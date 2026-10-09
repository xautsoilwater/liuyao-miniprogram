const { calculateBazi } = require('../../utils/bazi')
const {
  SOLAR_DATE_MIN,
  SOLAR_DATE_MAX,
  LUNAR_YEAR_MIN,
  getLunarPickerState,
  resolveBirthInstant
} = require('../../utils/calendar')

const WUXING_COLORS = {
  金: '#c5a059',
  木: '#4a8255',
  水: '#386f96',
  火: '#ba372d',
  土: '#8b6742'
}

function lunarPickerFields(lunar) {
  const picker = getLunarPickerState(lunar)
  return {
    lunar: picker.lunar,
    lunarDisplay: `${picker.lunar.year}年${picker.months[picker.indexes[1]].label}${picker.days[picker.indexes[2]].label}`,
    lunarPickerRange: [
      picker.years.map((item) => item.label),
      picker.months.map((item) => item.label),
      picker.days.map((item) => item.label)
    ],
    lunarPickerValue: picker.indexes
  }
}

function dateFormFields({ calendarType, solarDate, lunar, time }) {
  const resolved = resolveBirthInstant({
    calendarType,
    solarDate,
    lunar,
    time
  })
  const picker = lunarPickerFields(resolved.lunar)
  return {
    calendarType: resolved.calendarType,
    birthDate: resolved.solarText,
    counterpartText: resolved.calendarType === 'lunar'
      ? `对应公历 ${resolved.solarText}`
      : `对应农历 ${resolved.lunarText}`,
    ...picker
  }
}

Page({
  data: {
    gender: '男',
    calendarType: 'solar',
    birthDate: '1995-10-24',
    birthTime: '09:30',
    solarDateMin: SOLAR_DATE_MIN,
    solarDateMax: SOLAR_DATE_MAX,
    lunar: { year: 1995, month: 9, day: 1, isLeap: false },
    lunarDisplay: '1995年九月初一',
    lunarPickerRange: [[], [], []],
    lunarPickerValue: [0, 0, 0],
    counterpartText: '',
    baziData: null,
    birthMeta: null,
    displayPillars: [],
    wuxingEnergies: []
  },

  onLoad() {
    this.syncDateForm({ calendarType: 'solar', solarDate: this.data.birthDate })
  },

  syncDateForm({ calendarType, solarDate, lunar }) {
    try {
      this.setData(dateFormFields({
        calendarType: calendarType || this.data.calendarType,
        solarDate: solarDate || this.data.birthDate,
        lunar: lunar || this.data.lunar,
        time: this.data.birthTime
      }))
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '日期无效', icon: 'none' })
    }
  },

  setGenderMale() {
    this.setData({ gender: '男' })
  },

  setGenderFemale() {
    this.setData({ gender: '女' })
  },

  setCalendarSolar() {
    if (this.data.calendarType === 'solar') return
    this.syncDateForm({ calendarType: 'solar', solarDate: this.data.birthDate })
  },

  setCalendarLunar() {
    if (this.data.calendarType === 'lunar') return
    this.syncDateForm({ calendarType: 'lunar', lunar: this.data.lunar })
  },

  onDateChange(e) {
    this.syncDateForm({ calendarType: 'solar', solarDate: e.detail.value })
  },

  onLunarColumnChange(e) {
    const { column, value } = e.detail
    const indexes = this.data.lunarPickerValue.slice()
    indexes[column] = value
    const year = LUNAR_YEAR_MIN + indexes[0]
    const months = getLunarPickerState({ year }).months
    const picked = months[Math.min(indexes[1], months.length - 1)]
    const fields = lunarPickerFields({
      year,
      month: picked.month,
      isLeap: picked.isLeap,
      day: indexes[2] + 1
    })
    this.setData({
      lunarPickerRange: fields.lunarPickerRange,
      lunarPickerValue: fields.lunarPickerValue
    })
  },

  onLunarCancel() {
    this.setData(lunarPickerFields(this.data.lunar))
  },

  onLunarDateChange(e) {
    const [yearIndex, monthIndex, dayIndex] = e.detail.value
    const year = LUNAR_YEAR_MIN + yearIndex
    const months = getLunarPickerState({ year }).months
    const picked = months[Math.min(monthIndex, months.length - 1)]
    const next = getLunarPickerState({
      year,
      month: picked.month,
      isLeap: picked.isLeap,
      day: dayIndex + 1
    })
    this.syncDateForm({ calendarType: 'lunar', lunar: next.lunar })
  },

  onTimeChange(e) {
    this.setData({ birthTime: e.detail.value })
  },

  calculatePillars() {
    const { birthDate, birthTime, gender, calendarType, lunar } = this.data
    let resolved
    try {
      resolved = resolveBirthInstant({
        calendarType,
        solarDate: birthDate,
        lunar,
        time: birthTime
      })
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '日期时间无效', icon: 'none' })
      return
    }

    try {
      const baziData = calculateBazi({ birthDate: resolved.date, gender })
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
        wuxingEnergies,
        birthMeta: {
          calendarLabel: resolved.calendarType === 'lunar' ? '农历' : '公历',
          solar: resolved.solarText,
          lunar: resolved.lunarText,
          time: birthTime
        }
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
      wuxingEnergies: [],
      birthMeta: null
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
