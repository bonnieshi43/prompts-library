# Dashboard E2E Testing — Three-Direction Analysis

## Overview

| Direction | Core Challenge | Automation Difficulty |
|-----------|---------------|----------------------|
| 1. Editing operations (drag / right-click / tree nodes) | Angular CDK DND compatibility | High |
| 2. Interactive controls (Brush / Zoom / hover / selectors) | Canvas coordinates, async rendering | High |
| 3. Export comparison (PNG / PDF / HTML / CSV) | Binary comparison, pixel-diff tolerance | Medium |

---

## Direction 1: Editing Operations (Drag / Right-click / Tree Expand / CRUD)

### What Needs to Be Investigated

**① Drag and Drop**

Dashboard drag-and-drop covers two distinct scenarios with different handling:

| Scenario | Drag Type | What to Verify |
|----------|-----------|----------------|
| Drag field to binding zone in Composer | Angular CDK `cdkDrag` | Whether `dragTo()` works, or if `mouse.move/down/move/up` sequence is required |
| Drag component to position on canvas | Angular CDK `cdkDrag` | Whether post-drag coordinates are accurate and component renders in the correct position |
| Drag time slider in dashboard viewer | Native input range or CDK | Whether `dragTo()` or `fill()` is the right approach |

**Must verify:**
- Record a full field-to-binding-zone drag with `playwright codegen` and inspect the generated code type (`dragTo` vs `mouse` sequence)
- Whether Angular CDK drag requires `force: true` in Playwright to fire `pointerdown`
- Assertion point for a successful drag: binding zone shows the field name, or network request to `/api/vs/binding/` returns 200

**② Right-click Context Menu**

- `click({ button: 'right' })` triggers the menu, but the menu locator needs confirming: `getByRole('menu')` or a CSS class
- Assertion points: menu appears, menu item is clicked, action takes effect (e.g. component disappears after delete)

**③ Tree Node Expansion (Repository Tree / Data Tree)**

- Expand arrow locator: `[data-testid="expand-icon"]` or `getByRole('treeitem').getByRole('button')`
- Lazy-loaded trees (expansion triggers a network request) need a wait strategy: `waitForResponse` vs `waitForSelector`

**④ Component Create / Edit / Delete**

- Toolbar button (Edit / Delete / Move) locator format must be confirmed via recording
- Delete confirmation dialog: verify whether a confirmation step exists and whether its locator is stable

### Conclusions to Verify

- [ ] Whether `dragTo()` works with Angular CDK (if not, write the `mouse` sequence into `_RECIPES.md`)
- [ ] CSS selector or role locator for right-click menus
- [ ] Wait strategy for tree node expansion (sync vs async)
- [ ] Network request assertion point after drag (avoid `sleep`)

---

## Direction 2: Dashboard Interactive Controls

### What Needs to Be Investigated

**① Brush (Region Select) and Zoom**

Both operations are fundamentally a mouse drag within the chart area:

```
mouse.move(x1, y1) → mouse.down() → mouse.move(x2, y2) → mouse.up()
```

**Key questions:**
- Is the chart rendered as Canvas or SVG?
  - SVG: element coordinates can be read via `locator('path.data-point').boundingBox()`
  - Canvas: only the container `boundingBox()` is available; coordinates must be computed with offsets and are resolution-dependent
- Assertion after Brush: how to verify the data change — screenshot comparison or API response diff?
- Assertion after Zoom: axis range changes (read axis label text)

**Must verify:**
- Chart container DOM structure: `<canvas>` or `<svg>`
- Whether Brush/Zoom triggers a waitable network request or DOM change afterward
- Whether coordinate calculation depends on viewport size (`page.setViewportSize()` impact)

**② Mouse Hover Tooltip**

- `locator.hover()` triggers the tooltip; the tooltip DOM locator needs confirming
- Assertion: tooltip text content (`toHaveText`) vs screenshot comparison
- Async appearance delay: prefer `waitForSelector('[role=tooltip]')` over fixed `waitForTimeout(300)` (the latter is brittle)

**③ Checkbox / RadioButton / ComboBox**

| Control | Playwright Method | What to Verify |
|---------|------------------|----------------|
| Checkbox | `locator.check()` / `locator.uncheck()` | Whether Angular Material checkbox responds, or whether clicking the label is required |
| RadioButton | `locator.check()` | Same as above |
| ComboBox (dropdown) | `locator.selectOption()` or `locator.click()` + option click | Whether it is a native `<select>` or Angular Material `mat-select` — the difference is significant |

