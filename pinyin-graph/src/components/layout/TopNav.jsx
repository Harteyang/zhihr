/**
 * TopNav — 顶部品牌返回按钮
 * 点击后回到声母总览页面
 */
import BookOpenIcon from '../icons/BookOpenIcon'

const PRIMARY = '#FF9AA2'

export default function TopNav({ onHome }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-start">
        <button
          onClick={onHome}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-base font-bold transition-colors hover:bg-gray-50"
          style={{ color: PRIMARY }}
          aria-label="返回声母总览"
        >
          <BookOpenIcon size={20} />
          拼音学习
        </button>
      </div>
    </header>
  )
}
