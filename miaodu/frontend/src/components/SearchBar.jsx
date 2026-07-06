export default function SearchBar({ query, onQueryChange, onSearch, loading, searchType, onTypeChange }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) onSearch(q, searchType)
  }

  const handleChange = (e) => {
    onQueryChange(e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const q = query.trim()
      if (q) onSearch(q, searchType)
    }
  }

  const handleTypeChange = (newType) => {
    const q = query.trim()
    if (q) {
      onSearch(q, newType)
    } else {
      onTypeChange(newType)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
      <div className="flex-1 min-w-0 relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={searchType === 'knowledge' ? '搜索知识点关键词...' : '输入书名搜索...'}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '搜索中...' : '搜索'}
      </button>
      <div className="flex gap-1 w-full md:w-auto">
        <button
          type="button"
          onClick={() => handleTypeChange('book')}
          className={`flex-1 md:flex-none px-3 py-2.5 rounded-lg text-sm transition-colors ${
            searchType === 'book'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          按书名
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('knowledge')}
          className={`flex-1 md:flex-none px-3 py-2.5 rounded-lg text-sm transition-colors ${
            searchType === 'knowledge'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          按知识点
        </button>
      </div>
    </form>
  )
}
