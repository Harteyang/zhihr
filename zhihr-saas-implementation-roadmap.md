# 知HR · SaaS技术实施路线图

> 版本：v1.0
> 日期：2026-05-26
> 目标：将 zhihr.vip 从纯静态网站转型为完整SaaS平台

---

## 一、总体架构全景

```
┌─────────────────────────────────────────────────────────────┐
│                     用户层                                   │
│  Browser (Vue 3 SPA)  ←→  WeChat Mini Program (未来)       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS / WSS
┌──────────────────────┴──────────────────────────────────────┐
│                   接入层 (Cloudflare)                        │
│  ● DNS: zhihr.vip, api.zhihr.vip                           │
│  ● CDN: 全球边缘缓存静态资源                                 │
│  ● DDoS防护: Cloudflare内置                                 │
│  ● WAF: Web应用防火墙                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                   前端层 (Cloudflare Pages)                  │
│  Vue 3 SPA + Vite + Naive UI + ECharts                     │
│  ├─ 公共布局 (Header/Sidebar/ThemeToggle)                   │
│  ├─ 工具页面 (甘特图/看板/漏斗/架构图/复盘/任务管理)         │
│  ├─ 共享组件 (DataTable/FileUpload/ChartCard/AiPanel)      │
│  └─ AI面板 (自然语言查询HR数据)                              │
└───────────┬────────────────────────────────────────────────┘
            │ /api/* 代理转发
┌───────────┴────────────────────────────────────────────────┐
│                 API层 (Cloudflare Workers)                  │
│  Hono框架 + TypeScript                                     │
│  ├─ JWT中间件 ── 全局认证校验                               │
│  ├─ CORS中间件 ── 跨域安全控制                              │
│  ├─ 限流中间件 ── 防止滥用                                  │
│  ├─ 请求日志 ── 审计追踪                                   │
│  └─ Routes:                                                 │
│       /v1/auth/*      ─ 注册/登录/刷新/个人信息             │
│       /v1/tools/*     ─ 工具定义                            │
│       /v1/instances/* ─ 工具实例                            │
│       /v1/data/*      ─ 统一数据CRUD                        │
│       /v1/ai/*        ─ AI查询/洞察                         │
│       /v1/feedbacks/* ─ 用户反馈                            │
└───────────┬────────────────────────────────────────────────┘
            │
┌───────────┴────────────────────────────────────────────────┐
│                数据层 (Cloudflare)                          │
│  ├─ D1 (SQLite) ── 结构化数据：用户/工具/实例/数据/AI日志   │
│  ├─ R2 ── 对象存储：上传的花名册Excel/CSV/用户头像           │
│  └─ KV (可选) ── 会话缓存/临时配置                          │
└────────────────────────────────────────────────────────────┘
```

---

## 二、技术选型详解

### 2.1 技术栈矩阵

| 层级 | 技术选型 | 选型理由 |
|------|---------|---------|
| **前端框架** | Vue 3 + Vite | 轻量、中文生态、Vite HMR极快 |
| **UI组件库** | Naive UI | 按需加载、TypeScript原生支持、颜值在线 |
| **状态管理** | Pinia | Vue官方推荐，比Vuex更轻量 |
| **路由** | Vue Router 4 | Vue生态标准 |
| **HTTP客户端** | Axios + 拦截器 | 业界标准，拦截器统一处理Token/错误 |
| **图表** | ECharts 5 | 全家桶：甘特图/漏斗图/雷达图/柱状图 |
| **后端框架** | Hono (Cloudflare Workers) | Workers最火框架，超轻量、类型安全 |
| **数据库** | Cloudflare D1 (SQLite) | 零运维、SQLite兼容、Workers原生绑定 |
| **对象存储** | Cloudflare R2 | 兼容S3 API，免费额度10GB |
| **认证** | JWT (bcrypt + jsonwebtoken) | 无状态、适合Workers分布式架构 |
| **AI集成** | DeepSeek API (初期) | 中文强、价格低、效果好 |
| **部署** | Cloudflare Pages + Workers | 统一平台、全球CDN、零运维 |
| **域名** | zhihr.vip (主站) + api.zhihr.vip (API) | 子域名隔离，清晰 |

