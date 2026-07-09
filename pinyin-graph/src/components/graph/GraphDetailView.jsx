/**
 * GraphDetailView — 单声母详细图容器
 * 含左上角返回按钮、当前声母指示、力导向图、浮层卡片、底部工具栏
 *
 * 声母切换通过返回总览 → 点击其他声母完成
 */
import PinyinGraph from './PinyinGraph'
import PinyinCard from './PinyinCard'
import GraphToolbar from './GraphToolbar'

export default function GraphDetailView({
  shengmu,
  data,
  stats,
  selectedNode,
  onBack,
  onNodeClick,
  onCloseCard,
  onPlaySound,
  onStartPractice,
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* 返回按钮 + 当前位置 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="
            flex items-center gap-1 px-3 py-2 rounded-xl
            text-sm font-medium text-gray-600
            bg-white border border-gray-200 shadow-sm
            hover:bg-gray-50 hover:border-gray-300
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          "
          aria-label="返回声母总览"
        >
          <span className="text-base leading-none" aria-hidden="true">←</span>
          <span>总览</span>
        </button>
        <span className="text-sm text-gray-400 ml-1">
          / 声母 <strong className="text-gray-700">{shengmu}</strong>
        </span>
      </div>

      {/* 核心：知识图谱 */}
      <div className="relative">
        <PinyinGraph
          data={data}
          shengmu={shengmu}
          onPlaySound={onPlaySound}
          onNodeClick={onNodeClick}
        />

        {/* 拼音详情卡片 */}
        {selectedNode && (
          <PinyinCard
            node={selectedNode}
            onClose={onCloseCard}
            onPlaySound={onPlaySound}
            onStartPractice={onStartPractice}
          />
        )}
      </div>

      {/* 底部工具栏 */}
      <GraphToolbar
        shengmu={shengmu}
        shengmuCount={stats.yunmuCount}
        pinyinCount={stats.pinyinCount}
        onStartPractice={onStartPractice}
      />
    </div>
  )
}
