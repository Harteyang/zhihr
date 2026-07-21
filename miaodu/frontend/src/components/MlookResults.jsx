export default function MlookResults({ books, query, onSelect, onCancel }) {
  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          在 mlook.mobi 找到 {books.length} 本相关电子书
        </p>
      </div>

      <div className="space-y-3">
        {books.map((book, i) => (
          <div key={book.id || book.title + i} className="result-card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">{book.title}</h3>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
                  {book.author && <span>作者: {book.author}</span>}
                  {book.isbn && <span>ISBN: {book.isbn}</span>}
                </div>
                {book.link && (
                  <a
                    href={book.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    查看详情 →
                  </a>
                )}
              </div>
              <button
                onClick={() => onSelect(book)}
                className="flex-shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                选择此书
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-center">
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          没有找到我要的书，手动提交拆解请求
        </button>
      </div>
    </div>
  )
}
