# API 后端代码审查报告

**审查时间**: 2026-07-21
**审查范围**: `/api/` 目录下所有源代码、配置文件、数据库 schema
**审查目标**: 安全性、输入验证、API 设计、Cloudflare Workers 特定问题

---

## 一、摘要

| 严重级别 | 数量 |
|---------|------|
| 🔴 Critical | 1 |
| 🟠 High | 5 |
| 🟡 Medium | 14 |
| 🔵 Low | 5 |
| **总计** | **25** |

---

## 二、详细问题列表

### 🔴 [Critical] C-1: `miaodu.js` 全局 SQL 注入漏洞（多处）

**文件**: `src/modules/miaodu.js`

**描述**: `miaodu.js` 中的多个函数使用字符串拼接构建 SQL 查询，仅通过替换单引号进行"消毒"，这是经典的 SQL 注入脆弱模式，**极易被绕过**。与项目中其他模块使用 `db.prepare('...').bind(...)` 的安全模式形成鲜明对比。

**受影响函数及代码**:

```js
// miaodu.js:13 — searchBookByTitle
const kpSql = `SELECT * FROM miaodu_knowledge_points WHERE book_id = ${book.id} ORDER BY sort_order`

// miaodu.js:36-41 — createSubmission
const title = data.title.replace(/'/g, "''")
const sql = `INSERT INTO miaodu_submissions (...) VALUES ('${title}', '${type}', ...)`

// miaodu.js:166-169 — handleGetAllSubmissions
sql = `SELECT * FROM miaodu_submissions WHERE status = '${status.replace(/'/g, "''")}' ...`

// miaodu.js:198-199 — handleUpdateSubmission
const sql = `UPDATE miaodu_submissions SET status = '${status}', ... WHERE id = ${id}`

// miaodu.js:217-228 — handleAddBook
const sql = `INSERT INTO miaodu_books (...) VALUES ('${title}', ${author}, ...)`

// miaodu.js:266-268 — handleBatchSubmit
const sql = `INSERT INTO miaodu_books (...) VALUES ('${title}', ${author}, ..., '${content}', ...)`
```

**风险**: `book.id` 可能来自前一个查询结果，`status` 为 URL 参数，`title/type/content` 直接来自 `request.json()`。攻击者可以通过精心构造的输入（如 `'; DROP TABLE miaodu_books; --`）执行任意 SQL。

**建议修复**: 将所有字符串拼接的 SQL 替换为参数化查询：
```js
// 错误
const kpSql = `SELECT * FROM miaodu_knowledge_points WHERE book_id = ${book.id}`

// 正确
const kps = await db.prepare(
  'SELECT * FROM miaodu_knowledge_points WHERE book_id = ?'
).bind(book.id).all()
```

---

### 🟠 [High] H-1: `wrangler.toml` 硬编码阿里云 OSS AccessKey ID

**文件**: `wrangler.toml` (L34)

```toml
OSS_ACCESS_KEY_ID = "LTAI5t8woxmzKqZJK2SoT6bQ"
```

**描述**: 阿里云 OSS 访问密钥 ID 明文写在配置文件中。虽然文件被 `exclude` 排除，但在仓库历史、构建日志、`wrangler dev` 本地缓存中仍可能被泄露。

**建议修复**:
1. 使用 `wrangler secret put OSS_ACCESS_KEY_ID` 将密钥 ID 改为 Secret 存储
2. 从 `wrangler.toml` 中移除该字段，仅在文档注释中说明配置方式
3. 已暴露的 AccessKey 应立即轮换

---

### 🟠 [High] H-2: `checkRateLimit` 在 KV 异常时自动放行请求

**文件**: `src/utils/router.js` (L176-190)

```js
async function checkRateLimit(env, key, maxRequests) {
  try {
    const count = await env.RATE_LIMITER?.get(windowKey)
    const current = parseInt(count || '0') + 1
    await env.RATE_LIMITER?.put(windowKey, String(current))
    return current <= maxRequests
  } catch {
    return true  // ← 异常时直接放行
  }
}
```

**描述**: 当 KV 服务不可用或抛出异常时，速率限制器默认返回 `true`（允许请求），相当于完全禁用限流。在 Cloudflare KV 偶发性故障场景下，所有受保护的接口都会失去速率限制。

