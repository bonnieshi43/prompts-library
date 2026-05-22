# StyleBI Angular Test Strategy – Post Epic-70095
## Plan for portal2026 & composer2026 – May 2026

```
**Framework:** Angular 15.2 + TypeScript 4.9.4 + RxJS 6.6.7  
**Test runner:** Jest 28 via `@angular-builders/jest` – migration to Vitest is the first step (see Section 5)  
**Spec location:** Co-located with source (`foo.component.ts` + `foo.component.tl.spec.ts` siblings)
```

## Three-Layer Test Architecture – portal2026 & composer2026 Plan

```
Layer 1 – Vitest unit tests      Migrate and expand component, service, pipe, and directive coverage
Layer 2 – Playwright E2E         Browser + REST API tests against a real StyleBI instance, isolated by Docker
Layer 3 – Stagehand AI-driven    Semantic smoke tests resilient to structural UI churn [at zero]
```

### Layer 1 – Unit Tests

Vitest-based tests co-located with source. The portal2026 and composer2026 redesigns determine what to write now vs. defer — only `TopHeader` changes in portal2026, so every other portal test written now survives. Composer is divided into three buckets: unchanged-internals components (write now), shell containers being replaced (defer), and net-new Stage 2 components (write as built). Details in Section 4.

### Layer 2 – Playwright E2E

Browser tests via Playwright and REST API tests via Vitest, each running against a real StyleBI instance provisioned by Testcontainers. Current coverage is concentrated in EM admin workflows. Portal viewer golden paths and a spec-code gap (Markdown plans without TypeScript implementations) are the next priorities. Composer E2E defers until the shell rearchitecture stabilizes. Baseline and gaps are detailed in Section 4.

### Layer 3 – Stagehand

Semantic AI-driven smoke tests that act on user intent rather than CSS selectors — structurally resilient through redesign. Currently at zero. Must be set up before composer2026 Stage 2 begins so critical Composer workflows are covered while the shell changes underneath.

| | Vitest unit | Playwright E2E | Stagehand |
|---|---|---|---|
| Speed | ms | seconds | 10-30s/action |
| Cost | free | free | $ per LLM call |
| Determinism | ✓ | ✓ | ~ occasional flakiness |
| Survives UI refactor | ✓ | ✗ | **✓ adapts** |
| Tests business logic | ✓ | partial | ✗ |

---

## 2. Layer 1 Coverage



### Layer 1 Unit Test Coverage Audit

> **Scope:** This analysis covers **UI (Angular) tests only** – backend/Java tests are out of scope for portal2026 and composer2026. Of the three test layers, Layer 1 (unit) and Layer 2 (E2E) both have existing tests. Layer 3 (Stagehand) is at zero. Layer 2 has 22 specs (9 browser via Playwright + 13 REST API via Vitest) in `e2e/` with full Testcontainers-based Docker isolation — see Section 4 for the current E2E baseline and gaps.

Composer is not a separate Angular project – it lives inside the `portal` project under `web/projects/portal/src/app/composer/`. The `elements` and `viewer-element` build targets share the portal source and add no files of their own. Each area row below shows components, services, pipes, and directives separately so coverage gaps are visible per type, not hidden in a single total.

| Area | Type | Total | Tested | Untested | Coverage | 2026 Plan |
|---|---|---|---|---|---|---|
| **Composer** | Components | 176 | 51 | 125 | 29% | mixed – see Section 4 |
| `portal/app/composer/` | Services | 16 | 1 | 15 | 6% | write now – reused unchanged |
| | Directives | 25 | 0 | 25 | 0% | defer – tied to shell being replaced |
| | **Subtotal** | **217** | **52** | **165** | **24%** | |
| **Portal user-facing** | Components | 143 | 9 | 134 | 6% | write now |
| `portal/app/portal/` | Services | 25 | 0 | 25 | 0% | write now |
| | Pipes | 3 | 0 | 3 | 0% | write now |
| | **Subtotal** | **171** | **9** | **162** | **5%** | |
| **Portal shared** | Components | 435 | 160 | 275 | 37% | write now |
| `portal/app/vsobjects/` | Services | 86 | 1 | 85 | 1% | write now |
| `widget/` `binding/` etc. | Pipes | 11 | 1 | 10 | 9% | write now |
| | Directives | 43 | 3 | 40 | 7% | write now |
| | **Subtotal** | **575** | **165** | **410** | **29%** | |
| **EM** | Components | 266 | 97 | 169 | 36% | not in 2026 redesign scope |
| `em/` | Services | 39 | 12 | 27 | 31% | not in 2026 redesign scope |
| | Directives | 4 | 2 | 2 | 50% | not in 2026 redesign scope |
| | **Subtotal** | **309** | **111** | **198** | **36%** | |
| **Shared library** | Components | 4 | 1 | 3 | 25% | near-complete |
| `shared/` | Services | 15 | 0 | 15 | 0% | write now – used across portal and EM |
| | Directives | 1 | 0 | 1 | 0% | write now |
| | **Subtotal** | **20** | **1** | **19** | **5%** | |
| **Grand Total** | | **1,292** | **338 (26%)** | **954 (74%)** | | |