### 2.2 为什么不选其他方案

| 备选方案 | 放弃原因 |
|---------|---------|
| React | 你已熟悉Vue，React学习成本高，中式场景Vue更合适 |
| Node.js + Express (VPS部署) | 需要维护服务器、配置SSL、处理扩容，Workers全免 |
| MySQL / PostgreSQL | 需要单独买数据库服务，D1随Workers免费 |
| Firebase / Supabase | 需要额外学习&跨境访问慢，Cloudflare全家桶更统一 |
| Session-Cookie | Workers无状态分布式，Session需要KV存储增加延迟 |

### 2.3 开发工具链

```
编辑器: VS Code + Volar (Vue 3) + ESLint + Prettier
包管理: pnpm (比npm/yarn快3倍)
版本控制: Git + GitHub
API测试: Bruno / Hoppscotch (开源替代Postman)
数据库管理: D1 Console (Web) + wrangler d1
CI/CD: GitHub Actions → Cloudflare Pages自动部署
```

---

## 三、用户认证与授权系统（详细）

### 3.1 认证流程

```
注册流程:
┌─────────┐    ┌──────────┐    ┌─────────┐
│ 前端表单  │───▶│ Workers  │───▶│   D1    │
│ 用户名/   │    │ 验证输入  │    │ 插入用户 │
│ 密码/     │    │ bcrypt哈希│    │ 返回     │
│ 显示名    │    │ 生成JWT  │    │ 用户信息  │
└─────────┘    └──────────┘    └─────────┘
                     │
                     ▼
               ┌──────────┐
               │ 返回JWT   │
               │ + 用户信息 │
               └──────────┘

登录流程:
┌─────────┐    ┌──────────┐    ┌─────────┐
│ 前端表单  │───▶│ Workers  │───▶│   D1    │
│ 用户名/   │    │ 查用户   │    │ 查hash  │
│ 密码      │    │ bcrypt验 │    │ 返回     │
└─────────┘    │ 证密码   │    └─────────┘
               │ 生成JWT  │
               └──────────┘
                     │
                     ▼
               ┌──────────┐
               │ 返回JWT   │
               │ (7天有效期)│
               │ + refresh │
               │ token(30天)│
               └──────────┘

请求鉴权:
  Request → CORS检查 → JWT中间件 → 路由处理
                          │
                     Token验证失败 → 401
                     Token过期 → 尝试刷新 → 失败 → 重新登录
```

### 3.2 JWT Token 设计

```json
// Access Token (7天有效期)
{
  "sub": "用户UUID",
  "username": "yq",
  "role": "admin",
  "iat": 1748227200,
  "exp": 1748832000
}

// Refresh Token (30天有效期，存D1，可撤回)
// 表结构: refresh_tokens { id, user_id, token_hash, expires_at, revoked }
```

### 3.3 权限模型

| 角色 | 权限 | 说明 |
|------|------|------|
| **admin** (你) | 所有读写 + 管理工具定义 + 查看所有反馈 | 默认注册的第一个账号 |
| **user** (朋友/内测) | 自己的数据读写 + 自己的反馈 | 后续开放注册 |
| **guest** (未登录) | 仅首页 + 登录/注册页 | 不能使用任何工具 |

### 3.4 密码策略

- 密码最小长度: 8位，至少含字母+数字
- 哈希算法: bcrypt (cost=10)
- 登录失败5次: 账号锁定15分钟（D1记录失败次数）
- JWT密钥: 环境变量注入，不在代码中硬编码

---

## 四、数据安全与隐私保护措施

### 4.1 数据传输安全

| 防护层 | 措施 |
|--------|------|
| **传输加密** | 全站 HTTPS (Cloudflare自动) |
| **API防篡改** | JWT签名，任何请求必须带有效Token |
| **CORS** | 仅允许 `zhihr.vip` 和 `localhost` 开发环境 |
| **HSTS** | 强制HTTPS，禁止降级攻击 |