**建议修复**: `catch` 分支应返回 `false`（拒绝请求）或记录告警后降级，并辅以应用层面的兜底机制：
```js
  } catch {
    debugLog('RateLimit', 'KV unavailable, rejecting request for safety')
    return false  // fail-closed
  }
```

---

### 🟠 [High] H-3: `preview.js` 文件预览缺少 HTML 消毒（XSS 风险）

**文件**: `src/modules/talent/preview.js` (L40-58)

```js
if (fileType === 'docx') {
  const html = docxToHtml(arrayBuffer)  // ← 未通过 sanitizeHtml()
  return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
} else if (fileType === 'doc') {
  const html = docToHtml(arrayBuffer)   // ← 未通过 sanitizeHtml()
  return jsonResponse({ success: true, data: { type: 'html', html } }, 200, corsHeaders)
}
```

**描述**: `preview.js` 对内部用户返回的 DOCX/DOC 转换 HTML **没有经过 `sanitizeHtml()` 消毒**。而 `share-public.js` 和 `resume-share-public.js` 已对公开接口做了消毒处理。如果恶意用户上传包含 `<script>` 或 `on*` 事件处理器的 DOC 文件，内部用户预览时可能触发 XSS。

**对比（share-public.js 中的安全做法）**:
```js
// share-public.js:145
const html = sanitizeHtml(docxToHtml(arrayBuffer))  // ✅ 已消毒
```

**建议修复**: 在 `preview.js` 的 `docxToHtml`、`docToHtml`、`txtToHtml` 调用后均添加 `sanitizeHtml()`：
```js
const html = sanitizeHtml(docxToHtml(arrayBuffer))
```

---

### 🟠 [High] H-4: `updateEvaluation` 更新评价时缺少 `candidate_id` 隔离

**文件**: `src/modules/talent/evaluations.js` (L136-140)

```js
await env.DB.prepare(
  `UPDATE talent_interview_evaluations SET ${fields.join(', ')} WHERE id = ?`
).bind(...values).run()
```

**描述**: 查询现有评价时使用了 `candidate_id` 过滤（L105-106），但在执行 UPDATE 时**仅使用 `evalId`（评价 ID）作为 WHERE 条件**，没有额外校验 `candidate_id = ?`。虽然评价 ID 本身是整数递增的，攻击者无法跨候选人访问，但这是一个防御深度缺失的问题——如果未来评价 ID 生成方式变更（如 UUID），可能存在跨资源操作风险。

**建议修复**: 在 UPDATE 语句中加入 `candidate_id` 约束：
```js
`UPDATE talent_interview_evaluations SET ${fields.join(', ')} WHERE id = ? AND candidate_id = ?`
).bind(...values, params.id).run()
```

---

### 🟡 [Medium] M-1: `CORS` 允许未知 Origin 时使用第一个域名，未明确拒绝

**文件**: `src/utils/router.js` (L156-168)

```js
function getCorsHeaders(request, env) {
  const origins = env?.ALLOWED_ORIGINS || ''
  const allowedOrigins = origins.split(',').map(o => o.trim()).filter(Boolean)
  const origin = request.headers.get('Origin') || ''
  // ↓ 不在白名单时，使用白名单第一个域名，而非空字符串
  const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || ''
```

**描述**: 当请求的 `Origin` 不在 `ALLOWED_ORIGINS` 白名单中时，CORS 响应头会被设置为白名单中的第一个域名（`https://zhihr.vip`），而不是空字符串或拒绝。这意味着**任意来源的请求都能通过 CORS 检查**，只要浏览器发送了 `Origin` 头。

**建议修复**: 不在白名单时不应设置 `Access-Control-Allow-Origin`，或返回 403：
```js
const allowOrigin = allowedOrigins.includes(origin) ? origin : ''
if (!allowOrigin && origin !== 'null' && request.credentials === 'include') {
  return new Response(null, { status: 403, headers: {} })
}
```

---

### 🟡 [Medium] M-2: `reviews.js` 使用 `getAuthenticatedUser` 而非 `getAuthUser`（缺少数据库状态校验）

**文件**: `src/modules/reviews.js`

```js
import { getAuthenticatedUser } from '../utils/router.js'
const user = await getAuthenticatedUser(request, env)  // ← 只验证 JWT，不查 DB
```