> **Note on portal2026 scope:** The 435 Portal shared components (`vsobjects/`, `widget/`, `binding/`, `vs-wizard/`, `graph/`, etc.) serve both the Portal viewer and the Composer. portal2026 is CSS-only so their contracts are unchanged — all tests written now survive. The 86 services and 43 directives in those same folders are equally stable and should be written now alongside the components.

### Spec File Breakdown by Type

The 338 existing spec files break down by naming pattern:

| Spec type | Count | Notes |
|---|---|---|
| `.component.spec.ts` | 161 | Explicitly component-named specs |
| Unnamed (dialogs, actions, utils) | 157 | Component/dialog tests with abbreviated names (e.g. `calendar-data-pane.spec.ts`), ~27 action-handler class specs, ~8 module specs |
| `.service.spec.ts` | 14 | Service logic tests |
| `.directive.spec.ts` | 5 | Directive behavior tests |
| `.pipe.spec.ts` | 1 | Pipe transform tests |
| **Total** | **338** | |

### Portal Subfolder Detail

Spec counts include all types (component + service + pipe + directive) in that folder and cannot be directly subtracted from the component count. Per-type coverage is in the Section 2 table above.

| Subfolder | Components | Total Specs |
|---|---|---|
| `composer/` | 176 | 52 |
| `widget/` | 162 | 44 |
| `portal/` | 143 | 9 |
| `vsobjects/` | 121 | 74 |
| `binding/` | 92 | 27 |
| `vs-wizard/` | 21 | 6 |
| `graph/` | 20 | 8 |
| `viewer/` + `vsview/` | 8 | 2 |
| `format/` | 5 | 3 |
| `common/` | 2 | 1 |
| `embed/` | 2 | 0 |
| `reload/` + `status-bar/` | 2 | 0 |

### EM Subfolder Detail

Spec counts include all types (component + service + directive) in that folder. Per-type coverage is in the Section 2 table above.

| Subfolder | Components | Total Specs |
|---|---|---|
| `settings/` (schedule, content, security, presentation, general, logging) | 203 | 73 |
| `monitoring/` | 19 | 13 |
| `common/util/` | 15 | 14 |
| `auditing/` | 14 | 0 |
| `search/` | 2 | 4 |
| `password/` | 2 | 1 |
| `navbar/` | 2 | 0 |
| `widget/` | 6 | 0 |
| `manage-favorites/` + others | 3 | 6 |

### Test Naming Conventions (established by this epic)

| Pattern | When to Use | Example |
|---|---|---|
| `feature.component.tl.spec.ts` | Component/template tests using ATL + Material stubs | `schedule-task-editor-page.component.tl.spec.ts` |
| `feature.service.spec.ts` | Pure service/utility logic tests | `schedule-task-editor-data.service.spec.ts` |
| `feature.service.logic.spec.ts` | Logic-only slice of a complex service | `security-provider.service.logic.spec.ts` |
| `feature.service.scene.spec.ts` | Integration/scene slice of a complex service | `security-provider.service.scene.spec.ts` |

### Shared Test Infrastructure (established by this epic)

**`MaterialTestingModule`** – central re-export of Material modules for EM component tests. Use in every new EM `.tl.spec.ts` instead of manually listing Material imports.

**`audit-test-utils.ts`**
- `MatSelectStub` – `ControlValueAccessor` stub for form-select testing without Material overhead
- `makeErrorServiceMock()` – factory for `ErrorHandlerService` mock; use in any test that injects it

**`ScheduleTaskEditorDataService` extraction pattern** – HTTP logic extracted from component into dedicated service. This is the model to follow: service spec owns HTTP logic, `.tl.spec.ts` owns component template behavior. Use `TimerService` abstraction for any new component with `setTimeout`-based behavior.

---

## 3. Testing Approach by Type

Services, pipes, and directives each have a distinct testing contract. Coverage for all three is visible in the Section 2 table.

**Services (182 total, 8% coverage):** Injectable classes holding business logic, HTTP calls, and shared state. Test by injecting via `TestBed`, mocking dependencies, asserting method behavior. The 14 existing service specs are concentrated in EM; Portal has only 2 and Shared has zero. Priority: portal services first (highest blast radius — 25 in `portal/`, 86 in shared subfolders), then shared services (15, used across both portal and EM).

**Pipes (14 total, 7% coverage):** Pure transform functions. Pure pipes need no `TestBed` — instantiate the class and call `transform()`. Only `condition.pipe.spec.ts` exists; `truncate`, `tree-search`, `replace-all`, and all VPM clause pipes are untested. Easiest wins in the entire codebase.

