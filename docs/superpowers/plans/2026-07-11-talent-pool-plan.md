# 人才库管理系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向小团队的简历管理与候选人跟进 Web 系统，支持手动录入、文件解析、批量导入和多条件筛选。

**Architecture:** 前后端分离。前端 Vue3 + Element Plus 构建为静态资源部署到 GitHub Pages `/talent-pool/` 子路径。后端作为新模块 `talent.js` 集成到现有 `zhihr-api` Cloudflare Worker（域名 `api.zhihr.vip`），复用现有 D1 数据库 `zhihr_db`（表名 `talent_` 前缀）。简历原件存储在 Cloudflare R2 对象存储（bucket: `talent-pool-resumes`），D1 仅存元数据。后端负责文件解析（PDF/Word/Excel），使用 Workers 兼容的解析库。

**Tech Stack:** Vue3, Element Plus, Pinia, Vue Router, Vite, Cloudflare Workers, Cloudflare D1 (SQLite), Cloudflare R2, xlsx (Excel), unpdf (PDF), fflate (Word docx 解压)

**Design Spec:** `docs/superpowers/specs/2026-07-11-talent-pool-design.md`

---

## UI 设计决策

| 决策项 | 选择 | 说明 |
|---|---|---|
| 导航布局 | 左侧边栏 | 固定 220px 侧边栏 + 顶部面包屑，管理类系统标准布局 |
| 列表样式 | 紧凑表格 + 头像 | 姓名列加首字母头像，状态用彩色标签，行高紧凑 |
| 视觉风格 | Element Plus 默认 + 微调 | 仅调整主色调/圆角/间距 CSS 变量，不做深度定制 |
| 详情页布局 | Tab 分区 | 顶部固定姓名/状态/联系方式卡片，下方 Tab 切换信息分区 |
| 角色分级 | 两级：管理员 + 普通用户 | 管理员管账号+所有数据；普通用户按岗位分类查看数据 |
| 数据权限 | 按岗位分类控制 | 管理员为普通用户分配可访问的岗位，用户只能看到对应候选人 |
| 管理员初始化 | 首个注册用户自动成为管理员 | 后续注册需管理员创建，关闭公开注册 |
| 操作日志 | 关键操作 only | 登录/用户管理/删除/附件操作，日常查看编辑不记录 |

---

## 与现有基础设施的关系

本计划**复用**以下已有资源，不新建独立后端服务：

| 资源 | 现有用途 | 人才库新增内容 |
|---|---|---|
| `api/src/index.js` (zhihr-api Worker) | auth/reviews/miaodu 模块 | 新增 `talent` 模块注册 |
| `api/src/utils/router.js` | 路由/CORS/JWT 工具 | 直接复用 |
| `api/wrangler.toml` | D1 绑定 `zhihr_db` | 新增 R2 绑定 `RESUME_BUCKET` |
| `api/schema.sql` | users/tasks/reviews/miaodu_* 表 | 新增 `talent_*` 表 |
| D1 数据库 `zhihr_db` | 共享数据库 | `talent_` 前缀避免冲突 |
| GitHub Pages (zhihr.vip) | miaodu/pinyin-graph 等 | 新增 `/talent-pool/` 子路径 |
| `.github/workflows/static.yml` | 前端构建部署 | 新增 talent-pool 构建步骤 |

---

## 文件结构总览

```
zhihr/                                  # 仓库根目录
├── api/                                # 现有 zhihr-api Worker
│   ├── src/
│   │   ├── index.js                    # 修改：注册 talent + talent_auth 模块
│   │   ├── utils/
│   │   │   └── router.js               # 修改：新增 requireAuth/requireAdmin/requirePermission 工具
│   │   └── modules/
│   │       ├── auth.js                 # 修改：注册时首个用户自动管理员，后续关闭公开注册
│   │       ├── reviews.js              # 现有
│   │       ├── miaodu.js               # 现有
│   │       ├── talent.js               # 新增：候选人/经历/附件 CRUD 路由（含鉴权）
│   │       ├── talent_auth.js          # 新增：用户管理/角色/岗位权限/操作日志 路由
│   │       └── talent_parsers.js       # 新增：文件解析（PDF/Word/Excel）
│   ├── schema.sql                      # 修改：追加 talent_* 表 + users 表扩展 + 日志表
│   ├── wrangler.toml                   # 修改：新增 R2 绑定
│   └── package.json                    # 新增依赖：xlsx, unpdf, fflate
├── talent-pool/                        # 前端项目（新建）
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.js                # Axios 实例 + Token 拦截器 + 所有 API 调用
│   │   ├── components/
│   │   │   ├── SkillTags.vue           # 技能标签输入组件
│   │   │   ├── ExperienceForm.vue      # 单条工作经历表单
│   │   │   └── StatusSelect.vue        # 状态选择下拉组件
│   │   ├── views/
│   │   │   ├── Login.vue               # 登录页
│   │   │   ├── CandidateList.vue       # 候选人列表页（头像 + 紧凑表格 + 筛选）
│   │   │   ├── CandidateForm.vue       # 新增/编辑候选人表单页
│   │   │   ├── CandidateDetail.vue     # 候选人详情页（顶部信息卡 + Tab 分区）
│   │   │   ├── BatchImport.vue         # 批量导入页
│   │   │   ├── UserList.vue            # 用户管理页（管理员）
│   │   │   ├── UserForm.vue            # 新增/编辑用户表单（管理员）
│   │   │   └── OperationLogs.vue       # 操作日志页（管理员）
│   │   ├── router/
│   │   │   └── index.js                # Vue Router 配置（含路由守卫）
│   │   ├── stores/
│   │   │   ├── candidate.js            # Pinia 候选人状态管理
│   │   │   └── auth.js                 # Pinia 认证状态管理（用户信息/角色/Token）
│   │   ├── utils/
│   │   │   └── constants.js            # 状态选项、学历选项等常量
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .github/
│   └── workflows/
│       └── static.yml                  # 修改：新增 talent-pool 构建步骤
└── docs/
    ├── superpowers/specs/2026-07-11-talent-pool-design.md
    └── superpowers/plans/2026-07-11-talent-pool-plan.md
```

---

### Task 1: 数据库 Schema 与 Worker 配置

**Files:**
- Modify: `api/schema.sql`
- Modify: `api/wrangler.toml`
- Modify: `api/package.json`

- [ ] **Step 1: 在 `api/schema.sql` 末尾追加人才库建表语句**

```sql
-- ========= 人才库管理系统 =========

-- 候选人表
CREATE TABLE IF NOT EXISTS talent_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    position TEXT,
    skills TEXT,          -- JSON 数组，如 ["Vue","React"]
    education TEXT,
    experience_years INTEGER,
    status TEXT DEFAULT 'pending',
    source TEXT,
    summary TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 工作经历表
CREATE TABLE IF NOT EXISTS talent_work_experiences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    description TEXT,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

-- 附件元数据表（文件原件存 R2）
CREATE TABLE IF NOT EXISTS talent_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    candidate_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    r2_key TEXT NOT NULL,  -- R2 对象 key，如 resumes/{candidate_id}/{timestamp}_{filename}
    file_size INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES talent_candidates(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_talent_candidates_status ON talent_candidates(status);
CREATE INDEX IF NOT EXISTS idx_talent_candidates_position ON talent_candidates(position);
CREATE INDEX IF NOT EXISTS idx_talent_candidates_name ON talent_candidates(name);
CREATE INDEX IF NOT EXISTS idx_talent_work_exp_candidate ON talent_work_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_talent_attachments_candidate ON talent_attachments(candidate_id);
```

- [ ] **Step 2: 修改 `api/wrangler.toml` 新增 R2 绑定**

在 `[[d1_databases]]` 段之后追加：

```toml
# R2 对象存储：简历原件
# 创建命令: wrangler r2 bucket create talent-pool-resumes
[[r2_buckets]]
binding = "RESUME_BUCKET"
bucket_name = "talent-pool-resumes"
```

- [ ] **Step 3: 修改 `api/package.json` 新增解析依赖**

在 `dependencies` 中添加（如果没有 `dependencies` 段则新建）：

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "unpdf": "^0.12.0",
    "fflate": "^0.8.0"
  }
}
```

- [ ] **Step 4: 执行 D1 建表**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler d1 execute zhihr_db --file=./schema.sql
```

- [ ] **Step 5: 创建 R2 bucket**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler r2 bucket create talent-pool-resumes
```

- [ ] **Step 6: 安装依赖**

```bash
cd /Users/yq/Documents/zhihr/api && npm install
```

- [ ] **Step 7: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/schema.sql api/wrangler.toml api/package.json api/package-lock.json && git commit -m "feat(talent-pool): add D1 schema, R2 binding, and parser dependencies"
```

---

### Task 2: 候选人 CRUD API 模块

**Files:**
- Create: `api/src/modules/talent.js`
- Modify: `api/src/index.js`

- [ ] **Step 1: 创建候选人模块 `api/src/modules/talent.js`**