**Critical distinction**: Angular Material `mat-select` is not a native `<select>`. `selectOption()` does not work. The correct approach is:
1. `click()` to open the dropdown panel
2. `getByRole('option', { name: 'xxx' }).click()` to select the option

Confirm whether the dashboard dropdowns are native or Material components.

**④ Calendar (Date Picker)**

- Date picker type: Material Datepicker (requires opening a calendar popup) or an inline calendar
- Interaction flow: click input → calendar popup appears → click target date cell
- Month/year navigation: locator for previous/next page buttons
- Assertion: input field shows the correct date format after selection (`toHaveValue`)

### Conclusions to Verify

- [ ] Chart rendering technology (Canvas vs SVG) and coordinate retrieval strategy
- [ ] Waitable assertion signal after Brush/Zoom
- [ ] Tooltip DOM path and timing of appearance
- [ ] ComboBox type (native `<select>` vs `mat-select`)
- [ ] Calendar control type and locator format for date cells

---

## Direction 3: Export Comparison (PNG / PDF / HTML / CSV)

### What Needs to Be Investigated

**① PNG Export Comparison**

PNG is the most demanding scenario for visual verification. Two comparison approaches exist:

| Approach | Method | Use Case |
|----------|--------|----------|
| **Screenshot comparison** (recommended) | `toHaveScreenshot()` on the in-browser chart area | Verify rendered appearance without relying on a downloaded file |
| **File content comparison** | Download the exported PNG and run a pixel diff against a baseline | Verify correctness of the export function itself |

**Issues with screenshot comparison:**
- Font rendering and anti-aliasing differ across OS/resolution; `maxDiffPixelRatio` tolerance must be set
- First run auto-generates the baseline; subsequent runs compare against it — baseline files must be committed to Git
- Playwright's built-in `--update-snapshots` flag updates baselines

**Issues with file download comparison:**
- `page.waitForDownload()` intercepts the download
- PNG pixel diff requires `pixelmatch` or `sharp`
- Server-generated PNGs are affected by server-side font/rendering environment, which may differ from CI

**Must verify:**
- Whether the export button triggers a browser download or opens in a new tab
- Whether `waitForDownload()` reliably intercepts the file
- Baseline management strategy (screenshot-only vs file comparison)

**② PDF Export Comparison**

PDF is a binary format; direct file comparison is not feasible. Options:

| Approach | Feasibility | Notes |
|----------|-------------|-------|
| Screenshot of in-browser PDF preview | Low | In-browser PDF rendering is unstable |
| Extract text with `pdf-parse` after download | Medium | Verifies key text exists, not layout |
| Verify download success + file size range | High (recommended) | Assert file exists and size > threshold (rules out empty files) |
| Mark as `_REQUIRES_HUMAN_:` | For layout verification | Layout correctness cannot be automated |

**Recommendation:** PDF tests should only verify "export succeeded and file is non-empty." Visual layout verification should use screenshot comparison of the in-portal preview.

**③ HTML Export Comparison**

- Download the HTML file and parse the DOM (using `cheerio` or regex)
- Verify key elements exist: chart container, table row count, title text
- Do not verify style details (unstable due to CSS influence)

**④ CSV Export Comparison**

The most straightforward to automate:
- `waitForDownload()` intercepts the CSV file
- Read file content and parse line by line
- Verify: column names (first row), row count, specific cell values

**Must verify:**
- How each export format is triggered (button path / keyboard shortcut)
- Content-Type and filename format of downloaded files
- CSV character encoding (BOM presence affects parsing)
- Whether PNG export uses server-side rendering (a different path from browser screenshot)

### Conclusions to Verify

- [ ] PNG: decide between screenshot comparison and file comparison, and define baseline management
- [ ] PDF: confirm whether to verify only export success or also extract content
- [ ] HTML: identify key assertion elements (avoid full DOM comparison)
- [ ] CSV: confirm character encoding and column name format

---

## Cross-Direction Common Issues

