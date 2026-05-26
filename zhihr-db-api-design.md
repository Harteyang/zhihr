# 知HR · 数据库与API 详细设计

> 版本：v1.0
> 设计原则：统一、可扩展、AI友好、纯个人使用

---

## 第一章：数据库设计（D1 / SQLite）

### 1.1 整体架构

```
6张表，各司其职：

┌──────────────────────────────────────────────────────────┐
│  用户层                                                    │
│  users ─── 用户账号（纯个人使用，也支持少量账号共存）         │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│  工具定义层         │                                      │
│  tools ─── 系统工具定义（名称、图标、路由、颜色）            │
│         每个用户看到的是同一套工具列表                       │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│  用户实例层         │                                      │
│  tool_instances ── 用户创建的工具实例                       │
│  比如：用户可以有3个甘特图（Q1/Q2/Q3项目）                   │
│        也可以有5份花名册（不同月份导入）                     │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│  数据层（核心！）    │                                      │
│  tool_data ─────── 一张表存所有工具的所有数据                │
│                  以 data_type 区分，data 字段存 JSON        │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────┼──────────────────┐                   │
│  ai_queries ─── AI查询审计日志        │                   │
│  feedbacks ─── 用户需求反馈           │                   │
└───────────────────────────────────────┘                   │
```

### 1.2 完整建表语句

