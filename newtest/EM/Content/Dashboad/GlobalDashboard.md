---
module: Content-Dashboard / Global Dashboard (EM)
last-updated: 2026-04-27
related: Content-Repository, Security, Multi-Tenancy
---

> **See also:** [Content-Dashboard-Overview.md](Content-Dashboard-Overview.md) for global rules and business context.

## Pre-conditions & Environment

- Access path: `EM → Content → Repository → Portal Dashboard`
- Default login: Site Admin or Org Admin
- Tests split by `security=false` / `security=true` — pre-condition stated per section
- Multi-Tenancy tests require Org filter to be active (Site Admin switching org)

---

## 1. Creation Paths

Three ways to create a Global Dashboard in EM:

1. Site Admin on EM side for Host-Org
2. Site Admin via Org filter for another org
3. Org Admin (or user with both EM permission and Portal Dashboard Tab permission) for their own org

---

## 2. Clone Org — Dashboard State

**Business Rule:** Dashboard resources are cloned when cloning an org, but the Enable state is **not** cloned. The cloned org's Enable state is independently controlled by its Org Admin and must stay in sync with Site Admin's view of that org.

| Condition | Expected Result |
|-----------|-----------------|
| Clone org with existing dashboard resources | Dashboard resources appear in cloned org |
| Check Enable state in cloned org | Enable state is **not** carried over; Org Admin controls it independently |
| Org Admin configures Enable → Site Admin views same org via Org filter | States remain in sync |

> **Bug #69387** — Dashboard created by Site Admin after switching org: resource and access permission should belong to the target org's admin, not Host-Org.

> **Bug #69347** — Clone org: user Enable default state behavior. *(Verify after Bug #69387 is fixed.)*

---

## 3. UI

### 3.1 Tree Load

#### 3.1.1 Common Cases

| Condition | Expected Result |
|-----------|-----------------|
| Default state (example config loaded) | All example dashboards loaded under `Dashboard` node; check name and icon |
| No global dashboard exists | No items under `Dashboard` node |
| No user dashboard exists | `User Dashboard` node not shown in repository tree |
| User dashboard exists | Shown under `User Dashboard/{username}` folder |
| `security=false` with user dashboard | Shown under `User Dashboard/anonymous` |
| Too many dashboards | Vertical scrollbar appears |
| Long dashboard name | Horizontal scrollbar appears |

#### 3.1.2 Permission-Based Load

**Pre-conditions:** `security=true`

> **Note:** To see dashboards in EM, users also need ADMIN permission on both `EM/Repository` and `Dashboards` nodes.

| Condition | Expected Result |
|-----------|-----------------|
| user / role / group has ADMIN permission on the dashboard | Dashboard visible on EM side |
| user / role / group has no ADMIN permission | Dashboard not visible on EM side |
| User has admin permission on themselves | Can see their own user dashboard on EM side |
| User has no admin permission on themselves | Cannot see their own user dashboard on EM side |

### 3.2 Setting Pane

**Pre-conditions:** A dashboard node is selected in the repository tree

| Field | `security=false` | `security=true` |
|-------|-----------------|-----------------|
| Dashboard column | Shows all enabled dashboards | Shows only dashboards the user has permission on |
| Arrange column (up/down icons) | First item: up icon disabled; Last item: down icon disabled | Same |
| Name | Dashboard name displayed | Same |
| Description | Empty and enabled; shows tooltip | Same |
| Select Dashboard combobox | Shows selected dashboard, enabled | Same |
| Enable option | Enabled and checked on | Disabled (permission-based via Security tab) |

---

## 4. Actions

### 4.1 New Dashboard (Global Only)

> **Scope:** Only Global Dashboards can be created on the EM side. User Dashboards cannot be created via EM.

- **Trigger:** Select the `Dashboard` node in the repository tree → click `New Dashboard` from the dropdown menu.
- **Check:** A new dashboard named `Dashboard{index}` appears on the repository tree and opens automatically in the Settings pane.

#### 4.1.1 New Dashboard Dialog

**Pre-conditions:** New Dashboard dialog is open

_Initial load:_
- Name defaults to `Dashboard{index}`; Description and Select Dashboard are empty and enabled
- Apply button disabled; Reset button enabled

_Name validation:_

