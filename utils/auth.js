/**
 * 第一版账户：
 * - 通过 wx.login 确认微信小程序登录流程；
 * - 首次登录自动创建本机账户，退出只清除会话，不删除资料；
 * - 临时 code 只存在于内存，绝不写入本地存储；
 * - 尚无服务端，不能把本机账户冒充成 openid 账户或跨设备账户。
 */

const SCHEMA_VERSION = 2
const POLICY_VERSION = '2026-07-30'
const ACCOUNT_STORAGE_KEY = 'liuyao_account_v2'
const SESSION_STORAGE_KEY = 'liuyao_session_v2'
const LEGACY_STORAGE_KEY = 'liuyao_user'
const STORAGE_KEY = ACCOUNT_STORAGE_KEY

function nowIso() {
  return new Date().toISOString()
}

function storageGet(key) {
  try {
    return wx.getStorageSync(key) || null
  } catch (e) {
    return null
  }
}

function storageSet(key, value) {
  try {
    wx.setStorageSync(key, value)
  } catch (e) {
    throw new Error('账户资料保存失败，请检查微信存储空间')
  }
}

function storageRemove(key) {
  try {
    wx.removeStorageSync(key)
  } catch (e) {
    throw new Error('账户资料清理失败，请稍后重试')
  }
}

function normalizeNickName(value, fallback = '研习者') {
  const clean = String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return Array.from(clean || fallback).slice(0, 20).join('')
}

function normalizeAvatarUrl(value) {
  return String(value || '').trim().slice(0, 2048)
}

function createLocalAccountId() {
  const stamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 10)
  return `local_${stamp}_${random}`
}

function normalizeAccount(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || raw.accountId || '').trim()
  if (!id) return null
  const registeredAt = raw.registeredAt || raw.loginAt || nowIso()
  return {
    version: SCHEMA_VERSION,
    id,
    provider: 'wechat',
    syncMode: 'local',
    nickName: normalizeNickName(raw.nickName),
    avatarUrl: normalizeAvatarUrl(raw.avatarUrl),
    registeredAt,
    updatedAt: raw.updatedAt || registeredAt,
    policyVersion: raw.policyVersion || '',
    consentedAt: raw.consentedAt || ''
  }
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object') return null
  const accountId = String(raw.accountId || '').trim()
  if (!accountId) return null
  const issuedAt = raw.issuedAt || raw.loginAt || nowIso()
  return {
    version: SCHEMA_VERSION,
    accountId,
    provider: 'wechat',
    issuedAt
  }
}

function migrateLegacyAccount() {
  const legacy = storageGet(LEGACY_STORAGE_KEY)
  if (!legacy || typeof legacy !== 'object') return null
  const registeredAt = legacy.loginAt || nowIso()
  const account = normalizeAccount({
    id: createLocalAccountId(),
    nickName: legacy.nickName,
    avatarUrl: legacy.avatarUrl,
    registeredAt,
    updatedAt: registeredAt
  })
  if (!account) return null
  try {
    storageSet(ACCOUNT_STORAGE_KEY, account)
    storageSet(SESSION_STORAGE_KEY, {
      version: SCHEMA_VERSION,
      accountId: account.id,
      provider: 'wechat',
      issuedAt: registeredAt
    })
    storageRemove(LEGACY_STORAGE_KEY)
  } catch (e) {
    // 迁移失败时仍返回旧资料，避免用户突然显示为未登录。
  }
  return account
}

function loadAccount() {
  const current = normalizeAccount(storageGet(ACCOUNT_STORAGE_KEY))
  return current || migrateLegacyAccount()
}

function loadSession() {
  return normalizeSession(storageGet(SESSION_STORAGE_KEY))
}

function makeUser(account, session) {
  if (!account || !session || session.accountId !== account.id) return null
  return {
    ...account,
    accountId: account.id,
    loginAt: session.issuedAt,
    authenticated: true,
    localOnly: true
  }
}

function loadUser() {
  return makeUser(loadAccount(), loadSession())
}

