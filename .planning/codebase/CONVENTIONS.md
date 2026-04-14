# Coding Conventions

**Analysis Date:** 2026-04-14

## Language & Comments

**Primary Language:**
- Chinese for comments, documentation, and user-facing content
- English for variable names, function names, and IDs

**Comment Style:**
```html
<!-- ==================== 统一导航栏 ==================== -->
```
```css
/* ============================================================
 * CSS 模块结构
 * 1. 基础样式 - 全局重置、body
 * 2. 布局容器 - header、container、SVG层、组织树
 * ============================================================ */
```
```javascript
// ============================================================
// 模块1: 工具函数
// ============================================================
// ===== UUID 生成函数 =====
```

**Documentation Pattern:**
- JSDoc-style comments with Chinese descriptions
- Module headers clearly separate logical sections
- Section numbering (模块1, 模块2) for organization

## CSS Patterns

**Organization:**
- All CSS embedded within single `<style>` block per HTML file
- No separate CSS files
- Layered organization with numbered sections

**Structure within files:**
```css
/* ===== 1. 基础样式 ===== */
* { margin: 0; padding: 0; box-sizing: border-box; }

/* ===== 2. 布局容器 ===== */
.container { ... }

/* ===== 3. 节点样式 ===== */
.node-content { ... }
```

**Tailwind Usage:**
- Used alongside custom CSS (not exclusively)
- Configuration embedded in script:
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: { primary: '#165DFF', ... }
    }
  }
}
```
- Example file: `/Users/yq/Documents/zhihr/index.html` and `/Users/yq/Documents/zhihr/dashboard/index.html`

**Custom CSS without Tailwind:**
- Files like `funnel/index.html`, `gantt-web/index.html`, `org-chart/index.html` use pure custom CSS
- No Tailwind classes in these files

**CSS Custom Properties:**
```css
:root {
  --bg-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  --card-bg: rgba(255, 255, 255, 0.05);
  --text-primary: #fff;
}
```

**Responsive Design:**
```css
@media (max-width: 768px) {
  .mosaic-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
}
```

## JavaScript Patterns

**Language:**
- Vanilla JavaScript (no frameworks)
- ES6+ syntax: arrow functions, template literals, const/let, classes

**Class-Based Modules:**
```javascript
class FunnelData {
  constructor() { ... }
  saveToLocalStorage() { ... }
  resetToDefault() { ... }
}

class ChartManager {
  constructor(containerId) { ... }
  init() { ... }
  update(data) { ... }
}
```
Example: `/Users/yq/Documents/zhihr/funnel/index.html`

**Global State Pattern:**
```javascript
const AppState = {
  employeeData: [],
  charts: {},
  fieldMapping: {}
};
```
Example: `/Users/yq/Documents/zhihr/dashboard/index.html`

**DOM Manipulation:**
```javascript
// Direct element access
document.getElementById('mosaicGrid')
document.querySelector('.container')

// createElement for dynamic content
const tile = document.createElement('div');
tile.className = 'mosaic-tile active';
gridContainer.appendChild(tile);
```

**Event Handling:**
```javascript
// addEventListener pattern
themeToggle.addEventListener('click', () => {
  html.classList.toggle('dark');
});

// Inline onclick (less common)
<button onclick="resetData()">重置数据</button>
```

**LocalStorage Persistence:**
```javascript
// Save
localStorage.setItem('ganttData', JSON.stringify(data));

// Load
data = JSON.parse(localStorage.getItem('ganttData'));
```

**CDN Libraries:**
```html
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
<script src="https://html2canvas.hertzen.com/dist/html2canvas.min.js"></script>
```

## Naming Conventions

**HTML Classes:**
- Chinese-descriptive names: `mosaic-tile`, `gantt-section`, `org-tree`
- English utility names: `stat-card`, `legend-item`, `node-content`
- BEM-like patterns: `children-h`, `children-v`, `level-0`

**HTML IDs:**
- English camelCase: `mosaicGrid`, `feedbackBoard`, `themeToggle`
- Descriptive: `fileInput`, `dropArea`, `exportBtn`

**CSS Classes:**
- English names with semantic meaning
- Hyphen-case: `.gantt-row-header`, `.node-actions`, `.stat-card`

**JavaScript Variables:**
- camelCase: `AppState`, `DOM`, `treeData`
- Descriptive English names

**JavaScript Functions:**
- camelCase: `generateDashboard()`, `renderMosaicGrid()`, `saveCache()`
- Action-oriented naming: `update`, `render`, `generate`, `toggle`, `init`

## File Organization

**Single-File Architecture:**
- Each tool is a self-contained HTML file
- No separation of HTML/CSS/JS
- All code embedded in single file

**Structure Pattern:**
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>...</title>
  
  <!-- External CDN scripts -->
  <script src="..."></script>
  
  <!-- Tailwind config (if used) -->
  <script>tailwind.config = {...}</script>
  
  <!-- Custom CSS -->
  <style>
    /* Module 1: Base styles */
    /* Module 2: Layout */
    /* Module 3: Components */
  </style>
</head>
<body>
  <!-- HTML structure -->
  
  <script>
    /* Module 1: Configuration */
    /* Module 2: State management */
    /* Module 3: Core functions */
    /* Module 4: Initialization */
  </script>
</body>
</html>
```

## Error Handling

**Patterns:**
```javascript
try {
  localStorage.setItem(CACHE_KEY, JSON.stringify(treeData));
} catch (e) {
  console.warn('缓存保存失败:', e);
}
```

**Validation:**
```javascript
if (!chartDom) {
  console.error('图表容器 #' + chartId + ' 不存在');
  return null;
}
```

**User Alerts:**
```javascript
alert('需求已提交成功！我们会尽快处理');
if (confirm('确定要重置为默认数据吗？')) { ... }
```

## Code Style

**Indentation:**
- 4-space indentation in most files
- Consistent formatting

**String Quotes:**
- Template literals for dynamic content: `` `<div>${name}</div>` ``

**Line Length:**
- Generally kept reasonable
- Complex conditionals may span multiple lines

---

*Convention analysis: 2026-04-14*