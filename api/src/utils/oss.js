import { debugLog } from './router.js'

/**
 * 阿里云 OSS 客户端（兼容 Cloudflare Workers 环境）
 * 使用 Web Crypto API 进行 HMAC-SHA1 签名，无需第三方 SDK
 */
export class OSSClient {
  constructor(env) {
    this.accessKeyId = env.OSS_ACCESS_KEY_ID
    this.accessKeySecret = env.OSS_ACCESS_KEY_SECRET
    this.bucket = env.OSS_BUCKET
    this.region = env.OSS_REGION
    this.endpoint = `${this.bucket}.oss-${this.region}.aliyuncs.com`
    this.baseUrl = `https://${this.endpoint}`
  }

  isConfigured() {
    return !!(this.accessKeyId && this.accessKeySecret && this.bucket && this.region)
  }

  /**
   * 生成 OSS REST API 签名请求头
   */
  async sign(method, resourcePath, additionalHeaders = {}) {
    const date = new Date().toUTCString()
    const contentType = additionalHeaders['Content-Type'] || ''
    const contentMd5 = additionalHeaders['Content-MD5'] || ''
    const canonicalizedResource = `/${this.bucket}${resourcePath}`

    const stringToSign = [
      method,
      contentMd5,
      contentType,
      date,
      canonicalizedResource
    ].join('\n')

    // 使用 Web Crypto API 计算 HMAC-SHA1
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(this.accessKeySecret),
      { name: 'HMAC', hash: 'SHA-1' },
      false, ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(stringToSign))
    const signBytes = new Uint8Array(signature)
    let binary = ''
    for (let i = 0; i < signBytes.length; i++) {
      binary += String.fromCharCode(signBytes[i])
    }
    const base64Sign = btoa(binary)

    return {
      Authorization: `OSS ${this.accessKeyId}:${base64Sign}`,
      Date: date,
      ...additionalHeaders
    }
  }

  /**
   * 上传文件到 OSS
   * @param {string} key 对象键（路径）
   * @param {ArrayBuffer|ReadableStream} body 文件内容
   * @param {string} contentType 文件 MIME 类型
   */
  async put(key, body, contentType = 'application/octet-stream') {
    try {
      const headers = await this.sign('PUT', `/${key}`, { 'Content-Type': contentType })
      const url = `${this.baseUrl}/${encodeURIComponent(key)}`
      const res = await fetch(url, { method: 'PUT', headers, body })
      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        throw new Error(`OSS 上传失败 (${res.status}): ${errText || res.statusText}`)
      }
      debugLog('OSS', 'Upload success:', key)
      return true
    } catch (err) {
      debugLog('OSS', 'Upload error:', err.message)
      throw err
    }
  }

  /**
   * 从 OSS 下载文件
   * @param {string} key 对象键
   * @returns {Promise<Response>} 包含文件内容的 Response 对象
   */
  async get(key) {
    try {
      const headers = await this.sign('GET', `/${key}`)
      const url = `${this.baseUrl}/${encodeURIComponent(key)}`
      const res = await fetch(url, { method: 'GET', headers })
      if (!res.ok) {
        throw new Error(`OSS 下载失败 (${res.status})`)
      }
      return res
    } catch (err) {
      debugLog('OSS', 'Download error:', err.message)
      throw err
    }
  }

  /**
   * 从 OSS 删除文件
   * @param {string} key 对象键
   */
  async delete(key) {
    try {
      const headers = await this.sign('DELETE', `/${key}`)
      const url = `${this.baseUrl}/${encodeURIComponent(key)}`
      const res = await fetch(url, { method: 'DELETE', headers })
      if (!res.ok && res.status !== 404) {
        throw new Error(`OSS 删除失败 (${res.status})`)
      }
      debugLog('OSS', 'Delete success:', key)
      return true
    } catch (err) {
      debugLog('OSS', 'Delete error:', err.message)
      throw err
    }
  }
}
