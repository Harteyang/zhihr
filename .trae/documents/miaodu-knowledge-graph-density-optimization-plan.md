# 妙读知识图谱布局密度系统性优化实施计划

## Summary

在现有 [`KnowledgeGraph.jsx`](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/components/KnowledgeGraph.jsx) 已实现的三级层级结构、标签显隐切换、基础力导向布局之上，进行精细化调整，使“边界计算、无交叉展示、动态适配、缩放限制”四项要求更加鲁棒、平滑，并且能够随容器尺寸自适应。

所有改动集中在 `KnowledgeGraph.jsx`，不新增文件或依赖。

## Current State Analysis

- **边界计算**：已有 `computeNominalBounds(nodeCount)`，但基准固定为 800×600，未考虑真实容器尺寸；在较小屏幕或大结果集下可能过松或过紧。
- **无交叉展示**：已采用“标签白底圆角背景 + 碰撞斥力”方案，能在视觉上避免连线穿过文字；但碰撞半径使用固定字符系数估算，中英文混合时可能有偏差。
- **动态适配**：切换“隐藏知识点标签”时已通过 `d3ReheatSimulation()` 重排并触发 `zoomToFit`；但窗口 resize 会立即重加热力模拟，可能造成抖动。
- **缩放限制**：`MIN_READABLE = 0.7` 已存在，但最小缩放下限为 0.15，对中文小标签来说可能仍不可读；且未显式根据内容包围盒计算 `fitScale`。

## Proposed Changes

### 1. 容器感知的边界计算

文件：[`miaodu/frontend/src/components/KnowledgeGraph.jsx`](file:///Users/yq/Documents/zhihr/miaodu/frontend/src/components/KnowledgeGraph.jsx)

- 改造 `computeNominalBounds(nodeCount, containerWidth, containerHeight)`，以容器尺寸为基准，再按节点数进行密度扩展：
  - `baseW = max(containerWidth, 640)`，`baseH = max(containerHeight, 480)`
  - `scale = 1 + sqrt(max(0, nodeCount - 15)) * 0.10`
  - 返回 `{ width: baseW * scale, height: baseH * scale }`
- 在力配置 `useEffect` 中，使用 `size.width / size.height` 实时计算逻辑边界：
  - `maxRadius = min(nominal.width, nominal.height) / 2 * 0.92`
  - 注入/更新 `boundary` force
- 继续禁用默认 `center` force，避免与边界约束冲突；搜索词节点通过 `fx/fy` 固定在原点提供中心锚定。

### 2. 精确标签宽度测量与半径缓存

- 在模块顶部创建离屏 Canvas 辅助函数 `measureLabelWidth(text, fontSize, fontWeight)`，使用 `ctx.measureText` 获取真实像素宽度。
- 在 `graphData` 构建阶段为每个节点预计算：
  - `node.__labelWidth`
  - `node.__radius`（基于当前 `showKnowledgeLabels` 状态）
- 修改 `getNodeRadius(node, showKnowledgeLabels)`：优先返回 `node.__radius`，缺失时回退到估算公式。
- 修改 `forceBoundary`：读取节点上已缓存的 `nodeR = n.__radius`，避免运行时重复测量。

### 3. 标签与连线无交叉展示

- 保留并强化“白底圆角背景”绘制，确保 `nodeCanvasObject` 中先画背景再写文字，连线被背景覆盖。
- 对书籍节点标签采用**径向 outward 布局**：根据节点相对于中心的角度，把标签放在节点外侧（下方/左侧/右侧/上方自适应），减少水平方向上的标签重叠。
- 搜索词标签仍保持在节点上方；知识点标签仍受 `showKnowledgeLabels` 控制。

### 4. 动态适配与平滑过渡

- 保持 `d3ReheatSimulation()` 在 `graphData` 变化或 `showKnowledgeLabels` 切换时调用，节点从当前位置平滑展开/收缩。
- 切换标签时重置 `fitDoneRef.current = false`，确保 `onEngineStop` 会再次 `zoomToFit`。
- 新增**防抖 resize 处理**：窗口尺寸变化只更新 `size`；再等待 200ms 无变化后，才重置 `fitDoneRef` 并 gently 重排，避免连续重加热导致抖动。
- “适应视图”按钮允许用户手动触发 `zoomToFit(400, 20)`。

### 5. 最小缩放阈值

- 新增常量：
  - `MIN_READABLE = 0.7`（手动缩小时文字不低于原始大小的 70%）
  - `MIN_ZOOM_FLOOR = 0.25`（绝对下限，保证中文标签基本可读）
- 在 `handleEngineStop` 中：
  1. 调用 `fg.zoomToFit(400, 20)` 完成首次适配。
  2. 通过 `fg.zoom()` 或 `fg.getGraphBbox()` 计算 `fitScale`。
  3. 设置 `minZoom = clamp(min(fitScale, MIN_READABLE), MIN_ZOOM_FLOOR, 1)`。
- 将 `minZoom` 绑定到 `ForceGraph2D` 的 `minZoom` prop，`maxZoom` 保持 10。

### 6. 交互与状态保持

- “重置”按钮：回到中心 `(0, 0)` 并恢复缩放 1，不重新加载数据。
- 节点点击、知识点弹窗、书籍跳转逻辑保持不变。
- “隐藏知识点标签”按钮文案与行为保持不变。

## Assumptions & Decisions

- 继续使用 `react-force-graph-2d` 内置的 `zoomToFit` / `getGraphBbox` / `d3ReheatSimulation` API。
- 继续使用 `d3-force-3d` 的 `forceCollide`（已是 `react-force-graph-2d` 的传递依赖，无需安装）。
- “无交叉”以**视觉清晰**为目标，不追求绝对几何无交叉（力导向图特性决定绝对保证成本极高）。
- 最小缩放下限取 0.25，兼顾“看全图”与“文字可读”；如后续测试发现仍过小，可调为 0.3。

## Verification Steps

1. `npm run build` 通过，无编译错误。
2. 本地 dev server 搜索“沟通”并切换到“图谱视图”：
   - 搜索词位于中心，书籍均匀环绕，知识点按书籍分组分布。
   - 标签与节点、标签与连线之间无显著遮挡。
3. 手动缩放：
   - 可放大到 10 倍。
   - 缩小存在下限，文字始终基本可读。
4. 点击“隐藏知识点标签”：
   - 知识点节点平滑向内收缩。
   - 搜索词和书籍名称保持可见。
   - 视图自动收紧适配。
5. 切换回“显示知识点标签”：布局平滑展开，无闪烁。
6. 改变浏览器窗口尺寸：
   - 容器变化后，图谱在停止 resize 约 200ms 后自动重新适配，不出现持续抖动。
7. 多次切换列表/图谱视图：状态正确，无残留选中弹窗。