**Directives (73 total, 7% coverage):** Attribute-based DOM behaviors. Test with a minimal host component to assert DOM effects in isolation. Only 5 directive specs exist; widely-used ones like `tooltip`, `defaultFocus`, `inputTrim`, `fixedDropdown`, and `resizableTable` have no tests.

### Testing Patterns

**Pipe (no TestBed needed):**
```ts
it('truncates long strings', () => {
  expect(new TruncatePipe().transform('hello world', 5)).toBe('hello…');
});
```

**Directive (minimal host):**
```ts
@Component({ template: '<input [defaultFocus]>' })
class TestHostComponent {}

it('focuses the element on init', () => {
  const fixture = TestBed.createComponent(TestHostComponent);
  fixture.detectChanges();
  expect(document.activeElement).toBe(fixture.nativeElement.querySelector('input'));
});
```

**Service:**
```ts
it('returns empty list when no results', () => {
  const http = TestBed.inject(HttpTestingController);
  service.search('').subscribe(r => expect(r).toEqual([]));
  http.expectOne('/api/search').flush([]);
});
```

---

## 4. Write Now vs. Defer – portal2026 & composer2026

### portal2026 scope (from design handoff)

portal2026 is a **single-component change**: only `TopHeader` is modified (56→44px height, button/icon sizes, spacing, one aria-label copy change). No other portal component is touched. Every test written for portal components, services, pipes, and directives today survives portal2026 intact.

### composer2026 scope (from design handoff — Option B + B1)

The redesign maps existing Angular components into three distinct buckets. The "defer all composer" rule is an oversimplification — only the *shell containers* are being replaced.

**Bucket 1 – Unchanged internals, re-slotted into new shell (write now)**

These components keep all existing behavior; only their host slot changes:

| Existing component | New slot | Test action |
|---|---|---|
| `AssetTreeComponent` | Left panel "Assets" tab | **Write now** |
| `ComposerToolboxPaneComponent` | Left panel "Toolbox" tab | **Write now** |
| `ComponentsPaneComponent` | Left panel "Components" tab (always visible) | **Write now** |
| `vs-formats-pane` | Right panel "Format" tab | **Write now** |
| `VSBindingPane` internals | Binding editor overlay (chart path, chrome change only) | **Write now** |
| Existing `*-property-dialog` components | Right panel Bindings/Format tabs (Bucket A dialogs) | **Write now** |
| `<save-viewsheet-dialog>` | Save modal (Bucket 3b) | **Write now** |
| `<import-csv-dialog>` | Side sheet (Bucket 2) | **Write now** |
| `sort-column-dialog` | Anchored popover (Bucket 3a) | **Write now** |
| All `composer-binding-tree` services | Reused by new `TableBindingsProps` shelf | **Write now** |

**Bucket 2 – Shell/container components being replaced (defer)**

Only the structural wiring changes — don't write tests for these old containers:

| Existing component | What's happening | Test action |
|---|---|---|
| `ComposerToolbarComponent` | Merged with file-tab strip into new unified top bar | **Defer** |
| `ComposerMainComponent` layout | Split-pane wiring replaced by activity rail + 3-panel scaffold | **Defer** |

**Bucket 3 – Net-new components (write during Stage 2)**

No existing code to test yet; write specs co-located as each is built:

| New component | Description | Tier |
|---|---|---|
| Top bar | Merger of toolbar + file tabs; app-switcher ▾, ⋯ menu, Save, Preview/Run, Ask AI | Tier 2 |
| Activity rail (44px, left) | Icon strip mapping to `SidebarTab` enum (Assets/Toolbox/Components/Inspector/Assistant) | Tier 1 |
| Left panel split container | 3-tab scaffold routing to Bucket 1 panes | Tier 2 |
| Right panel Inspector container | Bindings/Format/Script tab router; Format and Script tabs route to Bucket 1 components | Tier 2 |
| `ChartBindingsSummary` | Read-only source + chip summary + "Open chart editor" CTA (chart binding right-panel view) | Tier 1 |
| `TableBindingsProps` | Editable compact binding shelf for Table/Crosstab/Selection/Form widgets; reuses `composer-binding-tree` services | Tier 2 |
| `BindingsProps` | Default fallback shelf for other widget kinds | Tier 1 |
| Floating selection toolbar | Anchored above selected widget; primary CTA = "Edit chart" for charts | Tier 2 |
| Empty state cards | 3 starter cards (Drag widget / Connect data / Template) + AI prompt stub | Tier 1 |

### Layer 2 and Layer 3

