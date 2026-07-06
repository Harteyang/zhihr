export default function KnowledgeResultCard({ item, onViewBook }) {
  const isKnowledgePoint = item.level >= 3

  return (
    <div className="result-card mb-3 fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 书籍信息 */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">
              {item.book_title || '未知书籍'}
            </span>
            {item.book_author && (
              <span className="text-xs text-gray-400">/{item.book_author}</span>
            )}
            {item.book_title && onViewBook && (
              <button
                onClick={() => onViewBook(item.book_title)}
                className="ml-auto text-xs text-primary hover:underline"
              >
                查看 →
              </button>
            )}
          </div>

          {/* 章节 + 类型提示 */}
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <span>{item.chapter}</span>
            {isKnowledgePoint ? (
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">知识点</span>
            ) : (
              <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">目录</span>
            )}
          </div>

          {/* 要点标题 */}
          <p className="text-sm font-medium text-gray-800">{item.title}</p>

          {/* 要点内容 */}
          {item.content && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line line-clamp-4">
              {item.content}
            </p>
          )}
        </div>
      </div>

      {/* 资源链接 */}
      {(item.baidu_pan_url || item.mlook_link) && (
        <div className="mt-3 pt-2 border-t border-gray-50 flex flex-wrap gap-3 text-xs">
          {item.baidu_pan_url && (
            <a href={item.baidu_pan_url} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline">
              百度网盘 {item.baidu_pan_code && `(${item.baidu_pan_code})`}
            </a>
          )}
          {item.mlook_link && (
            <a href={item.mlook_link} target="_blank" rel="noopener noreferrer"
               className="text-primary hover:underline">
              mlook 详情 →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
