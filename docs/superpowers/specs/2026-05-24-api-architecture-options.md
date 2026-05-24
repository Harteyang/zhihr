# 知HR API 架构优化方案

> **背景**：当前 API 代码（index.js）超过 1300 行，所有路由混在一起，新增应用需要修改核心代码，难以维护。

---

## 方案 A：模块化路由（推荐）

### 核心思路

把每个业务拆成独立模块文件，index.js 变成路由注册器。

### 目录结构

```
api/
├── src/
│   ├── index.js              # 路由注册器（轻量，不变）
│   ├── modules/
│   │   ├── auth.js           # 认证模块
│   │   ├── reviews.js        # 复盘模块
│   │   ├── tasks.js          # 任务模块
│   │   ├── config.js         # 配置模块
│   │   └── {new}.js          # 新应用模块
│   └── utils/
│       ├── router.js         # 路由注册工具
│       └── db.js             # 数据库工具函数
└── schema.sql
```

### 核心代码

**router.js（路由注册工具）**：
```javascript
const routes = []

export function register(module) {
  for (const route of module.routes) {
    routes.push(route)
  }
}

export function matchRoute(method, path) {
  for (const route of routes) {
    if (route.method === method && path === route.path) {
      return route.handler
    }
    // 支持简单参数匹配 :id
    const pattern = route.path.replace(/:[^/]+/g, '([^/]+)')
    if (route.method === method && new RegExp(`^${pattern}$`).test(path)) {
      return { handler: route.handler, params: extractParams(route.path, path) }
    }
  }
  return null
}

export function extractParams(pattern, path) {
  const keys = pattern.match(/:([^/]+)/g) || []
  const values = path.match(new RegExp(`^${pattern.replace(/:[^/]+/g, '([^/]+)')}$`)) || []
  return keys.reduce((acc, key, i) => ({ ...acc, [key.slice(1)]: values[i + 1] }), {})
}
```

**auth.js（模块示例）**：
```javascript
export const routes = [
  { method: 'POST', path: '/api/auth/register', handler: handleRegister },
  { method: 'POST', path: '/api/auth/login', handler: handleLogin },
  { method: 'POST', path: '/api/auth/refresh', handler: handleRefresh },
  { method: 'GET', path: '/api/auth/me', handler: handleMe },
]

export async function handleRegister(request, env, corsHeaders) {
  // 业务逻辑...
}

export async function handleLogin(request, env, corsHeaders) {
  // 业务逻辑...
}

// ... 其他 handler
```

**index.js（重构后）**：
```javascript
import * as auth from './modules/auth'
import * as reviews from './modules/reviews'
import * as tasks from './modules/tasks'
import * as config from './modules/config'
import { register } from './utils/router'

register(auth)
register(reviews)
register(tasks)
register(config)

// handleRequest 中使用 router.match()
```

### 新增应用流程

```bash
# 1. 创建模块文件
cp api/src/templates/module.js api/src/modules/dashboard.js

# 2. 在 index.js 注册
import * as dashboard from './modules/dashboard'
register(dashboard)
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 新应用独立文件，互不影响 | 需要重构 |
| 团队可并行开发不同模块 | 初期投入时间 |
| 易测试、易维护 | 需要学习规范 |
| 职责分离清晰 | |

---

## 方案 B：通用 CRUD API + Schema 配置

### 核心思路

用 JSON 定义数据模型，API 根据 Schema 自动生成 CRUD 接口。

### 目录结构

```
api/
├── src/
│   ├── index.js              # 通用处理器
│   ├── schemas/
│   │   ├── auth.js           # 认证（特殊处理）
│   │   ├── reviews.js        # 复盘 schema
│   │   ├── tasks.js          # 任务 schema
│   │   └── {new}.js          # 新应用 schema
│   └── handlers/
│       ├── crud.js           # 通用 CRUD
│       └── auth.js           # 认证处理
└── schema.sql
```

### Schema 定义示例

**reviews.js**：
```javascript
export const reviewsSchema = {
  name: 'reviews',
  table: 'reviews',

  fields: {
    id: { type: 'string', primary: true },
    title: { type: 'string', required: true, maxLength: 200 },
    content: { type: 'object' },
    review_date: { type: 'date', required: true }
  },

  indexes: ['user_id', 'review_date'],

  // 自定义业务逻辑（可选）
  hooks: {
    beforeCreate: async (data, env) => { /* 处理逻辑 */ },
    afterCreate: async (result, env) => { /* 后处理 */ }
  }
}
```

**通用 CRUD 处理器**：
```javascript
async function handleCrud(request, env, schema, corsHeaders) {
  const { action, id } = parseRoute(request)
  const user = await getAuthenticatedUser(request, env)

  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  switch (action) {
    case 'list':
      return handleList(schema, user, env, request)
    case 'create':
      return handleCreate(schema, user, env, request)
    case 'update':
      return handleUpdate(schema, user, env, id, request)
    case 'delete':
      return handleDelete(schema, user, env, id)
    case 'sync':
      return handleSync(schema, user, env, request)
  }
}
```

### 新增应用流程

```bash
# 1. 创建 Schema 文件
cp api/src/templates/schema.js api/src/schemas/dashboard.js