```sql
-- =====================================
-- 1. 用户表
-- =====================================
-- 纯个人使用，但保留多账号能力。
-- 你（强哥）是管理员账号，未来可开放给朋友注册。
CREATE TABLE users (
  id            TEXT PRIMARY KEY,              -- UUID v4
  username      TEXT UNIQUE NOT NULL,          -- 登录名
  password_hash TEXT NOT NULL,                 -- bcrypt 哈希
  display_name  TEXT,                          -- 显示名（如"强哥"）
  email         TEXT,                          -- 邮箱（找回密码用）
  role          TEXT DEFAULT 'user',           -- 'admin' | 'user'
  avatar_url    TEXT,                          -- 头像链接
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =====================================
-- 2. 工具定义表
-- =====================================
-- 系统级，预置所有工具的定义。
-- 控制首页拼图网格显示什么工具、什么颜色、跳转到哪里。
CREATE TABLE tools (
  id            TEXT PRIMARY KEY,              -- 短标识，如 'gantt'
  name          TEXT NOT NULL,                 -- 显示名，如"项目甘特图"
  description   TEXT,                          -- 工具描述
  icon          TEXT,                          -- Lucide 图标名
  color_start   TEXT,                          -- 拼图渐变起始色
  color_end     TEXT,                          -- 拼图渐变结束色
  route         TEXT,                          -- 前端路由路径
  status        TEXT DEFAULT 'active',         -- 'active' | 'beta' | 'coming-soon'
  sort_order    INTEGER DEFAULT 0,             -- 排序序号
  data_types    JSON DEFAULT '[]',             -- 该工具使用的 data_type 列表
  /*
    data_types 示例：
    ['gantt_project', 'gantt_task']
    作用：AI 查询时知道哪些 data_type 属于哪个工具
  */
  created_at    TEXT DEFAULT (datetime('now'))
);

-- 预置数据（初始化时插入）
-- INSERT INTO tools VALUES
--   ('gantt',       '项目甘特图',     '可视化项目进度',          'gantt-chart',     '#E74C3C', '#C0392B', '/tools/gantt',       'active', 1, '["gantt_project","gantt_task"]',          datetime('now')),
--   ('dashboard',   '员工数据看板',   '花名册可视化',            'users',           '#3498DB', '#2980B9', '/tools/dashboard',   'active', 2, '["roster"]',                             datetime('now')),
--   ('org-chart',   '组织架构图',     '团队结构一目了然',        'network',         '#27AE60', '#1E8449', '/tools/org-chart',   'active', 3, '["org_chart"]',                          datetime('now')),
--   ('funnel',      '招聘漏斗',       '转化流程分析',            'filter',          '#F39C12', '#D68910', '/tools/funnel',      'active', 4, '["funnel_stage","funnel_record"]',       datetime('now')),
--   ('task-manager','任务管理工具',   '任务清单管理',            'check-square',    '#10B981', '#059669', '/tools/task-manager', 'active', 5, '["todo_list","todo_item"]',              datetime('now')),
--   ('review',      '复盘系统',       '结构化复盘与回顾',        'clipboard-check', '#6366F1', '#4F46E5', '/tools/review',      'active', 6, '["review_session","review_item"]',        datetime('now')),
--   ('radar',       '盘点工具',       '人才盘点雷达图',          'radar',           '#FF6B6B', '#EE5A24', '/tools/radar',       'coming-soon', 7, '["radar_assessment"]',                   datetime('now')),
--   ('birthday',    '卡片生成',       '生日/周年庆祝福卡片',     'gift',            '#A29BFE', '#6C5CE7', '/tools/birthday',    'coming-soon', 8, '["birthday_template","birthday_card"]',  datetime('now'));

-- =====================================
-- 3. 工具实例表（核心业务表）
-- =====================================
-- 用户创建的每个工具"副本"。
-- 甘特图可以有多个（不同项目），花名册可以有多个（不同月份）。
CREATE TABLE tool_instances (
  id            TEXT PRIMARY KEY,              -- UUID v4
  user_id       TEXT NOT NULL REFERENCES users(id),
  tool_id       TEXT NOT NULL REFERENCES tools(id),
  name          TEXT NOT NULL,                 -- 实例名称（用户自定义）
  description   TEXT,                          -- 备注说明
  config        JSON DEFAULT '{}',             -- 实例配置
  /*
    config 字段示例：
    甘特图：{"project_name":"PMO工具研发","start_date":"2026-05-25","total_weeks":14}
    看板：  {"department_filter":"销售部","date_range":"2026-Q1"}
    漏斗：  {"recruitment_period":"2026年春季","target_hires":50}
  */
  is_active     INTEGER DEFAULT 1,             -- 软删除标记
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_instances_user ON tool_instances(user_id);
CREATE INDEX idx_instances_tool ON tool_instances(tool_id);

-- =====================================
-- 4. 统一数据表（灵魂！）
-- =====================================
-- 所有工具的所有数据都在这。
-- data_type 分类，data 存 JSON，灵活扩展。
CREATE TABLE tool_data (
  id            TEXT PRIMARY KEY,              -- UUID v4
  instance_id   TEXT NOT NULL REFERENCES tool_instances(id),
  user_id       TEXT NOT NULL REFERENCES users(id),
  data_type     TEXT NOT NULL,                 -- 数据类型标识
  /*
    data_type 枚举（按工具分组）：

    甘特图相关：
      'gantt_project'  — 项目元信息（名称/周期/进度）
      'gantt_task'     — 任务列表（每条记录含多个任务，或每个任务单独一条）

    数据看板相关：
      'roster'         — 花名册数据（按导入批次存储）

    组织架构图相关：
      'org_chart'      — 组织结构节点数据

    招聘漏斗相关：
      'funnel_stage'   — 漏斗阶段配置+数字
      'funnel_record'  — 候选人的详细记录

    任务管理相关：
      'todo_list'      — 任务清单
      'todo_item'      — 清单中的具体任务

    复盘系统相关：
      'review_session' — 复盘会议/周期
      'review_item'    — 复盘条目

    盘点工具相关（待开发）：
      'radar_assessment' — 雷达图数据（维度+评分）

    生日卡片相关（待开发）：
      'birthday_template' — 卡片模板
      'birthday_card'     — 生成的卡片

    冰山模型相关（待开发）：
      'interview_eval'    — 面试评价数据
  */
  data          JSON NOT NULL,                 -- 实际数据
  source        TEXT DEFAULT 'manual',          -- 'manual' | 'upload' | 'ai_generated'
  file_url      TEXT,                          -- 如果从文件上传，存R2链接
  version       INTEGER DEFAULT 1,             -- 数据版本号（支持回溯）
  labels        JSON DEFAULT '[]',              -- 标签数组（便于AI检索+分类）
  /*
    labels 示例：
    ['Q2', '2026', '重点项目']
    作用：AI 查询时可以按标签筛选
    "帮我查一下Q2的项目进度"
  */
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 核心查询索引（性能保障）
CREATE INDEX idx_data_instance ON tool_data(instance_id);
CREATE INDEX idx_data_user    ON tool_data(user_id);
CREATE INDEX idx_data_type    ON tool_data(data_type);
CREATE INDEX idx_data_labels  ON tool_data( (json_extract('$.labels')) );

-- =====================================
-- 5. AI查询日志表
-- =====================================
-- 记录所有 AI 查询，用于审计和持续优化。
CREATE TABLE ai_queries (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  query_text    TEXT NOT NULL,                 -- 用户原始问题
  sql_generated TEXT,                          -- 生成的SQL
  result_text   TEXT,                          -- AI总结的结果
  data_summary  TEXT,                          -- 数据摘要（少量数据时直接返回）
  tokens_used   INTEGER,                       -- 消耗token数
  latency_ms    INTEGER,                       -- 延迟
  is_successful INTEGER DEFAULT 1,             -- 是否成功
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_queries_user ON ai_queries(user_id);

-- =====================================
-- 6. 需求反馈表（保留现有功能）
-- =====================================
CREATE TABLE feedbacks (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id),
  name          TEXT,                          -- 提交者名字
  content       TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',        -- 'pending' | 'processing' | 'completed'
  created_at    TEXT DEFAULT (datetime('now'))
);
```

