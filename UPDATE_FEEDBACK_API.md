# 反馈系统迁移完成

已完成首页反馈系统的迁移，从 JSONBin.io 迁移到 Cloudflare D1 数据库。

---

## 主要修改

### 1. API 新增端点

在 `api/src/index.js` 中添加了以下端点：

- `GET /api/feedbacks` - 获取所有反馈（公开，无需认证）
- `POST /api/feedbacks` - 创建新反馈（公开，无需认证）
- `PUT /api/feedbacks/:id` - 更新反馈状态（可选）

### 2. 数据库表

在 `api/schema.sql` 中添加了 `feedbacks` 表：

```sql
CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '匿名',
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 3. 首页代码

修改了 `index.html` 中的反馈相关代码：

- 移除了 JSONBin.io API 配置
- 使用新的 Cloudflare Workers API
- 更新了数据结构和缓存逻辑

---

## 部署步骤

### 第一步：在 Cloudflare D1 中创建 feedbacks 表

1. 登录 Cloudflare：https://dash.cloudflare.com/
2. 进入 **Workers & Pages** → **D1** → 选择 `zhihr_db`
3. 点击 **Console** 标签
4. 复制并执行以下 SQL：

```sql
CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    name TEXT DEFAULT '匿名',
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
```

### 第二步：更新 Cloudflare Worker 代码

1. 进入 **Workers & Pages** → 选择 `zhihr-api`
2. 点击 **Edit code**
3. 打开本地的 `api/src/index.js` 文件
4. 复制全部内容
5. 粘贴到 Cloudflare 编辑器中
6. 点击 **Save and deploy**

### 第三步：更新 GitHub Pages

1. 提交代码到 GitHub：
```bash
git add .
git commit -m "迁移反馈系统到Cloudflare D1"
git push
```

2. GitHub Actions 会自动部署

---

## 完成！

现在反馈系统使用 Cloudflare D1 数据库存储，具有以下优势：

- ✅ 更快的响应速度
- ✅ 数据安全性更高
- ✅ 无需依赖第三方服务
- ✅ 支持更多数据
- ✅ 免费额度充足
