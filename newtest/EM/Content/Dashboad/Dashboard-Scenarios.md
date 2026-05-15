---
module: Dashboard Deployment (EM + Portal)
source: Content-Dashboard.xlsx
Excel-path: direct
last-updated: 2026-05-09
---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | 18 |
| Kept P1 | 12 |
| Kept P2 | 6 |
| Needs clarification | 1 |

---

## Feature Summary

This feature enables administrators and users to create, manage, and deploy dashboards in a BI portal. Two dashboard types exist: **Global Dashboard** (managed in EM by org admins, read‑only in Portal) and **User Dashboard** (created/edited by end users in Portal, also editable by admins in EM). The system supports two security modes (`security=true` enforces permission checks; `security=false` makes all dashboards visible) and a multi‑tenant architecture where dashboards are isolated by organization.

---

## Manual Testing Summary

> Manual test execution guide. For detailed scenarios, see the Scenarios section below. This section provides direction and key focus areas only.

### Core Rules (One Sentence to Understand)
- **Global Dashboard** = Created by admin in EM, read‑only on Portal
- **User Dashboard** = Created by user on Portal, editable on both Portal and EM
- **security=true** → Portal visibility controlled by ACCESS permissions
- **security=false** → Portal visibility controlled by `Enable` checkbox

### Testing Priorities (By Priority)

| Priority | Test Direction | Key Verification Points |
|----------|----------------|--------------------------|
| P1 | Full CRUD | After create/edit/delete/arrange, EM + Portal stay in sync |
| P1 | Cross‑end sync | EM change → Portal updates; Portal change → EM updates |
| P1 (Multi‑tenant) | Organization isolation | Dashboard created by site admin for OrgB can only be managed by OrgB |
| P2 | Environment differences (security=false) | User Dashboard stored under `anonymous` folder; `Enable` directly controls visibility |

### Common Problem Areas (Pay extra attention when testing)

