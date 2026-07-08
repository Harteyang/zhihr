import { useState, useCallback, useMemo, useEffect } from 'react'
import { pinyinData, getByShengmu } from './data/pinyin'

// 组件
import Header from './components/layout/Header'
import TabBar from './components/layout/TabBar'
import PinyinGraph from './components/graph/PinyinGraph'
import PinyinCard from './components/graph/PinyinCard'
import ShengmuSelector from './components/graph/ShengmuSelector'
import GraphToolbar from './components/graph/GraphToolbar'
import PinyinToHanzi from './components/practice/PinyinToHanzi'
import HanziToPinyin from './components/practice/HanziToPinyin'
import PracticeHeader from './components/practice/PracticeHeader'
import PracticeResult from './components/practice/PracticeResult'

// Hooks
import useSpeech from './hooks/useSpeech'
import usePinyinQuiz from './hooks/usePinyinQuiz'
import useLearningRecord from './hooks/useLearningRecord'

const TABS = [
  { id: 'graph', label: '知识图谱', icon: '🌐' },
  { id: 'practice', label: '练习', icon: '✏️' },
]

export default function App() {
  // 图谱状态
  const [currentShengmu, setCurrentShengmu] = useState('b')
  const [selectedNode, setSelectedNode] = useState(null)
  const [tab, setTab] = useState('graph')

  // 练习状态
  const quiz = usePinyinQuiz({ pool: pinyinData, questionCount: 10 })
  const [practiceMode, setPracticeMode] = useState('choice')

  // 语音
  const { speak } = useSpeech()

  // 学习记录
  const { addRecord } = useLearningRecord()

  // 练习完成时自动保存记录
  useEffect(() => {
    if (quiz.isFinished && quiz.result) {
      addRecord(quiz.result)
    }
  }, [quiz.isFinished, quiz.result, addRecord])

  // 当前声母的数据
  const currentData = useMemo(() => {
    return getByShengmu(currentShengmu)
  }, [currentShengmu])

  // 当前声母的韵母数量和拼音数量
  const shengmuStats = useMemo(() => {
    if (!currentData.length) return { yunmuCount: 0, pinyinCount: 0 }
    const yunmus = new Set(currentData.map(r => r.yunmu))
    return { yunmuCount: yunmus.size, pinyinCount: currentData.length }
  }, [currentData])

  // 图谱节点点击
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'pinyin') {
      setSelectedNode(node)
    }
  }, [])

  // 关闭卡片
  const handleCloseCard = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // 切换到练习模式
  const handleStartPractice = useCallback((mode, filter = {}) => {
    setPracticeMode(mode)
    setTab('practice')
    setTimeout(() => {
      quiz.start(mode, { ...filter, shengmu: currentShengmu })
    }, 100)
  }, [currentShengmu, quiz])

  // 练习中的语音播放
  const handlePlaySound = useCallback((text) => {
    speak(text)
  }, [speak])

  // 声母切换
  const handleShengmuChange = useCallback((sm) => {
    setCurrentShengmu(sm)
    setSelectedNode(null)
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <Header onHomeClick={() => { setTab('graph'); setSelectedNode(null) }} />

      <main className="max-w-5xl mx-auto px-4 py-4">
        {/* 选项卡 */}
        <TabBar activeTab={tab} onTabChange={setTab} tabs={TABS} />

        {/* ==================== 图谱选项卡 ==================== */}
        {tab === 'graph' && (
          <div>
            {/* 声母选择器 */}
            <ShengmuSelector
              selected={currentShengmu}
              onSelect={handleShengmuChange}
            />

            {/* 工具栏 */}
            <GraphToolbar
              shengmu={currentShengmu}
              shengmuCount={shengmuStats.yunmuCount}
              pinyinCount={shengmuStats.pinyinCount}
              onStartPractice={handleStartPractice}
            />

            {/* 图谱 */}
              <div className="relative">
                <PinyinGraph
                  data={currentData}
                  shengmu={currentShengmu}
                  onPlaySound={handlePlaySound}
                  onNodeClick={handleNodeClick}
                />

                {/* 拼音详情卡片 */}
                {selectedNode && (
                  <PinyinCard
                    node={selectedNode}
                    onClose={handleCloseCard}
                    onPlaySound={handlePlaySound}
                    onStartPractice={handleStartPractice}
                  />
                )}
              </div>
          </div>
        )}

        {/* ==================== 练习选项卡 ==================== */}
        {tab === 'practice' && (
          <div>
            {!quiz.isFinished ? (
              <>
                {quiz.currentQuestion ? (
                  <>
                    <PracticeHeader
                      currentIndex={quiz.currentIndex}
                      total={quiz.questions.length}
                      score={quiz.score}
                      onBack={() => setTab('graph')}
                    />

                    {quiz.currentQuestion.type === 'pinyin-to-hanzi' ? (
                      <PinyinToHanzi
                        question={quiz.currentQuestion}
                        onAnswer={quiz.answer}
                        onNext={quiz.next}
                        onPlaySound={handlePlaySound}
                        isLast={quiz.currentIndex >= quiz.questions.length - 1}
                      />
                    ) : (
                      <HanziToPinyin
                        question={quiz.currentQuestion}
                        onAnswer={quiz.answer}
                        onNext={quiz.next}
                        onPlaySound={handlePlaySound}
                        isLast={quiz.currentIndex >= quiz.questions.length - 1}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">还没有开始练习</p>
                    <button
                      onClick={() => {
                        quiz.start(practiceMode, { shengmu: currentShengmu })
                      }}
                      className="btn-primary px-6"
                    >
                      开始练习
                    </button>
                  </div>
                )}
              </>
            ) : (
              <PracticeResult
                result={quiz.result}
                onPlaySound={handlePlaySound}
                onRestart={() => {
                  quiz.start(practiceMode, { shengmu: currentShengmu })
                }}
                onBack={() => setTab('graph')}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}