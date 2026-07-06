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
  const doubanLink = data.doubanLink ? data.doubanLink.replace(/'/g, "''") : null
  const sql = `INSERT INTO miaodu_submissions (title, type, search_query, status, mlook_link, douban_link) VALUES ('${title}', '${type}', '${searchQuery}', 'queued', ${mlookLink ? "'" + mlookLink + "'" : 'NULL'}, ${doubanLink ? "'" + doubanLink + "'" : 'NULL'}) RETURNING id`
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
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || ''
    let sql = `SELECT * FROM miaodu_submissions ORDER BY created_at DESC`
    if (status) {
      sql = `SELECT * FROM miaodu_submissions WHERE status = '${status.replace(/'/g, "''")}' ORDER BY created_at DESC`
    }
    const result = await env.DB.prepare(sql).all()
    return jsonResponse({ submissions: result.results }, 200, corsHeaders)
  } catch (err) {
    console.error('handleGetAllSubmissions error:', err)
    return jsonResponse({ success: false, message: '查询失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

async function handleUpdateSubmission(request, env, corsHeaders, params) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return jsonResponse({ success: false, message: '无效的 ID' }, 200, corsHeaders)
    }

    const body = await request.json()
    const { status, error_message } = body

    if (!status) {
      return jsonResponse({ success: false, message: '缺少必要参数 status' }, 200, corsHeaders)
    }

    const validStatuses = ['queued', 'processing', 'completed', 'failed']
    if (!validStatuses.includes(status)) {
      return jsonResponse({ success: false, message: '无效的状态值' }, 200, corsHeaders)
    }

    const errMsg = error_message ? error_message.replace(/'/g, "''") : null
    const sql = `UPDATE miaodu_submissions SET status = '${status}', error_message = ${errMsg ? "'" + errMsg + "'" : 'NULL'}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`
    await env.DB.prepare(sql).run()

    return jsonResponse({ success: true, message: '状态已更新' }, 200, corsHeaders)
  } catch (err) {
    console.error('handleUpdateSubmission error:', err)
    return jsonResponse({ success: false, message: '更新失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
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

/**
 * 批量提交审核后的数据
 * POST /api/admin/submit-batch
 * body: { books: [...], knowledge_points: [...], submission_ids: [...] }
 */
async function handleBatchSubmit(request, env, corsHeaders) {
  try {
    const body = await request.json()
    const books = body.books || []
    const kps = body.knowledge_points || []
    const submissionIds = body.submission_ids || []

    if (!books.length) {
      return jsonResponse({ success: false, message: '没有书籍数据' }, 200, corsHeaders)
    }

    const insertedIds = []

    for (const book of books) {
      const title = book.title.replace(/'/g, "''")
      const author = book.author ? `'${book.author.replace(/'/g, "''")}'` : 'NULL'
      const isbn = book.isbn ? `'${book.isbn.replace(/'/g, "''")}'` : 'NULL'
      const doubanRate = book.douban_rate || null
      const panUrl = book.baidu_pan_url ? `'${book.baidu_pan_url.replace(/'/g, "''")}'` : 'NULL'
      const panCode = book.baidu_pan_code ? `'${book.baidu_pan_code.replace(/'/g, "''")}'` : 'NULL'
      const mlookLink = book.mlook_link ? `'${book.mlook_link.replace(/'/g, "''")}'` : 'NULL'

      const sql = `INSERT INTO miaodu_books (title, author, isbn, douban_rate, baidu_pan_url, baidu_pan_code, mlook_link, status) VALUES ('${title}', ${author}, ${isbn}, ${doubanRate}, ${panUrl}, ${panCode}, ${mlookLink}, 'completed') RETURNING id`
      const result = await env.DB.prepare(sql).first()
      insertedIds.push((result && result.id) || 0)
    }

    // 查找知识库中已有的 book_id 映射（同一书名）
    const bookTitleMap = {}
    for (let i = 0; i < books.length; i++) {
      bookTitleMap[books[i].title] = insertedIds[i]
    }

    // 插入知识点
    for (const kp of kps) {
      const bookTitle = kp.book_title || kp.title
      const bookId = bookTitleMap[bookTitle]
      if (!bookId) continue

      const chapter = (kp.chapter || '').replace(/'/g, "''")
      const kpTitle = (kp.title || '').replace(/'/g, "''")
      const content = (kp.content || '').replace(/'/g, "''")
      await env.DB.prepare(
        `INSERT INTO miaodu_knowledge_points (book_id, chapter, level, title, content, sort_order) VALUES (${bookId}, '${chapter}', ${kp.level || 3}, '${kpTitle}', '${content}', ${kp.sort_order || 0})`
      ).run()
    }

    // 标记提交为完成
    if (submissionIds.length) {
      for (const id of submissionIds) {
        await env.DB.prepare(
          `UPDATE miaodu_submissions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`
        ).run()
      }
    }

    return jsonResponse({
      success: true,
      message: `已上传 ${books.length} 本书、${kps.length} 个知识点`,
      bookCount: books.length,
      knowledgePointCount: kps.length,
    }, 200, corsHeaders)
  } catch (err) {
    console.error('handleBatchSubmit error:', err)
    return jsonResponse({ success: false, message: '批量上传失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
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

// ========= 电子书列表 (首页展示) =========

async function handleListBooks(request, env, corsHeaders) {
  try {
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize')) || 20))
    const offset = (page - 1) * pageSize

    // 先查总数
    const countResult = await env.DB.prepare('SELECT COUNT(*) as total FROM miaodu_books WHERE status = ?').bind('completed').first()
    const total = countResult?.total || 0

    // 按 id 升序（入库顺序）分页查询，限制每页最多 100 条
    const books = await env.DB.prepare(
      'SELECT id, title, author, douban_rate, douban_link, isbn FROM miaodu_books WHERE status = ? ORDER BY id ASC LIMIT ? OFFSET ?'
    ).bind('completed', pageSize, offset).all()

    return jsonResponse({
      success: true,
      data: books.results || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: offset + pageSize < total,
      },
    }, 200, corsHeaders)
  } catch (err) {
    console.error('handleListBooks error:', err)
    return jsonResponse({ success: false, message: '获取列表失败: ' + (err?.message || String(err)) }, 500, corsHeaders)
  }
}

// ========= 封面代理 (解决豆瓣 CDN 热链接拦截) =========

async function handleCover(request, env, corsHeaders, params) {
  try {
    const subjectId = params.id
    if (!subjectId || !/^\d+$/.test(subjectId)) {
      return jsonResponse({ error: 'invalid subject id' }, 400, corsHeaders)
    }

    // 先获取豆瓣页面 HTML（含反爬 Cookie），再用 Cookie 请求封面图
    const pageUrl = `https://book.douban.com/subject/${subjectId}/`
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    }

    // 请求页面获取 Cookie
    const pageRes = await fetch(pageUrl, { headers })
    const setCookies = pageRes.headers.get('Set-Cookie') || ''

    // 从页面 HTML 中提取封面图 URL
    const html = await pageRes.text()
    // 豆瓣封面图在 <div id="mainpic"> 内的 <img> 标签上
    const imgMatch = html.match(/<div[^>]+id="mainpic"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/)
    const imgSrc = imgMatch?.[1]

    if (!imgSrc) {
      return jsonResponse({ error: 'cover not found' }, 404, corsHeaders)
    }

    // 用页面 Cookie 代理请求封面图
    const imgRes = await fetch(imgSrc, {
      headers: { ...headers, 'Referer': pageUrl, 'Cookie': setCookies, 'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' },
    })
    if (!imgRes.ok) return jsonResponse({ error: 'cover not found' }, 404, corsHeaders)

    return new Response(imgRes.body, {
      status: 200,
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error('handleCover error:', err)
    return jsonResponse({ error: 'proxy failed' }, 502, corsHeaders)
  }
}

// ========= 路由导出 =========

export const routes = [
  { method: 'GET', path: '/api/books/search', handler: handleSearchBook },
  { method: 'GET', path: '/api/knowledge/search', handler: handleSearchKnowledge },
  { method: 'GET', path: '/api/mlook/search', handler: handleSearchMlook },
  { method: 'POST', path: '/api/submit', handler: handleSubmitDeconstruct },
  { method: 'GET', path: '/api/submission/:id', handler: handleGetSubmissionStatus },
  { method: 'PUT', path: '/api/submission/:id', handler: handleUpdateSubmission },
  { method: 'GET', path: '/api/submissions', handler: handleGetAllSubmissions },
  { method: 'POST', path: '/api/admin/books', handler: handleAddBook },
  { method: 'POST', path: '/api/admin/submit-batch', handler: handleBatchSubmit },
  { method: 'GET', path: '/api/books/list', handler: handleListBooks },
  { method: 'GET', path: '/api/cover/:id', handler: handleCover },
]
