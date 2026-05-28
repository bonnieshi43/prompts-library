# Unit Testing Implementation Plan (Full Project)

> **Scope**: `community/web/projects/portal` + `community/web/projects/em` + `community/web/projects/shared`
> **Test stack**: Angular Testing Library (ATL) + MSW v2 + Jest 29
> **Related document**: `portal-unit-testing-analysis.zh-CN.md`
> **Generated**: 2026-05-25

---

## 1. Overall Priority Framework

### 1.1 Global Priority Order

```
[P0] shared/schedule (foundation)
  ↓
[P0] portal/portal/data + portal/portal/schedule (lowest coverage + core user paths)
  ↓
[P1] portal/portal/dashboard + portal/common (Services)
  ↓
[P1] portal/composer (designer; some canvas components covered by E2E)
  ↓
[P1] portal/vsobjects (runtime visual objects)
  ↓
[P2] portal/binding + portal/graph + portal/widget
  ↓
[P2] portal/vs-wizard + portal/vsview + portal/viewer + portal/format
  ↓
[P3] em/common + em/monitoring + em/widget + em/navbar + em/page-header
```

### 1.2 Module Overview

| Module | TS files | spec files | Coverage | .tl.spec count | Priority |
|------|---------|-----------|--------|--------------|--------|
| shared/schedule | 29 (model + service only) | 0 | **0%** | 0 | **P0 (prerequisite)** |
| portal/portal/data | 288 | 3 | **1.0%** | 2 (tl) | **P0** |
| portal/portal/schedule | 34 | 7 | 20.6% | 1 (tl) | **P0** |
| portal/portal/dashboard | ~4 | 0 | **0%** | 0 | **P1** |
| portal/common | ~22 Services | 5 | **6%** | 0 | **P1** |
| portal/composer | 176 | 54 | 26.1% | 0 | **P1** |
| portal/vsobjects | 121 | 76 | 35.5% | 0 | **P1** |
| portal/binding | 92 | 27 | 27.2% | 0 | **P2** |
| portal/graph | 20 | 9 | 35.0% | 1 | **P2** |
| portal/widget | 162 | 54 | 24.7% | 0 | **P2** |
| portal/vs-wizard | 21 | 6 | 28.6% | 0 | **P2** |
| portal/vsview | 4 | 1 | 25.0% | 0 | **P2** |
| portal/viewer + format + embed | ~11 | 4 | ~30% | 0 | **P3** |
| em/common | 52 | 14 | 27% | 0 | **P3** |
| em/monitoring | 34 | 14 | 41% | 0 | **P3** |
| em/widget | 26 | 0 | **0%** | 0 | **P3** |
| em/navbar + page-header | ~9 | 0 | **0%** | 0 | **P3** |
| shared (remaining) | ~88 | 15 | 17% | 0 | **P3** |

### 1.3 Priority Ranking Criteria

| Factor | Weight | Notes |
|----------|------|------|
| Coverage (lower = more urgent) | 40% | portal/data at 1% and shared/schedule at 0% are the largest blind spots |
| User-path risk | 30% | Data browsing and schedule management are daily core features; regressions have high impact |
| Code volume | 20% | Large files (>600 lines) have wide blast radius; changes need test coverage |
| Testability | 10% | Components depending on jsPlumb/canvas/STOMP real-time streams are costly to test; prefer E2E |

---

## 2. Phase Plan

### Phase A — Prerequisite Infrastructure ✅ Infrastructure complete

Remove blockers for all subsequent P0 testing.

| Task | File | Framework | Status |
|------|------|------|------|
| Add Portal MSW handler file | `mocks/handlers/portal.handlers.ts` | MSW | ✅ Done |
| Register portal handlers | `mocks/server.ts` (update) | — | ✅ Done |
| Add Shared Schedule Service test | `shared/schedule/schedule-users.service.spec.ts` | Jest direct | ✅ Done |
| Add Shared Schedule Service test | `shared/schedule/schedule-task-names.service.tl.spec.ts` | MSW | ✅ Done |
| Add Shared Schedule Service test | `shared/schedule/time-zone.service.tl.spec.ts` | Jest direct (pure logic, no HTTP) | ✅ Done |

### Phase B — P0 Core Paths (~1 week)

Cover high-risk paths in portal/data + portal/schedule.

### Phase C — P1 High Value (ongoing)

composer/vsobjects/dashboard/common Services.

### Phase D — P2 Gradual Migration (ongoing)

binding/graph/widget/vs-wizard, etc.; migrate legacy specs to ATL.

### Phase E — P3 Completion + E2E Smoke

Remaining EM modules, portal canvas component smoke tests, Playwright golden paths.

---

## 3. Detailed Module Plans

---

### 3.1 shared/schedule (P0 prerequisite)

**Current state**: 29 files (16 models + 3 services), **0 specs**.
**Rationale**: shared/schedule is referenced by both portal and EM; 3 services make HTTP calls with no tests — high risk; model files are pure TypeScript interfaces and are optional to test.

#### 3.1.1 Files to Add

| New file | Target file | Framework | Priority |
|----------|----------|------|--------|
| `schedule/schedule-users.service.spec.ts` | `schedule-users.service.ts` | Jest direct instantiation + HttpClientTestingModule | P0 |
| `schedule/schedule-task-names.service.tl.spec.ts` | `schedule-task-names.service.ts` | MSW + TestBed | P0 |
| `schedule/time-zone.service.tl.spec.ts` | `time-zone.service.ts` | MSW + TestBed | P0 |

#### 3.1.2 schedule-users.service.spec.ts Test Points

