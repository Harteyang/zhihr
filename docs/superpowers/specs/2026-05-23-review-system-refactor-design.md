# Review System 重构技术选型设计

**设计日期:** 2026-05-23
**项目:** 知HR-复盘系统
**目标:** 基于 Cloudflare Pages 兼容性，重构 review-system 前端，解决现有架构问题

---

## 1. 背景与问题

### 1.1 现有架构

- 前端：React + Zustand，但所有代码在打包后的压缩 JS 中（`index-BmCB11Ko.js`），无源码
- 认证：index.html 内联 ~700 行脚本 + React store 双重实现
- API：Cloudflare Workers 独立部署（`api.zhihr.vip`）
- 数据：localStorage 缓存 + 云端 D1 数据库

### 1.2 核心问题

| # | 问题 | 影响 |
|---|------|------|
| 1 | 认证双重实现 | index.html 内联脚本和 React store 各管一套，localStorage 键名不一致 |
| 2 | Monkey-patch 模式 | `patchKcStore()` 运行时替换 Zustand 方法，依赖混淆变量名，极脆弱 |
| 3 | 前端无源码 | 所有代码在压缩 JS 中，无法正常开发迭代 |
| 4 | 前后端密码策略不一致 | 后端要求8位+大小写+数字，前端只校验4位 |
| 5 | 字段命名混乱 | 前端 `date` ↔ 后端 `review_date`，前端 `summary` ↔ 后端 `title` |
| 6 | Token 刷新未实现 | access token 1小时过期后用户被静默踢出 |
| 7 | 数据合并逻辑简单 | 按ID+updatedAt合并，无冲突解决，同日多条记录支持不完整 |
| 8 | 数据库迁移嵌入业务代码 | INSERT 失败时自动触发迁移，不应在运行时反复触发 |

---

## 2. 架构决策

### 2.1 已确认的决策

| 决策项 | 选择 | 理由 |
|--------|------|------|
| 前端部署 | Cloudflare Pages（纯静态 SPA） | 零运行时成本，Vite 官方预设 |
| API 部署 | 保持独立 Workers | 零改造，CORS 已有 |
| 前端框架 | React + Vite | 延续现有技术栈，迁移成本最低 |
| UI 组件 | shadcn/ui | 可控、无运行时依赖、Tailwind 原生 |
| 项目结构 | 新建 `review-system-app/` | 保留旧 `review-system/` 作为备份，零风险 |

### 2.2 部署架构

```
review-system-app/        → Cloudflare Pages (纯静态)
  src/                    → React + Vite + TypeScript 源码
  dist/                   → 构建产物 (Pages 部署)

api/                      → Cloudflare Workers (独立部署，不变)
  src/index.js

review-system/            → 旧版打包产物 (保留备份，上线后可清理)
```

---

## 3. 项目结构

```
review-system-app/
├── src/
│   ├── main.tsx                  # 入口
│   ├── App.tsx                   # 根组件
│   ├── api/                      # API 客户端层
│   │   ├── client.ts             # fetch 封装 + token 管理 + 自动刷新
│   │   ├── auth.ts               # 认证 API (login/register/refresh/me)
│   │   ├── reviews.ts            # 复盘 API (CRUD + sync)
│   │   └── config.ts             # 配置 API
│   ├── stores/
│   │   ├── auth.ts               # 认证 store (唯一真相源)
│   │   ├── reviews.ts            # 复盘数据 store
│   │   └── settings.ts           # 设置 store (主题/提醒/维度配置)
│   ├── components/
│   │   ├── ui/                   # shadcn/ui 组件
│   │   ├── layout/               # Navbar, TabBar
│   │   ├── auth/                 # AuthModal, LoginForm, RegisterForm, UserMenu, LoginPrompt
│   │   ├── review/               # DimensionGrid, DimensionCard, HealthInput, FreeTextInput, SummarySection, ActionBar
│   │   ├── history/              # DateFilter, SearchBar, RecordList, RecordItem
│   │   └── report/               # TrendChart, DimensionStats
│   ├── hooks/                    # 自定义 hooks
│   ├── lib/
│   │   ├── storage.ts            # localStorage 管理 (配额/清理/迁移)
│   │   ├── dimensions.ts         # 维度配置
│   │   ├── validation.ts         # 密码等校验
│   │   └── utils.ts              # 通用工具
│   └── types/
│       ├── review.ts             # Review, ReviewContent 类型
│       └── auth.ts               # Auth 相关类型
├── public/
│   ├── favicon.svg
│   └── _redirects                # SPA 路由回退
├── index.html                    # 最小骨架 (无内联脚本)
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json               # shadcn/ui 配置
├── .env.local                    # 本地开发环境变量
└── package.json
```