**描述**: `getAuthenticatedUser` 只验证 JWT token 的签名和过期时间，**不查询数据库检查用户是否被禁用**或账号是否还存在。而 `getAuthUser`（用于人才库模块）会额外检查 `users.status !== 'disabled'`。

**影响**: 如果管理员禁用了某个用户账号，该用户仍可通过有效的 JWT access token 继续访问复盘记录接口，直到 token 过期（最长 1 小时）。

**建议修复**: 将 `reviews.js` 中的所有 `getAuthenticatedUser` 替换为 `getAuthUser`。

---

### 🟡 [Medium] M-3: `excel-import.js` 手动设置 CORS 头为 `*`，覆盖白名单策略

**文件**: `src/modules/talent/excel-import.js` (L71)

```js
return new Response(buffer, {
  headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename=talent-pool-template.xlsx',
    'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'] || '*'  // ← 兜底为 *
  }
})
```

**描述**: 当 CORS 头无法从全局配置获取时，下载模板接口会回退为 `Access-Control-Allow-Origin: *`，允许任意来源访问。

**建议修复**: 移除手动设置，让框架层面的 `getCorsHeaders` 统一管理：
```js
const headers = { ...corsHeaders, ... }
return new Response(buffer, { headers })
```

---

### 🟡 [Medium] M-4: `getUploadUrl` 依赖客户端提交的 `file_size` 做大小校验

**文件**: `src/modules/talent/upload.js` (L78-84)

```js
const fileSize = parseInt(url.searchParams.get('file_size') || '0', 10)
if (fileSize > MAX_FILE_SIZE) {
  return jsonResponse({ success: false, message: `文件大小不能超过 ...` }, 400, corsHeaders)
}
```

**描述**: 文件大小限制基于客户端通过 URL 参数提交的 `file_size` 值，该值可被攻击者伪造（例如设为 1）。实际文件上传到 OSS 时不受此限制，可能导致超大文件存储成本或配额滥用。

**建议修复**: 在 OSS 服务端（或确认上传阶段）再次校验实际文件大小。

---

### 🟡 [Medium] M-5: `checkDuplicate` 使用原始姓名查询而非规范化姓名

**文件**: `src/modules/talent/candidates.js` (L210-216)

```js
const rows = await env.DB.prepare(
  `SELECT id, name, phone, email, position, status, created_at
   FROM talent_candidates
   WHERE name = ?
   ORDER BY created_at DESC LIMIT 50`
).bind(rawName.trim()).all()
```

**描述**: `checkDuplicate` 接口在查重时，将输入的原始姓名 `rawName.trim()` 直接传入 `WHERE name = ?`，而非使用已规范化的 `normalizedName`。如果数据库中的姓名包含空格或其他不可见字符，可能漏判重复。

**建议修复**: 使用 `normalizedName` 进行数据库查询：
```js
WHERE name = ?
).bind(normalizedName).all()
```

---

### 🟡 [Medium] M-6: `reviews.js` PUT 按 ID 更新时缺少日期唯一性保护

**文件**: `src/modules/reviews.js` (L295-301)

```js
if (updates.review_date !== undefined) {
  fields.push('review_date = ?')
  params.push(updates.review_date)
} else if (updates.date !== undefined) {
  fields.push('review_date = ?')
  params.push(updates.date)
}
```

**描述**: `handleUpdateReview` 允许直接修改 `review_date` 字段，但**没有检查新日期是否与其他已有复盘记录冲突**。`CREATE` 接口有"同日自动覆盖"逻辑，但 `PUT` 接口绕过该逻辑，可能导致同一用户拥有两条相同日期的复盘记录。

**建议修复**: 在更新日期前检查是否有其他同日期记录，或添加数据库唯一约束。

---

### 🟡 [Medium] M-7: `reviews.js` `handleCreateReview` 允许客户端传递自定义 `body.id`

**文件**: `src/modules/reviews.js` (L125-133)

```js
const reviewId = body.id || generateId()
debugLog('Reviews', 'reviewId:', reviewId, 'date:', review_date)
if (body.id) {
  const existing = await db.prepare('SELECT id FROM reviews WHERE id = ? ...')
```