| Area | Design Impact | Test Action |
|---|---|---|
| Layer 2 E2E – fill SREE portal spec-code gap | 7 portal specs have Markdown plans but no TypeScript; infrastructure ready | **Write now** – use existing Testcontainers + Playwright setup |
| Layer 2 E2E – portal2026 viewer golden paths | No browser tests for Portal viewer yet; single-component redesign won't break selectors | **Write now** – stable golden paths, infrastructure exists |
| Layer 2 E2E – composer2026 golden paths | Shell rearchitecture makes selectors brittle today | **Defer** – write after composer2026 shell stabilizes |
| Layer 3 Stagehand – Composer during redesign | Semantic intent survives structural churn | **Set up now** – 15-20 critical workflows as safety net |

#### Layer 2 Current Baseline

**Infrastructure (`e2e/`):** Playwright + Vitest + Testcontainers. Each test run spins up an isolated StyleBI instance via Docker Compose. 11 Compose variants cover every storage backend (MongoDB, PostgreSQL, S3, Azure Blob, GCS, Firestore, CosmosDB, DynamoDB). A generated TypeScript REST client (from the enterprise OpenAPI spec) drives all API tests.

**Browser specs (9 implemented):**

| Spec | Area | Status |
|---|---|---|
| `em/navigation.spec.ts` | EM login, top-level navigation, settings sections | ✅ Implemented |
| `em/content/dashboard/dashboard-security.spec.ts` | Dashboard permission-based visibility | ✅ Implemented |
| `em/content/dashboard/dashboard-security-disabled.spec.ts` | Dashboard with security disabled | ✅ Implemented |
| `em/content/repository/import-export.spec.ts` | Repository import/export workflows | ✅ Implemented |
| `em/logging/logging.spec.ts` | Logging configuration | ✅ Implemented |
| `em/monitoring/cache/cache.spec.ts` | Cache management | ✅ Implemented |
| `em/schedule/tasks/tasks.spec.ts` | Schedule task management | ✅ Implemented |
| `em/security/users/users.spec.ts` | User management | ✅ Implemented |
| `sree/portal/repository-change-tree.spec.ts` | Portal repository asset change tracking | ✅ Implemented |

**REST API specs (13 implemented):** auth, configuration, data sources, files, logical models, materialized views, physical models, schedule, security, server, tree, viewsheets, worksheets — full CRUD coverage of the public REST API.

#### Layer 2 Gaps

**Spec-code gap (7 portal specs):** Markdown plans exist but TypeScript tests have not been generated:

| Spec | Area |
|---|---|
| `sree/portal/repository-tree.md` | Tree navigation interactions |
| `sree/portal/repository-favorites.md` | Favorites add/remove/open |
| `sree/portal/repository-folder.md` | Folder create/rename/delete |
| `sree/portal/repository-search.md` | Search and filter |
| `sree/portal/repository-history.md` | Asset history view |
| `sree/portal/repository-move.md` | Drag/drop asset move |
| `sree/portal/repository-open-new-tab.md` | Open asset in new browser tab |

**Portal viewer golden paths (not yet written):** All 9 existing browser specs cover EM admin workflows. No browser tests exist for the Portal viewer:

| Workflow | Navigation Success | UI Success | Network Success |
|---|---|---|---|
| Login → Portal home | `/portal` | Dashboard list visible | `200 OK` |
| Open viewsheet | `/portal/tab/dashboard/vs` | Viewsheet canvas renders | `200 OK` |
| Run report | Stays on viewsheet | Report output visible | `200 OK` |
| Export data | Modal → file download | "Download started" signal | `200 OK` |
| Create new viewsheet | `/composer` | Blank canvas visible | `200 OK` |

**CI gap:** E2E tests are not wired into the Jenkins pipeline (`Jenkinsfile`) — they run locally only (see Section 9).

#### Layer 3 Stagehand – Recommended Composer Workflows

Set up before composer2026 Stage 2 begins. Stagehand acts on semantic intent (`"open chart binding editor"`) not CSS selectors, so these remain valid through the rearchitecture:

| Workflow | Why Stagehand |
|---|---|
| Open viewsheet, add chart widget, configure bindings | Core Composer path; will change structurally |
| Add table widget, set data binding inline shelf | Binding sub-screen is being redesigned |
| Save/load viewsheet round-trip | Cross-component state – brittle with selectors |
| Open property dialog – change format | Dialog model is being replaced by inspector panels |
| Format tab: apply color, font, border | Format inspector is net-new in v3 |
| Script tab: enter expression, apply | Script tab context is changing |

---

## 5. Vitest Migration

The ~338 existing Jest specs must migrate to Vitest before the Portal and Composer test expansion begins. Writing hundreds of new specs on Jest and migrating again later doubles the work.

**Migration is mechanical – ~1-2 days for full suite:**

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `@types/jest` | `@vitest/globals` types |
| `@angular-builders/jest` | vitest config + npm script |
| `jest-canvas-mock` | `vitest-canvas-mock` |

Test logic, assertions, TestBed configs, and mock structures are **unchanged**.

### Audit of Hard-to-Migrate Cases

