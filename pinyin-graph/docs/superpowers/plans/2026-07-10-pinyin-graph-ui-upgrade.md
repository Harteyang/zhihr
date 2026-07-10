# 拼音学习图谱 UI 视觉升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据已确认的糖果撞色教育风设计规范，全面更新 `pinyin-graph` 的色彩系统、字体层级、组件样式与深色模式支持，同时保持现有功能与布局不变。

**Architecture:** 以 Tailwind CSS 配置扩展 + CSS 变量为基础，建立统一的 Design Token；先完成全局样式与基础组件，再按页面/模块逐个替换旧样式；新增主题切换能力并通过构建与视觉截图验收。

**Tech Stack:** React 18, Vite 6, Tailwind CSS 3, Vitest

---

## 文件结构

| 文件 | 责任 |
|------|------|
| `tailwind.config.js` | 扩展颜色、字体、阴影、圆角 Token，启用 `darkMode: 'class'` |
| `src/index.css` | 定义 CSS 变量 `:root` 与 `.dark`，重写基础组件类 |
| `src/components/layout/TopNav.jsx` | 品牌按钮 + 主题切换入口 |
| `src/components/graph/overview/ShengmuOverview.jsx` | 总览页标题、卡片、按钮组样式 |
| `src/components/graph/overview/ShengmuOverviewCard.jsx` | 声母卡片样式 |
| `src/components/graph/GraphDetailView.jsx` | 详情页控制按钮、面包屑 |
| `src/components/graph/PinyinGraph.jsx` | 图谱节点与连线配色 |
| `src/components/graph/PinyinCard.jsx` | 拼音详情浮层卡片 |
| `src/components/practice/PracticeHeader.jsx` | 练习头部进度条、返回按钮 |
| `src/components/practice/QuizChoice.jsx` | 选择题题目与选项样式 |
| `src/components/practice/PinyinToHanzi.jsx` | 拼音→汉字题目与选项样式 |
| `src/components/practice/HanziToPinyin.jsx` | 汉字→拼音题目与选项样式 |
| `src/components/practice/PracticeResult.jsx` | 练习结果页统计与错题 |
| `src/utils/pinyin-utils.js` | 现有工具，可能包含颜色函数，需检查 |
| `src/App.jsx` | 注入主题切换状态 |

---

