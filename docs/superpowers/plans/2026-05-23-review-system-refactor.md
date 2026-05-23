# Review System 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 review-system 从打包压缩代码重构为基于 Vite + React + TypeScript 的源码项目，部署到 Cloudflare Pages。

**Architecture:** 前端 SPA 部署到 Cloudflare Pages，API 保持独立 Workers 部署。前端通过 API 客户端层统一认证、字段映射和错误处理，Zustand store 作为唯一数据入口，localStorage 始终作为离线缓存。

**Tech Stack:** React 18, TypeScript, Vite 6, Zustand 5, shadcn/ui, Tailwind CSS 4, lucide-react, pnpm

---

## 文件结构

### 需要创建的文件

```
review-system-app/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── reviews.ts
│   │   └── config.ts
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── reviews.ts
│   │   └── settings.ts
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件 (自动生成)
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── TabBar.tsx
│   │   ├── auth/
│   │   │   ├── AuthModal.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── UserMenu.tsx
│   │   │   └── LoginPrompt.tsx
│   │   ├── review/
│   │   │   ├── DimensionGrid.tsx
│   │   │   ├── DimensionCard.tsx
│   │   │   ├── HealthInput.tsx
│   │   │   ├── FreeTextInput.tsx
│   │   │   ├── SummarySection.tsx
│   │   │   └── ActionBar.tsx
│   │   ├── history/
│   │   │   ├── HistoryTab.tsx
│   │   │   ├── RecordItem.tsx
│   │   │   └── DateFilter.tsx
│   │   └── report/
│   │       └── ReportTab.tsx
│   ├── hooks/
│   │   └── useReview.ts
│   ├── lib/
│   │   ├── storage.ts
│   │   ├── dimensions.ts
│   │   ├── validation.ts
│   │   └── utils.ts
│   └── types/
│       ├── review.ts
│       └── auth.ts
├── public/
│   ├── favicon.svg
│   └── _redirects
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── components.json
├── postcss.config.js
├── .env.local
└── package.json
```

### 文件职责

- `api/client.ts` — fetch 封装、token 自动刷新、错误分类
- `api/auth.ts` — 登录/注册/刷新/me API 调用
- `api/reviews.ts` — 复盘 CRUD + sync API，字段映射
- `api/config.ts` — 用户配置 API
- `stores/auth.ts` — 认证状态唯一真相源
- `stores/reviews.ts` — 复盘数据，乐观更新 + 云端同步
- `stores/settings.ts` — 主题/提醒/维度配置
- `lib/storage.ts` — localStorage 管理（配额/清理/迁移）
- `lib/dimensions.ts` — 维度配置定义
- `lib/validation.ts` — 密码校验等
- `lib/utils.ts` — cn() 等 shadcn/ui 工具

---

## Task 1: 初始化 Vite + React + TypeScript 项目

**Files:**
- Create: `review-system-app/package.json`
- Create: `review-system-app/vite.config.ts`
- Create: `review-system-app/tsconfig.json`
- Create: `review-system-app/tsconfig.app.json`
- Create: `review-system-app/tsconfig.node.json`
- Create: `review-system-app/index.html`
- Create: `review-system-app/src/main.tsx`
- Create: `review-system-app/src/App.tsx`
- Create: `review-system-app/src/index.css`
- Create: `review-system-app/public/favicon.svg`
- Create: `review-system-app/public/_redirects`
- Create: `review-system-app/.env.local`

- [ ] **Step 1: 创建项目目录**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
mkdir -p review-system-app/src review-system-app/public
```

- [ ] **Step 2: 初始化 package.json**

```bash
cd review-system-app && pnpm init
```

- [ ] **Step 3: 安装核心依赖**

```bash
pnpm add react react-dom zustand lucide-react
pnpm add -D typescript @types/react @types/react-dom vite @vitejs/plugin-react tailwindcss @tailwindcss/vite postcss autoprefixer
```

- [ ] **Step 4: 创建 vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: 创建 tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 6: 创建 tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 7: 创建 tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 8: 创建 index.html**

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

- [ ] **Step 9: 创建 src/index.css**

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0.085 265.754);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0.085 265.754);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0.085 265.754);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0.165 254.624);
  --radius: 0.625rem;
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0.085 265.754);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0.085 265.754);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0.165 254.624);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0.085 265.754);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0.088 265.547);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar-background: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0.088 265.547);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar-background: var(--sidebar-background);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
}
```

- [ ] **Step 10: 创建 src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 11: 创建 src/App.tsx (占位)**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <h1 className="text-2xl font-bold text-foreground">复盘系统 - 重构中</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 12: 创建 public/favicon.svg**

从旧项目复制：

```bash
cp "../review-system/favicon.svg" "public/favicon.svg"
```

- [ ] **Step 13: 创建 public/_redirects**

```
/*  /index.html  200
```

- [ ] **Step 14: 创建 .env.local**

```
VITE_API_BASE_URL=http://localhost:8787
```

- [ ] **Step 15: 更新 package.json scripts**

确保 package.json 的 scripts 字段为：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 16: 验证项目启动**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr/review-system-app"
pnpm dev
```

预期：浏览器打开后显示"复盘系统 - 重构中"。

- [ ] **Step 17: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/
git commit -m "feat: initialize review-system-app with Vite + React + TypeScript"
```

---

## Task 2: 安装和配置 shadcn/ui

**Files:**
- Create: `review-system-app/components.json`
- Create: `review-system-app/src/lib/utils.ts`

- [ ] **Step 1: 创建 components.json**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: 创建 src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: 安装 shadcn/ui 依赖**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr/review-system-app"
pnpm add clsx tailwind-merge class-variance-authority
```

- [ ] **Step 4: 添加需要的 shadcn/ui 组件**

```bash
npx shadcn@latest add dialog tabs input textarea button dropdown-menu sonner calendar card collapsible badge alert-dialog tooltip separator
```

- [ ] **Step 5: 验证组件可用**

在 App.tsx 中临时引入 Button 测试：

```tsx
import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center gap-4">
      <Button>测试按钮</Button>
    </div>
  )
}
```

运行 `pnpm dev` 确认按钮正常渲染。

- [ ] **Step 6: 还原 App.tsx 为占位**

```tsx
function App() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <h1 className="text-2xl font-bold text-foreground">复盘系统 - 重构中</h1>
    </div>
  )
}