---

## 4. API 客户端层

### 4.1 核心 fetch 封装

```typescript
// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.zhihr.vip'

interface ApiRequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  skipRefresh?: boolean
}

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, skipRefresh = false } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = useAuthStore.getState().token
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return apiRequest(endpoint, options)
    useAuthStore.getState().logout()
    throw new AuthError('登录已过期，请重新登录')
  }

  const data = await response.json()
  if (!data.success) throw new ApiError(data.message || '请求失败', response.status)
  return data
}
```

### 4.2 Token 自动刷新

```typescript
let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const { refreshToken } = useAuthStore.getState()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (!data.success) return false

      useAuthStore.getState().setTokens(data.data.token, data.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}
```

### 4.3 字段映射层

前端统一使用语义化字段，API 层负责与后端字段名的双向转换：

```typescript
// src/api/reviews.ts
interface Review {
  id: string
  date: string
  title: string
  content: Record<string, string>
  summary: string
  createdAt: string
  updatedAt: string
}

function toApiPayload(review: Partial<Review>) {
  return {
    ...review,
    review_date: review.date,
    title: review.summary || review.date,
  }
}

function fromApiResponse(data: any): Review {
  return {
    id: data.id,
    date: data.review_date || data.date,
    title: data.title,
    content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
    summary: data.title || '',
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}
```

### 4.4 错误类

```typescript
export class ApiError extends Error {
  constructor(public message: string, public status?: number) { super(message) }
}
export class AuthError extends ApiError {
  constructor(message = '登录已过期') { super(message, 401) }
}
export class NetworkError extends ApiError {
  constructor() { super('网络连接失败，请检查网络', 0) }
}
```

---

## 5. 认证系统

### 5.1 渐进式登录（替代强制登录）

```
未登录 → 可正常使用（数据存 localStorage）
         ↓ 用户点击保存时
         → 弹出登录引导（非强制，可跳过）
         ↓ 用户选择登录
         → 登录成功 → 自动同步本地数据到云端
         ↓ 用户选择跳过
         → 数据仅存本地，下次仍可继续
```

### 5.2 Auth Store（唯一真相源）

```typescript
// src/stores/auth.ts
interface AuthState {
  userId: string | null
  username: string | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isAuthModalOpen: boolean
  authModalTab: 'login' | 'register'

  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  loadFromStorage: () => void
  openAuthModal: (tab?: 'login' | 'register') => void
  closeAuthModal: () => void
  setTokens: (token: string, refreshToken: string) => void
}
```

localStorage 键名统一：

```typescript
const KEYS = {
  TOKEN: 'zhihr_access_token',
  REFRESH_TOKEN: 'zhihr_refresh_token',
  USER_ID: 'zhihr_user_id',
  USERNAME: 'zhihr_username',
}
```

### 5.3 登录成功后的自动同步

```typescript
async login(username, password) {
  const result = await authApi.login(username, password)

  set({
    userId: result.data.userId,
    username: result.data.username,
    token: result.data.token,
    refreshToken: result.data.refreshToken,
    isAuthenticated: true,
    isAuthModalOpen: false,
  })
  persistAuth(result.data)

  await useSettingsStore.getState().loadFromCloud()

  const localReviews = loadFromLocalStorage()
  if (localReviews && localReviews.length > 0) {
    await useReviewsStore.getState().syncLocalToCloud()
  }

  await useReviewsStore.getState().loadFromCloud()
}
```

### 5.4 退出登录

```typescript
logout() {
  set({ userId: null, username: null, token: null, refreshToken: null, isAuthenticated: false })
  clearAuthStorage()
  // 不清除本地复盘数据，退出后仍可离线使用
  useReviewsStore.getState().loadFromLocalStorage()
}
```

### 5.5 密码校验与后端对齐

```typescript
// src/lib/validation.ts
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码至少8位'
  if (password.length > 128) return '密码不能超过128位'
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母'
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母'
  if (!/[0-9]/.test(password)) return '密码必须包含数字'
  return null
}
```

### 5.6 index.html 精简

旧版 index.html 包含 ~700 行内联脚本。新版仅保留最小骨架：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>复盘系统 - 知HR工具集</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

彻底消除：`window.__zhihrAuth`、`patchKcStore()`、`window.__KcStore__`、`zhihr-login-success` 事件。

---

## 6. 数据存储与同步

### 6.1 三层存储架构

```
组件层 (React)
    ↕ 读写
Store 层 (Zustand) ← 唯一数据入口
    ↕ 双写/双读
┌──────────────┬──────────────────┐
│  localStorage │  Cloud API       │
│  (离线缓存)    │  (云端持久化)     │
└──────────────┴──────────────────┘
```

