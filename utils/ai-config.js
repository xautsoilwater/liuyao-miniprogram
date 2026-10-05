/**
 * 周易 AI 算卦大模型接口配置中心
 * 支持标准 OpenAI / DeepSeek / 通义千问等兼容协议
 */

const DEFAULT_AI_CONFIG = {
  // 默认 API 服务地址 (OpenAI 兼容协议)
  apiUrl: 'https://api.deepseek.com/chat/completions',
  // 默认模型
  model: 'deepseek-chat',
  // 内置 API 密钥 (用户可在界面设置中替换自己的私有 Key)
  apiKey: 'sk-zhouyi-ai-divination-key',
  // 温度与采样
  temperature: 0.7,
  maxTokens: 2000,
  // 备用端点 (通义千问等兼容地址)
  fallbackUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
}

const STORAGE_KEY = 'zhouyi_ai_custom_config_v1'

/**
 * 获取当前生效的 AI 配置 (优先使用用户自定义设置)
 */
function getAiConfig() {
  let custom = null
  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      custom = wx.getStorageSync(STORAGE_KEY)
    } else if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) custom = JSON.parse(raw)
    }
  } catch (e) {
    // ignore
  }

  return Object.assign({}, DEFAULT_AI_CONFIG, custom || {})
}

/**
 * 保存用户自定义 AI 配置
 */
function saveAiConfig(cfg) {
  try {
    const merged = Object.assign({}, getAiConfig(), cfg)
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync(STORAGE_KEY, merged)
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    }
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  DEFAULT_AI_CONFIG,
  getAiConfig,
  saveAiConfig
}