export default App
```

- [ ] **Step 7: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/
git commit -m "feat: configure shadcn/ui and add base components"
```

---

## Task 3: 创建 TypeScript 类型定义

**Files:**
- Create: `review-system-app/src/types/review.ts`
- Create: `review-system-app/src/types/auth.ts`

- [ ] **Step 1: 创建 src/types/review.ts**

```typescript
export interface ReviewContent {
  health: string
  work: string
  study: string
  social: string
  finance: string
  life: string
  spirit: string
  leisure: string
}

export interface Review {
  id: string
  date: string
  title: string
  content: ReviewContent
  summary: string
  createdAt: string
  updatedAt: string
}

export interface ReviewApiResponse {
  id: string
  date: string
  title: string
  content: ReviewContent | null
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 2: 创建 src/types/auth.ts**

```typescript
export interface AuthUser {
  userId: string
  username: string
  token: string
  refreshToken: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  message: string
  data: AuthUser
}
```

- [ ] **Step 3: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/types/
git commit -m "feat: add TypeScript type definitions for review and auth"
```

---

## Task 4: 创建 API 客户端层

**Files:**
- Create: `review-system-app/src/api/client.ts`
- Create: `review-system-app/src/api/auth.ts`
- Create: `review-system-app/src/api/reviews.ts`
- Create: `review-system-app/src/api/config.ts`

- [ ] **Step 1: 创建 src/api/client.ts**

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.zhihr.vip'

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.status = status
  }
}

export class AuthError extends ApiError {
  constructor(message = '登录已过期，请重新登录') {
    super(message, 401)
  }
}

export class NetworkError extends ApiError {
  constructor() {
    super('网络连接失败，请检查网络', 0)
  }
}

interface ApiRequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  skipRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('zhihr_refresh_token')
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      const data = await res.json()
      if (!data.success) return false

      localStorage.setItem('zhihr_access_token', data.data.token)
      localStorage.setItem('zhihr_refresh_token', data.data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, skipRefresh = false } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = localStorage.getItem('zhihr_access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new NetworkError()
  }

  if (response.status === 401 && auth && !skipRefresh) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return apiRequest<T>(endpoint, { ...options, skipRefresh: true })
    clearAuthStorage()
    throw new AuthError()
  }

  const data = await response.json()
  if (!data.success) throw new ApiError(data.message || '请求失败', response.status)
  return data as T
}

export function clearAuthStorage() {
  localStorage.removeItem('zhihr_access_token')
  localStorage.removeItem('zhihr_refresh_token')
  localStorage.removeItem('zhihr_user_id')
  localStorage.removeItem('zhihr_username')
}
```

- [ ] **Step 2: 创建 src/api/auth.ts**

```typescript
import { apiRequest } from './client'
import type { AuthResponse } from '@/types/auth'

export async function login(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { username, password },
    auth: false,
  })
}

export async function getMe(): Promise<{ success: boolean; data: { userId: string; username: string } }> {
  return apiRequest('/api/auth/me')
}
```

- [ ] **Step 3: 创建 src/api/reviews.ts**

```typescript
import { apiRequest } from './client'
import type { Review, ReviewContent } from '@/types/review'

interface GetReviewsParams {
  page?: number
  pageSize?: number
  startDate?: string
  endDate?: string
}

interface ReviewsListResponse {
  success: boolean
  data: Review[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
}

interface ReviewResponse {
  success: boolean
  message: string
  data: Review
}

function toApiPayload(review: Partial<Review>) {
  return {
    id: review.id,
    review_date: review.date,
    title: review.summary || review.date,
    content: review.content,
  }
}

function fromApiResponse(data: Record<string, unknown>): Review {
  return {
    id: data.id as string,
    date: (data.review_date || data.date) as string,
    title: (data.title || '') as string,
    content: typeof data.content === 'string'
      ? JSON.parse(data.content)
      : (data.content as ReviewContent) || {} as ReviewContent,
    summary: (data.title || '') as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  }
}

export async function getReviews(params?: GetReviewsParams): Promise<ReviewsListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)

  const query = searchParams.toString()
  const endpoint = `/api/reviews${query ? `?${query}` : ''}`

  const raw = await apiRequest<{ success: boolean; data: Record<string, unknown>[]; pagination: ReviewsListResponse['pagination'] }>(endpoint)
  return {
    ...raw,
    data: raw.data.map(fromApiResponse),
  }
}

export async function createReview(review: Partial<Review>): Promise<ReviewResponse> {
  const raw = await apiRequest<ReviewResponse>('/api/reviews', {
    method: 'POST',
    body: toApiPayload(review),
  })
  return { ...raw, data: fromApiResponse(raw.data as unknown as Record<string, unknown>) }
}

export async function updateReview(id: string, review: Partial<Review>): Promise<ReviewResponse> {
  const raw = await apiRequest<ReviewResponse>(`/api/reviews/${id}`, {
    method: 'PUT',
    body: toApiPayload(review),
  })
  return { ...raw, data: fromApiResponse(raw.data as unknown as Record<string, unknown>) }
}

