# 拼音学习图谱 redesign 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将拼音学习图谱的配色替换为柔和马卡龙层级色彩方案，并将韵母点击弹窗改为界面内扇形放射展开拼音节点。

**Architecture:** 在 `pinyin-utils.js` 中定义新的层级色值常量，在 `PinyinGraph.jsx` 中统一按层级取色；新增 `expandedYunmu` 状态控制韵母展开，构建 `graphData` 时只为展开的韵母生成扇形排列的拼音节点，并通过力模拟重新加热实现平滑动画。

**Tech Stack:** React 18, Vite, react-force-graph-2d, d3-force-3d, Tailwind CSS

---

## Task 1: 更新层级颜色常量

**Files:**
- Modify: `src/utils/pinyin-utils.js`

- [ ] **Step 1: 将 `LAYER_COLORS` 替换为马卡龙色值**

```javascript
export const LAYER_COLORS = {
  shengmu: '#FF9AA2', // 珊瑚粉 — 声母层
  yunmu: '#B5EAD7',   // 薄荷绿 — 韵母层
  pinyin: '#FFDAC1',  // 奶油黄 — 拼音层
}
```

- [ ] **Step 2: 验证颜色常量导出**

Run: `cd pinyin-graph && node -e "import('./src/utils/pinyin-utils.js').then(m => console.log(m.LAYER_COLORS))"`
Expected: `{ shengmu: '#FF9AA2', yunmu: '#B5EAD7', pinyin: '#FFDAC1' }`

- [ ] **Step 3: Commit**

```bash
git add src/utils/pinyin-utils.js
git commit -m "feat: update layer colors to pastel macaron palette"
```

---

## Task 2: 图谱节点应用新配色

**Files:**
- Modify: `src/components/graph/PinyinGraph.jsx`

- [ ] **Step 1: 确认导入 `getLayerColor`**

文件顶部应已有：
```javascript
import { getYunmuCategory, getLayerColor, splitPinyinHanzi } from '../../utils/pinyin-utils'
```

- [ ] **Step 2: 确认三类节点均使用 `getLayerColor`**

```javascript
// 声母节点
const shengmuNode = {
  ...
  color: getLayerColor(NODE_TYPES.SHENGMU),
  ...
}

// 韵母节点
const yunmuNode = {
  ...
  color: getLayerColor(NODE_TYPES.YUNMU),
  ...
}

// 拼音节点
const pinyinNode = {
  ...
  color: getLayerColor(NODE_TYPES.PINYIN),
  ...
}
```

- [ ] **Step 3: 在 Canvas 节点绘制中添加与颜色匹配的阴影**

在 `nodeCanvasObject` 中绘制完节点填充后，添加阴影逻辑：

```javascript
// 保存当前上下文以绘制阴影
ctx.save()
ctx.shadowColor = node.color + '66' // 40% 透明度
ctx.shadowBlur = node.type === NODE_TYPES.SHENGMU ? 14 : node.type === NODE_TYPES.YUNMU ? 10 : 8
ctx.shadowOffsetX = 0
ctx.shadowOffsetY = node.type === NODE_TYPES.SHENGMU ? 4 : 3
ctx.beginPath()
ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
ctx.fill()
ctx.restore()
```

注意：这会覆盖原有的简单 `ctx.fill()`，需要把渐变填充逻辑保留。建议将渐变填充和阴影绘制合并：

```javascript
ctx.save()
ctx.shadowColor = node.color + '66'
ctx.shadowBlur = node.type === NODE_TYPES.SHENGMU ? 14 : node.type === NODE_TYPES.YUNMU ? 10 : 8
ctx.shadowOffsetX = 0
ctx.shadowOffsetY = node.type === NODE_TYPES.SHENGMU ? 4 : 3

const gradient = ctx.createRadialGradient(node.x - radius * 0.3, node.y - radius * 0.3, 0, node.x, node.y, radius)
gradient.addColorStop(0, node.color)
gradient.addColorStop(1, node.type === NODE_TYPES.SHENGMU ? node.color : node.color + 'cc')
ctx.fillStyle = gradient
ctx.beginPath()
ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
ctx.fill()
ctx.restore()
```

- [ ] **Step 4: 运行开发服务器并截图验证颜色**

Run: `cd pinyin-graph && npx vite --host`
Open: http://localhost:5173/pinyin-graph/
Verify: 声母为珊瑚粉、韵母为薄荷绿、拼音为奶油黄

- [ ] **Step 5: Commit**

```bash
git add src/components/graph/PinyinGraph.jsx
git commit -m "feat: apply pastel macaron colors to graph nodes with matching shadows"
```

