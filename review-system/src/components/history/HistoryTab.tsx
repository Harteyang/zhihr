import { useState } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { formatDate } from '@/lib/utils'
import { Calendar, Trash2, ChevronRight, FileText } from 'lucide-react'
import type { Review } from '@/types/review'

export function HistoryTab() {
  const reviews = useReviewsStore(s => s.reviews)
  const deleteRecord = useReviewsStore(s => s.deleteRecord)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    await deleteRecord(id)
    setShowDeleteConfirm(null)
    if (selectedReview?.id === id) setSelectedReview(null)
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>暂无复盘记录</p>
        <p className="text-sm mt-1">开始记录你的每日复盘吧</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 列表 */}
      <div className="md:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto">
        {reviews.map(review => (
          <div
            key={review.id}
            onClick={() => setSelectedReview(review)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedReview?.id === review.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {formatDate(review.date)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {review._source === 'local' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    本地
                  </span>
                )}
                {review._source === 'cloud' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    已同步
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(review.id) }}
                  className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {review.summary && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{review.summary}</p>
            )}
          </div>
        ))}
      </div>

      {/* 详情 */}
      <div className="md:col-span-2">
        {selectedReview ? (
          <ReviewDetail review={selectedReview} />
        ) : (
          <div className="text-center py-12 text-slate-400">
            <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">选择一条记录查看详情</p>
          </div>
        )}
      </div>

      {/* 删除确认 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">确认删除</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">删除后数据无法恢复，确定要删除吗？</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 cursor-pointer"
              >
                删除
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewDetail({ review }: { review: Review }) {
  const content = review.content
  const hasContent = content && typeof content === 'object'

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {formatDate(review.date)}
        </h3>
        {review._source === 'cloud' && (
          <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
            已同步
          </span>
        )}
      </div>

      {review.summary && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <p className="text-sm text-slate-700 dark:text-slate-300">{review.summary}</p>
        </div>
      )}

      {hasContent && Object.entries(content).map(([key, value]) => {
        if (!value) return null
        return (
          <div key={key} className="mb-3">
            <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 capitalize">{key}</h4>
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
