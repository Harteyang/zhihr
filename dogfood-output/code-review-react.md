# 代码审查报告（React / Astro 应用）

> 审查日期：2026-07-21
> 审查范围：5 个应用（review-system、pinyin-graph、miaodu/frontend、talent-pool/client、moodist）
> 注意：本文件仅做问题记录，未做任何代码修改。

---

## 一、review-system（React / Vite / TypeScript）

### 🔴 Critical

#### 1.1 useEffect 无限重渲染风险 — `App.tsx`

```tsx
// App.tsx:23-29
useEffect(() => {
  if (isAuthenticated) {
    syncLocalToCloud().then(() => {
      loadFromCloud()  // loadFromCloud 内部会 set({ reviews: ... })，
                       // 导致 store 更新，可能触发 App 重渲染
    })
  }
}, [isAuthenticated])
```

- **描述**：`syncLocalToCloud` 内部调用 `loadFromCloud()`，后者会更新 Zustand store。如果 `isAuthenticated` 在 `loadFromCloud` 完成后仍为 `true`（确实如此），且 `syncLocalToCloud` 内部又触发了登录状态变化，可能形成无限循环。
- **推荐修复**：在 `useEffect` 中增加防抖或使用 `useRef` 追踪是否已同步过；或者将 `loadFromCloud` 的触发条件与登录状态解耦。

#### 1.2 刷新令牌（Refresh Token）直接暴露在客户端 — `api/client.ts`

```ts
// api/client.ts:36
const refreshToken = localStorage.getItem('zhihr_refresh_token')
```

- **描述**：refresh token 存储在 `localStorage` 中，可通过任何 XSS 攻击者读取。
- **推荐修复**：改用 `HttpOnly` + `SameSite` cookie 存储令牌，或使用 `sessionStorage` 配合 CSP 缓解 XSS 风险。

### 🟠 High

#### 1.3 Zustand store 初始值类型不安全 — `stores/settings.ts`

```ts
// stores/settings.ts:20
theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'light',
```

- **描述**：`as` 强制类型转换在 `localStorage` 返回 `'dark'` 之外的任意字符串时（如用户手动写入 `'invalid'`），会导致类型运行时错误。
- **推荐修复**：使用白名单校验，例如：
  ```ts
  theme: (() => {
    const t = localStorage.getItem('theme')
    return (t === 'dark' || t === 'light') ? t : 'light'
  })()
  ```

#### 1.4 Toast ID 可能重复（碰撞）— `stores/toast.ts`

