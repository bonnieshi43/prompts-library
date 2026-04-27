---
module: Content-Dashboard / Regression Scenarios
source: Content-Dashboard-Overview.md, Content-Dashboard-GlobalDashboard.md, Content-Dashboard-UserPortalDashboard.md
last-updated: 2026-04-27
---

> P3 scenarios are excluded. Items marked _(inferred)_ are expanded from context.
> Items marked [NEEDS CLARIFICATION] require manual review.

## Feature Summary

### Feature Description
Content-Dashboard covers Global Dashboards managed from EM and User Dashboards created from the Portal Dashboard tab. The core business objects are dashboard repository resources, their bound viewsheet/dashboard assets, visibility state, ordering, owner metadata, and access permissions. The primary users are Site Admins, Org Admins, authorized EM users, and Portal users who consume or manage their own dashboards.

### Rules And Notes

#### General Rules
- Global Dashboards are created and edited in EM, persisted as repository resources, and displayed in Portal when their saved Enable state allows it.
- User Dashboards are created from Portal, stored under the owning user's dashboard scope, and remain editable through the supported EM and Portal management surfaces.
- Dashboard name, description, bound asset, order, Enable state, and delete results must persist after reload and synchronize across the relevant EM and Portal views.
- Global Dashboards are always read-only in Portal regardless of security mode; Portal users must not mutate their metadata, binding, order, or resource state.

#### Security, Permissions And Multi-Tenancy
_(Omit any mode row that does not apply)_

- **security=false:** EM-side Enable controls Portal dashboard availability; all users see enabled dashboards without access permission checks. No authorization objects or owner enforcement apply.
- **security=true, multi-tenant=false:** Portal visibility requires both dashboard resource ACCESS and Dashboard access permission. EM repository visibility depends on ADMIN access to the relevant repository path. A permitted non-admin creator automatically receives access to the Global Dashboard they create; other users require explicit grants. Dashboard binding must not allow a user to persist a reference to an asset they are not authorized to use.
- **security=true, multi-tenant=true:** In addition to the above: Site Admin creation through Org filter must assign resource ownership and access ownership to the target org, not Host-Org. Org Admin and permitted internal user creation uses the currently logged-in tenant user as owner. User Dashboard storage and edits are tenant-scoped and must not leak across orgs. Site Admin can read and write other orgs' User Dashboards through Org filter.
- **Other special cases:** Security switch false→true resets public visibility and requires explicit ACCESS grants. Security switch true→false restores EM-side Enable as the sole availability gate. Clone Org copies dashboard resources but not per-user Enable state; cloned-org Enable state is managed independently and must sync with Site Admin's Org filter view.

#### Special Cases / Known Risks
- Bug #69387: wrong owner/access assignment after Site Admin switches org with Org filter.
- Bug #69347: cloned org user Enable state behavior; depends on Bug #69387.
- Bug #69468: private asset binding visibility, including cross-org User Dashboard cases.
- Missing bound assets must fail clearly with `sheet not found` without corrupting other dashboard state.

#### Generation Decisions
- Permissions and multi-tenancy scenarios are merged into a single section because multi-tenancy always requires security=true and the test paths are naturally interleaved.
- User/role/group and ADMIN/ACCESS matrix combinations are represented by one representative grant case and one deny case; exhaustive coverage is deferred to the Security module.
- UI-only checks such as dialog open, button enabled state, scrollbars, default selection, and generic toolbar "work correctly" behavior are excluded as P3.
- Toolbar actions are not generated here unless they create or mutate dashboard-owned business state; concrete outcomes belong to Scheduler, Mail, Export, or Composer.

---

## Scenario Overview