Actual spec file audit across all ~338 specs:

| Pattern | Files affected | Migration effort |
|---|---|---|
| `jest.resetModules` / `jest.isolateModules` / `jest.genMockFromModule` | **0** | None – these hard cases don't exist |
| `jest.mock()` factory | **2** | Direct rename to `vi.mock()` – same API, 1-2 line change per file |
| Canvas mocking | **11** | One global package swap (`jest-canvas-mock` → `vitest-canvas-mock`) – no per-spec changes |
| `toMatchSnapshot` / `toMatchInlineSnapshot` | **28** | Snapshot API exists in Vitest – `.snap` files need one regeneration pass (`vitest --update-snapshots`) |
| Everything else | **~297** | Pure `jest.` → `vi.` find-and-replace, no structural changes |

The 28 snapshot files are the only wrinkle. All 28 are concentrated in `vsobjects/action/` (action menu tests) plus 1 in `format/`. The fix is a single CLI command after migration – not manual edits per file.

**Steps:**
1. Add `vitest.config.ts` + `vitest-setup.ts` (canvas mocks, global stubs)
2. Update `angular.json` – replace `@angular-builders/jest` with vitest npm scripts
3. Swap `@types/jest` → `@vitest/globals` in `tsconfig.spec.json`
4. Regex replace `jest.` → `vi.` across all spec files
5. Swap `jest-canvas-mock` → `vitest-canvas-mock`
6. Run `vitest --update-snapshots` to regenerate the 28 snapshot files in `vsobjects/action/` and `format/`

### Post-Migration Enhancements

The existing ~338 specs lean heavily toward service and utility tests – they prove services work but leave component template behavior almost entirely uncovered. After the mechanical migration completes, five categories of enhancement are needed, in priority order:

**1. Add component template tests (highest impact)**
Each surviving service spec needs a companion `.tl.spec.ts` for the component that consumes it. This is the largest gap – service correctness is proven but rendered output, user interaction, and conditional UI states are untested. Use the `.tl.spec.ts` naming convention and the combined authoring method (see Section 7).

**2. Convert CSS selector queries to semantic ATL queries**
The component tests that do exist use `fixture.debugElement.query(By.css('.some-class'))` patterns. These break on CSS refactors even when behavior is unchanged. Upgrade to `screen.getByRole()` / `screen.getByLabel()` from Angular Testing Library so tests survive portal2026 and composer2026 visual changes.

**3. Convert snapshot tests to explicit assertions**
The 28 `vsobjects/action/` snapshot tests will regenerate fine but snapshots are opaque – a diff tells you something changed, not whether it's correct. Convert to explicit assertions like "toolbar contains exactly these 5 actions when user has edit permission." Concentrated in one folder, this is a bounded one-time effort.

**4. Adopt `MaterialTestingModule` in EM specs**
Several EM specs manually list Material module imports in each `TestBed`. Replace with the `MaterialTestingModule` introduced by epic-70095 – less boilerplate per file, one place to update when Material versions change.

**5. Standardize async patterns**
Older specs mix `fakeAsync/tick`, `async/await`, and `fixture.whenStable()` inconsistently. Vitest + ATL favors `waitFor()` from Testing Library. Standardize as new tests are written alongside old ones – no need for a dedicated pass.

---

## 6. Component Complexity Classification

Tiers apply to the portal2026 write-now targets: the `portal/` user-facing subfolder (143 components) and the Portal shared subfolders (435 components = 578 total). Composer components (176) are deferred – they will be classified fresh when composer2026 components are built.

### Tier 1 – Simple (~197 portal2026 components, ~34%)

**Criteria:** ≤5 injected services, ≤6 @Input/@Output, no @ViewChild DOM manipulation, no canvas/Renderer2  
**Portal examples:** `AliasPane`, `MultiSelect`, `StaticColorEditor`, `ColumnOptionDialog`, `TabListPane`, `TrapAlert`, `TableFormatOption`  
**Auto-generation quality (combined method): ~95%**

---

### Tier 2 – Medium (~289 portal2026 components, ~50%)

**Criteria:** 6-12 injected services, OR 7-15 @Input/@Output, OR @ViewChild + form binding + async patterns  
**Portal examples:** `AdvancedConditionPane`, `IdentityTreeComponent`, `ComponentsPane`, `ResourcePermissionComponent`, `VSLine`  
**Auto-generation quality (combined method): ~80%**

---

### Tier 3 – Complex (~92 portal2026 components, ~16%)

**Criteria:** 12+ injected services, OR extends `AbstractVSObject` or heavy base class, OR canvas/Renderer2/direct DOM manipulation, OR OnPush + many ViewChildren + complex async  
**Portal examples:** `VSChart` (18 services), `VSTable` (OnPush + scroll + Renderer2), `DatabaseQueryComponent`, `ScriptEditPaneComponent`  
**Auto-generation quality (combined method): ~65%** – slice-first approach required

