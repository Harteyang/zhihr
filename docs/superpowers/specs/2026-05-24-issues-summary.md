# 知HR 技术债务与优化方案汇总

> **讨论日期**: 2026-05-24
> **待处理**: 3 个技术问题待确认

---

## 问题 1：登录状态跨应用共享

### 问题描述

用户在一个应用登录后，其他应用无法感知登录状态。

### 根因分析

各应用使用的 localStorage key **不一致**：

| 应用 | Token Key | 用户ID Key | 用户名 Key |
|------|-----------|------------|-----------|
| 首页 (index.html) | `zhihr_token` | `zhihr_user_id` | `zhihr_username` |
| review-system-app | `zhihr_access_token` | `zhihr_user_id` | `zhihr_username` |

首页用 `zhihr_token`，review-system 用 `zhihr_access_token`，**无法互通**。

### 解决方案

**统一 localStorage key 规范**（同域名天然共享，无需 Cookie）：

```typescript
// 所有应用统一使用这套 key
const AUTH_KEYS = {
  ACCESS_TOKEN: 'zhihr_access_token',   // 主 Token
  REFRESH_TOKEN: 'zhihr_refresh_token', // 刷新 Token
  USER_ID: 'zhihr_user_id',
  USERNAME: 'zhihr_username',
  USER_EMAIL: 'zhihr_user_email',
}
```

### 修改范围

- [ ] 首页 (`index.html`)：将 `zhihr_token` → `zhihr_access_token`
- [ ] review-system-app：已是标准 key，无需修改
- [ ] 未来新应用：遵循统一 key 规范

### 优先级

🟡 中等（功能性问题，影响用户体验）

---

## 问题 2：数据存储排查机制缺失

### 问题描述

应用数据无法存储到数据库时，不知道问题出在哪个环节，难以排查。

### 问题根因

**日志缺失**：

```
数据流程：
前端 Store → localStorage → API Client → 后端 → 数据库

每个环节都没有日志：
❌ API Client：没有请求/响应日志
❌ 后端：没有执行日志
❌ 前端 Store：只有部分操作有日志
```

### 解决方案

**建立完整的 Debug 日志体系**：

#### 2.1 API Client 增强

```typescript
export async function apiRequest<T>(endpoint, options) {
  const { method, body } = options

  // 1. 请求日志
  console.log(`[API] → ${method} ${endpoint}`, body ? truncate(body) : '')

  // 2. 响应日志
  console.log(`[API] ← ${response.status} ${endpoint}`, truncate(data))

  // 3. 失败时详细日志
  if (!data.success) {
    console.error(`[API] ✗ Failed:`, data.message)
  }
}
```

#### 2.2 后端关键步骤日志

```javascript
async function handleCreateReview(request, env, corsHeaders) {
  console.log('[Review] handleCreateReview called')

  const user = await getAuthenticatedUser(request, env)
  if (!user) {
    console.log('[Review] Auth failed')
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }
  console.log('[Review] Auth OK, userId:', user.userId)

  // ... 业务逻辑 ...

  console.log('[Review] DB insert complete, id:', reviewId)
}
```

#### 2.3 前端 Store 补全日志

```typescript
save: async (review) => {
  console.log('[Reviews] save() called', truncate(review))

  // 1. 乐观更新
  set({ reviews: updated })
  saveToStorage(updated)
  console.log('[Reviews] localStorage updated')

  // 2. 写云端
  if (isAuthenticated()) {
    try {
      console.log('[Reviews] Calling API...')
      const result = await api.createReview(updated)
      console.log('[Reviews] API success')
    } catch (e) {
      console.error('[Reviews] API failed:', e)
    }
  }
}
```

#### 2.4 统一日志工具

```typescript
const isDev = import.meta.env.DEV

function debugLog(tag: string, ...args: unknown[]) {
  if (isDev || localStorage.getItem('DEBUG_MODE') === 'true') {
    console.log(`[${tag}]`, ...args)
  }
}
```

### 排查 SOP

```
遇到数据不存储问题：

1. 打开浏览器控制台 (F12)
2. 启用 DEBUG 模式：localStorage.setItem('DEBUG_MODE', 'true')
3. 复现问题
4. 查看日志流程：

Step 1: [API] → 有日志？     → 否：前端 Store 没发请求
Step 2: [API] ← 有日志？     → 否：网络/CORS 问题
Step 3: 后端 console 有日志？ → 否：请求未到达后端
Step 4: DB 操作日志？        → 否：认证/权限问题
Step 5: 返回 success: true？  → 否：业务逻辑报错
```

### 修改范围

