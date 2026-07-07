import { useState, useCallback, useMemo, useRef } from 'react'
import SearchBar from './components/SearchBar'
import ResultsPanel from './components/ResultsPanel'
import KnowledgeResultCard from './components/KnowledgeResultCard'
import MlookResults from './components/MlookResults'
import SubmitForm from './components/SubmitForm'
import BookList from './components/BookList'
import Breadcrumb from './components/Breadcrumb'
import KnowledgeGraph from './components/KnowledgeGraph'
import * as api from './api'

export default function App() {
  const [phase, setPhase] = useState('search')
  const [searchType, setSearchType] = useState('book')
  const [results, setResults] = useState(null)
  const [mlookBooks, setMlookBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  // 知识点搜索结果下的视图：list | graph
  const [knowledgeView, setKnowledgeView] = useState('list')
  // 保留从知识点搜索跳转书籍搜索时的原知识点搜索上下文
  const [knowledgeSearchContext, setKnowledgeSearchContext] = useState(null)
  // 用于取消过期搜索响应（面包屑返回时使进行中的搜索失效）
  const searchIdRef = useRef(0)

  const handleSearch = useCallback(async (q, type = 'book') => {
    const currentId = ++searchIdRef.current
    setLoading(true)
    setError(null)
    setLastQuery(q)
    setSearchType(type)
    setKnowledgeView('list')
    setResults(null)
    setMlookBooks([])
    setSelectedBook(null)

    try {
      const searchFn = type === 'knowledge' ? api.searchKnowledge : api.searchBooks
      const data = await searchFn(q)

      if (currentId !== searchIdRef.current) return

      if (data.found && data.data?.length > 0) {
        setResults(data.data)
        setPhase('search')
        setLoading(false)
        return
      }

      if (type === 'book') {
        setPhase('mlook')
        const mlookData = await api.searchMlook(q)
        if (currentId !== searchIdRef.current) return
        if (mlookData.found && mlookData.data?.length > 0) {
          setMlookBooks(mlookData.data)
        } else {
          setPhase('submit')
        }
      } else {
        setPhase('submit')
      }
    } catch (err) {
      if (currentId !== searchIdRef.current) return
      setError(err.message || '搜索失败，请稍后重试')
    } finally {
      if (currentId === searchIdRef.current) setLoading(false)
    }
  }, [])

  // 从 SearchBar 发起搜索（清除知识点导航上下文）
  const handleSearchFromBar = useCallback((q, type) => {
    setKnowledgeSearchContext(null)
    handleSearch(q, type)
  }, [handleSearch])

  // 从知识点搜索结果点击"查看"跳转书籍搜索，保留原知识点搜索状态
  const handleViewBookFromKnowledge = useCallback((bookTitle) => {
    setKnowledgeSearchContext({ query: lastQuery, results })
    setQuery(bookTitle)
    handleSearch(bookTitle, 'book')
  }, [lastQuery, results, handleSearch])

  // 通过面包屑返回原知识点搜索结果页
  const handleBackToKnowledgeSearch = useCallback(() => {
    if (!knowledgeSearchContext) return
    searchIdRef.current++  // 使进行中的搜索失效
    setSearchType('knowledge')
    setKnowledgeView('list')
    setQuery(knowledgeSearchContext.query)
    setLastQuery(knowledgeSearchContext.query)
    setResults(knowledgeSearchContext.results)
    setPhase('search')
    setMlookBooks([])
    setSelectedBook(null)
    setError(null)
    setLoading(false)
    setKnowledgeSearchContext(null)
  }, [knowledgeSearchContext])

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
    setQuery('')
    setKnowledgeSearchContext(null)
  }, [])

  const handleReset = useCallback(() => {
    searchIdRef.current++
    setPhase('search')
    setKnowledgeView('list')
    setResults(null)
    setMlookBooks([])
    setSelectedBook(null)
    setError(null)
    setLastQuery('')
    setQuery('')
    setKnowledgeSearchContext(null)
  }, [])

  const handleSearchBook = useCallback((title) => {
    setKnowledgeSearchContext(null)
    setQuery(title)
    handleSearch(title, 'book')
  }, [handleSearch])

  const isSearchActive = loading || error || results || phase !== 'search'

  // 计算面包屑节点
  const breadcrumbItems = useMemo(() => {
    const items = [{ label: '妙读', onClick: handleReset }]

    if (!lastQuery && !error) return null

    const isKnowledge = searchType === 'knowledge'
    const fromKnowledge = !isKnowledge && knowledgeSearchContext

    if (fromKnowledge) {
      items.push({
        label: `知识点搜索: ${knowledgeSearchContext.query}`,
        onClick: handleBackToKnowledgeSearch,
      })
      items.push({ label: `书籍详情: ${lastQuery}`, active: true })
      return items
    }

    if (isKnowledge) {
      items.push({ label: `知识点搜索: ${lastQuery}`, active: true })
    } else if (phase === 'submit') {
      items.push({ label: `提交拆解: ${lastQuery}`, active: true })
    } else {
      items.push({ label: `书籍搜索: ${lastQuery}`, active: true })
    }

    return items
  }, [lastQuery, error, phase, searchType, knowledgeSearchContext, handleReset, handleBackToKnowledgeSearch])

  const showBreadcrumb = isSearchActive && breadcrumbItems

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-xl font-bold text-gray-900">妙读</h1>
            <span className="text-sm text-gray-400">拆好书，读好书</span>
          </div>
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            onSearch={handleSearchFromBar}
            loading={loading}
            searchType={searchType}
            onTypeChange={setSearchType}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {showBreadcrumb && <Breadcrumb items={breadcrumbItems} />}

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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <p className="text-sm text-gray-500">
                找到 {results.length} 条相关知识点
              </p>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setKnowledgeView('list')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      knowledgeView === 'list'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    列表视图
                  </button>
                  <button
                    type="button"
                    onClick={() => setKnowledgeView('graph')}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      knowledgeView === 'graph'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    图谱视图
                  </button>
                </div>
                <button onClick={handleReset} className="text-sm text-primary hover:underline">
                  重新搜索
                </button>
              </div>
            </div>
            {knowledgeView === 'graph' ? (
              <KnowledgeGraph results={results} query={lastQuery} onViewBook={handleViewBookFromKnowledge} />
            ) : (
              results.map((item, i) => (
                <KnowledgeResultCard
                  key={item.id || i}
                  item={item}
                  onViewBook={handleViewBookFromKnowledge}
                />
              ))
            )}
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

        {/* 默认状态：显示电子书库 */}
        {!isSearchActive && (
          <BookList onSearchBook={handleSearchBook} />
        )}
      </main>
    </div>
  )
}