```javascript
import { debugLog, jsonResponse, maskError, parsePagination } from '../utils/router.js'

const VALID_STATUSES = ['pending', 'contacted', 'interviewing', 'offered', 'rejected']

// ========= 候选人 CRUD =========

async function listCandidates(request, env, corsHeaders) {
  try {
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    const conditions = []
    const params = []

    const keyword = url.searchParams.get('keyword')
    if (keyword) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    const position = url.searchParams.get('position')
    if (position) { conditions.push('position = ?'); params.push(position) }
    const education = url.searchParams.get('education')
    if (education) { conditions.push('education = ?'); params.push(education) }
    const expMin = url.searchParams.get('experience_min')
    if (expMin !== null) { conditions.push('experience_years >= ?'); params.push(Number(expMin)) }
    const expMax = url.searchParams.get('experience_max')
    if (expMax !== null) { conditions.push('experience_years <= ?'); params.push(Number(expMax)) }
    const status = url.searchParams.get('status')
    if (status) {
      const statuses = status.split(',').filter(s => VALID_STATUSES.includes(s))
      if (statuses.length > 0) {
        conditions.push(`status IN (${statuses.map(() => '?').join(',')})`)
        params.push(...statuses)
      }
    }
    const source = url.searchParams.get('source')
    if (source) { conditions.push('source = ?'); params.push(source) }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countRow = await env.DB.prepare(`SELECT COUNT(*) as total FROM talent_candidates ${where}`).bind(...params).first()
    const total = countRow.total

    const rows = await env.DB.prepare(
      `SELECT * FROM talent_candidates ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()

    return jsonResponse({ success: true, data: rows.results, total, page, pageSize }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function getFilterOptions(request, env, corsHeaders) {
  try {
    const positions = await env.DB.prepare(
      "SELECT DISTINCT position FROM talent_candidates WHERE position IS NOT NULL ORDER BY position"
    ).all()
    const sources = await env.DB.prepare(
      "SELECT DISTINCT source FROM talent_candidates WHERE source IS NOT NULL ORDER BY source"
    ).all()
    return jsonResponse({
      success: true,
      data: {
        positions: positions.results.map(r => r.position),
        sources: sources.results.map(r => r.source)
      }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function getCandidate(request, env, corsHeaders, params) {
  try {
    const id = params.id
    const candidate = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const experiences = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE candidate_id = ? ORDER BY start_date DESC'
    ).bind(id).all()

    const attachments = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE candidate_id = ? ORDER BY created_at DESC'
    ).bind(id).all()

    return jsonResponse({
      success: true,
      data: { ...candidate, experiences: experiences.results, attachments: attachments.results }
    }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function createCandidate(request, env, corsHeaders) {
  try {
    const body = await request.json()
    if (!body.name) {
      return jsonResponse({ success: false, message: '姓名为必填项' }, 400, corsHeaders)
    }

    const skillsJson = Array.isArray(body.skills) ? JSON.stringify(body.skills) : (body.skills || null)
    const result = await env.DB.prepare(`
      INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      body.name, body.phone || null, body.email || null, body.position || null,
      skillsJson, body.education || null, body.experience_years || null,
      body.status || 'pending', body.source || null, body.summary || null
    ).run()

    return getCandidate(request, env, corsHeaders, { id: result.meta.last_row_id_string })
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function updateCandidate(request, env, corsHeaders, params) {
  try {
    const id = params.id
    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const body = await request.json()
    const allowedFields = ['name', 'phone', 'email', 'position', 'skills', 'education', 'experience_years', 'status', 'source', 'summary']
    const fields = []
    const values = []

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`)
        let val = body[field]
        if (field === 'skills' && Array.isArray(val)) val = JSON.stringify(val)
        values.push(val)
      }
    }

    if (fields.length === 0) {
      return getCandidate(request, env, corsHeaders, { id })
    }

    fields.push("updated_at = CURRENT_TIMESTAMP")
    values.push(id)

    await env.DB.prepare(`UPDATE talent_candidates SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    return getCandidate(request, env, corsHeaders, { id })
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function updateStatus(request, env, corsHeaders, params) {
  try {
    const body = await request.json()
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return jsonResponse({ success: false, message: `无效状态，允许值: ${VALID_STATUSES.join(', ')}` }, 400, corsHeaders)
    }
    return updateCandidate(request, env, corsHeaders, { id: params.id })
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function deleteCandidate(request, env, corsHeaders, params) {
  try {
    const id = params.id
    const existing = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    // 删除 R2 中的附件原件
    const attachments = await env.DB.prepare('SELECT r2_key FROM talent_attachments WHERE candidate_id = ?').bind(id).all()
    for (const att of attachments.results) {
      try { await env.RESUME_BUCKET.delete(att.r2_key) } catch (e) { debugLog('Talent', 'R2 delete failed:', att.r2_key) }
    }

    // D1 外键级联删除工作经历和附件元数据
    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_work_experiences WHERE candidate_id = ?').bind(id),
      env.DB.prepare('DELETE FROM talent_attachments WHERE candidate_id = ?').bind(id),
      env.DB.prepare('DELETE FROM talent_candidates WHERE id = ?').bind(id)
    ])

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

// ========= 工作经历 =========

async function listExperiences(request, env, corsHeaders, params) {
  try {
    const rows = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE candidate_id = ? ORDER BY start_date DESC'
    ).bind(params.id).all()
    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function addExperience(request, env, corsHeaders, params) {
  try {
    const body = await request.json()
    if (!body.company || !body.title) {
      return jsonResponse({ success: false, message: '公司和职位为必填项' }, 400, corsHeaders)
    }
    const result = await env.DB.prepare(`
      INSERT INTO talent_work_experiences (candidate_id, company, title, start_date, end_date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(params.id, body.company, body.title, body.start_date || null, body.end_date || null, body.description || null).run()

    const exp = await env.DB.prepare('SELECT * FROM talent_work_experiences WHERE id = ?').bind(result.meta.last_row_id_string).first()
    return jsonResponse({ success: true, data: exp }, 201, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function updateExperience(request, env, corsHeaders, params) {
  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM talent_work_experiences WHERE id = ? AND candidate_id = ?'
    ).bind(params.expId, params.id).first()
    if (!existing) {
      return jsonResponse({ success: false, message: '工作经历不存在' }, 404, corsHeaders)
    }

    const body = await request.json()
    const allowedFields = ['company', 'title', 'start_date', 'end_date', 'description']
    const fields = []
    const values = []
    for (const field of allowedFields) {
      if (body[field] !== undefined) { fields.push(`${field} = ?`); values.push(body[field]) }
    }
    if (fields.length === 0) {
      return jsonResponse({ success: true, data: existing }, 200, corsHeaders)
    }

    values.push(params.expId)
    await env.DB.prepare(`UPDATE talent_work_experiences SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    const updated = await env.DB.prepare('SELECT * FROM talent_work_experiences WHERE id = ?').bind(params.expId).first()
    return jsonResponse({ success: true, data: updated }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function deleteExperience(request, env, corsHeaders, params) {
  try {
    await env.DB.prepare('DELETE FROM talent_work_experiences WHERE id = ? AND candidate_id = ?').bind(params.expId, params.id).run()
    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

// ========= 路由注册 =========

export const routes = [
  // 候选人 CRUD
  { method: 'GET',    path: '/api/talent/candidates',            handler: listCandidates },
  { method: 'GET',    path: '/api/talent/candidates/filter-options', handler: getFilterOptions },
  { method: 'GET',    path: '/api/talent/candidates/:id',        handler: getCandidate },
  { method: 'POST',   path: '/api/talent/candidates',            handler: createCandidate },
  { method: 'PUT',    path: '/api/talent/candidates/:id',        handler: updateCandidate },
  { method: 'PATCH',  path: '/api/talent/candidates/:id/status', handler: updateStatus },
  { method: 'DELETE', path: '/api/talent/candidates/:id',        handler: deleteCandidate },

  // 工作经历
  { method: 'GET',    path: '/api/talent/candidates/:id/experiences',         handler: listExperiences },
  { method: 'POST',   path: '/api/talent/candidates/:id/experiences',         handler: addExperience },
  { method: 'PUT',    path: '/api/talent/candidates/:id/experiences/:expId',  handler: updateExperience },
  { method: 'DELETE', path: '/api/talent/candidates/:id/experiences/:expId',  handler: deleteExperience },
]
```

> **注意：** 附件上传/下载和文件解析路由在 Task 3 和 Task 4 中追加到 `routes` 数组。

- [ ] **Step 2: 修改 `api/src/index.js` 注册 talent 模块**

在现有 import 和 register 部分追加：

```javascript
import * as talent from './modules/talent.js'

register(talent)
```

- [ ] **Step 3: 本地验证**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler dev
```

```bash
# 创建候选人
curl -s -X POST http://localhost:8787/api/talent/candidates \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","phone":"13800138000","email":"zhangsan@test.com","position":"前端工程师","skills":["Vue","React"],"education":"本科","experience_years":3,"source":"Boss直聘"}'

# 获取列表
curl -s http://localhost:8787/api/talent/candidates
```

Expected: 返回 JSON 中 `success: true`，能正常创建和查询。

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/modules/talent.js api/src/index.js && git commit -m "feat(talent-pool): implement candidate and experience CRUD API on Workers D1"
```

---

### Task 3: R2 附件上传与下载

**Files:**
- Modify: `api/src/modules/talent.js`（追加附件路由）

- [ ] **Step 1: 在 `talent.js` 中追加附件管理函数**

在路由注册 `export const routes` 之前追加以下函数：

```javascript
// ========= 附件管理（R2 存储） =========

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

async function uploadAttachment(request, env, corsHeaders, params) {
  try {
    const candidateId = params.id
    const candidate = await env.DB.prepare('SELECT id FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse({ success: false, message: '文件大小不能超过 10MB' }, 400, corsHeaders)
    }

    // 校验文件类型
    const fileName = file.name
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return jsonResponse({ success: false, message: `不支持的文件类型: ${ext}，允许: ${ALLOWED_EXTENSIONS.join(', ')}` }, 400, corsHeaders)
    }

    // 生成 R2 key
    const timestamp = Date.now()
    const r2Key = `resumes/${candidateId}/${timestamp}_${fileName}`

    // 上传到 R2
    await env.RESUME_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type }
    })

    // 存元数据到 D1
    const fileType = ext.replace('.', '')
    const result = await env.DB.prepare(`
      INSERT INTO talent_attachments (candidate_id, file_name, file_type, r2_key, file_size)
      VALUES (?, ?, ?, ?, ?)
    `).bind(candidateId, fileName, fileType, r2Key, file.size).run()

    const attachment = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE id = ?'
    ).bind(result.meta.last_row_id_string).first()

    return jsonResponse({ success: true, data: attachment }, 201, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function listAttachments(request, env, corsHeaders, params) {
  try {
    const rows = await env.DB.prepare(
      'SELECT id, candidate_id, file_name, file_type, file_size, created_at FROM talent_attachments WHERE candidate_id = ? ORDER BY created_at DESC'
    ).bind(params.id).all()
    return jsonResponse({ success: true, data: rows.results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function deleteAttachment(request, env, corsHeaders, params) {
  try {
    const attachment = await env.DB.prepare(
      'SELECT * FROM talent_attachments WHERE id = ? AND candidate_id = ?'
    ).bind(params.attachId, params.id).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }

    // 删除 R2 对象（忽略不存在的错误）
    try { await env.RESUME_BUCKET.delete(attachment.r2_key) } catch (e) { debugLog('Talent', 'R2 delete failed:', attachment.r2_key) }

    await env.DB.prepare('DELETE FROM talent_attachments WHERE id = ?').bind(params.attachId).run()
    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function downloadAttachment(request, env, corsHeaders, params) {
  try {
    const attachment = await env.DB.prepare(
      'SELECT * FROM talent_attachments WHERE id = ?'
    ).bind(params.id).first()
    if (!attachment) {
      return jsonResponse({ success: false, message: '附件不存在' }, 404, corsHeaders)
    }

    const object = await env.RESUME_BUCKET.get(attachment.r2_key)
    if (!object) {
      return jsonResponse({ success: false, message: '文件已被删除' }, 404, corsHeaders)
    }

    const headers = new Headers()
    object.writeHttpMetadata(headers)
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.file_name)}`)
    headers.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin'] || '*')

    return new Response(object.body, { headers })
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}
```

- [ ] **Step 2: 在 `routes` 数组中追加附件路由**

```javascript
  // 附件管理
  { method: 'POST',   path: '/api/talent/candidates/:id/attachments',       handler: uploadAttachment },
  { method: 'GET',    path: '/api/talent/candidates/:id/attachments',       handler: listAttachments },
  { method: 'DELETE', path: '/api/talent/candidates/:id/attachments/:attachId', handler: deleteAttachment },
  { method: 'GET',    path: '/api/talent/attachments/:id/download',         handler: downloadAttachment },
```

> **注意路由顺序：** `/api/talent/attachments/:id/download` 与 `/api/talent/candidates/:id` 不冲突，因为路径前缀不同。

- [ ] **Step 3: 本地验证**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler dev
```

```bash
# 创建测试候选人
CANDIDATE_ID=$(curl -s -X POST http://localhost:8787/api/talent/candidates \
  -H "Content-Type: application/json" \
  -d '{"name":"李四","position":"Java工程师"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

# 上传附件
echo "test resume content" > /tmp/test.txt
curl -s -X POST "http://localhost:8787/api/talent/candidates/$CANDIDATE_ID/attachments" \
  -F "file=@/tmp/test.txt"

# 查看附件列表
curl -s "http://localhost:8787/api/talent/candidates/$CANDIDATE_ID/attachments"
```

Expected: 上传成功，列表中包含刚上传的附件元数据。

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/modules/talent.js && git commit -m "feat(talent-pool): implement R2 attachment upload, download, and delete"
```

---

### Task 4: 文件解析服务

**Files:**
- Create: `api/src/modules/talent_parsers.js`
- Modify: `api/src/modules/talent.js`（追加解析路由）

- [ ] **Step 1: 创建文件解析模块 `api/src/modules/talent_parsers.js`**

```javascript
import { read, utils, write } from 'xlsx'
import { unzipSync } from 'fflate'

// ========= 通用信息提取 =========

function extractInfo(text) {
  const info = {}
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const phoneMatch = text.match(/1[3-9]\d{9}/)
  if (phoneMatch) info.phone = phoneMatch[0]

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/)
  if (emailMatch) info.email = emailMatch[0]

  info.summary = lines.slice(0, 10).join('\n')
  return info
}

// ========= Word (.docx) 解析 =========
// docx 是 zip 包，document.xml 包含正文

async function parseDocx(arrayBuffer) {
  const files = unzipSync(new Uint8Array(arrayBuffer))
  // docx 正文路径
  const docPath = Object.keys(files).find(k => k === 'word/document.xml')
  if (!docPath) return { summary: '无法解析 Word 文件内容' }

  const xmlText = new TextDecoder().decode(files[docPath])
  // 提取 <w:t> 标签内的文本
  const texts = []
  const regex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  let match
  while ((match = regex.exec(xmlText)) !== null) {
    texts.push(match[1])
  }
  // 段落分隔
  const fullText = texts.join('')

  return extractInfo(fullText)
}

// ========= PDF 解析（使用 unpdf） =========

async function parsePdf(arrayBuffer) {
  const { extractText } = await import('unpdf')
  const { text } = await extractText(arrayBuffer, { mergePages: true })
  return extractInfo(text)
}

// ========= Excel 解析 =========

const FIELD_MAP = {
  '姓名': 'name', '名字': 'name', 'name': 'name',
  '手机': 'phone', '手机号': 'phone', '电话': 'phone', 'phone': 'phone',
  '邮箱': 'email', 'email': 'email',
  '目标岗位': 'position', '期望职位': 'position', '职位': 'position', 'position': 'position',
  '技能': 'skills', 'skills': 'skills',
  '学历': 'education', '最高学历': 'education', 'education': 'education',
  '工作年限': 'experience_years', '经验年限': 'experience_years', 'experience_years': 'experience_years',
  '来源': 'source', '来源渠道': 'source', 'source': 'source',
  '备注': 'summary', '评价': 'summary', 'summary': 'summary'
}

function parseExcel(arrayBuffer) {
  const workbook = read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = utils.sheet_to_json(sheet, { defval: '' })

  if (rows.length === 0) return { candidates: [] }

  const mappedRows = rows.map(row => {
    const mapped = {}
    for (const [key, value] of Object.entries(row)) {
      const field = FIELD_MAP[key.trim()] || FIELD_MAP[key.toLowerCase?.()]
      if (field) mapped[field] = value
    }
    return mapped
  })

  return { candidates: mappedRows }
}

function generateTemplateBuffer() {
  const headers = ['姓名', '手机号', '邮箱', '目标岗位', '技能', '学历', '工作年限', '来源', '备注']
  const ws = utils.aoa_to_sheet([headers])
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, '候选人')
  // 生成 buffer
  const buf = write(wb, { type: 'array', bookType: 'xlsx' })
  return buf
}

// ========= 路由入口：根据扩展名分发 =========

async function parseFile(fileName, arrayBuffer) {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  switch (ext) {
    case '.docx':
      return parseDocx(arrayBuffer)
    case '.pdf':
      return parsePdf(arrayBuffer)
    case '.xlsx':
    case '.xls':
    case '.csv':
      return parseExcel(arrayBuffer)
    default:
      throw new Error(`不支持的文件类型: ${ext}`)
  }
}

export { parseFile, parseExcel, generateTemplateBuffer }
```

> **注意：** `fflate` 是 Workers 兼容的纯 JS zip 解压库（unpdf 的依赖之一已包含）。如 `fflate` 未安装，可用 `jszip` 替代，但 fflate 更轻量。在 `package.json` 中添加 `"fflate": "^0.8.0"`。

- [ ] **Step 2: 在 `talent.js` 中追加解析路由**

在文件顶部添加 import：

```javascript
import { parseFile, parseExcel, generateTemplateBuffer } from './talent_parsers.js'
```

在路由注册之前追加处理函数：

```javascript
// ========= 简历解析与批量导入 =========

async function parseResume(request, env, corsHeaders) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    const arrayBuffer = await file.arrayBuffer()
    const parsed = await parseFile(file.name, arrayBuffer)
    return jsonResponse({ success: true, data: parsed }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function batchImport(request, env, corsHeaders) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) {
      return jsonResponse({ success: false, message: '请选择文件' }, 400, corsHeaders)
    }

    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return jsonResponse({ success: false, message: '批量导入仅支持 Excel/CSV 文件' }, 400, corsHeaders)
    }

    const arrayBuffer = await file.arrayBuffer()
    const { candidates } = parseExcel(arrayBuffer)

    const results = { success: 0, failed: 0, errors: [] }
    const insertStmt = env.DB.prepare(`
      INSERT INTO talent_candidates (name, phone, email, position, skills, education, experience_years, status, source, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `)

    for (let i = 0; i < candidates.length; i++) {
      const row = candidates[i]
      if (!row.name) {
        results.failed++
        results.errors.push(`第 ${i + 2} 行: 姓名为空，已跳过`)
        continue
      }
      try {
        const skills = typeof row.skills === 'string'
          ? row.skills.split(/[,，]/).map(s => s.trim())
          : row.skills
        const expYears = row.experience_years ? parseInt(row.experience_years, 10) : null

        await insertStmt.bind(
          row.name, row.phone || null, row.email || null, row.position || null,
          Array.isArray(skills) ? JSON.stringify(skills) : null,
          row.education || null, expYears, row.source || null, row.summary || null
        ).run()
        results.success++
      } catch (err) {
        results.failed++
        results.errors.push(`第 ${i + 2} 行: ${err.message}`)
      }
    }

    return jsonResponse({ success: true, data: results }, 200, corsHeaders)
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}

async function downloadTemplate(request, env, corsHeaders) {
  try {
    const buffer = generateTemplateBuffer()
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=talent-pool-template.xlsx',
        'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*'
      }
    })
  } catch (error) {
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}
```

- [ ] **Step 3: 在 `routes` 数组中追加解析路由**

```javascript
  // 简历解析与批量导入
  { method: 'POST', path: '/api/talent/candidates/parse-resume',     handler: parseResume },
  { method: 'POST', path: '/api/talent/candidates/import',           handler: batchImport },
  { method: 'GET',  path: '/api/talent/candidates/import/template',  handler: downloadTemplate },
```

> **路由顺序注意：** 上述静态路径必须在 `/:id` 之前注册。现有 `matchRoute` 实现按注册顺序匹配，因此确保这三个路由在 `'/api/talent/candidates/:id'` 之前。

- [ ] **Step 4: 更新 `api/package.json` 添加 fflate 依赖**

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "unpdf": "^0.12.0",
    "fflate": "^0.8.0"
  }
}
```

- [ ] **Step 5: 本地验证**

```bash
cd /Users/yq/Documents/zhihr/api && npm install && npx wrangler dev
```

```bash
# 下载模板
curl -s -o /tmp/template.xlsx http://localhost:8787/api/talent/candidates/import/template
ls -la /tmp/template.xlsx

# 上传 Excel 批量导入
curl -s -X POST http://localhost:8787/api/talent/candidates/import -F "file=@/tmp/template.xlsx"
```

Expected: 成功下载模板，批量导入返回 `success` 和 `failed` 计数。

- [ ] **Step 6: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/modules/talent_parsers.js api/src/modules/talent.js api/package.json api/package-lock.json && git commit -m "feat(talent-pool): implement file parsers (PDF/Word/Excel) and batch import on Workers"
```

---

### Task 5: 前端项目初始化

**Files:**
- Create: `talent-pool/client/` (Vue3 + Vite 项目)
- Create: `talent-pool/client/src/api/index.js`
- Create: `talent-pool/client/src/utils/constants.js`
- Create: `talent-pool/client/src/router/index.js`
- Create: `talent-pool/client/src/stores/candidate.js`
- Create: `talent-pool/client/src/App.vue`
- Create: `talent-pool/client/src/main.js`
- Create: `talent-pool/client/vite.config.js`

- [ ] **Step 1: 创建 Vue3 项目**

```bash
cd /Users/yq/Documents/zhihr/talent-pool && npm create vite@latest client -- --template vue
```

- [ ] **Step 2: 安装依赖**

```bash
cd /Users/yq/Documents/zhihr/talent-pool/client && npm install element-plus @element-plus/icons-vue axios pinia vue-router@4
```

- [ ] **Step 3: 创建 API 封装 `client/src/api/index.js`**

```javascript
import axios from 'axios'

// 生产环境使用 api.zhihr.vip，开发环境通过 Vite 代理到 localhost:8787
const baseURL = import.meta.env.VITE_API_BASE || '/api'

const api = axios.create({ baseURL, timeout: 15000 })

// 候选人
export const getCandidates = (params) => api.get('/talent/candidates', { params })
export const getFilterOptions = () => api.get('/talent/candidates/filter-options')
export const getCandidate = (id) => api.get(`/talent/candidates/${id}`)
export const createCandidate = (data) => api.post('/talent/candidates', data)
export const updateCandidate = (id, data) => api.put(`/talent/candidates/${id}`, data)
export const updateCandidateStatus = (id, status) => api.patch(`/talent/candidates/${id}/status`, { status })
export const deleteCandidate = (id) => api.delete(`/talent/candidates/${id}`)
export const parseResume = (formData) => api.post('/talent/candidates/parse-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// 工作经历
export const getExperiences = (candidateId) => api.get(`/talent/candidates/${candidateId}/experiences`)
export const addExperience = (candidateId, data) => api.post(`/talent/candidates/${candidateId}/experiences`, data)
export const updateExperience = (candidateId, expId, data) => api.put(`/talent/candidates/${candidateId}/experiences/${expId}`, data)
export const deleteExperience = (candidateId, expId) => api.delete(`/talent/candidates/${candidateId}/experiences/${expId}`)

// 附件
export const getAttachments = (candidateId) => api.get(`/talent/candidates/${candidateId}/attachments`)
export const uploadAttachment = (candidateId, formData) => api.post(`/talent/candidates/${candidateId}/attachments`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteAttachment = (candidateId, attachId) => api.delete(`/talent/candidates/${candidateId}/attachments/${attachId}`)
export const downloadUrl = (attachId) => `${baseURL}/talent/attachments/${attachId}/download`

// 批量导入
export const importCandidates = (formData) => api.post('/talent/candidates/import', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
export const getImportTemplateUrl = () => `${baseURL}/talent/candidates/import/template`

export default api
```

- [ ] **Step 4: 创建常量定义 `client/src/utils/constants.js`**

```javascript
export const STATUS_OPTIONS = [
  { label: '待联系', value: 'pending' },
  { label: '已联系', value: 'contacted' },
  { label: '面试中', value: 'interviewing' },
  { label: '已录用', value: 'offered' },
  { label: '已拒绝', value: 'rejected' }
]

export const EDUCATION_OPTIONS = ['大专', '本科', '硕士', '博士', '其他']

export const EXPERIENCE_RANGES = [
  { label: '1年以下', min: 0, max: 1 },
  { label: '1-3年', min: 1, max: 3 },
  { label: '3-5年', min: 3, max: 5 },
  { label: '5-10年', min: 5, max: 10 },
  { label: '10年以上', min: 10, max: 999 }
]

export const getStatusLabel = (value) => {
  const found = STATUS_OPTIONS.find(o => o.value === value)
  return found ? found.label : value
}

export const getStatusType = (value) => {
  const map = { pending: 'info', contacted: '', interviewing: 'warning', offered: 'success', rejected: 'danger' }
  return map[value] || 'info'
}
```

- [ ] **Step 5: 创建路由配置 `client/src/router/index.js`**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/candidates' },
  { path: '/candidates', name: 'CandidateList', component: () => import('../views/CandidateList.vue'), meta: { title: '候选人列表' } },
  { path: '/candidates/new', name: 'CandidateForm', component: () => import('../views/CandidateForm.vue'), meta: { title: '新增候选人' } },
  { path: '/candidates/:id/edit', name: 'CandidateEdit', component: () => import('../views/CandidateForm.vue'), meta: { title: '编辑候选人' } },
  { path: '/candidates/:id', name: 'CandidateDetail', component: () => import('../views/CandidateDetail.vue'), meta: { title: '候选人详情' } },
  { path: '/import', name: 'BatchImport', component: () => import('../views/BatchImport.vue'), meta: { title: '批量导入' } }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
```

- [ ] **Step 6: 创建 Pinia Store `client/src/stores/candidate.js`**

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getCandidates, getFilterOptions } from '../api'

export const useCandidateStore = defineStore('candidate', () => {
  const candidates = ref([])
  const total = ref(0)
  const filterOptions = ref({ positions: [], sources: [] })
  const loading = ref(false)

  async function fetchList(params) {
    loading.value = true
    try {
      const res = await getCandidates(params)
      candidates.value = res.data.data
      total.value = res.data.total
    } finally {
      loading.value = false
    }
  }

  async function fetchFilterOptions() {
    const res = await getFilterOptions()
    filterOptions.value = res.data.data
  }

  return { candidates, total, filterOptions, loading, fetchList, fetchFilterOptions }
})
```

- [ ] **Step 7: 创建 `App.vue`（左侧边栏布局）**

```vue
<template>
  <el-config-provider :locale="zhCn">
    <el-container style="min-height: 100vh">
      <!-- 左侧边栏 -->
      <el-aside width="220px" style="background: #1d2129; display: flex; flex-direction: column;">
        <div style="height: 56px; display: flex; align-items: center; padding: 0 20px; color: #fff; font-size: 17px; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.08);">
          <el-icon style="margin-right: 8px; color: var(--el-color-primary);"><UserFilled /></el-icon>
          人才库管理
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#1d2129"
          text-color="rgba(255,255,255,0.65)"
          active-text-color="#fff"
          style="border: none; flex: 1; padding-top: 8px;"
        >
          <el-menu-item index="/candidates">
            <el-icon><List /></el-icon><span>候选人列表</span>
          </el-menu-item>
          <el-menu-item index="/candidates/new">
            <el-icon><Plus /></el-icon><span>新增候选人</span>
          </el-menu-item>
          <el-menu-item index="/import">
            <el-icon><Upload /></el-icon><span>批量导入</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header style="height: 56px; display: flex; align-items: center; border-bottom: 1px solid var(--el-border-color-light); background: #fff;">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/candidates' }">人才库</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </el-header>
        <el-main style="background: #f5f7fa; padding: 20px;">
          <div style="max-width: 1400px; margin: 0 auto;">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { UserFilled, List, Plus, Upload } from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const route = useRoute()
const activeMenu = computed(() => {
  if (route.path.startsWith('/candidates/new')) return '/candidates/new'
  if (route.path.startsWith('/candidates/') && !route.path.includes('/edit')) return '/candidates'
  if (route.path.startsWith('/candidates/') && route.path.includes('/edit')) return '/candidates'
  return route.path
})
</script>

<style>
body { margin: 0; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }

/* Element Plus 主题微调 */
:root {
  --el-color-primary: #3b82f6;
  --el-border-radius-base: 6px;
  --el-border-radius-small: 4px;
}
.el-menu-item.is-active { background-color: rgba(59, 130, 246, 0.15) !important; }
.el-aside { transition: width 0.2s; }
</style>
```

- [ ] **Step 8: 创建 `main.js`**

```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

- [ ] **Step 9: 创建 `vite.config.js`**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.VITE_BASE || '/talent-pool/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
```

> **说明：**
> - `base: '/talent-pool/'` 确保 GitHub Pages 子路径下静态资源路径正确
> - 开发代理到 `localhost:8787`（wrangler dev 默认端口）
> - 端口 `5174` 避免与现有 miaodu 前端（5173）冲突

- [ ] **Step 10: 验证前端启动**

```bash
cd /Users/yq/Documents/zhihr/talent-pool/client && npm run dev
```

访问 http://localhost:5174/talent-pool/ 应看到页面（即使没有视图组件，App.vue 框架应渲染）。

- [ ] **Step 11: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): init Vue3 frontend with Element Plus, router, store, and API layer"
```

---

### Task 6: 前端候选人列表页

**Files:**
- Create: `talent-pool/client/src/views/CandidateList.vue`
- Create: `talent-pool/client/src/components/StatusSelect.vue`

- [ ] **Step 1: 创建 StatusSelect 组件 `client/src/components/StatusSelect.vue`**

```vue
<template>
  <el-select :model-value="modelValue" @change="$emit('update:modelValue', $event)" :size="size" :disabled="disabled">
    <el-option v-for="opt in STATUS_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
  </el-select>
</template>

<script setup>
import { STATUS_OPTIONS } from '../utils/constants'

defineProps({
  modelValue: String,
  size: { type: String, default: 'default' },
  disabled: Boolean
})
defineEmits(['update:modelValue'])
</script>
```

- [ ] **Step 2: 创建候选人列表页 `client/src/views/CandidateList.vue`**

```vue
<template>
  <div>
    <!-- 搜索和筛选 -->
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-form :model="filters" inline>
        <el-form-item label="搜索">
          <el-input v-model="filters.keyword" placeholder="姓名 / 手机号 / 邮箱" clearable @clear="handleSearch" @keyup.enter="handleSearch" style="width: 220px;" />
        </el-form-item>
        <el-form-item label="目标岗位">
          <el-select v-model="filters.position" placeholder="全部" clearable style="width: 160px;">
            <el-option v-for="p in store.filterOptions.positions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="学历">
          <el-select v-model="filters.education" placeholder="全部" clearable style="width: 120px;">
            <el-option v-for="e in EDUCATION_OPTIONS" :key="e" :label="e" :value="e" />
          </el-select>
        </el-form-item>
        <el-form-item label="年限">
          <el-select v-model="filters.experienceRange" placeholder="全部" clearable style="width: 130px;">
            <el-option v-for="r in EXPERIENCE_RANGES" :key="r.label" :label="r.label" :value="r" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable multiple collapse-tags style="width: 200px;">
            <el-option v-for="s in STATUS_OPTIONS" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="来源">
          <el-select v-model="filters.source" placeholder="全部" clearable style="width: 140px;">
            <el-option v-for="s in store.filterOptions.sources" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表 -->
    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: var(--el-text-color-secondary);">共 {{ store.total }} 条记录</span>
        <el-button type="primary" @click="$router.push('/candidates/new')">
          <el-icon><Plus /></el-icon> 新增候选人
        </el-button>
      </div>

      <el-table :data="store.candidates" v-loading="store.loading" stripe size="default">
        <el-table-column label="姓名" min-width="160">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-avatar :size="32" style="background: var(--el-color-primary); flex-shrink: 0; font-size: 14px;">{{ row.name?.charAt(0) }}</el-avatar>
              <router-link :to="`/candidates/${row.id}`" style="color: var(--el-color-primary); text-decoration: none; font-weight: 500;">{{ row.name }}</router-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="目标岗位" min-width="120" show-overflow-tooltip />
        <el-table-column prop="education" label="学历" width="80" />
        <el-table-column prop="experience_years" label="工作年限" width="100">
          <template #default="{ row }">{{ row.experience_years ? `${row.experience_years}年` : '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small" effect="light">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="100" show-overflow-tooltip />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ row.updated_at }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/candidates/${row.id}/edit`)">编辑</el-button>
            <el-popconfirm title="确定删除该候选人吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        v-model:current-page="filters.page"
        v-model:page-size="filters.pageSize"
        :total="store.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end;"
        @size-change="fetchData"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useCandidateStore } from '../stores/candidate'
import { deleteCandidate } from '../api'
import { STATUS_OPTIONS, EDUCATION_OPTIONS, EXPERIENCE_RANGES, getStatusLabel, getStatusType } from '../utils/constants'

const store = useCandidateStore()

const filters = reactive({
  keyword: '', position: '', education: '', experienceRange: null,
  status: [], source: '', page: 1, pageSize: 20
})

function buildParams() {
  const params = { page: filters.page, pageSize: filters.pageSize }
  if (filters.keyword) params.keyword = filters.keyword
  if (filters.position) params.position = filters.position
  if (filters.education) params.education = filters.education
  if (filters.experienceRange) {
    params.experience_min = filters.experienceRange.min
    params.experience_max = filters.experienceRange.max
  }
  if (filters.status.length > 0) params.status = filters.status.join(',')
  if (filters.source) params.source = filters.source
  return params
}

function fetchData() {
  store.fetchList(buildParams())
}

function handleSearch() {
  filters.page = 1
  fetchData()
}

function resetFilters() {
  Object.assign(filters, { keyword: '', position: '', education: '', experienceRange: null, status: [], source: '', page: 1 })
  fetchData()
}

async function handleDelete(row) {
  try {
    await deleteCandidate(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

onMounted(() => {
  store.fetchFilterOptions()
  fetchData()
})
</script>
```

- [ ] **Step 3: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement candidate list page with multi-condition filtering and pagination"
```

---

### Task 7: 前端候选人表单页（新增/编辑）

**Files:**
- Create: `talent-pool/client/src/views/CandidateForm.vue`
- Create: `talent-pool/client/src/components/SkillTags.vue`
- Create: `talent-pool/client/src/components/ExperienceForm.vue`

- [ ] **Step 1: 创建 SkillTags 组件 `client/src/components/SkillTags.vue`**

```vue
<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
      <el-tag v-for="tag in modelValue" :key="tag" closable @close="removeTag(tag)" size="default">
        {{ tag }}
      </el-tag>
    </div>
    <el-input
      v-if="inputVisible"
      ref="inputRef"
      v-model="inputValue"
      size="small"
      style="width: 150px;"
      placeholder="输入后回车"
      @keyup.enter="addTag"
      @blur="addTag"
    />
    <el-button v-else size="small" @click="showInput">+ 添加技能</el-button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const props = defineProps({ modelValue: { type: Array, default: () => [] } })
const emit = defineEmits(['update:modelValue'])

const inputVisible = ref(false)
const inputValue = ref('')
const inputRef = ref(null)

function showInput() {
  inputVisible.value = true
  nextTick(() => inputRef.value?.focus())
}

function addTag() {
  const val = inputValue.value.trim()
  if (val && !props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val])
  }
  inputValue.value = ''
  inputVisible.value = false
}

function removeTag(tag) {
  emit('update:modelValue', props.modelValue.filter(t => t !== tag))
}
</script>
```

- [ ] **Step 2: 创建 ExperienceForm 组件 `client/src/components/ExperienceForm.vue`**

```vue
<template>
  <div style="border: 1px solid var(--el-border-color-light); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span style="font-weight: 500;">{{ experience.company || '新工作经历' }}</span>
      <el-button type="danger" link size="small" @click="$emit('remove')">
        <el-icon><Delete /></el-icon> 删除
      </el-button>
    </div>
    <el-form label-width="80px" size="default">
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="公司" required>
            <el-input v-model="experience.company" placeholder="公司名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="职位" required>
            <el-input v-model="experience.title" placeholder="职位名称" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始时间">
            <el-input v-model="experience.start_date" placeholder="如 2020-03" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间">
            <el-input v-model="experience.end_date" placeholder="留空表示在职" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="工作描述">
        <el-input v-model="experience.description" type="textarea" :rows="2" placeholder="工作内容描述" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { Delete } from '@element-plus/icons-vue'

defineProps({ experience: { type: Object, required: true } })
defineEmits(['remove'])
</script>
```

- [ ] **Step 3: 创建候选人表单页 `client/src/views/CandidateForm.vue`**

```vue
<template>
  <div style="max-width: 900px;">
    <el-page-header @back="$router.back()" :content="isEdit ? '编辑候选人' : '新增候选人'" style="margin-bottom: 20px;" />

    <!-- 简历上传解析区域 -->
    <el-card v-if="!isEdit" shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          accept=".pdf,.docx,.doc"
          :on-change="handleFileChange"
          :show-file-list="false"
        >
          <el-button type="primary" plain>上传简历文件解析</el-button>
        </el-upload>
        <span style="color: var(--el-text-color-secondary); font-size: 13px;">支持 PDF、Word 格式，解析结果自动填充表单</span>
      </div>
    </el-card>

    <el-card shadow="never" v-loading="saving">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="必填" style="max-width: 300px;" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="11位手机号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="email@example.com" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="目标岗位">
              <el-input v-model="form.position" placeholder="期望职位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="学历">
              <el-select v-model="form.education" placeholder="请选择" clearable style="width: 100%;">
                <el-option v-for="e in EDUCATION_OPTIONS" :key="e" :label="e" :value="e" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="工作年限">
              <el-input-number v-model="form.experience_years" :min="0" :max="50" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来源渠道">
              <el-input v-model="form.source" placeholder="如 Boss直聘、内推" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="技能标签">
          <SkillTags v-model="form.skills" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.summary" type="textarea" :rows="3" placeholder="简要评价或备注" />
        </el-form-item>

        <!-- 工作经历 -->
        <el-divider content-position="left">工作经历</el-divider>
        <ExperienceForm
          v-for="(exp, index) in form.experiences"
          :key="index"
          :experience="exp"
          @remove="form.experiences.splice(index, 1)"
        />
        <el-button type="primary" plain @click="addExperience" style="margin-bottom: 16px;">
          <el-icon><Plus /></el-icon> 添加工作经历
        </el-button>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit">{{ isEdit ? '保存修改' : '创建候选人' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getCandidate, createCandidate, updateCandidate, parseResume } from '../api'
import { addExperience as addExpApi, updateExperience } from '../api'
import SkillTags from '../components/SkillTags.vue'
import ExperienceForm from '../components/ExperienceForm.vue'
import { EDUCATION_OPTIONS } from '../utils/constants'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const saving = ref(false)

const form = reactive({
  name: '', phone: '', email: '', position: '',
  skills: [], education: '', experience_years: null,
  source: '', summary: '', experiences: []
})

const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }]
}

function addExperience() {
  form.experiences.push({ company: '', title: '', start_date: '', end_date: '', description: '' })
}

async function handleFileChange(uploadFile) {
  if (!uploadFile.raw) return
  const formData = new FormData()
  formData.append('file', uploadFile.raw)
  try {
    ElMessage.info('正在解析文件...')
    const res = await parseResume(formData)
    const data = res.data.data || res.data
    if (data.phone) form.phone = data.phone
    if (data.email) form.email = data.email
    if (data.summary) form.summary = data.summary
    ElMessage.success('解析完成，请确认并补充信息')
  } catch (e) {
    ElMessage.warning('文件解析失败，请手动填写')
  }
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const candidateData = { ...form }
    delete candidateData.experiences

    let candidateId
    if (isEdit.value) {
      await updateCandidate(route.params.id, candidateData)
      candidateId = route.params.id
    } else {
      const res = await createCandidate(candidateData)
      candidateId = res.data.data.id
    }

    for (const exp of form.experiences) {
      if (!exp.company || !exp.title) continue
      if (isEdit.value && exp.id) {
        await updateExperience(candidateId, exp.id, exp)
      } else {
        await addExpApi(candidateId, exp)
      }
    }

    ElMessage.success(isEdit.value ? '修改成功' : '创建成功')
    router.push(`/candidates/${candidateId}`)
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const res = await getCandidate(route.params.id)
    const data = res.data.data
    Object.assign(form, {
      name: data.name, phone: data.phone || '', email: data.email || '',
      position: data.position || '', skills: data.skills ? (typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills) : [],
      education: data.education || '', experience_years: data.experience_years || null,
      source: data.source || '', summary: data.summary || '',
      experiences: (data.experiences || []).map(e => ({ ...e }))
    })
  }
})
</script>
```

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement candidate form with skill tags, work experiences, and resume parsing"
```

---

### Task 8: 前端候选人详情页

**Files:**
- Create: `talent-pool/client/src/views/CandidateDetail.vue`

- [ ] **Step 1: 创建候选人详情页 `client/src/views/CandidateDetail.vue`（Tab 分区布局）**

```vue
<template>
  <div style="max-width: 1000px;" v-loading="loading">
    <el-page-header @back="$router.push('/candidates')" title="返回列表" style="margin-bottom: 16px;" />

    <!-- 顶部信息卡片：头像 + 姓名 + 状态 + 联系方式 -->
    <el-card shadow="never" style="margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        <el-avatar :size="56" style="background: var(--el-color-primary); font-size: 22px; flex-shrink: 0;">{{ candidate.name?.charAt(0) }}</el-avatar>
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
            <span style="font-size: 20px; font-weight: 600;">{{ candidate.name }}</span>
            <el-tag :type="getStatusType(candidate.status)" size="default" effect="light">{{ getStatusLabel(candidate.status) }}</el-tag>
          </div>
          <div style="display: flex; gap: 20px; color: var(--el-text-color-secondary); font-size: 14px;">
            <span v-if="candidate.phone"><el-icon><Phone /></el-icon> {{ candidate.phone }}</span>
            <span v-if="candidate.email"><el-icon><Message /></el-icon> {{ candidate.email }}</span>
            <span v-if="candidate.position"><el-icon><Briefcase /></el-icon> {{ candidate.position }}</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
          <el-button type="primary" size="small" @click="$router.push(`/candidates/${route.params.id}/edit`)">编辑</el-button>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 13px; color: var(--el-text-color-secondary);">快速改状态:</span>
            <StatusSelect v-model="candidate.status" size="small" @update:model-value="handleStatusChange" />
          </div>
        </div>
      </div>
    </el-card>

    <!-- Tab 分区 -->
    <el-card shadow="never">
      <el-tabs v-model="activeTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-descriptions :column="3" border>
            <el-descriptions-item label="手机号">{{ candidate.phone || '-' }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ candidate.email || '-' }}</el-descriptions-item>
            <el-descriptions-item label="目标岗位">{{ candidate.position || '-' }}</el-descriptions-item>
            <el-descriptions-item label="学历">{{ candidate.education || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工作年限">{{ candidate.experience_years ? `${candidate.experience_years}年` : '-' }}</el-descriptions-item>
            <el-descriptions-item label="来源渠道">{{ candidate.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="技能" :span="3">
              <el-tag v-for="skill in parsedSkills" :key="skill" size="small" style="margin-right: 6px; margin-bottom: 4px;">{{ skill }}</el-tag>
              <span v-if="parsedSkills.length === 0">-</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ candidate.created_at }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ candidate.updated_at }}</el-descriptions-item>
          </el-descriptions>
        </el-tab-pane>

        <!-- 工作经历 -->
        <el-tab-pane :label="`工作经历 (${candidate.experiences?.length || 0})`" name="experience">
          <el-timeline v-if="candidate.experiences && candidate.experiences.length > 0">
            <el-timeline-item
              v-for="exp in candidate.experiences"
              :key="exp.id"
              :timestamp="`${exp.start_date || '?'} ~ ${exp.end_date || '至今'}`"
              placement="top"
            >
              <el-card shadow="never" style="padding: 12px;">
                <div style="font-weight: 600;">{{ exp.title }}</div>
                <div style="color: var(--el-text-color-secondary); margin-bottom: 4px;">{{ exp.company }}</div>
                <div v-if="exp.description" style="color: var(--el-text-color-regular);">{{ exp.description }}</div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无工作经历" :image-size="60" />
        </el-tab-pane>

        <!-- 附件 -->
        <el-tab-pane :label="`附件 (${candidate.attachments?.length || 0})`" name="attachments">
          <div style="margin-bottom: 12px;">
            <el-upload
              :auto-upload="true"
              :action="uploadAction"
              :show-file-list="false"
              :on-success="handleUploadSuccess"
              :on-error="() => ElMessage.error('上传失败')"
              name="file"
            >
              <el-button type="primary" size="small">上传附件</el-button>
            </el-upload>
          </div>
          <el-table :data="candidate.attachments || []" v-if="candidate.attachments && candidate.attachments.length > 0" stripe>
            <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
            <el-table-column prop="file_type" label="类型" width="80" />
            <el-table-column prop="file_size" label="大小" width="100">
              <template #default="{ row }">{{ row.file_size ? `${(row.file_size / 1024).toFixed(1)} KB` : '-' }}</template>
            </el-table-column>
            <el-table-column prop="created_at" label="上传时间" width="170" />
            <el-table-column label="操作" width="140">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleDownload(row)">下载</el-button>
                <el-popconfirm title="确定删除该附件吗？" @confirm="handleDeleteAttachment(row)">
                  <template #reference>
                    <el-button type="danger" link size="small">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-else description="暂无附件" :image-size="60" />
        </el-tab-pane>

        <!-- 备注 -->
        <el-tab-pane label="备注" name="notes">
          <p style="white-space: pre-wrap; color: var(--el-text-color-regular); line-height: 1.8;">{{ candidate.summary || '暂无备注' }}</p>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Phone, Message, Briefcase } from '@element-plus/icons-vue'
import { getCandidate, updateCandidateStatus, deleteAttachment, downloadUrl } from '../api'
import StatusSelect from '../components/StatusSelect.vue'
import { getStatusLabel, getStatusType } from '../utils/constants'

const route = useRoute()
const loading = ref(false)
const candidate = ref({})
const activeTab = ref('info')

const uploadAction = computed(() => {
  const base = import.meta.env.VITE_API_BASE || '/api'
  return `${base}/talent/candidates/${route.params.id}/attachments`
})

const parsedSkills = computed(() => {
  if (!candidate.value.skills) return []
  if (typeof candidate.value.skills === 'string') {
    try { return JSON.parse(candidate.value.skills) } catch { return [] }
  }
  return candidate.value.skills
})

async function fetchCandidate() {
  loading.value = true
  try {
    const res = await getCandidate(route.params.id)
    candidate.value = res.data.data
  } finally {
    loading.value = false
  }
}

async function handleStatusChange(val) {
  try {
    await updateCandidateStatus(candidate.value.id, val)
    candidate.value.status = val
    ElMessage.success('状态已更新')
  } catch (e) {
    ElMessage.error('状态更新失败')
  }
}

function handleDownload(row) {
  window.open(downloadUrl(row.id), '_blank')
}

async function handleDeleteAttachment(row) {
  try {
    await deleteAttachment(candidate.value.id, row.id)
    ElMessage.success('删除成功')
    fetchCandidate()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

function handleUploadSuccess() {
  ElMessage.success('上传成功')
  fetchCandidate()
}

onMounted(fetchCandidate)
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement candidate detail page with timeline and R2 attachments"
```

---

### Task 9: 前端批量导入页

**Files:**
- Create: `talent-pool/client/src/views/BatchImport.vue`

- [ ] **Step 1: 创建批量导入页 `client/src/views/BatchImport.vue`**

```vue
<template>
  <div style="max-width: 800px;">
    <el-page-header @back="$router.push('/candidates')" title="返回列表" content="批量导入候选人" style="margin-bottom: 20px;" />

    <el-card shadow="never">
      <el-steps :active="step" style="margin-bottom: 24px;" simple>
        <el-step title="下载模板" />
        <el-step title="上传文件" />
        <el-step title="导入完成" />
      </el-steps>

      <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
        请先下载 Excel 模板，按模板格式填写候选人信息后上传导入。
      </el-alert>

      <div v-if="step === 0">
        <el-button type="primary" size="large" @click="downloadTemplate">
          <el-icon><Download /></el-icon> 下载导入模板
        </el-button>
        <el-button type="primary" @click="step = 1">已有模板，直接上传</el-button>
      </div>

      <div v-if="step === 1">
        <el-upload
          ref="importUploadRef"
          drag
          :auto-upload="false"
          :limit="1"
          accept=".xlsx,.xls,.csv"
          :on-change="handleFileSelect"
          :show-file-list="true"
        >
          <el-icon style="font-size: 48px; color: var(--el-text-color-placeholder);"><UploadFilled /></el-icon>
          <div style="margin-top: 8px;">将文件拖到此处，或 <em>点击上传</em></div>
          <template #tip>
            <div style="color: var(--el-text-color-secondary); font-size: 13px;">仅支持 .xlsx / .xls / .csv 文件</div>
          </template>
        </el-upload>
        <div style="margin-top: 16px;">
          <el-button type="primary" :disabled="!selectedFile" :loading="importing" @click="handleImport">
            开始导入
          </el-button>
          <el-button @click="step = 0">上一步</el-button>
        </div>
      </div>

      <!-- 导入结果 -->
      <div v-if="step === 2">
        <el-result icon="success" title="导入完成" :sub-title="`成功 ${result.success} 条，失败 ${result.failed} 条`">
          <template #extra>
            <el-button type="primary" @click="$router.push('/candidates')">查看候选人列表</el-button>
            <el-button @click="resetImport">继续导入</el-button>
          </template>
        </el-result>
        <div v-if="result.errors.length > 0" style="margin-top: 16px;">
          <el-alert type="warning" :closable="false" title="失败详情">
            <ul style="margin: 0; padding-left: 16px;">
              <li v-for="(err, i) in result.errors" :key="i">{{ err }}</li>
            </ul>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Download, UploadFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { importCandidates, getImportTemplateUrl } from '../api'

const step = ref(0)
const selectedFile = ref(null)
const importing = ref(false)
const result = ref({ success: 0, failed: 0, errors: [] })

function downloadTemplate() {
  window.open(getImportTemplateUrl(), '_blank')
  step.value = 1
}

function handleFileSelect(uploadFile) {
  selectedFile.value = uploadFile.raw
}

async function handleImport() {
  if (!selectedFile.value) return
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    const res = await importCandidates(formData)
    result.value = res.data.data
    step.value = 2
  } catch (e) {
    ElMessage.error('导入失败: ' + (e.response?.data?.message || e.message))
  } finally {
    importing.value = false
  }
}

function resetImport() {
  step.value = 0
  selectedFile.value = null
  result.value = { success: 0, failed: 0, errors: [] }
}
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement batch import page with template download and result reporting"
```

---

### Task 10: GitHub Actions 部署配置

**Files:**
- Modify: `.github/workflows/static.yml`
- Create: `talent-pool/README.md`

- [ ] **Step 1: 修改 `.github/workflows/static.yml` 新增 talent-pool 构建**

在 "Build pinyin-graph" 步骤之后追加新步骤：

```yaml
      - name: Build talent-pool
        run: |
          cd talent-pool/client
          npm ci
          VITE_API_BASE="${{ secrets.TALENT_API_BASE_URL }}" VITE_BASE=/talent-pool/ npm run build
```

在 "Prepare deployment" 步骤中追加拷贝：

```yaml
      - name: Prepare deployment
        run: |
          mkdir -p /tmp/deploy
          for item in $(ls -A | grep -v -E '^(review-system|moodist|miaodu|pinyin-graph|talent-pool)$'); do
            cp -r "$item" /tmp/deploy/
          done
          cp -r review-system/dist /tmp/deploy/review-system
          cp -r moodist/dist /tmp/deploy/moodist
          cp -r miaodu/frontend/dist /tmp/deploy/miaodu
          cp -r pinyin-graph/dist /tmp/deploy/pinyin-graph
          cp -r talent-pool/client/dist /tmp/deploy/talent-pool
```

同时在 cache key 中加入 talent-pool 的 lock 文件：

```yaml
          key: ${{ runner.os }}-pnpm-${{ hashFiles('review-system/pnpm-lock.yaml', 'moodist/pnpm-lock.yaml', 'miaodu/frontend/package-lock.json', 'talent-pool/client/package-lock.json') }}
```

> **说明：**
> - `VITE_API_BASE` secret 在生产环境设为 `https://api.zhihr.vip/api`，开发时不设（走 Vite 代理）
> - `VITE_BASE=/talent-pool/` 确保静态资源路径正确
> - 部署后访问地址：`https://zhihr.vip/talent-pool/`

- [ ] **Step 2: 设置 GitHub Secret**

在仓库 Settings → Secrets and variables → Actions 中添加：
- Name: `TALENT_API_BASE_URL`
- Value: `https://api.zhihr.vip/api`

> 如果已有通用 API base secret 可复用，则直接使用。

- [ ] **Step 3: 部署 Worker 后端**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler deploy
```

验证：`curl https://api.zhihr.vip/api/talent/candidates` 返回 `{"success":true,"data":[],"total":0,...}`

- [ ] **Step 4: 创建 `talent-pool/README.md`**

```markdown
# 人才库管理系统

面向个人/小团队的简历管理与候选人跟进系统。

## 技术栈

- 前端: Vue3 + Element Plus + Pinia + Vite（部署到 GitHub Pages /talent-pool/）
- 后端: Cloudflare Workers（集成在 zhihr-api Worker，域名 api.zhihr.vip）
- 数据库: Cloudflare D1（zhihr_db，talent_ 前缀表）
- 文件存储: Cloudflare R2（bucket: talent-pool-resumes）
- 文件解析: xlsx (Excel), unpdf (PDF), fflate (Word docx 解压)

## 快速开始

### 后端（Workers）

```bash
cd api
npm install
npx wrangler dev    # 本地开发，端口 8787
npx wrangler deploy # 部署到生产
```

API 地址：https://api.zhihr.vip/api/talent/

### 前端

```bash
cd talent-pool/client
npm install
npm run dev    # 本地开发，端口 5174，代理到 8787
npm run build  # 构建到 dist/
```

访问地址：
- 本地：http://localhost:5174/talent-pool/
- 生产：https://zhihr.vip/talent-pool/

## 数据库

使用 Cloudflare D1（SQLite 兼容），共享 `zhihr_db` 数据库，表名以 `talent_` 前缀区分：
- `talent_candidates` - 候选人
- `talent_work_experiences` - 工作经历
- `talent_attachments` - 附件元数据（文件原件在 R2）

## 文件存储

简历原件存储在 Cloudflare R2 对象存储（bucket: `talent-pool-resumes`），D1 仅保存元数据。R2 免费额度：10GB 存储 + 零出站流量费。
```

- [ ] **Step 5: 端到端验证**

后端（终端 1）：
```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler dev
```

前端（终端 2）：
```bash
cd /Users/yq/Documents/zhihr/talent-pool/client && npm run dev
```

验证清单：
1. 访问 http://localhost:5174/talent-pool/ 能看到候选人列表页（空列表）
2. 点击"新增候选人"，填写表单，创建成功后跳转到详情页
3. 在详情页查看信息，切换状态，上传附件，下载附件
4. 在列表页搜索、筛选、分页功能正常
5. 下载导入模板，填写数据后批量导入，查看结果

- [ ] **Step 6: 最终提交**

```bash
cd /Users/yq/Documents/zhihr && git add .github/workflows/static.yml talent-pool/README.md && git commit -m "feat(talent-pool): add GitHub Actions deployment config and README"
```

---

### Task 11: 用户与权限数据库 Schema

**Files:**
- Modify: `api/schema.sql`

- [ ] **Step 1: 在 `api/schema.sql` 末尾追加用户表扩展和权限/日志表**

```sql
-- ========= 账号管理与权限 =========

-- 扩展 users 表（如果还没加过）
-- 注意：D1 支持 ALTER TABLE ADD COLUMN，执行一次即可
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';          -- 'admin' 或 'user'
ALTER TABLE users ADD COLUMN display_name TEXT;                  -- 显示名称
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';      -- 'active' 或 'disabled'
ALTER TABLE users ADD COLUMN last_login_at TEXT;                 -- 最后登录时间

-- 用户-岗位权限表（普通用户只能看分配岗位的候选人）
CREATE TABLE IF NOT EXISTS talent_user_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    position TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, position)
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS talent_operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    username TEXT,
    action TEXT NOT NULL,          -- login/logout/create_user/delete_user/create_candidate/delete_candidate/upload_attachment/delete_attachment
    resource_type TEXT,            -- user/candidate/attachment
    resource_id TEXT,
    detail TEXT,                   -- JSON 格式的附加信息
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_talent_user_positions_user ON talent_user_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_user ON talent_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_action ON talent_operation_logs(action);
CREATE INDEX IF NOT EXISTS idx_talent_operation_logs_created ON talent_operation_logs(created_at);
```

- [ ] **Step 2: 执行 D1 迁移**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler d1 execute zhihr_db --command="ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';"
npx wrangler d1 execute zhihr_db --command="ALTER TABLE users ADD COLUMN display_name TEXT;"
npx wrangler d1 execute zhihr_db --command="ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';"
npx wrangler d1 execute zhihr_db --command="ALTER TABLE users ADD COLUMN last_login_at TEXT;"
npx wrangler d1 execute zhihr_db --file=./schema.sql
```

> **注意：** ALTER TABLE 每条需单独执行。如果列已存在会报错，忽略即可。`--file=./schema.sql` 会执行所有 CREATE TABLE IF NOT EXISTS，包括新增的 `talent_user_positions` 和 `talent_operation_logs`。

- [ ] **Step 3: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/schema.sql && git commit -m "feat(talent-pool): add user role/permission tables and operation log schema"
```

---

### Task 12: 认证中间件与权限工具

**Files:**
- Modify: `api/src/utils/router.js`
- Modify: `api/src/modules/auth.js`

- [ ] **Step 1: 在 `api/src/utils/router.js` 中新增鉴权工具函数**

在文件末尾追加：

```javascript
// ========= 鉴权与权限工具 =========

/**
 * 从请求中提取并验证 JWT 用户信息
 * @returns {Object|null} { userId, username, role } 或 null（未认证）
 */
export async function getAuthUser(request, env) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return null
  const payload = await verifyJwt(token, env)
  if (!payload || payload.type !== 'access') return null

  // 从 D1 查询用户最新角色和状态
  const user = await env.DB.prepare(
    'SELECT id, username, role, status FROM users WHERE id = ?'
  ).bind(payload.userId).first()

  if (!user || user.status === 'disabled') return null
  return { userId: user.id, username: user.username, role: user.role }
}

/**
 * 要求登录，否则返回 401
 * @returns {Object|null} 用户信息 或 Response（未授权时）
 */
export async function requireAuth(request, env, corsHeaders) {
  const user = await getAuthUser(request, env)
  if (!user) {
    return { user: null, error: jsonResponse({ success: false, message: '请先登录' }, 401, corsHeaders) }
  }
  return { user, error: null }
}

/**
 * 要求管理员角色，否则返回 403
 */
export async function requireAdmin(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return { user: null, error }
  if (user.role !== 'admin') {
    return { user: null, error: jsonResponse({ success: false, message: '需要管理员权限' }, 403, corsHeaders) }
  }
  return { user, error: null }
}

/**
 * 获取普通用户被分配的岗位列表（管理员返回 null 表示不限）
 */
export async function getUserPositions(env, userId, role) {
  if (role === 'admin') return null // null = 不限制
  const rows = await env.DB.prepare(
    'SELECT position FROM talent_user_positions WHERE user_id = ?'
  ).bind(userId).all()
  return rows.results.map(r => r.position)
}

/**
 * 记录操作日志
 */
export async function logOperation(env, user, action, resourceType, resourceId, detail, ipAddress) {
  try {
    await env.DB.prepare(`
      INSERT INTO talent_operation_logs (user_id, username, action, resource_type, resource_id, detail, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user?.userId || null, user?.username || null,
      action, resourceType || null, resourceId || null,
      detail ? JSON.stringify(detail) : null,
      ipAddress || null
    ).run()
  } catch (e) {
    debugLog('OperationLog', 'Failed to log:', e.message)
  }
}
```

- [ ] **Step 2: 修改 `api/src/modules/auth.js` — 首个用户自动管理员 + 关闭公开注册**

修改 `handleRegister` 函数：

```javascript
async function handleRegister(request, env, corsHeaders) {
  debugLog('Auth', 'handleRegister called')
  const clientIp = getClientIp(request)

  if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
    return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
  }

  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password

    if (!username || username.length < 3) {
      return jsonResponse({ success: false, message: '账号至少3位' }, 400, corsHeaders)
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return jsonResponse({ success: false, message: '账号只能包含字母、数字、下划线和中文' }, 400, corsHeaders)
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return jsonResponse({ success: false, message: passwordError }, 400, corsHeaders)
    }

    const db = env.DB

    // 检查是否已有用户：首个用户自动成为管理员，后续关闭公开注册
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').first()
    if (userCount.count > 0) {
      return jsonResponse({ success: false, message: '请联系管理员创建账号' }, 403, corsHeaders)
    }

    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400, corsHeaders)
    }

    const passwordHash = await hashPassword(password)
    const userId = generateId()
    const now = new Date().toISOString()

    // 首个用户 = 管理员
    await db.prepare(
      'INSERT INTO users (id, username, password_hash, role, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, username, passwordHash, 'admin', username, 'active', now, now).run()

    const accessToken = await signJwt({ userId, username, type: 'access' }, env, ACCESS_TOKEN_EXPIRY)
    const refreshToken = await signJwt({ userId, username, type: 'refresh' }, env, REFRESH_TOKEN_EXPIRY)

    debugLog('Auth', 'First admin registered:', username)
    return jsonResponse({
      success: true, message: '注册成功，您是系统管理员',
      data: { userId, username, role: 'admin', token: accessToken, refreshToken }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Auth', 'Register error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}
```

修改 `handleLogin` 函数，在登录成功后更新 `last_login_at` 并记录日志：

```javascript
async function handleLogin(request, env, corsHeaders) {
  debugLog('Auth', 'handleLogin called')
  const clientIp = getClientIp(request)

  if (!await checkRateLimit(env, `auth:${clientIp}`, RATE_LIMIT_MAX_AUTH)) {
    return jsonResponse({ success: false, message: '请求过于频繁，请稍后重试' }, 429, corsHeaders)
  }

  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password

    if (!username || !password) {
      return jsonResponse({ success: false, message: '请输入账号和密码' }, 400, corsHeaders)
    }

    const db = env.DB
    const user = await db.prepare(
      'SELECT id, username, password_hash, role, display_name, status FROM users WHERE username = ?'
    ).bind(username).first()

    if (!user) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400, corsHeaders)
    }

    if (user.status === 'disabled') {
      return jsonResponse({ success: false, message: '账号已被禁用，请联系管理员' }, 403, corsHeaders)
    }

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      return jsonResponse({ success: false, message: '账号或密码错误' }, 400, corsHeaders)
    }

    // 更新最后登录时间
    await db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
      .bind(new Date().toISOString(), new Date().toISOString(), user.id).run()

    const accessToken = await signJwt(
      { userId: user.id, username: user.username, type: 'access' }, env, ACCESS_TOKEN_EXPIRY
    )
    const refreshToken = await signJwt(
      { userId: user.id, username: user.username, type: 'refresh' }, env, REFRESH_TOKEN_EXPIRY
    )

    // 记录登录日志
    await logOperation(env, { userId: user.id, username: user.username }, 'login', 'user', user.id, null, clientIp)

    debugLog('Auth', 'Login success:', username)
    return jsonResponse({
      success: true, message: '登录成功',
      data: {
        userId: user.id, username: user.username,
        displayName: user.display_name, role: user.role,
        token: accessToken, refreshToken
      }
    }, 200, corsHeaders)
  } catch (error) {
    debugLog('Auth', 'Login error:', error)
    return jsonResponse({ success: false, message: maskError(error) }, 500, corsHeaders)
  }
}
```

在 `auth.js` 顶部添加 import：

```javascript
import { logOperation } from '../utils/router.js'
```

> **注意：** `handleMe` 也需要更新，返回 `role` 和 `display_name`。从 D1 查询最新用户信息而非仅依赖 JWT payload。

- [ ] **Step 3: 修改 `handleMe` 返回完整用户信息**

```javascript
async function handleMe(request, env, corsHeaders) {
  const user = await getAuthUser(request, env)
  if (!user) {
    return jsonResponse({ success: false, message: '未授权' }, 401, corsHeaders)
  }

  const dbUser = await env.DB.prepare(
    'SELECT id, username, role, display_name, status FROM users WHERE id = ?'
  ).bind(user.userId).first()

  if (!dbUser) {
    return jsonResponse({ success: false, message: '用户不存在' }, 401, corsHeaders)
  }

  return jsonResponse({
    success: true,
    data: {
      userId: dbUser.id,
      username: dbUser.username,
      displayName: dbUser.display_name,
      role: dbUser.role,
      status: dbUser.status
    }
  }, 200, corsHeaders)
}
```

在 `auth.js` import 行追加 `getAuthUser`：

```javascript
import { debugLog, generateId, hashPassword, verifyPassword, signJwt, verifyJwt, sanitizeInput, jsonResponse, getCorsHeaders, getClientIp, checkRateLimit, validatePassword, maskError, getAuthUser, logOperation } from '../utils/router.js'
```

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/utils/router.js api/src/modules/auth.js && git commit -m "feat(talent-pool): add auth middleware, first-admin auto-promotion, and login logging"
```