### 4.2 数据存储安全

```
密码存储:
  用户密码 → bcrypt(10轮) → 只存hash → 绝不存明文
  即便数据库泄露，密码也无法反向破解

花名册等隐私数据:
  ● D1数据库内：所有数据的 owner 通过 user_id 严格隔离
  ● 每一个SQL查询都强制带 WHERE user_id = ?
  ● R2存储的文件：用user_id作为目录前缀隔离
  ● 敏感文件（含身份证号/电话）建议加密存储

可选加密方案（针对花名册等HR敏感数据）:
  Workers运行时用 AES-256-GCM 加密 data 字段的JSON内容
  密钥从环境变量读取，数据库也不存储
  只有API层能解密，D1管理员也看不到明文
```

### 4.3 API安全防护

```javascript
// Workers中间件安全链（执行顺序）
安全检查链:
  1. Rate Limiting ── 每IP每分钟最多60次请求
  2. CORS验证 ── 拒绝非白名单来源
  3. JWT验证 ── Token过期/无效直接401
  4. 数据隔离 ── request.user_id 覆盖所有SQL查询
  5. 输入清洗 ── SQL注入防护（parameterized queries）
  6. 输出过滤 ── 返回前移除password_hash等敏感字段
```

### 4.4 隐私合规

| 要求 | 措施 |
|------|------|
| **数据最小化** | 只收集必要字段：用户名、显示名、密码hash |
| **删除权** | 用户可删除自己的账号 → 级联删除所有关联数据 |
| **数据可携带** | 支持导出所有数据为CSV/JSON |
| **日志留痕** | ai_queries表记录所有AI查询，可追溯审计 |
| **通知义务** | 如果未来有数据泄露，通过注册邮箱通知用户 |

---

## 五、开发环境搭建

### 5.1 本地开发环境

```bash
# 前提条件
node >= 18
pnpm >= 8
git

# ===== 前端项目 =====
cd ~/projects
pnpm create vite zhihr-hub --template vue-ts
cd zhihr-hub

# 安装核心依赖
pnpm add vue-router@4 pinia naive-ui axios vue-echarts echarts
pnpm add -D @types/node unplugin-auto-import unplugin-vue-components

# ===== 后端项目 =====
pnpm add -D wrangler  # Cloudflare CLI
npx wrangler init zhihr-api
cd zhihr-api

# 安装Hono
pnpm add hono
pnpm add @hono/zod-validator  # 输入校验
pnpm add bcryptjs jsonwebtoken  # 认证
pnpm add -D @types/bcryptjs @types/jsonwebtoken

# ===== D1数据库 =====
npx wrangler d1 create zhihr-db  # 创建数据库
npx wrangler d1 execute zhihr-db --file=./schema.sql  # 建表
```

### 5.2 项目目录结构

```
~/projects/
├── zhihr-hub/              # 前端项目 (Vue 3 + Vite)
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/index.ts
│   │   ├── layouts/AppLayout.vue
│   │   ├── views/ (各工具页面)
│   │   ├── components/ (共享组件)
│   │   ├── composables/ (逻辑复用)
│   │   ├── stores/ (Pinia)
│   │   ├── api/ (Axios封装)
│   │   └── types/ (TypeScript)
│   ├── wrangler.toml
│   └── functions/          # Cloudflare Functions（API）
│       ├── _middleware.ts
│       ├── api/
│       │   ├── auth/
│       │   ├── tools/
│       │   ├── data/
│       │   ├── ai/
│       │   └── feedbacks/
│       └── db/
│           ├── schema.sql
│           └── migrations/
└── zhihr-api/              # 备用：独立API项目（可选的）
    └── src/
        └── index.ts
```

### 5.3 开发工作流