| Issue | Affected Directions | What to Verify |
|-------|---------------------|----------------|
| **Angular CDK DND** | Direction 1 | Whether `dragTo()` is usable |
| **Chart rendering technology** | Directions 2 & 3 | Canvas vs SVG — affects coordinate strategy and screenshot approach |
| **Async wait signal** | Directions 1 & 2 | Use `waitForResponse` or `waitForSelector` after actions |
| **Screenshot baseline management** | Direction 3 | Baseline commit strategy, CI environment consistency |
| **Fixed viewport size** | Directions 2 & 3 | Coordinates and screenshots depend on viewport; fix at `1280×720` |

---

## Action Items

### Operations That Must Be Recorded with `playwright codegen`

1. Drag a field to the Composer binding zone (confirm DND approach)
2. Trigger a Brush region select (confirm `mouse` sequence and coordinate calculation)
3. Open a ComboBox and select an option (confirm whether it is `mat-select`)
4. Trigger PNG / PDF / CSV export (confirm download interception approach)

### New Recipes to Add to `_RECIPES.md`

| Recipe Name | Direction |
|-------------|-----------|
| Drag field to chart binding drop zone | Direction 1 |
| Right-click component and select menu item | Direction 1 |
| Expand tree node (with lazy load wait) | Direction 1 |
| Brush select region on chart | Direction 2 |
| Hover chart data point and read tooltip | Direction 2 |
| Open mat-select and choose option | Direction 2 |
| Pick date from Material Datepicker | Direction 2 |
| Export viewsheet and intercept download | Direction 3 |
| Compare exported PNG with baseline screenshot | Direction 3 |
| Parse and assert CSV download content | Direction 3 |

---

## Automation Feasibility Assessment

### Direction 1: Editing Operations

**Feasibility: Medium (60%)**

Right-click, tree node expansion, and standard clicks can be automated reliably. Drag-and-drop is the critical weakness:

- Angular CDK DND fails more often in headless CI than locally due to timing differences
- Any UI refactoring (component repositioning, class changes) breaks all tests that rely on coordinates or DOM structure
- Failure messages are typically "element did not move," making root cause analysis difficult

**Drag-and-drop will be a persistent source of flakiness.** Long-term maintenance is likely to devolve into "this test is failing again, let's skip it."

---

### Direction 2: Interactive Controls

**Feasibility: Low (30%)**

Brush and Zoom are the biggest problems:

- They depend on pixel coordinates derived from the chart container's `boundingBox()`
- Chart dimensions are affected by data volume, window size, and font rendering — **any data change can invalidate coordinates**
- Canvas rendering provides no access to internal elements; verifying Brush results requires either screenshot comparison or API response parsing, both of which are fragile

Tooltip appearance timing is unstable, and `waitForSelector` timeouts are a common failure mode. Angular Material component DOM structure changes with version upgrades.

**Tests in this direction are likely to fail roughly one in three CI runs.** A small team will not have the bandwidth to maintain them sustainably.

---

### Direction 3: Export Comparison

**Feasibility: Highly variable**

| Format | Feasibility | Reason |
|--------|-------------|--------|
| CSV | High (90%) | Plain text, stable, easy to maintain |
| HTML | Medium (65%) | Verify text content and structure only, not styles |
| PDF | Medium (60%) | Limited to "file exists and is non-empty," no layout verification |
| PNG screenshot comparison | Low (30%) | Font rendering and anti-aliasing differ across OS/GPU/Chrome versions; baselines invalidate frequently |

PNG comparison has the highest maintenance cost: every Chrome upgrade or server-side font change requires baseline updates, and those updates require human review — otherwise they mask real bugs.

---

### Overall Assessment

**Return on investment is low, especially for small teams.**

What can be automated stably and is worth maintaining:

- Create / delete / rename (excluding drag-to-bind)
- Standard Checkbox / Radio / ComboBox interactions
- CSV export verification
- Tooltip text assertions (not screenshot-based)

**Recommended downgrades:**

| Scenario | Original Strategy | Downgraded Strategy |
|----------|-------------------|---------------------|
| Drag-to-bind | Simulate drag operation | Mark `_REQUIRES_HUMAN_:`, or verify binding result via API only |
| Brush / Zoom | Mouse coordinate operation + screenshot assertion | Verify only API request parameter changes after the action |
| PNG export | Pixel comparison | Downgrade to "download succeeded + file size > threshold" |
| PDF export | Layout verification | Same as above; drop layout verification |

**The pragmatic strategy:** shift the goal of dashboard tests from "verify visual appearance" to "verify functional flow correctness." This makes ~80% of scenarios stably automatable, while the remaining ~20% of visual cases are left for screenshot review or manual verification.