export async function deleteReview(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/api/reviews/${id}`, { method: 'DELETE' })
}

export async function syncReviews(reviews: Review[]): Promise<ReviewsListResponse> {
  const raw = await apiRequest<{ success: boolean; data: Record<string, unknown>[]; synced: number }>('/api/reviews/sync', {
    method: 'POST',
    body: { reviews: reviews.map(r => toApiPayload(r)) },
  })
  return {
    success: raw.success,
    data: raw.data.map(fromApiResponse),
    pagination: { page: 1, pageSize: raw.data.length, total: raw.data.length, totalPages: 1 },
  }
}
```

- [ ] **Step 4: 创建 src/api/config.ts**

```typescript
import { apiRequest } from './client'

interface ConfigResponse {
  success: boolean
  data: { config: string | null }
}

export async function getConfig(): Promise<ConfigResponse> {
  return apiRequest('/api/config')
}

export async function updateConfig(config: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
  return apiRequest('/api/config', {
    method: 'PUT',
    body: { config },
  })
}
```

- [ ] **Step 5: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/api/ review-system-app/src/types/
git commit -m "feat: add API client layer with token refresh and field mapping"
```

---

## Task 5: 创建工具库

**Files:**
- Create: `review-system-app/src/lib/storage.ts`
- Create: `review-system-app/src/lib/dimensions.ts`
- Create: `review-system-app/src/lib/validation.ts`

- [ ] **Step 1: 创建 src/lib/storage.ts**

```typescript
import type { Review, ReviewContent } from '@/types/review'

const STORAGE_KEY = 'reviewData'
const MAX_SIZE = 4 * 1024 * 1024
const MAX_RECORDS = 500

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

function validateReviews(data: unknown): Review[] {
  if (!Array.isArray(data)) return []
  return data
    .filter((item): item is Review =>
      item != null && typeof item === 'object' && typeof item.date === 'string' && item.date.length > 0
    )
    .slice(0, MAX_RECORDS)
}

export function saveToLocalStorage(reviews: Review[]): void {
  try {
    const cleaned = validateReviews(reviews)
    const json = JSON.stringify(cleaned)

    if (json.length * 2 > MAX_SIZE) {
      const cutoff = daysAgo(30)
      const recent = cleaned.filter(r => r.date >= cutoff)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } else {
      localStorage.setItem(STORAGE_KEY, json)
    }
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      emergencyClean()
    }
  }
}

function emergencyClean(): void {
  try {
    const data = loadFromLocalStorage()
    if (!data) return
    const cutoff = daysAgo(7)
    const recent = data.filter(r => r.date >= cutoff)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
  } catch {
    // 无法恢复
  }
}

export function loadFromLocalStorage(): Review[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null
    const parsed = JSON.parse(data)
    return validateReviews(parsed)
  } catch {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    return null
  }
}

export function migrateLegacyData(): Review[] | null {
  const data = loadFromLocalStorage()
  if (!data) return null

  return data.map(r => ({
    ...r,
    summary: r.summary || r.title || '',
    content: (typeof r.content === 'string'
      ? (() => { try { return JSON.parse(r.content) } catch { return {} } })()
      : r.content) as ReviewContent,
  }))
}
```

- [ ] **Step 2: 创建 src/lib/dimensions.ts**

```typescript
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
    key: 'health',
    name: '健康',
    icon: 'HeartPulse',
    color: 'emerald',
    type: 'structured',
    structuredItems: [
      { label: '睡眠', placeholder: 'XX小时' },
      { label: '饮食', placeholder: '是否有坚持16+8饮食' },
    ],
  },
  {
    key: 'work',
    name: '工作',
    icon: 'Briefcase',
    color: 'blue',
    type: 'freeform',
    placeholder: '记录今天的工作...',
  },
  {
    key: 'study',
    name: '学习',
    icon: 'BookOpen',
    color: 'amber',
    type: 'freeform',
    placeholder: '记录今天的学习...',
  },
  {
    key: 'social',
    name: '社交',
    icon: 'Users',
    color: 'violet',
    type: 'freeform',
    placeholder: '记录今天的社交...',
  },
  {
    key: 'finance',
    name: '财务',
    icon: 'Wallet',
    color: 'pink',
    type: 'freeform',
    placeholder: '记录今天的财务...',
  },
  {
    key: 'life',
    name: '生活',
    icon: 'Home',
    color: 'cyan',
    type: 'freeform',
    placeholder: '记录今天的生活...',
  },
  {
    key: 'spirit',
    name: '精神',
    icon: 'Brain',
    color: 'indigo',
    type: 'freeform',
    placeholder: '记录今天的精神状态...',
  },
  {
    key: 'leisure',
    name: '休闲',
    icon: 'Coffee',
    color: 'rose',
    type: 'freeform',
    placeholder: '记录今天的休闲...',
  },
]

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}
```

- [ ] **Step 3: 创建 src/lib/validation.ts**

```typescript
export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return '密码至少8位'
  if (password.length > 128) return '密码不能超过128位'
  if (!/[a-z]/.test(password)) return '密码必须包含小写字母'
  if (!/[A-Z]/.test(password)) return '密码必须包含大写字母'
  if (!/[0-9]/.test(password)) return '密码必须包含数字'
  return null
}

export function validateUsername(username: string): string | null {
  if (!username || username.length < 3) return '账号至少3个字符'
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) return '账号只能包含字母、数字、下划线和中文'
  return null
}
```

- [ ] **Step 4: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/lib/
git commit -m "feat: add utility libraries for storage, dimensions, and validation"
```

---

## Task 6: 创建 Zustand Stores

**Files:**
- Create: `review-system-app/src/stores/auth.ts`
- Create: `review-system-app/src/stores/reviews.ts`
- Create: `review-system-app/src/stores/settings.ts`

- [ ] **Step 1: 创建 src/stores/auth.ts**