```yaml
# 日常开发流程
1. git checkout -b feat/xxx     # 新功能分支
2. 本地编码 + 热更新调试
3. pnpm run dev                 # 本地开发服务器
4. npx wrangler dev             # 本地Workers模拟
5. 自测通过 → git push
6. GitHub Actions自动：
   ├─ 运行 ESLint + 类型检查
   ├─ 运行单元测试
   └─ 部署到 Cloudflare Pages (预览URL)
7. 在预览URL验收通过
8. PR → merge to main → 自动部署到生产
```

---

## 六、部署策略

### 6.1 部署架构

```
┌───────────────────────────────────────────────┐
│               Cloudflare 全球网络                │
│                                                │
│  zhihr.vip ──────────────────────────────────┐ │
│    ↓ DNS 解析                                  │ │
│  Cloudflare CDN (22个边缘节点)                  │ │
│    ↓                                           │ │
│  ┌──────────────────────────────────────┐     │ │
│  │  Cloudflare Pages                     │     │ │
│  │  ├─ 静态资源: HTML/CSS/JS/图片        │     │ │
│  │  ├─ SPA路由: 所有路径→index.html      │     │ │
│  │  └─ /api/* 代理 → Workers             │     │ │
│  └────────────┬─────────────────────────┘     │ │
│               │                                │ │
│  ┌────────────┴─────────────────────────┐     │ │
│  │  Cloudflare Workers (Hono)           │     │ │
│  │  ├─ 全球分布执行                       │     │ │
│  │  ├─ 冷启动 < 5ms                     │     │ │
│  │  └─ D1数据库直连                     │     │ │
│  └────────────┬─────────────────────────┘     │ │
│               │                                │ │
│  ┌────────────┴─────────────────────────┐     │ │
│  │  Cloudflare D1 + R2                  │     │ │
│  │  ├─ D1: SQLite数据库                  │     │ │
│  │  ├─ R2: 文件存储                      │     │ │
│  │  └─ 同地域部署，低延迟                 │     │ │
│  └──────────────────────────────────────┘     │ │
└───────────────────────────────────────────────┘
```

### 6.2 域名与子域名规划

| 域名 | 用途 | 说明 |
|------|------|------|
| `zhihr.vip` | 主站（Vue SPA） | Cloudflare Pages托管 |
| `api.zhihr.vip` | API服务器 | Workers路由 |
| `dev.zhihr.vip` (可选) | 开发预览分支 | GitHub自动部署 |
| `admin.zhihr.vip` (未来) | 管理后台 | 仅admin可访问 |

### 6.3 wrangler.toml 配置

```toml
# zhihr-hub/wrangler.toml
name = "zhihr-hub"
compatibility_date = "2026-05-01"
pages_build_output_dir = "dist"

[env.production]
name = "zhihr-hub-prod"
routes = [
  { pattern = "zhihr.vip/*", custom_domain = true }
]

[[d1_databases]]
binding = "DB"
database_name = "zhihr-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[[r2_buckets]]
binding = "FILES"
bucket_name = "zhihr-files"

[env.preview]
name = "zhihr-hub-preview"
routes = [
  { pattern = "dev.zhihr.vip/*", custom_domain = true }
]
```

### 6.4 灰度发布策略

```
阶段一：子域名内测
  app.zhihr.vip → 新SaaS站
  仅邀请内测用户 + 你自测

阶段二：主站并行
  zhihr.vip → 旧站继续运行（GitHub Pages）
  app.zhihr.vip → 新站运行
  旧站首页加"体验新版"入口

阶段三：逐步切换
  前1个月: 10%流量引到新站（Cloudflare负载均衡）
  第2个月: 50%流量
  第3个月: 100%流量
  旧站保留只读访问6个月

阶段四：完全退役
  数据迁移确认无误 → 关闭旧站
  zhihr.vip 域名指向 Cloudflare Pages
```

### 6.5 监控与告警