| ID(s) | Priority | Area | Scenario | Key Business Assertion |
|-------|----------|------|----------|------------------------|
| CD-CRUD-001 - CD-CRUD-002 | P1 | CRUD | Dashboard creation persists resource and user scope | Create flows produce persisted repository resources with correct binding, synced across EM and Portal. |
| CD-CRUD-003 | P1 | CRUD | Edit dashboard data and binding persists and syncs | Rename and binding changes are persisted and consistent across EM and Portal. |
| CD-CRUD-004 | P1 | CRUD | Arrange order and Enable state persist correctly | Order and Enable changes persist and sync; Portal Arrange Enable does not overwrite EM-side Enable. |
| CD-CRUD-005 | P1 | CRUD | Delete dashboard cleans repository and Portal references | Deleting a dashboard removes it from EM, Portal, and Arrange state on both sides. |
| CD-CRUD-006 | P2 | CRUD | Reject invalid identity or missing binding | Empty name, duplicate name, and missing binding are rejected without corrupting existing state. |
| CD-SEC-001 | P1 | Security | Global Dashboard Portal visibility by security mode | security=false shows all enabled dashboards; security=true requires explicit ACCESS grant. |
| CD-SEC-002 | P1 | Security | EM repository visibility requires ADMIN access | Dashboard resources are only visible and manageable in EM when the actor has ADMIN permission. |
| CD-SEC-003 | P1 | Security | Global Dashboard creator receives access | Permitted non-admin creators automatically receive access on newly created Global Dashboards. |
| CD-SEC-004 | P1 | Security | Global Dashboards remain read-only in Portal | No Portal edit or delete path can mutate Global Dashboard state regardless of security mode. |
| CD-SEC-005 | P2 | Security | Unauthorized asset binding rejected | Dashboard binding must not persist a reference to an asset the actor is not authorized to use. |
| CD-SEC-006 | P1 | Multi-Tenancy | Site Admin Org filter assigns ownership to target org | Dashboard resource and access permission created via Org filter belong to the target org, not Host-Org. |
| CD-SEC-007 | P1 | Multi-Tenancy | Org Admin and internal user creation uses current user as owner | Dashboard owner is the logged-in user; resource is stored in that user's org. |
| CD-SEC-008 | P1 | Multi-Tenancy | User Dashboard storage and three-side sync are tenant-scoped | User Dashboard changes sync across Site Admin EM, Org Admin EM, and user Portal without leaking across orgs. |
| CD-SEC-009 | P2 | Multi-Tenancy | Clone Org copies resources but not per-user Enable state | Cloned org Enable state is independently managed and stays in sync with Site Admin Org filter view. |
| CD-SEC-010 | P1 | Multi-Tenancy | Site Admin edits other org User Dashboard via Org filter | Host-Org can read and write other orgs' User Dashboards through Org filter when binding global-scope assets. |
| CD-EDGE-001 | P2 | Edge Cases | Private asset binding restriction enforced | Users cannot see or bind another user's private dashboard asset through the edit binding panel. |
| CD-EDGE-002 - CD-EDGE-003 | P2 | Edge Cases | Security mode switch visibility behavior | Basic visibility follows explicit ACCESS after enabling security and EM-side Enable after disabling security. |
| CD-EDGE-004 | P2 | Edge Cases | Missing bound asset fails with a clear error | Broken bindings produce `sheet not found` and do not corrupt unrelated dashboard state. |

---

## CRUD — Persistence And Synchronization

#### CD-CRUD-001 Create Global Dashboard Persists Resource State `P1`

**Scope:** EM > Content > Repository > Portal Dashboard
**Validates rule:** Global Dashboards are created from EM and must persist as repository resources with the correct bound dashboard and Portal availability state.

**Pre-conditions:** A source viewsheet dashboard exists. The actor is Site Admin, Org Admin, or a user with the required EM and Portal Dashboard Tab permissions.

**Steps:**
1. Create a Global Dashboard in EM with a unique name and a valid bound dashboard.
2. Reload EM and verify the dashboard resource still exists with the same binding.
3. **Sync check:** As an allowed Portal user, open the dashboard and verify the saved binding and availability state.

**Expected:**
- The dashboard resource is persisted under the Global Dashboard repository path.
- The saved binding opens the expected dashboard asset.
- EM and Portal show the same persisted name, description, binding, and availability.
- EM does not create a User Dashboard through this Global Dashboard creation flow.

#### CD-CRUD-002 Create User Dashboard Persists To The User Scope `P1`