### 1.3 数据示例

**甘特图数据在数据库中的样子：**

```json
// tool_data 记录 #1 (data_type='gantt_project')
{
  "project_name": "PMO工具研发",
  "start_date": "2026-05-25",
  "end_date": "2026-08-30",
  "total_weeks": 14,
  "current_week": 1,
  "phases": ["前期准备", "开发阶段", "测试阶段", "收尾阶段"]
}

// tool_data 记录 #2 (data_type='gantt_task')
[
  {
    "id": "t001",
    "name": "项目规划",
    "status": "in_progress",
    "start_week": 1,
    "duration_weeks": 3,
    "phase": "前期准备"
  },
  {
    "id": "t002",
    "name": "需求分析",
    "status": "pending",
    "start_week": 1,
    "duration_weeks": 3,
    "phase": "前期准备"
  }
]
```

**花名册数据：**
```json
// tool_data (data_type='roster')
{
  "columns": ["姓名", "部门", "职位", "入职日期", "状态", "职级"],
  "rows": [
    ["张三", "销售部", "销售经理",  "2023-01-15", "在职", "P7"],
    ["李四", "技术部", "高级工程师", "2022-06-01", "在职", "P8"],
    ["王五", "产品部", "产品经理",  "2024-03-10", "试用期", "P6"]
  ],
  "source_file": "花名册_202605.xlsx",
  "imported_at": "2026-05-26T10:30:00Z",
  "row_count": 150
}
```

**招聘漏斗数据：**
```json
// tool_data (data_type='funnel_stage')
{
  "stages": [
    {"name": "简历投递", "count": 1280,  "color": "#5470c6"},
    {"name": "简历筛选", "count": 560,   "color": "#91cc75"},
    {"name": "初试通过", "count": 280,   "color": "#fac858"},
    {"name": "复试通过", "count": 98,    "color": "#ee6666"},
    {"name": "录用",     "count": 45,    "color": "#73c0de"},
    {"name": "到岗",     "count": 40,    "color": "#ff9f7f"}
  ],
  "period": "2026年Q2社招",
  "target_hires": 60
}
```

### 1.4 核心设计理念

**1.4.1 为什么一张表存所有数据？**

传统做法：每个工具一张表（gantt_tasks、rosters、funnel_stages...）

