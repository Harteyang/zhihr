import { debugLog, jsonResponse } from '../utils/router.js'

// ========= 数据库函数 =========

async function searchBookByTitle(db, query) {
  const q = query.replace(/'/g, "''")
  const sql = `SELECT * FROM miaodu_books WHERE title LIKE '%${q}%' ORDER BY created_at DESC LIMIT 20`
  const books = await db.prepare(sql).all()
  if (!books.results.length) return []

  const result = []
  for (const book of books.results) {
    const kpSql = `SELECT * FROM miaodu_knowledge_points WHERE book_id = ${book.id} ORDER BY sort_order`
    const kps = await db.prepare(kpSql).all()
    result.push({ ...book, knowledge_points: kps.results })
  }
  return result
}

async function searchKnowledgeByKeyword(db, keyword) {
  const kw = keyword.replace(/'/g, "''")
  const sql = `
    SELECT kp.*, b.title AS book_title, b.author AS book_author,
           b.baidu_pan_url, b.baidu_pan_code, b.mlook_link
    FROM miaodu_knowledge_points kp
    JOIN miaodu_books b ON kp.book_id = b.id
    WHERE kp.title LIKE '%${kw}%' OR kp.content LIKE '%${kw}%'
    ORDER BY b.title, kp.sort_order
    LIMIT 30
  `
  const kps = await db.prepare(sql).all()
  return kps.results
}

async function createSubmission(db, data) {
  const title = data.title.replace(/'/g, "''")
  const type = data.type.replace(/'/g, "''")
  const searchQuery = (data.searchQuery || '').replace(/'/g, "''")
  const mlookLink = data.mlookLink ? data.mlookLink.replace(/'/g, "''") : null
  const sql = `INSERT INTO miaodu_submissions (title, type, search_query, status, mlook_link) VALUES ('${title}', '${type}', '${searchQuery}', 'queued', ${mlookLink ? "'" + mlookLink + "'" : 'NULL'}) RETURNING id`
  const result = await db.prepare(sql).first()
  return result
}

// ========= 路由处理器 =========

async function handleSearchBook(request, env, corsHeaders) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || url.searchParams.get('title') || ''
    if (!query) {
      return jsonResponse({ found: false, message: '请提供搜索关键词' }, 200, corsHeaders)
    }

    const books = await searchBookByTitle(env.DB, query)
    if (books.length > 0) {
      return jsonResponse({ found: true, message: '搜索成功', data: books }, 200, corsHeaders)
    }

    return jsonResponse({
      found: false,
      message: `数据库中未找到「${query}」的拆解信息`,
      needMlookSearch: true,
      query,
    }, 200, corsHeaders)
  } catch (err) {
    console.error('handleSearchBook error:', err)
    return jsonResponse({ found: false, message: '搜索失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleSearchKnowledge(request, env, corsHeaders) {
  try {
    const url = new URL(request.url)
    const keyword = url.searchParams.get('q') || url.searchParams.get('keyword') || ''
    if (!keyword) {
      return jsonResponse({ found: false, message: '请提供搜索关键词' }, 200, corsHeaders)
    }

    const kps = await searchKnowledgeByKeyword(env.DB, keyword)
    return jsonResponse({
      found: kps.length > 0,
      message: kps.length > 0 ? '搜索成功' : '未找到相关知识点',
      data: kps,
    }, 200, corsHeaders)
  } catch (err) {
    console.error('handleSearchKnowledge error:', err)
    return jsonResponse({ found: false, message: '搜索失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleSearchMlook(request, env, corsHeaders) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    if (!query) {
      return jsonResponse({ found: false, message: '请提供搜索关键词' }, 200, corsHeaders)
    }

    let books = []
    let cookies = null

    if (env.MLOOK_USERNAME && env.MLOOK_PASSWORD) {
      cookies = await loginToMlook(env.MLOOK_USERNAME, env.MLOOK_PASSWORD)
      if (cookies) {
        books = await searchMlookCookies(query, cookies)
      }
    }

    if (!books.length) {
      books = await searchMlookRSS(query)
    }

    if (books.length > 0) {
      return jsonResponse({ found: true, message: `在 mlook.mobi 找到 ${books.length} 本相关电子书`, data: books }, 200, corsHeaders)
    }

    return jsonResponse({ found: false, message: `mlook.mobi 上也未找到「${query}」的电子书资源` }, 200, corsHeaders)
  } catch (err) {
    console.error('handleSearchMlook error:', err)
    return jsonResponse({ found: false, message: 'mlook 搜索失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleSubmitDeconstruct(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const { title, type, searchQuery, mlookLink } = body

    if (!title || !type) {
      return jsonResponse({ success: false, message: '缺少必要参数' }, 200, corsHeaders)
    }

    const result = await createSubmission(env.DB, { title, type, searchQuery, mlookLink })
    return jsonResponse({ success: true, submissionId: result.id, message: '已提交拆解请求，正在处理中...' }, 200, corsHeaders)
  } catch (err) {
    console.error('handleSubmitDeconstruct error:', err)
    return jsonResponse({ success: false, message: '提交失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleGetSubmissionStatus(request, env, corsHeaders, params) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return jsonResponse({ success: false, message: '无效的 ID' }, 200, corsHeaders)
    }

    const submission = await env.DB.prepare(`SELECT * FROM miaodu_submissions WHERE id = ?`).bind(id).first()
    if (!submission) {
      return jsonResponse({ success: false, message: '未找到该提交记录' }, 200, corsHeaders)
    }

    return jsonResponse(submission, 200, corsHeaders)
  } catch (err) {
    console.error('handleGetSubmissionStatus error:', err)
    return jsonResponse({ success: false, message: '查询失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleGetAllSubmissions(request, env, corsHeaders) {
  try {
    const result = await env.DB.prepare(`SELECT * FROM miaodu_submissions ORDER BY created_at DESC`).all()
    return jsonResponse({ submissions: result.results }, 200, corsHeaders)
  } catch (err) {
    console.error('handleGetAllSubmissions error:', err)
    return jsonResponse({ success: false, message: '查询失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleAddBook(request, env, corsHeaders) {
  try {
    const body = await request.json()
    if (!body.title) {
      return jsonResponse({ success: false, message: '书名不能为空' }, 200, corsHeaders)
    }

    const title = body.title.replace(/'/g, "''")
    const author = body.author ? `'${body.author.replace(/'/g, "''")}'` : 'NULL'
    const sql = `INSERT INTO miaodu_books (title, author, status) VALUES ('${title}', ${author}, 'completed') RETURNING id`
    const bookResult = await env.DB.prepare(sql).first()

    if (body.knowledge_points?.length) {
      for (let i = 0; i < body.knowledge_points.length; i++) {
        const kp = body.knowledge_points[i]
        const chapter = (kp.chapter || '').replace(/'/g, "''")
        const kpTitle = (kp.title || '').replace(/'/g, "''")
        const content = (kp.content || '').replace(/'/g, "''")
        await env.DB.prepare(
          `INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order) VALUES (${bookResult.id}, '${chapter}', ${kp.level || 3}, '${kpTitle}', '${content}', ${i})`
        ).run()
      }
    }

    return jsonResponse({ success: true, book: { id: bookResult.id, ...body } }, 200, corsHeaders)
  } catch (err) {
    console.error('handleAddBook error:', err)
    return jsonResponse({ success: false, message: '录入失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

// ========= mlook 爬虫函数 =========

async function loginToMlook(username, password) {
  try {
    const loginPageRes = await fetch('https://mlook.mobi/member/login', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const loginPageHtml = await loginPageRes.text()
    const formhashMatch = loginPageHtml.match(/name="formhash"\s+value="([^"]+)"/)
    if (!formhashMatch) return null
    const formhash = formhashMatch[1]

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
    return loginRes.headers.get('set-cookie')
  } catch { return null }
}

async function searchMlookCookies(query, cookies) {
  try {
    const res = await fetch(`https://mlook.mobi/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Cookie': cookies, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const html = await res.text()
    const books = []
    const regex = /<div\s+class="bookinfo">([\s\S]*?)<\/div>\s*<\/div>/g
    let match
    while ((match = regex.exec(html)) !== null) {
      const block = match[1]
      const titleMatch = block.match(/<h3>([^<]+)<\/h3>/)
      const linkMatch = block.match(/href="([^"]+)"/)
      const authorMatch = block.match(/作者[：:]\s*([^<]+)/)
      const isbnMatch = block.match(/ISBN[：:]\s*([^<]+)/)
      const title = titleMatch?.[1]?.trim()
      if (!title || !title.includes(query)) continue
      books.push({ title, author: authorMatch?.[1]?.trim() || '', isbn: isbnMatch?.[1]?.trim() || '', link: linkMatch?.[1] || '' })
    }
    return books
  } catch { return [] }
}

async function searchMlookRSS(query) {
  try {
    const res = await fetch('https://mlook.mobi/feed/books', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    const xml = await res.text()
    const books = []
    const regex = /<item>([\s\S]*?)<\/item>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
      const block = match[1]
      const titleMatch = block.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/)
      const linkMatch = block.match(/<link>([^<]+)<\/link>/)
      const title = titleMatch?.[1]?.trim()
      if (!title || !title.includes(query)) continue
      books.push({ title, author: '', isbn: '', link: linkMatch?.[1] || '' })
    }
    return books
  } catch { return [] }
}

// ========= 路由导出 =========

export const routes = [
  { method: 'GET', path: '/api/books/search', handler: handleSearchBook },
  { method: 'GET', path: '/api/knowledge/search', handler: handleSearchKnowledge },
  { method: 'GET', path: '/api/mlook/search', handler: handleSearchMlook },
  { method: 'POST', path: '/api/submit', handler: handleSubmitDeconstruct },
  { method: 'GET', path: '/api/submission/:id', handler: handleGetSubmissionStatus },
  { method: 'GET', path: '/api/submissions', handler: handleGetAllSubmissions },
  { method: 'POST', path: '/api/admin/books', handler: handleAddBook },
]