```typescript
import { create } from 'zustand'
import * as authApi from '@/api/auth'
import { clearAuthStorage } from '@/api/client'
import { loadFromLocalStorage, saveToLocalStorage } from '@/lib/storage'

const KEYS = {
  TOKEN: 'zhihr_access_token',
  REFRESH_TOKEN: 'zhihr_refresh_token',
  USER_ID: 'zhihr_user_id',
  USERNAME: 'zhihr_username',
} as const

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

function persistAuth(data: { userId: string; username: string; token: string; refreshToken: string }) {
  localStorage.setItem(KEYS.TOKEN, data.token)
  localStorage.setItem(KEYS.REFRESH_TOKEN, data.refreshToken)
  localStorage.setItem(KEYS.USER_ID, data.userId)
  localStorage.setItem(KEYS.USERNAME, data.username)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: null,
  username: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isAuthModalOpen: false,
  authModalTab: 'login',

  login: async (username, password) => {
    const result = await authApi.login(username, password)
    const { userId, username: name, token, refreshToken } = result.data

    set({
      userId,
      username: name,
      token,
      refreshToken,
      isAuthenticated: true,
      isAuthModalOpen: false,
    })
    persistAuth({ userId, username: name, token, refreshToken })

    const localReviews = loadFromLocalStorage()
    if (localReviews && localReviews.length > 0) {
      const { syncLocalToCloud } = await import('./reviews')
      await syncLocalToCloud()
    }

    const { loadFromCloud } = await import('./reviews')
    await loadFromCloud()
  },

  register: async (username, password) => {
    const result = await authApi.register(username, password)
    const { userId, username: name, token, refreshToken } = result.data

    set({
      userId,
      username: name,
      token,
      refreshToken,
      isAuthenticated: true,
      isAuthModalOpen: false,
    })
    persistAuth({ userId, username: name, token, refreshToken })

    const localReviews = loadFromLocalStorage()
    if (localReviews && localReviews.length > 0) {
      const { syncLocalToCloud } = await import('./reviews')
      await syncLocalToCloud()
    }

    const { loadFromCloud } = await import('./reviews')
    await loadFromCloud()
  },

  logout: () => {
    set({
      userId: null,
      username: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
    })
    clearAuthStorage()
  },

  loadFromStorage: () => {
    const token = localStorage.getItem(KEYS.TOKEN)
    const refreshToken = localStorage.getItem(KEYS.REFRESH_TOKEN)
    const userId = localStorage.getItem(KEYS.USER_ID)
    const username = localStorage.getItem(KEYS.USERNAME)

    if (token && userId && username) {
      set({ userId, username, token, refreshToken, isAuthenticated: true })
    }
  },

  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),

  setTokens: (token, refreshToken) => {
    set({ token, refreshToken })
    localStorage.setItem(KEYS.TOKEN, token)
    localStorage.setItem(KEYS.REFRESH_TOKEN, refreshToken)
  },
}))
```

- [ ] **Step 2: 创建 src/stores/reviews.ts**

```typescript
import { create } from 'zustand'
import * as reviewsApi from '@/api/reviews'
import { saveToLocalStorage, loadFromLocalStorage, migrateLegacyData } from '@/lib/storage'
import { getTodayString } from '@/lib/dimensions'
import type { Review, ReviewContent } from '@/types/review'
import { useAuthStore } from './auth'

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

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  reviews: [],
  isLoading: true,

  getRecordByDate: (date) => get().reviews.find(r => r.date === date),
  getRecordsInRange: (start, end) => get().reviews.filter(r => r.date >= start && r.date <= end),

  saveRecord: async (date, content, summary) => {
    const { isAuthenticated } = useAuthStore.getState()
    const now = new Date().toISOString()
    const existing = get().reviews.find(r => r.date === date)
    let updated: Review

    if (existing) {
      updated = { ...existing, content, summary, updatedAt: now }
      set({ reviews: get().reviews.map(r => r.id === existing.id ? updated : r) })
    } else {
      updated = {
        id: crypto.randomUUID(),
        date,
        title: date,
        content,
        summary,
        createdAt: now,
        updatedAt: now,
      }
      set({ reviews: [updated, ...get().reviews] })
    }
    saveToLocalStorage(get().reviews)

    if (isAuthenticated) {
      try {
        if (existing) {
          await reviewsApi.updateReview(existing.id, { date, content, summary })
        } else {
          const result = await reviewsApi.createReview({ id: updated.id, date, content, summary })
          if (result.data?.id && result.data.id !== updated.id) {
            set({ reviews: get().reviews.map(r =>
              r.id === updated.id ? { ...r, id: result.data.id } : r
            )})
          }
        }
      } catch (err) {
        console.warn('云端保存失败，数据已本地缓存:', err)
      }
    }
  },

  deleteRecord: async (id) => {
    set({ reviews: get().reviews.filter(r => r.id !== id) })
    saveToLocalStorage(get().reviews)

    const { isAuthenticated } = useAuthStore.getState()
    if (isAuthenticated) {
      try {
        await reviewsApi.deleteReview(id)
      } catch (err) {
        console.warn('云端删除失败:', err)
      }
    }
  },

  loadFromCloud: async () => {
    set({ isLoading: true })
    try {
      const result = await reviewsApi.getReviews({ pageSize: 100 })
      const cloudReviews = result.data
      const localReviews = get().reviews
      const merged = mergeReviews(localReviews, cloudReviews)

      set({ reviews: merged, isLoading: false })
      saveToLocalStorage(merged)
    } catch {
      set({ isLoading: false })
    }
  },

  syncLocalToCloud: async () => {
    const localReviews = loadFromLocalStorage()
    if (!localReviews || localReviews.length === 0) return

    try {
      const result = await reviewsApi.syncReviews(localReviews)
      set({ reviews: result.data })
      saveToLocalStorage(result.data)
    } catch (err) {
      console.warn('本地数据同步到云端失败:', err)
    }
  },

  loadFromLocalStorage: () => {
    const migrated = migrateLegacyData()
    set({ reviews: migrated || [], isLoading: false })
  },
}))

export { mergeReviews }
```

- [ ] **Step 3: 创建 src/stores/settings.ts**

