# 紧急部署步骤

API 返回 "Not found" 是因为反馈端点还没有部署到 Cloudflare Worker。请按照以下步骤操作：

---

## 步骤 1：确认 API 健康状态

在浏览器中访问：
```
https://zhihr-api.309588543.workers.dev/api/health
```

如果返回 `{"success":true,"message":"API is running"}`，说明 API 基本运行正常，但反馈端点需要更新。

---

## 步骤 2：更新 Cloudflare Worker 代码

1. 登录 Cloudflare：https://dash.cloudflare.com/
2. 进入 **Workers & Pages** → 选择 `zhihr-api`
3. 点击 **Edit code** 按钮
4. 打开本地文件 `api/src/index.js`
5. 全选所有代码（Ctrl+A / Cmd+A）
6. 复制（Ctrl+C / Cmd+C）
7. 粘贴到 Cloudflare 编辑器中（覆盖原有代码）
8. 点击右上角 **Save and deploy** 按钮
9. 等待部署完成

---

## 步骤 3：确认数据库表已创建

1. 在 Cloudflare 中进入 **Workers & Pages** → **D1** → 选择 `zhihr_db`
2. 点击 **Console** 标签
3. 执行以下 SQL 确认表存在：

```sql
SELECT name FROM sqlite_master WHERE type='table';
```

应该能看到 `feedbacks` 表。如果没有，执行：

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

---

## 步骤 4：测试反馈 API

部署完成后，在浏览器中测试：
```
https://zhihr-api.309588543.workers.dev/api/feedbacks
```

应该返回：
```json
{"success":true,"data":[]}
```

---

## 步骤 5：再次运行迁移工具

现在打开 `api/migrate-feedbacks.html` 再次尝试迁移。

---

## 常见问题

### Q: 部署后还是 Not found？

A: 可能是缓存问题，尝试强制刷新页面（Ctrl+Shift+R / Cmd+Shift+R），或者等待几分钟再试。

### Q: 数据库表创建失败？

A: 确保您在正确的数据库中执行 SQL，选择的是 `zhihr_db`。

### Q: 需要重新部署吗？

A: 是的，每次修改 `api/src/index.js` 后都需要重新部署到 Cloudflare。
