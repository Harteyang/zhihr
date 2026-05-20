# Cloudflare 网页后台部署指南

完全在网页浏览器中操作，不需要命令行！

---

## 第一步：创建 D1 数据库

1. 登录 Cloudflare 账号：https://dash.cloudflare.com/
2. 点击左侧菜单的 **「Workers & Pages」**
3. 点击顶部的 **「D1」** 标签页
4. 点击 **「Create database」** 按钮
5. 数据库名称输入：`zhihr_db`
6. 点击 **「Create」**

创建成功后，您会看到数据库详情页，记下 **Database ID**（类似 `a1b2c3d4-e5f6-7890-abcd-ef1234567890`），后面需要用到。

---

## 第二步：在 D1 数据库中创建表

在刚才创建的数据库详情页：

1. 点击 **「Console」** 标签页
2. 打开您本地的 [api/schema.sql](file:///Users/yq/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/zhihr/api/schema.sql) 文件
3. 将里面的 SQL 语句一段一段复制粘贴到 Console 的输入框中，按 **「Enter」** 执行，或者一次性全部执行：

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT '待办',
    priority TEXT DEFAULT '中',
    due_date TEXT,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, name)
);

-- 复盘记录表
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    review_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户配置表
CREATE TABLE IF NOT EXISTS user_configs (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    config TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
```

执行完毕后，点击左侧菜单的 **「Workers & Pages」** 回到主页面。

---

## 第三步：创建 Worker

1. 在 **Workers & Pages** 页面，点击 **「Create application」**
2. 选择 **「Create Worker」** 标签页
3. Worker 名称输入：`zhihr-api`
4. 点击 **「Deploy」**（会用默认代码部署，后面我们会替换）

部署成功后，点击 **「Edit code」** 按钮进入代码编辑页面。

---

## 第四步：配置 D1 数据库绑定

在 Worker 编辑页面：

1. 点击左侧的 **「Settings」** 标签
2. 点击 **「Variables」**
3. 向下滚动到 **「D1 Database Bindings」** 部分
4. 点击 **「Add binding」**
5. **Variable name** 输入：`DB`
6. **D1 database** 选择刚才创建的 `zhihr_db`
7. 点击 **「Save」**

### 配置环境变量（JWT_SECRET）

1. 在同一个 **Settings > Variables** 页面
2. 找到 **「Environment Variables」** 部分
3. 点击 **「Add variable」**
4. **Variable name** 输入：`JWT_SECRET`
5. **Value** 输入一个强密码（至少32字符，比如随机生成一串）
6. 点击 **「Encrypt」**（可选但推荐）
7. 点击 **「Save」**

---

## 第五步：部署代码

1. 在 Worker 编辑页面，点击左侧的 **「Editor」** 标签
2. 打开您本地的 [api/src/index.js](file:///Users/yq/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/zhihr/api/src/index.js) 文件
3. 全选并复制所有代码
4. 回到 Cloudflare 编辑页面，删除左侧 `src/index.js` 里的所有内容，粘贴您复制的代码
5. 点击右上角的 **「Save and deploy」** 按钮
6. 确认后再次点击 **「Save and deploy」**

---

## 第六步：测试和获取地址

部署成功后，您会在页面顶部看到 Worker 的访问地址，类似：
`https://zhihr-api.your-username.workers.dev`

**复制这个地址！**

可以在浏览器访问测试：`https://zhihr-api.your-username.workers.dev/api/health`

应该返回：`{"success":true,"message":"API is running"}`

---

## 第七步：更新前端配置

1. 打开本地的 [task-manager/index.html](file:///Users/yq/Library/Mobile%20Documents/com~apple~CloudDocs/Documents/zhihr/task-manager/index.html)
2. 找到第 490 行左右的 `API_BASE_URL`
3. 改成刚才的 Worker 地址：

```javascript
const API_BASE_URL = 'https://zhihr-api.your-username.workers.dev';
```

4. 保存文件，提交并推送到 GitHub，GitHub Pages 会自动更新。

---

## 完成！

现在您的架构是：
- 前端：GitHub Pages
- 后端：Cloudflare Workers + D1