# 2. 编辑 Schema
# 定义字段、索引、钩子

# 3. 注册 Schema
import { register } from './schemas'
register(reviewsSchema)
register(tasksSchema)
register(dashboardSchema)
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 新应用只需配置，无需写代码 | 灵活性受限 |
| 开发速度快 | 复杂查询难以支持 |
| 自动生成文档 | 需要维护 Schema |
| 一致性强 | |

---

## 方案 C：插件化架构

### 核心思路

类似 WordPress 插件机制，每个应用是独立插件。

### 目录结构

```
api/
├── src/
│   ├── index.js              # 插件管理器
│   ├── plugins/
│   │   ├── reviews/
│   │   │   ├── index.js      # 插件入口
│   │   │   ├── routes.js     # 路由定义
│   │   │   └── migrations/   # 数据迁移
│   │   ├── tasks/
│   │   └── {new-app}/
│   └── core/
│       ├── plugin-manager.js # 插件管理
│       └── hooks.js          # 生命周期
└── schema.sql
```

### 插件结构

**reviews/index.js**：
```javascript
export default {
  name: 'reviews',
  version: '1.0.0',
  description: '复盘系统 API',

  routes: [
    { method: 'GET', path: '/api/reviews', handler: handleGetReviews },
    { method: 'POST', path: '/api/reviews', handler: handleCreateReview },
    // ...
  ],

  // 生命周期钩子
  hooks: {
    beforeInstall: async (db) => {
      // 安装前：创建表结构
    },
    afterInstall: async (db) => {
      // 安装后：初始化数据
    },
    beforeUninstall: async (db) => {
      // 卸载前：备份数据
    }
  }
}
```

**插件管理器**：
```javascript
import { readdir } from 'fs'

const plugins = new Map()

export async function loadPlugins() {
  const dirs = await readdir('./plugins')
  for (const dir of dirs) {
    const plugin = await import(`./plugins/${dir}`)
    plugins.set(plugin.name, plugin)

    // 注册路由
    for (const route of plugin.routes) {
      registerRoute(route)
    }

    // 执行安装钩子
    if (plugin.hooks?.beforeInstall) {
      await plugin.hooks.beforeInstall(env.DB)
    }
  }
}
```

### 新增应用流程

```bash
# 1. 创建插件目录
mkdir -p api/src/plugins/dashboard

# 2. 创建插件文件
cp api/src/templates/plugin/index.js api/src/plugins/dashboard/index.js

# 3. 编辑插件代码
# 定义路由、业务逻辑

# 4. 重启服务自动加载
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 完全解耦 | 复杂度高 |
| 可独立发布/禁用 | 过度设计风险 |
| 热插拔 | 适合大型系统 |
| 可版本管理 | 学习成本高 |

---

## 三方案对比

| 维度 | 方案 A (模块化) | 方案 B (通用 CRUD) | 方案 C (插件化) |
|------|----------------|-------------------|----------------|
| 改动量 | 中（重构） | 大（重新设计） | 大（架构） |
| 复杂度 | 低 | 中 | 高 |
| 新应用工作量 | 添加模块 + 注册 | 配置 Schema | 创建插件 |
| 灵活性 | 高 | 中 | 极高 |
| 学习成本 | 低 | 中 | 高 |
| 适用场景 | 5-20 个应用 | 简单 CRUD 为主 | 平台级产品 |
| 推荐指数 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 推荐方案

**推荐方案 A（模块化路由）**

理由：
1. **改动可控**：只需重构组织方式，不改变 API 语义
2. **逐步迁移**：可以先拆一两个模块验证，再全面推广
3. **灵活度高**：复杂业务逻辑仍可自定义
4. **未来可扩展**：为更复杂架构打基础

### 迁移计划

```
Phase 1: 工具函数
  - 创建 utils/router.js
  - 创建 utils/db.js

Phase 2: 拆分现有模块
  - modules/auth.js
  - modules/reviews.js
  - modules/tasks.js
  - modules/config.js
  - modules/feedback.js

Phase 3: 新应用模板
  - 创建 templates/module.js
  - 文档化新增应用流程

Phase 4: 日志体系（与架构优化并行）
  - API Client 请求日志
  - 后端关键步骤日志
  - 前端 Store 操作日志
```

---

## 待讨论问题

1. [ ] 选哪个方案？
2. [ ] 是否需要同步建立日志体系？
3. [ ] 新应用如何管理数据库表？（每个应用独立 SQL 还是统一 schema.sql）