```typescript
// Path: projects/shared/src/lib/schedule/schedule-users.service.spec.ts
// Framework: Jest + HttpClientTestingModule (pure HTTP contract verification)

describe("ScheduleUsersService", () => {
  // Test 1: getUsers() constructs the correct GET request
  it("should call GET /api/schedule/users when getUsers() is called")

  // Test 2: response data is mapped to UsersModel
  it("should map HTTP response to UsersModel")

  // Test 3: when orgId is provided, URL includes orgId query param
  it("should append orgId to request when provided")
})
```

#### 3.1.3 time-zone.service.tl.spec.ts Test Points

```typescript
// Path: projects/shared/src/lib/schedule/time-zone.service.tl.spec.ts
// Framework: MSW + TestBed (real HttpClient + network interception)

describe("TimeZoneService", () => {
  // Test 1: getTimeZones() calls /api/schedule/time-zones and returns list
  it("should fetch and return timezone list")

  // Test 2: network error returns observable error
  it("should propagate HTTP error")

  // Test 3: results are cached (two calls emit only one request)
  it("should cache the timezone list after first fetch")
})
```

---

### 3.2 mocks/handlers/portal.handlers.ts (P0 prerequisite) ✅ Done

**Previous state**: ~~Did not exist. Portal HTTP endpoints had no MSW mocks, blocking all portal ATL tests.~~
**Completed**: Created 2026-05-25, covering 50+ endpoints (Portal app-level, Schedule, data source browser, physical model, Query builder), registered in `server.ts`.

#### 3.2.1 Files to Add

**New**: `community/web/mocks/handlers/portal.handlers.ts` ✅ Done

**Update**: `community/web/mocks/server.ts` ✅ Done

#### 3.2.2 API Scope for portal.handlers.ts

```typescript
// mocks/handlers/portal.handlers.ts

// === Data module ===
GET  /api/portal/data/sources              // datasource list
GET  /api/portal/data/sources/:name        // single datasource details
POST /api/portal/data/sources              // create datasource
GET  /api/portal/data/folders              // folder tree
POST /api/portal/data/folders              // create folder
DELETE /api/portal/data/sources/:name      // delete datasource
GET  /api/portal/data/physical-model/**    // physical model
GET  /api/portal/data/logical-model/**     // logical model
GET  /api/portal/data/database/schemas/**  // database schema
GET  /api/portal/data/query/**             // Query-related

// === Schedule module ===
GET  /api/portal/schedule/tasks            // task list
POST /api/portal/schedule/tasks            // create task
GET  /api/portal/schedule/tasks/:id        // task details
PUT  /api/portal/schedule/tasks/:id        // update task
DELETE /api/portal/schedule/tasks/:id      // delete task
GET  /api/portal/schedule/folders          // folders

// === Dashboard module ===
GET  /api/portal/dashboards                // Dashboard list
POST /api/portal/dashboards                // create Dashboard
DELETE /api/portal/dashboards/:id          // delete Dashboard

// === Common ===
GET  /api/portal/tree                      // repository tree
GET  /api/portal/user-settings             // user preferences
```

#### 3.2.3 server.ts Update

```typescript
import { portalHandlers } from "./handlers/portal.handlers";

export const server = setupServer(
   ...modelHandlers,
   ...composerHandlers,
   ...emHandlers,
   ...portalHandlers,  // new
);
```

---

### 3.3 portal/portal/data (P0)

**Current state**: 288 TS files, only 3 specs (including 2 completed `.tl.spec.ts`), coverage **1%**.
**Rationale**: Data source management is portal's most core user feature; frequently changed (physical model, logical model, Query builder); very high regression risk.

#### 3.3.1 Directory Structure

```
portal/data/
├── data-datasource-browser/          # Data source entry ✅ Done (data-datasource-browser.component.tl.spec.ts)
├── data-folder-browser/              # Folder browser ✅ Done (data-folder-browser.component.tl.spec.ts)
├── data-navigation-tree/             # Navigation tree ✅ Done (data-sources-tree-view.component.tl.spec.ts)
├── datasources-database/             # Database-type data sources
│   ├── database-physical-model/      # Physical model editor (1347 lines) ⚠️
│   ├── database-data-model-browser/  # Data model browser (821 lines) ⚠️
│   ├── database-query/               # Query builder
│   └── datasources-database.component (719 lines) ⚠️
├── datasources-xmla/                 # XMLA data source (669 lines)
├── data-auto-drill-dialog/           # Auto drill (662 lines)
├── logical-model-property-pane/      # Logical model properties (723 lines)
├── query-network-graph-pane/         # Query relationship graph (928 lines, canvas)
└── physical-model-network-graph/     # Physical model relationship graph (868 lines, canvas)
```

#### 3.3.2 Files to Add (by priority)

| Priority | New file | Source file | ~Lines | Framework | Status |
|--------|----------|------------|--------|------|------|
| **P0-1** | `datasources-database/datasources-database.component.tl.spec.ts` | `datasources-database.component.ts` | 719 | ATL + MSW | ⬜ Pending |
| **P0-2** | `datasources-database/database-physical-model/database-physical-model.component.tl.spec.ts` | `database-physical-model.component.ts` | 1347 | ATL + MSW | ⬜ Pending |
| **P0-3** | `datasources-database/database-data-model-browser/database-data-model-browser.component.tl.spec.ts` | `database-data-model-browser.component.ts` | 821 | ATL + MSW | ⬜ Pending |
| **P0-4** | `datasources-xmla/datasources-xmla.component.tl.spec.ts` | `datasources-xmla.component.ts` | 669 | ATL + MSW | ⬜ Pending |
| **P0-5** | `data-auto-drill-dialog/data-auto-drill-dialog.component.tl.spec.ts` | `data-auto-drill-dialog.component.ts` | 662 | ATL + MSW | ⬜ Pending |
| **P0-6** | `logical-model-property-pane/logical-model-property-pane.component.tl.spec.ts` | `logical-model-property-pane.component.ts` | 723 | ATL + MSW | ⬜ Pending |
| **P1-1** | `datasources-database/database-query/query-main/query-fields-pane.component.tl.spec.ts` | query fields pane | — | ATL + MSW | ⬜ Pending |
| **P1-2** | `datasources-database/database-query/query-main/query-conditions-pane.component.tl.spec.ts` | query conditions pane | — | ATL + MSW | ⬜ Pending |
| **P3-1** | `query-network-graph-pane/query-network-graph-pane.component.tl.spec.ts` | 928 lines, canvas-heavy | — | **smoke only** | ⬜ Pending |
| **P3-2** | `physical-model-network-graph/physical-model-network-graph.component.tl.spec.ts` | 868 lines, canvas-heavy | — | **smoke only** | ⬜ Pending |

