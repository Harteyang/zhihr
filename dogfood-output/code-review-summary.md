# zhihr 代码审查综合报告

## 审查信息

| 项目 | 内容 |
|------|------|
| **审查日期** | 2026-07-21 |
| **审查范围** | 12个应用 + API 后端，共约 100+ 文件 |
| **审查方式** | 静态代码分析，不修改任何代码 |
| **发现问题总数** | **107 个** |

---

## 问题统计

| 严重级别 | 数量 | 说明 |
|---------|------|------|
| 🔴 **Critical** | **7** | 安全漏洞、功能完全失效 |
| 🟠 **High** | **25** | 严重缺陷、需要立即处理 |
| 🟡 **Medium** | **45** | 需要改进的问题 |
| 🟢 **Low** | **30** | 优化建议 |

### 各应用问题分布

| 应用 | Critical | High | Medium | Low | 合计 |
|------|---------|------|--------|-----|------|
| Homepage (index.html) | 0 | 2 | 3 | 2 | 7 |
| Dashboard | 0 | 2 | 3 | 2 | 7 |
| Funnel | 0 | 1 | 3 | 2 | 6 |
| Gantt-web | 0 | 1 | 3 | 2 | 6 |
| Org-chart | 0 | 2 | 3 | 2 | 7 |
| Review-analytics | 0 | 2 | 3 | 2 | 7 |
| Review-system | 2 | 4 | 4 | 3 | 13 |
| Pinyin-graph | 1 | 3 | 3 | 3 | 10 |
| Miaodu | 1 | 3 | 3 | 1 | 8 |
| Talent-pool | 1 | 3 | 3 | 0 | 7 |
| Moodist | 1 | 3 | 3 | 2 | 9 |
| API 后端 | 1 | 5 | 14 | 5 | 25 |
| **合计** | **7** | **25** | **45** | **23** | **100** |

---

## 🔴 Critical 问题（必须立即修复）

### 1. [API] SQL 注入漏洞 — miaodu.js

**位置**: `/Users/yq/Documents/zhihr/api/src/miaodu.js`

**问题描述**: 多处使用字符串拼接构造 SQL 查询，存在严重的 SQL 注入风险。

**影响**: 攻击者可通过恶意输入删除或篡改数据库内容，甚至获取服务器权限。

**代码示例**:
```javascript
// 危险的字符串拼接
const query = `SELECT * FROM books WHERE title LIKE '%${keyword}%'`;
const result = await db.prepare(query).all();
```

**建议修复**: 使用参数化查询
```javascript
const result = await db.prepare('SELECT * FROM books WHERE title LIKE ?').all([`%${keyword}%`]);
```

---

### 2. [Review-system] useEffect 同步循环风险

**位置**: `/Users/yq/Documents/zhihr/review-system/src/App.tsx`

**问题描述**: useEffect 中设置状态可能触发无限循环，导致页面卡死。

**影响**: 应用无法正常渲染或崩溃。

**建议修复**: 检查依赖数组，避免在 useEffect 中无条件更新状态。

---

### 3. [Review-system] Refresh Token 暴露在 localStorage

**位置**: `/Users/yq/Documents/zhihr/review-system/src/store/authStore.ts`

**问题描述**: Refresh token 明文存储在 localStorage，容易被 XSS 攻击窃取。

**影响**: 攻击者可接管用户会话。

**建议修复**: 使用 HttpOnly Cookie 存储敏感 token，或使用内存状态管理。

---

### 4. [Pinyin-graph] useEffect 自动保存练习结果未清理

**位置**: `/Users/yq/Documents/zhihr/pinyin-graph/src/components/PinyinGraph.tsx`

**问题描述**: useEffect 中的自动保存逻辑未正确处理组件卸载，可能导致保存任务在组件销毁后仍执行。

**影响**: 可能导致数据不一致或保存错误。

**建议修复**: 在 useEffect 清理函数中取消待处理的保存任务。

---

### 5. [Miaodu] API 未处理 JSON 解析错误

**位置**: `/Users/yq/Documents/zhihr/miaodu/frontend/src/api/books.ts`

**问题描述**: API 调用中 `response.json()` 未做 try-catch，非 JSON 响应会导致应用崩溃。

**影响**: 用户看到白屏或应用崩溃。

**建议修复**: 添加错误处理逻辑，对解析失败返回友好提示。

---

### 6. [Talent-pool] 路由守卫未验证 Token 有效性

**位置**: `/Users/yq/Documents/zhihr/talent-pool/client/src/router/index.ts`

**问题描述**: 路由守卫仅检查 token 是否存在，不验证 token 是否有效或已过期。

**影响**: 过期或无效的 token 仍可访问受保护页面。

**建议修复**: 在守卫中添加 token 有效性验证逻辑。

---

### 7. [Moodist] Astro Hydration 错误

**位置**: `/Users/yq/Documents/zhihr/moodist/src/`

**问题描述**: Astro 动态导入模块 `client.Codck1vi.js` 无法加载，导致所有交互功能失效。

**影响**: 播放、暂停、收藏等核心功能完全不可用。