- [ ] `src/api/client.ts`：添加请求/响应日志
- [ ] `api/src/index.js`：添加后端关键步骤日志
- [ ] `src/stores/reviews.ts`：补全 save() 日志
- [ ] 新增 `src/lib/debug.ts`：统一日志工具

### 优先级

🔴 高（阻碍开发，必须先解决）

---

## 问题 3：后端 API 架构优化

### 问题描述

当前 `api/src/index.js` 超过 1300 行，所有路由混在一起。新增应用需要修改核心代码，难以维护。

### 问题根因

```javascript
// 当前设计
if (path === '/api/reviews') { ... }
if (path === '/api/tasks') { ... }
if (path === '/api/categories') { ... }
// 每新增一个应用，就要改这个文件
```

### 三个可行方案

#### 方案 A：模块化路由（推荐）

把每个业务拆成独立模块文件。

```
api/src/
├── index.js              # 路由注册器（轻量）
├── modules/
│   ├── auth.js          # 认证模块
│   ├── reviews.js       # 复盘模块
│   ├── tasks.js         # 任务模块
│   └── {new}.js        # 新应用模块
└── utils/
    └── router.js        # 路由注册工具
```

**新应用流程**：
```bash
# 1. 创建模块文件
cp api/src/templates/module.js api/src/modules/dashboard.js

# 2. 注册
register(dashboard)
```

| 优点 | 缺点 |
|------|------|
| 新应用独立文件 | 需要重构 |
| 团队可并行开发 | 初期投入 |
| 易测试、易维护 | |

#### 方案 B：通用 CRUD API + Schema 配置

用 JSON 定义数据模型，API 自动生成。

```javascript
// Schema 定义
export const reviewsSchema = {
  name: 'reviews',
  fields: {
    title: { type: 'string', required: true },
    content: { type: 'object' },
  }
}
// 自动生成：GET/POST/PUT/DELETE /api/reviews
```

**新应用流程**：
```bash
# 配置 Schema
cp api/src/templates/schema.js api/src/schemas/dashboard.js
# 注册
register(dashboardSchema)
```

| 优点 | 缺点 |
|------|------|
| 新应用零代码 | 灵活性受限 |
| 开发速度快 | 复杂查询难支持 |

#### 方案 C：插件化架构

类似 WordPress 插件机制，每个应用是独立插件。

```javascript
// 插件结构
export default {
  name: 'reviews',
  routes: [...],
  hooks: {
    beforeInstall: async (db) => { /* 创建表 */ }
  }
}
```

**新应用流程**：
```bash
# 创建插件目录，自动加载
mkdir api/src/plugins/dashboard
```

| 优点 | 缺点 |
|------|------|
| 完全解耦 | 复杂度高 |
| 热插拔 | 过度设计风险 |

### 方案对比

| 维度 | 方案 A | 方案 B | 方案 C |
|------|--------|--------|--------|
| 改动量 | 中 | 大 | 大 |
| 复杂度 | 低 | 中 | 高 |
| 新应用工作量 | 低 | 极低 | 低 |
| 灵活性 | 高 | 中 | 极高 |
| **推荐** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

### 推荐方案

**方案 A：模块化路由**

理由：
1. 改动可控，只需重构组织方式
2. 可逐步迁移，先拆一两个验证
3. 灵活度高，复杂逻辑仍可自定义
4. 为未来更复杂架构打基础

### 修改范围

- [ ] 新增 `api/src/utils/router.js`
- [ ] 新增 `api/src/modules/auth.js`
- [ ] 新增 `api/src/modules/reviews.js`
- [ ] 新增 `api/src/modules/tasks.js`
- [ ] 新增 `api/src/modules/config.js`
- [ ] 重构 `api/src/index.js`
- [ ] 创建 `api/src/templates/module.js` 新应用模板

### 优先级

🟡 中等（技术债务，暂不阻碍但影响扩展性）

---

## 汇总

| # | 问题 | 优先级 | 方案 | 待确认 |
|---|------|--------|------|--------|
| 1 | 登录状态跨应用共享 | 🟡 中 | 统一 localStorage key | ✅ 确认方案 |
| 2 | 数据存储排查机制缺失 | 🔴 高 | 建立 Debug 日志体系 | ✅ 确认方案 |
| 3 | 后端 API 架构优化 | 🟡 中 | 方案 A 模块化路由 | ❌ 待选方案 |

### 待确认事项

1. [ ] 问题 1：首页 token key 改动是否会影响现有用户？（需要迁移脚本？）
2. [ ] 问题 2：日志方案确认后，是否立即实施？
3. [ ] 问题 3：选择哪个方案？（A/B/C）

---

## 文档版本

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-05-24 | 初始版本 |