**Tier 3 slice approach:** decompose into focused test families before generating
- Mode/branch switching
- Validation behavior
- List and selection state
- Async/subscription behavior
- Emitted events and save payload shape

---

### New composer2026 Components (Bucket 3 — written fresh during Stage 2)

New components are prime candidates to be written **standalone from day one** (Angular 17+ compatible), making TestBed setup lighter and tests naturally ready for the Angular upgrade.

> These map directly from the composer2026 design handoff (`design_handoff_composer/`). The canonical prototype is `composer.html`; pixel values, layout spec, and interaction patterns are in `specs/composer-design-spec.md`.

| New Component | Design role | Tier | Key test focus |
|---|---|---|---|
| Top bar | Merger of `ComposerToolbarComponent` + file-tab strip; app-switcher ▾, ⋯ menu, Save, Preview/Run context-switching, Ask AI pill | Tier 2 | Preview vs. Run mode switching by tab type; 4-edge-case header matrix (hasEMAccess × isSaaS × isDesigner × securityEnabled) |
| Activity rail (44px, left) | Icon strip mapping to `SidebarTab` enum; toggles Assets/Toolbox/Components/Inspector/Assistant panels | Tier 1 | Panel toggle state; active icon color shift; SidebarTab enum mapping |
| Left panel split container | 3-tab scaffold routing to `AssetTreeComponent`, `ComposerToolboxPaneComponent`, `ComponentsPaneComponent` | Tier 2 | Tab switching routes correct pane; panel resize via flush split-pane |
| Right panel Inspector container | Bindings/Format/Script tab router; Format→`vs-formats-pane`, Script→script editor | Tier 2 | Tab routing; Bindings sub-router delegates by widget kind |
| `ChartBindingsSummary` | Read-only source + typed chip summary (X/Y/Color/Detail/Filters) + "Open chart editor" CTA | Tier 1 | CTA emits open event; summary reflects bound fields |
| `TableBindingsProps` | Editable compact binding shelf for Table/Crosstab/Selection/Form widgets; reuses `composer-binding-tree` services | Tier 2 | Column shelf add/remove; filter rows; reuses service correctly |
| `BindingsProps` | Default fallback shelf for unrecognized widget kinds | Tier 1 | Renders without error for any widget kind |
| Floating selection toolbar | Anchors above selected widget; primary CTA "Edit chart" for charts, peer-verb layout for tables | Tier 2 | Correct CTA per widget kind; opens binding editor overlay |
| Empty state cards | 3 starter cards (Drag widget / Connect data / Template) + AI prompt stub; shown when no tabs open | Tier 1 | Cards render when canvas empty; hidden when tab active |
| Binding editor overlay | Slide-in ~78% width panel over dimmed scrim; back-chip + Cancel/Done; wraps existing `VSBindingPane` | Tier 2 | Open/close animation trigger; scrim click dismisses; Done saves |

---

## 7. Unit Test Authoring Methodology

> **Scope: Layer 1 unit tests only.** This section is a summary extract from [Unit_test_roadmap.md](Unit_test_roadmap.md), which contains the full playbooks, output patterns, and anti-creep rules. For Layer 2 E2E case authoring methodology, see [E2E_test_roadmap.md](E2E_test_roadmap.md). For services/pipes/directives testing patterns, see Section 3.

### The Combined Method: Playwright MCP + Source Reading

Neither tool alone is sufficient for unit/component test authoring. They cover each other's blind spots:

| What's needed | Source reading | Playwright MCP | **Combined** |
|---|---|---|---|
| TestBed providers/mock setup | ✓ reads DI tree | ✗ | ✓ |
| Accurate ATL selectors | ~ inferred | ✓ live DOM | ✓ |
| Interaction → state changes | ~ inferred | ✓ observes live | ✓ |
| Business logic assertions | ✓ reads class | ✗ | ✓ |
| Edge case / state triggering | ~ static | ✓ navigate live | ✓ |
| Async/subscription behavior | ✓ reads Observables | ✗ | ✓ |
| Actual rendered output | ~ guessed | ✓ screenshot | ✓ |

### AI Automation Created Cases Quality by Tier (combined method)

| Tier | Source only | Playwright only | **Combined** |
|---|---|---|---|
| Tier 1 (~197) | ~90% | ~70% | **~95%** |
| Tier 2 (~289) | ~60% | ~50% | **~80%** |
| Tier 3 (~92) | ~35% | ~40% | **~65%** |
| **Overall** | **~55%** | **~50%** | **~80%** |

### Tier 3 Slice Convention (from this epic)

For Tier 3 complex services and components, follow the `.logic.spec.ts` / `.scene.spec.ts` pattern introduced by `SecurityProviderService`:

