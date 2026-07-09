/**
 * GraphDetailView — 单声母详细图容器
 * 含左上角返回按钮、当前声母指示、力导向图、浮层卡片、底部工具栏
 *
 * 声母切换通过返回总览 → 点击其他声母完成
 */
import { useState, useRef } from 'react'
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
  const graphRef = useRef(null)
  const [showLabels, setShowLabels] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      {/* 返回按钮 + 当前位置 */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="btn-secondary flex items-center gap-1"
          aria-label="返回声母总览"
        >
          <span className="text-base leading-none" aria-hidden="true">←</span>
          <span>总览</span>
        </button>
        <span className="text-caption text-content-tertiary ml-1">
          / 声母 <strong className="text-content-primary">{shengmu}</strong>
        </span>
      </div>

      {/* 图谱控制栏（位于图谱外部正上方） */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => graphRef.current?.fitView()}
          className="btn-secondary text-small px-3 py-1.5"
        >
          适应视图
        </button>
        <button
          onClick={() => setShowLabels((v) => !v)}
          className="btn-secondary text-small px-3 py-1.5"
        >
          {showLabels ? '隐藏汉字' : '显示汉字'}
        </button>
      </div>

      {/* 核心：知识图谱 */}
      <div className="relative">
        <PinyinGraph
          ref={graphRef}
          data={data}
          shengmu={shengmu}
          onPlaySound={onPlaySound}
          onNodeClick={onNodeClick}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
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
