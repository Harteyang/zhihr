export default function ResultsPanel({ book }) {
  const kps = book.knowledge_points || []

  return (
    <div className="result-card mb-4 fade-in">
      <div className="flex gap-4">
        {book.cover_url && (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-20 h-28 object-cover rounded-md flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900">{book.title}</h3>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
            {book.author && <span>作者: {book.author}</span>}
            {book.isbn && <span>ISBN: {book.isbn}</span>}
            {book.douban_rate && (
              <span className="text-yellow-600">⭐ {book.douban_rate}</span>
            )}
          </div>
          {book.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{book.description}</p>
          )}
        </div>
      </div>

      {/* 知识点列表 */}
      {kps.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            拆解内容 ({kps.length} 条)
          </h4>
          <div className="space-y-2">
            {kps.map((kp) => (
              <div key={kp.id} className="pl-3 border-l-2 border-primary/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{kp.chapter}</span>
                  {kp.level > 0 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      L{kp.level}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 mt-0.5">{kp.title}</p>
                {kp.content && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-3">{kp.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 资源链接 */}
      {(book.baidu_pan_url || book.mlook_link) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-3 text-sm">
            {book.baidu_pan_url && (
              <a
                href={book.baidu_pan_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                百度网盘 {book.baidu_pan_code && `(提取码: ${book.baidu_pan_code})`}
              </a>
            )}
            {book.mlook_link && (
              <a
                href={book.mlook_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                查看 mlook 详情
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