```typescript
import { create } from 'zustand'
import * as configApi from '@/api/config'
import { useAuthStore } from './auth'

type Theme = 'light' | 'dark' | 'auto'

interface UserConfig {
  theme: Theme
  reminderEnabled: boolean
  reminderTime: string
  dimensionConfigs?: Record<string, unknown>
}

interface SettingsState {
  theme: Theme
  reminderEnabled: boolean
  reminderTime: string

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setReminder: (enabled: boolean, time: string) => void
  loadFromCloud: () => Promise<void>
  loadFromStorage: () => void
}

const CONFIG_KEY = 'zhihr_user_config'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  }
}

function persistConfig(config: UserConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

function loadConfigFromStorage(): Partial<UserConfig> | null {
  try {
    const data = localStorage.getItem(CONFIG_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'auto',
  reminderEnabled: false,
  reminderTime: '21:00',

  setTheme: (theme) => {
    set({ theme })
    applyTheme(theme)
    const config = { theme, reminderEnabled: get().reminderEnabled, reminderTime: get().reminderTime }
    persistConfig(config)

    if (useAuthStore.getState().isAuthenticated) {
      configApi.updateConfig(config).catch(() => {})
    }
  },

  toggleTheme: () => {
    const current = get().theme
    let next: Theme
    if (current === 'light') next = 'dark'
    else if (current === 'dark') next = 'light'
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      next = prefersDark ? 'light' : 'dark'
    }
    get().setTheme(next)
  },

  setReminder: (enabled, time) => {
    set({ reminderEnabled: enabled, reminderTime: time || get().reminderTime })
    const config = { theme: get().theme, reminderEnabled: enabled, reminderTime: time || get().reminderTime }
    persistConfig(config)

    if (useAuthStore.getState().isAuthenticated) {
      configApi.updateConfig(config).catch(() => {})
    }
  },

  loadFromCloud: async () => {
    if (!useAuthStore.getState().isAuthenticated) return
    try {
      const result = await configApi.getConfig()
      if (result.data?.config) {
        const config = typeof result.data.config === 'string'
          ? JSON.parse(result.data.config)
          : result.data.config
        if (config.theme) {
          set({ theme: config.theme, reminderEnabled: config.reminderEnabled ?? false, reminderTime: config.reminderTime ?? '21:00' })
          applyTheme(config.theme)
          persistConfig(config)
        }
      }
    } catch {
      // 云端配置加载失败，使用本地
    }
  },

  loadFromStorage: () => {
    const config = loadConfigFromStorage()
    if (config) {
      set({
        theme: config.theme || 'auto',
        reminderEnabled: config.reminderEnabled ?? false,
        reminderTime: config.reminderTime ?? '21:00',
      })
      applyTheme(config.theme || 'auto')
    }
  },
}))
```

- [ ] **Step 4: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/stores/
git commit -m "feat: add Zustand stores for auth, reviews, and settings"
```

---

## Task 7: 创建认证组件

**Files:**
- Create: `review-system-app/src/components/auth/AuthModal.tsx`
- Create: `review-system-app/src/components/auth/LoginForm.tsx`
- Create: `review-system-app/src/components/auth/RegisterForm.tsx`
- Create: `review-system-app/src/components/auth/UserMenu.tsx`
- Create: `review-system-app/src/components/auth/LoginPrompt.tsx`

- [ ] **Step 1: 创建 src/components/auth/LoginForm.tsx**

```tsx
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { validateUsername } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password) {
      setError('请输入账号和密码')
      return
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      setError(usernameError)
      return
    }

    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">账号</label>
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="输入账号"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">密码</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="输入密码"
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        没有账号？
        <button
          type="button"
          onClick={() => openAuthModal('register')}
          className="text-primary hover:underline ml-1"
        >
          注册新账号
        </button>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: 创建 src/components/auth/RegisterForm.tsx**

```tsx
import { useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { validateUsername, validatePassword } from '@/lib/validation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function RegisterForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore(s => s.register)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username || !password || !confirmPassword) {
      setError('请填写所有字段')
      return
    }

    const usernameError = validateUsername(username)
    if (usernameError) { setError(usernameError); return }

    const passwordError = validatePassword(password)
    if (passwordError) { setError(passwordError); return }

    if (password !== confirmPassword) {
      setError('两次密码不一致')
      return
    }

    setLoading(true)
    try {
      await register(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">账号</label>
        <Input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="设置账号（至少3个字符）"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">密码</label>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="设置密码（至少8位，含大小写字母和数字）"
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">确认密码</label>
        <Input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="再次输入密码"
          autoComplete="new-password"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? '注册中...' : '注册'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        已有账号？
        <button
          type="button"
          onClick={() => openAuthModal('login')}
          className="text-primary hover:underline ml-1"
        >
          登录
        </button>
      </p>
    </form>
  )
}
```

- [ ] **Step 3: 创建 src/components/auth/AuthModal.tsx**

```tsx
import { useAuthStore } from '@/stores/auth'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthModal() {
  const isOpen = useAuthStore(s => s.isAuthModalOpen)
  const tab = useAuthStore(s => s.authModalTab)
  const closeAuthModal = useAuthStore(s => s.closeAuthModal)
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAuthModal() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            知HR · 复盘系统
          </DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => openAuthModal(v as 'login' | 'register')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-4">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register" className="mt-4">
            <RegisterForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: 创建 src/components/auth/UserMenu.tsx**

```tsx
import { useAuthStore } from '@/stores/auth'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, LogOut } from 'lucide-react'

