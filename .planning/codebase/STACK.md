# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- HTML5 - All pages use standard HTML5 markup with semantic elements
- CSS3 - Inline styles in all HTML files, CSS custom properties (CSS variables)
- JavaScript (ES6+) - Vanilla JavaScript, no frameworks, modern features like classes, arrow functions, template literals

**Secondary:**
- None - Pure vanilla implementation throughout

## Runtime

**Environment:**
- Browser runtime only - No server-side processing
- All processing happens client-side in the browser

**Package Manager:**
- None - CDN-based dependency loading
- No npm/yarn/package.json present

## Frameworks

**Core:**
- None - Pure vanilla HTML/CSS/JavaScript

**Styling:**
- Tailwind CSS (CDN) - Utility-first CSS framework loaded from `https://cdn.tailwindcss.com`
  - Used in: `index.html`, `dashboard/index.html`
  - Custom configuration with extended colors and dark mode support

**Testing:**
- None detected - No test framework present

**Build/Dev:**
- None - Static files served directly

## Key Dependencies

**Visualization:**
- ECharts v5.4.3 - Used in `dashboard/index.html` for employee data charts
  - CDN: `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js`
- ECharts v5.5.0 - Used in `funnel/index.html` for recruitment funnel
  - CDN: `https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js`

**Data Processing:**
- XLSX.js v0.18.5 - Excel file parsing for employee roster import
  - CDN: `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`
  - Used in: `dashboard/index.html`

**Image Export:**
- html2canvas v1.4.1 - Capture DOM as images for export
  - CDN: `https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js`
  - Also: `https://html2canvas.hertzen.com/dist/html2canvas.min.js`
  - Used in: `dashboard/index.html`, `funnel/index.html`

**Icons:**
- Lucide Icons (latest) - Modern icon library
  - CDN: `https://unpkg.com/lucide@latest`
  - Used in: `index.html`
- Font Awesome v4.7.0 - Icon library
  - CDN: `https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css`
  - Used in: `dashboard/index.html`

## Fonts & Typography

**Google Fonts:**
- Fira Code - Monospace font for code-like display
  - CDN: `https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700`
  - Used in: `index.html`
- Fira Sans - Sans-serif primary font
  - CDN: `https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700`
  - Used in: `index.html`
- Noto Sans SC - Chinese sans-serif font
  - CDN: `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700`
  - Used in: `gantt-web/index.html`

**Chinese Fonts:**
- Alibaba PuHuiTi - Business-oriented Chinese font
  - CDN: `https://fonts.alicdn.com/AlibabaPuHuiTi/AlibabaPuHuiTi-2/`
  - Used in: `gantt-web/index.html` (weights 400, 500, 600)
- LXGW WenKai v1.7.0 - Elegant Chinese serif font
  - CDN: `https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css`
  - Used in: `gantt-web/index.html`

**System Fonts:**
- PingFang SC, Microsoft YaHei - Used as fallback Chinese fonts
- Used in: `org-chart/index.html`

## Configuration

**Environment:**
- localStorage - Primary data persistence mechanism
  - Key patterns: `ganttData`, `funnelData`, `org-chart-cache-v1`, `theme`, `submit_limits`
- No external configuration files required

**Build:**
- No build configuration - Static HTML files

## Platform Requirements

**Development:**
- Any modern browser (Chrome, Firefox, Safari, Edge)
- No Node.js required
- No build tools required

**Production:**
- Static file hosting (GitHub Pages configured)
- No server-side processing
- No database required

## Language & Localization

**Primary Language:**
- Chinese (zh-CN) - All pages set `lang="zh-CN"`
- All UI text in Chinese
- User-facing content exclusively in Chinese

---

*Stack analysis: 2026-04-14*