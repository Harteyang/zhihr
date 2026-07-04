import { useState } from 'react'
import { submitDeconstruct } from '../api'

export default function SubmitForm({ query, selectedBook, onSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [doubanLink, setDoubanLink] = useState('')

  const title = selectedBook?.title || query || ''
  const mlookLink = selectedBook?.link || ''
  const type = selectedBook ? 'mlook_found' : 'manual_request'

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const result = await submitDeconstruct({
        title,
        type,
        searchQuery: query,
        mlookLink: mlookLink || undefined,
        doubanLink: doubanLink.trim() || undefined,
      })

      if (result.success) {
        onSuccess()
      } else {
        setError(result.message || '提交失败')
      }
    } catch (err) {
      setError('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">确认拆解请求</h3>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">书名</label>
            <p className="text-sm text-gray-800">{title}</p>
          </div>

          {selectedBook?.author && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">作者</label>
              <p className="text-sm text-gray-800">{selectedBook.author}</p>
            </div>
          )}

          {mlookLink && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">mlook 链接</label>
              <p className="text-sm text-gray-500 break-all">{mlookLink}</p>
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">豆瓣读书链接</label>
            <a
              href="https://book.douban.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              去豆瓣搜索这本书 →
            </a>
            <input
              type="text"
              value={doubanLink}
              onChange={(e) => setDoubanLink(e.target.value)}
              placeholder="找到书籍后复制豆瓣链接粘贴到这里"
              className="w-full mt-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 rounded p-3">{error}</div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? '提交中...' : '确认提交'}
          </button>
        </div>
      </div>
    </div>
  )
}