但这对你这个项目来说有3个致命伤：
1. 🔴 每增加一个工具就要新建一张表 + 写一套 CRUD → 开发成本高
2. 🔴 AI 查询时不知道去哪个表查 → 需要额外配置表映射
3. 🔴 跨工具数据分析需要 JOIN 多张表 → 查询复杂

**统一表方案（tool_data）就是针对这3个问题的：**
1. ✅ 新增工具只需新增一个 data_type 值，不需要建表
2. ✅ AI 只需知道一个表名 + data_type 的枚举值
3. ✅ 跨工具数据放在一起，一个 SQL 就能查"花名册销售部的入职日期 vs 甘特图销售项目的进度"

**1.4.2 为什么要有 tool_instances 表？**

没有 instance 表会怎样？
```
tool_data 里直接存数据 → 没有"分组"概念
→ 你有3个甘特图项目，怎么区分？
→ 靠标签？不规范，容易乱
```

有 instance 表的好处：
- 一个甘特图项目 = 一个 instance，下面挂多条 data 记录
- 一个花名册导入批次 = 一个 instance
- 实例可以命名、配置、删除（级联删除所有数据）
- 前端路由直接按 instance_id 加载数据

**1.4.3 标签系统（labels）**

`tool_data.labels` 字段存 JSON 数组：
```json
["Q2", "2026", "重点项目"]
```

作用：让 AI 或用户按标签快速筛选数据。
API 查询时支持：`GET /v1/data?labels=Q2,重点项目`

---

## 第二章：API 设计

### 2.1 基础规范

```
Base URL:     https://api.zhihr.vip/v1
Content-Type: application/json
认证方式:     Bearer JWT Token（从 /v1/auth/login 获取）
响应格式:     统一包裹
```

### 2.2 统一响应格式

```json
// 成功
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 150
  }
}

// 失败
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "data_type 不能为空"
  }
}
```

### 2.3 完整接口列表

#### 2.3.1 认证（Auth）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/v1/auth/register` | 注册新账号 | ❌ |
| POST | `/v1/auth/login` | 登录，返回JWT | ❌ |
| POST | `/v1/auth/refresh` | 刷新Token | ✅ |
| GET | `/v1/auth/me` | 获取当前用户信息 | ✅ |
| PUT | `/v1/auth/me` | 更新个人信息 | ✅ |

**注册请求体：**
```json
{
  "username": "yq",
  "password": "********",
  "display_name": "强哥"
}
```

**登录响应：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGci...（JWT）",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "username": "yq",
      "display_name": "强哥",
      "role": "admin"
    }
  }
}
```

#### 2.3.2 工具定义（Tools）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/v1/tools` | 获取所有可用工具列表 | ✅ |
| GET | `/v1/tools/:id` | 获取单个工具详情 | ✅ |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "gantt",
      "name": "项目甘特图",
      "description": "可视化项目进度",
      "icon": "gantt-chart",
      "color_start": "#E74C3C",
      "color_end": "#C0392B",
      "route": "/tools/gantt",
      "status": "active",
      "sort_order": 1,
      "data_types": ["gantt_project", "gantt_task"]
    }
  ]
}
```

#### 2.3.3 工具实例（Instances）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/v1/instances` | 获取当前用户所有实例 | ✅ |
| POST | `/v1/instances` | 创建新实例 | ✅ |
| GET | `/v1/instances/:id` | 获取实例详情 | ✅ |
| PUT | `/v1/instances/:id` | 更新实例 | ✅ |
| DELETE | `/v1/instances/:id` | 删除实例（级联删除所有关联数据） | ✅ |

**创建实例请求体：**
```json
{
  "tool_id": "gantt",
  "name": "Q2 PMO工具研发项目",
  "description": "PMO工具研发项目甘特图",
  "config": {
    "project_name": "PMO工具研发",
    "start_date": "2026-05-25",
    "total_weeks": 14
  }
}
```