**Scope:** Portal Dashboard tab and EM User Dashboard repository tree
**Validates rule:** User Dashboards are created from Portal and stored under the owning user's dashboard scope.

**Pre-conditions:** The user can access the Portal Dashboard tab and at least one eligible dashboard asset is available for binding.

**Steps:**
1. Create a User Dashboard from Portal with a unique name and a valid bound dashboard.
2. Reload Portal and verify the dashboard still opens the selected asset.
3. **Sync check:** As an authorized EM administrator, verify the same User Dashboard exists under the user's dashboard repository scope.

**Expected:**
- The User Dashboard is persisted for the owning user.
- Portal and EM resolve the same dashboard resource.
- The saved binding remains intact after reload.

#### CD-CRUD-003 Edit Dashboard Data And Binding Persists And Syncs `P1`

**Scope:** EM and Portal edit paths for Global Dashboards and User Dashboards
**Validates rule:** Dashboard edits must update persisted data and remain synchronized across management surfaces.

**Pre-conditions:** A Global Dashboard and a User Dashboard exist. The actor has edit access through the relevant surface.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Rename a Global Dashboard from EM | New name persisted and shown consistently in EM and Portal. |
| Change description of a Global Dashboard from EM | New description persisted and shown consistently in EM and Portal. |
| Change the bound asset for a Global Dashboard | Dashboard opens the newly bound asset in both EM and Portal. |
| Rename a User Dashboard from Portal or EM | New name persisted and shown consistently in Portal and EM. |
| Change the bound asset for a User Dashboard | Dashboard opens the newly bound asset in both Portal and EM. |
| Change binding between global-scope and user-scope assets | Binding is saved and synchronized; exact scope marker behavior is [NEEDS CLARIFICATION]. |

#### CD-CRUD-004 Arrange Dashboard Order And Enable State Persist `P1`

**Scope:** EM Global Dashboard arrange flow and Portal Arrange Dashboards dialog
**Validates rule:** Order changes sync across EM and Portal. Portal Arrange `Enable` controls Portal display only and must not overwrite EM-side `Enable`.

**Pre-conditions:** Multiple dashboards exist. At least one is visible in Portal and manageable from EM.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Reorder Global Dashboards from EM | Order persisted and synchronized to Portal, EM repository tree, and EM Arrange. |
| Reorder dashboards from Portal Arrange | Order persisted and reflected in EM Arrange. |
| Disable a dashboard from Portal Arrange | Dashboard hidden on Portal; EM-side `Enable` and Security settings unchanged. |
| Disable a Global Dashboard from EM-side `Enable` | Dashboard removed from Portal availability and from the EM Arrange page. |

#### CD-CRUD-005 Delete Dashboard Cleans Repository And Portal References `P1`

**Scope:** EM and Portal dashboard delete flows
**Validates rule:** Deleting a dashboard must remove the persisted resource and all Portal/Arrange references.

**Pre-conditions:** A Global Dashboard and a User Dashboard exist.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Delete a Global Dashboard from EM | Resource removed from EM, Portal, and Global Dashboard Arrange state. |
| Delete a User Dashboard from EM | Resource removed from EM and Portal for that user. |
| Delete a User Dashboard from Portal | Resource removed from Portal, EM, and the user's Arrange Dashboards state. |

#### CD-CRUD-006 Reject Invalid Dashboard Identity Or Missing Binding `P2`

**Scope:** Dashboard creation and edit persistence rules
**Validates rule:** Identity and binding constraints protect persisted state from invalid or ambiguous records.

**Pre-conditions:** Dashboard creation or edit is being saved from a supported surface.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Save with an empty dashboard name | Save is rejected; no dashboard resource is created or overwritten. |
| Save with a duplicate dashboard name in the same scope | Save is rejected; the existing dashboard remains unchanged. |
| Save without a required bound dashboard | Save is rejected; no dashboard is created with an unresolved binding. |

---

## Security, Permissions And Multi-Tenancy

#### CD-SEC-001 Global Dashboard Portal Visibility By Security Mode `P1`

