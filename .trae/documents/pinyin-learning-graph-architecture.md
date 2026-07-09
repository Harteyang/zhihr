# 拼音学习图谱 — 技术架构文档

> 文档版本：v1.0
> 创建日期：2026-07-08
> 状态：草稿
> 前置文档：[PRD](./pinyin-learning-graph-prd.md)
> 参考项目：妙读知识图谱 (`miaodu/frontend/src/components/KnowledgeGraph.jsx`)

---

## 目录

1. [项目概述](#1-项目概述)
2. [目录结构](#2-目录结构)
3. [组件架构](#3-组件架构)
4. [数据层设计](#4-数据层设计)
5. [状态管理](#5-状态管理)
6. [核心算法](#6-核心算法)
7. [接口定义](#7-接口定义)
8. [开发环境与构建](#8-开发环境与构建)
9. [性能考量](#9-性能考量)

---

## 1. 项目概述

### 1.1 定位

拼音学习图谱是 zhihr 仓库下的一个独立 Web 子项目，专为学龄儿童设计的拼音互动学习应用。采用力导向图谱 + 卡片交互 + 多种练习模式，所有数据前端静态加载，无需后端服务。

### 1.2 技术栈

| 层 | 技术 | 版本 | 用途 |
|----|------|------|------|
| 框架 | React | 18+ | UI 组件化 |
| 构建 | Vite | 5+ | 开发服务器与打包 |
| 图可视化 | react-force-graph-2d | 1.x | 力导向图谱渲染 |
| 碰撞检测 | d3-force-3d | 3.x | 碰撞检测（仅 forceCollide） |
| 样式 | Tailwind CSS | 3.x | 原子化 CSS |
| 语音 | Web Speech API | 浏览器原生 | TTS 朗读 |
| 存储 | localStorage | 浏览器原生 | 学习记录持久化 |
| 数据 | 静态 JS/JSON | — | 拼音数据本地加载 |

### 1.3 与妙读知识图谱的关系

本项目参考了 `KnowledgeGraph.jsx` 的力导向图实现，但在架构上做了以下简化/差异：

| 维度 | 妙读知识图谱 | 拼音学习图谱 | 原因 |
|------|-------------|-------------|------|
| 数据源 | 后端 API → D1 查询 | 前端 JS 静态数据 | 数据集固定（1075 条），无需后端 |
| 层级 | 3 层（搜索词→书籍→知识点） | 3 层（声母→韵母→拼音+汉字） | 拼音知识结构天然三层 |
| 力配置 | 动态边界 + 碰撞 + 斥力 | 类似但简化 | 节点数量可控（单声母几十个节点） |
| 交互 | 浏览 + 点击详情 | 浏览 + 练习 + 语音 | 学习场景需要更多交互 |
| 样式 | 专业简约 | 色彩丰富、儿童友好 | 目标用户不同 |

---

## 2. 目录结构

```
pinyin-graph/
├── index.html                   # 入口 HTML
├── package.json                 # 依赖管理
├── vite.config.js               # Vite 配置
├── tailwind.config.js           # Tailwind 配置
├── postcss.config.js            # PostCSS 配置
│
├── public/                      # 静态资源
│   └── sounds/                  # （预留）自定义音效
│
├── scripts/                     # 开发工具脚本
│   └── convert-csv.js           # CSV → JS 数据转换脚本
│
└── src/
    ├── main.jsx                 # 应用入口
    ├── App.jsx                  # 根组件（路由/选项卡）
    ├── index.css                # 全局样式 + Tailwind
    │
    ├── data/                    # 静态数据层
    │   └── pinyin.js            # 拼音数据集（由 CSV 转换生成）
    │
    ├── utils/                   # 工具函数
    │   ├── pinyin-utils.js      # 拼音相关工具（分组、筛选、随机等）
    │   └── quiz-utils.js        # 出题逻辑工具
    │
    ├── hooks/                   # 自定义 Hooks
    │   ├── useSpeech.js         # TTS 朗读
    │   ├── usePinyinQuiz.js     # 出题与答题状态管理
    │   └── useLearningRecord.js # 学习记录（localStorage）
    │
    ├── components/
    │   ├── graph/               # 图谱模块
    │   │   ├── PinyinGraph.jsx       # 力导向图谱主体
    │   │   ├── PinyinCard.jsx        # 拼音详情浮层卡片
    │   │   ├── GraphToolbar.jsx      # 图谱工具栏
    │   │   ├── ShengmuSelector.jsx   # 声母选择器
    │   │   └── graph-config.js       # 力导向参数配置
    │   │
    │   ├── practice/            # 练习模块
    │   │   ├── QuizChoice.jsx        # 选择题（拼音↔汉字）
    │   │   ├── PinyinToHanzi.jsx     # 拼音转汉字
    │   │   ├── HanziToPinyin.jsx     # 汉字转拼音
    │   │   ├── PracticeHeader.jsx    # 练习头部（进度+得分）
    │   │   └── PracticeResult.jsx    # 练习结果页
    │   │
    │   ├── layout/              # 布局组件
    │   │   ├── Header.jsx           # 顶栏（标题+导航）
    │   │   └── TabBar.jsx           # 选项卡（图谱/练习）
    │   │
    │   └── ui/                  # 通用 UI 组件
    │       ├── PlayButton.jsx       # 发音按钮（带动画）
    │       ├── ScoreDisplay.jsx     # 得分/进度展示
    │       ├── OptionButton.jsx     # 选项按钮（正确/错误状态）
    │       └── ConfirmDialog.jsx    # 确认对话框
    │
    └── styles/                  # 额外样式
        └── graph.css               # 图谱 Canvas 层叠样式
```

### 2.1 依赖安装

```bash
# 在 zhihr 根目录下
cd pinyin-graph
npm init -y
npm install react react-dom react-force-graph-2d d3-force-3d
npm install -D vite @vitejs/plugin-react tailwindcss postcss autoprefixer
```

---

## 3. 组件架构

### 3.1 组件树

```
App
├── Header                         # 标题栏
├── TabBar                         # 选项卡切换（图谱|练习）
│
├── [tab=graph] PinyinGraph        # 图谱浏览
│   ├── ShengmuSelector            # 声母选择器（水平滚动的声母按钮条）
│   ├── GraphToolbar               # 工具栏（适应视图、重置、显示标签等）
│   ├── ForceGraph2D               # react-force-graph-2d 实例
│   └── PinyinCard                 # 点击节点弹出的详情浮层
│
├── [tab=practice] PracticePanel   # 练习面板
│   ├── PracticeHeader             # 练习头部（题号、得分、返回）
│   ├── QuizChoice                 # 选择题模式
│   ├── PinyinToHanzi              # 拼音转汉字模式
│   ├── HanziToPinyin              # 汉字转拼音模式
│   └── PracticeResult             # 练习结束结果页
│
└── [modal] ConfirmDialog          # 全局确认对话框
```

### 3.2 组件职责

| 组件 | 职责 | 状态 |
|------|------|------|
| `App` | 当前选项卡(图谱/练习)、练习模式、声母选择 | `tab`, `practiceMode`, `currentShengmu` |
| `PinyinGraph` | 构建 graphData、力配置、Canvas 绘制、节点交互 | `selectedNode`, `showLabels` |
| `PinyinCard` | 展示拼音详情、TTS 播放 | 通过 props 接收节点数据 |
| `ShengmuSelector` | 展示声母列表、选中态高亮 | `selectedShengmu` |
| `QuizChoice` | 选择题出题、用户选择、反馈 | `currentQuestion`, `score`, `answered` |
| `useSpeech` | 封装 SpeechSynthesis API | 语音状态 |
| `usePinyinQuiz` | 出题逻辑、选项生成、答题状态 | 题目队列、得分、进度 |
| `useLearningRecord` | localStorage 读写 | 历史记录 |

---

## 4. 数据层设计

### 4.1 拼音数据集结构

由 `拼音.csv` 通过 `scripts/convert-csv.js` 脚本转换为 `src/data/pinyin.js`。

**原始 CSV 格式**（1075 行）：
```
声母,韵母,声调,拼音,常用字,组词
b,a,1声,bā,八,八个
b,a,2声,bá,拔,拔河
...
```

**转换后的 JS 数据结构**：

```js
// src/data/pinyin.js
export const pinyinData = [
  {
    id: 'b-a-1',
    shengmu: 'b',
    yunmu: 'a',
    shengdiao: 1,
    pinyin: 'bā',
    hanzi: '八',
    zuci: '八个',
  },
  // ... 1075 条
]
```

**导出索引**（便于快速查找）：

```js
// 按声母索引
export const byShengmu = {
  b: [ /* 所有 b 开头的音节 */ ],
  p: [ /* 所有 p 开头的音节 */ ],
  // ...
}

// 声母列表（含零声母）
export const shengmuList = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', '零声母']

// 合法拼音集合（用于校验）
export const validPinyinSet = new Set(['bā', 'bá', 'bǎ', 'bà', ...])
```

### 4.2 韵母分类

为了图谱的视觉分组，需要为每个韵母添加分类信息：

| 分类 | 包含的韵母 |
|------|-----------|
| 单韵母 | a, o, e, i, u, ü |
| 复韵母 | ai, ei, ui, ao, ou, iu, ie, üe, er |
| 前鼻韵母 | an, en, in, un, ün |
| 后鼻韵母 | ang, eng, ing, ong |
| 介音韵母 | ia, iao, ian, iang, iong, ua, uo, uai, uan, un, uang, üan |

### 4.3 整体认读音节

16 个整体认读音节需单独处理，在图谱中可作为独立分支展示：
`zhi, chi, shi, ri, zi, ci, si, yi, wu, yu, ye, yue, yuan, yin, yun, ying`

这些音节不拆分为声母+韵母，在图谱中作为独立卡片展示。

---

## 5. 状态管理

### 5.1 全局状态

使用 React Context 管理跨组件共享状态，避免 props drilling。

```jsx
// 状态结构
const appState = {
  tab: 'graph',             // 'graph' | 'practice'
  practiceMode: 'choice',   // 'choice' | 'pinyin-to-hanzi' | 'hanzi-to-pinyin'
  currentShengmu: 'b',      // 当前选中的声母
}
```

### 5.2 图谱状态（PinyinGraph 内部）

```jsx
const graphState = {
  selectedNode: null,         // 当前选中的节点
  showLabels: true,           // 是否显示汉字标签
  size: { width: 0, height: 0 },  // 容器尺寸
}
```

### 5.3 练习状态（usePinyinQuiz Hook）

```jsx
const quizState = {
  questions: [],              // 题目队列
  currentIndex: 0,            // 当前题号
  score: 0,                   // 答对数
  totalAnswered: 0,           // 已答题数
  isFinished: false,          // 是否结束
  mode: 'choice',             // 练习模式
  filter: { shengmu: null, shengdiao: null },  // 筛选条件
}
```

---

## 6. 核心算法

### 6.1 图谱力导向布局

参考 `KnowledgeGraph.jsx` 的力配置，针对拼音场景调整参数：

```js
// components/graph/graph-config.js

export function getForceConfig(nodeCount) {
  return {
    charge: {
      query: -400,      // 声母中心节点
      yunmu: -250,      // 韵母节点
      pinyin: -120,     // 拼音节点
    },
    collide: {
      strength: 0.7,
      iterations: 2,
    },
    velocityDecay: 0.35,
    warmupTicks: 60,
    cooldownTicks: 120,
    linkDistance: {
      shengmu_yunmu: 150,    // 声母→韵母
      yunmu_pinyin: 100,     // 韵母→拼音
    },
  }
}
```

### 6.2 图谱层级初始化

```
声母节点：固定在 (0, 0)，fx=0, fy=0
韵母节点：均匀分布在半径 120 的圆上
拼音节点：按韵母分组，分布在对应韵母扇区
          半径 220 + shengdiao * 30（不同声调呈放射状排列）
```

### 6.3 出题逻辑

选择题的干扰项生成算法：

```js
function generateOptions(correctItem, pool, count = 4) {
  // 1. 正确答案放入选项
  // 2. 从同声母的音节中随机抽取干扰项（优先不同声调）
  // 3. 若同声母不够，从同韵母的补充
  // 4. 保证所有选项都是合法拼音
  // 5. 随机打乱顺序
}
```

### 6.4 TTS 语音朗读

```js
// hooks/useSpeech.js
export function useSpeech() {
  const speak = useCallback((text) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8     // 儿童语速稍慢
    utterance.pitch = 1.1    // 音调稍高
    speechSynthesis.speak(utterance)
  }, [])

  return { speak }
}
```

---

## 7. 接口定义

### 7.1 图谱组件 Props

```tsx
interface PinyinGraphProps {
  data: PinyinEntry[]           // 当前声母的所有音节数据
  shengmu: string               // 当前选中的声母
  onPlaySound: (pinyin: string, hanzi: string) => void  // 播放发音
  onStartPractice: (mode: string, filter?: object) => void  // 启动练习
}
```

### 7.2 拼音卡片 Props

```tsx
interface PinyinCardProps {
  node: PinyinNode              // 被点击的图谱节点
  onClose: () => void           // 关闭卡片
  onPlaySound: (pinyin: string) => void  // 播放发音
  onStartPractice?: (mode: string, filter: object) => void  // 从此音节开始练习
}
```

### 7.3 练习组件 Props

```tsx
interface PracticeProps {
  data: PinyinEntry[]           // 练习用的音节池
  mode: 'choice' | 'pinyin-to-hanzi' | 'hanzi-to-pinyin'
  filter?: { shengmu?: string; shengdiao?: number }
  questionCount: number         // 题目数量（默认 10）
  onComplete: (result: PracticeResult) => void  // 练习完成回调
  onBack: () => void            // 返回图谱
}

interface PracticeResult {
  score: number                 // 答对题数
  total: number                 // 总题数
  wrongAnswers: WrongAnswer[]   // 错题列表
  duration: number              // 用时（秒）
}
```

---

## 8. 开发环境与构建

### 8.1 数据转换

```bash
# 将拼音.csv 转换为 src/data/pinyin.js
node scripts/convert-csv.js /Users/yq/Downloads/拼音.csv src/data/pinyin.js
```

### 8.2 开发

```bash
cd pinyin-graph
npm run dev
# → http://localhost:5173
```

### 8.3 构建

```bash
npm run build
# → dist/ 目录
```

### 8.4 Vite 配置要点

```js
// vite.config.js
export default defineConfig({
  plugins: [react()],
  base: '/pinyin-graph/',   // 部署路径
  build: {
    outDir: 'dist',
  },
})
```

### 8.5 集成到 zhihr 首页

参考现有子项目（如 `review-system`、`moodist`）的集成方式，在 zhihr 首页增加拼音学习图谱的入口链接。

---

## 9. 性能考量

### 9.1 节点数量分析

- 一个声母平均可拼 8-12 个韵母
- 每个韵母最多 4 个声调
- 单声母图谱节点数约：1（声母）+ 10（韵母）+ 30（拼音）= **~40 个节点**
- 全部声母同时展示约：23 × 10 = **~230 个韵母节点**（不含拼音，P2 功能）

结论：单声母展示场景下节点数量很小，性能不是瓶颈。`react-force-graph-2d` 可在 500+ 节点下流畅运行。

### 9.2 优化策略

- 单声母展示（默认）：每个声母 ~40 节点，无需优化
- 全部声母总览（可选）：约 230 个韵母节点，仍无需额外优化
- 懒加载：声母切换时重建 graphData，但节点从预定位置开始而非随机，减少力模拟震荡
- 标签显隐：默认只显示关键标签，减少碰撞计算量

### 9.3 缓存策略

- `graphData`：仅当切声母时重新构建
- `__labelWidth` 和 `__radius`：在节点对象上缓存，力模拟每帧不再重复测量
- `useMemo`：依赖数据不变不重算

---

## 附录

### A. CSV 转换脚本设计

```js
// scripts/convert-csv.js
// 读取拼音.csv → 按声母分组索引 → 输出 JS 模块
//
// 输入：拼音.csv（UTF-8）
// 输出：src/data/pinyin.js（ES Module）
//
// 数据结构：
//   export const pinyinData = [...]
//   export const byShengmu = { b: [...], p: [...], ... }
//   export const shengmuList = [...]
```

### B. 参考文件

- 知识图谱技术白皮书：`.trae/documents/miaodu-knowledge-graph-technical-spec.md`
- KnowledgeGraph.jsx 源码：`miaodu/frontend/src/components/KnowledgeGraph.jsx`
- 产品需求文档：`.trae/documents/pinyin-learning-graph-prd.md`
- 拼音数据源：`/Users/yq/Downloads/拼音.csv`