---

### Task 13: 用户管理 API

**Files:**
- Create: `api/src/modules/talent_auth.js`
- Modify: `api/src/index.js`

- [ ] **Step 1: 创建用户管理模块 `api/src/modules/talent_auth.js`**

```javascript
import { jsonResponse, requireAdmin, requireAuth, getUserPositions, logOperation, hashPassword, sanitizeInput, validatePassword, generateId, getClientIp } from '../utils/router.js'

// ========= 用户管理 =========

async function listUsers(request, env, corsHeaders) {
  const { user, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const rows = await env.DB.prepare(
      `SELECT id, username, display_name, role, status, last_login_at, created_at
       FROM users ORDER BY created_at DESC`
    ).all()

    // 批量获取每个用户的岗位权限
    const usersWithPositions = await Promise.all(rows.results.map(async u => {
      const positions = await getUserPositions(env, u.id, u.role)
      return { ...u, positions: positions || [] }
    }))

    return jsonResponse({ success: true, data: usersWithPositions }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function createUser(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const username = sanitizeInput(body.username, 50)
    const password = body.password
    const displayName = sanitizeInput(body.display_name, 50) || username
    const role = body.role === 'admin' ? 'admin' : 'user'

    if (!username || username.length < 3) {
      return jsonResponse({ success: false, message: '账号至少3位' }, 400, corsHeaders)
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return jsonResponse({ success: false, message: '账号只能包含字母、数字、下划线和中文' }, 400, corsHeaders)
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      return jsonResponse({ success: false, message: passwordError }, 400, corsHeaders)
    }

    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()
    if (existing) {
      return jsonResponse({ success: false, message: '用户名已存在' }, 400, corsHeaders)
    }

    const passwordHash = await hashPassword(password)
    const userId = generateId()
    const now = new Date().toISOString()

    await env.DB.prepare(
      'INSERT INTO users (id, username, password_hash, role, display_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(userId, username, passwordHash, role, displayName, 'active', now, now).run()

    await logOperation(env, admin, 'create_user', 'user', userId, { username, role }, getClientIp(request))

    return jsonResponse({
      success: true, message: '用户创建成功',
      data: { userId, username, display_name: displayName, role, status: 'active' }
    }, 201, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function updateUser(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const target = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(params.id).first()
    if (!target) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders)
    }

    const body = await request.json()
    const fields = []
    const values = []

    if (body.display_name !== undefined) {
      fields.push('display_name = ?'); values.push(sanitizeInput(body.display_name, 50))
    }
    if (body.role !== undefined) {
      fields.push('role = ?'); values.push(body.role === 'admin' ? 'admin' : 'user')
    }
    if (body.password !== undefined) {
      const passwordError = validatePassword(body.password)
      if (passwordError) {
        return jsonResponse({ success: false, message: passwordError }, 400, corsHeaders)
      }
      const passwordHash = await hashPassword(body.password)
      fields.push('password_hash = ?'); values.push(passwordHash)
    }

    if (fields.length > 0) {
      fields.push("updated_at = CURRENT_TIMESTAMP")
      values.push(params.id)
      await env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
    }

    await logOperation(env, admin, 'update_user', 'user', params.id, body, getClientIp(request))

    return jsonResponse({ success: true, message: '更新成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function deleteUser(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    if (params.id === admin.userId) {
      return jsonResponse({ success: false, message: '不能删除自己的账号' }, 400, corsHeaders)
    }

    const target = await env.DB.prepare('SELECT username FROM users WHERE id = ?').bind(params.id).first()
    if (!target) {
      return jsonResponse({ success: false, message: '用户不存在' }, 404, corsHeaders)
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(params.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(params.id)
    ])

    await logOperation(env, admin, 'delete_user', 'user', params.id, { username: target.username }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function updateUserStatus(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const status = body.status === 'active' ? 'active' : 'disabled'

    if (params.id === admin.userId && status === 'disabled') {
      return jsonResponse({ success: false, message: '不能禁用自己的账号' }, 400, corsHeaders)
    }

    await env.DB.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(status, params.id).run()

    await logOperation(env, admin, 'update_user_status', 'user', params.id, { status }, getClientIp(request))

    return jsonResponse({ success: true, message: status === 'active' ? '已启用' : '已禁用' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 岗位权限分配 =========

async function getUserPositionsRoute(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const positions = await getUserPositions(env, params.id, 'user')
    return jsonResponse({ success: true, data: positions || [] }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function setUserPositions(request, env, corsHeaders, params) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const positions = Array.isArray(body.positions) ? body.positions : []

    // 先删除旧权限，再批量插入
    await env.DB.batch([
      env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(params.id),
      ...positions.map(p => env.DB.prepare(
        'INSERT INTO talent_user_positions (user_id, position) VALUES (?, ?)'
      ).bind(params.id, p))
    ])

    await logOperation(env, admin, 'update_positions', 'user', params.id, { positions }, getClientIp(request))

    return jsonResponse({ success: true, message: '岗位权限已更新' }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 操作日志 =========

async function listOperationLogs(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50')
    const offset = (page - 1) * pageSize

    const conditions = []
    const params = []

    const username = url.searchParams.get('username')
    if (username) { conditions.push('username LIKE ?'); params.push(`%${username}%`) }
    const action = url.searchParams.get('action')
    if (action) { conditions.push('action = ?'); params.push(action) }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM talent_operation_logs ${where}`
    ).bind(...params).first()

    const rows = await env.DB.prepare(
      `SELECT * FROM talent_operation_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, pageSize, offset).all()

    return jsonResponse({
      success: true, data: rows.results, total: countRow.total, page, pageSize
    }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 可选岗位列表（从候选人表提取）=========

async function getAvailablePositions(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const rows = await env.DB.prepare(
      "SELECT DISTINCT position FROM talent_candidates WHERE position IS NOT NULL ORDER BY position"
    ).all()
    return jsonResponse({ success: true, data: rows.results.map(r => r.position) }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 批量操作 =========

async function batchUpdateStatus(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []
    const status = body.status === 'active' ? 'active' : 'disabled'

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }
    // 不能批量禁用自己
    if (status === 'disabled' && userIds.includes(admin.userId)) {
      return jsonResponse({ success: false, message: '不能禁用自己的账号' }, 400, corsHeaders)
    }

    const stmts = userIds.map(id =>
      env.DB.prepare('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(status, id)
    )
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_update_status', 'user', null, { userIds, status }, getClientIp(request))

    return jsonResponse({ success: true, message: `已${status === 'active' ? '启用' : '禁用'} ${userIds.length} 个账号` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function batchDeleteUsers(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }
    if (userIds.includes(admin.userId)) {
      return jsonResponse({ success: false, message: '不能删除自己的账号' }, 400, corsHeaders)
    }

    const stmts = []
    for (const id of userIds) {
      stmts.push(env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(id))
      stmts.push(env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id))
    }
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_delete_users', 'user', null, { userIds }, getClientIp(request))

    return jsonResponse({ success: true, message: `已删除 ${userIds.length} 个账号` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

async function batchSetPositions(request, env, corsHeaders) {
  const { user: admin, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds : []
    const positions = Array.isArray(body.positions) ? body.positions : []

    if (userIds.length === 0) {
      return jsonResponse({ success: false, message: '请选择用户' }, 400, corsHeaders)
    }

    const stmts = []
    for (const userId of userIds) {
      stmts.push(env.DB.prepare('DELETE FROM talent_user_positions WHERE user_id = ?').bind(userId))
      for (const pos of positions) {
        stmts.push(env.DB.prepare(
          'INSERT INTO talent_user_positions (user_id, position) VALUES (?, ?)'
        ).bind(userId, pos))
      }
    }
    await env.DB.batch(stmts)

    await logOperation(env, admin, 'batch_update_positions', 'user', null, { userIds, positions }, getClientIp(request))

    return jsonResponse({ success: true, message: `已为 ${userIds.length} 个用户更新岗位权限` }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ success: false, message: err.message }, 500, corsHeaders)
  }
}

// ========= 路由注册 =========

export const routes = [
  // 用户管理
  { method: 'GET',    path: '/api/auth/users',                  handler: listUsers },
  { method: 'POST',   path: '/api/auth/users',                  handler: createUser },
  { method: 'PUT',    path: '/api/auth/users/:id',              handler: updateUser },
  { method: 'DELETE', path: '/api/auth/users/:id',              handler: deleteUser },
  { method: 'PATCH',  path: '/api/auth/users/:id/status',       handler: updateUserStatus },

  // 批量操作
  { method: 'PATCH',  path: '/api/auth/users/batch/status',     handler: batchUpdateStatus },
  { method: 'POST',   path: '/api/auth/users/batch/delete',     handler: batchDeleteUsers },
  { method: 'PUT',    path: '/api/auth/users/batch/positions',  handler: batchSetPositions },

  // 岗位权限
  { method: 'GET',    path: '/api/auth/users/:id/positions',    handler: getUserPositionsRoute },
  { method: 'PUT',    path: '/api/auth/users/:id/positions',    handler: setUserPositions },
  { method: 'GET',    path: '/api/talent/positions/available',  handler: getAvailablePositions },

  // 操作日志
  { method: 'GET',    path: '/api/auth/operation-logs',         handler: listOperationLogs },
]
```

- [ ] **Step 2: 修改 `api/src/index.js` 注册 talent_auth 模块**

在现有 import 和 register 部分追加：

```javascript
import * as talentAuth from './modules/talent_auth.js'

register(talentAuth)
```

- [ ] **Step 3: 本地验证**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler dev
```

```bash
# 首个用户注册（自动管理员）
curl -s -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}'

