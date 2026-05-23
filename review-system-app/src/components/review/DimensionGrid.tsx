import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'
import { DimensionCard } from './DimensionCard'
import type { ReviewContent } from '@/types/review'

interface DimensionGridProps {
  content: ReviewContent
  onContentChange: (content: ReviewContent) => void
}

export function DimensionGrid({ content, onContentChange }: DimensionGridProps) {
  const handleChange = (key: string, value: string) => {
    onContentChange({ ...content, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {DEFAULT_DIMENSIONS.map(dim => (
        <DimensionCard
          key={dim.key}
          config={dim}
          value={content[dim.key as keyof ReviewContent] || ''}
          onChange={v => handleChange(dim.key, v)}
        />
      ))}
    </div>
  )
}