| 监控项 | 工具 | 告警阈值 |
|--------|------|---------|
| Workers错误率 | Cloudflare Analytics | >1% |
| API响应时间 | Cloudflare Analytics | p95 > 500ms |
| D1查询延迟 | Cloudflare Analytics | >200ms |
| 用户注册异常 | 自定义日志分析 | 1小时内注册>50 |
| R2存储用量 | Cloudflare Dashboard | 超过80%配额 |
| AI查询失败率 | ai_queries表分析 | >10% |

---

## 七、CI/CD 流水线

### 7.1 GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, preview]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run typecheck
      - run: pnpm run lint

  test:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm run test:unit

  deploy-preview:
    if: github.ref == 'refs/heads/preview'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm run build
      - name: Deploy to Cloudflare Pages (Preview)
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy dist --project-name=zhihr-hub --branch=preview

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm run build
      - name: Deploy to Production
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy dist --project-name=zhihr-hub --branch=main
      - name: D1 Migration
        run: npx wrangler d1 execute zhihr-db --file=./functions/db/migrations/$(date +%s).sql
```

### 7.2 环境变量管理

```bash
# 生产环境变量 (Cloudflare仪表盘/命令行设置)
npx wrangler secret put JWT_SECRET        # JWT签名密钥
npx wrangler secret put DEEPSEEK_API_KEY  # AI查询API密钥
npx wrangler secret put ENCRYPTION_KEY    # 数据加密密钥（可选）
npx wrangler secret put ADMIN_EMAIL       # 管理员邮箱

# 本地开发环境 (.dev.vars)
JWT_SECRET=dev-secret-do-not-use-in-prod
DEEPSEEK_API_KEY=sk-xxx
ENCRYPTION_KEY=dev-key-32bytes..........
```

---

## 八、分阶段实施计划

### 第一阶段：地基搭建（约3天）

> 重点：项目骨架跑通，能注册登录

```yaml
Day 1: 项目初始化
  - 创建 Vue 3 + Vite 项目
  - 安装全部依赖
  - 创建 Cloudflare Pages + Workers + D1 项目
  - 配置 wrangler.toml
  - 执行 schema.sql 建表
  - ✅ 里程碑: 本地 `pnpm run dev` + `wrangler dev` 双跑通

Day 2: 布局与路由
  - AppLayout.vue (Header + Sidebar + 内容区)
  - 主题切换 (Naive UI亮/暗模式)
  - Vue Router 配置（首页/登录/工具路由）
  - Axios 实例初始化 + 拦截器

Day 3: 用户系统
  - 后端: /v1/auth/register + /v1/auth/login + /v1/auth/me
  - 后端: JWT中间件
  - 前端: Login.vue + 注册页
  - 前端: useAuth.ts composable
  - 前端: 登录后重定向到首页
  - ✅ 里程碑: 能注册→登录→看到首页

### 第二阶段：数据层（约3天）

> 重点：统一数据API上线，AI接口打通

Day 4: 数据API
  - 后端: /v1/data CRUD
  - 后端: /v1/tools + /v1/instances 管理
  - 后端: 数据隔离中间件（强制 user_id 过滤）
  - 前端: useData.ts composable
  - ✅ 里程碑: 能通过API创建/读取数据

Day 5: 文件上传
  - 后端: /v1/data/import (Excel/CSV解析)
  - 后端: R2文件存储
  - 前端: FileUpload.vue (拖拽+进度)
  - ✅ 里程碑: 上传Excel → 解析 → 存D1 → 读出

Day 6: AI接口
  - 后端: /v1/ai/query (自然语言→SQL→结果)
  - 后端: /v1/ai/insights (自动数据洞察)
  - 前端: AiPanel.vue (聊天式交互)
  - ✅ 里程碑: "有多少员工" → AI理解 → 返回数据

### 第三阶段：迁移第一个工具（约3天）

> 重点：打磨组件复用流程，从最简单的漏斗开始

Day 7-8: 招聘漏斗
  - 实现 FunnelView.vue (ECharts漏斗图)
  - 复用 DataTable.vue + ChartCard.vue
  - 本地 localStorage 数据迁移到 D1
  - 接入 AiPanel