#### 3.3.3 Service Tests (portal/data)

| New file | Target Service | Framework | Priority | Status |
|----------|-------------|------|--------|------|
| `portal/services/data-model-browser.service.tl.spec.ts` | `data-model-browser.service.ts` (643 lines) | MSW + TestBed | **P0** | ⬜ Pending |
| `portal/services/datasource-browser.service.tl.spec.ts` | `datasource-browser.service.ts` (401 lines) | MSW + TestBed | **P0** | ⬜ Pending |
| `portal/services/data-browser.service.tl.spec.ts` | `data-browser.service.ts` (217 lines) | MSW + TestBed | P0 | ⬜ Pending |
| `portal/services/data-query-model.service.tl.spec.ts` | `data-query-model.service.ts` (296 lines) | MSW + TestBed | P0 | ⬜ Pending |

#### 3.3.4 datasources-database.component.tl.spec.ts Test Points

```typescript
// Framework: ATL + MSW
// MSW intercept: GET /api/portal/data/sources/:name (returns database datasource details)

describe("DatasourcesDatabaseComponent", () => {
  // Rendering
  it("should render connection form fields (host, port, database name)")
  it("should render test connection button")

  // Form interaction
  it("should enable save button only when required fields are filled")
  it("should show validation error when host is blank")
  it("should show validation error when port is non-numeric")

  // HTTP interaction
  it("should load datasource details on init via GET /api/portal/data/sources/:name")
  it("should POST connection test and display success/fail message")
  it("should PUT updated datasource on save")

  // Permission state
  it("should show read-only view when user lacks write permission")
})
```

#### 3.3.5 database-physical-model.component.tl.spec.ts Test Points

```typescript
// Framework: ATL + MSW
// Scenario: physical model table management, relationship editing

describe("DatabasePhysicalModelComponent", () => {
  // Initialization
  it("should load physical model table list on init")
  it("should display table columns when a table is selected")

  // Table operations
  it("should add a table to the model via drag-or-button")
  it("should remove a table and update the view")
  it("should show alias dialog when alias button is clicked")

  // Relationships
  it("should display join between two tables when join exists")
  it("should allow editing join type (inner/left/right/full)")
  it("should validate that both sides of join have selected columns")

  // Save
  it("should call PUT /api/portal/data/physical-model/** on save")
  it("should show success notification after successful save")
  it("should prevent navigation with unsaved changes (dirty guard)")
})
```

#### 3.3.6 data-model-browser.service.tl.spec.ts Test Points

```typescript
// Framework: MSW + TestBed (real HttpClientModule injection)

describe("DataModelBrowserService", () => {
  it("should fetch datasource list via GET /api/portal/data/sources")
  it("should return empty array on 404 response")
  it("should filter databases by type when type param is provided")
  it("should delete datasource via DELETE and remove from cache")
  it("should get physical model via GET and cache response")
  it("should retry on 503 (if retry logic exists in service)")
})
```

---

### 3.4 portal/portal/schedule (P0)

**Current state**: 34 TS files, 7 legacy specs (TestBed + NO_ERRORS_SCHEMA), 1 tl.spec.ts, coverage 20.6%.
**Rationale**: Schedule is a critical business feature; existing legacy specs use NO_ERRORS_SCHEMA with poor quality; EM already has 25 high-quality ATL specs that can be referenced directly.

#### 3.4.1 Directory Structure

```
portal/schedule/
├── schedule-task-list/               # Task list (920 lines) ⚠️
│   ├── edit-task-folder-dialog/      # Edit folder dialog
│   ├── move-task-dialog/             # Move task dialog
│   └── task-folder-browser/         # Folder browser
├── schedule-task-editor/
│   ├── actions/                     # task-action-pane (has legacy spec)
│   ├── conditions/                  # task-condition-pane (has legacy spec)
│   ├── options/                     # task-options-pane (has legacy spec)
│   ├── add-parameter-dialog/        # Parameter dialog (has legacy spec)
│   ├── execute-as-dialog/           # Execute-as dialog
│   └── parameter-table/             # Parameter table (has legacy spec)
└── model/                           # Pure TS models (no tests needed)
```

#### 3.4.2 Reference Strategy

EM schedule already has 25 complete `.tl.spec.ts` files. Portal schedule shares `shared/schedule` models with EM schedule — **EM test patterns and MSW handlers can be reused extensively**.

Correspondence:

| Portal component | EM reference file (reuse pattern directly) |
|------------|--------------------------|
| `schedule-task-list.component` | `em/.../schedule-task-list.component.tl.spec.ts` |
| `task-action-pane.component` | `em/.../task-action-pane.component.tl.spec.ts` |
| `task-condition-pane.component` | `em/.../task-condition-pane.component.tl.spec.ts` |
| `add-parameter-dialog.component` | `em/.../add-parameter-dialog.component.tl.spec.ts` |
| `daily-condition-editor.component` | `em/.../daily-condition-editor.component.tl.spec.ts` |
| `delivery-emails.component` | `em/.../delivery-emails.component.tl.spec.ts` |
| `backup-file.component` | `em/.../backup-file.component.tl.spec.ts` |

