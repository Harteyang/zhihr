import { Context } from 'hono'
import type { Env } from './index'
import { searchBookByTitle, searchKnowledgeByKeyword, createSubmission, getSubmissionById, updateSubmissionStatus, getAllSubmissions, addBookWithKnowledge } from './db'
import { searchMlook, searchMlookRSSFeed, loginToMlook, processMlookBook } from './scraper'

// GET /api/books/search
export async function handleSearchBook(c: Context<{ Bindings: Env }>) {
  try {
    const query = c.req.query('q') || c.req.query('title') || ''
    if (!query) {
      return c.json({ found: false, message: '请提供搜索关键词' })
    }

    const books = await searchBookByTitle(c.env.DB, query)
    if (books.length > 0) {
      return c.json({ found: true, message: '搜索成功', data: books })
    }

    return c.json({
      found: false,
      message: `数据库中未找到「${query}」的拆解信息`,
      needMlookSearch: true,
      query,
    })
  } catch (err: any) {
    console.error('handleSearchBook error:', err)
    return c.json({ found: false, message: '搜索失败: ' + (err?.message || String(err)) }, 500)
  }
}

// GET /api/knowledge/search
export async function handleSearchKnowledge(c: Context<{ Bindings: Env }>) {
  try {
    const keyword = c.req.query('q') || c.req.query('keyword') || ''
    if (!keyword) {
      return c.json({ found: false, message: '请提供搜索关键词' })
    }

    const kps = await searchKnowledgeByKeyword(c.env.DB, keyword)
    return c.json({ found: kps.length > 0, message: kps.length > 0 ? '搜索成功' : '未找到相关知识点', data: kps })
  } catch (err: any) {
    console.error('handleSearchKnowledge error:', err)
    return c.json({ found: false, message: '搜索失败: ' + (err?.message || String(err)) }, 500)
  }
}

// GET /api/mlook/search
export async function handleSearchMlook(c: Context<{ Bindings: Env }>) {
  try {
    const query = c.req.query('q') || ''
    if (!query) {
      return c.json({ found: false, message: '请提供搜索关键词' })
    }

    let books: any[] = []
    let cookies: string | null = null

    if (c.env.MLOOK_USERNAME && c.env.MLOOK_PASSWORD) {
      cookies = await loginToMlook(c.env.MLOOK_USERNAME, c.env.MLOOK_PASSWORD)
      if (cookies) {
        books = await searchMlook(query, cookies)
      }
    }

    if (!books.length) {
      books = await searchMlookRSSFeed(query)
    }

    if (books.length > 0) {
      return c.json({ found: true, message: `在 mlook.mobi 找到 ${books.length} 本相关电子书`, data: books })
    }

    return c.json({ found: false, message: `mlook.mobi 上也未找到「${query}」的电子书资源` })
  } catch (err: any) {
    console.error('handleSearchMlook error:', err)
    return c.json({ found: false, message: 'mlook 搜索失败: ' + (err?.message || String(err)) }, 500)
  }
}

// POST /api/submit
export async function handleSubmitDeconstruct(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json()
    const { title, type, searchQuery, mlookLink } = body

    if (!title || !type) {
      return c.json({ success: false, message: '缺少必要参数' })
    }

    const result = await createSubmission(c.env.DB, { title, type, searchQuery, mlookLink })

    if (mlookLink) {
      const submissionId = (result as any).id
      c.executionCtx.waitUntil(processMlookBook(c.env as any, mlookLink, submissionId))
    }

    return c.json({ success: true, submissionId: (result as any).id, message: '已提交拆解请求，正在处理中...' })
  } catch (err: any) {
    console.error('handleSubmitDeconstruct error:', err)
    return c.json({ success: false, message: '提交失败: ' + (err?.message || String(err)) }, 500)
  }
}

// GET /api/submission/:id
export async function handleGetSubmissionStatus(c: Context<{ Bindings: Env }>) {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ success: false, message: '无效的 ID' })
    }

    const submission = await getSubmissionById(c.env.DB, id)
    if (!submission) {
      return c.json({ success: false, message: '未找到该提交记录' })
    }

    return c.json(submission)
  } catch (err: any) {
    console.error('handleGetSubmissionStatus error:', err)
    return c.json({ success: false, message: '查询失败: ' + (err?.message || String(err)) }, 500)
  }
}

// PUT /api/submission/:id
export async function handleUpdateSubmission(c: Context<{ Bindings: Env }>) {
  try {
    const id = parseInt(c.req.param('id'), 10)
    if (isNaN(id)) {
      return c.json({ success: false, message: '无效的 ID' })
    }

    const body = await c.req.json()
    const { status, error_message } = body

    if (!status) {
      return c.json({ success: false, message: '缺少必要参数 status' })
    }

    const validStatuses = ['queued', 'processing', 'completed', 'failed']
    if (!validStatuses.includes(status)) {
      return c.json({ success: false, message: '无效的状态值' })
    }

    await updateSubmissionStatus(c.env.DB, id, status, error_message)
    return c.json({ success: true, message: '状态已更新' })
  } catch (err: any) {
    console.error('handleUpdateSubmission error:', err)
    return c.json({ success: false, message: '更新失败: ' + (err?.message || String(err)) }, 500)
  }
}

// GET /api/submissions
export async function handleGetAllSubmissions(c: Context<{ Bindings: Env }>) {
  try {
    const status = c.req.query('status') || ''
    const submissions = await getAllSubmissions(c.env.DB, status)
    return c.json({ submissions })
  } catch (err: any) {
    console.error('handleGetAllSubmissions error:', err)
    return c.json({ success: false, message: '查询失败: ' + (err?.message || String(err)) }, 500)
  }
}

// POST /api/admin/books
export async function handleAddBook(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json()

    if (!body.title) {
      return c.json({ success: false, message: '书名不能为空' })
    }

    const bookId = await addBookWithKnowledge(c.env.DB, body)
    return c.json({ success: true, book: { id: bookId, ...body } })
  } catch (err: any) {
    console.error('handleAddBook error:', err)
    return c.json({ success: false, message: '录入失败: ' + (err?.message || String(err)) }, 500)
  }
}
