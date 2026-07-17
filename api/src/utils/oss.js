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

  /**
   * 生成 OSS 临时签名 URL（用于浏览器直传/直链）
   * @param {string} method HTTP 方法（GET/PUT/DELETE）
   * @param {string} key 对象键
   * @param {number} expiresIn 过期时间（秒），默认 300 秒
   * @param {Object} extraQuery 额外查询参数
   */
  async getSignedUrl(method, key, expiresIn = 300, extraQuery = {}, contentType = null) {
    const timestamp = Math.floor(Date.now() / 1000)
    const expires = timestamp + expiresIn

    // 构造待签名字符串
    // OSS 预签名 URL 的签名格式：VERB + "\n" + Content-MD5 + "\n" + Content-Type + "\n" + Expires + "\n" + CanonicalizedResource
    const verb = method.toUpperCase()
    const contentMd5 = ''
    // PUT 上传时尽量使用文件真实 MIME 类型，使 OSS 保存正确的 Content-Type 元数据，
    // 这样 GET 预览时浏览器才能根据 Content-Type 决定内嵌显示而非下载。
    // 调用方未指定时，PUT 默认 application/octet-stream，GET 默认空字符串。
    // 注意：签名中的 contentType 必须与前端实际发送的请求头完全一致，否则会 403。
    let signedContentType = contentType
    if (signedContentType === null) {
      signedContentType = verb === 'PUT' ? 'application/octet-stream' : ''
    }
    const expiresStr = String(expires) // 签名 URL 使用 Expires 时间戳而非 Date 头

    // 将 extraQuery 和签名参数合并，按字典序排序
    const queryParams = {
      ...extraQuery,
      OSSAccessKeyId: this.accessKeyId,
      Expires: expiresStr
    }
    const sortedKeys = Object.keys(queryParams).sort()
    const canonicalizedQuery = sortedKeys.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`).join('&')

    // OSS 预签名 URL 的 URL 路径需要使用 URL 编码
    const encodedKey = key.split('/').map(segment => encodeURIComponent(segment)).join('/')
    // canonicalizedResource 必须使用原始 key（未编码），OSS 会解码 URL 路径后与签名对比
    // 如果使用 encodedKey，当文件名包含中文等非 ASCII 字符时代码签名与 OSS 计算值不匹配，返回 403
    const canonicalizedResource = `/${this.bucket}/${key}`
    const stringToSign = [
      verb,
      contentMd5,
      signedContentType,
      expiresStr,
      canonicalizedResource
    ].join('\n')

    const encoder = new TextEncoder()
    const cryptoKey = await crypto.subtle.importKey(
      'raw', encoder.encode(this.accessKeySecret),
      { name: 'HMAC', hash: 'SHA-1' },
      false, ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(stringToSign))
    const signBytes = new Uint8Array(signature)
    let binary = ''
    for (let i = 0; i < signBytes.length; i++) {
      binary += String.fromCharCode(signBytes[i])
    }
    const signatureEncoded = encodeURIComponent(btoa(binary))

    return `https://${this.endpoint}/${encodedKey}?${canonicalizedQuery}&Signature=${signatureEncoded}`
  }
}