#### 3.4.3 Files to Add / Migrate

| Action | File | Framework | Priority | Status |
|------|------|------|--------|------|
| **Add** | `schedule-task-list/schedule-task-list.component.tl.spec.ts` | ATL + MSW | **P0** | ⬜ Pending |
| **Add** | `schedule-task-editor/execute-as-dialog/execute-as-dialog.component.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **Migrate** | `schedule-task-editor/actions/task-action-pane.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **Migrate** | `schedule-task-editor/conditions/task-condition-pane.spec.ts` → `.tl.spec.ts` | ATL + MSW | P0 | ⬜ Pending |
| **Migrate** | `schedule-task-editor/options/task-options-pane.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **Migrate** | `schedule-task-editor/add-parameter-dialog/add-parameter-dialog.component.spec.ts` → `.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **Migrate** | `schedule-task-editor/parameter-table/parameter-table.component.spec.ts` → `.tl.spec.ts` | ATL | P1 | ⬜ Pending |
| **Add** | `schedule-task-list/move-task-dialog/move-task-dialog.component.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |
| **Add** | `schedule-task-list/task-folder-browser/task-folder-browser.component.tl.spec.ts` | ATL + MSW | P1 | ⬜ Pending |

#### 3.4.4 schedule-task-list.component.tl.spec.ts Test Points

```typescript
// Framework: ATL + MSW
// Reference: em/settings/schedule/schedule-task-list/schedule-task-list.component.tl.spec.ts

describe("ScheduleTaskListComponent (Portal)", () => {
  // List rendering
  it("should render task list when tasks are loaded")
  it("should show empty state when no tasks exist")
  it("should display task name, status, and last-run time for each task")

  // Actions
  it("should navigate to task editor when task name is clicked")
  it("should open delete confirmation dialog when delete button is clicked")
  it("should call DELETE /api/portal/schedule/tasks/:id after confirmation")
  it("should refresh list after deletion")

  // Folders
  it("should render folder structure in tree")
  it("should expand/collapse folder on click")
  it("should open new-folder dialog when 'New Folder' button is clicked")

  // Filter / search
  it("should filter tasks by search keyword")
  it("should clear search and show full list when search is cleared")

  // Permissions
  it("should hide create button when user lacks CREATE permission")
  it("should disable delete button when user lacks DELETE permission")
})
```

---

### 3.5 portal/portal/dashboard (P1)

**Current state**: ~4 TS files, **0 specs**, coverage 0%.
**Rationale**: Dashboard management is portal's home-page entry feature; create/delete/reorder dashboards affects user experience.

#### 3.5.1 Files to Add

| New file | Source file | Framework | Priority |
|----------|------------|------|--------|
| `dashboard/edit-dashboard-dialog.component.tl.spec.ts` | `edit-dashboard-dialog.component.ts` | ATL + MSW | **P1** |
| `dashboard/portal-dashboard.component.tl.spec.ts` | `portal-dashboard.component.ts` | ATL + MSW | P1 |

#### 3.5.2 edit-dashboard-dialog.component.tl.spec.ts Test Points

```typescript
describe("EditDashboardDialogComponent", () => {
  it("should render name input and type selector")
  it("should validate that name is required")
  it("should show repository tree when type is 'Viewsheet'")
  it("should enable confirm button only when form is valid")
  it("should call POST /api/portal/dashboards on confirm")
  it("should close dialog and emit created dashboard on success")
  it("should show error message if name already exists (409 response)")
})
```

---

### 3.6 portal/common Services (P1)

**Current state**: 20 Services, 5 specs (all TestBed mode), 0% component coverage.
**Rationale**: common services are core to viewsheet lifecycle (ViewsheetClientService, RepositoryClientService), affecting the entire portal runtime.

#### 3.6.1 Service Tests to Add

| New file | Target Service | ~Lines | Framework | Priority |
|----------|-------------|--------|------|--------|
| `common/viewsheet-client/viewsheet-client.service.tl.spec.ts` | `viewsheet-client.service.ts` | — | Mock STOMP + TestBed | **P1** |
| `common/repository-client/repository-client.service.tl.spec.ts` | `repository-client.service.ts` | — | MSW + TestBed | **P1** |
| `common/asset-client/asset-client.service.tl.spec.ts` | `asset-client.service.ts` | — | MSW + TestBed | P1 |
| `vsobjects/util/vs-chart.service.tl.spec.ts` | `vs-chart.service.ts` (365 lines) | 365 | Direct logic test + MSW | **P1** |
| `vsobjects/util/show-hyperlink.service.spec.ts` | `show-hyperlink.service.ts` (290 lines) | 290 | Jest direct instantiation | P1 |
| `vsobjects/util/data-tip.service.spec.ts` | `data-tip.service.ts` (273 lines) | 273 | Mock dependency injection | P1 |
| `binding/services/binding-tree.service.tl.spec.ts` | `binding-tree.service.ts` (411 lines) | 411 | MSW + TestBed | P1 |
| `composer/util/assembly-action-factory.service.spec.ts` | `assembly-action-factory.service.ts` (240 lines) | 240 | Jest direct instantiation | P1 |
| `composer/util/repository-tree.service.tl.spec.ts` | `repository-tree.service.ts` (243 lines) | 243 | MSW + TestBed | P1 |

---

### 3.7 portal/composer (P1)

**Current state**: 176 TS files, 54 specs, coverage 26.1%, **0 `.tl.spec.ts`**.
**Rationale**: Composer is the designer core, frequently changed (property panes, binding, undo/redo); many legacy specs use NO_ERRORS_SCHEMA masking real rendering issues; canvas-level components (ws-pane, layout-pane) depend on jsPlumb and are unsuitable for deep ATL testing.

#### 3.7.1 Testability Tiers

| Type | Components | Strategy |
|------|------|------|
| Property dialogs (dialog/vs/) | data-input-pane, highlight-dialog, etc. | **ATL migration priority** |
| Canvas editors | ws-pane, layout-pane, editable-object-container | **smoke + E2E** |
| Services | assembly-action-factory, repository-tree | **Jest direct test** |
| Toolbar | toolbar-related | **ATL light test** |

#### 3.7.2 Files to Add / Migrate

**Property dialog ATL migration (P1)**

| Action | File | Reason | Status |
|------|------|------|------|
| ✅ Existing | `dialog/vs/data-input-pane-core-logic.tl.spec.ts` | Standalone ATL test, migration template | ✅ Done |
| ✅ Existing | `dialog/vs/data-input-pane-validate-date-format.tl.spec.ts` | Standalone ATL test, migration template | ✅ Done |
| Migrate | `dialog/vs/data-input-pane.component.spec.ts` → `.tl.spec.ts` | 2 existing .tl.spec.ts files as reference templates | ⬜ Pending |
| Migrate | `dialog/vs/highlight-dialog.component.spec.ts` → `.tl.spec.ts` | Heavy querySelector usage | ⬜ Pending |
| Migrate | `dialog/vs/selection-dialog.component.spec.ts` → `.tl.spec.ts` | Heavy querySelector usage | ⬜ Pending |
| Add | `dialog/vs/hyperlink-dialog.component.tl.spec.ts` | No coverage | ⬜ Pending |
| Add | `dialog/vs/general-prop-pane.component.tl.spec.ts` | No coverage | ⬜ Pending |

**Canvas class (P3, smoke only)**

| New file | Lines | Test content | Status |
|----------|------|----------|------|
| `gui/vs/ws-pane.component.tl.spec.ts` | 1076 | smoke: render without error; key ARIA structure present | ⬜ Pending |
| `gui/vs/layout-pane.component.tl.spec.ts` | 981 | smoke | ⬜ Pending |
| `gui/vs/asset-tree-pane.component.tl.spec.ts` | 909 | smoke + tree node expand test | ⬜ Pending |
| `gui/vs/ws-details-pane.component.tl.spec.ts` | 812 | smoke | ⬜ Pending |

#### 3.7.3 data-input-pane ATL Test Points (migration reference)

```typescript
// Framework: ATL (no MSW, pure component logic)
// Reference: data-input-pane-core-logic.tl.spec.ts (existing)