- **`.logic.spec.ts`** – pure method-level behavior, no HTTP, no template
- **`.scene.spec.ts`** – service interactions, async flows, state transitions
- **`.tl.spec.ts`** – component template behavior using ATL queries

---

## 8. Effort Estimates

### Phase 1 – Vitest Migration (~1-2 days)
- Migrate all ~338 Jest specs to Vitest
- Validates toolchain before expansion begins

### Phase 2 – Layer 3 Stagehand Setup (~1 week)
- Stand up Stagehand against running StyleBI instance
- Author 15-20 Composer semantic workflow tests
- Safety net active before Stage 2 redesign touches the component tree

### Phase 3 – portal2026 Layer 1 Expansion (~3-4 weeks)
- ~404 untested portal2026 components across `portal/` and shared subfolders, post Vitest migration

| Tier | Count | Method | Estimate |
|---|---|---|---|
| portal2026 Tier 1 (simple, ~34% of 578) | ~197 total / ~130 untested | Combined (95% auto) | ~1 week |
| portal2026 Tier 2 (medium, ~50% of 578) | ~289 total / ~210 untested | Combined (80% auto) | ~2 weeks |
| portal2026 Tier 3 (complex, ~16% of 578) | ~92 total / ~64 untested | Sliced approach | ~1 week |
| Composer services | ~30 | Source reading | ~3 days |
| **Total untested portal2026** | **~404** | | **~3-4 weeks** |

### Phase 4 – Layer 2 E2E Gap Closure (~1-2 weeks)
Infrastructure (Playwright, Testcontainers, Docker Compose, helpers) is already in place — no setup cost.

| Task | Effort |
|---|---|
| Implement 7 SREE portal spec-code specs (use `generate-browser-tests.prompt.md` AI pipeline) | ~3-4 days |
| Add 5 portal viewer golden-path browser specs (login, open VS, run report, export, create VS) | ~3-4 days |
| Wire E2E into Jenkins pipeline (`Jenkinsfile`) with HTML reporter upload | ~1 day |
| **Total** | **~1-2 weeks** |

### Phase 5 – composer2026: Write Bucket 1 Now, Bucket 3 as Built

**Bucket 1 (write now, ~2 weeks alongside Phase 3):** Existing composer components with unchanged internals — test behavior that survives the shell rearchitecture:
- `AssetTreeComponent`, `ComposerToolboxPaneComponent`, `ComponentsPaneComponent`
- `vs-formats-pane`, `VSBindingPane` internals
- All `*-property-dialog` components (Bucket A), `save-viewsheet-dialog`, `import-csv-dialog`, `sort-column-dialog`
- All `composer-binding-tree` services (16 services, only 1 currently has a spec)

**Bucket 3 (co-locate spec as each is built, ~1 week total):** Net-new Stage 2 components — write spec immediately when the component is created:
- Top bar (Preview/Run mode-switching + 4-edge-case header matrix)
- Activity rail (SidebarTab enum mapping + panel toggle)
- Left panel split container, right panel Inspector tab router
- `ChartBindingsSummary`, `TableBindingsProps`, `BindingsProps`, binding editor overlay
- Floating selection toolbar, empty state cards

After composer2026 shell stabilizes:
- Layer 2 Playwright E2E for composer2026 golden paths (~1 week)

---

## 9. CI Wiring

**CI system:** Jenkins (`Jenkinsfile` in repo root). Maven drives the full build; Jenkins pipeline stages cover Maven build, Docker image (Jib), and Helm chart packaging.

### Current State – Gaps

| Gap | Detail |
|---|---|
| `.tl.spec.ts` tests not in CI | `ng test` excludes `.tl.spec.ts` via `testPathIgnorePatterns`; `npm run test:tl` is never called by Maven – the entire epic-70095 component test suite runs manually only |
| `jest-junit` XML never archived | `jest-junit` writes `junit.xml` to `web/` but no Jenkins `archiveArtifacts` or `junit` step captures it – the file is discarded after the build |
| No test result visibility in PRs | Failures show only as a red build status – no per-test breakdown visible in Jenkins |
| No output path configured | `jest-junit` has no explicit output path in `package.json` – relies on default location and env vars |
| **E2E not in pipeline at all** | The `Jenkinsfile` has no E2E stage – all 22 E2E specs (`e2e/tests/`) run locally only |

### Target State – After Vitest Migration

Vitest has a **built-in JUnit reporter** – no external package needed. Output path is declared in `vitest.config.ts` directly:

```ts
// vitest.config.ts
export default defineConfig({
  reporters: ['default', 'junit'],
  outputFile: {
    junit: './target/test-results/junit.xml'
  }
})
```

This replaces both the `jest-junit` npm dependency and the implicit env-var-based path configuration. The `target/test-results/` path aligns with Maven's standard output conventions.

### CI Wiring Steps

**Step 1 – Wire `.tl.spec.ts` into Maven build**

