# Cloudflare 快速部署指南

## 前置准备
1. 已注册 Cloudflare 账号：https://dash.cloudflare.com/
2. 已安装 Node.js (v18+) 和 npm
3. 已安装 Wrangler CLI：`npm install -g wrangler`

---

## 步骤 1：登录 Cloudflare
在终端中进入 `api` 目录并登录：
```bash
cd api
wrangler login
```
浏览器会打开授权页面，点击「Allow」授权。

---

## 步骤 2：创建 D1 数据库
```bash
wrangler d1 create zhihr_db
```

**重要：执行后会输出类似这样的信息，复制 `database_id`：**
```
✅ Successfully created DB 'zhihr_db'
[...]
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
```

---

## 步骤 3：配置 wrangler.toml
打开 `api/wrangler.toml`，将第 11 行的 `YOUR_DATABASE_ID_HERE` 替换成刚才复制的 database_id：

```toml
[[d1_databases]]
binding = "DB"
database_name = "zhihr_db"
database_id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"  # ← 改成你的

[vars]
JWT_SECRET = "请改成一个至少32字符的强密码"  # ← 也改一下这个
```

---

## 步骤 4：安装依赖
```bash
npm install
```

---

## 步骤 5：初始化数据库表
```bash
npm run db:init
```

---

## 步骤 6：部署到 Cloudflare
```bash
npm run deploy
```

部署成功后会输出 Workers 地址，类似：
`https://zhihr-api.your-username.workers.dev`

**复制这个地址，下一步更新前端配置需要用。**

---

## 步骤 7：更新前端 API 地址

1. 打开 `task-manager/index.html`
2. 找到第 490 行左右的 `API_BASE_URL`
3. 改成刚才部署的 Workers 地址：

```javascript
const API_BASE_URL = 'https://zhihr-api.your-username.workers.dev';
```

---

## 步骤 8：提交并推送代码到 GitHub
GitHub Actions 会自动部署到 GitHub Pages。

---

## 完成！
现在您的架构是：
- 前端：GitHub Pages
- 后端：Cloudflare Workers + D1