核心原则：
- Store 是唯一数据入口，组件只和 Store 交互
- localStorage 始终作为缓存写入（离线可用）
- 登录时从云端拉取并合并，写操作同时写本地+云端
- 不再 monkey-patch 任何 store 方法

### 6.2 Reviews Store

```typescript
// src/stores/reviews.ts
interface ReviewsState {
  reviews: Review[]
  isLoading: boolean

  getRecordByDate: (date: string) => Review | undefined
  getRecordsInRange: (start: string, end: string) => Review[]

  saveRecord: (date: string, content: ReviewContent, summary: string) => Promise<void>
  deleteRecord: (id: string) => Promise<void>

  loadFromCloud: () => Promise<void>
  syncLocalToCloud: () => Promise<void>
  loadFromLocalStorage: () => void
}
```

### 6.3 保存逻辑（乐观更新 + 异步云端）

```typescript
async saveRecord(date, content, summary) {
  const { isAuthenticated } = useAuthStore.getState()
  const now = new Date().toISOString()

  // 1. 乐观更新：立即更新 store + localStorage
  const existing = get().reviews.find(r => r.date === date)
  let updated: Review

  if (existing) {
    updated = { ...existing, content, summary, updatedAt: now }
    set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
  } else {
    updated = { id: crypto.randomUUID(), date, content, summary, createdAt: now, updatedAt: now }
    set({ reviews: [updated, ...get().reviews] })
  }
  saveToLocalStorage(get().reviews)

  // 2. 已登录 → 异步写云端
  if (isAuthenticated) {
    try {
      if (existing) {
        await apiRequest(`/api/reviews/${existing.id}`, {
          method: 'PUT', body: { date, content, summary },
        })
      } else {
        const result = await apiRequest('/api/reviews', {
          method: 'POST', body: { id: updated.id, date, content, summary },
        })
        if (result.data?.id !== updated.id) {
          set({ reviews: get().reviews.map(r =>
            r.id === updated.id ? { ...r, id: result.data.id } : r
          )})
        }
      }
    } catch (err) {
      console.warn('云端保存失败，数据已本地缓存:', err)
    }
  }
}
```

### 6.4 数据合并策略

```typescript
function mergeReviews(local: Review[], cloud: Review[]): Review[] {
  const map = new Map<string, Review>()

  local.forEach(r => map.set(r.id, r))

  cloud.forEach(cr => {
    const existing = map.get(cr.id)
    if (!existing) {
      map.set(cr.id, cr)
    } else {
      const localIsNewer = new Date(existing.updatedAt) > new Date(cr.updatedAt)
      if (!localIsNewer) map.set(cr.id, cr)
    }
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
```

### 6.5 localStorage 管理

```typescript
// src/lib/storage.ts
const STORAGE_KEY = 'reviewData'
const MAX_SIZE = 4 * 1024 * 1024
const MAX_RECORDS = 500

export function saveToLocalStorage(reviews: Review[]): void {
  try {
    const cleaned = reviews.filter(r => r && r.date).slice(0, MAX_RECORDS)
    const json = JSON.stringify(cleaned)

    if (json.length * 2 > MAX_SIZE) {
      const cutoff = daysAgo(30)
      const recent = cleaned.filter(r => r.date >= cutoff)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch (e) {
    if (e.name === 'QuotaExceededError') emergencyClean()
  }
}

export function loadFromLocalStorage(): Review[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    return JSON.parse(data)
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}
```

### 6.6 旧数据兼容迁移

```typescript
export function migrateLegacyData(): Review[] | null {
  const data = loadFromLocalStorage()
  if (!data) return null

  return data.map(r => ({
    ...r,
    summary: r.summary || r.title || '',
    content: typeof r.content === 'string' ? JSON.parse(r.content) : r.content,
  }))
}
```

---

## 7. 组件架构

### 7.1 组件树

```
App
├── AuthProvider
│   ├── Navbar
│   │   ├── Logo
│   │   ├── UserMenu / LoginButton
│   │   ├── SyncButton
│   │   └── ThemeToggle
│   ├── AuthModal
│   │   ├── LoginForm
│   │   └── RegisterForm
│   ├── MainContent
│   │   ├── TabBar (记录/历史/报告)
│   │   ├── RecordTab
│   │   │   ├── DimensionGrid
│   │   │   │   └── DimensionCard × 8
│   │   │   │       ├── HealthInput (结构化)
│   │   │   │       └── FreeTextInput (自由文本)
│   │   │   ├── SummarySection
│   │   │   └── ActionBar
│   │   ├── HistoryTab
│   │   │   ├── DateFilter
│   │   │   ├── SearchBar
│   │   │   └── RecordList → RecordItem
│   │   └── ReportTab
│   │       ├── TrendChart
│   │       └── DimensionStats
│   └── LoginPrompt
```