---

## Task 3: 更新全局背景色与界面强调色

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/layout/Header.jsx`
- Modify: `src/components/layout/TabBar.jsx`
- Modify: `src/components/graph/ShengmuSelector.jsx`

- [ ] **Step 1: 在 `index.css` 中设置页面背景色**

找到或添加：
```css
body {
  background-color: #FFFBF7;
}
```

如果 Tailwind 已设置 `bg-surface`，则将 `.bg-surface` 改为：
```css
.bg-surface {
  background-color: #FFFBF7;
}
```

- [ ] **Step 2: 更新 `Header.jsx` 的标题/图标颜色**

将标题或图标颜色从蓝色改为珊瑚粉 `#FF9AA2`，例如：
```jsx
<h1 className="text-xl font-bold text-[#FF9AA2]">拼音学习图谱</h1>
```

- [ ] **Step 3: 更新 `TabBar.jsx` 选中态颜色**

将选中 tab 的下划线/背景色从蓝色改为珊瑚粉：
```jsx
className={cn(
  'pb-1 text-sm font-medium transition-colors',
  active === 'graph' ? 'text-[#FF9AA2] border-b-2 border-[#FF9AA2]' : 'text-gray-500'
)}
```

- [ ] **Step 4: 更新 `ShengmuSelector.jsx` 选中态颜色**

将当前选中的声母按钮背景从蓝色改为珊瑚粉：
```jsx
className={cn(
  'w-8 h-8 rounded-full text-sm font-medium transition-colors',
  selected === sm
    ? 'bg-[#FF9AA2] text-white shadow-md'
    : 'bg-white text-gray-600 hover:bg-gray-100'
)}
```

- [ ] **Step 5: 验证界面整体色调**

Run: `cd pinyin-graph && npx vite build`
Expected: 构建成功，无错误

- [ ] **Step 6: Commit**

```bash
git add src/index.css src/components/layout/Header.jsx src/components/layout/TabBar.jsx src/components/graph/ShengmuSelector.jsx
git commit -m "feat: update UI chrome to match pastel macaron palette"
```

---

## Task 4: 实现韵母扇形展开状态

**Files:**
- Modify: `src/components/graph/PinyinGraph.jsx`
- Modify: `src/components/graph/graph-config.js`

- [ ] **Step 1: 在 `PinyinGraph` 组件中添加展开状态**

```javascript
export default function PinyinGraph({ data, shengmu, onPlaySound, onNodeClick, onYunmuClick }) {
  ...
  const [expandedYunmu, setExpandedYunmu] = useState(null)
  ...
}
```

- [ ] **Step 2: 添加展开/收起切换函数**

```javascript
const toggleYunmu = useCallback((yunmuId) => {
  setExpandedYunmu((prev) => (prev === yunmuId ? null : yunmuId))
}, [])
```

- [ ] **Step 3: 在 `graphData` 构建中为拼音节点计算扇形位置**

在生成拼音节点的循环中，判断当前韵母是否展开：

```javascript
const isExpanded = expandedYunmu === `ym-${item.yunmu}`

if (isExpanded) {
  // 计算该韵母下的拼音节点在扇形中的位置
  const yunmuNode = yunmuMap.get(item.yunmu)
  const pyNodes = pinyinByYunmu.get(item.yunmu) || []
  const count = pyNodes.length
  const span = Math.min(Math.PI / 2, Math.PI / (count || 1))
  const baseAngle = yunmuNode.angle || 0
  const startAngle = baseAngle - span / 2
  
  pyNodes.sort((a, b) => a.shengdiao - b.shengdiao)
  pyNodes.forEach((node, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const angle = startAngle + t * span
    const radius = YUNMU_EXPAND_RADIUS // 例如 90
    node.fx = (yunmuNode.x || 0) + radius * Math.cos(angle)
    node.fy = (yunmuNode.y || 0) + radius * Math.sin(angle)
  })
} else {
  // 未展开的拼音节点折叠回韵母位置（隐藏）
  pinyinNode.x = (yunmuNode?.x || 0)
  pinyinNode.y = (yunmuNode?.y || 0)
  pinyinNode.opacity = 0
}
```

注意：这里需要先收集 `pinyinByYunmu` 再计算位置，所以循环结构需要调整。

- [ ] **Step 4: 在 `graph-config.js` 中添加展开半径常量**

```javascript
/** 韵母展开时拼音节点距离韵母的距离 */
export const YUNMU_EXPAND_RADIUS = 90
```

- [ ] **Step 5: 在力模拟配置中根据展开状态调整**

