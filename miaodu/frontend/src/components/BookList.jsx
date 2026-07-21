import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip'
const FIRST_PAGE_SIZE = 18
const NEXT_PAGE_SIZE = 24

/** 从豆瓣链接提取 subject ID，通过 API 代理获取封面（解决热链接拦截） */
function getCoverUrl(doubanLink) {
  if (!doubanLink) return null
  const match = doubanLink.match(/\/subject\/(\d+)\/?/)
  if (!match) return null
  return `${API_BASE}/api/cover/${match[1]}`
}

export default function BookList({ onSearchBook }) {
  const [allBooks, setAllBooks] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pagination, setPagination] = useState(null)
  const [error, setError] = useState(null)

  const loadBooks = useCallback(async (pageNum) => {
    const isFirst = pageNum === 1
    try {
      if (isFirst) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      const pageSize = isFirst ? FIRST_PAGE_SIZE : NEXT_PAGE_SIZE
      const result = await api.fetchBookList(pageNum, pageSize)

      if (result.success) {
        setAllBooks(prev => {
          const existingIds = new Set(prev.map(b => b.id))
          const newBooks = (result.data || []).filter(b => !existingIds.has(b.id))
          return [...prev, ...newBooks]
        })
        setPagination(result.pagination)
      } else {
        setError(result.message || '获取电子书列表失败')
      }
    } catch (err) {
      setError(err.message || '获取电子书列表失败')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    loadBooks(1)
  }, [loadBooks])

  const handleNextPage = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadBooks(nextPage)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-gray-500 py-16 justify-center">
        <div className="spinner" />
        <span>加载电子书中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
        <button
          onClick={() => loadBooks(1)}
          className="ml-3 text-sm text-primary hover:underline"
        >
          重试
        </button>
      </div>
    )
  }

  if (!allBooks.length) {
    return null
  }

  return (
    <section className="fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">电子书库</h2>
          <span className="px-2 py-0.5 text-xs font-medium text-primary bg-primary/5 rounded-full border border-primary/10">
            共 {pagination?.total || 0} 本
          </span>
        </div>
      </div>

      {/* 书籍网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBooks.map((book) => {
          const coverUrl = getCoverUrl(book.douban_link)
          return (
          <div
            key={book.id}
            className="result-card group flex gap-4"
          >
            {/* 封面缩略图 */}
            {coverUrl && (
              <div className="shrink-0">
                <img
                  src={coverUrl}
                  alt={book.title}
                  className="w-14 h-20 object-cover rounded-sm shadow-sm bg-gray-50"
                  onError={(e) => { e.target.style.display = 'none' }}
                  loading="lazy"
                />
              </div>
            )}

            {/* 书籍信息 */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* 评分与书名 */}
              <div className="flex items-start gap-2 mb-1">
                {book.douban_rate != null && (
                  <span className="shrink-0 flex items-center gap-0.5 text-amber-500 text-xs font-semibold leading-5">
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {book.douban_rate}
                  </span>
                )}
                <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                  {book.title}
                </h3>
              </div>

              {/* 作者 */}
              {book.author && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-1">{book.author}</p>
              )}

              {/* Spacer */}
              <div className="flex-1" />

              {/* 操作区 */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {book.douban_link && (
                  <a
                    href={book.douban_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 transition-colors"
                    title="查看豆瓣页面"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.5 10.5h3v6h-3zm5-3h3v9h-3zm5 2h3v7h-3zm-15 7h.5l.6.4 1.2.8 1.9.8 2.7.8 3.5.8 4.2.6 4.7.4h4.5V9l-3.5-.6-3-.8-2.5-1-2.2-1-2-.6-1.6-.4h-2L5 7l-2 1.5L2 10v9.5z"/>
                    </svg>
                    豆瓣
                  </a>
                )}
                <button
                  onClick={() => onSearchBook && onSearchBook(book.title)}
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  查看详情
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      {/* 加载更多 */}
      {loadingMore && (
        <div className="flex items-center gap-3 text-gray-500 py-8 justify-center">
          <div className="spinner" />
          <span>加载中...</span>
        </div>
      )}

      {/* 分页按钮 */}
      {pagination?.hasMore && !loadingMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleNextPage}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-primary bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
          >
            加载更多电子书
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* 已加载全部 */}
      {!pagination?.hasMore && allBooks.length > 0 && (
        <p className="text-center text-sm text-gray-400 mt-8">
          — 已加载全部 {pagination?.total || ''} 本电子书 —
        </p>
      )}
    </section>
  )
}