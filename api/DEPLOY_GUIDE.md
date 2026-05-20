# 知HR API 部署指南

## 前提条件

1. 注册 Cloudflare 账号：https://dash.cloudflare.com/
2. 安装 Node.js (v18+) 和 npm
3. 安装 Wrangler CLI：`npm install -g wrangler`

## 完整部署步骤

### 1. 登录 Cloudflare

```bash
cd api
wrangler login
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create zhihr_db
```

执行后会输出类似这样的信息：
```
✅ Successfully created DB 'zhihr_db'
[...]
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**重要：复制输出的 database_id，下一步需要用到。**

### 3. 配置 wrangler.toml

编辑 `wrangler.toml` 文件，将第 11 行的 `YOUR_DATABASE_ID_HERE` 替换为上一步获取的 database_id：

```toml
[[d1_databases]]
binding = "DB"
database_name = "zhihr_db"
database_id = "your-actual-database-id-here"  # 替换这里

[vars]
JWT_SECRET = "your-256-bit-secret-key-here-change-in-production"  # 建议修改为强密钥
```

同时，建议将 JWT_SECRET 修改为一个强密码（至少32字符）。

### 4. 安装依赖

```bash
npm install
```

### 5. 初始化数据库表

```bash
npm run db:init
```

### 6. 测试开发环境

```bash
npm run dev
```

访问 http://localhost:8787/api/health 验证服务是否正常运行，应该会返回：
```json
{"success":true,"message":"API is running"}
```

### 7. 部署到 Cloudflare

```bash
npm run deploy
```

部署成功后会输出 Workers 地址，类似：
`https://zhihr-api.your-username.workers.dev`

## 更新前端 API 地址

将 `task-manager/index.html` 中的 API_BASE_URL 更新为实际部署地址：

```javascript
const API_BASE_URL = 'https://zhihr-api.your-username.workers.dev';
```

## API 端点

### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取用户信息

### 任务管理
- `GET /api/tasks` - 获取任务列表
- `POST /api/tasks` - 创建任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

### 分类管理
- `GET /api/categories` - 获取分类列表
- `POST /api/categories` - 创建分类
- `DELETE /api/categories/:id` - 删除分类

### 复盘管理
- `GET /api/reviews` - 获取复盘列表
- `POST /api/reviews` - 创建复盘
- `PUT /api/reviews/:id` - 更新复盘
- `DELETE /api/reviews/:id` - 删除复盘

### 配置管理
- `GET /api/config` - 获取用户配置
- `PUT /api/config` - 更新用户配置

### 健康检查
- `GET /api/health` - 服务健康检查

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| JWT_SECRET | JWT 签名密钥 | - |

## 免费额度

- Cloudflare Workers: 100,000 次请求/天
- Cloudflare D1: 100,000 次读写/天，1GB 存储

## 安全建议

1. 生产环境使用强 JWT_SECRET（至少32字符）
2. 配置 CORS 允许的域名
3. 定期备份数据库
4. 启用 Cloudflare Analytics 监控

## 常见问题

### 数据库操作失败？
确保已正确配置 `wrangler.toml` 中的 `database_id`，并且已执行 `npm run db:init` 初始化表结构。

### 本地开发时数据库问题？
本地开发可以使用 `wrangler dev --local` 或配置本地 D1 数据库，或者直接部署后使用远程数据库。
