# Architecture

**Analysis Date:** 2026-04-14

## Pattern Overview

**Overall:** Collection of Standalone Single-Page Applications (SPAs)

**Key Characteristics:**
- No build system or bundling - pure client-side execution
- CDN-loaded external libraries (Tailwind, ECharts, XLSX, html2canvas)
- Self-contained HTML files with embedded CSS and JavaScript
- localStorage-based data persistence
- File upload → processing → visualization workflow pattern

## Layers

**Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: Embedded `<style>` and HTML markup in each `index.html`
- Contains: CSS styles, HTML structure, DOM manipulation
- Depends on: External CDN libraries (Tailwind, ECharts, Lucide Icons)
- Used by: End users via browser

**Business Logic Layer:**
- Purpose: Data processing and calculations
- Location: Embedded `<script>` sections at end of each HTML file
- Contains: JavaScript classes, utility functions, state management
- Depends on: Browser APIs (localStorage, FileReader, DOM)
- Used by: Presentation layer callbacks

**Data Layer:**
- Purpose: Data persistence and state storage
- Location: Browser localStorage
- Contains: Serialized JSON data (employee data, chart configurations, tree structures)
- Depends on: None (browser native)
- Used by: Business logic layer for save/load operations

## Application Pattern

Each tool follows this self-contained structure:

```
HTML File Structure:
├── <head>
│   ├── Meta tags (charset, viewport, title)
│   ├── CDN script imports (libraries)
│   └── <style> (embedded CSS)
├── <body>
│   ├── Header/navigation (optional)
│   ├── Main content sections
│   ├── Control panels / modals
│   └── <script> (embedded JavaScript)
```

**Pattern Examples:**

`index.html` (Main Hub):
- Tailwind CSS via CDN
- Lucide Icons via CDN
- Mosaic grid navigation
- GitHub Issues integration for feedback

`dashboard/index.html`:
- Tailwind CSS + ECharts + XLSX + html2canvas
- File upload → field mapping → visualization flow
- AppState object for global state

`funnel/index.html`:
- ECharts + html2canvas
- Class-based modules (FunnelData, ChartManager, ThemeManager)
- localStorage for data persistence

`gantt-web/index.html`:
- Custom Chinese fonts via CDN
- Single `data` object with localStorage sync
- Emoji/color/font pickers

`org-chart/index.html`:
- Pure custom CSS (no Tailwind)
- SVG-based connector system
- Tree data structure with CRUD operations

## Data Flow

**Dashboard Tool Flow:**

1. User uploads Excel/CSV file via drag-drop or file input
2. File parsed using XLSX library into JSON array
3. Field mapping UI shown for user to confirm column mappings
4. Data processed: date parsing, filtering active employees
5. ECharts instances initialized for each chart section
6. Dashboard rendered with KPI cards, charts, and rankings
7. User can export as image using html2canvas

**Gantt/Funnel/Org-Chart Flow:**

1. On load: check localStorage for saved data
2. If no data: generate default sample data
3. Render UI based on current data state
4. User edits via form inputs or direct DOM manipulation
5. Changes immediately saved to localStorage
6. UI re-rendered with updated data

**State Management:**
- localStorage as primary data store
- No server-side persistence
- Data survives browser refresh/close
- Manual reset functionality to restore defaults

## Component Organization

Each tool organizes its UI differently:

**Navigation Hub (`index.html`):**
- Sticky header with logo and controls
- Mosaic grid for tool tiles (active tools + empty placeholders)
- Feedback board showing GitHub Issues
- Feedback form with captcha validation

**Dashboard (`dashboard/index.html`):**
- Upload section with drag-drop area
- Mapping section for field confirmation
- Loading/error sections for status display
- Dashboard section with KPI cards and multiple chart sections
- Footer

**Funnel (`funnel/index.html`):**
- Header with title and theme toggle
- Editor section for data items
- Chart container (ECharts funnel)
- Stats section for stage metrics
- Download modal and export area

**Gantt (`gantt-web/index.html`):**
- Help section (collapsible)
- Editor section (collapsible) with project settings and task table
- Gantt section with header, info bar, chart grid
- Legend with color/font pickers

**Org-Chart (`org-chart/index.html`):**
- Header with editable title
- Controls panel (clear cache, zoom)
- Container with SVG layer and tree DOM
- Legend for color editing
- Guide/confirm modals

## Key Abstractions

**AppState Object:**
- Purpose: Centralized state container
- Examples: `dashboard/index.html` (line ~600)
- Pattern: Single object holding employeeData, charts map, fieldMapping
```javascript
const AppState = {
    employeeData: [],
    charts: {},
    fieldMapping: {},
    rawHeaders: []
};
```

**Class-Based Modules:**
- Purpose: Encapsulate functionality into reusable classes
- Examples: `funnel/index.html` (SecurityUtils, FunnelData, ChartManager, EditorManager, etc.)
- Pattern: Each class handles one domain (data, charts, editing, export, theme)

**localStorage Persistence:**
- Purpose: Persist user data across sessions
- Examples: All tools use this pattern
- Pattern: JSON.stringify for save, JSON.parse for load with fallback defaults

## Entry Points

**Main Hub Entry:**
- Location: `/index.html`
- Triggers: GitHub Pages deployment, direct URL access
- Responsibilities: Navigation to tools, feedback submission, theme switching

**Tool Entries:**
- Location: Each `/*/index.html`
- Triggers: Click from main hub mosaic grid
- Responsibilities: Initialize tool state, render UI, handle user interactions

## Error Handling

**Strategy:** Graceful degradation with fallbacks

**Patterns:**
- localStorage read failures: console.warn + return null, use default data
- File parsing errors: Show error section with details, retry button
- Chart initialization failures: Console error, null check before operations
- GitHub API failures: Display mock data instead (index.html feedback board)

**Error Display:**
- Dashboard: Dedicated error section with title, message, and retry button
- All tools: Alert() for user-facing error messages
- Console warnings for non-critical failures

## Cross-Cutting Concerns

**Logging:** Console.log/console.warn for development debugging, no production logging

**Validation:**
- Dashboard: File type/size validation, field mapping confirmation
- Funnel: SecurityUtils.escapeHtml for XSS prevention, color format validation
- Gantt: Date range validation (start <= end)

**Authentication:** None - all tools run client-side without auth

**Internationalization:**
- Chinese language throughout (zh-CN)
- Chinese fonts loaded from CDN (Alibaba PuHuiTi, LXGW WenKai)

**Responsive Design:**
- Mobile viewport meta tags
- Tailwind responsive utilities (sm:, md:, lg:)
- Custom media queries for specific breakpoints
- Touch-friendly controls (zoom via Ctrl+wheel)

---

*Architecture analysis: 2026-04-14*