describe("DataInputPane (migrated)", () => {
  // Continue current tl.spec.ts pattern, add:
  it("should show error tooltip when field is invalid")
  it("should emit valueChange when input is modified")
  it("should disable input when component is in read-only mode")
  it("should show calendar picker when type is DATE")
})
```

---

### 3.8 portal/vsobjects (P1)

**Current state**: 121 TS files, 76 specs, coverage 35.5%, **0 `.tl.spec.ts`**.
**Rationale**: vsobjects is viewsheet runtime, triggered on every viewsheet render; existing spec quality varies, heavy NO_ERRORS_SCHEMA usage; month-calendar, preview-table, etc. are large and complex.

#### 3.8.1 Testability Tiers

| Type | Typical components | Strategy |
|------|----------|------|
| Display + interaction (light HTTP) | vs-submit, vs-text, vs-image | **ATL migration** |
| Display + interaction (heavy STOMP) | vs-object-container, vs-calctable | **ATL + Mock ViewsheetClient** |
| Complex calendar/time | month-calendar (1026 lines) | **ATL + Mock** |
| Data preview | preview-table (816 lines) | **ATL + MSW** |
| Canvas-level | vs-object-container canvas portion | **smoke + E2E** |

#### 3.8.2 Files to Add / Migrate

| Priority | File | Lines | Framework | Status |
|--------|------|------|------|------|
| **P1** | `objects/submit/vs-submit.component.tl.spec.ts` (migrate) | — | ATL | ⬜ Pending |
| **P1** | `objects/calendar/month-calendar.component.tl.spec.ts` | 1026 | ATL + Mock | ⬜ Pending |
| **P1** | `objects/table/preview-table.component.tl.spec.ts` | 816 | ATL + MSW | ⬜ Pending |
| **P1** | `objects/vs-object-container.component.tl.spec.ts` | 710 | ATL + Mock STOMP (smoke) | ⬜ Pending |
| **P1** | `objects/table/vs-calctable.component.tl.spec.ts` | 695 | ATL + Mock STOMP | ⬜ Pending |
| **P2** | `objects/text/vs-text.component.tl.spec.ts` | — | ATL | ⬜ Pending |
| **P2** | `objects/image/vs-image.component.tl.spec.ts` | — | ATL | ⬜ Pending |
| **P2** | `objects/gauge/vs-gauge.component.tl.spec.ts` | — | ATL | ⬜ Pending |

#### 3.8.3 month-calendar.component.tl.spec.ts Test Points

```typescript
// Framework: ATL + Mock (mock ChangeDetectorRef, mock ViewsheetClientService)