```ts
// stores/toast.ts:17
const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

- **描述**：高并发下 `Date.now()` 相同且 `Math.random()` 可能碰撞，导致 toast 无法唯一识别。
- **推荐修复**：使用 `crypto.randomUUID()`（已在 `lib/utils.ts` 中可用）。

#### 1.5 云端同步中 ID 不一致可能导致数据重复 — `stores/reviews.ts`

```ts
// reviews.ts:148-152
if (result.data && result.data.id && result.data.id !== updated.id) {
  set({
    reviews: get().reviews.map(r =>
      r.id === updated.id ? { ...r, id: result.data.id, _source: 'cloud' as const } : r
    ),
  })
}
```

- **描述**：`saveRecord` 中本地生成的 UUID 在 `syncLocalToCloud` 中又被当作 "new" 模式提交，云端返回新 ID，但本地未清除旧 ID 的备份。`loadFromCloud` 中的 `mergeReviews` 按 ID 合并，若云端新 ID 与本地旧 ID 均存在，可能产生重复记录。
- **推荐修复**：在 `syncLocalToCloud` 后，移除旧 ID 的 local 副本，仅保留云端 ID 的记录。

#### 1.6 用户自定义项目 ID 基于 `Date.now()`，高并发下重复 — `components/review/DimensionCard.tsx`

```tsx
// DimensionCard.tsx:75-76
const id = `custom_${Date.now()}`
const newItem: UserCustomItem = { id, label, placeholder: label }
```

- **描述**：快速连续添加多个自定义项目时，`Date.now()` 可能返回相同值，导致 ID 重复，进而可能覆盖已有项。
- **推荐修复**：使用 `crypto.randomUUID()` 生成唯一 ID。

### 🟡 Medium

#### 1.7 未使用 TypeScript 类型约束 `onAuthEvent` 回调 — `stores/auth.ts`

```ts
// stores/auth.ts:71
onAuthEvent('auth:login', (data: any) => {
```

- **描述**：`data` 使用 `any` 类型，绕过了类型安全。如果 SharedAuth 返回数据结构变化，不会在编译时报错。
- **推荐修复**：定义 `AuthLoginPayload` 接口并替换 `any`。

#### 1.8 登录提示窗口每 30 分钟只能弹出一次，用户可能在 30 分钟内无法看到提示 — `components/auth/LoginPrompt.tsx`

```tsx
// LoginPrompt.tsx:19
if (lastTime && now - parseInt(lastTime) < 30 * 60 * 1000) return
```

- **描述**：如果用户在 30 分钟内未登录，`reviewLoginPromptTime` 过期后会再次弹出。但逻辑中 `parseInt(lastTime)` 未指定基数，虽默认是 10，但存在潜在问题。
- **推荐修复**：使用 `Number(lastTime)` 代替 `parseInt`。

#### 1.9 `ReportTab` 中 ECharts 通过 CDN 加载，静态托管下可能失败 — `components/report/ReportTab.tsx`

```tsx
// ReportTab.tsx:8
// ECharts is loaded via CDN in index.html
declare global {
  interface Window {
    echarts: any  // 类型不安全
  }
}
```

- **描述**：
  1. `window.echarts` 使用 `any` 类型，缺乏类型安全。
  2. ECharts 通过 CDN 加载，在离线环境或 CDN 被屏蔽时图表将无法渲染。
- **推荐修复**：将 ECharts 作为 npm 包引入（如 `npm install echarts @types/echarts`），替换 CDN 加载方式。

#### 1.10 `ReviewTab` 中 `useEffect` 依赖 `setContent, setSummary, getToday` 导致每次渲染都触发自动保存加载 — `components/review/RecordTab.tsx`

```tsx
// RecordTab.tsx:61-67
useEffect(() => {
  const saved = loadAutosave()
  if (saved && saved.date === getToday()) {
    setContent(saved.content as ReviewContent)
    setSummary(saved.summary)
  }
}, [setContent, setSummary, getToday])
```

- **描述**：`setContent` 和 `setSummary` 是 React 的 `setState`，在 StrictMode 下每次渲染都会重新创建（虽然实际 React 会 memoize，但 `getToday` 是一个函数引用）。这会导致自动保存加载逻辑在每次渲染时触发，增加不必要的副作用。
- **推荐修复**：将 `getToday` 包裹在 `useCallback` 中，并将依赖数组简化为 `[]`（使用 `useRef` 保存 `today` 值）。

#### 1.11 `RecordTab` 中 `content` 和 `summary` 在保存成功后直接重置，用户无法撤销 — `components/review/RecordTab.tsx`

```tsx
// RecordTab.tsx:93-97
await saveRecord(getToday(), content, summary, selectedMode)
setContent(emptyContent)
setSummary('')
clearAutosave()
```

- **描述**：保存成功后立即清空表单，且清除自动保存，用户无法撤销操作。
- **推荐修复**：增加 undo 机制，或在保存后保留表单数据直到用户主动清除。

### 🟢 Low

#### 1.12 `App.tsx` 中 `loadFromCloud` 的 store 函数未传入 `useEffect` 依赖 — `App.tsx`

```tsx
// App.tsx:17-18
const loadFromCloud = useReviewsStore(s => s.loadFromCloud)
const syncLocalToCloud = useReviewsStore(s => s.syncLocalToCloud)
```

- **描述**：Zustand store 的函数在每次渲染时是稳定引用（除非 store 重建），但 ESLint `react-hooks/exhaustive-deps` 会警告缺少依赖。
- **推荐修复**：使用 `useCallback` 包裹或添加 eslint-disable 注释。

#### 1.13 `ReviewContent` 类型中值为 `string | DimensionData`，组件间传递时类型不统一 — `types/review.ts`

```ts
// types/review.ts:10-19
export interface ReviewContent {
  health: string | DimensionData
  // ...
}
```

- **描述**：`ReviewContent` 的值既可以是字符串（序列化后的 JSON）也可以是 `DimensionData` 对象，导致组件间传递时需要频繁调用 `parseDimensionValue` / `formatDimensionValue`，增加复杂度和错误风险。
- **推荐修复**：统一内部表示为 `DimensionData` 对象，仅在序列化到本地/API 时进行转换。

---

## 二、pinyin-graph（React / Vite / JavaScript）

### 🔴 Critical

#### 2.1 `App.jsx` 中 `useEffect` 自动保存练习结果，依赖 `quiz.result` 但未清理 — `App.jsx`

```jsx
// App.jsx:72-76
useEffect(() => {
  if (quiz.isFinished && quiz.result) {
    addRecord(quiz.result)
  }
}, [quiz.isFinished, quiz.result, addRecord])
```

- **描述**：如果 `quiz.isFinished` 和 `quiz.result` 在组件未卸载时保持不变，每次父组件重渲染时 `addRecord` 可能重新创建（如果 `addRecord` 未 memoized），导致重复保存记录。
- **推荐修复**：在 `addRecord` 前增加 `useRef` 跟踪是否已保存过当前结果。

### 🟠 High

#### 2.2 `usePinyinQuiz` 中 `answer` 方法的依赖数组可能过期 — `hooks/usePinyinQuiz.js`

```jsx
// usePinyinQuiz.js:68-93
const answer = useCallback((selectedAnswer) => {
  // ...
  const finished = newTotal >= questions.length
  // ...
}, [isFinished, currentIndex, totalAnswered, score, wrongAnswers, questions.length])
```

- **描述**：`answer` 捕获的 `questions.length` 是 `useCallback` 创建时的快照。如果 `questions` 数组长度在答题过程中变化（如过滤条件改变），`finished` 判断将不准确。
- **推荐修复**：使用 `useRef` 存储 `questionsRef`（已存在），在 `answer` 中引用 `questionsRef.current.length` 而非闭包中的 `questions.length`。

#### 2.3 `usePinyinQuiz` 中 `pool` 计算使用 `filterBy` 但未传入 `defaultPool` — `hooks/usePinyinQuiz.js`

```jsx
// usePinyinQuiz.js:34-37
const pool = useMemo(() => {
  if (Object.keys(filter).length === 0) return defaultPool
  return filterBy(filter)
}, [defaultPool, filter])
```

- **描述**：`filterBy(filter)` 调用时没有传入数据池，它内部可能依赖全局数据（如 `pinyin.js` 中的全局导出），如果全局数据被修改或过滤条件不匹配，`pool` 将为空。
- **推荐修复**：在 `filterBy` 中明确传入数据池参数，避免依赖全局变量。

#### 2.4 `useSpeech` 中 `speak` 函数内的 `setTimeout` 未清理 — `hooks/useSpeech.js`

```jsx
// useSpeech.js:187-207
setTimeout(() => {
  // ... 创建 utterance 并播放
}, MIN_VOICE_READY_DELAY)
```

- **描述**：`MIN_VOICE_READY_DELAY`（100ms）的 setTimeout 未保存引用，组件卸载时可能仍在执行 `speechSynthesis.speak()`，造成内存泄漏。
- **推荐修复**：将 setTimeout 的 ID 保存到 ref 中，并在 `useEffect` 清理函数或 `stop` 方法中清除。

### 🟡 Medium

#### 2.5 `PinyinGraph.jsx` 中 Canvas 标签宽度测量使用全局 Canvas 实例，多线程渲染可能冲突 — `components/graph/PinyinGraph.jsx`

```jsx
// PinyinGraph.jsx:61-62
const labelCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
const labelCtx = labelCanvas ? labelCanvas.getContext('2d') : null
```

- **描述**：`labelCanvas` 和 `labelCtx` 是模块级单例，多个 `PinyinGraph` 组件实例共享同一个 Canvas 上下文，在 `measureLabelWidth` 中同时调用时可能导致上下文状态被覆盖。
- **推荐修复**：使用 `useMemo` 在组件内创建 Canvas 实例，或使用 `getComputedStyle` 估算文本宽度。

#### 2.6 `PinyinGraph.jsx` 中 `handleEngineStop` 回调在 `fitGenerationRef` 检查后可能错过 `setMinZoom` — `components/graph/PinyinGraph.jsx`

```jsx
// PinyinGraph.jsx:640-651
const handleEngineStop = useCallback(() => {
  if (!fgRef.current || fitDoneRef.current) return
  const fg = fgRef.current
  const gen = ++fitGenerationRef.current
  fg.zoomToFit(400, 20)
  fitDoneRef.current = true
  setTimeout(() => {
    if (fitGenerationRef.current !== gen || !fgRef.current) return
    const z = fgRef.current.zoom()
    setMinZoom(Math.max(Math.min(z, MIN_READABLE), MIN_ZOOM_FLOOR))
  }, 450)
}, [])
```

- **描述**：`fitGenerationRef.current` 是递增计数器，但 `fitDoneRef.current` 在组件重渲染后会被重置为 `false`，导致每次重渲染后再次触发 `zoomToFit`，可能引起不必要的动画闪烁。
- **推荐修复**：使用 `useRef` 追踪组件是否已稳定，避免重复触发。

#### 2.7 `useLearningRecord` 中 stats 计算每次渲染都重新计算 — `hooks/useLearningRecord.js`

```jsx
// useLearningRecord.js:43-50
const stats = {
  totalPractices: records.length,
  totalQuestions: records.reduce((s, r) => s + r.total, 0),
  // ...
}
```

- **描述**：`stats` 对象在每次组件渲染时都重新计算，对于大量记录（200 条）可能造成性能问题。
- **推荐修复**：使用 `useMemo` 包裹 `stats` 计算。

#### 2.8 `App.jsx` 中 `usePinyinQuiz` 初始化时传入固定 `questionCount: 10`，但实际题库可能不足 — `App.jsx`

```jsx
// App.jsx:36
const quiz = usePinyinQuiz({ pool: pinyinData, questionCount: 10 })
```

- **描述**：如果筛选后的题库不足 10 题，`usePinyinQuiz` 中的 `randomPick` 会返回少于 10 题，但 UI 不会提示用户。
- **推荐修复**：在 `start` 方法中检查实际题目数量，不足时显示提示或自动减少题目数。

### 🟢 Low

#### 2.9 `App.jsx` 中 `selectedNode` 初始化为 `null`，但未在 TypeScript 项目中声明类型 — `App.jsx`

```jsx
// App.jsx:33
const [selectedNode, setSelectedNode] = useState(null)
```

- **描述**：`selectedNode` 可能接收 `null` 或 `object`，在后续组件中使用 `selectedNode.data` 等属性时可能产生 `Cannot read properties of null` 错误。
- **推荐修复**：在访问 `selectedNode` 属性前增加非空检查，或为 `selectedNode` 定义接口类型。

#### 2.10 `shengmu-overview.js` 中 `computeOverviewLayout` 函数在容器宽度为 0 时可能产生 `Infinity` — `utils/shengmu-overview.js`

```js
// shengmu-overview.js:32-33
const radius = Math.min(containerW, containerH) / 2 - 80
```

- **描述**：如果 `containerW` 和 `containerH` 为 0（组件初始渲染），`radius` 将为 `-80`，导致节点坐标计算错误。
- **推荐修复**：在函数入口处增加 `containerW <= 0 || containerH <= 0` 的检查，返回空数组或使用默认尺寸。

---

## 三、miaodu/frontend（React / Vite / JavaScript）

### 🔴 Critical

#### 3.1 API 请求未处理 JSON 解析错误 — `api.js`

```js
// api.js:3-10
async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  return res.json()
}
```

- **描述**：`res.json()` 在网络错误、非 JSON 响应或空响应时会抛出未捕获的 `SyntaxError`，导致整个请求失败且无友好错误提示。
- **推荐修复**：
  ```js
  async function request(path, options = {}) {
    const url = `${API_BASE}${path}`
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
      throw new Error(error.message || `请求失败 (${res.status})`)
    }
    return res.json()
  }
  ```

#### 3.2 `App.jsx` 中搜索结果渲染使用 `key={i}`，数据变化时可能导致渲染错误 — `App.jsx`

```jsx
// App.jsx:270-276
results.map((item, i) => (
  <KnowledgeResultCard
    key={item.id || i}
    // ...
  />
))
```

- **描述**：虽然使用了 `item.id || i`，但如果 `item.id` 不存在，回退到索引 `i`。在数据排序或过滤变化时，React 可能错误地复用组件，导致状态不一致。
- **推荐修复**：确保所有数据项都有唯一 `id`，或生成基于内容的稳定 ID。

### 🟠 High

#### 3.3 `App.jsx` 中 `searchIdRef` 防过期机制未覆盖所有异步路径 — `App.jsx`

```jsx
// App.jsx:29-71
const handleSearch = useCallback(async (q, type = 'book') => {
  const currentId = ++searchIdRef.current
  // ...
  try {
    const data = await searchFn(q)
    if (currentId !== searchIdRef.current) return  // 检查 1
    // ...
    if (type === 'book') {
      setPhase('mlook')
      const mlookData = await api.searchMlook(q)  // 异步调用
      if (currentId !== searchIdRef.current) return  // 检查 2
      // ...
    }
  } catch (err) {
    if (currentId !== searchIdRef.current) return  // 检查 3
    setError(err.message || '搜索失败，请稍后重试')
  } finally {
    if (currentId === searchIdRef.current) setLoading(false)
  }
}, [])
```

- **描述**：虽然大部分异步路径都检查了 `searchIdRef`，但 `api.searchMlook` 的 `catch` 块中未重新检查 `currentId`，可能设置过期错误。
- **推荐修复**：在 `catch` 块开头也检查 `currentId`。

#### 3.4 `BookList.jsx` 中 `displayedBooks` 状态冗余，直接渲染 `allBooks` 即可 — `BookList.jsx`

```jsx
// BookList.jsx:60-62
useEffect(() => {
  setDisplayedBooks(allBooks)
}, [allBooks])
```

- **描述**：`displayedBooks` 完全由 `allBooks` 派生，引入额外状态会增加不必要的重渲染。
- **推荐修复**：直接使用 `allBooks` 渲染，移除 `displayedBooks` 状态。

### 🟡 Medium

#### 3.5 `SearchBar.jsx` 中 `handleTypeChange` 在切换搜索类型时会直接触发搜索 — `SearchBar.jsx`

```jsx
// SearchBar.jsx:20-27
const handleTypeChange = (newType) => {
  const q = query.trim()
  if (q) {
    onSearch(q, newType)
  } else {
    onTypeChange(newType)
  }
}
```

- **描述**：当用户已输入搜索词时，切换"按书名/按知识点"标签会立即触发搜索，用户可能未预期此行为。
- **推荐修复**：只更新搜索类型，不自动触发搜索；或在切换时显示确认提示。

#### 3.6 `SubmitForm.jsx` 中提交时无输入验证，可能提交空书名 — `SubmitForm.jsx`

```jsx
// SubmitForm.jsx:13-36
const handleSubmit = async () => {
  setSubmitting(true)
  setError(null)
  try {
    const result = await submitDeconstruct({
      title,  // title 可能为空字符串
      // ...
    })
  }
```

- **描述**：`title` 可能为空字符串（当 `selectedBook` 和 `query` 都为空时），提交到后端可能导致数据不完整或后端错误。
- **推荐修复**：在提交前验证 `title` 非空，如 `if (!title.trim()) { setError('请确认书名'); return }`。

#### 3.7 `App.jsx` 中 `knowledgeView` 切换时 `KnowledgeGraph` 组件可能因数据量过大导致性能问题 — `App.jsx`

```jsx
// App.jsx:266-267
{knowledgeView === 'graph' ? (
  <KnowledgeGraph results={results} query={lastQuery} onViewBook={handleViewBookFromKnowledge} />
) : (
```

- **描述**：`KnowledgeGraph` 使用 `react-force-graph-2d` 和 Canvas 渲染，对于 300+ 个节点的数据集，初次渲染和布局计算可能耗时较长，导致 UI 卡顿。
- **推荐修复**：
  1. 对 `KnowledgeGraph` 使用 `React.lazy` + `Suspense` 懒加载。
  2. 限制图谱最大节点数（如 500），超出时提示用户。

### 🟢 Low

#### 3.8 `api.js` 中 `VITE_API_BASE` 环境变量使用 `||` 默认值，可能被覆盖为错误 URL — `api.js`

```js
// api.js:1
const API_BASE = import.meta.env.VITE_API_BASE || 'https://api.zhihr.vip'
```

- **描述**：如果 `VITE_API_BASE` 被设置为空字符串 `''`，`||` 会回退到默认值。但如果设置为 `undefined`，也会回退。此行为虽然合理，但不够明确。
- **推荐修复**：使用 `import.meta.env.VITE_API_BASE ?? 'https://api.zhihr.vip'`，显式区分 `undefined` 和空字符串。

---

## 四、talent-pool/client（Vue 3 / Vite / JavaScript）

> 注意：此项目使用 Vue 3 + Pinia + Element Plus，非 React。

### 🔴 Critical

#### 4.1 路由守卫中 `beforeEach` 未等待异步 `fetchCurrentUser` 完成就放行 — `router/index.js`

```js
// router/index.js:26-43
router.beforeEach((to, _from, next) => {
  if (to.meta.public) {
    return next()
  }

  const authStore = useAuthStore()

  if (!authStore.isLoggedIn) {
    return next('/login')
  }

  if (to.meta.requireAdmin && !authStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    return next('/candidates')
  }

  next()  // 直接放行，未验证 token 有效性
})
```

- **描述**：路由守卫仅检查 `authStore.isLoggedIn`（即 localStorage 中是否存在 token），但未调用 `fetchCurrentUser` 验证 token 是否仍然有效。如果 token 已过期，用户仍可进入页面，直到第一次 API 请求失败才会被重定向到登录页。
- **推荐修复**：在 `beforeEach` 中调用 `await authStore.fetchCurrentUser()`，根据结果决定是否放行。

#### 4.2 `auth.js` store 中 `login` 和 `register` 方法未处理 API 错误 — `stores/auth.js`

```js
// stores/auth.js:13-27
async function login(username, password) {
  const res = await api.post('/auth/login', { username, password })
  const data = res.data.data
  token.value = data.token
  // ...
}
```

- **描述**：如果 API 返回 4xx/5xx 错误，`res.data.data` 可能为 `undefined` 或错误对象，直接解构会导致 `token.value = undefined`，用户状态被错误设置为已登录。
- **推荐修复**：在解构前检查 `res.data.success` 或捕获异常，失败时抛出错误或显示提示。

### 🟠 High

#### 4.3 `api/index.js` 中 401 响应拦截器使用 `window.location.href` 硬跳转，破坏 SPA 路由 — `api/index.js`

```js
// api/index.js:15-28
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      const loginUrl = import.meta.env.BASE_URL + 'login'
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = loginUrl  // 硬跳转
      }
    }
    return Promise.reject(error)
  }
)
```

- **描述**：`window.location.href` 硬跳转会导致整页刷新，丢失 SPA 状态，且不使用 Vue Router 的导航守卫，可能导致登录页加载后再次被重定向。
- **推荐修复**：使用 `router.push('/login')` 进行软导航，或至少使用 `window.history.pushState`。

#### 4.4 `api/index.js` 中 401 拦截器未处理 refresh token 刷新逻辑 — `api/index.js`

- **描述**：应用存储了 `refreshToken`，但 401 拦截器中直接使用 `localStorage.removeItem('token')` 清除了所有令牌，没有尝试用 refresh token 刷新。
- **推荐修复**：在 401 时先尝试调用 refresh API，刷新成功后重试原请求，失败后再清除令牌并重定向。

### 🟡 Medium

#### 4.5 `candidate.js` store 中 `fetchList` 在错误时未清理 `loading` 状态 — `stores/candidate.js`

```js
// stores/candidate.js:11-19
async function fetchList(params) {
  loading.value = true
  try {
    const res = await getCandidates(params)
    candidates.value = res.data.data
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}
```

- **描述**：虽然使用了 `finally` 块清理 `loading`，但如果 `getCandidates` 抛出非网络错误（如 JSON 解析错误），`loading` 会被正确清理。但 `catch` 块中未处理错误，导致 UI 无法显示错误信息。
- **推荐修复**：添加 `catch` 块，将错误信息传递到 UI 层。

#### 4.6 `auth.js` store 中 `token` 和 `refreshToken` 初始值从 `localStorage` 读取，但解析后未验证 — `stores/auth.js`

```js
// stores/auth.js:5-8
const token = ref(localStorage.getItem('token') || '')
const refreshToken = ref(localStorage.getItem('refreshToken') || '')
const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))
```

- **描述**：如果 `localStorage` 中的 `user` 数据损坏（非有效 JSON），`JSON.parse` 会抛出异常，导致应用崩溃。
- **推荐修复**：使用 try-catch 包裹 `JSON.parse`，解析失败时设为 `null`。

### 🟢 Low

#### 4.7 路由配置中 `/share/:token` 和 `/resume-share/:token` 的 `token` 未做 URL 安全验证 — `router/index.js`

- **描述**：分享链接的 `token` 直接作为路由参数传递，未在前端验证格式或长度，可能暴露有效 token 给恶意用户。
- **推荐修复**：在前端验证 token 格式（如长度、字符集），并与后端验证保持一致。

---

## 五、moodist（Astro PWA / React / TypeScript）

### 🟠 High

#### 5.1 `app.tsx` 中 ShareHandler 使用 `JSON.parse` 解析 URL 参数，未做输入验证 — `components/app/app.tsx`

```tsx
// app.tsx:37-38
const selectedSounds = JSON.parse(decodeURIComponent(shareParam)) as Record<string, number>;
```

- **描述**：`shareParam` 来自 URL，恶意用户可构造超长或畸形 JSON 字符串导致解析失败或性能问题（如 `JSON.parse` 对超大字符串处理耗时）。
- **推荐修复**：增加 try-catch 块（已有），但可进一步限制解析后的对象大小和键数量。

#### 5.2 `sound.ts` store 中 `override` 方法直接修改 `sounds` 对象的引用 — `stores/sound.ts`

```ts
// sound.ts:79-92
override(newSounds) {
  get().unselectAll()
  const sounds = get().sounds
  Object.keys(newSounds).forEach(sound => {
    if (sounds[sound]) {
      sounds[sound].isSelected = true
      sounds[sound].volume = newSounds[sound]
    }
  })
  set({ history: null, sounds: { ...sounds } })
}
```

- **描述**：`override` 中先修改 `sounds` 对象内部引用，再使用 `{ ...sounds }` 浅拷贝。虽然 `SoundValue` 是简单对象（`boolean` + `number`），浅拷贝足够，但逻辑上先修改后拷贝可能导致其他订阅者看到中间状态。
- **推荐修复**：先创建新对象，再设置属性，避免修改原始引用。

### 🟡 Medium

#### 5.3 `app.tsx` 中 `useEffect` 监听 `visibilitychange` 恢复 AudioContext，但未处理 AudioContext 状态错误 — `components/app/app.tsx`

```tsx
// app.tsx:76-90
useEffect(() => {
  const onChange = () => {
    const { ctx } = Howler
    if (ctx && !document.hidden) {
      setTimeout(() => {
        ctx.resume()
      }, 100)
    }
  }
  document.addEventListener('visibilitychange', onChange, false)
  return () => document.removeEventListener('visibilitychange', onChange)
}, [])
```

- **描述**：`ctx.resume()` 在 AudioContext 状态为 `closed` 时可能抛出异常，导致应用崩溃。
- **推荐修复**：在 `resume()` 前检查 `ctx.state !== 'closed'`，或使用 try-catch 包裹。

#### 5.4 `sound.ts` store 中 `shuffle` 方法使用 `setTimeout` 延迟播放，未清理定时器 — `stores/sound.ts`

```ts
// sound.ts:157-161
setTimeout(() => {
  set({ isPlaying: true, locked: false })
}, 100)
```

- **描述**：`shuffle` 方法中的 setTimeout 未保存引用，如果用户在 100ms 内再次调用 `shuffle`，会产生多个定时器，导致状态混乱。
- **推荐修复**：使用 `useRef`（在 store 中可用 `ref` 或 `atom`）保存定时器 ID，在下次调用时清除。

### 🟢 Low

#### 5.5 `preset.ts` store 中 `migrate` 函数在 version 0 时给 preset 添加 `id`，但 `uuid()` 可能重复 — `stores/preset.ts`

```ts
// preset.ts:63-66
presets: (persisted.presets || []).map(preset => {
  if (preset.id) return preset
  return { ...preset, id: uuid() }
})
```

- **描述**：`uuid()` 使用 `uuid/v4`，在极低概率下可能重复。但对于迁移场景，影响较小。
- **推荐修复**：可在迁移后检查是否有重复 ID，如有则重新生成。

#### 5.6 `settings.ts` store 中使用 `set` 而不是 `(set, get)` — `stores/settings.ts`

```ts
// settings.ts:12-26
export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      alarmVolume: 1,
      globalVolume: 1,
      setAlarmVolume(volume: number) {
        set({ alarmVolume: volume })
      },
      setGlobalVolume(volume: number) {
        set({ globalVolume: volume })
      },
    }),