# 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 创建普通用户
curl -s -X POST http://localhost:8787/api/auth/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"username":"user1","password":"User123!","display_name":"张三","role":"user"}'

# 查看用户列表
curl -s http://localhost:8787/api/auth/users -H "Authorization: Bearer $TOKEN"
```

Expected: 首个注册返回 `role: 'admin'`，能创建普通用户并查看列表。

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/modules/talent_auth.js api/src/index.js && git commit -m "feat(talent-pool): implement user management API with role/position permissions and operation logs"
```

---

### Task 14: Talent 路由鉴权与岗位数据过滤

**Files:**
- Modify: `api/src/modules/talent.js`

- [ ] **Step 1: 在 `talent.js` 顶部添加鉴权 import**

```javascript
import { debugLog, jsonResponse, maskError, parsePagination, requireAuth, requireAdmin, getUserPositions, logOperation, getClientIp } from '../utils/router.js'
```

- [ ] **Step 2: 修改 `listCandidates` 添加鉴权和岗位过滤**

在函数开头添加：

```javascript
async function listCandidates(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const url = new URL(request.url)
    const { page, pageSize, offset } = parsePagination(url)

    // 获取用户岗位权限（管理员返回 null = 不限制）
    const allowedPositions = await getUserPositions(env, user.userId, user.role)

    const conditions = []
    const params = []

    // 普通用户只能看分配岗位的候选人
    if (allowedPositions !== null) {
      if (allowedPositions.length === 0) {
        return jsonResponse({ success: true, data: [], total: 0, page, pageSize }, 200, corsHeaders)
      }
      conditions.push(`position IN (${allowedPositions.map(() => '?').join(',')})`)
      params.push(...allowedPositions)
    }

    // ... 原有筛选逻辑保持不变 ...
    const keyword = url.searchParams.get('keyword')
    if (keyword) {
      conditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ?)')
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    }
    // ... 其他筛选条件 ...

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    // ... 原有查询逻辑 ...
  }
}
```

