/**
 * ShengmuOverview — 24 声母卡片总览
 * 大屏（≥1024px）环形布局；窄屏网格布局
 * 监听容器尺寸变化自适应
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import { OVERVIEW_ITEMS, computeOverviewLayout } from '../../../utils/shengmu-overview'
import ShengmuOverviewCard from './ShengmuOverviewCard'

export default function ShengmuOverview({ onSelect, getPinyinCount }) {
  const wrapperRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (!wrapperRef.current) return
    const el = wrapperRef.current
    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const positions = useMemo(() => {
    if (size.width === 0) return []
    return computeOverviewLayout(OVERVIEW_ITEMS.length, size.width, size.height)
  }, [size.width, size.height])

  const isRing = positions.length > 0 && positions[0].mode !== 'grid'
  const isDualRing = positions.length > 0 && positions[0].mode === 'dual-ring'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">声母总览</h2>
        <span className="text-xs text-gray-400">点击声母进入详细图谱</span>
      </div>

      <div
        ref={wrapperRef}
        className="relative w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden"
        style={{ height: 'min(60vh, 560px)', minHeight: '440px' }}
      >
        {size.width > 0 && (
          <>
            {isRing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative" style={{ width: 0, height: 0 }}>
                  {OVERVIEW_ITEMS.map((item, i) => {
                    const p = positions[i]
                    if (!p) return null
                    return (
                      <div
                        key={item.id}
                        className="absolute"
                        style={{
                          left: `${p.x}px`,
                          top: `${p.y}px`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      >
                        <ShengmuOverviewCard
                          item={item}
                          count={getPinyinCount(item.id) || 0}
                          onSelect={onSelect}
                          size={isDualRing ? 'sm' : 'lg'}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 overflow-auto p-4 sm:p-6">
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 justify-items-center">
                  {OVERVIEW_ITEMS.map((item) => (
                    <ShengmuOverviewCard
                      key={item.id}
                      item={item}
                      count={getPinyinCount(item.id) || 0}
                      onSelect={onSelect}
                      size={size.width < 640 ? 'sm' : 'md'}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border border-gray-300 bg-white" />
          真实声母
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded border-2 border-dashed border-gray-300 bg-white/60" />
          归入零声母
        </span>
      </div>
    </div>
  )
}
