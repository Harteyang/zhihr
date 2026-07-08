/**
 * ShengmuSelector — 声母选择器
 * 水平滚动的声母按钮条，支持按组分类（唇音、舌尖音、舌根音等）
 */
import { shengmuList } from '../../data/pinyin'

// 声母分组（用于视觉分类）
const SHENGMU_GROUPS = [
  { label: '唇音', items: ['b', 'p', 'm', 'f'] },
  { label: '舌尖音', items: ['d', 't', 'n', 'l'] },
  { label: '舌根音', items: ['g', 'k', 'h'] },
  { label: '舌面音', items: ['j', 'q', 'x'] },
  { label: '翘舌音', items: ['zh', 'ch', 'sh', 'r'] },
  { label: '平舌音', items: ['z', 'c', 's'] },
  { label: '零声母', items: ['零声母'] },
]

export default function ShengmuSelector({ selected, onSelect }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
        {SHENGMU_GROUPS.map((group) => (
          <div key={group.label} className="flex items-center gap-0.5 shrink-0">
            {group.items.map((sm) => {
              const isActive = selected === sm
              return (
                <button
                  key={sm}
                  onClick={() => onSelect(sm)}
                  className={`
                    px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'text-white shadow-md scale-105 bg-[#FF9AA2]'
                      : 'text-gray-600 hover:bg-gray-100 bg-white border border-gray-200'
                    }
                  `}
                >
                  {sm}
                </button>
              )
            })}
            <span className="mx-1.5 w-px h-6 bg-gray-200 last:hidden" />
          </div>
        ))}
      </div>
      {/* 提示文字 */}
      <p className="text-xs text-gray-400 mt-1">
        当前声母：<span className="font-medium text-gray-600">{selected}</span>
        {' · '}点击声母切换图谱
      </p>
    </div>
  )
}