> **关键：** 在原有筛选条件之前加入岗位过滤条件。普通用户如果没分配任何岗位，直接返回空列表。

- [ ] **Step 3: 修改 `getCandidate` 添加鉴权和岗位权限检查**

```javascript
async function getCandidate(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const id = params.id
    const candidate = await env.DB.prepare('SELECT * FROM talent_candidates WHERE id = ?').bind(id).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }

    // 普通用户只能查看分配岗位的候选人
    if (user.role !== 'admin') {
      const allowedPositions = await getUserPositions(env, user.userId, user.role)
      if (!allowedPositions.includes(candidate.position)) {
        return jsonResponse({ success: false, message: '无权查看该候选人' }, 403, corsHeaders)
      }
    }

    // ... 原有工作经历和附件查询逻辑 ...
  }
}
```

- [ ] **Step 4: 修改 `createCandidate` 和 `updateCandidate` 添加鉴权和岗位校验**

```javascript
async function createCandidate(request, env, corsHeaders) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const body = await request.json()
    if (!body.name) {
      return jsonResponse({ success: false, message: '姓名为必填项' }, 400, corsHeaders)
    }

    // 普通用户只能创建分配岗位的候选人
    if (user.role !== 'admin') {
      const allowedPositions = await getUserPositions(env, user.userId, user.role)
      if (body.position && !allowedPositions.includes(body.position)) {
        return jsonResponse({ success: false, message: '无权创建该岗位的候选人' }, 403, corsHeaders)
      }
    }

    // ... 原有创建逻辑 ...

    await logOperation(env, user, 'create_candidate', 'candidate', result.meta.last_row_id_string, { name: body.name }, getClientIp(request))

    return getCandidate(request, env, corsHeaders, { id: result.meta.last_row_id_string })
  }
}
```

