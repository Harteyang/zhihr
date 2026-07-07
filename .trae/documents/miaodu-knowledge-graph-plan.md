# 妙读知识点图谱页实现计划

## 背景与目标

当前妙读前端在「按知识点搜索」后仅以卡片列表展示结果。为了更直观地呈现知识点之间的层级与关联，计划在知识点搜索结果下新增一个「知识图谱」视图，以 Obsidian 风格的力导向网络图展示：
- 节点：书籍 + 知识点
- 连线：书籍→知识点归属、知识点父子关系、同章节关联
- 交互：拖拽、缩放、平移、点击节点查看详情
- 性能：Canvas 渲染，支持数百节点流畅交互

## 用户决策

- 数据范围：**仅当前知识点搜索结果**（不额外展开整本书的全部知识点）。
- 节点类型：**书籍本身也作为节点**，知识点围绕书籍分布。

## 推荐方案

### 1. 后端补齐书籍信息

当前 `searchKnowledgeByKeyword` 仅返回 `miaodu_knowledge_points.*`，但前端卡片已使用 `item.book_title`。为保证图谱能正确渲染书籍节点，需把 SQL 改为 JOIN 书籍表，返回 `book_title`、`book_author`。

**修改文件：**
- [backend/src/db.ts](file:///Users/yq/Documents/zhihr/miaodu/backend/src/db.ts)

**变更内容：**
```sql
SELECT kp.*, b.title AS book_title, b.author AS book_author
FROM miaodu_knowledge_points kp
JOIN miaodu_books b ON kp.book_id = b.id
WHERE kp.title LIKE '%{keyword}%' OR kp.content LIKE '%{keyword}%'
ORDER BY kp.book_id, kp.sort_order
```

> 注意：SQL 中仍使用字符串拼接，本次仅调整字段，不改变防注入现状。

### 2. 前端引入图可视化库

选用 **`react-force-graph-2d`**：
- 基于 Canvas，500-1000 节点流畅。
- React 组件化，props 驱动，Vite 开箱即用。
- 内置拖拽、缩放、平移、悬停、点击。
- 节点大小/颜色、连线粗细/颜色/长度均可映射关联强度。

**新增依赖：**
- `react-force-graph-2d`
- 可能伴随安装 `d3-force-3d` 等 transitive deps

**修改文件：**
- [frontend/package.json](file:///Users/yq/Documents/zhihr/miaodu/frontend/package.json)
- `frontend/package-lock.json`（npm install 后自动生成）

### 3. 新增知识图谱组件

**新增文件：**
- [frontend/src/components/KnowledgeGraph.jsx](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/components/KnowledgeGraph.jsx)

**核心职责：**
- 接收 `results`（知识点搜索返回数组）和 `onViewBook(bookTitle)` 回调。
- 构建图数据：
  - **书籍节点**：`id: 'book-{book_id}'`，大小较大，使用固定颜色盘中的颜色。
  - **知识点节点**：`id: 'kp-{id}'`，大小随 `level` 递减（level 越小/越顶层，节点越大）。
  - **连线**：
    - 书籍 → 知识点（强度 1，细线，长距离）
    - 同书同章节知识点之间（强度 2，中等线，中等距离）
    - 父子关系 `parent_id`（强度 3，粗线，短距离，仅当父节点也在当前结果中）
- 视觉编码：
  - 节点颜色：同一本书使用同一种颜色。
  - 节点标签：默认显示标题，过密时可通过开关隐藏。
  - 连线粗细/透明度：强度越高越粗越明显。
- 交互：
  - 点击知识点节点 → 右侧/底部弹出详情浮层（书籍、章节、标题、内容摘要）。
  - 点击书籍节点 → 可调用 `onViewBook` 跳转到书籍详情。
  - 支持拖拽、滚轮缩放、画布平移。
  - 提供「适应视图」「重置布局」「显示/隐藏标签」三个工具按钮。
- 性能：
  - Canvas 渲染。
  - 当结果超过 300 条时给出提示，并默认仅渲染 level ≥ 3 的知识点或提供筛选滑块。

### 4. 在搜索结果页增加「列表 / 图谱」切换

**修改文件：**
- [frontend/src/App.jsx](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/App.jsx)

**变更内容：**
- 在 `searchType === 'knowledge'` 的结果区域增加局部状态 `knowledgeView`，枚举 `'list' | 'graph'`，默认 `'list'`。
- 在结果头部添加两个切换按钮：「列表视图」「图谱视图」。
- 当 `knowledgeView === 'graph'` 时渲染 `<KnowledgeGraph results={results} onViewBook={handleViewBookFromKnowledge} />`。
- 保持面包屑、重置、返回等现有逻辑不变。

### 5. UI/样式细节

- 图谱容器高度：桌面端 `h-[600px]`，移动端 `h-[400px]`，宽度占满主内容区。
- 使用 Tailwind 已有的 `bg-surface`、`text-primary`、`rounded-lg`、`shadow` 等风格，保持与现有页面一致。
- 工具栏绝对定位在画布左上角，避免占用文档流。

## 待修改文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| [backend/src/db.ts](file:///Users/yq/Documents/zhihr/miaodu/backend/src/db.ts) | 修改 | 知识点搜索 SQL JOIN 书籍表 |
| [frontend/package.json](file:///Users/yq/Documents/zhihr/miaodu/frontend/package.json) | 修改 | 添加 `react-force-graph-2d` |
| [frontend/src/App.jsx](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/App.jsx) | 修改 | 增加列表/图谱视图切换 |
| [frontend/src/components/KnowledgeGraph.jsx](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/components/KnowledgeGraph.jsx) | 新增 | 力导向知识图谱组件 |

## 验证方式

1. **本地启动后端**（如使用 Wrangler / D1 本地模式），调用 `GET /api/knowledge/search?q=...`，确认返回字段包含 `book_title`、`book_author`。
2. **本地启动前端**：
   - `cd frontend && npm install && npm run dev`
   - 搜索任意知识点关键词。
   - 点击结果区「图谱视图」，确认出现网络图。
   - 验证：可拖拽节点、滚轮缩放、拖拽画布平移、点击节点显示详情、点击工具栏按钮生效。
3. **边界测试**：
   - 搜索无结果时，图谱视图不可见或显示空状态。
   - 搜索只返回 1-2 条时，图谱正常渲染不崩溃。
   - 在 Chrome DevTools 中模拟移动端视口，确认画布高度和按钮布局正常。
4. **构建验证**：
   - `npm run build` 成功，无 TypeScript/ESLint 错误（项目使用 JS，主要检查构建产物）。