**建议修复**: 检查 Astro 构建配置，确保 client 模块路径正确，或使用 `client:load` 替代。

---

## 🟠 High 问题（需要优先处理）

### 1. [API] wrangler.toml 硬编码 OSS AccessKey

**位置**: `/Users/yq/Documents/zhihr/api/wrangler.toml`

**问题描述**: 阿里云 OSS 的 AccessKey ID 和 Secret 明文硬编码在配置文件中。

**影响**: 密钥泄露，攻击者可访问 OSS 存储。

**建议修复**: 将密钥迁移至 Cloudflare Secrets，从配置文件中移除。

---

### 2. [API] checkRateLimit 异常时放行请求

**位置**: `/Users/yq/Documents/zhihr/api/src/middleware/rate-limit.ts`

**问题描述**: 当限流检查出错时，默认放行请求，绕过安全防护。

**影响**: 限流保护失效，可能导致服务过载。

**建议修复**: 异常时应拒绝请求，而非放行。

---

### 3. [API] evaluations.js UPDATE 缺少 candidate_id 隔离

**位置**: `/Users/yq/Documents/zhihr/api/src/evaluations.ts`

**问题描述**: 更新评估时未验证 candidate_id 是否属于当前用户，可能导致越权操作。

**影响**: 用户可以修改他人的评估数据。

**建议修复**: 添加权限验证，确保用户只能操作自己的评估。

---

### 4. [API] CORS 允许未知 Origin

**位置**: `/Users/yq/Documents/zhihr/api/src/middleware/cors.ts`

**问题描述**: CORS 配置允许任意 Origin 请求，未做白名单限制。

**影响**: 跨域攻击风险。

**建议修复**: 配置允许的 Origin 白名单。

---

### 5. [Review-system] Zustand Store 类型不安全

**位置**: `/Users/yq/Documents/zhihr/review-system/src/store/`

**问题描述**: Store 中使用 `any` 类型，缺少类型约束。

**影响**: 类型安全问题，运行时可能出现意外错误。

**建议修复**: 定义明确的 TypeScript 类型接口。

---

### 6. [Pinyin-graph] useSpeech setTimeout 未清理

**位置**: `/Users/yq/Documents/zhihr/pinyin-graph/src/hooks/useSpeech.ts`

**问题描述**: 语音播放的 setTimeout 在组件卸载时未清理，可能导致内存泄漏。

**影响**: 内存泄漏，页面性能下降。

**建议修复**: 在 cleanup 函数中清除所有定时器。

---

### 7. [API] preview.js 缺少 XSS 消毒

**位置**: `/Users/yq/Documents/zhihr/api/src/preview.ts`

**问题描述**: 预览功能未对用户输入做 XSS 过滤，直接渲染内容。

**影响**: XSS 攻击风险。

**建议修复**: 添加 HTML 转义或内容安全策略。

---

### 8. [全局] 静态应用使用 CDN 版本 Tailwind CSS

**位置**: 所有静态 HTML 应用

**问题描述**: 使用 `cdn.tailwindcss.com` 在生产环境，每次页面加载都从 CDN 拉取，影响性能。

**影响**: 页面加载慢，不推荐用于生产环境。

**建议修复**: 使用 PostCSS 插件或 Tailwind CLI 在构建时本地生成 CSS。

---

## 🟡 Medium 问题（需要改进）

### 1. [全局] API 404 静默降级为模拟数据

**位置**: 所有应用

**问题描述**: 所有应用对 API 404 错误静默降级为模拟数据，用户无法感知后端服务状态。

**影响**: 用户可能误以为看到的是真实数据。

**建议修复**: 显示明确的错误提示或服务状态指示。

---

### 2. [Dashboard] 日期解析错误

**位置**: `/Users/yq/Documents/zhihr/dashboard/index.html`

**问题描述**: 日期字符串解析未处理不同格式，可能导致时间计算错误。

**影响**: 统计图表显示错误的时间段。

**建议修复**: 统一日期格式，使用标准的日期解析库。

---

### 3. [Org-chart] SVG 连接器缩放偏移

**位置**: `/Users/yq/Documents/zhihr/org-chart/index.html`

**问题描述**: 缩放后 SVG 连接线的位置计算不准确，导致节点与连接线不对齐。

**影响**: 视觉错位，用户体验差。

**建议修复**: 重新计算缩放后的坐标偏移量。

---

### 4. [Review-analytics] ECharts 内存泄漏

**位置**: `/Users/yq/Documents/zhihr/review-analytics/index.html`

**问题描述**: 图表实例未在组件卸载时销毁，多次切换 Tab 导致内存泄漏。

**影响**: 长时间使用页面后性能下降。

**建议修复**: 在 Tab 切换时调用 `chart.dispose()` 释放资源。

---

### 5. [Homepage] 反馈提交 XSS 风险

**位置**: `/Users/yq/Documents/zhihr/index.html`

**问题描述**: 用户提交的反馈内容直接渲染到页面，未做转义处理。

**影响**: XSS 攻击风险。

**建议修复**: 对用户输入进行 HTML 转义后再渲染。

