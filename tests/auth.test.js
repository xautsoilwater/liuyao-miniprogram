const assert = require('assert')

const memory = new Map()
let loginShouldFail = false
let storageShouldFail = false

global.wx = {
  getStorageSync(key) {
    const value = memory.get(key)
    return value == null ? null : JSON.parse(JSON.stringify(value))
  },
  setStorageSync(key, value) {
    if (storageShouldFail) throw new Error('quota')
    memory.set(key, JSON.parse(JSON.stringify(value)))
  },
  removeStorageSync(key) {
    if (storageShouldFail) throw new Error('quota')
    memory.delete(key)
  },
  login(options) {
    if (loginShouldFail) options.fail({ errMsg: 'network fail' })
    else options.success({ code: 'temporary-login-code' })
  }
}

const {
  ACCOUNT_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  loadAccount,
  loadUser,
  loginWithWeChat,
  updateProfile,
  logout,
  deleteLocalAccount,
  normalizeNickName
} = require('../utils/auth')

async function run() {
  assert.strictEqual(loadAccount(), null, '空存储不应凭空生成账户')
  assert.strictEqual(loadUser(), null, '空存储不应显示已登录')
  assert.strictEqual(normalizeNickName('  清   风  '), '清 风', '昵称空白归一化错误')
  await assert.rejects(
    () => loginWithWeChat({ nickName: '未同意' }),
    /请先阅读并同意/,
    '首次注册没有在逻辑层强制协议同意'
  )

  const first = await loginWithWeChat({ nickName: '  清   风  ', avatarUrl: 'avatar://one', agreed: true })
  assert.ok(first.authenticated && first.localOnly, '首次登录没有建立本地会话')
  assert.strictEqual(first.nickName, '清 风', '首次注册昵称错误')
  assert.ok(first.id.startsWith('local_'), '本机账户 ID 格式错误')
  assert.strictEqual(loadUser().id, first.id, '会话恢复没有识别同一账户')
  assert.ok(memory.has(ACCOUNT_STORAGE_KEY), '账户资料未保存')
  assert.ok(memory.has(SESSION_STORAGE_KEY), '会话未保存')
  assert.ok(loadAccount().policyVersion && loadAccount().consentedAt, '协议版本和同意时间未保存')
  assert.doesNotMatch(JSON.stringify([...memory.entries()]), /temporary-login-code|codeHint|hasLoginCode/, '临时登录 code 被写入存储')

  logout()
  assert.strictEqual(loadUser(), null, '退出后仍显示已登录')
  assert.strictEqual(loadAccount().id, first.id, '退出不应删除本机账户资料')

  const second = await loginWithWeChat({})
  assert.strictEqual(second.id, first.id, '再次登录不应重复注册新账户')
  assert.strictEqual(second.nickName, '清 风', '再次登录不应覆盖已有昵称')

  const updated = updateProfile({ nickName: '观  澜', avatarUrl: 'avatar://two' })
  assert.strictEqual(updated.nickName, '观 澜', '编辑资料未更新昵称')
  assert.strictEqual(updated.avatarUrl, 'avatar://two', '编辑资料未更新头像')

  loginShouldFail = true
  await assert.rejects(() => loginWithWeChat({ agreed: true }), /微信登录未完成/, '微信登录失败没有明确提示')
  loginShouldFail = false

  deleteLocalAccount()
  assert.strictEqual(loadAccount(), null, '注销后账户资料仍存在')
  assert.strictEqual(loadUser(), null, '注销后会话仍存在')

  memory.set(LEGACY_STORAGE_KEY, {
    provider: 'wechat',
    nickName: '旧账户',
    avatarUrl: '',
    loginAt: '2026-01-02T03:04:05.000Z',
    codeHint: 'should-not-survive'
  })
  const migrated = loadUser()
  assert.ok(migrated && migrated.nickName === '旧账户', '旧版账户迁移失败')
  assert.ok(!memory.has(LEGACY_STORAGE_KEY), '旧版存储键未清理')
  assert.doesNotMatch(JSON.stringify(memory.get(ACCOUNT_STORAGE_KEY)), /codeHint/, '旧版临时凭证痕迹被迁移')

  deleteLocalAccount()
  storageShouldFail = true
  await assert.rejects(() => loginWithWeChat({ nickName: '无法保存', agreed: true }), /账户资料保存失败/, '存储失败没有反馈')
  storageShouldFail = false

  console.log('auth: all checks passed')
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
