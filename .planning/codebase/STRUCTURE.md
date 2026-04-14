# Codebase Structure

**Analysis Date:** 2026-04-14

## Directory Layout

```
zhihr/
├── index.html              # Main navigation hub (tool launcher)
├── dashboard/              # Employee data dashboard tool
│   └── index.html          # Dashboard SPA (1928 lines)
├── funnel/                 # Recruitment funnel visualization
│   └── index.html          # Funnel SPA (1394 lines)
├── gantt-web/              # Gantt chart project tool
│   └── index.html          # Gantt SPA (1214 lines)
├── org-chart/              # Organization chart tool
│   └── index.html          # Org-chart SPA (1774 lines)
├── .github/                # GitHub configuration
│   └── workflows/          # CI/CD workflows
├── .planning/              # Planning documents
│   └── codebase/           # Codebase analysis documents
└── .git/                   # Git repository metadata
```

## Directory Purposes

**Root Level:**
- Purpose: Main entry point and project configuration
- Contains: Navigation hub HTML, Git/GitHub config
- Key files: `index.html` (tool launcher)

**dashboard/:**
- Purpose: Employee data visualization from Excel uploads
- Contains: Single self-contained SPA
- Key files: `index.html` (1928 lines, ECharts + XLSX + Tailwind)

**funnel/:**
- Purpose: Recruitment funnel chart generation
- Contains: Single self-contained SPA
- Key files: `index.html` (1394 lines, ECharts + class-based architecture)

**gantt-web/:**
- Purpose: Project timeline/Gantt chart visualization
- Contains: Single self-contained SPA
- Key files: `index.html` (1214 lines, custom fonts + emoji pickers)

**org-chart/:**
- Purpose: Interactive organization tree diagram
- Contains: Single self-contained SPA
- Key files: `index.html` (1774 lines, SVG connectors + tree CRUD)

**.github/workflows/:**
- Purpose: GitHub Pages deployment automation
- Contains: CI/CD workflow definitions
- Key files: Deployment workflow (if present)

**.planning/codebase/:**
- Purpose: Codebase analysis documentation
- Contains: Architecture, structure, and concerns documents
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md`, `STACK.md`, etc.

## Key File Locations

**Entry Points:**
- `/index.html`: Main hub - mosaic grid navigation to all tools
- `/dashboard/index.html`: Upload Excel → generate employee dashboard
- `/funnel/index.html`: Edit stages → generate funnel chart
- `/gantt-web/index.html`: Edit tasks → render Gantt timeline
- `/org-chart/index.html`: Edit tree nodes → render organization chart

**Configuration:**
- `/.github/workflows/`: GitHub Pages deployment (not analyzed in detail)

**Core Logic (per tool):**
- Embedded `<script>` sections at end of each HTML file
- Each tool's JavaScript is 300-1000+ lines within single file

## File Structure Pattern

Each tool HTML file follows this consistent structure:

```
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- Meta: charset, viewport, title -->
    <!-- CDN Scripts: Tailwind/ECharts/XLSX/html2canvas -->
    <!-- CDN Fonts: Google Fonts, Alibaba PuHuiTi, LXGW WenKai -->
    <!-- Embedded <style>: 200-600 lines of CSS -->
</head>
<body>
    <!-- Header/navigation (if applicable) -->
    <!-- Main content sections -->
    <!-- Control panels -->
    <!-- Modals/overlays -->
    <!-- Embedded <script>: 300-1000+ lines of JavaScript -->
</body>
</html>
```

## Naming Conventions

**Files:**
- All tool entry points named `index.html`
- Directory names use lowercase with hyphens: `dashboard`, `gantt-web`, `org-chart`
- No build artifacts or compiled files

**CSS Classes (observed patterns):**
- Tailwind utility classes in index.html and dashboard
- BEM-like naming in custom CSS: `.node-content`, `.task-bar`, `.gantt-row`
- State classes: `.hidden`, `.collapsed`, `.active`, `.empty`
- Level-based: `.level-0`, `.level-1`, etc. (org-chart)

**JavaScript Variables:**
- Global state: `AppState`, `data`, `treeData`
- DOM references: `DOM` object with named properties
- Classes: PascalCase (`FunnelData`, `ChartManager`, `SecurityUtils`)
- Functions: camelCase (`generateDashboard`, `renderMosaicGrid`)

## Where to Add New Code

**New Tool:**
1. Create new directory: `/new-tool/`
2. Create `index.html` following existing pattern:
   - `<head>`: meta, CDN scripts, embedded `<style>`
   - `<body>`: content sections, embedded `<script>`
3. Add tool config to main hub `/index.html` `TOOLS_CONFIG` array:
```javascript
{
  id: 5,
  name: '新工具名称',
  desc: '工具描述',
  icon: 'icon-name',
  url: 'https://www.zhihr.vip/new-tool/index.html',
  colorStart: '#hex',
  colorEnd: '#hex'
}
```
4. Update `TOTAL_TILES` count if needed

**New Feature in Existing Tool:**
- Add HTML elements in appropriate section of `<body>`
- Add CSS styles in embedded `<style>` section
- Add JavaScript functions/classes in embedded `<script>` section
- Follow existing patterns for that tool

**New Utility/Helper:**
- Add directly to embedded `<script>` section
- Consider class-based approach if complex (follow funnel pattern)

## Special Directories

**.github/workflows/:**
- Purpose: GitHub Actions CI/CD
- Generated: No (manual configuration)
- Committed: Yes (required for deployment)

**.planning/codebase/:**
- Purpose: Codebase analysis documents for planning
- Generated: Yes (by GSD mapping commands)
- Committed: Yes (for orchestrator reference)

## External Dependencies (CDN)

All dependencies loaded via CDN in `<head>`:

**Common Libraries:**
- Tailwind CSS: `https://cdn.tailwindcss.com`
- ECharts: `https://cdn.jsdelivr.net/npm/echarts@5.x/dist/echarts.min.js`
- html2canvas: `https://html2canvas.hertzen.com/dist/html2canvas.min.js`

**Dashboard-specific:**
- XLSX: `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`
- Font Awesome: `https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css`

**Main Hub:**
- Lucide Icons: `https://unpkg.com/lucide@latest`
- Google Fonts: `https://fonts.googleapis.com/css2?family=...`

**Gantt-specific:**
- Alibaba PuHuiTi: `https://fonts.alicdn.com/AlibabaPuHuiTi/...`
- LXGW WenKai: `https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css`

## Data Storage Locations

**localStorage Keys:**
- Dashboard: Not persisted (session-based, cleared on page refresh)
- Funnel: `funnelData` (JSON serialized stage data)
- Gantt: `ganttData` (JSON serialized project/tasks/colors)
- Org-chart: 
  - `org-chart-cache-v1` (tree structure)
  - `org-chart-level-colors-v1` (color configuration)
  - `org-chart-bg-colors-v1` (background color)
- Main Hub:
  - `theme` (light/dark preference)
  - `tool_click_counts` (click frequency for sorting)
  - `submit_limits` (daily submission count)

---

*Structure analysis: 2026-04-14*