describe("MonthCalendarComponent", () => {
  // Calendar rendering
  it("should render correct number of days for given month/year")
  it("should highlight today's date")
  it("should show previous month's trailing days in correct position")

  // Interaction
  it("should emit dateSelected when user clicks a date")
  it("should navigate to previous month when left arrow clicked")
  it("should navigate to next month when right arrow clicked")
  it("should not allow selecting a date outside min/max range")

  // Selection state
  it("should mark dates in selectedDates array as selected")
  it("should mark date range as selected when rangeMode is active")

  // Accessibility
  it("should have aria-label on each date cell")
  it("should announce month change via aria-live region")
})
```

#### 3.8.4 Service Additions (vsobjects)

| New file | Target | Framework | Priority | Status |
|----------|------|------|--------|------|
| `vsobjects/util/vs-chart.service.tl.spec.ts` | `vs-chart.service.ts` (365 lines) | Logic + MSW | **P1** | ⬜ Pending |
| `vsobjects/util/show-hyperlink.service.spec.ts` | `show-hyperlink.service.ts` (290 lines) | Jest direct | P1 | ⬜ Pending |
| `vsobjects/util/data-tip.service.spec.ts` | `data-tip.service.ts` (273 lines) | Mock deps | P1 | ⬜ Pending |

---

### 3.9 portal/binding (P2)

**Current state**: 92 TS files, 27 specs, coverage 27.2%, **0 `.tl.spec.ts`**.
**Rationale**: Binding editor is core data-binding UI, a relatively mature area; existing specs have querySelector issues requiring migration.

#### 3.9.1 Files to Add / Migrate

| Priority | File | Framework | Status |
|--------|------|------|------|
| **P2** | `editor/chart/field/dimension-editor.component.tl.spec.ts` (migrate) | ATL | ⬜ Pending |
| **P2** | `editor/table/calc-group-option.component.tl.spec.ts` (migrate) | ATL | ⬜ Pending |
| **P2** | `editor/chart/field/measure-editor.component.tl.spec.ts` | ATL | ⬜ Pending |
| **P2** | `editor/binding-editor.component.tl.spec.ts` | ATL + MSW (light) | ⬜ Pending |
| **P2** | `services/binding-tree.service.tl.spec.ts` | MSW + TestBed | ⬜ Pending |
| **P2** | `services/vs-chart-editor.service.spec.ts` | Jest direct | ⬜ Pending |

#### 3.9.2 dimension-editor Test Points (migration)

```typescript
// Framework: ATL (pure component, no HTTP)

