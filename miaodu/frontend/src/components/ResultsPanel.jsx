export default function ResultsPanel({ book }) {
  const kps = book.knowledge_points || []
  const catalog = kps.filter(kp => kp.level <= 2)
  const knowledgePoints = kps.filter(kp => kp.level >= 3 || kp.content)

  return (
    <div className="result-card mb-4 fade-in">
      {/* 书籍头部信息 */}
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
          {(book.author || book.isbn || book.douban_rate) && (
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
              {book.author && <span>作者: {book.author}</span>}
              {book.isbn && <span>ISBN: {book.isbn}</span>}
              {book.douban_rate && (
                <span className="text-yellow-600">⭐ {book.douban_rate}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 核心知识要点区域 */}
      {knowledgePoints.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            核心知识要点
          </h4>
          <div className="space-y-3">
            {knowledgePoints.map((kp) => (
              <div key={kp.id} className="pl-3 border-l-2 border-primary/30">
                <p className="text-sm font-medium text-gray-800">{kp.title}</p>
                {kp.content && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{kp.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 目录区域 */}
      {catalog.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            目录索引
          </h4>
          <div className="space-y-1">
            {catalog.map((kp) => (
              <div
                key={kp.id}
                className="flex items-start gap-2"
                style={{ paddingLeft: kp.level === 1 ? '0' : '1.25rem' }}
              >
                {kp.level === 1 ? (
                  <span className="text-sm font-medium text-gray-800">{kp.title}</span>
                ) : (
                  <div className="flex items-start gap-1.5">
                    <span className="text-gray-300 mt-0.5">└</span>
                    <span className="text-sm text-gray-600">{kp.title}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 资源链接 */}
      {(book.baidu_pan_url || book.mlook_link) && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-3 text-sm">
          {book.baidu_pan_url && (
            <a href={book.baidu_pan_url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-primary hover:underline">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 13.5c-1.5 0-2.25-.75-2.25-2.25S3 9 4.5 9s2.25.75 2.25 2.25-.75 2.25-2.25 2.25zM12 10.5c-1.5 0-2.25-.75-2.25-2.25S10.5 6 12 6s2.25.75 2.25 2.25S13.5 10.5 12 10.5zm7.5-1.5c1.5 0 2.25.75 2.25 2.25S21 13.5 19.5 13.5s-2.25-.75-2.25-2.25.75-2.25 2.25-2.25zM12 13.5c1.5 0 2.25.75 2.25 2.25S13.5 18 12 18s-2.25-.75-2.25-2.25.75-2.25 2.25-2.25z"/></svg>
              百度网盘 {book.baidu_pan_code && `(${book.baidu_pan_code})`}
            </a>
          )}
          {book.mlook_link && (
            <a href={book.mlook_link} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline">
              mlook 详情 →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
