import { useState, useCallback } from 'react'
import SearchBar from './components/SearchBar'
import ResultsPanel from './components/ResultsPanel'
import KnowledgeResultCard from './components/KnowledgeResultCard'
import MlookResults from './components/MlookResults'
import SubmitForm from './components/SubmitForm'
import * as api from './api'

export default function App() {
  const [phase, setPhase] = useState('search')
  const [searchType, setSearchType] = useState('book')
  const [results, setResults] = useState(null)
  const [mlookBooks, setMlookBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastQuery, setLastQuery] = useState('')

  const handleSearch = useCallback(async (query, type = 'book') => {
    setLoading(true)
    setError(null)
    setLastQuery(query)
    setSearchType(type)
    setResults(null)
    setMlookBooks([])
    setSelectedBook(null)

    try {
      const searchFn = type === 'knowledge' ? api.searchKnowledge : api.searchBooks
      const data = await searchFn(query)

      if (data.found && data.data?.length > 0) {
        setResults(data.data)
        setPhase('search')
        setLoading(false)
        return
      }

      // 按书名未命中 → 搜索 mlook
      if (type === 'book') {
        setPhase('mlook')
        const mlookData = await api.searchMlook(query)
        if (mlookData.found && mlookData.data?.length > 0) {
          setMlookBooks(mlookData.data)
        } else {
          setPhase('submit')
        }
      } else {
        // 按知识点未命中 → 直接提交
        setPhase('submit')
      }
    } catch (err) {
      setError(err.message || '搜索失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMlookSelect = useCallback((book) => {
    setSelectedBook(book)
    setPhase('submit')
  }, [])

  const handleMlookCancel = useCallback(() => {
    setSelectedBook(null)
    setPhase('submit')
  }, [])

  const handleSubmitSuccess = useCallback(() => {
    setPhase('none')
    setResults(null)
    setMlookBooks([])
    setSelectedBook(null)
    setLastQuery('')
  }, [])

  const handleReset = useCallback(() => {
    setPhase('search')
    setResults(null)
    setMlookBooks([])
    setSelectedBook(null)
    setError(null)
    setLastQuery('')
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-xl font-bold text-gray-900">妙读</h1>
            <span className="text-sm text-gray-400">拆好书，读好书</span>
          </div>
          <SearchBar
            onSearch={handleSearch}
            loading={loading}
            searchType={searchType}
            onTypeChange={setSearchType}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* 加载状态 */}
        {loading && (
          <div className="flex items-center gap-3 text-gray-500 py-8 justify-center">
            <div className="spinner" />
            <span>{phase === 'mlook' ? '正在搜索 mlook.mobi...' : '正在搜索...'}</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 fade-in">
            {error}
          </div>
        )}

        {/* 按书名搜索结果 */}
        {!loading && phase === 'search' && searchType === 'book' && results?.length > 0 && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                找到 {results.length} 本相关书籍
              </p>
              <button onClick={handleReset} className="text-sm text-primary hover:underline">
                重新搜索
              </button>
            </div>
            {results.map((book) => (
              <ResultsPanel key={book.id} book={book} />
            ))}
          </div>
        )}

        {/* 按知识点搜索结果 */}
        {!loading && phase === 'search' && searchType === 'knowledge' && results?.length > 0 && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                找到 {results.length} 条相关知识点
              </p>
              <button onClick={handleReset} className="text-sm text-primary hover:underline">
                重新搜索
              </button>
            </div>
            {results.map((item, i) => (
              <KnowledgeResultCard key={item.id || i} item={item} />
            ))}
          </div>
        )}

        {/* mlook 搜索结果 */}
        {!loading && phase === 'mlook' && mlookBooks.length > 0 && (
          <MlookResults
            books={mlookBooks}
            query={lastQuery}
            onSelect={handleMlookSelect}
            onCancel={handleMlookCancel}
          />
        )}

        {/* 提交表单 */}
        {!loading && phase === 'submit' && (
          <SubmitForm
            query={lastQuery}
            selectedBook={selectedBook}
            onSuccess={handleSubmitSuccess}
          />
        )}

        {/* 成功提示 */}
        {!loading && phase === 'none' && (
          <div className="text-center py-12 fade-in">
            <div className="text-2xl mb-3">✅</div>
            <p className="text-gray-700 mb-2">已提交拆解请求，正在处理中...</p>
            <button onClick={handleReset} className="text-primary hover:underline text-sm">
              继续搜索
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!loading && phase === 'search' && !results && !error && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">输入书名或知识点开始搜索</p>
            <p className="text-sm">支持搜索已有拆解内容，也可提交拆解需求</p>
          </div>
        )}
      </main>
    </div>
  )
}
