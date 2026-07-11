# 人才库管理系统

一个基于 Cloudflare Workers + D1 + R2 的轻量级人才库管理系统，支持候选人信息管理、简历解析、批量导入、多用户协作与权限控制。

## 功能特性

### 候选人管理
- 候选人信息的增删改查（姓名、联系方式、岗位、技能、学历、工作年限等）
- 多条件筛选：关键词、目标岗位、学历、工作年限区间、状态、来源
- 简历上传与自动解析（支持 PDF / Word / Excel）
- 工作经历的独立维护（时间线展示）
- 附件管理（原件存储于 R2，支持上传/下载/删除）
- 状态流转：待联系 → 已联系 → 面试中 → 已录用 / 已拒绝

### 批量导入
- 提供 Excel 模板下载
- 一次性导入多条候选人记录
- 导入结果明细报告（成功/失败条数及失败原因）

### 账号与权限
- 首位注册用户自动成为管理员，后续注册需管理员创建
- 角色分级：管理员（全部权限）/ 普通用户（仅限分配岗位）
- 岗位级数据隔离：普通用户只能查看被分配岗位的候选人
- 用户批量管理：批量启用/禁用、批量删除、批量分配岗位
- 操作日志：记录所有关键操作，支持按用户和操作类型筛选

### 安全保障
- JWT 令牌认证，密码 PBKDF2 哈希存储
- 所有 SQL 查询使用参数化占位符，防止注入
- 管理员操作全程记录日志，可追溯
- 自我保护：禁止删除/禁用自己的账号

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | Vue 3 + Element Plus + Pinia + Vue Router + Vite |
| 后端 | Cloudflare Workers（V8 isolate 运行时） |
| 数据库 | Cloudflare D1（SQLite 兼容） |
| 对象存储 | Cloudflare R2（简历原件） |
| 文件解析 | xlsx / unpdf / fflate（Workers 兼容） |
| 认证 | JWT（HS256）+ PBKDF2 密码哈希 |
| 部署 | 前端 GitHub Pages，后端 Cloudflare Workers |

## 目录结构

```
talent-pool/
├── client/                    # 前端项目
│   ├── src/
│   │   ├── api/index.js       # API 封装与 axios 拦截器
│   │   ├── components/        # 通用组件（StatusSelect, SkillTags, ExperienceForm）
│   │   ├── router/index.js    # 路由与导航守卫
│   │   ├── stores/            # Pinia 状态（auth, candidate）
│   │   ├── utils/constants.js # 状态/学历/年限常量
│   │   ├── views/             # 页面视图
│   │   │   ├── Login.vue
│   │   │   ├── CandidateList.vue
│   │   │   ├── CandidateForm.vue
│   │   │   ├── CandidateDetail.vue
│   │   │   ├── BatchImport.vue
│   │   │   ├── UserList.vue
│   │   │   ├── UserForm.vue
│   │   │   └── OperationLogs.vue
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md

api/                           # 后端项目（已有，人才库模块集成其中）
├── src/
│   ├── modules/
│   │   ├── talent.js          # 候选人 CRUD + 工作经历 + 附件 + 批量导入
│   │   ├── talent_auth.js     # 用户管理 + 岗位权限 + 操作日志 + 批量操作
│   │   ├── talent_parsers.js  # Workers 兼容的文件解析
│   │   └── auth.js            # 认证（登录/注册/me）
│   ├── utils/router.js        # 路由匹配 + 认证中间件 + JWT + 密码哈希
│   └── index.js               # Worker 入口
├── schema.sql                 # D1 建表语句（含 talent_* 表）
└── wrangler.toml              # Workers 配置（D1/R2 绑定）
```

## 本地开发

### 前置要求
- Node.js 18+
- Cloudflare 账号（用于 D1 数据库和 R2 存储桶）

### 后端启动

```bash
cd api
npm install

# 配置 wrangler.toml 中的 D1 数据库绑定和 R2 存储桶绑定
# 首次需执行数据库迁移
npx wrangler d1 execute zhihr_db --file=./schema.sql
npx wrangler d1 execute zhihr_db --file=./migrations/001_talent_pool_users.sql

# 设置 JWT 密钥
npx wrangler secret put JWT_SECRET

# 本地开发（含 D1/R2 本地模拟）
npx wrangler dev
```

