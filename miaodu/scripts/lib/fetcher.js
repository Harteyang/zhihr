/**
 * mlook 抓取模块
 * 处理 mlook.mobi 的登录、搜索、详情抓取和 EPUB 下载
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'
import { config } from './config.js'

// 确保下载目录存在
if (!existsSync(config.downloadDir)) {
  mkdirSync(config.downloadDir, { recursive: true })
}

/**
 * 登录 mlook.mobi
 */
export async function loginToMlook() {
  if (!config.mlookUsername || !config.mlookPassword) {
    console.warn('⚠️  未配置 mlook 凭证，使用无 cookie 模式')
    return null
  }

  const loginPageRes = await fetch('https://mlook.mobi/member/login', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })
  const loginPageHtml = await loginPageRes.text()
  const formhashMatch = loginPageHtml.match(/name="formhash"\s+value="([^"]+)"/)
  if (!formhashMatch) {
    console.warn('⚠️  无法获取 mlook 登录 formhash')
    return null
  }

  const loginRes = await fetch('https://mlook.mobi/member/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    body: new URLSearchParams({
      'person[login]': config.mlookUsername,
      'person[password]': config.mlookPassword,
      formhash: formhashMatch[1],
      'person[remember_me]': '1',
    }),
    redirect: 'manual',
  })

  return loginRes.headers.get('set-cookie')
}

/**
 * 抓取 mlook 书籍详情
 * 返回百度网盘链接、EPUB 下载链接等
 */
export async function fetchBookDetail(mlookLink, cookies = null) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  }
  if (cookies) headers['Cookie'] = cookies

  const res = await fetch(mlookLink, { headers })
  const html = await res.text()

  const panUrlMatch = html.match(/百度网盘.*?href="([^"]+)"/)
  const panCodeMatch = html.match(/提取码[：:]\s*(\w{4})/)
  const epubMatch = html.match(/href="([^"]*\.epub[^"]*)"/)

  let epubUrl = null
  if (epubMatch) {
    const relative = epubMatch[1]
    epubUrl = relative.startsWith('http')
      ? relative
      : new URL(relative, 'https://mlook.mobi').href
  }

  return {
    baiduPanUrl: panUrlMatch?.[1] || null,
    baiduPanCode: panCodeMatch?.[1] || null,
    epubUrl,
  }
}

/**
 * 下载 EPUB 文件到本地
 * 返回本地文件路径
 */
export async function downloadEpub(epubUrl, bookTitle) {
  const safeName = bookTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  const filePath = resolve(config.downloadDir, `${safeName}.epub`)

  console.log(`  下载 EPUB: ${epubUrl}`)

  const res = await fetch(epubUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  })

  if (!res.ok) {
    throw new Error(`EPUB 下载失败: ${res.status} ${res.statusText}`)
  }

  const buffer = await res.arrayBuffer()
  writeFileSync(filePath, Buffer.from(buffer))
  console.log(`  已保存: ${filePath}`)

  return filePath
}