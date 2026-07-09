import { useState, useCallback, useMemo, useEffect } from 'react'
import { pinyinData, getByShengmu, byShengmu } from './data/pinyin'

// 布局
import TopNav from './components/layout/TopNav'

// 图谱相关
import ShengmuOverview from './components/graph/overview/ShengmuOverview'
import GraphDetailView from './components/graph/GraphDetailView'

// 练习
import PinyinToHanzi from './components/practice/PinyinToHanzi'
import HanziToPinyin from './components/practice/HanziToPinyin'
import PracticeHeader from './components/practice/PracticeHeader'
import PracticeResult from './components/practice/PracticeResult'

// 通用
import ViewTransition from './components/common/ViewTransition'

// Hooks
import useSpeech from './hooks/useSpeech'
import usePinyinQuiz from './hooks/usePinyinQuiz'
import useLearningRecord from './hooks/useLearningRecord'
import useFeedbackSound from './hooks/useFeedbackSound'



export default function App() {
  // 视图状态
  const [tab, setTab] = useState('graph')        // graph | practice
  const [view, setView] = useState('overview')   // overview | detail
  const [currentShengmu, setCurrentShengmu] = useState('b')
  const [selectedNode, setSelectedNode] = useState(null)

  // 练习
  const quiz = usePinyinQuiz({ pool: pinyinData, questionCount: 10 })
  const [practiceMode, setPracticeMode] = useState('choice')

  // 主题：优先从 localStorage 读取，其次尊重系统偏好
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return (
      localStorage.getItem('pinyin-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    )
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('pinyin-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  // 语音
  const { speak } = useSpeech()

  // 练习反馈音效
  const feedbackSound = useFeedbackSound()

  // 学习记录
  const { addRecord } = useLearningRecord()

  // 练习完成自动保存
  useEffect(() => {
    if (quiz.isFinished && quiz.result) {
      addRecord(quiz.result)
    }
  }, [quiz.isFinished, quiz.result, addRecord])

  // 当前声母数据
  const currentData = useMemo(() => getByShengmu(currentShengmu), [currentShengmu])

  // 当前声母统计
  const shengmuStats = useMemo(() => {
    if (!currentData.length) return { yunmuCount: 0, pinyinCount: 0 }
    const yunmus = new Set(currentData.map((r) => r.yunmu))
    return { yunmuCount: yunmus.size, pinyinCount: currentData.length }
  }, [currentData])

  // 拼音数量查询（按声母 ID）
  const getPinyinCount = useCallback((sm) => {
    return byShengmu[sm]?.length || 0
  }, [])

  // 从总览点击声母
  const handleSelectFromOverview = useCallback((displayId) => {
    setCurrentShengmu(displayId)
    setSelectedNode(null)
    setView('detail')
  }, [])

  // 返回总览
  const handleBackToOverview = useCallback(() => {
    setView('overview')
    setSelectedNode(null)
  }, [])

  // 详情内拼音节点点击
  const handleNodeClick = useCallback((node) => {
    if (node.type === 'pinyin') setSelectedNode(node)
  }, [])

  // 关闭浮层
  const handleCloseCard = useCallback(() => setSelectedNode(null), [])

  // 切换到练习
  // filter 为空对象时使用全部数据出题；否则按传入条件（如声母）筛选
  const handleStartPractice = useCallback((mode, filter = { shengmu: currentShengmu }) => {
    setPracticeMode(mode)
    setTab('practice')
    setTimeout(() => {
      quiz.start(mode, filter)
    }, 100)
  }, [currentShengmu, quiz])

  // 播放
  const handlePlaySound = useCallback((text) => speak(text), [speak])

  // TopNav 品牌按钮：回到总览
  const handleTopNavHome = useCallback(() => {
    setTab('graph')
    setView('overview')
    setSelectedNode(null)
  }, [])

  // TopNav tab 切换
  const handleTabChange = useCallback((next) => {
    setTab(next)
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <TopNav
        tab={tab}
        onTabChange={handleTabChange}
        onHome={handleTopNavHome}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="max-w-5xl mx-auto px-4 py-5">
        {tab === 'graph' && (
          <ViewTransition viewKey={view}>
            {view === 'overview' ? (
              <ShengmuOverview
                onSelect={handleSelectFromOverview}
                onStartPractice={handleStartPractice}
                getPinyinCount={getPinyinCount}
              />
            ) : (
              <GraphDetailView
                shengmu={currentShengmu}
                data={currentData}
                stats={shengmuStats}
                selectedNode={selectedNode}
                onBack={handleBackToOverview}
                onNodeClick={handleNodeClick}
                onCloseCard={handleCloseCard}
                onPlaySound={handlePlaySound}
                onStartPractice={handleStartPractice}
              />
            )}
          </ViewTransition>
        )}

        {tab === 'practice' && (
          <ViewTransition viewKey={quiz.isFinished ? 'finished' : (quiz.currentQuestion?.data?.id || 'idle')}>
            {!quiz.isFinished ? (
              quiz.currentQuestion ? (
                <>
                  <PracticeHeader
                    currentIndex={quiz.currentIndex}
                    total={quiz.questions.length}
                    score={quiz.score}
                    onBack={() => setTab('graph')}
                    feedbackEnabled={feedbackSound.enabled}
                    onToggleFeedback={feedbackSound.toggle}
                    feedbackVolume={feedbackSound.volume}
                    onVolumeChange={feedbackSound.setVolume}
                  />
                  {quiz.currentQuestion.type === 'pinyin-to-hanzi' ? (
                    <PinyinToHanzi
                      question={quiz.currentQuestion}
                      onAnswer={quiz.answer}
                      onNext={quiz.next}
                      onPlaySound={handlePlaySound}
                      playCorrectSound={feedbackSound.playCorrectSound}
                      isLast={quiz.currentIndex >= quiz.questions.length - 1}
                      currentIndex={quiz.currentIndex}
                    />
                  ) : (
                    <HanziToPinyin
                      question={quiz.currentQuestion}
                      onAnswer={quiz.answer}
                      onNext={quiz.next}
                      onPlaySound={handlePlaySound}
                      playCorrectSound={feedbackSound.playCorrectSound}
                      isLast={quiz.currentIndex >= quiz.questions.length - 1}
                      currentIndex={quiz.currentIndex}
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
              )
            ) : (
              <PracticeResult
                result={quiz.result}
                onPlaySound={handlePlaySound}
                onRestart={() => {
                  quiz.start(practiceMode, { shengmu: currentShengmu })
                }}
                onBack={() => setTab('graph')}
                playVictorySound={feedbackSound.playVictorySound}
                stopVictorySound={feedbackSound.stopVictorySound}
              />
            )}
          </ViewTransition>
        )}
      </main>
    </div>
  )
}
