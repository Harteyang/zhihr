import { useState } from 'react'

export default function SearchBar({ onSearch, loading, searchType, onTypeChange }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const q = query.trim()
    if (q) onSearch(q, searchType)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchType === 'knowledge' ? '搜索知识点关键词...' : '输入书名搜索...'}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          disabled={loading}
        />
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => onTypeChange('book')}
          className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
            searchType === 'book'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          按书名
        </button>
        <button
          type="button"
          onClick={() => onTypeChange('knowledge')}
          className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
            searchType === 'knowledge'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          按知识点
        </button>
      </div>
      <button
        type="submit"
        disabled={loading || !query.trim()}
        className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? '搜索中...' : '搜索'}
      </button>
    </form>
  )
}
