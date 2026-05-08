---
module: Dashboard Management (EM + Portal)
source: Content-Dashboard.xlsx
Excel-path: direct
last-updated: 2026-05-08

---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | 27 |
| Kept P1 | 8 |
| Kept P2 | 3 |
| Needs clarification | 1 |

## Feature Summary

The Dashboard feature allows administrators (Site admin/Org admin) and end users to create, organize, and view dashboards that display Viewsheet data. Global Dashboards are managed exclusively in Enterprise Manager (EM), are read-only in the Portal, and require security/permissions for visibility. User Dashboards are created in the Portal, can be edited in both Portal and EM, and have restrictions on binding private assets owned by other users.

## Rules & Notes

### Business Rules
- **Global Dashboard creation:** Only through EM → Content → Repository → Portal Dashboard → New Dashboard
- **User Dashboard creation:** Only through Portal端 (Dashboard tab → Configuration → Add)
- **Global Dashboard editing:** Only in EM; Portal端 has read-only access
- **User Dashboard editing:** Both Portal端 and EM support editing (with cross-end sync)
- **Delete cascade:** Deleting a dashboard removes it from EM Repository tree, Portal Dashboard tab, and Arrange dialog
- **Viewsheet binding restriction:** Cannot bind another user's private Viewsheet to any dashboard (Bug #69468 - by design restriction)
- **Dashboard naming:** Cannot be empty; cannot contain special characters `~`! #%^*()=[]{}|;':"<>?,./` no duplicates allowed

### Security & Multi-Tenancy (if applicable)
- **security=false:** Global dashboards display on Portal by default (Enable checked). User dashboards stored under `User Dashboard/anonymous`.
- **security=true:** Global dashboards require explicit ACCESS permission grants to users/groups/roles. User dashboards stored under respective organization's user folder.
- **multi-tenant:** User dashboards saved under corresponding org's user portal dashboard tab folder. Org admin owns dashboard resources created within their org.

## Scenario Overview