| Input | Expected Result |
|-------|-----------------|
| Valid chars: `0–9`, `a–z`, `A–Z`, Chinese characters | Accepted |
| Valid chars: `A@$&-+_` | Accepted |
| Empty / null | Warning: `The dashboard name can not be empty!` |
| Special chars: `` ~`!#%^*()=[]\{}|;':"<>?,./ `` | Warning: `Name cannot have special characters.` |
| Duplicate name | Warning: `Duplicate Name` |

_Description:_ Any character accepted. Tooltip is shown on Portal side.

_Select Dashboard:_

| Condition | Expected Result |
|-----------|-----------------|
| Load | Shows `None` + all dashboards and folders (containing a dashboard) the user has permission on |
| `My Reports` folder | Not shown in the list |
| Too many items | Vertical scrollbar |
| Long item name | Horizontal scrollbar |
| Expand / collapse folders | Works correctly |
| `None` selected (no dashboard chosen) | Warning: `Please specify a viewsheet name for the dashboard.` |
| Select dashboard in root path | Can be selected |
| Select dashboard in a folder | Can be selected |

_Enable option and permissions:_

| Condition | Expected Result |
|-----------|-----------------|
| `security=false` | `Enable` option checked on by default |
| `security=true` | Current logged-in user automatically receives access permission on the new dashboard |

_Buttons:_

| Button | Expected Result |
|--------|-----------------|
| Reset | Clears the selected dashboard |
| Apply | Dashboard creation completed |

---

### 4.2 Edit Dashboard (Global and User)

**Pre-conditions:** A dashboard is selected; Edit triggered from the Settings pane

> **Note:** Edit function must be verified for both Global Dashboards and User Dashboards.

| Field / Action | Expected Result |
|----------------|-----------------|
| Name — change to new name | Rename succeeds |
| | **Sync check:** Verify name updated on both EM side and Portal side |
| Description — input any character | Update succeeds; tooltip updated |
| | **Sync check:** Verify tooltip changed on both EM side and Portal side |
| Select Dashboard — load | Shows current selected dashboard (highlighted); shows user folder and user dashboards when editing a User Dashboard |
| Change to another global dashboard (for Global Dashboard) | Dashboard changed correctly |
| Change to dashboard in different scope (global ↔ user) | Dashboard changed correctly `*` |
| Change to dashboard in same scope | Dashboard changed correctly `*` |

`*` _Marker present in source Excel; meaning unspecified. Verify behavior on both EM and Portal sides._

---

### 4.3 Change Dashboard Visibility (Global Only)

> **Scope:** Setting visibility and permissions is only supported on Global Dashboards, not User Dashboards.

> **Note:** EM-side `Enable` controls whether the dashboard is available on Portal. Arrange Dashboards dialog `Enable` controls whether it appears on the Dashboard tab.

**`security=false`:**

| Action | Expected Result |
|--------|-----------------|
| Check on `Enabled` | Dashboard appears in Portal's Arrange Dashboards dialog AND on the Dashboard tab by default |
| Check off `Enabled` | Dashboard not shown on Portal side; not shown on EM Arrange page |

**`security=true`:**

| Grant ACCESS permission to | Expected Result |
|---------------------------|-----------------|
| A specific user | That user sees dashboard on Portal and in Arrange Dashboards dialog |
| A group | All group members see dashboard on Portal and in Arrange Dashboards dialog |
| A role | All role members see dashboard on Portal and in Arrange Dashboards dialog |

---

### 4.4 Arrange Dashboard (Global Only)

> **Scope:** Only Global Dashboards can be arranged via EM. User Dashboards cannot be arranged here.

**Pre-conditions:** `Dashboards` node Property tab is open

_Load states (based on Enable status and permissions):_

| Condition | Expected Result |
|-----------|-----------------|
| All dashboards have `Enable=false` (or user has no permission on any) | No dashboards shown on Property tab |
| 1 dashboard with `Enable=true` | 1 dashboard loaded; both up and down icons disabled |
| 2 dashboards with `Enable=true` | 2 loaded; up icon disabled on first, down icon disabled on last |
| 3+ dashboards with `Enable=true` | 3+ loaded; up disabled on first, down disabled on last, both enabled on middle items |

_Change order:_

| Action | Expected Result |
|--------|-----------------|
| Drag to reorder dashboard | Dashboard order updated on Portal AND on repository tree and EM Arrange page |

---

### 4.5 Delete Dashboard (Global and User)

**Pre-conditions:** A dashboard is selected; Delete icon clicked → confirm dialog appears

| Confirm Action | Expected Result |
|----------------|-----------------|
| Click OK | Dashboard removed from EM repository tree and Portal |
| | Dashboard removed from Arrange page *(skip this check for User Dashboards)* |
| Click Cancel | Dashboard not deleted; Arrange page order unchanged |

---

### 4.6 Security Switch — Basic Behavior

> **Low priority:** Frequent security on/off switching is not a typical use case. Only verify basic behavior.

#### TestCase 1 — Switch security=false → true

**Pre-conditions:** Dashboards exist and are enabled; `security=false`

1. Switch security to `true`.
2. **Assert:** No dashboards shown on Portal side.
3. **Assert:** Default permission on Security tab for all dashboards is `Deny access to all users`.
4. Grant ACCESS permission to a user on some dashboards.
5. **Assert:** That user can see those dashboards on Portal side.

#### TestCase 2 — Switch security=true → false

**Pre-conditions:** Dashboards exist and are visible on Portal; `security=true`

1. Switch security to `false`.
2. **Assert:** Dashboards with `Enable=true` on EM side are shown on Portal.
3. In Portal's Arrange Dashboards dialog, check off `Enable` on one dashboard.
4. **Assert:** That dashboard is hidden on Portal side.
5. **Assert:** EM-side `Enable` option for that dashboard is still `true` (portal Arrange does not affect EM Enable).
6. On EM side, check off `Enable` on one dashboard.
7. **Assert:** That dashboard is no longer shown on Arrange page or Portal side.

---

## Bug Summary

| Bug | Description |
|-----|-------------|
| #69387 | Site Admin switching org via Org filter — dashboard resource/access assigned to wrong org |
| #69347 | Clone org — user Enable default state behavior (depends on #69387) |