#### 2.3.4 数据（Data）— 核心接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/v1/data` | 查询数据（支持筛选） | ✅ |
| POST | `/v1/data` | 创建单条数据 | ✅ |
| PUT | `/v1/data/:id` | 更新数据 | ✅ |
| DELETE | `/v1/data/:id` | 删除数据 | ✅ |
| POST | `/v1/data/batch` | 批量操作 | ✅ |
| POST | `/v1/data/import` | 上传文件并解析 | ✅ |
| GET | `/v1/data/export` | 导出数据为CSV/JSON | ✅ |

**查询参数：**
```
GET /v1/data?instance_id=xxx
GET /v1/data?data_type=gantt_task
GET /v1/data?labels=Q2,重点项目
GET /v1/data?search=销售部（全文搜索data字段）
GET /v1/data?page=1&page_size=20
```

**创建单条数据：**
```json
// POST /v1/data
{
  "instance_id": "instance-uuid",
  "data_type": "gantt_task",
  "data": { ... },
  "source": "manual",
  "labels": ["Q2", "PMO"]
}
```

**批量操作（新增工具时批量初始化数据）：**
```json
// POST /v1/data/batch
{
  "operations": [
    { "action": "create", "data_type": "gantt_task", "instance_id": "xxx", "data": {...} },
    { "action": "create", "data_type": "gantt_task", "instance_id": "xxx", "data": {...} },
    { "action": "update", "id": "data-id", "data": {...} },
    { "action": "delete", "id": "data-id" }
  ]
}
```

**文件导入（花名册上传场景）：**
```json
// POST /v1/data/import
// Content-Type: multipart/form-data
// Body: file=@花名册.xlsx, instance_id=xxx, data_type=roster

// 响应
{
  "success": true,
  "data": {
    "id": "新tool_data记录ID",
    "columns": ["姓名", "部门", ...],
    "row_count": 150,
    "preview": [ ... ]  // 前5行预览
  }
}
```

#### 2.3.5 AI 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/v1/ai/query` | 自然语言查询HR数据 | ✅ |
| POST | `/v1/ai/insights` | 智能扫描+自动发现洞察 | ✅ |
| GET | `/v1/ai/schema` | 获取数据库Schema（给AI做上下文） | ✅ |
| GET | `/v1/ai/history` | 查询历史AI对话记录 | ✅ |

**AI 查询——最核心的接口：**

```json
// POST /v1/ai/query
{
  "query": "销售部有多少人？",
  "context": {
    "instance_ids": [],     // 可选，限定查询范围
    "data_types": []        // 可选，限定数据类型
  }
}

// 响应
{
  "success": true,
  "data": {
    "sql": "SELECT COUNT(*) FROM tool_data WHERE data_type='roster' AND user_id='xxx' AND json_extract(data, '$.rows[*][1]') = '销售部'",
    "result": {
      "count": 45,
      "preview": [
        {"姓名": "张三", "部门": "销售部", "职位": "销售经理", "状态": "在职"},
        {"姓名": "赵六", "部门": "销售部", "职位": "销售代表", "状态": "在职"}
      ]
    },
    "summary": "销售部当前共有45名员工，全部为在职状态。"
  }
}
```

**AI 查询的工作流程：**

```
用户提问："销售部多少人？"
         ↓
前端 POST /v1/ai/query
         ↓
Workers 收到请求
  → 获取用户信息
  → 查询 /v1/ai/schema（获取表结构+data_type枚举）
  → 查询用户的所有 tool_data 摘要（表结构有了，数据长啥样也有了）
  → 打包上下文（Schema + 数据摘要 + 用户问题）
  → 调用 LLM（如 DeepSeek）
  → LLM 返回 SQL 查询
  → Workers 执行 SQL
  → 结果返回给 LLM 做自然语言总结
  → 记录到 ai_queries 表
  → 返回给前端
         ↓
前端展示：表格 + 文字总结
```