function saveAccount(account) {
  const normalized = normalizeAccount(account)
  if (!normalized) throw new Error('账户资料无效')
  storageSet(ACCOUNT_STORAGE_KEY, normalized)
  return normalized
}

function saveSession(accountId, issuedAt = nowIso()) {
  const session = normalizeSession({
    version: SCHEMA_VERSION,
    accountId,
    provider: 'wechat',
    issuedAt
  })
  storageSet(SESSION_STORAGE_KEY, session)
  return session
}

function wxLoginCode() {
  return new Promise((resolve, reject) => {
    wx.login({
      timeout: 10000,
      success: (res) => {
        if (res && res.code) resolve(res.code)
        else reject(new Error('未能取得微信登录凭证，请重试'))
      },
      fail: () => reject(new Error('微信登录未完成，请检查网络后重试'))
    })
  })
}

/**
 * 首次登录即注册；再次登录复用同一台设备上的账户资料。
 * 临时 code 未来应立即发往开发者服务端换取 openid/session，本地不保存。
 */
async function loginWithWeChat(profile = {}) {
  const existing = loadAccount()
  if (!existing && profile.agreed !== true) {
    throw new Error('请先阅读并同意用户协议与隐私说明')
  }
  await wxLoginCode()
  const time = nowIso()
  const suppliedName = String(profile.nickName || '').trim()
  const suppliedAvatar = String(profile.avatarUrl || '').trim()
  const account = saveAccount({
    version: SCHEMA_VERSION,
    id: existing ? existing.id : createLocalAccountId(),
    provider: 'wechat',
    syncMode: 'local',
    nickName: suppliedName
      ? normalizeNickName(suppliedName)
      : existing ? existing.nickName : '研习者',
    avatarUrl: suppliedAvatar
      ? normalizeAvatarUrl(suppliedAvatar)
      : existing ? existing.avatarUrl : '',
    registeredAt: existing ? existing.registeredAt : time,
    updatedAt: time,
    policyVersion: profile.agreed === true
      ? POLICY_VERSION
      : existing ? existing.policyVersion : '',
    consentedAt: profile.agreed === true
      ? time
      : existing ? existing.consentedAt : ''
  })
  const session = saveSession(account.id, time)
  return makeUser(account, session)
}

function updateProfile(profile = {}) {
  const session = loadSession()
  const current = loadAccount()
  if (!current || !session || session.accountId !== current.id) {
    throw new Error('请先登录后再修改资料')
  }
  const account = saveAccount({
    ...current,
    nickName: normalizeNickName(profile.nickName, current.nickName),
    avatarUrl: profile.avatarUrl == null
      ? current.avatarUrl
      : normalizeAvatarUrl(profile.avatarUrl),
    updatedAt: nowIso()
  })
  return makeUser(account, session)
}

/** 退出只清除当前会话，保留本机账户资料和历史卦例。 */
function logout() {
  storageRemove(SESSION_STORAGE_KEY)
  return null
}

/** 注销仅删除本机账户资料；历史卦例由历史功能单独管理。 */
function deleteLocalAccount() {
  storageRemove(SESSION_STORAGE_KEY)
  storageRemove(ACCOUNT_STORAGE_KEY)
  storageRemove(LEGACY_STORAGE_KEY)
  return null
}

/** 兼容旧调用：保存为当前账户并建立本地会话。 */
function saveUser(user) {
  if (!user) return logout()
  const account = saveAccount({
    ...user,
    id: user.id || user.accountId || createLocalAccountId(),
    registeredAt: user.registeredAt || user.loginAt || nowIso(),
    updatedAt: user.updatedAt || nowIso()
  })
  const session = saveSession(account.id, user.loginAt || nowIso())
  return makeUser(account, session)
}

function displayName(user) {
  if (!user) return '未登录'
  return user.nickName || '研习者'
}

module.exports = {
  SCHEMA_VERSION,
  POLICY_VERSION,
  STORAGE_KEY,
  ACCOUNT_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  normalizeNickName,
  loadAccount,
  loadSession,
  loadUser,
  saveAccount,
  saveUser,
  loginWithWeChat,
  updateProfile,
  logout,
  deleteLocalAccount,
  displayName,
  wxLoginCode
}