export function UserMenu() {
  const username = useAuthStore(s => s.username)
  const logout = useAuthStore(s => s.logout)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <span className="max-w-[80px] truncate">{username}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: 创建 src/components/auth/LoginPrompt.tsx**

```tsx
import { useAuthStore } from '@/stores/auth'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface LoginPromptProps {
  open: boolean
  onClose: () => void
}

export function LoginPrompt({ open, onClose }: LoginPromptProps) {
  const openAuthModal = useAuthStore(s => s.openAuthModal)

  const handleLogin = () => {
    onClose()
    openAuthModal('login')
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>数据已本地保存</AlertDialogTitle>
          <AlertDialogDescription>
            登录后可将数据同步到云端，在多设备间访问。不登录数据仅保存在本地。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>继续离线使用</AlertDialogCancel>
          <AlertDialogAction onClick={handleLogin}>登录同步</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 6: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/components/auth/
git commit -m "feat: add auth components (AuthModal, LoginForm, RegisterForm, UserMenu, LoginPrompt)"
```

---

## Task 8: 创建布局组件

**Files:**
- Create: `review-system-app/src/components/layout/Navbar.tsx`
- Create: `review-system-app/src/components/layout/TabBar.tsx`

- [ ] **Step 1: 创建 src/components/layout/Navbar.tsx**

```tsx
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Sun, Moon, RefreshCw, LogIn } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const openAuthModal = useAuthStore(s => s.openAuthModal)
  const toggleTheme = useSettingsStore(s => s.toggleTheme)
  const [lastSync, setLastSync] = useState('--')

  const handleSync = async () => {
    const { loadFromCloud } = await import('@/stores/reviews')
    await loadFromCloud()
    setLastSync(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
  }

  return (
    <nav className="h-16 bg-card border-b border-border px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => window.open('https://www.zhihr.vip', '_blank')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <circle cx="12" cy="5" r="1" />
          <path d="m9 20 3-6 3 6" />
          <path d="m6 8 6 2 6-2" />
          <path d="M12 10v4" />
        </svg>
        <div>
          <h1 className="text-lg font-semibold text-foreground">知HR-复盘系统</h1>
          <p className="text-xs text-muted-foreground hidden sm:block">Vibe Coding，为HR制作效率工具</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isAuthenticated && (
          <Button variant="outline" size="sm" onClick={() => openAuthModal('login')} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">登录</span>
          </Button>
        )}
        {isAuthenticated && <UserMenu />}
        <Button variant="ghost" size="icon" onClick={handleSync} title="云端同步">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <span className="text-xs text-muted-foreground hidden sm:block">上次同步: {lastSync}</span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
          <Sun className="h-5 w-5 hidden dark:block" />
          <Moon className="h-5 w-5 block dark:hidden" />
        </Button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: 创建 src/components/layout/TabBar.tsx**

```tsx
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PenLine, History, BarChart2 } from 'lucide-react'