**描述**: 客户端可以在创建复盘时传递自定义的 `id` 字段。如果该 ID 恰好与已有记录冲突，接口会悄悄转换为"更新"操作（silent overwrite）。这可能导致意外覆盖其他用户的记录（虽然已有 `user_id` 约束，但行为不透明）。

**建议修复**: 在创建接口中忽略客户端传递的 `id`，始终使用服务端生成的 ID：
```js
const reviewId = generateId()  // 不使用 body.id
```

---

### 🟡 [Medium] M-8: `reviews.js` `handleSyncReviews` 批量同步缺少数量限制

**文件**: `src/modules/reviews.js` (L384-408)

```js
for (const review of clientReviews) {
  if (!review.id || !review.date) continue
  // ... 每个 review 都生成 batchOp
}
if (batchOps.length > 0) {
  await db.batch(batchOps)
}
```

**描述**: 同步接口对 `clientReviews` 数组长度没有上限限制。恶意用户可提交成千上万条记录，导致 D1 batch 操作超时或数据库压力过大。

**建议修复**: 添加最大同步数量限制（如 100 条）：
```js
if (clientReviews.length > 100) {
  return jsonResponse({ success: false, message: '同步数据不能超过 100 条' }, 400, corsHeaders)
}
```

---

### 🟡 [Medium] M-9: `reviews.js` `JSON.parse` 未加 try-catch，可能返回 500

**文件**: `src/modules/reviews.js` (多处)

```js
content: review.content ? JSON.parse(review.content) : null,  // L63, L96, L143, L165...
```

**描述**: 多个响应序列化点直接对 `review.content` 调用 `JSON.parse`，没有 try-catch。如果数据库中存入了非法 JSON（如手动写入或历史迁移数据），会抛出异常导致 500 错误。

**建议修复**: 封装安全解析函数：
```js
function safeParse(jsonStr) {
  try { return JSON.parse(jsonStr) } catch { return null }
}
```

---

### 🟡 [Medium] M-10: 无全局未捕获异常处理，请求可能被静默挂起

**文件**: `src/index.js` (L47-51)

```js
export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env, ctx)
  }
}
```

**描述**: `fetch` handler 中没有 `try-catch`。如果 `handleRequest` 中任何未捕获的异步异常传播上来，Cloudflare Workers 将返回 500 但不提供任何结构化错误信息，且不会记录有意义的日志。

**建议修复**: 添加顶层异常捕获：
```js
export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env, ctx)
    } catch (err) {
      console.error('Unhandled error:', err)
      return jsonResponse({ success: false, message: '服务器内部错误' }, 500)
    }
  }
}
```

---

### 🟡 [Medium] M-11: `parse-queue.js` 异步任务执行中 `ctx.waitUntil` 可能导致任务丢失

**文件**: `src/modules/talent/parse-queue.js` (L75-77)

```js
if (ctx && typeof ctx.waitUntil === 'function') {
  ctx.waitUntil(processPromise)
}
```

**描述**: 批量解析任务通过 `ctx.waitUntil()` 在 Worker 响应返回后异步执行。如果 Cloudflare Workers 在该请求的 30 秒超时内未完成任务，任务可能被终止。虽然代码中有超时标记逻辑（L169-177），但一旦 `waitUntil` 被终止，超时标记代码永远不会执行，`parsing` 状态的任务将永远挂起。

**建议修复**: 将解析任务提交到独立的 Cloudflare Durable Object 或 Worker Cron Trigger，而不是依赖 `waitUntil`。

---

### 🟡 [Medium] M-12: `parse-queue.js` `getBatchStatus` 查询跨用户时不校验 `user_id`

**文件**: `src/modules/talent/parse-queue.js` (L187-189)

```js
const pendingTasks = await env.DB.prepare(
  `SELECT ... FROM talent_parse_tasks WHERE status = 'pending' ORDER BY created_at LIMIT ?`
).bind(slots).all()
```

**描述**: 在 `getBatchStatus` 中触发待处理任务时，`pendingTasks` 查询**没有过滤 `user_id`**，可能启动属于其他用户的 pending 任务。虽然 `processSingleParseTask` 不直接暴露数据，但会消耗当前用户的系统资源。

**建议修复**: 添加用户隔离或使用全局队列管理，确保任务由正确的用户触发。

---

### 🟡 [Medium] M-13: 多个内部模块缺少操作日志记录

