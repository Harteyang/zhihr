# Testing Patterns

**Analysis Date:** 2026-04-14

## Current State

**Automated Tests: None**

This codebase contains no automated test files:
- No Jest, Vitest, Mocha, or other test frameworks
- No `.test.js`, `.spec.js`, or test directories
- No test configuration files (jest.config.js, vitest.config.ts)
- No test runners or CI/CD test pipelines

**Why No Tests:**
The codebase consists of static HTML applications with embedded client-side JavaScript. Each file (`index.html`, `dashboard/index.html`, `funnel/index.html`, etc.) is a self-contained single-page application that:
- Runs entirely in the browser
- Has no build process
- Has no package.json or npm dependencies
- Relies on CDN-hosted libraries

## Testing Approach

**Manual Browser Testing:**

All testing is performed manually by:
1. Opening HTML files in a browser
2. Interacting with UI elements
3. Verifying visual output and functionality
4. Testing different user scenarios

**Key Testing Areas:**

| Tool | Primary Testing Focus |
|------|----------------------|
| `/Users/yq/Documents/zhihr/index.html` | Tool navigation, feedback submission, theme toggle, GitHub API integration |
| `/Users/yq/Documents/zhihr/dashboard/index.html` | File upload, data parsing, chart generation, field mapping, image export |
| `/Users/yq/Documents/zhihr/funnel/index.html` | Funnel chart rendering, data editing, theme toggle, download functionality |
| `/Users/yq/Documents/zhihr/gantt-web/index.html` | Gantt chart display, task editing, date validation, emoji/color/font customization |
| `/Users/yq/Documents/zhihr/org-chart/index.html` | Tree rendering, node CRUD operations, layout toggle, SVG connectors, zoom/pan |

## Quality Assurance

**Current QA Methods:**

1. **Visual Verification:**
   - Manual inspection of rendered charts and layouts
   - Cross-browser testing (developer discretion)
   - Responsive design testing via browser dev tools

2. **Functional Testing:**
   - File upload and parsing validation
   - Data input forms and validation
   - Button clicks and navigation
   - Theme switching (light/dark mode)

3. **Data Persistence:**
   - LocalStorage save/load verification
   - Reset functionality testing
   - Data integrity after page refresh

4. **Error Handling:**
   - Invalid file format uploads
   - Empty data scenarios
   - API failure handling (GitHub Issues)

**No Regression Testing:**
- Changes are tested manually when made
- No automated regression tests
- No test suite to verify existing functionality

## Browser-Based Testing

**Recommended Manual Testing Checklist:**

```
index.html (Home page):
  [ ] Tool grid displays correctly
  [ ] Click on active tool opens new tab
  [ ] Click on empty tile scrolls to feedback
  [ ] Theme toggle works (light/dark)
  [ ] Search button finds tools
  [ ] Feedback form submission works
  [ ] Captcha validation works
  [ ] Submit limit enforced (3 per day)
  [ ] GitHub API fallback shows mock data

dashboard/index.html:
  [ ] File drag-and-drop works
  [ ] File select works (.xlsx, .xls, .csv)
  [ ] Invalid file rejected
  [ ] Field mapping displays correctly
  [ ] Charts render after data upload
  [ ] KPI cards show correct values
  [ ] Download as image works
  [ ] Reset page works

funnel/index.html:
  [ ] Default data renders funnel chart
  [ ] Edit stage names works
  [ ] Edit stage values updates chart
  [ ] Color picker works
  [ ] Add new stage works
  [ ] Delete stage works (min 1)
  [ ] Reset data works
  [ ] Theme toggle works
  [ ] Download chart/full report works

gantt-web/index.html:
  [ ] Default Gantt chart renders
  [ ] Edit project name/date works
  [ ] Add/delete tasks works
  [ ] Edit task properties works
  [ ] Date validation works (start <= end)
  [ ] Today line displays correctly
  [ ] Color picker works
  [ ] Font picker works
  [ ] Emoji picker works
  [ ] Help section expand/collapse works

org-chart/index.html:
  [ ] Default tree renders
  [ ] Edit node title/count works
  [ ] Add child node works
  [ ] Delete node works
  [ ] Layout toggle (horizontal/vertical)
  [ ] Collapse/expand nodes works
  [ ] SVG connectors draw correctly
  [ ] Zoom in/out works
  [ ] Clear cache works
  [ ] Guide modal shows on first visit
```

## Recommendations

**Testing Framework Addition:**

If automated tests are desired, consider:

1. **Unit Tests (Vitest):**
   ```javascript
   // Example test structure
   import { describe, it, expect } from 'vitest';
   
   describe('FunnelData', () => {
     it('should save to localStorage', () => {
       const data = new FunnelData();
       data.saveToLocalStorage();
       expect(localStorage.getItem('funnelData')).toBeDefined();
     });
   });
   ```

2. **E2E Tests (Playwright):**
   ```javascript
   // Example browser test
   test('file upload generates dashboard', async ({ page }) => {
     await page.goto('/dashboard/index.html');
     await page.setInputFiles('#fileInput', 'test-data.xlsx');
     await expect(page.locator('#dashboardSection')).toBeVisible();
   });
   ```

**Areas for Test Coverage:**

| Priority | Area | File | Why |
|----------|------|------|-----|
| High | Data parsing | `dashboard/index.html` | Critical functionality, handles user files |
| High | Date validation | `gantt-web/index.html` | Prevents invalid date ranges |
| Medium | LocalStorage persistence | All files | User data retention |
| Medium | Chart rendering | `funnel/index.html`, `dashboard/index.html` | Visual output correctness |
| Low | Theme toggle | `index.html`, `funnel/index.html` | UI enhancement |
| Low | Emoji/color pickers | `gantt-web/index.html` | Customization features |

**Test Setup Requirements:**

To add tests, the project would need:
- `package.json` with test dependencies
- Build process to extract JS from HTML
- Or browser-based E2E testing (Playwright, Cypress)
- Mock data fixtures for consistent testing

**Immediate Testing Improvements:**

Without full test framework:
1. Create manual test checklists (as shown above)
2. Document expected behaviors in code comments
3. Add validation/error messages for debugging
4. Use browser console for runtime verification

---

*Testing analysis: 2026-04-14*