Day 9: 打磨+部署
  - 组件通用性调优
  - Cloudflare Pages部署
  - 子域名预览上线
  - ✅ 里程碑: 招聘漏斗在新SaaS架构上运行

### 第四阶段：迁移剩余工具（约8天）

Day 10-11: 数据看板 (员工花名册)
  - 复用 FileUpload + DataTable + ChartCard
  - 实现 DashboardView.vue

Day 12-13: 项目甘特图
  - 实现甘特图 ECharts 自定义渲染
  - 复用 DataTable 做任务列表

Day 14-15: 组织架构图
  - 实现 OrgChartView.vue

Day 16-17: 任务管理 + 复盘系统
  - TaskManagerView + ReviewView
  - 全部接入 AI 查询

### 第五阶段：安全加固 + 上线（约3天）

Day 18: 安全审计
  - 全面安全测试 (SQL注入/XSS/CSRF)
  - 密码策略验证
  - Rate Limiting 调优

Day 19: 数据加密
  - 可选：敏感数据 AES-256-GCM 加密
  - R2文件访问权限验证

Day 20: 正式切换
  - DNS配置、HTTPS检查
  - 旧站入口引导
  - 监控告警配置
  - ✅ 里程碑: zhihr.vip 正式指向SaaS版

---

## 九、关键技术决策记录

| # | 决策 | 选择 | 不选的理由 |
|---|------|------|-----------|
| 1 | 数据库 | D1 (SQLite) | 独立MySQL需维护，Firebase跨境慢 |
| 2 | 认证 | JWT + bcrypt | Session-Cookie不适合Workers无状态架构 |
| 3 | 数据存储 | 统一表 (tool_data) | 每工具建表 → 新增工具成本高 |
| 4 | 部署平台 | Cloudflare全家桶 | 零运维、免费额度高、全球CDN |
| 5 | 前端框架 | Vue 3 + Naive UI | 你熟悉Vue、中文文档好 |
| 6 | AI引擎 | DeepSeek API | 中文强、价格低、后续可换 |
| 7 | 数据加密 | 可选AES-256-GCM | 当前个人使用暂不需要，等有敏感数据再加 |
| 8 | 迁移策略 | 渐进式、子域名先行 | 一刀切风险大 |

---

## 十、FAQ & 常见问题

**Q: 我没做过SaaS，这个方案我搞得定吗？**
A: 完全可以。Cloudflare 全家桶把运维复杂度降到最低，你只需要关注业务代码。第一阶段"地基"做扎实后，后面就是拼乐高式的组件组装。

**Q: 数据在D1安全吗？会不会丢？**
A: D1 由 Cloudflare 管理，自动备份和冗余。再加上数据访问由 JWT 严格隔离，比你自己租VPS搭数据库安全得多。

**Q: 用户注册后怎么管理？内测阶段怎么控制？**
A: 初期可以在代码里加一个 `ALLOWED_EMAILS` 环境变量，只有指定邮箱能注册。正式开放时再去掉限制。

**Q: 旧站的数据怎么迁移？**
A: 每个工具的数据目前在 localStorage。写一个迁移脚本：用户登录 → 读取 localStorage → 批量 POST 到 /v1/data/batch → 清空 localStorage → 完成。一次性的操作。

**Q: 费用大概多少？**
A: Cloudflare免费套餐足够跑起来：Pages无限流量、Workers 10万请求/天、D1 5GB存储、R2 10GB。初期零成本运营。

---

> **总结：** 这个方案的核心思路是**渐进式**——不追求一步到位，而是先搭好数据库+API地基，然后从一个工具开始练手迁移，逐步把整个站点搬到SaaS架构上。最大的优势是全部在Cloudflare生态内，**零服务器运维成本**。

> 强哥，方案就是这样了。下一步你想：
> 1. **直接开工** — 搭环境、写代码
> 2. **调整方案** — 有些地方想改
> 3. **确认数据库/API先动手** — 地基先行

> —— 知涯 🦞