**文件**: 多个文件

**描述**: 以下操作没有调用 `logOperation()` 记录审计日志：
- `experiences.js` — 添加/修改/删除工作经历（无日志）
- `candidates.js` `checkDuplicate` — 查重操作（有日志 ✅）
- `excel-import.js` — 批量导入失败行的详情未记录

操作日志是人才库的审计核心，工作经历的增删改也应记录。

**建议修复**: 在 `experiences.js` 的 CRUD 操作中添加 `logOperation` 调用。

---

### 🟡 [Medium] M-14: `share-public.js` 和 `resume-share-public.js` 的 `sanitizeHtml` 存在绕过风险

**文件**: `src/modules/talent/share-public.js` (L12-24), `src/modules/talent/resume-share-public.js` (L17-29)

```js
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*["']?\s*javascript:/gi, '$1="#"')
}
```

**描述**: 手写正则消毒器无法覆盖所有 XSS 向量。以下攻击可绕过：
- `<svg onload=alert(1)>` — `on*` 属性匹配但 `<svg>` 标签本身未被移除
- `<math><mtext><table><img src=x onerror=alert(1)>` — 嵌套绕过
- 大小写混淆或编码绕过

**建议修复**: 使用成熟的 DOMPurify 库或类似的 HTML sanitizer。代码注释中已承认这一点（L10: "生产环境建议用 DOMPurify"）。

---

### 🔵 [Low] L-1: `maskError` 未捕获所有敏感信息泄露风险

**文件**: `src/utils/router.js` (L211-220)

```js
function maskError(error) {
  const message = error?.message || String(error)
  if (message.includes('UNIQUE constraint')) {
    return '该日期已存在复盘记录，请使用覆盖模式'
  }
  if (message.includes('no such table')) {
    return '数据库表不存在，请联系管理员'
  }
  return message || '服务器内部错误，请稍后重试'  // ← 默认返回原始错误信息
}
```

**描述**: 除两个特定模式外，`maskError` 默认直接返回原始错误消息。D1 数据库错误、OSS 签名错误、AI API 错误等都可能泄露内部实现细节。

**建议修复**: 默认返回通用错误消息，仅在白名单中允许透传特定错误：
```js
return '服务器内部错误，请稍后重试'
```

---

### 🔵 [Low] L-2: `verifyPassword` 中 JS 实现的 timing-safe-equals 不防 JIT 优化

**文件**: `src/utils/router.js` (L91-98)

```js
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}
```

**描述**: 自实现的常量时间比较函数在 V8/JIT 环境下无法保证真正的常量时间，虽然实际风险较低，但不如使用 Web Crypto API 的原生比较。

**建议修复**: 使用 `crypto.subtle.verify('HMAC', ...)` 进行密码哈希比较（与 JWT 验证保持一致），或在文档中说明此实现仅用于本地比较，不构成关键安全依赖。

---

### 🔵 [Low] L-3: `package.json` 缺少锁文件的依赖版本固定

**文件**: `package.json` (L13-20)

```json
"devDependencies": {
  "wrangler": "^3.0.0"
},
"dependencies": {
  "xlsx": "^0.18.5",
  "unpdf": "^0.12.0",
  "fflate": "^0.8.0"
}
```

**描述**: 所有依赖使用 `^` 版本范围，`package-lock.json` 虽存在但未在 `exclude` 中被明确保护。Cloudflare Workers 部署时依赖版本漂移可能导致运行时行为变化。

**建议修复**: 使用精确版本（去掉 `^`）或在部署前运行 `npm ci` 确保版本一致。

---

### 🔵 [Low] L-4: 分享链接 token 和 resume share token 永久有效，无过期机制

**文件**: `schema.sql` (L201-227)

```sql
-- 候选人分享链接表（永久有效，token 唯一）
-- 候选人简历分享链接表（永久有效，token 唯一）
```

**描述**: 分享链接一旦创建就永久有效，没有 `expires_at` 字段。如果 token 被泄露或分享链接不再需要，无法通过数据库层面使其失效。

**建议修复**: 添加 `expires_at TEXT` 字段，在验证 token 时检查是否过期。

---

### 🔵 [Low] L-5: `reviews.js` `handleSyncReviews` 使用 `new Date(review.updatedAt || 0).getTime()` 比较时间

