# 知HR工具集 - 开发规范

> **目的**：统一所有工具的开发规范，让新应用快速接入、数据共享、安全可控。

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    首页 (zhihr.vip)                      │
│              静态页面，仅做工具导航链接                    │
└─────────────────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ review-system │   │  dashboard    │   │    funnel     │
│   (复盘系统)   │   │   (数据看板)   │   │  (招聘漏斗)   │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
              ┌─────────────────────────────┐
              │   api.zhihr.vip             │
              │   (Cloudflare Workers)       │
              │   统一后端，数据层           │
              └─────────────┬───────────────┘
                            │
              ┌─────────────┴───────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐         ┌────────────────┐
     │   users 表      │         │  业务表        │
     │  (认证共享)     │         │  (应用专属)     │
     └────────────────┘         └────────────────┘
```

### 角色分工

| 层级 | 技术 | 职责 |
|------|------|------|
| 首页 | 静态 HTML | 工具导航，不涉及数据 |
| 前端 | React + Vite | UI 渲染、用户交互、**本地缓存管理** |
| 后端 | Cloudflare Workers | **API 接口、数据库操作、安全认证** |
| 数据库 | Cloudflare D1 | 数据持久化 |

---

## 2. 后端规范

### 2.1 目录结构

```
api/
├── src/
│   └── index.js        # 所有 API 路由（单一入口）
├── schema.sql           # 数据库表结构
├── wrangler.toml        # Cloudflare 部署配置
└── package.json
```

**原则**：后端保持单一入口文件，所有路由集中管理。

### 2.2 API 设计规范

#### 路由命名

```
GET    /api/{resource}              # 获取列表
POST   /api/{resource}             # 创建
PUT    /api/{resource}             # 批量更新（按条件）
GET    /api/{resource}/:id         # 获取单个（不使用）
PUT    /api/{resource}/:id        # 更新单个
DELETE /api/{resource}/:id        # 删除单个
POST   /api/{resource}/sync       # 批量同步（可选）
```

#### API 响应格式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "message": "操作成功"  // 可选
}

// 失败
{
  "success": false,
  "message": "错误描述"
}
```

#### 路由顺序规则

**重要**：精确匹配路由必须放在正则匹配路由之前。

```javascript
// ✅ 正确：sync 精确匹配放在正则匹配之前
if (path === '/api/reviews/sync' && method === 'POST') {
  return handleSyncReviews(request, env, corsHeaders)
}
if (path.match(/^\/api\/reviews\/[a-zA-Z0-9\-]+$/)) {
  const id = path.split('/')[3]
  // ...
}

// ❌ 错误：正则匹配会提前拦截 sync
if (path.match(/^\/api\/reviews\/[a-zA-Z0-9\-]+$/)) {
  // "sync" 也会被当作 id，返回 404
}
```

### 2.3 数据库规范

#### 表结构命名

- 表名单数：`users`, `reviews`, `tasks`（不是 `user_list`）
- 主键：`id`（UUID 字符串）
- 用户关联：`user_id TEXT NOT NULL`
- 时间字段：`created_at`, `updated_at`（ISO 8601 格式）

#### 表结构模板

```sql
CREATE TABLE IF NOT EXISTS {table_name} (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  -- 业务字段 --
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_{table_name}_user_id ON {table_name}(user_id);
```

#### 数据查询原则

**所有查询必须带 `WHERE user_id = ?`**，用户只能访问自己的数据：

```javascript
// ✅ 正确
await db.prepare('SELECT * FROM tasks WHERE user_id = ?').bind(user.userId).all()

// ❌ 错误：没有用户隔离
await db.prepare('SELECT * FROM tasks').all()
```

### 2.4 安全规范

| 安全措施 | 实现方式 |
|----------|----------|
| 认证 | JWT Bearer Token，签名验证 |
| 密码存储 | PBKDF2 哈希（至少 100000 迭代） |
| SQL 注入防护 | 参数化查询 `.bind()` |
| 用户数据隔离 | 所有 SQL 加 `WHERE user_id = ?` |
| 限流 | 认证接口 10次/分钟，API 接口 60次/分钟 |
| CORS | `ALLOWED_ORIGINS` 白名单 |

#### 认证中间件模式

```javascript
// 每个受保护的路由开头调用
const payload = await verifyJwt(token, env)
// payload.userId 可用于后续查询
```

#### 新增接口的安全检查清单

- [ ] 需要登录？→ 调用 `verifyJwt()`
- [ ] 查询数据？→ 加 `WHERE user_id = ?`
- [ ] 写数据？→ 从 `verifyJwt` 提取 `userId` 作为 `user_id`
- [ ] 参数来自用户？→ 用 `.bind()` 参数化

---

## 3. 前端规范

### 3.1 目录结构

```
{app-name}/
├── src/
│   ├── App.tsx           # 应用入口（组件组合，不含业务逻辑）
│   ├── api/
│   │   ├── client.ts     # fetch 封装 + Token 管理
│   │   └── {resource}.ts # 各资源 API 调用
│   ├── store.ts          # 状态管理（Zustand）
│   ├── storage.ts        # localStorage 封装
│   ├── types.ts         # TypeScript 类型定义
│   └── components/       # UI 组件
│       ├── ui/           # shadcn/ui 组件（不改）
│       ├── auth/         # 认证相关（LoginForm, RegisterForm 等）
│       ├── layout/       # 布局（Navbar, TabBar）
│       └── {feature}/    # 功能模块
├── index.html
├── vite.config.ts
└── package.json
```

**原则**：API 调用、状态管理、存储逻辑集中在专门文件，组件只负责渲染和交互。

