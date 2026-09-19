const {
  loadAccount,
  loadUser,
  loginWithWeChat,
  updateProfile,
  logout,
  deleteLocalAccount,
  normalizeNickName
} = require('../../utils/auth')
const swipeBack = require('../../behaviors/swipe-back')

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

Page({
  behaviors: [swipeBack],

  data: {
    user: null,
    account: null,
    hasAccount: false,
    loginText: '',
    registeredText: '',
    nickName: '',
    avatarUrl: '',
    consent: false,
    logging: false,
    saving: false,
    editing: false
  },

  onShow() {
    this.refresh()
  },

  refresh(options = {}) {
    const account = loadAccount()
    const user = loadUser()
    getApp().globalData.user = user
    const keepDraft = !!options.keepDraft
    this.setData({
      user,
      account,
      hasAccount: !!account,
      loginText: user ? formatTime(user.loginAt) : '',
      registeredText: account ? formatTime(account.registeredAt) : '',
      nickName: keepDraft ? this.data.nickName : account ? account.nickName : '',
      avatarUrl: keepDraft ? this.data.avatarUrl : account ? account.avatarUrl : '',
      editing: false
    })
  },

  onChooseAvatar(e) {
    const url = e.detail && e.detail.avatarUrl
    if (url) this.setData({ avatarUrl: url })
  },

  onNickInput(e) {
    this.setData({ nickName: e.detail.value })
  },

  onNickBlur(e) {
    this.setData({ nickName: e.detail.value })
  },

  onConsentChange(e) {
    const values = (e.detail && e.detail.value) || []
    this.setData({ consent: values.indexOf('agree') >= 0 })
  },

  onShowAgreement() {
    wx.showModal({
      title: '用户协议',
      content: '本应用用于周易研习与传统规则化推演。卦象内容仅供学习参考，不构成医疗、法律、投资或其他专业意见。请勿利用本应用实施违法、侵权或伤害他人的行为。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  onShowPrivacy() {
    wx.showModal({
      title: '隐私说明',
      content: '第一版仅在本机保存昵称、头像、登录时间、历史卦例与学习记录；不会保存 wx.login 临时 code，也不会上传到服务器。卸载或清理微信存储后资料可能丢失，当前暂不支持跨设备同步。',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  async onLogin() {
    if (this.data.logging) return
    if (!this.data.consent) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' })
      return
    }
    this.setData({ logging: true })
    try {
      const user = await loginWithWeChat({
        nickName: this.data.nickName,
        avatarUrl: this.data.avatarUrl,
        agreed: this.data.consent
      })
      getApp().globalData.user = user
      wx.showToast({
        title: this.data.hasAccount ? '登录成功' : '注册成功',
        icon: 'success'
      })
      this.setData({ consent: false })
      this.refresh()
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '登录失败，请重试', icon: 'none' })
    } finally {
      this.setData({ logging: false })
    }
  },

  onEditProfile() {
    const account = this.data.account
    if (!account) return
    this.setData({
      editing: true,
      nickName: account.nickName,
      avatarUrl: account.avatarUrl
    })
  },

  onCancelEdit() {
    const account = this.data.account
    this.setData({
      editing: false,
      nickName: account ? account.nickName : '',
      avatarUrl: account ? account.avatarUrl : ''
    })
  },

  async onSaveProfile() {
    if (this.data.saving) return
    this.setData({ saving: true })
    try {
      const user = updateProfile({
        nickName: normalizeNickName(this.data.nickName),
        avatarUrl: this.data.avatarUrl
      })
      getApp().globalData.user = user
      wx.showToast({ title: '资料已保存', icon: 'success' })
      this.refresh()
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '退出后保留本机账户资料和历史卦例，下次可直接登录。',
      confirmColor: '#8d2b24',
      success: (res) => {
        if (!res.confirm) return
        try {
          logout()
          getApp().globalData.user = null
          this.setData({ consent: false })
          this.refresh()
          wx.showToast({ title: '已退出', icon: 'none' })
        } catch (e) {
          wx.showToast({ title: (e && e.message) || '退出失败', icon: 'none' })
        }
      }
    })
  },

  onDeleteAccount() {
    wx.showModal({
      title: '注销本机账户',
      content: '将删除本机昵称、头像和登录资料，且无法恢复；历史卦例仍会保留。确定继续吗？',
      confirmText: '确定注销',
      confirmColor: '#8d2b24',
      success: (res) => {
        if (!res.confirm) return
        try {
          deleteLocalAccount()
          getApp().globalData.user = null
          this.setData({
            user: null,
            account: null,
            hasAccount: false,
            loginText: '',
            registeredText: '',
            nickName: '',
            avatarUrl: '',
            consent: false,
            editing: false
          })
          wx.showToast({ title: '本机账户已注销', icon: 'none' })
        } catch (e) {
          wx.showToast({ title: (e && e.message) || '注销失败', icon: 'none' })
        }
      }
    })
  }
})
