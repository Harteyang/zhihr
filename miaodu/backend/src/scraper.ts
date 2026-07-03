interface MlookBook {
  title: string
  author: string
  isbn: string
  link: string
}

// 登录 mlook.mobi
export async function loginToMlook(username: string, password: string): Promise<string | null> {
  try {
    // 1. GET 登录页获取 formhash
    const loginPageRes = await fetch('https://mlook.mobi/member/login', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    const loginPageHtml = await loginPageRes.text()

    const formhashMatch = loginPageHtml.match(/name="formhash"\s+value="([^"]+)"/)
    if (!formhashMatch) return null
    const formhash = formhashMatch[1]

    // 2. POST 登录
    const loginRes = await fetch('https://mlook.mobi/member/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      body: new URLSearchParams({
        'person[login]': username,
        'person[password]': password,
        formhash,
        'person[remember_me]': '1',
      }),
      redirect: 'manual',
    })

    const cookies = loginRes.headers.get('set-cookie')
    return cookies
  } catch {
    return null
  }
}

// 在 mlook.mobi 搜索
export async function searchMlook(query: string, cookies?: string): Promise<MlookBook[]> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
    if (cookies) headers['Cookie'] = cookies

    const res = await fetch(`https://mlook.mobi/search?q=${encodeURIComponent(query)}`, { headers })
    const html = await res.text()

    const books: MlookBook[] = []
    const bookInfoRegex = /<div\s+class="bookinfo">([\s\S]*?)<\/div>\s*<\/div>/g
    let match

    while ((match = bookInfoRegex.exec(html)) !== null) {
      const block = match[1]
      const titleMatch = block.match(/<h3>([^<]+)<\/h3>/)
      const linkMatch = block.match(/href="([^"]+)"/)
      const authorMatch = block.match(/作者[：:]\s*([^<]+)/)
      const isbnMatch = block.match(/ISBN[：:]\s*([^<]+)/)

      const title = titleMatch?.[1]?.trim()
      if (!title || !title.includes(query)) continue

      books.push({
        title,
        author: authorMatch?.[1]?.trim() || '',
        isbn: isbnMatch?.[1]?.trim() || '',
        link: linkMatch?.[1] || '',
      })
    }

    return books
  } catch {
    return []
  }
}

// RSS Feed 兜底搜索
export async function searchMlookRSSFeed(query: string): Promise<MlookBook[]> {
  try {
    const res = await fetch('https://mlook.mobi/feed/books', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    const xml = await res.text()

    const books: MlookBook[] = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const block = match[1]
      const titleMatch = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/)
      const linkMatch = block.match(/<link>([^<]+)<\/link>/)
      const authorMatch = block.match(/<author>([^<]+)<\/author>/)
      const isbnMatch = block.match(/<isbn>([^<]+)<\/isbn>/)

      const title = titleMatch?.[1]?.trim()
      if (!title || !title.includes(query)) continue

      books.push({
        title,
        author: authorMatch?.[1]?.trim() || '',
        isbn: isbnMatch?.[1]?.trim() || '',
        link: linkMatch?.[1] || '',
      })
    }

    return books
  } catch {
    return []
  }
}

// 获取书籍详情（百度网盘链接、EPUB 下载链接等）
export async function getBookDetail(mlookLink: string, cookies?: string) {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    }
    if (cookies) headers['Cookie'] = cookies

    const res = await fetch(mlookLink, { headers })
    const html = await res.text()

    // 提取百度网盘链接
    const panUrlMatch = html.match(/百度网盘.*?href="([^"]+)"/)
    // 提取提取码
    const panCodeMatch = html.match(/提取码[：:]\s*(\w{4})/)
    // 提取 EPUB 下载链接
    const epubMatch = html.match(/href="([^"]*\.epub[^"]*)"/)

    return {
      baiduPanUrl: panUrlMatch?.[1] || null,
      baiduPanCode: panCodeMatch?.[1] || null,
      epubDownloadUrl: epubMatch?.[1] || null,
    }
  } catch {
    return null
  }
}

// 后台处理 mlook 书籍（验证可下载性）
export async function processMlookBook(
  env: { DB: D1Database; MLOOK_USERNAME?: string; MLOOK_PASSWORD?: string },
  mlookLink: string,
  submissionId: number
) {
  const { updateSubmissionStatus } = await import('./db')

  try {
    await updateSubmissionStatus(env.DB, submissionId, 'processing')

    let cookies: string | undefined
    if (env.MLOOK_USERNAME && env.MLOOK_PASSWORD) {
      cookies = (await loginToMlook(env.MLOOK_USERNAME, env.MLOOK_PASSWORD)) || undefined
    }

    const detail = await getBookDetail(mlookLink, cookies)

    if (detail?.epubDownloadUrl) {
      await updateSubmissionStatus(env.DB, submissionId, 'completed')
    } else {
      await updateSubmissionStatus(env.DB, submissionId, 'failed', '无法获取 EPUB 下载链接')
    }
  } catch (err) {
    await updateSubmissionStatus(env.DB, submissionId, 'failed', String(err))
  }
}