后端默认运行在 `http://localhost:8787`。

### 前端启动

```bash
cd talent-pool/client
npm install
npm run dev
```

前端默认运行在 `http://localhost:5174`，已配置 `/api` 代理到后端 `localhost:8787`。

### 账号初始化

系统首次启动时数据库无用户，**第一个注册的账号自动成为管理员**。后续注册接口将被拒绝，新用户需由管理员在「用户管理」页面创建。

访问 `http://localhost:5174/talent-pool/login`，切换到注册模式创建首个管理员账号。

## 部署

### 前端部署（GitHub Pages）

前端通过 GitHub Actions 自动部署到 GitHub Pages，访问地址：`https://zhihr.vip/talent-pool/`

CI 构建时通过环境变量配置 API 地址：
- `VITE_BASE`：部署子路径，固定为 `/talent-pool/`
- `VITE_API_BASE`：后端 API 地址，通过 GitHub Secret `TALENT_POOL_API_BASE_URL` 配置（如 `https://api.zhihr.vip/api`）

### 后端部署（Cloudflare Workers）

```bash
cd api
npx wrangler deploy
```

后端部署到自定义域名 `api.zhihr.vip`，需在 Cloudflare Dashboard 配置 Custom Domain。

### 所需 Cloudflare 资源

| 资源 | 名称 | 用途 |
|------|------|------|
| D1 数据库 | `zhihr_db` | 结构化数据存储，表前缀 `talent_` |
| R2 存储桶 | `talent-pool-resumes` | 简历原件存储 |
| Worker Secret | `JWT_SECRET` | JWT 签名密钥 |
| 环境变量 | `ALLOWED_ORIGINS` | CORS 允许的源（逗号分隔） |

## API 概览

### 认证
- `POST /api/auth/register` - 注册（仅首位用户可用）
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户信息

### 候选人
- `GET /api/talent/candidates` - 列表（支持筛选分页）
- `GET /api/talent/candidates/filter-options` - 筛选项
- `GET /api/talent/candidates/:id` - 详情
- `POST /api/talent/candidates` - 新增
- `PUT /api/talent/candidates/:id` - 更新
- `PATCH /api/talent/candidates/:id/status` - 更新状态
- `DELETE /api/talent/candidates/:id` - 删除（管理员）
- `POST /api/talent/candidates/parse-resume` - 解析简历
- `POST /api/talent/candidates/import` - 批量导入（管理员）
- `GET /api/talent/candidates/import/template` - 下载模板（管理员）

### 工作经历
- `GET /api/talent/candidates/:id/experiences`
- `POST /api/talent/candidates/:id/experiences`
- `PUT /api/talent/candidates/:id/experiences/:expId`
- `DELETE /api/talent/candidates/:id/experiences/:expId`

### 附件
- `GET /api/talent/candidates/:id/attachments`
- `POST /api/talent/candidates/:id/attachments` - 上传
- `DELETE /api/talent/candidates/:id/attachments/:attachId`
- `GET /api/talent/attachments/:attachId/download`

### 用户管理（管理员）
- `GET /api/auth/users`
- `POST /api/auth/users`
- `PUT /api/auth/users/:id`
- `DELETE /api/auth/users/:id`
- `PATCH /api/auth/users/:id/status`
- `GET /api/auth/users/:id/positions`
- `PUT /api/auth/users/:id/positions`
- `PATCH /api/auth/users/batch/status` - 批量启用/禁用
- `POST /api/auth/users/batch/delete` - 批量删除
- `PUT /api/auth/users/batch/positions` - 批量分配岗位

### 操作日志（管理员）
- `GET /api/auth/operation-logs`

## 权限模型

| 操作 | 管理员 | 普通用户 |
|------|--------|----------|
| 查看候选人 | 全部 | 仅分配岗位 |
| 新增/编辑候选人 | 全部岗位 | 仅分配岗位 |
| 删除候选人 | 是 | 否 |
| 批量导入 | 是 | 否 |
| 用户管理 | 是 | 否 |
| 操作日志 | 是 | 否 |

普通用户的岗位权限通过 `talent_user_positions` 表管理，管理员默认无限制。