- [ ] **Step 5: 修改 `deleteCandidate` 改为管理员 only**

```javascript
async function deleteCandidate(request, env, corsHeaders, params) {
  const { user, error } = await requireAdmin(request, env, corsHeaders)
  if (error) return error

  try {
    // ... 原有删除逻辑 ...

    await logOperation(env, user, 'delete_candidate', 'candidate', params.id, { name: existing.name }, getClientIp(request))

    return jsonResponse({ success: true, message: '删除成功' }, 200, corsHeaders)
  }
}
```

- [ ] **Step 6: 修改 `uploadAttachment` 和 `deleteAttachment` 添加鉴权和日志**

```javascript
async function uploadAttachment(request, env, corsHeaders, params) {
  const { user, error } = await requireAuth(request, env, corsHeaders)
  if (error) return error

  try {
    const candidateId = params.id
    // 检查候选人是否存在且用户有权限
    const candidate = await env.DB.prepare('SELECT position FROM talent_candidates WHERE id = ?').bind(candidateId).first()
    if (!candidate) {
      return jsonResponse({ success: false, message: '候选人不存在' }, 404, corsHeaders)
    }
    if (user.role !== 'admin') {
      const allowedPositions = await getUserPositions(env, user.userId, user.role)
      if (!allowedPositions.includes(candidate.position)) {
        return jsonResponse({ success: false, message: '无权操作该候选人' }, 403, corsHeaders)
      }
    }

    // ... 原有上传逻辑 ...

    await logOperation(env, user, 'upload_attachment', 'attachment', result.meta.last_row_id_string, { candidate_id: candidateId, file_name: fileName }, getClientIp(request))

    return jsonResponse({ success: true, data: attachment }, 201, corsHeaders)
  }
}
```