**AI 自动洞察：**
```json
// POST /v1/ai/insights
{
  "scope": "all"  // 或 ["gantt", "dashboard"]
}

// 响应
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "alert",
        "title": "招聘漏斗到岗率仅66.7%",
        "detail": "录用45人，实际到岗40人，到岗率66.7%",
        "data_type": "funnel_stage",
        "instance_id": "xxx"
      },
      {
        "type": "info",
        "title": "销售部占比最大",
        "detail": "全公司150人中销售部45人，占比30%",
        "data_type": "roster"
      },
      {
        "type": "trend",
        "title": "Q2项目进度偏慢",
        "detail": "甘特图'PMO工具研发'项目已开始1周，7个任务中1个进行中6个未开始",
        "data_type": "gantt_task"
      }
    ],
    "generated_at": "2026-05-26T12:00:00Z"
  }
}
```

#### 2.3.6 需求反馈（Feedbacks）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/v1/feedbacks` | 获取反馈列表 | ❌ |
| POST | `/v1/feedbacks` | 提交新反馈 | ❌ |
| PUT | `/v1/feedbacks/:id` | 更新反馈状态（管理员） | ✅ |

> 注意：反馈接口保持开放（无需登录），因为网站首页的"提交需求"表单对所有人开放。

### 2.4 与旧API的兼容

旧版 API 路径：
```
/api/feedbacks   → 保持不变，继续服务旧首页
/api/auth/login  → 保持不变，继续服务旧首页
```

新版 API 路径：
```
/v1/*  → Cloudflare Workers 上新增路由
```

**过渡期做法：** Workers 上同时保留两套路由，旧版 `/api/*` 不动，新版 `/v1/*` 新增。

---

## 第三章：数据流示例（完整场景）

### 场景1：导入花名册并用AI查询

```
1. 用户登录
   POST /v1/auth/login → 获取 JWT Token

2. 创建"花名册"实例
   POST /v1/instances
   { "tool_id": "dashboard", "name": "2026年5月花名册" }

3. 上传Excel文件
   POST /v1/data/import
   → Workers 解析 Excel 为 JSON
   → 存到 tool_data (data_type='roster')
   → 返回前5行预览

4. AI查询
   POST /v1/ai/query
   { "query": "统计各部门人数和占比" }
   → AI 生成 SQL，执行，返回结果
```

### 场景2：新建甘特图 + 添加任务

```
1. 创建甘特图实例
   POST /v1/instances
   { "tool_id": "gantt", "name": "Q3新项目", "config": {...} }

2. 批量创建任务
   POST /v1/data/batch
   { "operations": [...] }

3. AI查询进度
   POST /v1/ai/query
   { "query": "看看我所有项目的进度" }
   → 跨所有甘特图实例汇总
```

---

## 第四章：备注与FAQ

### Q: 纯个人使用为什么还要 users 表？
A: 一是登录认证需要；二是未来你朋友也想用这个平台；三是所有数据带 `user_id` 是安全基线，即使只有一个用户也要有这个字段。

### Q: data 字段用 JSON，那搜索怎么办？
A: SQLite 支持 JSON 函数：`json_extract(data, '$.field')`。D1 完全兼容这个语法。索引方面，常用字段可以在应用层维护 labels 标签来弥补。

### Q: 版本号（version）怎么用？
A: 每次更新数据时 version +1，旧版本保留在 tool_data 表里（用 version 字段区分）。可以回滚到指定版本。初期可以简化——如果不想要版本回溯功能，version 字段留着但每次直接覆盖。

### Q: 文件上传的 R2 存储怎么搞定？
A: R2 是 Cloudflare 的对象存储，类似 AWS S3，但免费额度够用（10GB 存储 + 每月 1000 万次请求）。花名册 Excel 上传后存 R2，tool_data.file_url 记录链接。

### Q: 旧首页（GitHub Pages 上）的需求提交通道怎么办？
A: 保持不动。旧首页的 `/api/feedbacks` 接口继续在 Workers 上运行。新旧并存，逐步迁移。