**Scope:** Portal Dashboard visibility under different security modes
**Validates rule:** security=false shows all enabled dashboards to all users; security=true requires both resource ACCESS and Dashboard access permission.

**Pre-conditions:** At least one Global Dashboard with `Enable=true` exists. One representative user is available for permission checks.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| `security=false` — user opens Portal Dashboard tab | All dashboards with `Enable=true` are visible without permission checks. |
| `security=true` — user has no ACCESS granted | User cannot see or open any Global Dashboard in Portal. |
| `security=true` — user is granted ACCESS on a specific dashboard | User sees and can open only the granted dashboard in Portal. |

#### CD-SEC-002 EM Repository Visibility Requires ADMIN Access `P1`

**Scope:** EM repository tree visibility for Dashboard resources with `security=true`
**Validates rule:** Dashboard repository visibility must integrate with ADMIN permission on the relevant repository nodes.

**Pre-conditions:** `security=true`; a Global Dashboard and a User Dashboard exist; a representative non-admin actor is available.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Actor has ADMIN access on the dashboard repository path | Dashboard resource is visible and manageable in EM. |
| Actor does not have ADMIN access on the dashboard repository path | Dashboard resource is not visible or manageable in EM. |
| Actor has ADMIN access on their own user dashboard scope | Their own User Dashboard can be managed through the authorized EM path. |

#### CD-SEC-003 Global Dashboard Creator Receives Access `P1`

**Scope:** EM Global Dashboard creation with `security=true`
**Validates rule:** A user with valid EM and Portal Dashboard Tab permission automatically receives access on the Global Dashboard they create.

**Pre-conditions:** `security=true`; a non-admin user has the required creation permissions.

**Steps:**
1. As the permitted non-admin user, create a Global Dashboard from EM.
2. Verify the saved access state grants the creator access to the new dashboard.
3. **Sync check:** Verify the same user can open the created dashboard in Portal.

**Expected:**
- Dashboard creation succeeds.
- The creator receives access to the newly created Global Dashboard.
- Other users do not receive access unless explicitly granted.

#### CD-SEC-004 Global Dashboards Remain Read-Only In Portal `P1`

**Scope:** Portal access to Global Dashboards
**Validates rule:** Global Dashboards are always read-only in Portal; all edits must be done in EM.

**Pre-conditions:** A Global Dashboard is visible to a Portal user.

**Steps:**
1. Attempt any supported Portal edit or delete path for the Global Dashboard, including direct action invocation if available _(inferred)_.
2. Reload EM and Portal to verify the dashboard resource state is unchanged.

**Expected:**
- Portal cannot modify or delete the Global Dashboard.
- No dashboard name, binding, description, order, or resource state is changed by the Portal user.

#### CD-SEC-005 Unauthorized Assets Cannot Be Bound To Dashboards `P2`

**Scope:** Dashboard binding from EM and Portal with `security=true`
**Validates rule:** Dashboard binding must not allow a user to persist a reference to an asset they are not authorized to use.

**Pre-conditions:** `security=true`; one allowed asset and one denied asset exist for a representative actor.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Actor binds to an allowed dashboard asset | Save succeeds; dashboard opens the selected asset. |
| Actor attempts to bind to a denied dashboard asset | Save is rejected or the denied asset is unavailable; no unauthorized binding is persisted. |

#### CD-SEC-006 Site Admin Org Filter Creates Dashboard In Target Org `P1`

