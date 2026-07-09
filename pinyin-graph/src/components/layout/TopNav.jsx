/**
 * TopNav — 顶部导航栏
 * 包含品牌返回按钮、显式 tab 切换入口与主题切换按钮
 */
import BookOpenIcon from '../icons/BookOpenIcon'

const PRIMARY = '#FF8C42'

export default function TopNav({
  tab,
  onTabChange,
  onHome,
  theme,
  onToggleTheme,
}) {
  return (
    <header className="bg-surface-card border-b border-divider sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-3 py-2 rounded-md text-h3 font-bold transition-colors hover:bg-surface"
          style={{ color: PRIMARY }}
          aria-label="返回声母总览"
        >
          <BookOpenIcon size={22} />
          拼音学习
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onTabChange?.('graph')}
            className={`btn-ghost ${
              tab === 'graph'
                ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : ''
            }`}
            aria-pressed={tab === 'graph'}
          >
            图谱
          </button>
          <button
            onClick={() => onTabChange?.('practice')}
            className={`btn-ghost ${
              tab === 'practice'
                ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : ''
            }`}
            aria-pressed={tab === 'practice'}
          >
            练习
          </button>
          <span className="w-px h-5 bg-divider mx-1" />
          <button
            onClick={onToggleTheme}
            className="btn-ghost"
            aria-label={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