- [ ] **Step 7: 为其余路由添加 `requireAuth`**

对 `listExperiences`、`addExperience`、`updateExperience`、`deleteExperience`、`listAttachments`、`downloadAttachment`、`parseResume`、`batchImport`、`downloadTemplate` 每个函数开头添加：

```javascript
const { user, error } = await requireAuth(request, env, corsHeaders)
if (error) return error
```

对 `batchImport` 额外添加管理员检查（普通用户不能批量导入）：

```javascript
const { user, error } = await requireAdmin(request, env, corsHeaders)
if (error) return error
```

- [ ] **Step 8: 本地验证**

```bash
cd /Users/yq/Documents/zhihr/api && npx wrangler dev
```

```bash
# 未登录访问应返回 401
curl -s http://localhost:8787/api/talent/candidates

# 管理员登录
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 管理员可查看所有候选人
curl -s http://localhost:8787/api/talent/candidates -H "Authorization: Bearer $ADMIN_TOKEN"

# 普通用户登录
USER_TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"User123!"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 普通用户查看候选人（无岗位权限则返回空列表）
curl -s http://localhost:8787/api/talent/candidates -H "Authorization: Bearer $USER_TOKEN"
```

Expected: 未登录返回 401，管理员看到所有候选人，普通用户仅看到分配岗位的候选人。

- [ ] **Step 9: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add api/src/modules/talent.js && git commit -m "feat(talent-pool): add auth and position-based data filtering to all talent routes"
```

---

### Task 15: 前端登录页与认证流程

**Files:**
- Create: `talent-pool/client/src/views/Login.vue`
- Create: `talent-pool/client/src/stores/auth.js`
- Modify: `talent-pool/client/src/api/index.js`（Token 拦截器）
- Modify: `talent-pool/client/src/router/index.js`（路由守卫）
- Modify: `talent-pool/client/src/App.vue`（用户信息/登出/菜单权限）

- [ ] **Step 1: 创建认证 Store `client/src/stores/auth.js`**

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const refreshToken = ref(localStorage.getItem('refreshToken') || '')
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password })
    const data = res.data.data
    token.value = data.token
    refreshToken.value = data.refreshToken
    user.value = {
      userId: data.userId,
      username: data.username,
      displayName: data.displayName,
      role: data.role
    }
    localStorage.setItem('token', data.token)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  async function fetchCurrentUser() {
    try {
      const res = await api.get('/auth/me')
      user.value = res.data.data
      localStorage.setItem('user', JSON.stringify(user.value))
    } catch (e) {
      logout()
    }
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  return { token, refreshToken, user, isLoggedIn, isAdmin, login, fetchCurrentUser, logout }
})
```

- [ ] **Step 2: 修改 `client/src/api/index.js` 添加 Token 拦截器**

在 `const api = axios.create(...)` 之后追加：

```javascript
// 请求拦截器：自动添加 Token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器：401 自动跳转登录
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = import.meta.env.BASE_URL + 'login'
    }
    return Promise.reject(error)
  }
)
```

- [ ] **Step 3: 创建登录页 `client/src/views/Login.vue`**

```vue
<template>
  <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5;">
    <el-card style="width: 400px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);" shadow="never">
      <div style="text-align: center; margin-bottom: 24px;">
        <el-icon style="font-size: 40px; color: var(--el-color-primary);"><UserFilled /></el-icon>
        <h2 style="margin: 12px 0 4px; color: var(--el-text-color-primary);">人才库管理</h2>
        <p style="color: var(--el-text-color-secondary); font-size: 14px;">请登录以继续</p>
      </div>
      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="账号" size="large" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" :prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%;" :loading="loading" @click="handleLogin">登 录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function handleLogin() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    router.push('/candidates')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>
```

- [ ] **Step 4: 修改路由配置添加守卫**

在 `client/src/router/index.js` 中追加路由和守卫：

```javascript
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { public: true } },
  { path: '/', redirect: '/candidates' },
  { path: '/candidates', name: 'CandidateList', component: () => import('../views/CandidateList.vue'), meta: { title: '候选人列表' } },
  { path: '/candidates/new', name: 'CandidateForm', component: () => import('../views/CandidateForm.vue'), meta: { title: '新增候选人' } },
  { path: '/candidates/:id/edit', name: 'CandidateEdit', component: () => import('../views/CandidateForm.vue'), meta: { title: '编辑候选人' } },
  { path: '/candidates/:id', name: 'CandidateDetail', component: () => import('../views/CandidateDetail.vue'), meta: { title: '候选人详情' } },
  { path: '/import', name: 'BatchImport', component: () => import('../views/BatchImport.vue'), meta: { title: '批量导入', requireAdmin: true } },
  { path: '/users', name: 'UserList', component: () => import('../views/UserList.vue'), meta: { title: '用户管理', requireAdmin: true } },
  { path: '/users/new', name: 'UserForm', component: () => import('../views/UserForm.vue'), meta: { title: '新增用户', requireAdmin: true } },
  { path: '/users/:id/edit', name: 'UserEdit', component: () => import('../views/UserForm.vue'), meta: { title: '编辑用户', requireAdmin: true } },
  { path: '/operation-logs', name: 'OperationLogs', component: () => import('../views/OperationLogs.vue'), meta: { title: '操作日志', requireAdmin: true } }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.public) {
    return next()
  }

  if (!authStore.isLoggedIn) {
    return next('/login')
  }

  if (to.meta.requireAdmin && !authStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    return next('/candidates')
  }

  next()
})

export default router
```

> **注意：** 需要在 router/index.js 顶部 `import { ElMessage } from 'element-plus'`

- [ ] **Step 5: 修改 `App.vue` 添加用户信息和权限菜单**

在侧边栏菜单中添加管理员菜单项，在顶部添加用户信息和登出按钮：

```vue
<!-- 在 el-menu 中追加管理员菜单（仅管理员可见） -->
<el-menu-item v-if="authStore.isAdmin" index="/users">
  <el-icon><UserFilled /></el-icon><span>用户管理</span>
</el-menu-item>
<el-menu-item v-if="authStore.isAdmin" index="/operation-logs">
  <el-icon><Document /></el-icon><span>操作日志</span>
</el-menu-item>

<!-- 顶部 header 改为： -->
<el-header style="height: 56px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--el-border-color-light); background: #fff;">
  <el-breadcrumb separator="/">
    <el-breadcrumb-item :to="{ path: '/candidates' }">人才库</el-breadcrumb-item>
    <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
  </el-breadcrumb>
  <el-dropdown>
    <span style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--el-text-color-regular);">
      <el-avatar :size="28" style="background: var(--el-color-primary); font-size: 12px;">{{ authStore.user?.displayName?.charAt(0) || 'U' }}</el-avatar>
      {{ authStore.user?.displayName || authStore.user?.username }}
      <el-tag v-if="authStore.isAdmin" size="small" type="danger" effect="plain">管理员</el-tag>
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</el-header>
```

在 `<script setup>` 中添加：

```javascript
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { Document } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
```

- [ ] **Step 6: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement login page, auth store, token interceptor, and route guards"
```

---

### Task 16: 前端用户管理页

**Files:**
- Create: `talent-pool/client/src/views/UserList.vue`
- Create: `talent-pool/client/src/views/UserForm.vue`
- Modify: `talent-pool/client/src/api/index.js`（追加用户管理 API）

- [ ] **Step 1: 在 `client/src/api/index.js` 追加用户管理 API**

```javascript
// 用户管理
export const getUsers = () => api.get('/auth/users')
export const createUser = (data) => api.post('/auth/users', data)
export const updateUser = (id, data) => api.put(`/auth/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/auth/users/${id}`)
export const updateUserStatus = (id, status) => api.patch(`/auth/users/${id}/status`, { status })
export const getUserPositions = (id) => api.get(`/auth/users/${id}/positions`)
export const setUserPositions = (id, positions) => api.put(`/auth/users/${id}/positions`, { positions })
export const getAvailablePositions = () => api.get('/talent/positions/available')
export const getOperationLogs = (params) => api.get('/auth/operation-logs', { params })