**文件**: `src/modules/reviews.js` (L398)

```js
const clientUpdated = new Date(review.updatedAt || 0).getTime()
```

**描述**: 当客户端的 `updatedAt` 字段缺失时，回退值为 `0`，`new Date(0)` 为 1970-01-01，`getTime()` 为 0。这意味着客户端时间戳永远小于服务端（除非服务端也是 1970 年），**本地修改永远不会覆盖服务器数据**，同步逻辑失效。

**建议修复**: 客户端缺失 `updatedAt` 时应视为该记录未修改，跳过同步而非用 `0` 参与比较。

---

## 三、分类统计

### 安全性问题 (Critical + High + Medium)

| 编号 | 类别 | 文件 |
|------|------|------|
| C-1 | SQL 注入 | `miaodu.js` |
| H-1 | 密钥泄露 | `wrangler.toml` |
| H-2 | 限流绕过 | `router.js` |
| H-3 | XSS | `preview.js` |
| H-4 | 授权绕过 | `evaluations.js` |
| M-1 | CORS 配置 | `router.js` |
| M-2 | 认证缺陷 | `reviews.js` |
| M-3 | CORS 配置 | `excel-import.js` |
| M-4 | 输入验证 | `upload.js` |
| M-14 | XSS 绕过 | `share-public.js`, `resume-share-public.js` |

### 数据一致性问题

| 编号 | 描述 | 文件 |
|------|------|------|
| M-5 | 查重姓名规范化不一致 | `candidates.js` |
| M-6 | 日期唯一性保护缺失 | `reviews.js` |
| M-7 | 自定义 ID 静默覆盖 | `reviews.js` |
| M-8 | 同步数量无限制 | `reviews.js` |
| L-5 | 时间比较回退值错误 | `reviews.js` |

### Cloudflare Workers 特定问题

| 编号 | 描述 | 文件 |
|------|------|------|
| M-11 | `waitUntil` 任务可能丢失 | `parse-queue.js` |
| H-2 | KV 故障时限流失效 | `router.js` |

### 审计与可观测性

| 编号 | 描述 | 文件 |
|------|------|------|
| M-13 | 工作经历操作无审计日志 | `experiences.js` |
| M-10 | 缺少全局异常处理 | `index.js` |
| L-1 | 错误消息泄露内部信息 | `router.js` |

---

## 四、正面发现（做得好的地方）

以下方面在审查中被认为设计合理：

1. **密码哈希**: 使用 PBKDF2-SHA256（100,000 次迭代）并支持从旧 SHA-256 格式自动迁移
2. **JWT 实现**: 手写 HS256 签名/验证，参数完整（`iat`, `exp`, `type` 区分 access/refresh token）
3. **人才库权限模型**: 基于岗位的 RBAC 权限系统，非管理员可限定只能查看分配岗位
4. **批量导入限流**: Excel 导入限制 10 个文件、10MB/文件
5. **上传配额**: 非管理员每日 100 份简历上传限制
6. **分享链接安全**: token 使用 `crypto.getRandomValues` 生成（32 字节随机值）
7. **状态流转保护**: 简历分享操作仅允许从 `to_recommend`/`resume_passed` 状态触
8. **评价人锁定**: 分享链接的评价人姓名在创建时锁定，提交时自动使用
9. **操作审计**: 人才库所有关键操作均记录到 `talent_operation_logs`
10. **直传架构**: 文件通过 OSS 签名 URL 直传，不经过 Worker 代理

---

## 五、修复优先级建议

| 优先级 | 修复项 | 预计工作量 |
|--------|--------|-----------|
| P0（立即） | C-1: miaodu.js SQL 注入修复 | 2-3 小时 |
| P0（立即） | H-1: OSS AccessKey 轮换 + 迁移至 Secret | 30 分钟 |
| P1（本周） | H-2: checkRateLimit fail-closed | 30 分钟 |
| P1（本周） | H-3: preview.js 添加 sanitizeHtml | 1 小时 |
| P1（本周） | H-4: evaluations.js UPDATE 加 candidate_id | 30 分钟 |
| P2（本月） | M-1~M-14 中所有 Medium 级别问题 | 4-8 小时 |
| P3（低优先） | L-1~L-5 中所有 Low 级别问题 | 2-4 小时 |
