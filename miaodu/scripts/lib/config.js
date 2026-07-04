/**
 * 配置加载模块
 * 从 .env 文件和环境变量中加载配置
 */
import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  // 从项目根目录加载 .env
  const envPath = resolve(__dirname, '..', '.env')
  if (!existsSync(envPath)) {
    console.warn('⚠️  未找到 .env 文件，使用环境变量或默认值')
    return
  }

  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnv()

export const config = {
  // 后端 API 地址
  apiBaseUrl: process.env.API_BASE_URL || 'https://api.zhihr.vip',

  // mlook.mobi 凭证
  mlookUsername: process.env.MLOOK_USERNAME || '',
  mlookPassword: process.env.MLOOK_PASSWORD || '',

  // LLM API 配置（用于知识提取）
  llm: {
    apiKey: process.env.LLM_API_KEY || '',
    baseUrl: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
  },

  // 处理间隔（秒）
  pollInterval: parseInt(process.env.POLL_INTERVAL || '60', 10),

  // 下载目录
  downloadDir: process.env.DOWNLOAD_DIR || resolve(__dirname, '..', 'downloads'),
}