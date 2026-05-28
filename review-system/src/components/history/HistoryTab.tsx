import { useState } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/utils'
import { Calendar, Trash2, ChevronRight, FileText, Edit3, Save, X } from 'lucide-react'
import type { Review, ReviewContent } from '@/types/review'
import { parseDimensionValue } from '@/types/review'

export function HistoryTab() {
  const allReviews = useReviewsStore(s => s.reviews)
  const deleteRecord = useReviewsStore(s => s.deleteRecord)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  const reviews = isAuthenticated ? allReviews : allReviews.filter(r => r._source === 'local')

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

import { getStructuredItemLabelMap, getStructuredItemKeyByLabel } from '@/lib/dimensions'

const labelMap = getStructuredItemLabelMap()

function formatContentForEdit(parsed: { structured: Record<string, string>; freeform: string }): string {
  const lines: string[] = []
  for (const [key, value] of Object.entries(parsed.structured)) {
    if (value) {
      // 使用中文标签替换英文 key
      const label = labelMap[key] || key
      lines.push(`${label}: ${value}`)
    }
  }
  if (parsed.freeform) {
    if (lines.length > 0) lines.push('')
    lines.push(parsed.freeform)
  }
  return lines.join('\n')
}

function parseContentFromEdit(text: string): { structured: Record<string, string>; freeform: string } {
  const structured: Record<string, string> = {}
  const freeformLines: string[] = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      freeformLines.push('')
      continue
    }
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      const label = trimmed.substring(0, colonIndex).trim()
      const value = trimmed.substring(colonIndex + 1).trim()
      if (label && value) {
        // 尝试将中文标签转换回 key
        const key = getStructuredItemKeyByLabel(label) || label
        structured[key] = value
        continue
      }
    }
    freeformLines.push(line)
  }
  
  return {
    structured,
    freeform: freeformLines.join('\n').trim()
  }
}

function ReviewDetail({ review }: { review: Review }) {
  const updateRecord = useReviewsStore(s => s.updateRecord)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<Record<string, string>>(Object.fromEntries(
    Object.entries(review.content).map(([key, value]) => [key, formatContentForEdit(parseDimensionValue(value))])
  ))
  const [editedSummary, setEditedSummary] = useState(review.summary)

  const handleSave = async () => {
    const contentToSave = Object.fromEntries(
      Object.entries(editedContent).map(([key, value]) => {
        const parsed = parseContentFromEdit(value)
        return [key, JSON.stringify(parsed)]
      })
    ) as unknown as ReviewContent
    await updateRecord(review.id, contentToSave, editedSummary)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedContent(Object.fromEntries(
      Object.entries(review.content).map(([key, value]) => [key, formatContentForEdit(parseDimensionValue(value))])
    ))
    setEditedSummary(review.summary)
    setIsEditing(false)
  }

  const content = review.content
  const hasContent = content && typeof content === 'object'
  const dimensionLabels: Record<string, string> = {
    health: '健康',
    work: '工作',
    study: '学习',
    social: '社交',
    finance: '财务',
    life: '生活',
    spirit: '精神',
    leisure: '休闲',
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          {formatDate(review.date)}
        </h3>
        <div className="flex items-center gap-2">
          {review._source === 'cloud' && (
            <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              已同步
            </span>
          )}
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
                取消
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md hover:bg-slate-300 dark:hover:bg-slate-500 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
          )}
        </div>
      </div>

      {/* 总结 */}
      {isEditing ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">总结</label>
          <input
            type="text"
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="输入今日总结"
          />
        </div>
      ) : (
        review.summary && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">{review.summary}</p>
          </div>
        )
      )}

      {/* 维度内容 */}
      {hasContent && Object.entries(content).map(([key, value]) => {
        const parsed = parseDimensionValue(value)
        const hasStructured = Object.values(parsed.structured).some(v => v)
        const hasFreeform = parsed.freeform
        return (
          <div key={key} className="mb-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1 capitalize">
              {dimensionLabels[key] || key}
            </label>
            {isEditing ? (
              <textarea
                value={editedContent[key] || ''}
                onChange={(e) => setEditedContent({ ...editedContent, [key]: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder={`key: value\n或直接输入自由文本`}
              />
            ) : (
              <div className="space-y-2 text-sm">
                {hasStructured && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(parsed.structured).filter(([_, v]) => v).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
                {hasFreeform && (
                  <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{parsed.freeform}</p>
                )}
                {!hasStructured && !hasFreeform && <span className="text-slate-400">-</span>}
              </div>
            )}
          </div>
        )
      })}

      {!hasContent && !review.summary && (
        <p className="text-sm text-slate-500 dark:text-slate-400">暂无内容</p>
      )}
    </div>
  )
}