1. **After Clone Organization**: dashboard resources are cloned, but `Enable` state **should NOT be cloned** (Bug #69347)
2. **Private Viewsheet across users**: When a User Dashboard binds a private VS, other admins cannot see that VS in EM (Bug #69468)
3. **Arrangement sync**: Changing order in EM Arrange panel → Portal must update immediately, survive refresh
4. **`Enable` semantics confusion**: The `Enable` checkbox in Portal Arrange only controls Portal display, does NOT change the EM `Enable` value

### Required Cross‑Module Tests

| Related Module | Test Scenario | Minimum Test Cases |
|----------------|---------------|---------------------|
| Security / Permissions | When security=true, grant/deny ACCESS on Global Dashboard | 2 |
| Organization / Clone Org | After cloning an org, verify Enable state resets to false | 1 (wait for bug fix) |
| Org Filter | Site admin creates/edits dashboard after switching org filter | 2 |
| Viewsheet | User Dashboard binds global VS + private VS (both types) | 2 |

---

## Environment Differences

| Behavior | security=false | security=true | multi‑tenant |
|----------|----------------|---------------|---------------|
| Dashboard visibility | ‘Enabled’ checkbox controls Portal display | ACCESS permission on dashboard controls Portal display | Org admin controls visibility within own org |
| Storage location (User Dashboard) | Under ‘User Dashboard/anonymous’ | Under ‘User Dashboard/<username>’ (host‑org or org‑specific folder) | Under each org’s user folder |
| ‘Enable’ checkbox in EM | Editable, directly controls Portal visibility | Disabled – visibility managed via Security tab | Same as security=true within the org |
| Default after clone (Global Dashboard) | N/A | N/A | Dashboard **resource** cloned, **Enable state** not cloned (org admin must re‑enable) |

---

## Scenario Overview

### Env: security=true (完整 CRUD + 差异验证)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC‑001 | P1 | Create Global Dashboard with valid vs | Dashboard created, auto‑opened, name follows ‘Dashboard+N’ |
| TC‑002 | P1 | Edit Global Dashboard name, description, vs | Changes sync bi‑directionally between EM and Portal |
| TC‑003 | P1 | Delete Global Dashboard | Resource removed from EM tree, Portal tab, and Arrange dialog |
| TC‑004 | P1 | Reorder Global Dashboards | Order changed in EM Arrange pane → order changed on Portal tab |
| TC‑005 | P1 | User Dashboard – full CRUD from Portal | Dashboard appears under correct user folder, editable in EM, deletable |
| TC‑006 | P1 | Edit User Dashboard vs across scopes | Switching between global vs and same‑scope vs works, syncs correctly |
| TC‑007 | P1 | Arrange User Dashboard visibility | Disabling dashboard in Portal hides it; EM ‘Enable’ unchanged (when security=false) |

### Env: security=false (仅差异验证)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC‑008 | P2 | Default storage location when security=false | User Dashboard stored under ‘anonymous’ folder |
| TC‑009 | P2 | ‘Enabled’ checkbox controls Portal visibility | Unchecking ‘Enabled’ hides dashboard from Portal; checking shows it |

### Env: multi-tenant (完整 CRUD)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC‑010 | P1 | Site admin creates Global Dashboard for another org | Dashboard owned by target org admin (Bug #69387) |
| TC‑011 | P1 | Org admin edits own Global Dashboard | Changes apply within org, not visible to other orgs |
| TC‑012 | P1 | User Dashboard stored in correct org folder | Dashboard saved under org’s user folder, visible only within that org |

---

## Scenarios

### Env: security=true

#### TC‑001 Create Global Dashboard with valid vs `P1` `[env: security=true]` `[CRUD]`

**Scope:** EM → Repository → Portal Dashboard node
**Validates rule:** Global dashboard creation flow; default naming; vs selection required

**Pre‑conditions:** security=true; User logged in with EM permission + Portal Dashboard Tab permission

**Steps:**
1. In EM, select ‘Dashboard’ node under Repository → Portal Dashboard
2. Click ‘New Dashboard’ from dropdown menu
3. Enter valid name (letters/numbers/Chinese/`A@$&-+_`)
4. Select a Viewsheet from the tree (any folder except ‘My Reports’)
5. Click ‘Apply’

**Expected:**
- Dashboard created with name `Dashboard+index` (e.g., Dashboard1)
- Dashboard auto‑opens in EM edit pane
- Created dashboard visible in Repository tree under ‘Dashboard’ node
- Portal shows the dashboard (via Arrange dialog, because ACCESS permission defaults to creator)

#### TC‑002 Edit Global Dashboard name, description, vs `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** EM edit pane + Portal Dashboard tab
**Validates rule:** Changes in EM sync to Portal

**Pre‑conditions:** security=true; Existing Global Dashboard with a vs bound

**Steps:**
1. In EM, select an existing Global Dashboard
2. Change name to a new valid value
3. Change description to any text (including special characters)
4. Change bound vs to a different vs (global scope)
5. Click ‘Apply’
6. **Sync check:** Portal Dashboard tab — dashboard name and description tooltip updated
7. **Sync check:** Portal — dashboard displays new vs content

**Expected:**
- All changes saved without error
- EM tree shows new name
- Portal reflects all three changes immediately (no refresh required)

#### TC‑003 Delete Global Dashboard `P1` `[env: security=true]` `[CRUD]`

**Scope:** EM Delete action + Portal cleanup
**Validates rule:** Deletion removes dashboard from all system locations

**Pre‑conditions:** security=true; Existing Global Dashboard (not the only dashboard)

**Steps:**
1. In EM, select a Global Dashboard
2. Click Delete icon, then confirm ‘OK’
3. **Sync check:** Portal Dashboard tab — dashboard no longer appears in dropdown or Arrange dialog
4. **Sync check:** EM Arrange pane (under Dashboard node) — dashboard removed from list

**Expected:**
- Dashboard disappears from EM Repository tree
- Portal has no reference to deleted dashboard

#### TC‑004 Reorder Global Dashboards `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** EM Arrange pane + Portal Dashboard tab ordering
**Validates rule:** Dashboard order is synchronized and persistent

**Pre‑conditions:** security=true; At least 3 Global Dashboards exist

**Steps:**
1. In EM, select ‘Dashboard’ node → go to Arrange pane
2. Use ‘Up’ / ‘Down’ icons to move middle dashboard to top position
3. Click ‘Apply’
4. **Sync check:** Portal Dashboard tab — dashboard order matches new order
5. **Sync check:** EM Arrange pane — order persists after page refresh

**Expected:**
- Order changed successfully in EM Arrange pane
- Portal dropdown shows same order
- Order survives refresh/re‑login

#### TC‑005 User Dashboard – full CRUD from Portal `P1` `[env: security=true]` `[CRUD]`

**Scope:** Portal Dashboard tab + EM Repository tree
**Validates rule:** User dashboards created in Portal are visible in EM and stored under correct user folder

**Pre‑conditions:** security=true; User logged into Portal with dashboard creation rights

**Steps:**
1. In Portal, go to Dashboard tab → click Configuration icon
2. Select ‘Add’ → enter unique name, select a vs (not ‘Compose Dashboard’)
3. Click ‘OK’
4. **Sync check:** EM → Repository → ‘User Dashboard/<username>’ — dashboard listed
5. In Portal, select the new dashboard → Configuration → ‘Edit’ → change name
6. **Sync check:** EM — dashboard name updated
7. In Portal, select the same dashboard → Configuration → ‘Delete’ → confirm
8. **Sync check:** EM — dashboard removed from user folder

**Expected:**
- Dashboard stored under correct user folder (not ‘anonymous’)
- EM can read and edit the dashboard (name, description, vs)
- Delete from Portal removes it completely from system

#### TC‑006 Edit User Dashboard vs across scopes `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Portal Edit Dashboard dialog + EM view
**Validates rule:** User dashboard can bind both global vs and user‑scope vs; change syncs

**Pre‑conditions:** security=true; Existing User Dashboard; at least one global vs and one user vs available

**Steps:**
1. In Portal, select a User Dashboard → Configuration → ‘Edit’
2. Change bound vs from current vs to a **global vs**
3. Click ‘OK’
4. **Sync check:** EM — dashboard shows new global vs in edit pane
5. Repeat steps 1‑3, changing vs to a **different user‑scope vs** (same user)
6. **Sync check:** Portal — dashboard displays content of the new user vs

**Expected:**
- Both global‑scope and user‑scope vs can be bound
- Changes persist and are visible in both EM and Portal
- No permission errors (user owns both vs types)

#### TC‑007 Arrange User Dashboard visibility `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]` `[env-diff]`

**Scope:** Portal Arrange Dashboards dialog + EM Arrange pane
**Validates rule:** Portal ‘Enable’ toggles affect Portal visibility but not EM’s ‘Enable’ value (when security=false; for security=true, ‘Enable’ is disabled)

**Pre‑conditions:** security=false (as per rule – EM ‘Enable’ is editable); Existing User Dashboard

**Steps:**
1. In Portal, open Arrange Dashboards dialog (Configuration → ‘Arrange’)
2. Locate a User Dashboard, uncheck its ‘Enable’ checkbox
3. Click ‘OK’
4. **Sync check:** Portal Dashboard tab — dashboard no longer visible
5. **Sync check:** EM → select the dashboard — ‘Enable’ checkbox remains **unchanged** (still true)
6. Re‑enable dashboard in Portal Arrange dialog
7. **Sync check:** Portal — dashboard visible again

**Expected:**
- Portal’s ‘Enable’ only controls Portal display; does not modify EM’s ‘Enable’ attribute
- EM Arrange pane still lists the dashboard (disabled dashboards shown in EM Arrange when security=false)

---

### Env: security=false

#### TC‑008 Default storage location for User Dashboard when security=false `P2` `[env: security=false]` `[env-diff]`

**Scope:** EM Repository → User Dashboard node
**Validates rule:** When security=false, user dashboards are stored under ‘anonymous’ folder

**Pre‑conditions:** security=false; User creates a User Dashboard in Portal

**Steps:**
1. In Portal, create a new User Dashboard (valid name, any vs)
2. **Check:** EM → Repository → ‘User Dashboard’ node

**Expected:**
- Dashboard appears under ‘User Dashboard/anonymous’
- Not under a username folder

#### TC‑009 ‘Enabled’ checkbox directly controls Portal visibility when security=false `P2` `[env: security=false]` `[env-diff]`

**Scope:** EM Dashboard edit pane + Portal Dashboard tab
**Validates rule:** When security=false, the ‘Enabled’ checkbox is editable and determines Portal visibility

**Pre‑conditions:** security=false; Existing Global Dashboard with ‘Enabled’ = true

**Steps:**
1. In EM, select a Global Dashboard
2. Uncheck the ‘Enabled’ checkbox, click ‘Apply’
3. **Sync check:** Portal Dashboard tab — dashboard not visible (not in dropdown, not on tab)
4. Back in EM, re‑check ‘Enabled’, click ‘Apply’
5. **Sync check:** Portal — dashboard visible again

**Expected:**
- ‘Enabled’ checkbox is fully editable when security=false
- Portal visibility follows the ‘Enabled’ value exactly
- No permission checks interfere

---

### Env: multi-tenant

#### TC‑010 Site admin creates Global Dashboard for another org `P1` `[env: multi-tenant]` `[Multi-Tenant]` `[CRUD]`

**Scope:** EM with Org filter + target org’s admin view
**Validates rule:** Dashboard resources and access belong to the target org’s administrators (Bug #69387)

**Pre‑conditions:** multi‑tenant environment; Site admin logged in; At least two orgs (OrgA, OrgB)

**Steps:**
1. Site admin uses Org filter to switch to OrgB context
2. In EM, create a new Global Dashboard (valid name, vs)
3. **Check:** Repository shows dashboard under OrgB’s ‘Dashboard’ node
4. Log in as OrgB’s org admin
5. **Check:** EM – the dashboard is visible and editable (name, vs, description)
6. **Sync check:** Portal (logged in as OrgB user) — dashboard appears in Arrange dialog

**Expected:**
- Dashboard owned by OrgB admins, not site admin
- OrgB org admin can fully manage the dashboard
- Cross‑org visibility does not occur (OrgA users cannot see it)

#### TC‑011 Org admin edits own Global Dashboard `P1` `[env: multi-tenant]` `[Multi-Tenant]` `[CRUD]`

**Scope:** Org admin EM edit + Portal within same org
**Validates rule:** Changes made by org admin affect only that org’s Portal

**Pre‑conditions:** multi‑tenant; Org admin logged in for OrgA; Global Dashboard exists in OrgA

**Steps:**
1. Org admin edits dashboard name and bound vs
2. Click ‘Apply’
3. **Sync check:** Portal (OrgA user) — dashboard shows new name and vs
4. **Sync check:** Portal (OrgB user) — dashboard unchanged or not visible (if not permitted)

**Expected:**
- Changes isolated to OrgA
- No leakage of changes to other orgs

#### TC‑012 User Dashboard stored in correct org folder `P1` `[env: multi-tenant]` `[Multi-Tenant]` `[CRUD]`

**Scope:** Portal user in specific org + EM Repository
**Validates rule:** User Dashboard saved under the corresponding org’s user folder

**Pre‑conditions:** multi‑tenant; OrgA user logged into Portal; OrgB user logged in separately

**Steps:**
1. OrgA user creates a User Dashboard in Portal
2. **Check:** EM (OrgA context) → Repository → ‘User Dashboard’ → folder named after OrgA user
3. Log in as OrgB user; create a User Dashboard
4. **Check:** EM (OrgB context) → folder named after OrgB user
5. Verify OrgA user’s dashboard is **not** visible in OrgB’s EM

**Expected:**
- Each org’s user dashboards are stored and isolated under that org’s folder structure
- Cross‑org visibility does not occur

---

## Uncovered Rules

> 以下规则没有对应的 P1/P2 场景覆盖。P3 规则已丢弃。

| Rule ID | Rule Description | Priority | Reason / Suggested Fix |
|---------|------------------|----------|------------------------|
| R‑001 | Clone organization: Global Dashboard resource cloned but Enable state NOT cloned (Bug #69347 requires Bug #69387 fix) | P2 | [NEEDS SCENARIO] After #69387 is fixed, add: site admin enables dashboard → clone org → verify new org’s dashboard has Enable=false |
| R‑002 | User Dashboard with private vs: EM can only see current user’s private assets when editing another user’s dashboard (Bug #69468) | P2 | [NEEDS SCENARIO] UserA creates dashboard with private vs → UserB (org admin) edits in EM → verify UserB sees only their own private vs, not UserA’s |
| R‑003 | When security=true, ‘Enable’ checkbox is disabled in EM | P2 | Covered partially in TC‑007 environment note, but not as explicit standalone verification. Add check in TC‑007 precondition or as separate lightweight check. |

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| “Compose Dashboard” feature | Sheet: User Portal‑Dashboard, rows 63‑74 | Excel references a ‘Compose Dashboard’ checkbox that opens composer. No further detail on what composing a dashboard means (creating a new vs? Combining multiple vs?). Skipped because not enough info. |

---

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security (Permissions) | Global Dashboard visibility depends on ACCESS permission when security=true | Run TC‑001/TC‑004 after assigning specific user/group/role permissions (grant/deny) to verify Portal visibility |
| Organization (Clone Org) | Clone org behavior (Bug #69347, #69387) | After bug fixes, add scenario: site admin enables dashboard in source org → clone org → verify target org dashboard resource exists but Enable=false |
| Multi‑tenancy (Org Filter) | Site admin switching org context | Add cross‑check: site admin creates dashboard in OrgA via Org filter → verify OrgB org admin cannot see or edit it |