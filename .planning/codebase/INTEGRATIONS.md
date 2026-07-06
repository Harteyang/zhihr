# External Integrations

**Analysis Date:** 2026-04-14

## CDN Dependencies

### Styling Libraries

**Tailwind CSS:**
- CDN URL: `https://cdn.tailwindcss.com`
- Version: Latest (unversioned)
- Purpose: Utility-first CSS framework for rapid UI development
- Usage: `index.html`, `dashboard/index.html`
- Configuration: Custom theme with extended colors (primary, cta, success, warning, error, info) and dark mode support via class strategy

**Font Awesome:**
- CDN URL: `https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css`
- Version: 4.7.0
- Purpose: Icon library for UI elements
- Usage: `dashboard/index.html` (upload icons, navigation, status indicators)

### Chart Libraries

**ECharts (dashboard):**
- CDN URL: `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js`
- Version: 5.4.3
- Purpose: Data visualization for employee dashboard
- Usage: `dashboard/index.html`
- Chart types: Bar charts, pie charts, line charts for employee metrics

**ECharts (funnel):**
- CDN URL: `https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js`
- Version: 5.5.0
- Purpose: Recruitment funnel visualization
- Usage: `funnel/index.html`
- Chart types: Funnel chart for recruitment stages

### Data Processing Libraries

**XLSX.js:**
- CDN URL: `https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js`
- Version: 0.18.5
- Purpose: Excel/CSV file parsing for employee roster import
- Usage: `dashboard/index.html`
- Features: Sheet parsing, JSON conversion, header extraction, date parsing

**html2canvas:**
- CDN URL 1: `https://html2canvas.hertzen.com/dist/html2canvas.min.js`
- CDN URL 2: `https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js`
- Version: 1.4.1
- Purpose: DOM-to-image conversion for export functionality
- Usage: `dashboard/index.html`, `funnel/index.html`
- Configuration: scale=2/3, useCORS=true, white background

### Icon Libraries

**Lucide Icons:**
- CDN URL: `https://unpkg.com/lucide@latest`
- Version: Latest (unversioned)
- Purpose: Modern SVG icon library
- Usage: `index.html`
- Icons used: search, sun, moon, help-circle, gantt-chart, users, network, filter, send, loader-2, refresh-cw

### Font Libraries

**Google Fonts:**
- Fira Code: `https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700`
- Fira Sans: `https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700`
- Noto Sans SC: `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700`
- preconnect: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`

**Alibaba Fonts CDN:**
- Alibaba PuHuiTi: `https://fonts.alicdn.com/AlibabaPuHuiTi/AlibabaPuHuiTi-2/`
- Formats: WOFF2 only
- Weights: 105 (400), 115 (500), 125 (600)

**jsDelivr Fonts:**
- LXGW WenKai: `https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css`
- Version: 1.7.0

## GitHub Actions

**Workflow File:**
- Location: `.github/workflows/static.yml`
- Name: "Deploy static content to Pages"

**Triggers:**
- Push to main branch
- Manual workflow_dispatch

**Permissions:**
- contents: read
- pages: write
- id-token: write

**Concurrency:**
- Group: "pages"
- cancel-in-progress: false (allows in-progress deployments to complete)

**Jobs:**
- Single deploy job
- Environment: github-pages
- Runner: ubuntu-latest

**Steps:**
1. Checkout (actions/checkout@v4)
2. Setup Pages (actions/configure-pages@v5)
3. Upload artifact (actions/upload-pages-artifact@v3) - uploads entire repository
4. Deploy to GitHub Pages (actions/deploy-pages@v5)

**Output URL:**
- Dynamically generated: `${{ steps.deployment.outputs.page_url }}`

## External Services

### GitHub API Integration

**Purpose:** Feedback/issue submission system

**API Endpoints Used:**
- GET `https://api.github.com/repos/{owner}/{repo}/issues` - Fetch existing issues
- POST `https://api.github.com/repos/{owner}/{repo}/issues` - Create new issues

**Authentication:**
- Personal Access Token (PAT) - Base64 encoded in `index.html`
- Token stored in JavaScript constant `GITHUB_CONFIG`

**Issue Format:**
- Title: `[工具需求] {name}: {content}`
- Labels: `tool-suggestion`, `pending`
- Body: Contains submitter name, timestamp, and requirement content

**Rate Limiting:**
- Client-side: 3 submissions per day per user
- Stored in localStorage with date tracking

**Fallback:**
- Mock data displayed when API fails

### Proxy Services

**gh-proxy.com:**
- Used for proxied GitHub raw file access
- URLs: Template file download, author contact QR code
- Purpose: Reliable access to GitHub-hosted resources in China

## Browser APIs Used

### File API
- FileReader - Read uploaded Excel/CSV files
- File input - Accept .xlsx, .xls, .csv formats
- Max file size: 10MB

### Canvas API
- html2canvas wrapper - DOM to image conversion
- toDataURL - Image data extraction for download
- PNG format for exports

### Storage API
- localStorage - Primary persistence mechanism
  - `ganttData` - Gantt chart project data
  - `funnelData` - Recruitment funnel data
  - `org-chart-cache-v1` - Organization chart structure
  - `org-chart-level-colors-v1` - Level color configuration
  - `org-chart-bg-colors-v1` - Background color
  - `theme` - Dark/light mode preference
  - `tool_click_counts` - Tool usage tracking
  - `submit_limits` - Daily submission count
  - `guideShown` - First-time user guide flag

### Drag and Drop API
- `dragenter`, `dragover`, `dragleave`, `drop` events
- File upload via drag and drop
- Used in: `dashboard/index.html`

### Clipboard/Selection
- contenteditable attribute - In-place text editing
- Used in: `org-chart/index.html`, `gantt-web/index.html`

### Window/Document Events
- `DOMContentLoaded` - Initialization
- `resize` - Chart/container resize handling
- `scroll` - Header shrink effect, connector redraw
- `wheel` (with Ctrl) - Zoom functionality

### CSS Custom Properties
- `--bg-gradient`, `--card-bg`, `--card-border`, `--text-primary`, `--text-secondary`
- `--header-bg-color` - Dynamic color injection
- Theme switching via CSS variables

## Webhooks & Callbacks

**Incoming:**
- None - All user interactions handled client-side

**Outgoing:**
- GitHub Issues API - Creates issues for user feedback
- No webhook callbacks configured

---

*Integration audit: 2026-04-14*