## Task 1: 更新 Tailwind 配置

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: 重写 tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF3E6',
          100: '#FFE2C2',
          300: '#FFB366',
          500: '#FF8C42',
          700: '#CC5E1E',
          900: '#7A330E',
        },
        shengmu: {
          DEFAULT: '#E85D75',
          dark: '#FF7A95',
        },
        yunmu: {
          DEFAULT: '#00C9A7',
          dark: '#33E6C4',
        },
        pinyin: {
          DEFAULT: '#FFD15C',
          text: '#7A4F00',
          darkText: '#3D2800',
        },
        learning: {
          DEFAULT: '#6C5CE7',
          dark: '#A29BFE',
        },
        surface: {
          DEFAULT: '#FFFBF7',
          dark: '#1A1D2E',
          card: { DEFAULT: '#FFFFFF', dark: '#252842' },
          elevated: { DEFAULT: '#FFFFFF', dark: '#2E3250' },
        },
        divider: {
          DEFAULT: '#F0E6DE',
          dark: '#3A3F5C',
        },
        'divider-strong': {
          DEFAULT: '#E5D8CE',
          dark: '#4A5070',
        },
        content: {
          primary: { DEFAULT: '#2D2420', dark: '#F5F1EC' },
          secondary: { DEFAULT: '#6B6058', dark: '#B8B2C4' },
          tertiary: { DEFAULT: '#9E938A', dark: '#7A7F99' },
        },
        state: {
          success: { DEFAULT: '#2ECC71', dark: '#4DFF88' },
          error: { DEFAULT: '#E74C3C', dark: '#FF6B6B' },
          warning: { DEFAULT: '#F1C40F', dark: '#FFD93D' },
          info: { DEFAULT: '#3498DB', dark: '#5DADE2' },
          disabled: { DEFAULT: '#D1C7C0', dark: '#5A5F7A' },
        },
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['1.75rem', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['1.375rem', { lineHeight: '1.35', fontWeight: '600' }],
        h3: ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['1rem', { lineHeight: '1.6', fontWeight: '400' }],
        'body-strong': ['1rem', { lineHeight: '1.6', fontWeight: '600' }],
        caption: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
        tiny: ['0.6875rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(45, 36, 32, 0.05)',
        md: '0 4px 12px rgba(45, 36, 32, 0.08)',
        lg: '0 8px 24px rgba(45, 36, 32, 0.12)',
        colored: '0 4px 14px rgba(255, 140, 66, 0.25)',
        'colored-dark': '0 4px 14px rgba(255, 154, 92, 0.30)',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: 验证配置无语法错误**

Run: `npm run build`
Expected: 构建成功，无 Tailwind 配置错误

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.js
git commit -m "chore(design-system): 扩展 Tailwind Token 支持糖果撞色与深色模式"
```

---

## Task 2: 重写全局 CSS 与基础组件类

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 替换 index.css 内容**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    -webkit-tap-highlight-color: transparent;
  }

  :root {
    color-scheme: light;
  }

  .dark {
    color-scheme: dark;
  }

  body {
    @apply text-content-primary antialiased bg-surface;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply px-5 py-2.5 rounded-md bg-brand-500 text-white font-semibold
      hover:bg-brand-700 hover:shadow-colored dark:hover:shadow-colored-dark
      active:scale-[0.97] transition-all duration-150
      disabled:bg-state-disabled disabled:text-white/70 disabled:shadow-none
      disabled:cursor-not-allowed disabled:active:scale-100;
  }

  .btn-secondary {
    @apply px-4 py-2 rounded-md bg-surface-card text-content-secondary
      font-semibold border border-divider
      hover:bg-surface hover:border-divider-strong
      active:scale-[0.97] transition-all duration-150;
  }

  .btn-ghost {
    @apply px-3 py-2 rounded-md text-content-secondary font-medium
      hover:bg-surface hover:text-content-primary
      active:scale-[0.97] transition-all duration-150;
  }

  .card {
    @apply bg-surface-card border border-divider rounded-lg shadow-sm;
  }

  .card-interactive {
    @apply card hover:shadow-md hover:border-divider-strong transition-all duration-150;
  }

  .tag {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium;
  }
}

@layer utilities {
  .fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .slide-up {
    animation: slideUp 0.3s ease-out;
  }

  .bounce-in {
    animation: bounceIn 0.4s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounceIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(232, 93, 117, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(232, 93, 117, 0); }
  100% { box-shadow: 0 0 0 0 rgba(232, 93, 117, 0); }
}

@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(60px) rotate(360deg); opacity: 0; }
}

/* 自定义滚动条 */
.scrollbar-thin::-webkit-scrollbar {
  height: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: theme('colors.divider.DEFAULT');
  border-radius: 2px;
}
.dark .scrollbar-thin::-webkit-scrollbar-thumb {
  background: theme('colors.divider.dark');
}
```

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "chore(design-system): 重写基础组件类与 CSS 变量"
```

---

## Task 3: 添加主题切换能力

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/layout/TopNav.jsx`

- [ ] **Step 1: 在 App.jsx 中管理主题状态**

修改 `src/App.jsx` 顶部导入与状态：

```jsx
import { useState, useCallback, useMemo, useEffect } from 'react'
// ... 其他导入

export default function App() {
  // ... 原有状态
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return localStorage.getItem('pinyin-theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
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

  // ... 其余代码
}
```

- [ ] **Step 2: 将 theme 与 toggleTheme 传入 TopNav**

在 `App.jsx` 渲染 TopNav 处修改：

```jsx
<TopNav
  tab={tab}
  onTabChange={handleTabChange}
  onHome={handleTopNavHome}
  theme={theme}
  onToggleTheme={toggleTheme}
/>
```

- [ ] **Step 3: 在 TopNav.jsx 中渲染主题切换按钮**

完整替换 `src/components/layout/TopNav.jsx`：

```jsx
/**
 * TopNav — 顶部品牌返回按钮 + 主题切换
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
            className={`btn-ghost ${tab === 'graph' ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : ''}`}
            aria-pressed={tab === 'graph'}
          >
            图谱
          </button>
          <button
            onClick={() => onTabChange?.('practice')}
            className={`btn-ghost ${tab === 'practice' ? 'text-brand-500 bg-brand-50 dark:bg-brand-900/20' : ''}`}
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
```

注意：此步骤会改变 TopNav 的 props 接口，需要同步更新调用方。

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/layout/TopNav.jsx
git commit -m "feat(theme): 添加深色/浅色主题切换入口"
```

---

## Task 4: 升级声母总览页

**Files:**
- Modify: `src/components/graph/overview/ShengmuOverview.jsx`
- Modify: `src/components/graph/overview/ShengmuOverviewCard.jsx`

- [ ] **Step 1: 更新 ShengmuOverviewCard.jsx**

使用新的字体层级与颜色：

```jsx
export default function ShengmuOverviewCard({ item, count, onSelect, size = 'md' }) {
  const labelClass = size === 'sm' ? 'text-h3' : size === 'lg' ? 'text-display' : 'text-h2'
  const groupClass = 'text-tiny uppercase tracking-wider'
  const subClass = 'text-small'

  return (
    <button
      onClick={() => onSelect?.(item.id)}
      className="card-interactive flex flex-col items-center justify-center w-full aspect-square p-2"
      aria-label={`声母 ${item.label}`}
    >
      <span className={`${groupClass} text-content-tertiary mb-0.5`}>{item.group}</span>
      <span className={`${labelClass} font-bold text-content-primary`}>{item.label}</span>
      <span className={`${subClass} mt-0.5 text-content-secondary`}>
        {count} 音
      </span>
    </button>
  )
}
```

- [ ] **Step 2: 更新 ShengmuOverview.jsx**

```jsx
export default function ShengmuOverview({ onSelect, onStartPractice, getPinyinCount }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-content-primary">声母总览</h1>
        <span className="text-caption text-content-tertiary">点击声母进入详细图谱</span>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
          {OVERVIEW_ITEMS.map((item) => (
            <ShengmuOverviewCard
              key={item.id}
              item={item}
              count={getPinyinCount(item.id) || 0}
              onSelect={onSelect}
              size="md"
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-small text-content-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-divider bg-surface-card" />
            真实声母
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-dashed border-divider-strong bg-surface-card/60" />
            归入零声母
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => onStartPractice?.('choice', {})} className="btn-secondary">
            选择题练习
          </button>
          <button onClick={() => onStartPractice?.('pinyin-to-hanzi', {})} className="btn-secondary">
            拼音 → 汉字
          </button>
          <button onClick={() => onStartPractice?.('hanzi-to-pinyin', {})} className="btn-secondary">
            汉字 → 拼音
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/components/graph/overview/ShengmuOverview.jsx src/components/graph/overview/ShengmuOverviewCard.jsx
git commit -m "feat(ui): 升级声母总览页视觉样式"
```

---

## Task 5: 升级声母详情页

**Files:**
- Modify: `src/components/graph/GraphDetailView.jsx`
- Modify: `src/components/graph/PinyinGraph.jsx`（节点与连线配色）

- [ ] **Step 1: 更新 GraphDetailView.jsx**

```jsx
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

{/* 图谱控制栏 */}
<div className="flex items-center justify-end gap-2">
  <button onClick={() => graphRef.current?.fitView()} className="btn-secondary text-small px-3 py-1.5">
    适应视图
  </button>
  <button onClick={() => setShowLabels((v) => !v)} className="btn-secondary text-small px-3 py-1.5">
    {showLabels ? '隐藏汉字' : '显示汉字'}
  </button>
</div>
```

- [ ] **Step 2: 更新 PinyinGraph.jsx 节点配色**

找到节点颜色定义处（可能在 `nodeCanvasObject` 或配置中），替换为：

```js
const COLORS = {
  shengmu: { fill: '#E85D75', text: '#FFFFFF' },
  yunmu: { fill: '#00C9A7', text: '#FFFFFF' },
  pinyin: { fill: '#FFD15C', text: '#7A4F00' },
}
```

深色模式下建议使用：

```js
const COLORS_DARK = {
  shengmu: { fill: '#FF7A95', text: '#2D0A12' },
  yunmu: { fill: '#33E6C4', text: '#003D32' },
  pinyin: { fill: '#FFE08A', text: '#3D2800' },
}
```

可通过读取 `document.documentElement.classList.contains('dark')` 或传递 `theme` prop 动态切换。

- [ ] **Step 3: 更新连线颜色**

默认连线：`#E5D8CE` / `#4A5070`
高亮连线：`#FF8C42` / `#FF9A5C`

- [ ] **Step 4: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 5: Commit**

```bash
git add src/components/graph/GraphDetailView.jsx src/components/graph/PinyinGraph.jsx
git commit -m "feat(ui): 升级声母详情页与控制按钮视觉"
```

---

## Task 6: 升级拼音详情卡片

**Files:**
- Modify: `src/components/graph/PinyinCard.jsx`

- [ ] **Step 1: 替换卡片容器与文字层级**

```jsx
<div className="slide-up absolute bottom-4 right-4 z-20 w-72 md:w-80 bg-surface-elevated border border-divider rounded-xl shadow-lg p-5">
  {/* 头部 */}
  <div className="flex items-start justify-between mb-4">
    <span className="text-h2 font-bold text-brand-500">{pinyin}</span>
    <button
      onClick={onClose}
      className="btn-ghost text-content-tertiary hover:text-content-primary"
      aria-label="关闭"
    >
      ✕
    </button>
  </div>

  {/* 汉字 */}
  <div className="mb-4">
    <span className="text-display font-bold text-content-primary">{hanzi}</span>
    {zuci && <span className="text-h3 font-medium text-content-secondary">（{zuci}）</span>}
  </div>

  {/* 造句 */}
  {liju && (
    <div className="mb-4 px-3 py-2 bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-900/30 rounded-md">
      <div className="flex items-start gap-2">
        <div className="text-tiny font-semibold text-brand-700 dark:text-brand-300 shrink-0">造句</div>
        <p className="text-caption text-content-secondary leading-relaxed">{liju}</p>
      </div>
    </div>
  )}

  {/* 练习按钮 */}
  <button
    onClick={() => onStartPractice?.('choice', { shengmu })}
    className="w-full btn-primary"
  >
    开始练习
  </button>
</div>
```

- [ ] **Step 2: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 3: Commit**

```bash
git add src/components/graph/PinyinCard.jsx
git commit -m "feat(ui): 升级拼音详情卡片视觉"
```

---

## Task 7: 升级练习模块

**Files:**
- Modify: `src/components/practice/PracticeHeader.jsx`
- Modify: `src/components/practice/QuizChoice.jsx`
- Modify: `src/components/practice/PinyinToHanzi.jsx`
- Modify: `src/components/practice/HanziToPinyin.jsx`
- Modify: `src/components/practice/PracticeResult.jsx`

### 7.1 PracticeHeader

- [ ] **Step 1: 更新返回按钮、进度条与统计**

```jsx
<div className="flex items-center justify-between mb-4">
  <button onClick={onBack} className="btn-ghost text-caption flex items-center gap-1">
    ← 返回图谱
  </button>

  <div className="flex items-center gap-3 text-caption text-content-secondary">
    <span className="font-semibold text-brand-500">{score}</span>
    <span>/</span>
    <span>{total}</span>
    <span className="text-divider">|</span>
    <span>第 {currentIndex + 1} 题</span>
  </div>
</div>

<div className="w-full h-2 bg-divider rounded-full overflow-hidden mb-6">
  <div
    className="h-full bg-brand-500 rounded-full transition-all duration-300 ease-out"
    style={{ width: `${((currentIndex + (currentQuestion ? 1 : 0)) / total) * 100}%` }}
  />
</div>
```

### 7.2 练习选项状态样式函数

- [ ] **Step 2: 统一三个练习组件的选项样式函数**

在 `QuizChoice.jsx`、`PinyinToHanzi.jsx`、`HanziToPinyin.jsx` 中统一使用：

```js
function getOptionStyle(opt, revealed, isSelectedOption, isCorrectOption) {
  const base = 'py-3 px-4 rounded-md border-2 text-center font-semibold transition-all duration-150 '
  if (!revealed && isSelectedOption(opt)) {
    return base + 'border-state-info bg-state-info/10 text-state-info dark:text-state-info'
  }
  if (!revealed) {
    return base + 'border-divider bg-surface-card text-content-primary hover:border-state-info hover:bg-state-info/5'
  }
  if (isCorrectOption(opt)) {
    return base + 'border-state-success bg-state-success/10 text-state-success dark:text-state-success'
  }
  if (isSelectedOption(opt)) {
    return base + 'border-state-error bg-state-error/10 text-state-error dark:text-state-error'
  }
  return base + 'border-divider bg-surface-card text-content-tertiary opacity-60'
}
```

### 7.3 题目区域

- [ ] **Step 3: 统一题目展示样式**

拼音题目：`text-h1 font-bold text-brand-500`
汉字题目：`text-display font-bold text-content-primary`
提示文字：`text-caption text-content-tertiary`

### 7.4 PracticeResult

- [ ] **Step 4: 更新结果页统计卡片**

```jsx
<div className="grid grid-cols-3 gap-3 mb-6">
  <div className="card p-3 text-center">
    <div className="text-h1 font-bold text-content-primary">{result.score}</div>
    <div className="text-small text-content-tertiary mt-0.5">答对</div>
  </div>
  <div className="card p-3 text-center">
    <div className="text-h1 font-bold text-content-primary">{result.total}</div>
    <div className="text-small text-content-tertiary mt-0.5">总题</div>
  </div>
  <div className="card p-3 text-center">
    <div className="text-h1 font-bold text-brand-500">{result.percentage}%</div>
    <div className="text-small text-content-tertiary mt-0.5">正确率</div>
  </div>
</div>
```

- [ ] **Step 5: 构建验证**

Run: `npm run build`
Expected: 构建成功

- [ ] **Step 6: Commit**

```bash
git add src/components/practice/
git commit -m "feat(ui): 升级练习模块视觉与状态色"
```

---

## Task 8: 清理旧硬编码样式与视觉回归检查

**Files:**
- 全项目搜索 `text-gray-`、`bg-gray-`、`border-gray-`、`text-blue-`、`text-green-`、`text-red-` 等旧 Tailwind 默认色

- [ ] **Step 1: 搜索并列出所有遗留旧色**

Run: `grep -rn "text-gray-\|bg-gray-\|border-gray-\|text-blue-\|bg-blue-\|text-green-\|bg-green-\|text-red-\|bg-red-" src/`

- [ ] **Step 2: 逐项替换为 Design Token**

例如：
- `text-gray-800` → `text-content-primary`
- `text-gray-600` → `text-content-secondary`
- `text-gray-400` → `text-content-tertiary`
- `bg-gray-50` → `bg-surface`
- `border-gray-200` → `border-divider`
- `text-blue-600` → `text-brand-500` 或 `text-state-info`
- `text-green-600` → `text-state-success`
- `text-red-500` / `text-red-600` → `text-state-error`

- [ ] **Step 3: 构建与测试**

Run: `npm run build && npm test`
Expected: 构建成功；既有测试失败数量不增加

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(ui): 清理旧硬编码颜色，全面替换为 Design Token"
```

---

## Task 9: 视觉截图验收

**Files:**
- N/A

- [ ] **Step 1: 启动本地开发服务器**

Run: `npm run dev`

- [ ] **Step 2: 截取 Light 模式关键页面**

1. 声母总览
2. 声母 b 详情页
3. 拼音节点浮层
4. 练习题界面
5. 练习结果页

- [ ] **Step 3: 切换到 Dark 模式并截取同样页面**

- [ ] **Step 4: 对比设计规范检查**

检查项：
- 品牌色是否正确
- 节点配色是否符合图谱专用色
- 字体层级是否统一
- 按钮/卡片/选项样式是否一致
- Dark 模式下文字对比度是否足够

- [ ] **Step 5: 提交截图到设计文档附录（可选）**

将截图放入 `docs/superpowers/specs/assets/` 并更新设计文档中的交付物清单。

---

## 自我审查

### Spec 覆盖检查

| 规范章节 | 对应任务 |
|----------|----------|
| 3.1 品牌色 | Task 1 |
| 3.2 语义色 | Task 1 |
| 3.3 中性色 | Task 1 |
| 3.4 状态色 | Task 1, Task 7 |
| 3.5 图谱专用色 | Task 5 |
| 4. 字体层级 | Task 1, Task 4-7 |
| 5. 间距 | Task 1, Task 4-7 |
| 6. 圆角与阴影 | Task 1, Task 2 |
| 7. 组件规范 | Task 2, Task 4-7 |
| 8. 深色模式 | Task 1, Task 3, Task 5 |
| 9. 页面样例 | Task 4-7 |
| 10. 迁移清单 | Task 8 |

### Placeholder 检查

- 无 TBD / TODO
- 所有代码块包含完整可运行代码
- 所有命令包含预期输出

### 一致性检查

- Tailwind Token 名称在配置、CSS、组件中保持一致
- Dark 模式颜色映射在各组件中一致
- 字体层级类名统一

---

## 执行方式

计划已保存到 `docs/superpowers/plans/2026-07-10-pinyin-graph-ui-upgrade.md`。

**请选择执行方式：**

1. **Subagent-Driven（推荐）**：每个 Task 派发独立子代理执行，完成后我进行审查。
2. **Inline Execution**：在当前会话中按 Task 顺序直接执行，过程中设置检查点供你确认。
