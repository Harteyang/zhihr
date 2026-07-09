/**
 * ShengmuSelector — 声母选择器
 * 水平滚动的声母按钮条，支持按组分类（唇音、舌尖音、舌根音等）
 * 响应式：>=480px 水平滚动并显示滚动指示器；<480px 自动换行
 */
import { getLayerColor, getLayerTextColor } from '../../utils/pinyin-utils'

export const SHENGMU_GROUPS = [
  { label: '唇音', items: ['b', 'p', 'm', 'f'] },
  { label: '舌尖音', items: ['d', 't', 'n', 'l'] },
  { label: '舌根音', items: ['g', 'k', 'h'] },
  { label: '舌面音', items: ['j', 'q', 'x'] },
  { label: '翘舌音', items: ['zh', 'ch', 'sh', 'r'] },
  { label: '平舌音', items: ['z', 'c', 's'] },
  { label: '整体认读音节', items: ['整体认读音节'] },
]

export default function ShengmuSelector({ selected, onSelect }) {
  const activeBg = getLayerColor('shengmu')
  const activeText = getLayerTextColor('shengmu')

  return (
    <div className="mb-4">
      <div className="relative">
        <div className="shengmu-scroll flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2 pr-8">
          {SHENGMU_GROUPS.map((group) => (
            <div key={group.label} className="flex items-center gap-0.5 shrink-0">
              {group.items.map((sm) => {
                const isActive = selected === sm
                return (
                  <button
                    key={sm}
                    onClick={() => onSelect(sm)}
                    style={{
                      backgroundColor: isActive ? activeBg : undefined,
                      color: isActive ? activeText : undefined,
                    }}
                    className={`
                      px-3.5 py-2.5 md:px-3 md:py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                      min-h-[44px] min-w-[44px] flex items-center justify-center
                      ${isActive
                        ? 'shadow-md scale-105'
                        : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200'
                      }
                    `}
                    aria-pressed={isActive}
                  >
                    {sm}
                  </button>
                )
              })}
              <span className="mx-1.5 w-px h-6 bg-gray-200 last:hidden shrink-0" />
            </div>
          ))}
        </div>
        {/* 滚动指示器：窄屏下隐藏 */}
        <div className="shengmu-scroll-indicator pointer-events-none absolute right-0 top-0 bottom-2 w-10 bg-gradient-to-l from-surface to-transparent md:block hidden" />
      </div>
      {/* 提示文字 */}
      <p className="text-xs text-gray-400 mt-1">
        当前声母：<span className="font-medium text-gray-600">{selected}</span>
        {' · '}点击声母切换图谱
      </p>

      <style>{`
        @media (max-width: 480px) {
          .shengmu-scroll {
            flex-wrap: wrap !important;
            overflow-x: visible !important;
            padding-right: 0 !important;
          }
          .shengmu-scroll-indicator {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