describe("DimensionEditor (migrated to ATL)", () => {
  it("should render name field and data type selector")
  it("should show date level picker when type is DATE/TIMESTAMP")
  it("should emit change event when user updates any field")
  it("should validate that name is not empty")
  it("should disable editing when read-only flag is set")
})
```

---

### 3.10 portal/graph (P2)

**Current state**: 20 TS files, 9 specs, coverage 35%, already has 1 `.tl.spec.ts` (`axis-label-pane.tl.spec.ts`).
**Rationale**: Graph dialogs are relatively simple; best-practice reference exists with low migration cost; `axis-label-pane.tl.spec.ts` is the ATL template for the entire portal.

#### 3.10.1 Files to Add / Migrate

| Priority | File | Reference | Status |
|--------|------|------|------|
| ✅ **Existing** | `dialog/axis-label-pane.tl.spec.ts` | ATL reference template for entire portal | ✅ Done |
| **P2** | `dialog/legend-pane.component.tl.spec.ts` (migrate) | axis-label-pane pattern | ⬜ Pending |
| **P2** | `dialog/chart-general-pane.component.tl.spec.ts` (migrate) | axis-label-pane pattern | ⬜ Pending |
| **P2** | `dialog/axis-title-pane.component.tl.spec.ts` (migrate) | axis-label-pane pattern | ⬜ Pending |
| **P2** | `dialog/axis-linear-pane.component.tl.spec.ts` (migrate) | axis-label-pane pattern | ⬜ Pending |
| **P3** | `chart-area.component.tl.spec.ts` | smoke only (1362 lines, canvas) | ⬜ Pending |
| **P3** | `chart-axis-area.component.tl.spec.ts` | smoke only (644 lines) | ⬜ Pending |

---

### 3.11 portal/widget (P2)

**Current state**: 162 TS files, 54 specs, coverage 24.7%, **0 `.tl.spec.ts`**.
**Rationale**: widget is the shared UI component library reused heavily by composer, vsobjects, and binding; condition editors (condition/) use querySelector heavily — high-value migration target.

#### 3.11.1 Files to Add / Migrate (batched)

**Condition editors (priority, heavy querySelector usage)**

| File | Action |
|------|------|
| `condition/condition-editor.component.tl.spec.ts` | Add |
| `condition/junction-editor.component.tl.spec.ts` | Add |
| `condition/sub-condition-editor.component.tl.spec.ts` | Add |

**Common controls**

| File | Action | Framework |
|------|------|------|
| `color-picker/color-picker.component.tl.spec.ts` | Add | ATL |
| `formula-editor/formula-editor.component.tl.spec.ts` | Add | ATL + Mock |
| `tree/tree.component.tl.spec.ts` | Migrate (has legacy spec) | ATL |
| `slide-out-panel/slide-out-panel.component.tl.spec.ts` | Migrate | ATL |

#### 3.11.2 Services (widget)

| New file | Target | Framework | Priority |
|----------|------|------|--------|
| `services/debounce.service.spec.ts` | `debounce.service.ts` | Jest direct (existing, verify quality) | Existing |
| `services/drop-down-stack.service.spec.ts` | `drop-down-stack.service.ts` | Jest direct | P2 |
| `services/dialog.service.spec.ts` | `dialog.service.ts` (263 lines) | Mock MatDialog | P2 |

---

### 3.12 portal/vs-wizard (P2)

**Current state**: 21 TS files, 6 specs, coverage 28.6%, **0 `.tl.spec.ts`**.

| New file | Lines | Framework | Priority |
|----------|------|------|--------|
| `wizard-pane/vs-wizard-pane.component.tl.spec.ts` | 975 | ATL + MSW | **P2** |
| `wizard-binding/wizard-binding-pane.component.tl.spec.ts` | — | ATL + MSW | P2 |

#### 3.12.1 vs-wizard-pane Test Points

```typescript
describe("VsWizardPaneComponent", () => {
  it("should render step 1 (Object Type selection) on init")
  it("should navigate to step 2 (Binding) when object type is selected")
  it("should render preview in step 3 (Preview)")
  it("should call POST to create viewsheet object on finish")
  it("should close wizard on cancel without creating object")
})
```

---

### 3.13 portal/vsview (P2)

**Current state**: 4 TS files, 1 spec, coverage 25%.

| New file | Lines | Framework | Priority |
|----------|------|------|--------|
| `vs-binding-pane/vs-binding-pane.component.tl.spec.ts` | 942 | ATL + MSW | **P2** |

---

### 3.14 em/common (P3)

**Current state**: 52 TS files, 14 specs, coverage 27%, **0 `.tl.spec.ts`**.
**Rationale**: em/common includes scroll-nav, file-chooser, table, and other shared controls reused across EM; existing tests are relatively good quality; lower priority than portal.

| File to add | Framework | Priority |
|-------------|------|--------|
| `common/table/expandable-row-table.component.tl.spec.ts` | ATL | P3 |
| `common/table/sortable-table.component.tl.spec.ts` | ATL | P3 |
| `common/file-chooser/file-chooser.component.tl.spec.ts` | ATL | P3 |
| `common/scroll-nav/scroll-nav.component.tl.spec.ts` | ATL | P3 |

---

### 3.15 em/monitoring (P3)

**Current state**: 34 TS files, 14 specs, coverage 41%, **0 `.tl.spec.ts`**.

| File to add | Framework | Priority |
|-------------|------|--------|
| `monitoring/summary/cluster-node-summary.component.tl.spec.ts` | ATL + MSW | P3 |
| `monitoring/performance/performance-metrics.component.tl.spec.ts` | ATL + MSW | P3 |
| `monitoring/cache/cache-settings.component.tl.spec.ts` | ATL + MSW | P3 |

---

### 3.16 em/widget (P3)

**Current state**: 26 TS files, **0 specs**, coverage 0%.
**Rationale**: EM widget provides admin UI shared controls; 0% coverage but relatively low risk (simple UI).

| File to add | Framework | Priority |
|-------------|------|--------|
| `widget/nav-tree/nav-tree.component.tl.spec.ts` | ATL | P3 |
| `widget/breadcrumb/breadcrumb.component.tl.spec.ts` | ATL | P3 |

---

### 3.17 em/navbar + em/page-header (P3)

**Current state**: 9 TS files total, **0 specs**, coverage 0%.

| File to add | Framework | Priority |
|-------------|------|--------|
| `navbar/em-navbar.component.tl.spec.ts` | ATL + MSW (navbar calls org info API) | P3 |
| `page-header/page-header.component.tl.spec.ts` | ATL | P3 |

---

## 4. Framework Selection Quick Reference

| Target type | Recommended framework | File suffix | Run command |
|-------------|----------|---------|---------|
| HTTP-heavy components (REST API) | **ATL + MSW** | `*.component.tl.spec.ts` | `npm run test:tl` |
| Pure display / simple interaction components | **ATL (no MSW)** | `*.component.tl.spec.ts` | `npm run test:tl` |
| HTTP Service | **MSW + TestBed** | `*.service.tl.spec.ts` | `npm run test:tl` |
| Pure logic Service (no HTTP) | **Jest direct instantiation** | `*.service.spec.ts` | `ng test portal` |
| STOMP / WebSocket-heavy components | **Mock StompClientService + ATL** | `*.component.tl.spec.ts` | `npm run test:tl` |
| Action classes (pure logic, no template) | **Jest direct test** | `*-actions.spec.ts` | `ng test portal` |
| Canvas / jsPlumb / canvas-heavy | **1–3 smoke tests** | `*.component.tl.spec.ts` | E2E primary |
| Models / interfaces (pure TS interface) | **No test needed** | — | — |

---

## 5. ATL Test Templates

### 5.1 ATL + MSW Component Template (most common)

```typescript
import { render, screen } from "@testing-library/angular";
import userEvent from "@testing-library/user-event";
import { HttpClientModule } from "@angular/common/http";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { server } from "../../../../../mocks/server";
import { http, HttpResponse } from "msw";
import { MyComponent } from "./my.component";
import { MyService } from "./my.service";

// Per-test-file MSW handler setup (optional; global handlers in portal.handlers.ts)
function setupHandlers() {
  server.use(
    http.get("*/api/portal/data/sources", () =>
      HttpResponse.json([{ name: "ds1", type: "jdbc" }])
    ),
  );
}

async function renderComponent(props = {}) {
  return render(MyComponent, {
    imports: [HttpClientModule, FormsModule, ReactiveFormsModule],
    providers: [MyService],
    componentProperties: { ...props },
    schemas: [NO_ERRORS_SCHEMA], // Keep during transition; tighten gradually
  });
}