// 批量操作
export const batchUpdateUserStatus = (userIds, status) => api.patch('/auth/users/batch/status', { userIds, status })
export const batchDeleteUsers = (userIds) => api.post('/auth/users/batch/delete', { userIds })
export const batchSetPositions = (userIds, positions) => api.put('/auth/users/batch/positions', { userIds, positions })
```

- [ ] **Step 2: 创建用户列表页 `client/src/views/UserList.vue`**

```vue
<template>
  <div>
    <el-card shadow="never">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: var(--el-text-color-secondary);">共 {{ users.length }} 个账号</span>
        <el-button type="primary" @click="$router.push('/users/new')">
          <el-icon><Plus /></el-icon> 新增用户
        </el-button>
      </div>

      <!-- 批量操作工具栏（选中行后显示） -->
      <el-alert
        v-if="selectedRows.length > 0"
        type="info"
        :closable="false"
        style="margin-bottom: 12px;"
      >
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span>已选择 <b>{{ selectedRows.length }}</b> 个账号</span>
          <el-button size="small" type="success" plain @click="handleBatchStatus('active')">批量启用</el-button>
          <el-button size="small" type="warning" plain @click="handleBatchStatus('disabled')">批量禁用</el-button>
          <el-button size="small" type="primary" plain @click="openBatchPositionDialog">批量分配岗位</el-button>
          <el-popconfirm title="确定删除选中的账号吗？此操作不可撤销。" @confirm="handleBatchDelete">
            <template #reference>
              <el-button size="small" type="danger" plain>批量删除</el-button>
            </template>
          </el-popconfirm>
          <el-button size="small" link @click="clearSelection">取消选择</el-button>
        </div>
      </el-alert>

      <el-table
        ref="tableRef"
        :data="users"
        v-loading="loading"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" :selectable="canSelect" />
        <el-table-column label="用户名" min-width="140">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 10px;">
              <el-avatar :size="32" style="background: var(--el-color-primary); font-size: 14px;">{{ (row.display_name || row.username).charAt(0) }}</el-avatar>
              <div>
                <div style="font-weight: 500;">{{ row.display_name || row.username }}</div>
                <div style="font-size: 12px; color: var(--el-text-color-secondary);">{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" effect="light">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small" effect="plain">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="岗位权限" min-width="200">
          <template #default="{ row }">
            <template v-if="row.role === 'admin'">
              <el-tag size="small" type="warning">全部岗位</el-tag>
            </template>
            <template v-else>
              <el-tag v-for="pos in row.positions" :key="pos" size="small" style="margin-right: 4px; margin-bottom: 4px;">{{ pos }}</el-tag>
              <span v-if="!row.positions || row.positions.length === 0" style="color: var(--el-text-color-secondary);">未分配</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最后登录" width="170">
          <template #default="{ row }">{{ row.last_login_at || '从未登录' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="$router.push(`/users/${row.id}/edit`)">编辑</el-button>
            <el-button type="success" link size="small" v-if="row.role !== 'admin'" @click="openPositionDialog(row)">分配岗位</el-button>
            <el-button type="warning" link size="small" @click="handleToggleStatus(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm title="确定删除该用户吗？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button type="danger" link size="small" :disabled="row.id === currentUserId">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 岗位权限分配对话框（单个或批量） -->
    <el-dialog v-model="positionDialogVisible" :title="positionDialogTitle" width="500px">
      <div v-if="batchMode" style="margin-bottom: 12px; color: var(--el-text-color-secondary); font-size: 13px;">
        将为以下 {{ selectedRows.length }} 个账号统一设置岗位权限，原权限会被覆盖：
        <div style="margin-top: 6px;">
          <el-tag v-for="u in selectedRows" :key="u.id" size="small" style="margin-right: 4px; margin-bottom: 4px;">
            {{ u.display_name || u.username }}
          </el-tag>
        </div>
      </div>
      <el-checkbox-group v-model="selectedPositions">
        <el-checkbox v-for="pos in availablePositions" :key="pos" :label="pos" :value="pos" style="margin-bottom: 8px;">
          {{ pos }}
        </el-checkbox>
      </el-checkbox-group>
      <div v-if="availablePositions.length === 0" style="color: var(--el-text-color-secondary);">
        暂无岗位数据，请先在候选人中添加岗位信息。
      </div>
      <template #footer>
        <el-button @click="positionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePositions">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getUsers, deleteUser, updateUserStatus,
  getUserPositions, setUserPositions, getAvailablePositions,
  batchUpdateUserStatus, batchDeleteUsers, batchSetPositions
} from '../api'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const currentUserId = authStore.user?.userId

const users = ref([])
const loading = ref(false)
const tableRef = ref(null)
const selectedRows = ref([])

const positionDialogVisible = ref(false)
const selectedPositions = ref([])
const availablePositions = ref([])
const editingUserId = ref(null)
const batchMode = ref(false)

const positionDialogTitle = computed(() => batchMode.value ? '批量分配岗位权限' : '分配岗位权限')

function canSelect(row) {
  // 当前登录用户不可选中（避免误删/误禁用自己）
  return row.id !== currentUserId
}

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getUsers()
    users.value = res.data.data
  } finally {
    loading.value = false
  }
}

async function handleToggleStatus(row) {
  try {
    const newStatus = row.status === 'active' ? 'disabled' : 'active'
    await updateUserStatus(row.id, newStatus)
    ElMessage.success(newStatus === 'active' ? '已启用' : '已禁用')
    fetchData()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

async function handleDelete(row) {
  try {
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

// ========= 单个用户分配岗位 =========
async function openPositionDialog(row) {
  batchMode.value = false
  editingUserId.value = row.id
  const [positionsRes, availableRes] = await Promise.all([
    getUserPositions(row.id),
    getAvailablePositions()
  ])
  selectedPositions.value = positionsRes.data.data
  availablePositions.value = availableRes.data.data
  positionDialogVisible.value = true
}

// ========= 批量分配岗位 =========
async function openBatchPositionDialog() {
  if (selectedRows.value.length === 0) return
  batchMode.value = true
  editingUserId.value = null
  const availableRes = await getAvailablePositions()
  availablePositions.value = availableRes.data.data
  // 默认勾选所有选中用户的交集（简化为不预选）
  selectedPositions.value = []
  positionDialogVisible.value = true
}

async function handleSavePositions() {
  try {
    if (batchMode.value) {
      const ids = selectedRows.value.map(u => u.id)
      await batchSetPositions(ids, selectedPositions.value)
      ElMessage.success(`已为 ${ids.length} 个用户更新岗位权限`)
    } else {
      await setUserPositions(editingUserId.value, selectedPositions.value)
      ElMessage.success('岗位权限已更新')
    }
    positionDialogVisible.value = false
    clearSelection()
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '保存失败')
  }
}

// ========= 批量启用/禁用 =========
async function handleBatchStatus(status) {
  const ids = selectedRows.value.map(u => u.id)
  try {
    const res = await batchUpdateUserStatus(ids, status)
    ElMessage.success(res.data.message || `已${status === 'active' ? '启用' : '禁用'} ${ids.length} 个账号`)
    clearSelection()
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  }
}

// ========= 批量删除 =========
async function handleBatchDelete() {
  const ids = selectedRows.value.map(u => u.id)
  try {
    const res = await batchDeleteUsers(ids)
    ElMessage.success(res.data.message || `已删除 ${ids.length} 个账号`)
    clearSelection()
    fetchData()
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '删除失败')
  }
}

onMounted(fetchData)
</script>
```

- [ ] **Step 3: 创建用户表单页 `client/src/views/UserForm.vue`**

```vue
<template>
  <div style="max-width: 600px;">
    <el-page-header @back="$router.back()" :content="isEdit ? '编辑用户' : '新增用户'" style="margin-bottom: 20px;" />

    <el-card shadow="never">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="用户名" prop="username" v-if="!isEdit">
          <el-input v-model="form.username" placeholder="登录账号" />
        </el-form-item>
        <el-form-item label="用户名" v-else>
          <el-input :value="form.username" disabled />
        </el-form-item>
        <el-form-item label="显示名称" prop="display_name">
          <el-input v-model="form.display_name" placeholder="中文名/显示名" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="form.role">
            <el-radio value="user">普通用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="isEdit ? '重设密码' : '密码'" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="isEdit ? '留空不修改' : '必填'" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="saving">{{ isEdit ? '保存' : '创建' }}</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createUser, updateUser, getUsers } from '../api'

const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!route.params.id)
const formRef = ref(null)
const saving = ref(false)

const form = reactive({
  username: '', display_name: '', role: 'user', password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    {
      validator: (rule, value, callback) => {
        if (!isEdit.value && !value) {
          callback(new Error('请输入密码'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

async function handleSubmit() {
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    const data = { display_name: form.display_name, role: form.role }
    if (form.password) data.password = form.password
    if (!isEdit.value) data.username = form.username

    if (isEdit.value) {
      await updateUser(route.params.id, data)
      ElMessage.success('保存成功')
    } else {
      await createUser(data)
      ElMessage.success('创建成功')
    }
    router.push('/users')
  } catch (e) {
    ElMessage.error(e.response?.data?.message || '操作失败')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (isEdit.value) {
    const res = await getUsers()
    const user = res.data.data.find(u => u.id === route.params.id)
    if (user) {
      Object.assign(form, { username: user.username, display_name: user.display_name, role: user.role })
    }
  }
})
</script>
```

- [ ] **Step 4: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement user management UI with batch operations and position assignment"
```

---

### Task 17: 前端操作日志页

**Files:**
- Create: `talent-pool/client/src/views/OperationLogs.vue`

- [ ] **Step 1: 创建操作日志页 `client/src/views/OperationLogs.vue`**

```vue
<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px;">
      <el-form :model="filters" inline>
        <el-form-item label="用户">
          <el-input v-model="filters.username" placeholder="用户名" clearable @clear="fetchData" @keyup.enter="fetchData" style="width: 160px;" />
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select v-model="filters.action" placeholder="全部" clearable style="width: 180px;" @change="fetchData">
            <el-option label="登录" value="login" />
            <el-option label="创建用户" value="create_user" />
            <el-option label="删除用户" value="delete_user" />
            <el-option label="更新用户" value="update_user" />
            <el-option label="改用户状态" value="update_user_status" />
            <el-option label="批量改状态" value="batch_update_status" />
            <el-option label="批量删用户" value="batch_delete_users" />
            <el-option label="批量改岗位" value="batch_update_positions" />
            <el-option label="创建候选人" value="create_candidate" />
            <el-option label="删除候选人" value="delete_candidate" />
            <el-option label="上传附件" value="upload_attachment" />
            <el-option label="删除附件" value="delete_attachment" />
            <el-option label="修改岗位权限" value="update_positions" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">查询</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="logs" v-loading="loading" stripe>
        <el-table-column prop="created_at" label="时间" width="170" />
        <el-table-column prop="username" label="操作人" width="120" />
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-tag :type="getActionTagType(row.action)" size="small">{{ getActionLabel(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource_type" label="对象类型" width="100" />
        <el-table-column label="详情" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.detail ? row.detail : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="ip_address" label="IP" width="140" />
      </el-table>

      <el-pagination
        v-model:current-page="filters.page"
        :total="total"
        :page-size="50"
        layout="total, prev, pager, next"
        style="margin-top: 16px; justify-content: flex-end;"
        @current-change="fetchData"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { getOperationLogs } from '../api'

const logs = ref([])
const total = ref(0)
const loading = ref(false)
const filters = reactive({ username: '', action: '', page: 1 })

const ACTION_LABELS = {
  login: '登录', logout: '登出',
  create_user: '创建用户', delete_user: '删除用户', update_user: '更新用户', update_user_status: '改用户状态',
  batch_update_status: '批量改状态', batch_delete_users: '批量删用户', batch_update_positions: '批量改岗位',
  create_candidate: '创建候选人', delete_candidate: '删除候选人',
  upload_attachment: '上传附件', delete_attachment: '删除附件',
  update_positions: '改岗位权限'
}

const ACTION_TAG_TYPES = {
  login: 'info', logout: 'info',
  create_user: 'success', create_candidate: 'success', upload_attachment: 'success',
  delete_user: 'danger', delete_candidate: 'danger', delete_attachment: 'danger',
  batch_delete_users: 'danger',
  update_user: 'warning', update_user_status: 'warning', update_positions: 'warning',
  batch_update_status: 'warning', batch_update_positions: 'warning'
}

function getActionLabel(action) { return ACTION_LABELS[action] || action }
function getActionTagType(action) { return ACTION_TAG_TYPES[action] || 'info' }

async function fetchData() {
  loading.value = true
  try {
    const params = { page: filters.page, pageSize: 50 }
    if (filters.username) params.username = filters.username
    if (filters.action) params.action = filters.action
    const res = await getOperationLogs(params)
    logs.value = res.data.data
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>
```

- [ ] **Step 2: 提交**

```bash
cd /Users/yq/Documents/zhihr && git add talent-pool/ && git commit -m "feat(talent-pool): implement operation logs viewer page"
```

---

## 部署后验证清单

- [ ] `https://zhihr.vip/talent-pool/` 能正常访问前端
- [ ] 未登录访问自动跳转登录页
- [ ] 首次注册自动成为管理员，后续注册被拒绝
- [ ] 管理员可创建/编辑/删除用户，分配岗位权限
- [ ] 管理员可多选用户进行批量启用/禁用/删除/分配岗位
- [ ] 普通用户只能看到分配岗位的候选人
- [ ] 管理员可查看所有候选人
- [ ] `https://api.zhihr.vip/api/talent/candidates` 未带 Token 返回 401
- [ ] 前端能成功调用 API（CORS 配置正确）
- [ ] 上传简历文件能成功存入 R2
- [ ] 下载附件能正确从 R2 返回文件
- [ ] 批量导入 Excel 功能正常（管理员 only）
- [ ] 操作日志记录登录/用户管理/删除等关键操作
- [ ] 前端路由刷新不 404（GitHub Pages 子路径）

## 关键设计决策

1. **后端集成到现有 Worker**：而非新建独立服务，复用路由/CORS/D1 绑定，降低运维复杂度
2. **R2 而非 D1 存文件**：D1 是结构化数据库，R2 是对象存储，各司其职；R2 零出站流量费
3. **`talent_` 表前缀**：避免与现有 `miaodu_`/`users`/`reviews` 表冲突
4. **Workers 兼容解析库**：`unpdf`（PDF）和 `fflate`（Word docx 解压）是纯 JS 实现，兼容 V8 runtime
5. **前端 `/talent-pool/` 子路径**：与现有 `/miaodu/`、`/pinyin-graph/` 模式一致
6. **首个注册用户自动管理员**：无需手动配置，首个注册者获得管理员角色，后续注册关闭
7. **按岗位分类的数据权限**：`talent_user_positions` 表映射用户与岗位，普通用户仅可见分配岗位的候选人
8. **关键操作日志**：登录/用户管理/删除/附件操作记录到 `talent_operation_logs`，日常查看编辑不记录
