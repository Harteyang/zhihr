import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 开发环境自动补全 base 路径末尾斜杠
 * 访问 /pinyin-graph 时 302 重定向到 /pinyin-graph/，
 * 避免 Vite 因缺少斜杠导致 HMR client 与模块路径解析错误。
 */
function trailingSlashRedirect(base) {
  const trimmed = base.replace(/\/$/, '')
  return {
    name: 'trailing-slash-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === trimmed || req.url.startsWith(`${trimmed}?`)) {
          const search = req.url.slice(trimmed.length)
          res.statusCode = 302
          res.setHeader('Location', `${base}${search}`)
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), trailingSlashRedirect('/pinyin-graph/')],
  base: '/pinyin-graph/',
  build: {
    outDir: 'dist',
  },
})