describe("MyComponent", () => {
  beforeEach(() => setupHandlers());

  it("should load data on init and render list", async () => {
    await renderComponent();
    expect(await screen.findByText("ds1")).toBeInTheDocument();
  });

  it("should show empty state when list is empty", async () => {
    server.use(http.get("*/api/portal/data/sources", () => HttpResponse.json([])));
    await renderComponent();
    expect(screen.getByText(/no data sources/i)).toBeInTheDocument();
  });

  it("should call DELETE on remove and refresh list", async () => {
    let deleteCalled = false;
    server.use(
      http.delete("*/api/portal/data/sources/:name", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await renderComponent();
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    await userEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(deleteCalled).toBe(true);
  });
});
```

### 5.2 Pure Logic Service Template (no HTTP)

```typescript
import { MyService } from "./my.service";

describe("MyService", () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(/* inject mock deps */);
  });

  it("should transform input model correctly", () => {
    const result = service.transform({ a: 1 });
    expect(result).toEqual({ b: 1 });
  });
});
```

### 5.3 HTTP Service + MSW Template

```typescript
import { TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { server } from "../../../../../mocks/server";
import { http, HttpResponse } from "msw";
import { MyDataService } from "./my-data.service";

describe("MyDataService", () => {
  let service: MyDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule],
      providers: [MyDataService],
    });
    service = TestBed.inject(MyDataService);
  });

  it("should fetch datasources via GET", async () => {
    server.use(
      http.get("*/api/portal/data/sources", () =>
        HttpResponse.json([{ name: "ds1" }])
      ),
    );
    const result = await service.getDatasources().toPromise();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("ds1");
  });
});
```

### 5.4 ATL Query Priority

```
1. getByRole('button', { name: /save/i })     → Strongest semantics, preferred
2. getByLabelText('Username')                  → Form fields
3. getByPlaceholderText('Enter host...')       → Inputs without labels
4. getByText('Connection Settings')            → Static text
5. getByTestId('submit-btn')                   → Add data-testid when no semantics

❌ Forbidden: querySelector('.submit-button')
```

---

## 6. File Count Summary

### 6.1 New File Inventory (by phase)

#### Phase A (prerequisite infrastructure): 5 files (2/5 ✅ Done)

| File | Type | Status |
|------|------|------|
| `mocks/handlers/portal.handlers.ts` | MSW Handler | ✅ Done |
| `mocks/server.ts` (update) | — | ✅ Done |
| `shared/src/lib/schedule/schedule-users.service.spec.ts` | Service test | ⬜ Pending |
| `shared/src/lib/schedule/schedule-task-names.service.tl.spec.ts` | Service test | ⬜ Pending |
| `shared/src/lib/schedule/time-zone.service.tl.spec.ts` | Service test | ⬜ Pending |

#### Phase B (P0 core): ~20 files

Portal/Data (10) + Portal/Schedule (10)

#### Phase C (P1 high value): ~25 files

Portal/Dashboard (2) + Portal/Common Services (9) + Portal/Composer dialogs (5) + Portal/VSObjects (9)

#### Phase D (P2 gradual migration): ~30 files

Binding (6) + Graph (6) + Widget (8) + VS-Wizard (2) + VSView (1) + legacy migrations (~7)

#### Phase E (P3 completion): ~20 files

EM Common (4) + EM Monitoring (3) + EM Widget (2) + EM Navbar/PageHeader (2) + Canvas Smoke (~9)

#### Total: ~**100 new files** (including updates)

---

### 6.2 Run Command Quick Reference

```bash
# Working directory: community/web

# Run all existing tests (CI default)
npm run test

# Run ATL new stack only (.tl.spec.ts)
npm run test:tl

# Single file (legacy)
npx ng test portal --test-path-pattern "schedule-task-list" --no-ci

# Single file (ATL new stack)
npx jest --config=jest.tl.config.js --testPathPattern "schedule-task-list.component.tl"

# Generate coverage baseline
npx ng test portal --coverage --no-ci
npx jest --config=jest.tl.config.js --coverage

# Lint + test
npm run verify
```

---

## 7. Risks and Notes

### 7.1 Canvas Components (unsuitable for deep ATL testing)

The following components depend on jsPlumb, interact.js, and the Canvas API and cannot render realistically in Jest/JSDOM — **smoke tests only** (render without error + key ARIA present); primary coverage via Playwright E2E:

- `ws-pane.component.ts` (1076 lines, jsPlumb)
- `layout-pane.component.ts` (981 lines, jsPlumb)
- `chart-area.component.ts` (1362 lines, Canvas)
- `ws-details-pane.component.ts` (812 lines)
- `chart-axis-area.component.ts` (644 lines)
- `physical-model-network-graph.component.ts` (868 lines, D3/Canvas)
- `query-network-graph-pane.component.ts` (928 lines, D3/Canvas)

### 7.2 STOMP-Heavy Components

Components depending on STOMP/WebSocket (vs-object-container, vs-calctable, etc.) require Mock StompClientService:

```typescript
providers: [
  { provide: StompClientService, useValue: { subscribe: jest.fn(), send: jest.fn() } }
]
```

### 7.3 NO_ERRORS_SCHEMA Transition Strategy

- **Transition period** (Phases A–B): New `.tl.spec.ts` files may keep `NO_ERRORS_SCHEMA` to reduce initial friction.
- **Maturity period** (Phases C–D): Gradually replace with real child components or `MockComponent()` to improve test fidelity.

### 7.4 Legacy Specs Not Required to Migrate

Do not rewrite all 242 existing specs at once. Strategy:
1. **Change-triggered migration**: When modifying a component, migrate its spec in the same change.
2. **High-value first**: Specs with more than 5 `querySelector` usages are top migration candidates.
3. **Stable = keep**: Components with stable functionality keep legacy specs.

---

## Revision History

| Date | Notes |
|------|------|
| 2026-05-25 | Initial version: generated from portal-unit-testing-analysis and full-project scan |
| 2026-05-25 | Status update: Phase A infrastructure complete (portal.handlers.ts added 50+ handlers, server.ts registered); marked existing tl.spec.ts (data-datasource-browser, data-folder-browser, data-sources-tree-view, data-input-pane-* ×2, axis-label-pane) |
