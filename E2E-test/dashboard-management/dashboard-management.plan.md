# Plan: Dashboard Browser Spec Generation (single-plan output)

**Docs source:** `Dashboard-E2E-Scenarios.md`  
**Source module:** `Dashboard Deployment (EM + Portal)`

## Purpose

Use this plan together with `e2e/generate-browser-specs.prompt.md` to generate browser spec Markdown files under:

- `e2e/specs/browser/em/dashboard-management/`

This plan preserves **all scenarios** from `Dashboard-E2E-Scenarios.md` by mapping them into the existing spec split used by the repository (security off / security on / multi-tenant / user dashboards).

## Global Execution Rules

1. Read and follow `e2e/generate-browser-specs.prompt.md` for required spec format.
2. Output directory: `e2e/specs/browser/em/dashboard-management/`.
3. Use lowercase/kebab-case filenames exactly as named below.
4. Split primarily by runtime environment because each spec file assumes one global runtime setup.
5. Portal Dashboard route: `/app/portal/tab/dashboard`.
6. EM repository route: `/em/settings/content/repository`.
7. Use these page objects when applicable:
   - `DashboardTabComponent`
   - `EditDashboardDialog`
   - `ArrangeDashboardDialog`
   - `RepositoryDashboardSettingsViewComponent`
   - `RepositoryDashboardSettingsPageComponent`

## Scenario Preservation Map (from source doc)

| Source ID | Env tag in doc | Where it is covered in generated specs | Notes |
|---|---|---|---|
| TC-001 Create Global Dashboard | security=true | `dashboard-management.md` (create test) | Implement as security=false runtime spec (creation flow is same; keep runtime-specific assertions aligned with file runtime). |
| TC-002 Edit Global Dashboard | security=true | `dashboard-management.md` Test1 | Same as above. |
| TC-003 Delete Global Dashboard | security=true | `dashboard-management.md` Test4 | Also valid without security; use dedicated delete target asset. |
| TC-004 Reorder Global Dashboards | security=true | `user-dashboard-management.md` Arrange test (order/visibility) | Global reorder is not currently spelled out as a standalone browser spec; if needed, add a second Arrange test in `dashboard-management.md`. |
| TC-005 User Dashboard CRUD from Portal | security=true | `user-dashboard-management.md` Tests 1/3/6 | Full CRUD covered. |
| TC-006 User Dashboard bind VS across scopes | security=true | `user-dashboard-management.md` Tests 3/5 | Covers switching between VS. |
| TC-007 Arrange User Dashboard visibility | (conflicting) | `user-dashboard-management.md` Test2 | Source TC-007 mixes env tags; in repo specs it is treated as security=true portal arrange behavior. |
| TC-008 security=false storage location anonymous | security=false | `dashboard-management.md` (implicitly) | If you must assert anonymous folder explicitly, add a dedicated test in `dashboard-management.md`. |
| TC-009 security=false Enabled checkbox controls portal visibility | security=false | `dashboard-management.md` Tests 2/3 | Explicitly covered. |
| TC-010 Site admin creates dashboard for another org | multi-tenant | `dashboard-management-with-multi-tenancy.md` Test2 (Org Filter edit) | If you need the exact “create for another org” assertion, add a test in multi-tenant spec. |
| TC-011 Org admin edits own dashboard isolated | multi-tenant | `dashboard-management-with-multi-tenancy.md` Test2 | Covered by org admin verification. |
| TC-012 User dashboard stored per org folder | multi-tenant | `dashboard-management-with-multi-tenancy.md` (add test if needed) | Current spec focuses on clone + org filter edit; add storage-per-org test if required. |

> If strict one-to-one TC coverage is required, extend specs as described in the “Additions to ensure strict coverage” section.

## Output Files (to generate/update)

### 1) `dashboard-management.md`

**Spec title:** `Dashboard Management Without Security`  
**Runtime:** security disabled, multi-tenancy disabled

**Prerequisites**

- **Assets ZIP:** `dashboard-management-assets.zip`
  - global viewsheet `Dashboard/Sales Summary VS` with content `Sales Summary Content`
  - global viewsheet `Dashboard/Sales Detail VS` with content `Sales Detail Content`
  - global dashboard `Sales Overview` bound to `Dashboard/Sales Summary VS`, enabled, description `Quarterly sales metrics`
  - global dashboard `Global Visibility Toggle` bound to `Dashboard/Sales Summary VS`, enabled
  - global dashboard `Global Delete Target` bound to `Dashboard/Sales Summary VS`, enabled
  - `_REQUIRES_HUMAN_`: produce this ZIP if missing
- **Setup Script:** `dashboard-management-setup.groovy`
  - disable security and multi-tenancy
  - import the assets ZIP
  - ensure site admin can open EM Content > Repository
  - `_REQUIRES_HUMAN_`: produce this setup script if missing

**Tests to generate**

1. Edit global dashboard properties and verify Portal sync.
2. Disable global dashboard visibility without security.
3. Re-enable global dashboard visibility without security.
4. Delete global dashboard and verify cascade.
5. Create new global dashboard in EM and verify Portal can load it.

### 2) `dashboard-management-with-security.md`

**Spec title:** `Dashboard Management With Security`  
**Runtime:** security enabled, multi-tenancy disabled

**Prerequisites**