### 7.2 shadcn/ui 组件清单

| 组件 | 用途 |
|------|------|
| Dialog | 登录/注册 Modal、确认删除 |
| Tabs | 记录/历史/报告 Tab |
| Input | 表单输入 |
| Textarea | 维度文本、总结 |
| Button | 所有按钮 |
| DropdownMenu | 用户菜单 |
| Sonner (Toast) | 操作反馈 |
| Calendar | 日期选择 |
| Card | 维度卡片 |
| Collapsible | 维度折叠 |
| Badge | 标签、状态 |
| AlertDialog | 危险操作确认 |
| Tooltip | 图标提示 |
| Separator | 分隔线 |

### 7.3 维度配置化

```typescript
// src/lib/dimensions.ts
export interface DimensionConfig {
  key: string
  name: string
  icon: string
  color: string
  type: 'structured' | 'freeform'
  placeholder?: string
  structuredItems?: { label: string; placeholder: string }[]
}

export const DEFAULT_DIMENSIONS: DimensionConfig[] = [
  {
    key: 'health', name: '健康', icon: 'HeartPulse', color: 'emerald',
    type: 'structured',
    structuredItems: [
      { label: '睡眠', placeholder: 'XX小时' },
      { label: '饮食', placeholder: '是否有坚持16+8饮食' },
    ],
  },
  {
    key: 'work', name: '工作', icon: 'Briefcase', color: 'blue',
    type: 'freeform', placeholder: '记录今天的工作...',
  },
  // ... 其余6个维度
]
```

---

## 8. 错误处理

### 8.1 错误分类与处理

| 类型 | 处理方式 | 示例 |
|------|----------|------|
| 网络错误 | Toast + 本地降级 | API 不可达 |
| 认证错误 | 自动刷新 token → 失败跳转登录 | 401 |
| 业务错误 | Toast 具体信息 | "复盘不存在" |
| 数据损坏 | 清除损坏数据 + 重新加载 | localStorage JSON 解析失败 |
| 配额超限 | 自动清理旧数据 + Toast 警告 | localStorage 满 |

### 8.2 全局错误边界

React ErrorBoundary 捕获渲染错误，显示友好提示，替代旧版 `window.onerror` 红色横条。

---

## 9. Cloudflare Pages 部署

### 9.1 构建配置

| 配置项 | 值 |
|--------|-----|
| 构建命令 | `npm run build` |
| 输出目录 | `dist` |
| 根目录 | `review-system-app` |
| Node 版本 | `18` |
| 环境变量 | `VITE_API_BASE_URL=https://api.zhihr.vip` |

### 9.2 SPA 路由回退

`public/_redirects`:
```
/*  /index.html  200
```

### 9.3 环境变量

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.zhihr.vip'
```

开发时 `.env.local`:
```
VITE_API_BASE_URL=http://localhost:8787
```

---

## 10. 技术选型总结

| 类别 | 选型 | 版本 | 理由 |
|------|------|------|------|
| 语言 | TypeScript | 5.x | 类型安全，消除字段映射错误 |
| 框架 | React | 18/19 | 延续现有技术栈 |
| 构建 | Vite | 6.x | Pages 官方预设，HMR 极快 |
| 状态管理 | Zustand | 5.x | 延续现有，轻量 |
| UI 组件 | shadcn/ui | latest | 可控、无运行时依赖、Tailwind 原生 |
| 样式 | Tailwind CSS | 4.x | 延续现有，与 shadcn/ui 深度集成 |
| 图标 | lucide-react | latest | 延续现有 |
| HTTP | 原生 fetch | - | 无需额外依赖，Workers 环境兼容 |
| 包管理 | pnpm | 9.x | 快速、节省磁盘 |
| 部署 | Cloudflare Pages | - | 纯静态 SPA，零运行时成本 |
| API | Cloudflare Workers | - | 独立部署，保持不变 |

---

## 11. 迁移策略

1. **创建 `review-system-app/`**：Vite + React + TypeScript 项目
2. **搭建 API 客户端层**：client.ts + auth.ts + reviews.ts + config.ts
3. **实现 Auth Store**：唯一真相源，替代双重实现
4. **实现 Reviews Store**：乐观更新 + 云端同步，替代 monkey-patch
5. **迁移组件**：逐个从打包代码还原为源码组件
6. **部署验证**：Pages 部署新项目，旧 `review-system/` 保留备份
7. **切换上线**：确认新版本稳定后，Pages 项目指向新构建
8. **清理**：可选删除旧 `review-system/` 或重命名

---

**设计文档版本:** 1.0
**最后更新:** 2026-05-23