interface TabBarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { key: 'record', label: '记录', icon: PenLine },
  { key: 'history', label: '历史', icon: History },
  { key: 'report', label: '报告', icon: BarChart2 },
]

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="bg-card rounded-lg border border-border shadow-sm mb-6">
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full grid grid-cols-3">
          {tabs.map(tab => (
            <TabsTrigger key={tab.key} value={tab.key} className="gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 3: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/components/layout/
git commit -m "feat: add layout components (Navbar, TabBar)"
```

---

## Task 9: 创建复盘记录组件

**Files:**
- Create: `review-system-app/src/components/review/HealthInput.tsx`
- Create: `review-system-app/src/components/review/FreeTextInput.tsx`
- Create: `review-system-app/src/components/review/DimensionCard.tsx`
- Create: `review-system-app/src/components/review/DimensionGrid.tsx`
- Create: `review-system-app/src/components/review/SummarySection.tsx`
- Create: `review-system-app/src/components/review/ActionBar.tsx`

- [ ] **Step 1: 创建 src/components/review/HealthInput.tsx**

```tsx
import { Input } from '@/components/ui/input'

interface HealthItem {
  label: string
  placeholder: string
  value: string
}

interface HealthInputProps {
  items: HealthItem[]
  onChange: (items: HealthItem[]) => void
}

export function HealthInput({ items, onChange }: HealthInputProps) {
  const handleChange = (index: number, value: string) => {
    const updated = [...items]
    updated[index] = { ...updated[index], value }
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={e => {
              const updated = [...items]
              updated[index] = { ...updated[index], label: e.target.value }
              onChange(updated)
            }}
            className="w-20 text-sm bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
          />
          <span className="text-emerald-500 flex-shrink-0">:</span>
          <Input
            value={item.value}
            onChange={e => handleChange(index, e.target.value)}
            placeholder={item.placeholder}
            className="flex-1 text-sm bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700"
          />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 创建 src/components/review/FreeTextInput.tsx**

```tsx
import { Textarea } from '@/components/ui/textarea'

interface FreeTextInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function FreeTextInput({ value, onChange, placeholder }: FreeTextInputProps) {
  return (
    <Textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      rows={3}
      placeholder={placeholder}
      className="resize-none"
    />
  )
}
```

- [ ] **Step 3: 创建 src/components/review/DimensionCard.tsx**

```tsx
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { HealthInput } from './HealthInput'
import { FreeTextInput } from './FreeTextInput'
import type { DimensionConfig } from '@/lib/dimensions'
import * as LucideIcons from 'lucide-react'

interface HealthItem {
  label: string
  placeholder: string
  value: string
}

interface DimensionCardProps {
  config: DimensionConfig
  value: string
  onChange: (value: string) => void
}

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
  violet: 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800',
  pink: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
  cyan: 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
  rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800',
}

const iconColorMap: Record<string, string> = {
  emerald: '#10B981', blue: '#3B82F6', amber: '#F59E0B', violet: '#8B5CF6',
  pink: '#EC4899', cyan: '#06B6D4', indigo: '#6366F1', rose: '#F43F5E',
}

function getIcon(name: string) {
  return (LucideIcons as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>)[name]
}

export function DimensionCard({ config, value, onChange }: DimensionCardProps) {
  const [collapsed, setCollapsed] = useState(false)
  const Icon = getIcon(config.icon)

  const healthItems: HealthItem[] = config.type === 'structured' && config.structuredItems
    ? (() => {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : config.structuredItems.map(item => ({ ...item, value: '' }))
        } catch {
          return config.structuredItems.map(item => ({ ...item, value: '' }))
        }
      })()
    : []

  const handleHealthChange = (items: HealthItem[]) => {
    onChange(JSON.stringify(items))
  }

  return (
    <Card className={`${colorMap[config.color] || ''} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${iconColorMap[config.color]}20` }}><Icon className="w-5 h-5" style={{ color: iconColorMap[config.color] }} /></div>}
            <CardTitle className="text-base font-semibold">{config.name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {config.type === 'structured' ? (
            <HealthInput items={healthItems} onChange={handleHealthChange} />
          ) : (
            <FreeTextInput value={value} onChange={onChange} placeholder={config.placeholder} />
          )}
        </CardContent>
      )}
    </Card>
  )
}
```

- [ ] **Step 4: 创建 src/components/review/DimensionGrid.tsx**

```tsx
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'
import { DimensionCard } from './DimensionCard'
import type { ReviewContent } from '@/types/review'

interface DimensionGridProps {
  content: ReviewContent
  onContentChange: (content: ReviewContent) => void
}

export function DimensionGrid({ content, onContentChange }: DimensionGridProps) {
  const handleChange = (key: string, value: string) => {
    onContentChange({ ...content, [key]: value })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {DEFAULT_DIMENSIONS.map(dim => (
        <DimensionCard
          key={dim.key}
          config={dim}
          value={content[dim.key] || ''}
          onChange={v => handleChange(dim.key, v)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 创建 src/components/review/SummarySection.tsx**

```tsx
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SummarySectionProps {
  value: string
  onChange: (value: string) => void
}

export function SummarySection({ value, onChange }: SummarySectionProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">今日总结与反思</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={4}
          placeholder="记录今天的收获、不足和改进计划..."
          className="resize-none"
        />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: 创建 src/components/review/ActionBar.tsx**

```tsx
import { Button } from '@/components/ui/button'
import { Save, RotateCcw } from 'lucide-react'

interface ActionBarProps {
  onSave: () => void
  onReset: () => void
  saving?: boolean
}

export function ActionBar({ onSave, onReset, saving }: ActionBarProps) {
  return (
    <div className="flex gap-3 mb-6">
      <Button onClick={onSave} disabled={saving} className="gap-2">
        <Save className="h-4 w-4" />
        {saving ? '保存中...' : '保存'}
      </Button>
      <Button variant="outline" onClick={onReset} className="gap-2">
        <RotateCcw className="h-4 w-4" />
        重置
      </Button>
    </div>
  )
}
```

- [ ] **Step 7: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/components/review/
git commit -m "feat: add review components (DimensionGrid, DimensionCard, HealthInput, FreeTextInput, SummarySection, ActionBar)"
```

---

## Task 10: 创建历史和报告组件

**Files:**
- Create: `review-system-app/src/components/history/HistoryTab.tsx`
- Create: `review-system-app/src/components/history/RecordItem.tsx`
- Create: `review-system-app/src/components/history/DateFilter.tsx`
- Create: `review-system-app/src/components/report/ReportTab.tsx`

- [ ] **Step 1: 创建 src/components/history/DateFilter.tsx**

```tsx
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'

interface DateFilterProps {
  startDate: string
  endDate: string
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string) => void
}

export function DateFilter({ startDate, endDate, onStartDateChange, onEndDateChange }: DateFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} className="pl-10" />
      </div>
      <span className="text-muted-foreground">至</span>
      <div className="relative flex-1">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} className="pl-10" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 src/components/history/RecordItem.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import type { Review } from '@/types/review'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'

interface RecordItemProps {
  record: Review
  onDelete: (id: string) => void
}

export function RecordItem({ record, onDelete }: RecordItemProps) {
  const [expanded, setExpanded] = useState(false)

  const filledDimensions = DEFAULT_DIMENSIONS.filter(dim => {
    const val = record.content?.[dim.key as keyof typeof record.content]
    return val && val.trim().length > 0
  })

  return (
    <Card className="mb-3">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{record.date}</CardTitle>
          <div className="flex items-center gap-2">
            {record.summary && <span className="text-xs text-muted-foreground max-w-[200px] truncate">{record.summary}</span>}
            <span className="text-xs text-muted-foreground">{filledDimensions.length}项</span>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          {filledDimensions.map(dim => (
            <div key={dim.key} className="mb-2">
              <span className="text-xs font-medium text-muted-foreground">{dim.name}：</span>
              <span className="text-sm">{record.content?.[dim.key as keyof typeof record.content]}</span>
            </div>
          ))}
          {record.summary && (
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground">总结：</span>
              <p className="text-sm mt-1">{record.summary}</p>
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => onDelete(record.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
```

- [ ] **Step 3: 创建 src/components/history/HistoryTab.tsx**

```tsx
import { useState, useMemo } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { DateFilter } from './DateFilter'
import { RecordItem } from './RecordItem'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export function HistoryTab() {
  const reviews = useReviewsStore(s => s.reviews)
  const deleteRecord = useReviewsStore(s => s.deleteRecord)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = reviews
    if (startDate) result = result.filter(r => r.date >= startDate)
    if (endDate) result = result.filter(r => r.date <= endDate)
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(r =>
        r.summary?.toLowerCase().includes(term) ||
        r.date.includes(term) ||
        Object.values(r.content || {}).some(v => typeof v === 'string' && v.toLowerCase().includes(term))
      )
    }
    return result
  }, [reviews, startDate, endDate, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索复盘记录..."
            className="pl-10"
          />
        </div>
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无复盘记录</div>
      ) : (
        filtered.map(record => (
          <RecordItem key={record.id} record={record} onDelete={deleteRecord} />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 4: 创建 src/components/report/ReportTab.tsx**

```tsx
import { useReviewsStore } from '@/stores/reviews'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEFAULT_DIMENSIONS } from '@/lib/dimensions'

export function ReportTab() {
  const reviews = useReviewsStore(s => s.reviews)

  const totalReviews = reviews.length
  const dimensionStats = DEFAULT_DIMENSIONS.map(dim => {
    const filled = reviews.filter(r => {
      const val = r.content?.[dim.key as keyof typeof r.content]
      return val && (typeof val === 'string' ? val.trim().length > 0 : true)
    }).length
    return { ...dim, filled, rate: totalReviews > 0 ? Math.round((filled / totalReviews) * 100) : 0 }
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">复盘概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">{totalReviews}</div>
              <div className="text-sm text-muted-foreground">总复盘数</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {reviews.length > 0 ? Math.round(dimensionStats.reduce((sum, d) => sum + d.rate, 0) / dimensionStats.length) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">平均填写率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">维度填写率</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {dimensionStats.map(stat => (
              <div key={stat.key} className="flex items-center gap-3">
                <span className="w-16 text-sm text-muted-foreground">{stat.name}</span>
                <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stat.rate}%`, backgroundColor: `var(--color-chart-${(DEFAULT_DIMENSIONS.indexOf(stat) % 5) + 1})` }}
                  />
                </div>
                <span className="w-12 text-sm text-right">{stat.rate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/src/components/history/ review-system-app/src/components/report/
git commit -m "feat: add history and report components"
```

---

## Task 11: 组装 App.tsx 并完成应用

**Files:**
- Modify: `review-system-app/src/App.tsx`
- Create: `review-system-app/src/hooks/useReview.ts`

- [ ] **Step 1: 创建 src/hooks/useReview.ts**

```typescript
import { useState, useEffect } from 'react'
import { useReviewsStore } from '@/stores/reviews'
import { getTodayString } from '@/lib/dimensions'
import type { ReviewContent } from '@/types/review'

const EMPTY_CONTENT: ReviewContent = {
  health: '',
  work: '',
  study: '',
  social: '',
  finance: '',
  life: '',
  spirit: '',
  leisure: '',
}

export function useReview() {
  const today = getTodayString()
  const reviews = useReviewsStore(s => s.reviews)
  const saveRecord = useReviewsStore(s => s.saveRecord)
  const todayRecord = reviews.find(r => r.date === today)

  const [content, setContent] = useState<ReviewContent>(EMPTY_CONTENT)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (todayRecord) {
      setContent(todayRecord.content || EMPTY_CONTENT)
      setSummary(todayRecord.summary || '')
    } else {
      setContent(EMPTY_CONTENT)
      setSummary('')
    }
  }, [todayRecord?.id])

  const save = async () => {
    await saveRecord(today, content, summary)
  }

  const reset = () => {
    setContent(EMPTY_CONTENT)
    setSummary('')
  }

  return { today, content, setContent, summary, setSummary, save, reset, todayRecord }
}
```

- [ ] **Step 2: 重写 src/App.tsx**

```tsx
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { TabBar } from '@/components/layout/TabBar'
import { AuthModal } from '@/components/auth/AuthModal'
import { LoginPrompt } from '@/components/auth/LoginPrompt'
import { DimensionGrid } from '@/components/review/DimensionGrid'
import { SummarySection } from '@/components/review/SummarySection'
import { ActionBar } from '@/components/review/ActionBar'
import { HistoryTab } from '@/components/history/HistoryTab'
import { ReportTab } from '@/components/report/ReportTab'
import { useAuthStore } from '@/stores/auth'
import { useReviewsStore } from '@/stores/reviews'
import { useSettingsStore } from '@/stores/settings'
import { useReview } from '@/hooks/useReview'
import { Toaster, toast } from 'sonner'

function RecordTab() {
  const { today, content, setContent, summary, setSummary, save, reset } = useReview()
  const [saving, setSaving] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  const handleSave = async () => {
    setSaving(true)
    try {
      await save()
      toast.success('保存成功')
      if (!isAuthenticated) {
        setShowLoginPrompt(true)
      }
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    reset()
    toast.info('已重置')
  }

  return (
    <div>
      <DimensionGrid content={content} onContentChange={setContent} />
      <SummarySection value={summary} onChange={setSummary} />
      <ActionBar onSave={handleSave} onReset={handleReset} saving={saving} />
      <LoginPrompt open={showLoginPrompt} onClose={() => setShowLoginPrompt(false)} />
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('record')
  const loadFromStorage = useAuthStore(s => s.loadFromStorage)
  const loadReviewsFromStorage = useReviewsStore(s => s.loadFromLocalStorage)
  const loadSettingsFromStorage = useSettingsStore(s => s.loadFromStorage)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const loadFromCloud = useReviewsStore(s => s.loadFromCloud)
  const loadConfigFromCloud = useSettingsStore(s => s.loadFromCloud)

  useEffect(() => {
    loadFromStorage()
    loadReviewsFromStorage()
    loadSettingsFromStorage()

    if (isAuthenticated) {
      loadFromCloud()
      loadConfigFromCloud()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'record' && <RecordTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'report' && <ReportTab />}
      </main>
      <AuthModal />
      <Toaster />
    </div>
  )
}
```

- [ ] **Step 3: 验证完整应用**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr/review-system-app"
pnpm dev
```

预期：浏览器打开后显示完整的复盘系统界面，包含导航栏、Tab切换、8维度卡片、总结区域。

- [ ] **Step 4: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/
git commit -m "feat: assemble App with all components, complete review-system-app"
```

---

## Task 12: 构建验证与 Cloudflare Pages 部署配置

**Files:**
- Modify: `review-system-app/package.json` (确认 scripts)

- [ ] **Step 1: 确认 package.json scripts**

确保包含：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: 运行类型检查**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr/review-system-app"
npx tsc -b --noEmit
```

修复所有类型错误。

- [ ] **Step 3: 运行构建**

```bash
pnpm build
```

预期：`dist/` 目录生成，无错误。

- [ ] **Step 4: 本地预览构建产物**

```bash
pnpm preview
```

验证构建产物与开发版本一致。

- [ ] **Step 5: 提交**

```bash
cd "/Users/yq/Library/Mobile Documents/com~apple~CloudDocs/Documents/zhihr"
git add review-system-app/
git commit -m "feat: verify build and configure Cloudflare Pages deployment"
```

---

## 总结

本实施计划涵盖 12 个任务：

1. 初始化 Vite + React + TypeScript 项目
2. 安装和配置 shadcn/ui
3. 创建 TypeScript 类型定义
4. 创建 API 客户端层
5. 创建工具库
6. 创建 Zustand Stores
7. 创建认证组件
8. 创建布局组件
9. 创建复盘记录组件
10. 创建历史和报告组件
11. 组装 App.tsx 并完成应用
12. 构建验证与部署配置

每个任务可独立完成并提交，确保渐进式交付。