- **Assets ZIP:** `dashboard-management-with-security-assets.zip`
  - global viewsheet `Dashboard/Secured Sales VS` with content `Secured Sales Content`
  - global dashboard `Secured Global Dashboard` bound to the viewsheet, enabled, with no user grants at import time
  - `_REQUIRES_HUMAN_`: produce this ZIP if missing
- **Setup Script:** `dashboard-management-with-security-setup.groovy`
  - enable security and disable multi-tenancy
  - create `dashboard_allowed` / `Dashboard1234!`
  - create `dashboard_denied` / `Dashboard1234!`
  - grant both users Portal login permission
  - grant site admin EM Content > Repository management permission
  - do not pre-grant dashboard ACCESS to either user
  - `_REQUIRES_HUMAN_`: produce this setup script if missing

**Tests to generate**

1. ACCESS grant makes global dashboard visible to the granted user.
2. User without ACCESS cannot see secured global dashboard.

### 3) `user-dashboard-management.md`

**Spec title:** `User Dashboard Management`  
**Runtime:** security enabled, multi-tenancy disabled

**Prerequisites**

- **Assets ZIP:** `user-dashboard-management-assets.zip`
  - viewsheet `Dashboard/User Pipeline VS` with content `User Pipeline Content`
  - viewsheet `Dashboard/User Sales VS` with content `User Sales Content`
  - user dashboard `Existing Pipeline` bound to `Dashboard/User Pipeline VS`, enabled
  - user dashboard `To Delete` bound to `Dashboard/User Pipeline VS`, enabled
  - user dashboard `UserA Private Dashboard` owned by `dashboard_user_a` and bound to private viewsheet `My Private VS`
  - `_REQUIRES_HUMAN_`: produce this ZIP if missing
- **Setup Script:** `user-dashboard-management-setup.groovy`
  - enable security and disable multi-tenancy
  - create `dashboard_user` / `Dashboard1234!`
  - create `dashboard_user_a` / `Dashboard1234!`
  - create `dashboard_user_b` / `Dashboard1234!`
  - import assets required by all the above users
  - grant `dashboard_user` Portal access and EM Content > Repository access sufficient to edit `User Dashboard/dashboard_user`
  - grant `dashboard_user_a` Portal access
  - grant `dashboard_user_b` EM Content > Repository access sufficient to see `dashboard_user_a`'s User Dashboard folder but not user A private assets
  - `_REQUIRES_HUMAN_`: produce this setup script if missing

**Tests to generate**

1. Create user dashboard in Portal.
2. Arrange user dashboard order and visibility.
3. Edit user dashboard in Portal.
4. Portal edit synchronizes to EM User Dashboard folder.
5. EM edit synchronizes back to Portal.
6. Delete user dashboard from Portal and verify cascade.
7. Another user's private viewsheet is hidden in EM dashboard binding.

### 4) `dashboard-management-with-multi-tenancy.md`

**Spec title:** `Dashboard Management With Multi-Tenancy`  
**Runtime:** security enabled, multi-tenancy enabled

**Prerequisites**

- **Assets ZIP:** `dashboard-management-with-multi-tenancy-assets.zip`
  - org `DashboardOrgA` has viewsheet `Dashboard/OrgA Sales VS` with content `OrgA Sales Content`
  - org `DashboardOrgA` has dashboard `OrgA Sales Dashboard` bound to that viewsheet and enabled
  - source org `DashboardSourceOrg` has viewsheet `Dashboard/Clone Source VS`
  - source org `DashboardSourceOrg` has enabled dashboard `Clone Source Dashboard`
  - `_REQUIRES_HUMAN_`: produce this ZIP if missing
- **Setup Script:** `dashboard-management-with-multi-tenancy-setup.groovy`
  - enable security and multi-tenancy
  - create `DashboardOrgA`, `DashboardSourceOrg`; leave `DashboardCloneOrg` absent
  - create org admin `orga_admin` / `Dashboard1234!` for `DashboardOrgA`
  - create site admin with Org Filter and clone-organization permissions
  - import assets into their organizations
  - `_REQUIRES_HUMAN_`: produce this setup script if missing

**Tests to generate**

1. Clone organization copies dashboard resource but not Enable state.
2. Site admin Org Filter edit synchronizes with org admin view.

## Additions to Ensure Strict Coverage (if required)

If you need strict preservation of every TC as an explicit browser test (not just behavior coverage), add:

- **TC-004 (Global reorder):** add a new test in `dashboard-management.md` using EM Arrange pane for `Portal Dashboard` and assert Portal dropdown order.
- **TC-008 (anonymous storage):** add a new test in `dashboard-management.md` that creates a user dashboard in Portal under security=false and asserts EM path `User Dashboard/anonymous`.
- **TC-010 (site admin create for another org):** add a new test in `dashboard-management-with-multi-tenancy.md` that switches Org Filter to OrgB and creates a dashboard, then asserts ownership/visibility in OrgB.
- **TC-012 (user dashboard stored per org):** add a new test in `dashboard-management-with-multi-tenancy.md` that creates user dashboards in two orgs and asserts EM folder isolation.

## Notes / Known Gaps

- `_REQUIRES_HUMAN_`: assets ZIPs and Groovy setup scripts referenced by the specs may not exist yet.
- Multi-tenant org-clone workflow locators may require recording and then adding a reusable recipe in `e2e/specs/browser/_RECIPES.md`.
