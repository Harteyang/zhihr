/**
 * TopNav — 顶部居中三按钮导航
 * 取代原 Header + TabBar，与图谱区边界 ≥15px
 */
const PRIMARY = '#FF9AA2'

function NavTab({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150
        flex items-center gap-1.5
        ${active
          ? 'bg-[#FF9AA2]/10'
          : 'text-gray-600 hover:bg-gray-50'
        }
      `}
      style={active ? { color: PRIMARY } : undefined}
      aria-current={active ? 'page' : undefined}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}

export default function TopNav({ tab, onTabChange, onHome }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-center gap-2 sm:gap-3">
        <button
          onClick={onHome}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          aria-label="返回首页"
        >
          <span className="text-xl" aria-hidden="true">🆎</span>
          <span
            className="hidden sm:inline text-sm sm:text-base font-bold"
            style={{ color: PRIMARY }}
          >
            拼音学习图谱
          </span>
        </button>
        <span className="w-px h-5 bg-gray-200" aria-hidden="true" />
        <NavTab
          active={tab === 'graph'}
          onClick={() => onTabChange('graph')}
          icon="🌐"
        >
          知识图谱
        </NavTab>
        <NavTab
          active={tab === 'practice'}
          onClick={() => onTabChange('practice')}
          icon="✏️"
        >
          练习
        </NavTab>
      </div>
    </header>
  )
}