```

- **描述**：`settings.ts` 使用 `set => ({...})` 形式，而 `sound.ts`、`todo.ts` 等使用 `(set, get) => ({...})`。两种风格混用虽然功能一致，但不利于团队维护。
- **推荐修复**：统一使用 `(set, get) => ({...})` 形式，便于未来添加 `get()` 调用。

#### 5.7 `todo.ts` store 中 `toggleTodo` 完成后触发 `addConfetti()`，但无防抖，快速连续点击可能多次触发 — `stores/todo.ts`

```ts
// todo.ts:65-79
toggleTodo(id) {
  set({
    todos: get().todos.map(todo => {
      if (todo.id !== id) return todo
      return { ...todo, done: !todo.done }
    }),
  })
  if (get().doneCount() === get().todos.length) {
    addConfetti()
  }
}
```

- **描述**：如果所有 todo 都已完成，再次 `toggleTodo` 将全部未完成，然后再 `toggleTodo` 又会全部完成，反复触发 `addConfetti()`。
- **推荐修复**：使用 `useRef` 或 `setTimeout` 增加短暂防抖，或仅在首次完成时触发。

---

## 六、跨项目共性问题

### 🔴 Critical

#### C.1 所有 React/Vue 应用均未使用 `StrictMode` 下的双重调用特性 — 多文件

- **描述**：`review-system` 和 `pinyin-graph` 使用了 `React.StrictMode`，但 `miaodu/frontend`、`talent-pool/client` 未使用。`StrictMode` 有助于发现副作用问题，所有项目应统一使用。
- **推荐修复**：在 `main.tsx` / `main.jsx` / `main.js` 中包裹 `StrictMode`。

### 🟠 High

#### C.2 多个项目使用 `localStorage` 存储敏感数据，存在 XSS 风险 — 多文件

- **涉及项目**：review-system（token）、talent-pool（token + refreshToken）、moodist（presets、todos）
- **描述**：`localStorage` 中的数据可通过任何 XSS 攻击者读取。虽然 moodist 存储的是非敏感数据（声音偏好、待办事项），但 review-system 和 talent-pool 存储了认证令牌。
- **推荐修复**：
  - 认证令牌改用 `HttpOnly` cookie
  - 非敏感数据使用 `sessionStorage` 配合 CSP 缓解 XSS 风险

#### C.3 多个项目使用 `Math.random()` 生成 ID，存在碰撞风险 — 多文件

- **涉及项目**：review-system（`DimensionCard.tsx`）、pinyin-graph（部分组件）
- **描述**：`Math.random()` 不是密码学安全的随机数生成器，在高并发场景下可能生成重复 ID。
- **推荐修复**：统一使用 `crypto.randomUUID()` 或 `uuid/v4`。

### 🟡 Medium

#### C.4 多个项目的 API 调用缺少超时设置 — 多文件

- **涉及项目**：review-system（`api/client.ts`）、miaodu（`api.js`）
- **描述**：`fetch` 调用未设置 `timeout`，在网络不佳或后端无响应时，请求可能永远挂起。
- **推荐修复**：使用 `AbortController` + `setTimeout` 实现请求超时，或使用 `axios`（已有 timeout 支持）。

#### C.5 多个项目的组件中使用了 `any` 类型 — 多文件

- **涉及项目**：review-system（`stores/auth.ts`、`ReportTab.tsx`）、moodist（`sound.ts`）
- **描述**：`any` 类型绕过了 TypeScript 的类型检查，增加了运行时错误风险。
- **推荐修复**：定义明确的接口类型，替换所有 `any` 使用。

---

## 总结

| 严重程度 | 数量 |
|---------|------|
| Critical | 5 |
| High     | 12  |
| Medium   | 11  |
| Low      | 8   |
| **合计** | **36** |

### 关键发现

1. **认证安全**：review-system 和 talent-pool 的 token 管理存在安全隐患，`localStorage` 存储令牌 + `window.location.href` 硬跳转是最严重的问题。
2. **Zustand/Pinia store 设计**：moodist 的 `sound.ts` store 中直接修改对象引用的模式需要统一为不可变更新。
3. **TypeScript 类型安全**：多个文件使用 `any` 类型，特别是在 API 响应处理和第三方库集成（如 ECharts）处。
4. **useEffect 依赖**：review-system 和 pinyin-graph 中部分 `useEffect` 依赖数组不完整，可能导致不必要的重渲染或副作用。
5. **ID 生成**：多个项目使用 `Math.random()` 或 `Date.now()` 生成 ID，建议统一使用 `crypto.randomUUID()`。