在 `useEffect` 中，当 `expandedYunmu` 变化时调用：
```javascript
fg.d3ReheatSimulation()
fitDoneRef.current = false
```

- [ ] **Step 6: Commit**

```bash
git add src/components/graph/PinyinGraph.jsx src/components/graph/graph-config.js
git commit -m "feat: add yunmu fan-out expansion state and positioning"
```

---

## Task 5: 处理展开态的节点可见性与淡化效果

**Files:**
- Modify: `src/components/graph/PinyinGraph.jsx`

- [ ] **Step 1: 未选中韵母在展开态下淡化**

在 `nodeCanvasObject` 开头添加：
```javascript
const isAnyExpanded = expandedYunmu != null
const isThisYunmuExpanded = expandedYunmu === (node.type === NODE_TYPES.YUNMU ? node.id : null)
const isRelatedPinyin = node.type === NODE_TYPES.PINYIN && expandedYunmu === `ym-${node.yunmu}`

if (isAnyExpanded && node.type === NODE_TYPES.YUNMU && !isThisYunmuExpanded) {
  ctx.globalAlpha = 0.4
}
```

- [ ] **Step 2: 未展开韵母对应的拼音节点不绘制**

在拼音节点绘制前判断：
```javascript
if (node.type === NODE_TYPES.PINYIN) {
  if (expandedYunmu && expandedYunmu !== `ym-${node.yunmu}`) return
}
```

- [ ] **Step 3: 选中韵母高亮描边**

在节点填充后、描边逻辑中增加：
```javascript
if (expandedYunmu === node.id) {
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 3
  ctx.stroke()
}
```

- [ ] **Step 4: 点击韵母切换展开状态**

修改 `handleNodeClick`：
```javascript
if (node.type === NODE_TYPES.YUNMU) {
  toggleYunmu(node.id)
  onYunmuClick?.(node)
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/graph/PinyinGraph.jsx
git commit -m "feat: handle expansion visibility, dimming, and highlight"
```

---

## Task 6: 移除 YunmuCard 弹窗

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/components/graph/YunmuCard.jsx`

- [ ] **Step 1: 从 `App.jsx` 中移除 `YunmuCard` 导入与使用**

删除：
```javascript
import YunmuCard from './components/graph/YunmuCard'
```

删除 `selectedYunmu` 状态、`handleYunmuClick` 函数以及 JSX 中的 `<YunmuCard />` 组件。

- [ ] **Step 2: 删除 `YunmuCard.jsx` 文件**

```bash
rm src/components/graph/YunmuCard.jsx
```

- [ ] **Step 3: 验证构建**

Run: `cd pinyin-graph && npx vite build`
Expected: 构建成功

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/graph/YunmuCard.jsx
git commit -m "refactor: remove YunmuCard modal, use inline fan-out expansion"
```

---

## Task 7: 验证与回归测试

**Files:**
- None (verification only)

- [ ] **Step 1: 启动开发服务器**

Run: `cd pinyin-graph && npx vite --host`
Open: http://localhost:5173/pinyin-graph/

- [ ] **Step 2: 验证配色**

- 声母节点：珊瑚粉 `#FF9AA2`
- 韵母节点：薄荷绿 `#B5EAD7`
- 拼音节点：奶油黄 `#FFDAC1`
- 页面背景：暖米白 `#FFFBF7`

- [ ] **Step 3: 验证展开交互**

- 点击韵母 `a`，4 个声调拼音节点以扇形展开
- 其他韵母变淡
- 再次点击 `a`，拼音节点收起
- 切换声母后展开状态重置

- [ ] **Step 4: 验证原有功能未受影响**

- 声母切换正常
- 拼音节点点击仍弹出详情卡片
- 显示/隐藏汉字按钮正常
- 适应视图按钮正常
- TTS 朗读正常

- [ ] **Step 5: 构建验证**

Run: `cd pinyin-graph && npx vite build`
Expected: 构建成功

- [ ] **Step 6: 截图存档并 Commit（如有必要）**

如果验证过程中有样式微调，commit 这些调整：
```bash
git add -A
git commit -m " polish: finalize redesign colors and expansion interaction"
```

---

## Self-Review

**Spec coverage:**
- 色彩方案：Task 1、2、3 覆盖
- 扇形展开交互：Task 4、5 覆盖
- 移除弹窗：Task 6 覆盖
- 响应式/动画：Task 4、5 中提及
- 验收标准：Task 7 覆盖

**Placeholder scan:** 无 TBD/TODO，所有步骤包含具体代码或命令。

**Type consistency:** `expandedYunmu` 统一使用韵母节点 ID 字符串（`ym-${yunmu}`），与现有节点 ID 命名一致。
