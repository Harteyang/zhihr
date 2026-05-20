# 反馈数据迁移指南

将首页现有的反馈数据迁移到新的 Cloudflare D1 数据库。

---

## 您的数据

您有 **7 条反馈数据**：
- ✅ **4 条已完成**：sunny、李哥、Jone、你的名字
- ⏳ **3 条待处理**：小李、兰姐、热心网友

---

## 最简单的迁移方法（推荐）

使用网页迁移工具，一键迁移所有数据！

### 步骤：

1. **打开迁移工具**：在浏览器中打开 `api/migrate-feedbacks.html`
2. **查看数据预览**：确认 7 条反馈数据都显示正确
3. **点击迁移按钮**：点击「迁移数据到数据库」
4. **验证结果**：点击「查看数据库中的所有反馈」确认迁移成功

---

## 手动迁移方法

如果您更喜欢手动迁移，按以下步骤：

### 步骤 1：在 Cloudflare D1 Console 中执行 SQL

1. 登录 Cloudflare：https://dash.cloudflare.com/
2. 进入 **Workers & Pages** → **D1** → 选择 `zhihr_db`
3. 点击 **Console** 标签

### 步骤 2：复制以下 SQL 并执行

```sql
-- 迁移所有 7 条反馈数据
INSERT OR IGNORE INTO feedbacks (id, name, content, status, created_at, updated_at) VALUES
    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'sunny', '你上次做的甘特图挺好看的，能做成工具吗？我们填填数就能生成。', 'completed', '2026-04-14T07:19:28.643Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), '李哥', '招聘漏斗确实是比较刚性的需求，可以做一个招聘漏斗，主要是漂亮的那种，填填数字就可以了。', 'completed', '2026-04-14T07:22:14.548Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), 'Jone', '最近组织结构变化大，老板需要实时的看到数据，能不能做一个快速画组织结构图的工具，要求简单，纯粹就是为了画组织结构图的。谢谢', 'completed', '2026-04-14T07:44:55.087Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), '小李', '需要一个固定的冰山模型的面试评价表，直接填写或者选择纬度，生成对应的评价。', 'pending', '2026-04-16T22:35:36.989Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), '兰姐', '周年庆和生日卡片很需要，自动生成祝福和卡片样式，内容可修改，能帮我提效。', 'pending', '2026-04-20T23:52:14.435Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), '热心网友', '需要一个盘点工具，雷达图那种，我收回表格后不用作图，直接填进去就能生成好看的图标和备注。', 'pending', '2026-04-24T00:59:43.760Z', CURRENT_TIMESTAMP),

    (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-a' || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))), '你的名字', '小弟需要一个任务管理工具，todolist那种。先谢过。', 'completed', '2026-05-08T07:15:47.154Z', CURRENT_TIMESTAMP);
```

### 步骤 3：验证迁移结果

```sql
SELECT * FROM feedbacks ORDER BY created_at DESC;
```

应该能看到所有 7 条反馈数据。

---

## 数据格式对比

**旧格式（JSONBin）：**
```json
{
  "id": "req_...",
  "name": "用户名",
  "content": "反馈内容",
  "time": "ISO时间",
  "status": "pending/completed"
}
```

**新格式（Cloudflare D1）：**
```json
{
  "id": "自动生成的UUID",
  "name": "用户名",
  "content": "反馈内容",
  "status": "pending/completed",
  "created_at": "ISO时间",
  "updated_at": "CURRENT_TIMESTAMP"
}
```

---

## 状态说明

- `pending` → 待处理（黄色标签）
- `processing` → 处理中（蓝色标签）
- `completed` → 已完成（绿色标签）