Update `web/pom.xml` to run both test commands during the `test` phase:
```xml
<arguments>run verify:tl</arguments>
```
Add `verify:tl` to `package.json` scripts: `"verify:tl": "ng lint && ng test && npm run test:tl"`

After Vitest migration this collapses to one command since both spec patterns run in the same Vitest suite.

**Step 2 – Archive unit test results in `Jenkinsfile`**

After the Maven build step, add a JUnit result archival step:
```groovy
stage('Test') {
    steps {
        sh './mvnw --batch-mode clean install'
    }
    post {
        always {
            junit 'web/target/test-results/junit.xml'
        }
    }
}
```

The `post { always { ... } }` block ensures results are published even when tests fail – otherwise the failure exits Maven before the archival step runs.

**Step 3 – Add E2E stage to `Jenkinsfile`**

After unit tests pass, add an E2E stage. E2E requires Docker and a license key:
```groovy
stage('E2E') {
    environment {
        INETSOFT_LICENSE_KEY = credentials('inetsoft-license-key')
    }
    steps {
        dir('e2e') {
            sh 'npm ci'
            sh 'npm run test:api'
            sh 'npm run test:browser'
        }
    }
    post {
        always {
            publishHTML target: [
                reportDir: 'e2e/playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright E2E Report'
            ]
            junit 'e2e/test-results/**/*.xml'
        }
    }
}
```

Configure Playwright's JUnit output in `playwright.config.ts`:
```ts
reporter: [['html'], ['junit', { outputFile: 'test-results/junit.xml' }]]
```

### Reporting After Wiring

| What you get | How |
|---|---|
| Per-test pass/fail breakdown | Jenkins JUnit plugin renders test results per build |
| Trend visibility | Jenkins stores result history across builds |
| Playwright HTML report | `publishHTML` step archives the full interactive Playwright report |
| Failure triage without log diving | Failing test name, file, and assertion visible in Jenkins test results |

---

## 10. Quick-Win Summary

| Group | Count | Method | When |
|---|---|---|---|
| Vitest migration (all existing unit specs) | ~338 | Mechanical find-replace | Day 1-2 |
| Stagehand Composer smoke suite | ~15-20 workflows | Semantic authoring | Week 1 |
| portal2026 Tier 1 simple (untested) | ~130 | Combined (95% auto) | Week 2-3 |
| portal2026 Tier 2 medium (untested) | ~210 | Combined (80% auto) | Week 3-5 |
| portal2026 Tier 3 complex (untested) | ~64 | Sliced approach | Week 5-6 |
| Composer Bucket 1: unchanged-internals components + all services | ~30 services + untested Bucket 1 components | Source reading + combined | Week 3-5 |
| E2E: implement SREE portal spec-code gap | 7 specs | AI pipeline (`generate-browser-tests.prompt.md`) | Week 2-3 |
| E2E: portal viewer golden paths | 5 workflows | Playwright + existing helpers | Week 3-4 |
| E2E: wire into Jenkins pipeline | 1 `Jenkinsfile` stage | Jenkins groovy + Playwright JUnit reporter | Week 4 |
| Composer Bucket 3: net-new components (co-located) | 10 new components | Co-located as each is built | During Stage 2 |
| composer2026 Layer 2 E2E (after shell stabilizes) | ~10 workflows | Playwright + POM | Post Stage 2 |

---

## 11. Recommended Starting Point

1. **Vitest migration** (1-2 days) – unblocks all subsequent unit test expansion on the right stack
2. **E2E: implement SREE portal spec-code gap** (~3-4 days) – 7 Markdown specs become real Playwright tests using the existing AI pipeline; no infrastructure setup needed
3. **E2E: portal viewer golden paths** (~3-4 days) – 5 browser workflows using existing Testcontainers + helper infrastructure
4. **E2E: Jenkins wiring** (~1 day) – add E2E stage to `Jenkinsfile`; configure Playwright JUnit reporter
5. **Stagehand Composer smoke setup** (~1 week) – safety net must be in place before composer2026 Stage 2 touches the shell containers
6. **Pilot: 10 portal2026 Tier 1 components** using combined method – validate the unit test workflow before batching
7. **Batch portal2026 Tier 1 + Tier 2** (~340 components) – broad unit test coverage before redesign lands
8. **Composer Bucket 1: unchanged-internals components + all composer services** – write now alongside portal2026 batch; these survive the rearchitecture (`AssetTreeComponent`, `ComponentsPaneComponent`, `vs-formats-pane`, `VSBindingPane` internals, all `*-property-dialog`s, all `composer-binding-tree` services)
9. **Composer Bucket 3: write spec co-located as each new component is built** – top bar, activity rail, Inspector container, `ChartBindingsSummary`, `TableBindingsProps`, floating toolbar, empty state
10. **composer2026 Layer 2 E2E** – after composer2026 shell is stable