### 3.2 数据同步模式（所有应用通用）

```
用户操作
    │
    ▼
┌─────────────────┐
│ Store 更新       │  ← Zustand（唯一真相源）
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│本地缓存│  │云端API │  ← 同时写入
└────────┘  └────────┘
```

#### Store 模板

```typescript
import { create } from 'zustand'
import * as api from './api'
import { saveToStorage, loadFromStorage } from './storage'

interface AppState {
  items: Item[]
  isLoading: boolean

  // 数据操作
  loadFromCloud: () => Promise<void>
  save: (item: Partial<Item>) => Promise<void>
  delete: (id: string) => Promise<void>
}

export const useStore = create<AppState>((set, get) => ({
  items: [],
  isLoading: true,

  loadFromCloud: async () => {
    set({ isLoading: true })
    try {
      const result = await api.getItems()
      set({ items: result.data, isLoading: false })
      saveToStorage(result.data)
    } catch {
      set({ isLoading: false })
    }
  },

  save: async (item) => {
    // 1. 乐观更新本地
    const now = new Date().toISOString()
    let updated: Item
    if (item.id) {
      updated = { ...get().items.find(i => i.id === item.id), ...item, updatedAt: now }
      set({ items: get().items.map(i => i.id === item.id ? updated : i) })
    } else {
      updated = { ...item, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
      set({ items: [updated, ...get().items] })
    }
    saveToStorage(get().items)

    // 2. 写云端（失败不阻塞本地）
    if (isAuthenticated()) {
      try {
        await api.saveItem(updated)
      } catch (e) {
        console.warn('云端保存失败:', e)
      }
    }
  },
}))
```

### 3.3 API Client 模板

```typescript
const API_BASE = 'https://api.zhihr.vip'

export class ApiError extends Error {
  constructor(public message: string, public status?: number) {
    super(message)
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, auth = true } = options

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = localStorage.getItem('zhihr_access_token')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 401 && auth) {
    // Token 过期 → 尝试刷新 → 失败则跳转登录
    throw new ApiError('登录已过期', 401)
  }

  const data = await response.json()
  if (!data.success) throw new ApiError(data.message || '请求失败', response.status)
  return data as T
}
```

### 3.4 localStorage 模板

```typescript
const STORAGE_KEY = '{app}_data'
const MAX_SIZE = 4 * 1024 * 1024  // 4MB

export function saveToStorage(data: unknown[]) {
  try {
    const json = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, json)
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // 配额超限：保留最近 30 天
      const cutoff = daysAgo(30)
      const recent = data.filter(item => item.date >= cutoff)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    }
  }
}

export function loadFromStorage(): unknown[] | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}
```

---

## 4. 新应用开发流程

### 4.1 数据库准备

1. 在 `schema.sql` 中添加新表
2. 运行 `wrangler d1 execute` 初始化表
3. 不需要修改认证逻辑（自动复用 `users` 表）

### 4.2 前端初始化

```bash
# 复制模板项目
cp -r review-system-app {new-app}
cd {new-app}

# 安装依赖
pnpm install

# 删除业务代码（保留架构）
rm -rf src/components/auth
rm -rf src/components/review
rm -rf src/components/history
rm -rf src/components/report
rm -rf src/api
rm -rf src/store.ts
rm -rf src/types.ts
rm -rf src/storage.ts
```

### 4.3 开发步骤

| 步骤 | 内容 | 文件 |
|------|------|------|
| 1 | 定义数据类型 | `src/types.ts` |
| 2 | 编写后端 API | `api/src/index.js` |
| 3 | 前端 API 调用 | `src/api/client.ts` + `src/api/{resource}.ts` |
| 4 | localStorage 封装 | `src/storage.ts` |
| 5 | Zustand Store | `src/store.ts` |
| 6 | UI 组件 | `src/components/` |

### 4.4 部署

```bash
# 1. 部署后端
cd api && npx wrangler deploy

# 2. 部署前端
cd {app-name} && pnpm build
# Cloudflare Pages 指向 dist/ 目录
```

---

## 5. 复用清单

### 5.1 可直接复用的代码

| 模块 | 路径 | 说明 |
|------|------|------|
| API Client | `src/api/client.ts` | 通用，无需修改 |
| localStorage | `src/storage.ts` | 改个 key 即可 |
| Auth 组件 | `src/components/auth/` | 直接用，不用改 |

### 5.2 需要新建的代码

| 模块 | 说明 |
|------|------|
| `src/types.ts` | 每个应用不同 |
| `src/api/{resource}.ts` | 每个应用不同 |
| `src/store.ts` | 每个应用不同 |
| `src/components/` | 每个应用不同 |
| 后端路由 | 每个应用不同 |

### 5.3 数据库复用

| 表名 | 用途 | 复用方式 |
|------|------|----------|
| `users` | 认证 | 自动复用，无需新建 |
| `user_configs` | 用户配置 | 通用配置，可存任何 JSON |

---

## 6. 注意事项

### 6.1 不要做的事

- ❌ 前端直接操作数据库（只能用 API）
- ❌ 把 token 存在 URL 参数中
- ❌ SQL 拼接字符串（用 `.bind()`）
- ❌ 查询不带 `WHERE user_id = ?`
- ❌ 在组件里直接调 API（通过 store 中转）

### 6.2 一定要做的事

- ✅ 所有敏感操作检查登录状态
- ✅ 乐观更新（先更新本地，再写云端）
- ✅ 错误用 try-catch 捕获，不阻断用户操作
- ✅ localStorage 配额超限做降级处理
- ✅ TypeScript 类型定义清楚

---

**文档版本**: 1.0
**创建日期**: 2026-05-23