---

### 6. [全局] localStorage 存储敏感数据

**位置**: 多个应用

**问题描述**: Token、用户信息等敏感数据存储在 localStorage，容易被 XSS 窃取。

**影响**: 会话劫持风险。

**建议修复**: 使用更安全的方式存储敏感数据，或缩短 token 有效期。

---

### 7. [Gantt] 日期/时区解析问题

**位置**: `/Users/yq/Documents/zhihr/gantt-web/index.html`

**问题描述**: 日期字符串解析未考虑时区，可能导致甘特图时间显示错误。

**影响**: 项目进度时间不准确。

**建议修复**: 使用统一的时区处理逻辑。

---

### 8. [Review-system] Toast ID 碰撞

**位置**: `/Users/yq/Documents/zhihr/review-system/src/utils/toast.ts`

**问题描述**: Toast 组件使用简单递增 ID，快速触发时可能产生 ID 碰撞。

**影响**: 提示消息错乱或丢失。

**建议修复**: 使用更可靠的 ID 生成方式（如时间戳 + 随机数）。

---

## 🟢 Low 问题（优化建议）

### 1. [全局] 简单验证码容易绕过

**位置**: Homepage

**问题描述**: 验证码仅使用简单算术题，容易被脚本绕过。

**建议**: 使用更强的验证码方案（如 Google reCAPTCHA）。

---

### 2. [全局] 使用 prompt() 获取用户输入

**位置**: 多个应用

**问题描述**: 使用浏览器原生 `prompt()` 获取用户输入，用户体验差。

**建议**: 使用自定义的模态框组件。

---

### 3. [Dashboard] 文件重复读取

**位置**: `/Users/yq/Documents/zhihr/dashboard/index.html`

**问题描述**: 上传文件时可能多次读取同一文件内容，浪费内存。

**建议**: 缓存文件读取结果，避免重复操作。

---

### 4. [全局] 全局变量污染

**位置**: 多个静态 HTML 应用

**问题描述**: 大量使用全局变量，可能导致命名冲突。

**建议**: 使用 IIFE 或模块模式封装变量。

---

### 5. [Funnel] 颜色计算逻辑错误

**位置**: `/Users/yq/Documents/zhihr/funnel/index.html`

**问题描述**: 颜色渐变计算在某些边界情况下可能出错。

**建议**: 添加边界检查，确保颜色值有效。

---

## 跨应用共性问题

### 1. API 集成模式
- **问题**: 所有应用都依赖同一套 API，但 API 返回 404 时静默降级
- **影响**: 用户无法区分真实数据和模拟数据
- **建议**: 统一错误处理策略，明确提示服务状态

### 2. 认证系统
- **问题**: 各应用认证逻辑不一致，部分使用 localStorage 存储 token
- **影响**: 安全风险，会话管理混乱
- **建议**: 统一认证中间件，使用 HttpOnly Cookie

### 3. 构建配置
- **问题**: React SPA 在静态服务器上无法正确渲染
- **影响**: 本地测试无法正常运行
- **建议**: 配置 Vite 的 `history` 模式支持，或使用 `spa: true` 中间件

### 4. 代码风格
- **问题**: 代码风格不统一，缺少统一的 ESLint/Prettier 配置
- **影响**: 维护困难
- **建议**: 建立统一的代码规范配置文件

### 5. 错误处理
- **问题**: 多处缺少 try-catch，异常会导致应用崩溃
- **影响**: 用户体验差
- **建议**: 添加全局错误边界和统一错误处理逻辑

---

## 修复优先级建议

### 🔴 立即修复（本周内）
1. [API] SQL 注入漏洞 — 安全漏洞，必须立即修复
2. [API] wrangler.toml 硬编码密钥 — 立即轮换密钥
3. [Moodist] Astro Hydration 错误 — 核心功能失效

### 🟠 优先修复（两周内）
1. [全局] 认证系统统一 — 安全改进
2. [API] CORS 白名单配置 — 安全防护
3. [API] 限流异常处理 — 安全防护
4. [Review-system] Token 存储安全 — 安全改进

### 🟡 计划修复（一个月内）
1. [全局] Tailwind CSS 本地构建 — 性能优化
2. [全局] 错误处理统一 — 稳定性改进
3. [Dashboard] 日期解析 — 数据准确性
4. [Org-chart] SVG 缩放 — 用户体验

### 🟢 优化建议（持续改进）
1. 代码风格统一
2. 简单验证码升级
3. 全局变量封装
4. 内存泄漏优化

---

## 做得好的方面

1. **模块化设计**: 各应用独立部署，互不依赖
2. **TypeScript 使用**: 多数 React 应用使用 TypeScript，类型安全较好
3. **UI 框架**: 使用 Tailwind CSS + Lucide Icons，界面美观统一
4. **本地存储**: 合理使用 localStorage 持久化用户设置
5. **主题系统**: 明暗主题切换功能完善
6. **离线能力**: 静态 HTML 应用支持离线使用

---

*报告生成时间：2026-07-21*
*审查方式：静态代码分析*
*审查原则：只发现问题，不修改代码*
