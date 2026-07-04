import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleSearchBook, handleSearchKnowledge, handleSearchMlook, handleSubmitDeconstruct, handleGetSubmissionStatus, handleGetAllSubmissions, handleAddBook } from './routes'

export type Env = {
  DB: D1Database
  MLOOK_USERNAME?: string
  MLOOK_PASSWORD?: string
  ALLOWED_ORIGINS?: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS 配置
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS || ''
    const origins = allowed.split(',').map(o => o.trim()).filter(Boolean)
    if (origins.includes(origin)) return origin
    if (!origin) return '*'
    return origins[0] || '*'
  },
}))

// 全局错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal Server Error', message: err.message }, 500)
})

// 健康检查
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() })
})

// API 路由
app.get('/api/books/search', handleSearchBook)
app.get('/api/knowledge/search', handleSearchKnowledge)
app.get('/api/mlook/search', handleSearchMlook)
app.post('/api/submit', handleSubmitDeconstruct)
app.get('/api/submission/:id', handleGetSubmissionStatus)
app.put('/api/submission/:id', handleUpdateSubmission)
app.get('/api/submissions', handleGetAllSubmissions)
app.post('/api/admin/books', handleAddBook)

export default app
