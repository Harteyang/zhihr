/**
 * Header — 顶栏
 */
export default function Header({ onHomeClick }) {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onHomeClick} className="flex items-center gap-2">
            <span className="text-2xl">🆎</span>
            <h1 className="text-lg font-bold text-[#FF9AA2]">拼音学习图谱</h1>
          </button>
        </div>
        <span className="text-xs text-gray-400">给女儿的拼音练习</span>
      </div>
    </header>
  )
}