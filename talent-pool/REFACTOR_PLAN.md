# talent-pool 架构分析与重构方案

> 编制日期：2026-07-18
> 范围：`/Users/yq/Documents/zhihr/api/`（后端 zhihr-api Worker）+ `/Users/yq/Documents/zhihr/talent-pool/client/`（前端）
> 目标：解耦 AI 简历解析、简历上传、简历预览三大模块，提升独立性与可维护性
> 阶段：**方案设计阶段，未开始动手**

---

## 一、现状架构评估

### 1.1 代码规模与分布（实测）

#### 后端（共享 zhihr-api Worker，`/Users/yq/Documents/zhihr/api/`）

| 文件 | 行数 | 职责 |
|---|---|---|
| [src/index.js](file:///Users/yq/Documents/zhihr/api/src/index.js) | 51 | 入口，注册 5 个模块 |
| [src/utils/router.js](file:///Users/yq/Documents/zhihr/api/src/utils/router.js) | 326 | 共享工具：JWT/CORS/鉴权/分页/日志/路由匹配 |
| [src/utils/oss.js](file:///Users/yq/Documents/zhihr/api/src/utils/oss.js) | 186 | 阿里云 OSS 客户端（封装良好） |
| [src/modules/talent.js](file:///Users/yq/Documents/zhihr/api/src/modules/talent.js) | **1588** | **巨型单文件，7 个关注点混合** |
| [src/modules/talent_parsers.js](file:///Users/yq/Documents/zhihr/api/src/modules/talent_parsers.js) | 1005 | 本地文件解析器（PDF/Word/TXT/Excel） |
| [src/modules/talent_auth.js](file:///Users/yq/Documents/zhihr/api/src/modules/talent_auth.js) | 437 | 简历库专用鉴权 |
| 其他（auth/miaodu/reviews） | ~1142 | 其他业务模块 |

#### 后端 `talent.js` 内部分块（实测行号）

| 行号区间 | 功能块 | 行数 | 说明 |
|---|---|---|---|
| L1–17 | imports + MIME 常量 | 17 | — |
| L19–30 | 岗位权限校验 | 12 | `checkPositionPermission` |
| L32–165 | 候选人查询 | 134 | `listCandidates` / `getFilterOptions` / `getCandidate` |
| L167–235 | 简历重复比对 | 69 | `checkDuplicate` + 标准化工具 |
| L237–333 | 候选人写入 | 97 | `createCandidate` / `updateCandidate` / `updateStatus` |
| L335–369 | 候选人删除 | 35 | `deleteCandidate` |
| L371–482 | 工作经历 CRUD | 112 | 4 个 handler |
| L484–697 | 附件管理 + 上传配额 | 214 | 8 个 handler（单附件 OSS 直传链路） |
| **L699–773** | **🚨 预览模块** | **75** | `previewAttachment` 内联 |
| L775–800 | 本地解析接口 | 26 | `parseResume` |
| **L802–1015** | **🚨 AI 解析核心** | **214** | `AI_MODELS` / `callAIWithFallback` / `AI_SYSTEM_PROMPT` / `aiParseResume` |
| L1017–1090 | Excel 批量导入 | 74 | `batchImport` / `downloadTemplate` |
| **L1092–1551** | **🚨 批量解析队列** | **460** | 6 个 handler + `processSingleParseTask` |
| L1553–1588 | 路由注册 | 36 | `routes` 数组 |

**问题**：单文件 1588 行，远超单文件可维护阈值（建议 ≤ 500 行）。AI 解析、批量队列、预览三块本应独立，却全部内联在 `talent.js` 中。

#### 前端（`/Users/yq/Documents/zhihr/talent-pool/client/`）

| 文件 | 行数 | 职责 |
|---|---|---|
| [views/BatchImport.vue](file:///Users/yq/Documents/zhihr/talent-pool/client/src/views/BatchImport.vue) | 565 | 批量上传 + 进度轮询 + 卡住检测 + 重启 |
| [views/CandidateForm.vue](file:///Users/yq/Documents/zhihr/talent-pool/client/src/views/CandidateForm.vue) | 490 | 单文件 AI 解析 + 表单回填 + 附件上传 + 重复检查 |
| [views/CandidateDetail.vue](file:///Users/yq/Documents/zhihr/talent-pool/client/src/views/CandidateDetail.vue) | 468 | 详情 + 预览 + 附件上传/下载 |
| [components/PdfPreview.vue](file:///Users/yq/Documents/zhihr/talent-pool/client/src/components/PdfPreview.vue) | 164 | 仅 PDF 渲染（pdfjs-dist） |
| [api/index.js](file:///Users/yq/Documents/zhihr/talent-pool/client/src/api/index.js) | 87 | 所有 API 集中平铺，未按子域分组 |
| 其他视图/组件 | ~1100 | — |

### 1.2 架构现状结论

1. **后端是 monorepo 共享 Worker**：`zhihr-api` 同时服务 talent-pool / miaodu / reviews 等多个前端。talent-pool 的后端逻辑全部塞在 `api/src/modules/talent.js`，无法独立演进。
2. **`talent.js` 是事实上的"上帝模块"**：1588 行混合候选人 CRUD、工作经历、附件、预览、AI 解析、批量队列、Excel 导入 7 个关注点。
3. **AI 解析逻辑位置错误**：`callAIWithFallback` / `AI_MODELS` / `AI_SYSTEM_PROMPT` 位于 talent.js L802–986，但语义上应与 `talent_parsers.js`（本地文本提取）同属"解析域"。
4. **批量队列与业务写入强耦合**：`processSingleParseTask`（L1224–1330）直接 `INSERT talent_candidates` + `INSERT talent_work_experiences` + `INSERT talent_attachments`，把"队列调度"和"候选人/附件入库"耦合在一起。
5. **前端 OSS 直传逻辑三处重复**：BatchImport.vue L441–454、CandidateDetail.vue L175–232、CandidateForm.vue L287–334 各写一遍 XHR + Content-Type 处理 + OSS XML 错误解析。
6. **前端预览逻辑内联**：CandidateDetail.vue L262–310 内联了 PDF blob 获取 + Word/TXT HTML 获取 + 格式判断；PdfPreview.vue 只管 PDF 渲染，Word/TXT 预览没有独立组件。
7. **API 层无模块化**：api/index.js 87 行平铺所有 talent 相关 API，未按"候选人/附件/解析/批量/用户"分组。

---

## 二、模块依赖关系梳理

### 2.1 后端依赖关系（现状）

```
                    ┌─────────────────────────────────────────┐
                    │           talent.js (1588行)            │
                    │                                         │
   router.js ◄──────┤  候选人CRUD │ 工作经历 │ 附件 │ 配额    │
   (共享工具)        │                                         │
                    │  ┌──────────────────────────────────┐   │
   talent_parsers.js│  │ 预览 previewAttachment           │   │
   (parseFile,      │  │  ├─ OSS.get() 下载               │   │
    docxToHtml,     │  │  ├─ docxToHtml / docToHtml 转换  │   │
    docToHtml) ─────┼──┤  └─ PDF 二进制 / HTML JSON 返回  │   │
                    │  └──────────────────────────────────┘   │
                    │                                         │
                    │  ┌──────────────────────────────────┐   │
                    │  │ AI 解析                           │   │
                    │  │  ├─ callAIWithFallback            │   │
                    │  │  ├─ AI_MODELS / AI_SYSTEM_PROMPT  │   │
                    │  │  ├─ aiParseResume (单文件)        │   │
                    │  │  └─ processSingleParseTask        │   │
                    │  │      ├─ OSS.get() 下载            │   │
                    │  │      ├─ parseFile() 文本提取      │   │
                    │  │      ├─ callAIWithFallback()      │   │
                    │  │      ├─ INSERT candidates ◄──┐    │   │
                    │  │      ├─ INSERT experiences  │    │   │
                    │  │      └─ INSERT attachments  │    │   │
                    │  │                            耦合   │   │
                    │  └──────────────────────────────────┘   │
                    │                                         │
                    │  批量队列调度 (getBatchStatus 等)        │
                    │  ├─ 超时检测                            │
                    │  ├─ FIFO 串行抢占                       │
                    │  └─ ctx.waitUntil 异步触发             │
                    └─────────────────────────────────────────┘
```

**关键耦合点**：
- `processSingleParseTask` 直接写候选人/经历/附件表（业务写入耦合）
- `callAIWithFallback` 被 `aiParseResume`（单文件）和 `processSingleParseTask`（批量）共享调用，但定义位置远离 `talent_parsers.js`
- `previewAttachment` 同时依赖 `OSSClient`、`docxToHtml`、`docToHtml`，是预览域的"瘦入口"但被埋在 talent.js

### 2.2 前端依赖关系（现状）

```
   api/index.js (87行，平铺所有API)
        ▲
        │
   ┌────┴────────────────────────────────────────────┐
   │                                                 │
BatchImport.vue       CandidateForm.vue      CandidateDetail.vue
(565行)               (490行)                (468行)
   │                    │                       │
   ├─ getBatchUploadUrl ├─ aiParseResume        ├─ previewAttachment
   ├─ createBatchParse  ├─ getUploadUrl         ├─ getDownloadUrl
   ├─ getBatchStatus    ├─ confirmUpload        ├─ getUploadUrl
   ├─ retryParseTask    ├─ checkDuplicate       ├─ confirmUpload
   ├─ getParseTaskHistory └─ createCandidate    ├─ getUploadQuota
   │                                                 │
   ├─ uploadToOSS (XHR直传) ─┐                       ├─ handleUploadRequest (XHR直传)
   │                         │                       │
   └─ startPolling (内联)    │                       ├─ handlePreview (内联PDF/HTML分发)
                            │                       │
                            └─ uploadAttachmentToCandidate (XHR直传)
                                                    │
                                                    └─ PdfPreview.vue (仅PDF)

   🚨 三处重复的 OSS 直传 + XHR + 错误解析逻辑
   🚨 CandidateDetail 内联预览格式分发，PdfPreview 只管 PDF
   🚨 BatchImport 内联轮询/卡住检测逻辑
```

### 2.3 三大目标模块的真实边界

#### A. AI 简历解析模块
- **后端核心**：`callAIWithFallback` + `AI_MODELS` + `AI_SYSTEM_PROMPT` + `buildResumeUserMessage`（talent.js L802–986）
- **后端入口**：
  - 单文件同步解析：`aiParseResume`（L988–1015）
  - 批量异步解析：`processSingleParseTask`（L1224–1330）
- **依赖**：`parseFile`（来自 talent_parsers.js，纯文本提取）
- **前端入口**：
  - 单文件：`CandidateForm.vue` 的 `handleAiParse`
  - 批量：`BatchImport.vue` 的批量流程（经队列）
- **数据流**：文件 → 文本提取 → AI 模型轮询 → 结构化 JSON → 入库

#### B. 简历上传模块
- **后端**：
  - 单附件：`getUploadUrl` + `confirmUpload`（L510–615）
  - 批量：`getBatchUploadUrl` + `createBatchParseTasks`（L1100–1221）
  - 配额：`buildUploadQuota` + `getDailyUploadCount` + `getUploadQuota`（L492–664）
- **OSS**：`OSSClient`（utils/oss.js，已良好封装）
- **前端**：3 处重复的 OSS 直传逻辑
- **数据流**：前端 → 获取签名 URL → XHR 直传 OSS → 通知后端写元数据

#### C. 简历预览模块
- **后端**：`previewAttachment`（talent.js L699–773）
- **转换器**：`docxToHtml` + `docToHtml`（talent_parsers.js L804–1003）
- **前端**：`PdfPreview.vue`（仅 PDF） + CandidateDetail.vue 内联 HTML 预览
- **数据流**：附件 ID → 鉴权 → OSS 下载 → 格式分发（PDF 二进制 / Word→HTML / TXT→HTML） → 前端渲染

---

## 三、重构目标架构

### 3.1 后端目标目录结构

```
api/src/
├── index.js                          # 入口（不变）
├── utils/
│   ├── router.js                     # 共享工具（不变）
│   └── oss.js                        # OSS 客户端（不变）
└── modules/
    ├── talent/
    │   ├── index.js                  # 路由聚合 + 注册（~40行）
    │   ├── candidates.js             # 候选人 CRUD + 重复比对（~350行）
    │   ├── experiences.js            # 工作经历 CRUD（~120行）
    │   ├── permissions.js            # checkPositionPermission（~20行）
    │   ├── attachments.js            # 附件元数据 + 下载（~180行）
    │   ├── upload.js                 # 【上传模块】签名URL + 配额 + 批量上传入口（~200行）
    │   ├── preview.js                # 【预览模块】previewAttachment 入口（~80行）
    │   ├── ai-parser.js              # 【解析模块】AI_MODELS + callAIWithFallback + prompt（~220行）
    │   ├── parse-queue.js            # 【解析模块】批量队列调度 + 超时 + 重试（~250行）
    │   └── excel-import.js           # Excel 批量导入（~80行）
    ├── talent_parsers.js             # 本地解析器（保持，导出 parseFile/docxToHtml/docToHtml）
    ├── talent_auth.js                # （不变）
    ├── auth.js / miaodu.js / reviews.js  # （不变）
    └── ...
```

**拆分原则**：
- 每个 `.js` 文件 ≤ 350 行，单一职责
- 三大目标模块各自独立文件：`ai-parser.js` / `upload.js` / `preview.js`
- 批量队列调度（`parse-queue.js`）与业务写入解耦：通过调用 `candidates.js` 暴露的 `createCandidateFromParse()` 函数完成入库，而非直接 `INSERT`
- `talent/index.js` 仅做路由聚合与 `export const routes`

### 3.2 前端目标目录结构

```
client/src/
├── api/
│   ├── index.js                     # axios 实例 + 拦截器（保留）
│   ├── auth.js                      # 认证相关 API
│   ├── candidates.js                # 候选人 + 工作经历 API
│   ├── attachments.js               # 附件 + 上传配额 API
│   ├── parse.js                     # 【解析模块】单文件/批量解析 API
│   └── users.js                     # 用户管理 API
├── composables/
│   ├── useOssUpload.js              # 【上传模块】OSS 直传 + 进度 + 错误解析（消除3处重复）
│   ├── useParsePolling.js           # 【解析模块】批量轮询 + 卡住检测 + 重启
│   ├── useResumePreview.js          # 【预览模块】格式分发 + blob 管理 + 错误处理
│   └── useUploadQuota.js            # 上传配额查询与刷新
├── components/
│   ├── PdfPreview.vue               # PDF 渲染（保留，增强：暴露 destroy/resize 方法）
│   ├── HtmlPreview.vue              # 【新增】Word/TXT HTML 预览（从 CandidateDetail 抽出）
│   ├── ResumePreview.vue            # 【新增】预览容器，按格式分发到 Pdf/HtmlPreview
│   ├── SkillTags.vue                # （不变）
│   ├── ExperienceForm.vue           # （不变）
│   └── StatusSelect.vue             # （不变）
└── views/
    ├── BatchImport.vue              # 瘦身后 ~250 行（用 composables）
    ├── CandidateForm.vue            # 瘦身后 ~280 行
    ├── CandidateDetail.vue          # 瘦身后 ~280 行
    └── ...
```

**拆分原则**：
- API 层按子域分文件，`api/index.js` 只保留 axios 实例和拦截器
- 跨视图复用逻辑抽 composable（OSS 直传、轮询、预览分发是重点）
- 预览组件按格式分：`PdfPreview` / `HtmlPreview` / `ResumePreview`（容器）
- 每个 `.vue` 文件 ≤ 300 行（template + script + style）

---

## 四、三大模块解耦详细设计

### 4.1 AI 简历解析模块

#### 4.1.1 后端

**新建 `api/src/modules/talent/ai-parser.js`**，从 talent.js 迁入：
- `AI_MODELS` 常量（L806–828）
- `AI_CALL_TIMEOUT_MS` / `fetchWithTimeout`（L832–842）
- `callAIWithFallback`（L851–935）
- `AI_SYSTEM_PROMPT`（L937–974）
- `MAX_RESUME_TEXT_LENGTH` / `buildResumeUserMessage`（L977–986）
- `aiParseResume` handler（L988–1015）

导出：
```js
export { callAIWithFallback, aiParseResume }
export const aiParserRoutes = [
  { method: 'POST', path: '/api/talent/candidates/ai-parse-resume', handler: aiParseResume }
]
```

**`talent_parsers.js` 保持不变**：它已是纯函数模块（`parseFile` 文本提取），与 AI 调用解耦。AI 模块依赖它，反向不依赖。

#### 4.1.2 后端 — 队列与业务写入解耦

**新建 `api/src/modules/talent/parse-queue.js`**，从 talent.js 迁入：
- `getBatchUploadUrl`（L1100–1139）
- `createBatchParseTasks`（L1142–1221）
- `getBatchStatus`（L1335–1473）
- `getParseTaskHistory`（L1476–1516）
- `retryParseTask`（L1519–1551）
- 队列常量（L1094–1097）

**关键改造**：`processSingleParseTask`（L1224–1330）不再直接 `INSERT`，改为调用 `candidates.js` 暴露的内部函数：

```js
// candidates.js 新增导出（不挂在路由上）
export async function createCandidateFromParse(env, user, aiResult, task) {
  // 包装：INSERT candidate + INSERT experiences + INSERT attachment
  // 返回 candidateId
}

// parse-queue.js
import { createCandidateFromParse } from './candidates.js'
async function processSingleParseTask(env, task, user) {
  // ... 下载 + 解析 + AI
  const candidateId = await createCandidateFromParse(env, user, aiResult, task)
  // ... 更新任务状态
}
```

这样队列模块只负责"调度 + 状态机"，业务写入回到候选人模块。

#### 4.1.3 前端

**新建 `client/src/api/parse.js`**：
```js
export const aiParseResume = (formData) => api.post('/talent/candidates/ai-parse-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
export const getBatchUploadUrl = (data) => api.post('/talent/parse-tasks/batch-upload-url', data)
export const createBatchParseTasks = (data) => api.post('/talent/parse-tasks/batch', data)
export const getBatchStatus = (batchId) => api.get(`/talent/parse-tasks/batch/${batchId}`, { timeout: 120000 })
export const getParseTaskHistory = (params) => api.get('/talent/parse-tasks/history', { params })
export const retryParseTask = (taskId) => api.post(`/talent/parse-tasks/${taskId}/retry`)
```

**新建 `client/src/composables/useParsePolling.js`**：从 BatchImport.vue L457–490 抽出轮询逻辑 + L322–330 卡住检测：
```js
export function useParsePolling(options) {
  // const { batchId, interval = 3000, stuckThreshold = 25, onUpdate, onDone } = options
  // const isTaskStuck = (task) => { ... }
  // const start = () => { ... }
  // const stop = () => { ... }
  return { start, stop, isTaskStuck, batchData, loading }
}
```

**CandidateForm.vue `handleAiParse`（L229–283）** 保留在视图内（单文件解析逻辑与表单回填强绑定，抽取价值低），但调用 `api/parse.js` 而非 `api/index.js`。

### 4.2 简历上传模块

#### 4.2.1 后端

**新建 `api/src/modules/talent/upload.js`**，从 talent.js 迁入：
- 常量：`ALLOWED_EXTENSIONS` / `MAX_FILE_SIZE` / `DAILY_UPLOAD_LIMIT` / `BATCH_*`（L486–489、L1094–1097）
- 配额：`getDailyUploadCount` / `buildUploadQuota` / `getUploadQuota`（L492–508、L655–664）
- 单附件上传：`getUploadUrl` / `confirmUpload` / `uploadAttachment`（兼容占位）（L510–620）
- 批量上传入口：`getBatchUploadUrl`（L1100–1139，注意：此函数属"上传"而非"队列"，因它只生成签名 URL）

> 注意：`createBatchParseTasks`（创建解析任务）属解析模块，放 `parse-queue.js`；但 `getBatchUploadUrl`（生成签名 URL）属上传模块，放 `upload.js`。两者通过前端流程串联，但后端职责分离。

#### 4.2.2 前端 — 消除三处重复

**新建 `client/src/composables/useOssUpload.js`**：合并 BatchImport.vue L441–454、CandidateDetail.vue L175–232、CandidateForm.vue L287–334 的重复逻辑：

```js
export function useOssUpload() {
  /**
   * 完整的"获取签名URL → OSS直传 → confirmUpload"流程
   * @param {File} file
   * @param {Function} getSignedUrlFn  // 单附件用 getUploadUrl(candidateId,...)，批量用 getBatchUploadUrl(...)
   * @param {Function} confirmFn       // 单附件用 confirmUpload(candidateId,...)，批量可空
   * @param {Object} options           // { onProgress }
   */
  async function uploadToOssAndConfirm(file, getSignedUrlFn, confirmFn, options = {}) {
    // 1. 获取签名 URL
    // 2. XHR 直传（含 Content-Type 处理 + 进度回调）
    // 3. OSS XML 错误解析（Code/Message 提取）
    // 4. confirmUpload 写元数据（若有）
  }

  /** 仅直传到 OSS（批量场景：不立即 confirm，由 createBatchParseTasks 统一建任务） */
  async function uploadToOssOnly(file, getSignedUrlFn, options = {}) { ... }

  return { uploadToOssAndConfirm, uploadToOssOnly }
}
```

三处调用点改为：
- `BatchImport.vue handleBatchUpload`：`uploadToOssOnly(file, (f) => getBatchUploadUrl({file_name, file_size}))`
- `CandidateDetail.vue handleUploadRequest`：`uploadToOssAndConfirm(file, (f) => getUploadUrl(candidateId, {...}), (data) => confirmUpload(candidateId, data), { onProgress })`
- `CandidateForm.vue uploadAttachmentToCandidate`：同上

#### 4.2.3 前端 — 配额 composable

**新建 `client/src/composables/useUploadQuota.js`**：从 CandidateDetail.vue L377–384 抽出：
```js
export function useUploadQuota() {
  const quota = ref(null)
  const refresh = async () => { quota.value = (await getUploadQuota()).data.data }
  const canUpload = computed(() => quota.value?.unlimited || (quota.value?.remaining ?? 0) > 0)
  return { quota, refresh, canUpload }
}
```

### 4.3 简历预览模块

#### 4.3.1 后端

**新建 `api/src/modules/talent/preview.js`**，从 talent.js L699–773 迁入 `previewAttachment`。

**关键改造**：将格式分发与转换逻辑拆分。当前 `previewAttachment` 内联了 PDF/Word/TXT 三种分支，其中 TXT→HTML 转换（L748–766）应抽出为 `talent_parsers.js` 的 `txtToHtml` 函数，使 `preview.js` 只做"鉴权 + 下载 + 分发"：

```js
// talent_parsers.js 新增导出
export function txtToHtml(arrayBuffer) { /* 从 talent.js L748-766 迁入 */ }

// preview.js
import { docxToHtml, docToHtml, txtToHtml } from '../talent_parsers.js'
async function previewAttachment(request, env, corsHeaders, params) {
  // 鉴权 + 下载
  // 按 fileType 分发：
  //   pdf    → 二进制 Response
  //   docx   → docxToHtml → JSON {type:'html', html}
  //   doc    → docToHtml → JSON
  //   txt    → txtToHtml → JSON
}
```

#### 4.3.2 前端 — 预览组件化

**新建 `client/src/components/HtmlPreview.vue`**：从 CandidateDetail.vue L38 + L412–467 抽出 Word/TXT HTML 渲染 + 样式：
```vue
<template>
  <div class="word-preview resume-html" v-html="html" />
</template>
<script setup>
defineProps({ html: { type: String, default: '' } })
</script>
<style scoped> /* L412-467 的 resume-html 样式 */ </style>
```

**新建 `client/src/components/ResumePreview.vue`**：预览容器，按格式分发：
```vue
<template>
  <div class="resume-preview-container" v-loading="loading">
    <PdfPreview v-if="type === 'pdf'" :src="src" />
    <HtmlPreview v-else-if="type === 'html'" :html="html" />
    <div v-if="error" class="preview-error">{{ error }}</div>
  </div>
</template>
```

**新建 `client/src/composables/useResumePreview.js`**：从 CandidateDetail.vue L262–322 抽出：
```js
export function useResumePreview() {
  const visible = ref(false)
  const loading = ref(false)
  const type = ref('')      // 'pdf' | 'html' | ''
  const html = ref('')
  const src = ref('')       // blob URL
  const fileName = ref('')

  async function preview(attachment) {
    // 按 file_type 分发：
    //   pdf  → fetch + blob → URL.createObjectURL
    //   doc/docx/txt → previewAttachment API → html
  }
  function close() {
    if (src.value?.startsWith('blob:')) URL.revokeObjectURL(src.value)
    // 重置状态
  }
  return { visible, loading, type, html, src, fileName, preview, close }
}
```

`CandidateDetail.vue` 改为：
```vue
<ResumePreview v-if="previewState.visible" :state="previewState" @close="previewState.close()" />
```
预览相关代码从 468 行中的 ~80 行降至 ~10 行。

---

## 五、实施计划（分阶段）

> 原则：**每阶段可独立部署 + 可回滚 + 不破坏 API 契约**。先内聚（搬移代码）后解耦（拆接口），先后端后前端。

### 阶段 0：准备（0.5 天）

- [ ] 0.1 建立基线：记录当前 talent.js 路由清单（28 条）作为回归对照
- [ ] 0.2 补充关键路径冒烟测试脚本（手动）：单文件解析、批量上传、PDF/Word/TXT 预览、附件上传/下载
- [ ] 0.3 创建分支 `refactor/decouple-modules`

### 阶段 1：后端拆分 — 纯文件搬移（1 天，零行为变更）

**目标**：把 talent.js 1588 行拆成 9 个文件，路由与 handler 一一对应，不改任何业务逻辑。

- [ ] 1.1 创建 `api/src/modules/talent/` 目录
- [ ] 1.2 新建 `talent/index.js`：聚合所有子模块的 `routes` 并 `export`
- [ ] 1.3 按 §3.1 拆分：
  - `permissions.js` ← L19–30
  - `candidates.js` ← L32–369（含重复比对、CRUD）
  - `experiences.js` ← L371–482
  - `attachments.js` ← L622–697（listAttachments/deleteAttachment/getDownloadUrl/downloadAttachment）
  - `upload.js` ← L484–621 + L655–664 + L1100–1139（含配额、单附件上传、批量签名URL）
  - `preview.js` ← L699–773
  - `ai-parser.js` ← L802–1015（含 `parseResume` L775–800 一并迁入）
  - `parse-queue.js` ← L1092–1551（除 `getBatchUploadUrl` 已归 upload.js）
  - `excel-import.js` ← L1017–1090
- [ ] 1.4 修改 `api/src/index.js`：`import * as talent from './modules/talent/index.js'`
- [ ] 1.5 **验证**：路由清单与阶段 0.1 完全一致；冒烟测试全通过
- [ ] 1.6 删除旧 `talent.js`，提交

**回滚**：单 commit revert 即可。

### 阶段 2：后端 — 队列与业务写入解耦（0.5 天）

**目标**：`processSingleParseTask` 不再直接 `INSERT`，改调 `candidates.js` 的 `createCandidateFromParse`。

- [ ] 2.1 在 `candidates.js` 抽出 `createCandidateFromParse(env, user, aiResult, task)`，封装 L1286–1322 的入库逻辑
- [ ] 2.2 `parse-queue.js` 的 `processSingleParseTask` 改为调用上述函数
- [ ] 2.3 **验证**：批量解析端到端测试，候选人/经历/附件写入正确，无重复
- [ ] 2.4 提交

### 阶段 3：后端 — 预览模块转换函数归位（0.5 天）

- [ ] 3.1 在 `talent_parsers.js` 新增 `txtToHtml(arrayBuffer)`，迁入 talent.js L748–766 的 TXT→HTML 逻辑
- [ ] 3.2 `preview.js` 改为调用 `txtToHtml`
- [ ] 3.3 **验证**：PDF/DOCX/DOC/TXT 四种格式预览正常
- [ ] 3.4 提交

### 阶段 4：前端 — API 层模块化（0.5 天）

- [ ] 4.1 拆 `api/index.js` 为 `api/{auth,candidates,attachments,parse,users}.js`
- [ ] 4.2 `api/index.js` 仅保留 axios 实例 + 拦截器 + `export default api`
- [ ] 4.3 全局替换 import 路径
- [ ] 4.4 **验证**：构建通过，所有视图 API 调用正常
- [ ] 4.5 提交

### 阶段 5：前端 — 上传 composable（1 天）

- [ ] 5.1 新建 `composables/useOssUpload.js` + `composables/useUploadQuota.js`
- [ ] 5.2 `BatchImport.vue` / `CandidateDetail.vue` / `CandidateForm.vue` 三处替换为 composable
- [ ] 5.3 **验证**：单附件上传、批量上传、配额显示、OSS 错误码提示全部正常
- [ ] 5.4 提交

### 阶段 6：前端 — 解析轮询 composable（0.5 天）

- [ ] 6.1 新建 `composables/useParsePolling.js`（轮询 + 卡住检测 + 重启）
- [ ] 6.2 `BatchImport.vue` 改用 composable，瘦身至 ~250 行
- [ ] 6.3 **验证**：批量解析进度、卡住检测（25 分钟）、重启解析、历史记录全部正常
- [ ] 6.4 提交

### 阶段 7：前端 — 预览组件化（1 天）

- [ ] 7.1 新建 `components/HtmlPreview.vue`（含样式）
- [ ] 7.2 新建 `components/ResumePreview.vue`（容器）
- [ ] 7.3 新建 `composables/useResumePreview.js`（格式分发 + blob 管理）
- [ ] 7.4 `CandidateDetail.vue` 改用新组件，删除内联预览逻辑
- [ ] 7.5 **验证**：PDF/Word/TXT 预览、blob URL 释放、`?attachment=<id>` 自动预览正常
- [ ] 7.6 提交

### 阶段 8：收尾与文档（0.5 天）

- [ ] 8.1 更新 `talent-pool/README.md`：新增模块结构说明
- [ ] 8.2 删除本方案文档中已完成项，归档执行记录
- [ ] 8.3 全量回归测试（阶段 0.2 冒烟脚本）
- [ ] 8.4 合并分支

**总工期预估**：6 天（含验证）

---

## 六、质量验证标准

### 6.1 功能等价性（必须 100% 通过）

| 验证项 | 验证方法 | 通过标准 |
|---|---|---|
| 单文件 AI 解析 | CandidateForm 上传 PDF/DOCX/TXT | 字段回填正确，置信度图标显示 |
| 批量上传解析 | BatchImport 上传 10 个混合格式文件 | 全部完成，候选人/经历/附件入库 |
| 批量卡住重启 | 模拟 25 分钟无更新 | 显示"解析卡住"，点击"重启解析"后重新处理 |
| 批量任务超时 | 模拟 5 分钟无更新 | 后端自动标记 failed |
| PDF 预览 | CandidateDetail 预览 PDF 附件 | 单页 Canvas 渲染，无分页 |
| Word 预览 | 预览 DOCX/DOC 附件 | HTML 渲染，图片/样式正确 |
| TXT 预览 | 预览 UTF-8/GBK TXT | 编码自动检测，无乱码 |
| 单附件上传 | CandidateDetail 上传附件 | OSS 直传成功，配额递减 |
| 上传配额 | 普通用户上传 100 份后 | 第 101 份被拒，管理员不受限 |
| 简历重复比对 | CandidateForm 创建已存在"姓名+电话" | 弹窗提示，可合并附件到已存在人员 |
| 历史记录 | BatchImport 历史记录页 | 30 天内批次按时间倒序展示 |

### 6.2 模块独立性度量

| 指标 | 现状 | 目标 |
|---|---|---|
| 后端 talent 单文件行数 | 1588 | ≤ 350（每个子文件） |
| 后端最大单文件行数 | 1588 | ≤ 500 |
| 前端最大单文件行数 | 565 (BatchImport) | ≤ 300 |
| OSS 直传逻辑重复处数 | 3 | 1（composable） |
| 前端 API 文件数 | 1（87行平铺） | 5（按子域） |
| `callAIWithFallback` 定义位置 | talent.js（错位） | ai-parser.js |
| `processSingleParseTask` 直接 INSERT 数 | 3 处 | 0（经 `createCandidateFromParse`） |

### 6.3 模块边界约束（重构后必须满足）

- **AI 解析模块**（`ai-parser.js` + `parse-queue.js`）只通过 `parseFile()` 和 `createCandidateFromParse()` 与外部交互，不直接访问 OSS / 不直接 INSERT 候选人表
- **上传模块**（`upload.js`）只依赖 `OSSClient` 和 `env.DB`（配额表），不调用 AI / 不调用解析器
- **预览模块**（`preview.js`）只依赖 `OSSClient` 和 `talent_parsers.js` 的转换函数，不写数据库
- **三大模块间无横向依赖**：解析不调上传、上传不调预览、预览不调解析

验证方法：对每个模块文件做 `grep` 检查 import 来源，绘制依赖图，确认无循环、无越界。

### 6.4 API 契约稳定性

- 路由清单（28 条）在阶段 1–3 必须**完全一致**（method + path 不变）
- 请求/响应字段不变（含错误码、quota 字段等）
- 前端在阶段 4–7 的 API 调用路径不变，仅 import 来源变

### 6.5 性能与回归

- 单文件 AI 解析响应时间 ≤ 10 秒（与现状持平）
- 批量 10 文件解析总耗时 ≤ 60 秒
- PDF 预览首屏 ≤ 2 秒（376KB 基线）
- 构建产物体积不增加（±5% 内）

---

## 七、风险与回滚

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| 阶段 1 拆分时遗漏 import 导致 Worker 启动失败 | 中 | 高 | 部署前 `wrangler dev` 本地验证 + 路由清单比对 |
| `processSingleParseTask` 改造后入库逻辑回归 | 中 | 高 | 阶段 2 单独提交 + 端到端批量解析测试 |
| 前端 composable 引入响应式边界 bug | 中 | 中 | 每个 composable 独立验证后再替换视图 |
| OSS 直传 composable 漏处理某种错误码 | 低 | 中 | 保留原错误解析逻辑完整迁移，对照测试 |
| 预览 blob URL 泄漏 | 低 | 低 | `useResumePreview` 统一管理 `revokeObjectURL` |
| `pdfjs-dist` worker 路径在 ResumePreview 容器中失效 | 低 | 中 | 阶段 7 重点验证 PDF 渲染 |

**回滚策略**：
- 每阶段独立 commit + 独立部署，单阶段失败只需 revert 单 commit
- 后端阶段 1–3 完成且稳定后再开始前端阶段 4–7
- 前后端可分别部署（前端走 GitHub Pages，后端走 wrangler），互不阻塞

---

## 八、不在本次范围内的事项

明确排除（避免范围蔓延）：
- 数据库表结构变更（talent_candidates / talent_parse_tasks 等保持不变）
- 新增业务功能（如批量删除、解析结果编辑等）
- 替换 AI 模型或调整轮询策略
- 替换 OSS 为 R2（wrangler.toml 已留注释但本次不启用）
- 其他模块（miaodu / reviews / auth）的重构
- 单元测试框架引入（建议后续单独项目，本次仅手动冒烟测试）

---

## 九、决策记录

待用户确认的关键决策点（执行前需拍板）：

1. **后端目录命名**：`api/src/modules/talent/`（子目录）vs `api/src/modules/talent_*.js`（平铺）
   - 推荐：子目录（文件数多，平铺会让 modules/ 混乱）
2. **前端 API 拆分粒度**：5 个子文件 vs 按"候选人/附件/解析"3 个
   - 推荐：5 个（auth/candidates/attachments/parse/users），与后端模块对齐
3. **是否在阶段 2 同步引入 `createCandidateFromParse` 的单元测试**
   - 推荐：暂不引入测试框架，但补一条端到端验证脚本
4. **composable 命名风格**：`useXxx` vs `xxxService`
   - 推荐：`useXxx`（Vue 3 社区惯例）
5. **阶段执行顺序**：严格按 1→8 顺序 vs 后端/前端并行
   - 推荐：1→3 后端先完成并部署稳定，再开始 4→7 前端（降低并行风险）

---

**本方案待 review 通过后，从阶段 0 开始执行。**
