# Review System 用户登录和注册功能设计

**设计日期:** 2026-05-21
**项目:** 知HR-复盘系统
**设计师:** AI Assistant

## 1. 需求概述

为 review-system 添加用户登录和注册功能，与 task-manager 共享同一套用户系统和 API，实现数据隔离和配置持久化。

### 1.1 核心需求

1. **用户认证**: 支持用户注册和登录，使用账号+密码方式
2. **数据隔离**: 所有复盘数据按用户隔离存储
3. **配置持久化**: 用户配置（主题、提醒、维度配置等）持久化到数据库
4. **数据迁移**: 登录时询问用户是否合并本地数据到云端
5. **统一认证**: 与 task-manager 共享同一套用户系统和 API

### 1.2 非功能需求

- 与 task-manager 保持一致的 UI 和交互体验
- 支持离线模式（未登录时使用 localStorage）
- 数据同步时避免数据丢失
- 响应式设计，支持移动端

## 2. 技术方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Review System                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   导航栏     │  │  登录 Modal  │  │   主内容区   │  │
│  │  (登录按钮)  │  │  (注册/登录) │  │  (复盘表单)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Cloudflare Workers API                      │
│  /api/auth/login    /api/auth/register                   │
│  /api/reviews       /api/config                          │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                  D1 Database                             │
│  users  |  reviews  |  user_configs                      │
└─────────────────────────────────────────────────────────┘
```

### 2.2 技术栈

- **前端**: React (已使用), Zustand (状态管理)
- **后端**: Cloudflare Workers (已有)
- **数据库**: Cloudflare D1 (已有)
- **认证**: JWT (已有实现)
- **存储**: localStorage (离线模式) + D1 (在线模式)

### 2.3 数据库表结构

#### users 表 (已有)
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT,
    updated_at TEXT
);
```

#### reviews 表 (已有)
```sql
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,  -- JSON 格式存储维度数据
    review_date TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### user_configs 表 (已有)
```sql
CREATE TABLE user_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    config TEXT,  -- JSON 格式存储用户配置
    updated_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 2.4 配置数据结构

```json
{
  "theme": "auto|light|dark",
  "reminderEnabled": true,
  "reminderTime": "21:00",
  "syncEnabled": true,
  "dimensionConfigs": {
    "health": {
      "items": [
        { "label": "睡眠", "value": "", "placeholder": "XX小时" },
        { "label": "饮食", "value": "", "placeholder": "是否有坚持16+8饮食" }
      ]
    }
  }
}
```

## 3. 功能设计

### 3.1 认证流程

#### 注册流程
1. 用户点击"注册"按钮
2. 填写账号（至少3位）和密码（至少4位）
3. 确认密码
4. 提交到 `/api/auth/register`
5. 注册成功后自动登录，保存 token
6. 加载云端数据（如果有的话）

#### 登录流程
1. 用户点击"登录"按钮
2. 填写账号和密码
3. 提交到 `/api/auth/login`
4. 登录成功后保存 token
5. 检测本地是否有数据
6. 如果有本地数据，询问用户是否合并到云端
7. 加载云端数据

#### 退出流程
1. 用户点击"退出登录"
2. 清除本地 token
3. 切换到 localStorage 模式
4. 加载本地数据

### 3.2 数据同步策略

#### 未登录状态
- 所有数据存储在 localStorage
- 键名: `reviewData`, `userConfig`

#### 登录后
- 所有数据通过 API 存储到云端
- 复盘数据存储在 `reviews` 表
- 配置数据存储在 `user_configs` 表

#### 数据合并（登录时）
```javascript
if (本地有数据 && 云端有数据) {
  显示对话框: "检测到本地有 X 条复盘记录，如何处理？"
  选项: "合并到云端" | "清空本地数据" | "取消"
}
```

### 3.3 UI 设计

#### 导航栏变更
```
未登录状态:
[Logo] [知HR-复盘系统]          [登录按钮]

已登录状态:
[Logo] [知HR-复盘系统]          [用户名 ▼] → [退出登录]
```

#### 登录/注册 Modal
复用 task-manager 的设计，包含：
- 登录表单：账号、密码、登录按钮
- 注册表单：账号、密码、确认密码、注册按钮
- 切换链接：没有账号？注册新账号 / 已有账号？登录

#### 数据合并确认对话框
```
标题: 数据同步
内容: 检测到本地有 X 条复盘记录，如何处理？
按钮: [合并到云端] [清空本地数据] [取消]
```

## 4. 实施计划

### 4.1 前端修改

#### 4.1.1 状态管理扩展
- 在 Zustand store 中添加认证状态
- 添加 token、userId、username 字段
- 添加登录、注册、退出方法

#### 4.1.2 UI 组件修改
- 修改导航栏，添加登录按钮和用户菜单
- 添加登录/注册 Modal
- 添加数据合并确认对话框

#### 4.1.3 数据存储逻辑修改
- 修改复盘数据存储逻辑，支持 localStorage 和云端切换
- 修改配置存储逻辑，支持 localStorage 和云端切换
- 添加数据合并逻辑

### 4.2 API 调用

#### 4.2.1 认证 API
- POST `/api/auth/register` - 注册
- POST `/api/auth/login` - 登录
- GET `/api/auth/me` - 获取当前用户信息

#### 4.2.2 数据 API
- GET `/api/reviews` - 获取复盘列表
- POST `/api/reviews` - 创建复盘
- PUT `/api/reviews/:id` - 更新复盘
- DELETE `/api/reviews/:id` - 删除复盘

#### 4.2.3 配置 API
- GET `/api/config` - 获取用户配置
- PUT `/api/config` - 更新用户配置

### 4.3 测试计划

#### 4.3.1 功能测试
- 注册新用户
- 登录已有用户
- 退出登录
- 数据同步（合并、清空、取消）
- 配置持久化

#### 4.3.2 兼容性测试
- 未登录状态下的数据存储
- 登录后的数据同步
- 退出登录后的数据切换
- 移动端适配

## 5. 风险和注意事项

### 5.1 数据安全
- 密码使用 SHA-256 哈希存储
- JWT token 有效期 24 小时
- 所有 API 请求需要 token 认证

### 5.2 数据一致性
- 数据合并时避免重复
- 退出登录时保存当前状态
- 网络错误时的降级处理

### 5.3 用户体验
- 登录/注册流程简单直观
- 数据合并时给用户明确提示
- 离线模式下仍可使用

## 6. 后续优化

### 6.1 功能扩展
- 添加"记住我"功能
- 添加密码重置功能
- 添加数据导出功能

### 6.2 性能优化
- 添加数据缓存
- 优化 API 请求
- 减少不必要的同步

### 6.3 其他工具集成
- 将认证系统应用到其他工具（dashboard、funnel、gantt-web、org-chart）
- 统一用户配置管理
- 跨工具数据共享

---

**设计文档版本:** 1.0
**最后更新:** 2026-05-21