**Scope:** EM Global Dashboard creation with Org filter active
**Validates rule:** Dashboard resource and access permission created via Org filter must belong to the target org, not Host-Org. _(Bug #69387)_

**Pre-conditions:** Multi-tenancy enabled. Site Admin can switch to a target org. The target org has an Org Admin and at least one dashboard asset for binding.

**Steps:**
1. As Site Admin with Org filter set to the target org, create a Global Dashboard.
2. Verify the dashboard resource owner and access permission owner belong to the target org context.
3. **Sync check:** As target Org Admin, verify the created dashboard is visible and manageable.

**Expected:**
- Resource ownership is assigned to the target org context.
- Access permission is assigned to the target org admin.
- Host-Org does not receive resource ownership or access by mistake.

#### CD-SEC-007 Org Admin And Internal User Creation Uses Current User As Owner `P1`

**Scope:** EM Global Dashboard creation inside a tenant org
**Validates rule:** When an Org Admin or internal user creates a dashboard, the owner is the currently logged-in user and the resource is stored in that user's org.

**Pre-conditions:** Multi-tenancy enabled. An Org Admin and a permitted internal user exist in the same tenant org.

| Condition / Action | Expected Result |
|--------------------|-----------------|
| Org Admin creates a Global Dashboard | Dashboard owner is the logged-in Org Admin; resource stored in that org. |
| Internal user with required permissions creates a Global Dashboard | Dashboard owner is the logged-in internal user; resource stored in that org. |
| Site Admin views the same org through Org filter | Dashboard appears under the selected org, not Host-Org. |

#### CD-SEC-008 User Dashboard Storage And Three-Side Sync Are Tenant-Scoped `P1`

**Scope:** User Dashboards across Site Admin EM, Org Admin EM, and user Portal
**Validates rule:** In multitenant mode, User Dashboard storage is org-scoped and changes must sync across all three management surfaces without leaking across orgs.

**Pre-conditions:** Multi-tenancy enabled. A tenant user has a User Dashboard. Site Admin, Org Admin, and the user can each access their respective views.

**Steps:**
1. Create or edit a User Dashboard as the tenant user in Portal.
2. **Sync check:** Verify the same name, description, binding, and order in Org Admin EM and in Site Admin EM with Org filter set to the tenant org.
3. Edit the User Dashboard from an EM management surface and verify Portal reflects the change.

**Expected:**
- User Dashboard storage is scoped to the owning org.
- All three management surfaces show the same persisted state.
- No dashboard state leaks into another org.

#### CD-SEC-009 Clone Org Copies Resources But Not User Enable State `P2`

**Scope:** Clone Org and dashboard Enable state
**Validates rule:** Dashboard resources are cloned but per-user Enable state is not; cloned-org Enable state is independently managed and must sync with Site Admin's Org filter view. _(Bug #69347, depends on Bug #69387)_

**Pre-conditions:** Source org has dashboard resources and configured Enable state.

**Steps:**
1. Clone the source org.
2. As the cloned org's Org Admin, verify dashboard resources exist and configure their Enable state.
3. **Sync check:** As Site Admin with Org filter set to the cloned org, verify the same Enable state.

**Expected:**
- Dashboard resources are present in the cloned org.
- Per-user Enable state is not blindly copied from the source org.
- Cloned Org Admin and Site Admin Org filter views remain synchronized.

#### CD-SEC-010 Site Admin Can Edit Other Org User Dashboard Via Org Filter `P1`

**Scope:** Site Admin EM with Org filter and User Dashboard binding
**Validates rule:** Host-Org via Org filter can read and write other orgs' User Portal Dashboards when binding global-scope assets.

**Pre-conditions:** Target org has a User Dashboard and an eligible global-scope asset.

**Steps:**
1. As Site Admin with Org filter set to the target org, edit the target user's User Dashboard binding to a global-scope asset.
2. **Sync check:** As the target user, verify the User Dashboard opens the new binding.

**Expected:**
- Site Admin can update the target org User Dashboard through Org filter.
- The update is limited to the selected target org and target user.

---

## Edge Cases

#### CD-EDGE-001 Private Asset Binding Restriction Is Enforced `P2`

**Scope:** EM edit binding panel for User Dashboards
**Validates rule:** EM shows only the currently logged-in user's private assets; other users' edit panels show an empty bound dashboard to prevent assigning private assets you don't own. _(Bug #69468)_

**Pre-conditions:** A user owns a private dashboard asset and has a User Dashboard bound to it. Another authorized EM actor can open the user's dashboard resource.

**Steps:**
1. As the owner, bind the User Dashboard to the owner's private dashboard.
2. Open the same User Dashboard edit binding panel as another authorized EM actor.
3. Repeat in the cross-org case where applicable.

**Expected:**
- The owner can resolve the private bound asset.
- Other actors do not see or bind the owner's private asset.
- Cross-org behavior follows the same private asset restriction.

#### CD-EDGE-002 Security Switch False To True Resets Public Visibility `P2`

**Scope:** Global Dashboard visibility after security mode change
**Validates rule:** After switching to `security=true`, Portal visibility requires explicit permission grants and no longer follows EM-side Enable alone.

**Pre-conditions:** `security=false`; enabled Global Dashboards are visible in Portal.

**Steps:**
1. Switch `security` to `true`.
2. As a representative regular user, verify dashboards are not visible by default and the default permission state denies access.
3. Grant ACCESS to one dashboard and verify the same user sees only the granted dashboard.

**Expected:**
- User no longer sees dashboards by default after switching to `security=true`.
- Default permission state denies access.
- After ACCESS is granted, the user sees only the granted dashboard.

#### CD-EDGE-003 Security Switch True To False Uses EM Enable State `P2`

**Scope:** Global Dashboard visibility after security mode change
**Validates rule:** After switching to `security=false`, EM-side `Enable` controls Portal availability; Portal Arrange Enable remains portal-scoped and does not affect EM-side Enable.

**Pre-conditions:** `security=true`; a user can see dashboards because access was granted.

**Steps:**
1. Switch `security` to `false` and verify dashboards with EM-side `Enable=true` are available in Portal.
2. Disable one dashboard from Portal Arrange and verify EM-side `Enable` remains unchanged.
3. Disable one dashboard from EM-side `Enable`.
4. **Sync check:** Verify that dashboard is no longer available in Portal or EM Arrange.

**Expected:**
- Portal availability follows EM-side `Enable` after switching to `security=false`.
- Portal Arrange Enable does not overwrite EM-side Enable.
- EM-side disable removes the dashboard from Portal availability.

#### CD-EDGE-004 Missing Bound Asset Fails With A Clear Error `P2`

**Scope:** Portal opening a dashboard whose bound asset no longer exists
**Validates rule:** A dashboard with a missing bound asset must fail clearly without corrupting other dashboard state.

**Pre-conditions:** A Portal dashboard exists and is bound to a viewsheet dashboard asset.

**Steps:**
1. Remove or rename the bound asset so the dashboard binding points to a missing asset.
2. Open the affected dashboard from Portal.
3. Open a different dashboard afterward.

**Expected:**
- Error dialog is shown: `sheet not found`.
- The affected dashboard does not open stale or incorrect content.
- Other dashboards remain usable.

---

## Uncovered Rules

Dashboard toolbar actions (previous/next page, edit, refresh, email, schedule, print, snapshot, zoom, bookmarks, full screen) are intentionally not generated as P1/P2. The source only states they must "work correctly" without defining module-specific business state assertions. Cover specific outcomes in the relevant modules when those actions create or mutate state.

## Clarification Needed

| Item | Reason |
|------|--------|
| Cross-scope dashboard binding marker | Source marks same-scope and different-scope binding cases with `*` but does not define what the marker means for persisted state or expected behavior. |

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|--------------|---------------------|
| Content-Repository | Dashboards are repository resources; visibility depends on repository ADMIN/READ permission hierarchy. | Cover node-level permission inheritance and filtering in Content-Repository tests. |
| Security | Dashboard visibility and binding depend on Security grants; full user/role/group and ACCESS/ADMIN matrix is not covered here. | Cover exhaustive permission matrix in Security module tests. |
| Multi-Tenancy | Org filter, tenant storage, clone behavior, and permission ownership are required setup for CD-SEC-006 to CD-SEC-010. | Run org creation, clone, and org-switching coverage before these scenarios. |
| Composer | Portal compose flow can create assets bound by User Dashboards. | Verify compose-created assets in Composer tests; only persisted binding coverage needed here. |
| Scheduler | Dashboard toolbar Schedule action belongs to scheduler workflows. | Verify created schedule tasks in Scheduler module tests. |
| Mail / Export | Email, print, and snapshot toolbar actions depend on environment services. | Cover stateful outcomes in those modules or service-specific tests. |