| ID | Priority | Area | Scenario | Key Business Assertion |
|----|----------|------|----------|----------------------|
| TC-001 | P1 | CRUD | Create and publish a Global Dashboard with Viewsheet binding | Global dashboard appears in EM tree, Portal tab, and respects security visibility rules |
| TC-002 | P1 | CRUD | Org admin edits Global Dashboard properties | Name, description, and bound Viewsheet update correctly across EM and Portal |
| TC-003 | P1 | CRUD | Org admin changes Global Dashboard visibility (Enable/Security) | Enable toggles control Portal visibility; Security grants control user-specific access |
| TC-004 | P1 | Cross-Module | Delete Global Dashboard and verify cascading removal | Dashboard removed from EM tree, Portal tab, and Arrange dialog |
| TC-005 | P1 | CRUD | User creates and arranges User Dashboard in Portal | User dashboard appears, can be reordered, renamed, and bound to a Viewsheet |
| TC-006 | P1 | Cross-Module | Sync User Dashboard edits between Portal and EM | Name/Viewsheet changes from Portal reflect in EM, and vice versa |
| TC-007 | P1 | CRUD | Delete User Dashboard from Portal | Dashboard removed from Portal, EM, and Arrange dialog |
| TC-008 | P2 | Cross-Module | User Dashboard binding to private Viewsheet shows restriction in EM | EM shows "Select Viewsheet" as empty when editing another user's dashboard |
| TC-009 | P2 | Bug Regression | Clone organization does NOT copy dashboard Enable state (Bug #69387) | Cloned org receives dashboard resources but Enable=false |
| TC-010 | P2 | Bug Regression | Site admin edits org's dashboard via Org Filter | Changes sync correctly between Site admin view and Org admin view |

## Scenarios

#### TC-001 Create Global Dashboard and verify visibility on Portal `P1` `[CRUD]`

**Scope:** EM (Site admin) → Portal (end user)
**Validates rule:** Global Dashboard creation; security=false visibility baseline

**Pre-conditions:** security=false; Site admin logged into EM

**Steps:**
1. In EM, navigate to Content → Repository → Portal Dashboard node
2. Click "New Dashboard" from dropdown
3. Enter name: "Sales Overview", description: "Quarterly sales metrics"
4. Select a Viewsheet from the tree (root path or folder containing a Viewsheet)
5. Click Apply
6. Login to Portal as any user
7. Navigate to Dashboard tab

**Expected:**
- EM: "Sales Overview" appears under Dashboard node in Repository tree
- Portal: "Sales Overview" appears on Dashboard tab by default (since security=false)
- Clicking the dashboard displays the bound Viewsheet content

---

#### TC-002 Org admin edits Global Dashboard properties `P1` `[CRUD]`

**Scope:** EM (Org admin)
**Validates rule:** Global Dashboard editing; cross-end sync

**Pre-conditions:** Global Dashboard "Sales Overview" exists (from TC-001); Org admin logged into EM; security=false

**Steps:**
1. In EM, select "Sales Overview" dashboard
2. Change name to "Sales Quarterly Report"
3. Change description to "Updated Q3-Q4 metrics"
4. Change bound Viewsheet to a different global Viewsheet
5. Click Apply
6. Refresh Portal Dashboard tab

**Expected:**
- EM: Dashboard name and description updated in Repository tree
- EM: Selected Viewsheet highlight reflects new binding
- Portal: Dashboard displays new name, description appears as tooltip, new Viewsheet content loads

---

#### TC-003 Org admin changes Global Dashboard visibility (Enable/Security) `P1` `[CRUD]`

**Scope:** EM → Portal
**Validates rule:** Enable controls Portal visibility; Security grants control access

**Pre-conditions:** Global Dashboard exists; Site admin logged into EM

**Steps:**
1. Set security=false, uncheck Enable on a dashboard → Apply
2. Login to Portal → Verify dashboard not shown on Dashboard tab
3. Return to EM, re-check Enable → Apply
4. Refresh Portal → Dashboard appears again
5. Switch security=true
6. Grant ACCESS permission to a specific user on the dashboard via Security tab
7. Login as that user → Verify dashboard visible on Portal tab
8. Login as a different user (no permission) → Verify dashboard not visible

**Expected:**
- Portal visibility toggles with Enable (security=false)
- With security=true, only users with explicit ACCESS permission see the dashboard

---

#### TC-004 Delete Global Dashboard and verify cascade `P1` `[Cross-Module]`

**Scope:** EM → Portal
**Validates rule:** Delete cascade (EM tree + Portal tab + Arrange dialog)

**Pre-conditions:** Global Dashboard "Test Delete" exists; security=false

**Steps:**
1. In EM, select dashboard from Repository tree
2. Click Delete icon, confirm OK
3. Check EM Repository tree
4. Login to Portal, check Dashboard tab
5. (If security=false) Check Arrange Dashboards dialog

**Expected:**
- EM: Dashboard removed from Repository tree
- Portal: Dashboard not visible on Dashboard tab
- Arrange dialog: Dashboard not present in list

---

#### TC-005 User creates and arranges User Dashboard in Portal `P1` `[CRUD]`

**Scope:** Portal (end user)
**Validates rule:** User Dashboard creation, arrangement, editing

**Pre-conditions:** User logged into Portal; at least one Viewsheet exists (user or global scope)

**Steps:**
1. Go to Dashboard tab, click Configuration gear icon
2. Select Add
3. Enter name: "My Pipeline", description optional
4. Select a Viewsheet from Select Viewsheet pane
5. Click OK → New dashboard appears on Dashboard tab
6. Select Arrange from Configuration menu
7. Use up/down arrows to change dashboard order, uncheck Enable on one dashboard
8. Click OK
9. Verify Dashboard tab order and visibility
10. Select Edit on user dashboard → Change name to "My Sales Pipeline", change to different Viewsheet → OK

**Expected:**
- New dashboard appears and loads correct Viewsheet
- Arrange changes apply: order matches, disabled dashboards hidden
- Edit persists name and Viewsheet change

---

#### TC-006 Sync User Dashboard edits between Portal and EM `P1` `[Cross-Module]`

**Scope:** Portal + EM
**Validates rule:** User Dashboard supports editing in both ends with synchronization

**Pre-conditions:** User Dashboard "My Pipeline" exists (from TC-005); User has EM access with Portal Dashboard Tab permission

**Steps:**
1. In Portal, edit dashboard name to "Updated Pipeline", change Viewsheet to a different user-scope Viewsheet → OK
2. Login to EM as same user, navigate to Repository → User Dashboard → username folder
3. Verify dashboard name and bound Viewsheet updated
4. In EM, edit dashboard description, change Viewsheet back to original
5. Refresh Portal Dashboard tab
6. Verify description appears as tooltip and correct Viewsheet loads

**Expected:**
- Portal edit syncs to EM Repository tree
- EM edit syncs back to Portal
- Bound Viewsheet persists correctly across both ends

---

#### TC-007 Delete User Dashboard from Portal `P1` `[CRUD]`

**Scope:** Portal
**Validates rule:** Delete cascade (Portal + EM + Arrange)

**Pre-conditions:** User Dashboard "To Delete" exists

**Steps:**
1. On Dashboard tab, select the user dashboard
2. Click Configuration → Delete
3. Confirm OK in dialog
4. Check Dashboard tab for remaining dashboards (first dashboard auto-selected)
5. Login to EM, check Repository → User Dashboard → username folder
6. Check Arrange dialog (if applicable)

**Expected:**
- Dashboard removed from Portal tab
- Dashboard absent from EM Repository tree
- Arrange dialog no longer lists the dashboard

---

#### TC-008 User Dashboard binding to private Viewsheet shows restriction in EM `P2` `[Cross-Module]`

**Scope:** Portal + EM
**Validates rule:** Cannot bind another user's private Viewsheet to any dashboard (Bug #69468 - by design)

**Pre-conditions:** Two users: UserA and UserB; UserA has private Viewsheet "My Private VS"

**Steps:**
1. Login as UserA in Portal, create dashboard bound to "My Private VS"
2. Login as UserB in EM (with permissions to see UserA's dashboard in Repository)
3. Navigate to User Dashboard → UserA folder → select UserA's dashboard
4. Check Select Viewsheet pane in Edit mode

**Expected:**
- Select Viewsheet pane shows no Viewsheet selected
- Pane does not show "My Private VS" for selection
- Previous binding preserved (cannot be changed to another user's private asset)

> **Bug #69468** — By design restriction: "You cannot see assign private viewsheets that you do not own to dashboards."

---

#### TC-009 Clone organization does NOT copy dashboard Enable state `P2` `[Multi-Tenant]`

**Scope:** EM (Site admin)
**Validates rule:** Clone organization copies dashboard resources but not Enable status; Org admin sets Enable independently (Bug #69387)

**Pre-conditions:** security=false; Site admin logged in; Source org has a Global Dashboard with Enable=true

**Steps:**
1. In EM, clone source organization to new target organization
2. Switch Org Filter to target organization
3. Check EM Repository → Dashboard node: dashboard resource exists
4. Check Portal Dashboard tab for target org user

**Expected:**
- Dashboard resource present in target org's EM Repository
- Dashboard Enable=false by default (not visible on Portal)
- Org admin can manually set Enable=true later

> **Bug #69387** — Clone should copy resource but Enable state is managed by Org admin

---

#### TC-010 Site admin edits org's dashboard via Org Filter `P2` `[Multi-Tenant]`

**Scope:** EM (Site admin + Org admin)
**Validates rule:** Site admin editing another org's dashboard via Org Filter syncs with Org admin view

**Pre-conditions:** Multi-tenant environment; Org admin for OrgA; Site admin; Global Dashboard exists in OrgA

**Steps:**
1. Site admin uses Org Filter to switch to OrgA
2. Edit dashboard name to "Sales Dashboard (OrgA)"
3. Apply changes
4. Org admin logs into EM under OrgA
5. Check dashboard name

**Expected:**
- Org admin sees dashboard name "Sales Dashboard (OrgA)"
- Both views remain synchronized

---

## Uncovered Rules

| Rule ID | Rule Description | Priority | Reason / Suggested Fix |
|---------|------------------|----------|------------------------|
| R-002 | User Dashboard with Compose Dashboard option opens Composer on create/edit | P3 | Discarded as compose behavior belongs to Composer module, not Dashboard module |
| R-003 | Arrange dashboard order affects both EM Arrange page and Portal display | P1 | **COVERED by TC-005** (arrange order verification) |
| R-005 | Switching security=false→true causes no dashboards on Portal until ACCESS granted | P2 | Not covered as security switching is explicitly marked "not very useful" in source |

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| "Change vs" in Global Dashboard properties | Global Dashboard sheet, row "Change vs" | Unclear what "vs" refers to — likely "Viewsheet" (typo). Assuming Viewsheet binding throughout. |

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Permission grants (ACCESS) control Global Dashboard visibility when security=true | Run Global Dashboard visibility scenarios after Security module tests |
| Composer | Compose Dashboard option opens Composer for ad-hoc dashboard creation | Not covered by Dashboard scenarios — belongs to Composer module |
| Viewsheet | Dashboard binds to Viewsheet; deletion/rename of Viewsheet impacts dashboard | Add Viewsheet dependency scenarios (dashboard shows error when bound Viewsheet deleted) |