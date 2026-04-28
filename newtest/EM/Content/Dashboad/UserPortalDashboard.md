---
module: Content-Dashboard / User Portal-Dashboard
last-updated: 2026-04-27
related: Content-Repository, Security, Multi-Tenancy
---

> **See also:** [Content-Dashboard-Overview.md](Content-Dashboard-Overview.md) for global rules and business context.

## Pre-conditions & Environment

- Access path: Portal → Dashboard tab
- Tests cover User Dashboards created from the Portal side
- Bound dashboard scope matters: global-scope vs user-scope dashboards behave differently in selection dialogs
- Multi-Tenancy: user dashboard stored per-org; changes must sync across Site Admin EM / Org Admin EM / user Portal (3 sides)

---

## Part 1: Business Rules

**Business Rule:**
1. Host-Org via Org filter can read and write other orgs' user portal dashboards when binding global-scope assets.
2. In multitenant mode, user dashboards are stored in the corresponding org's user portal dashboard tab user folder.
3. Changes to a user dashboard must stay in sync across: Site Admin EM view, Org Admin EM view, and the user's Portal view.
4. When a user dashboard is bound to a private asset, EM can only display the **currently logged-in user's** private assets. Other users' edit panels will show an empty bound dashboard.

> **Bug #69468** — Cross-org case: user dashboard bound to a private dashboard follows the same private asset restriction. The restriction exists to prevent assigning private assets you don't own to another user's dashboard, even if you have content repository read permission.

---

## 1. UI — Dashboard Tab States

**Pre-conditions:** User is on the Portal Dashboard tab

| Condition | Expected Result |
|-----------|-----------------|
| No dashboard visible | Shows `Portal Dashboards` link and `Repository` link; Dashboard Configuration icon enabled; `Add` and `Arrange` enabled; `Edit` and `Delete` disabled |
| Has visible dashboards | All visible dashboards shown; first dashboard highlighted and selected by default; Dashboard Configuration icon enabled |
| Global Dashboard selected | `Add` and `Arrange` enabled; `Edit` and `Delete` disabled |
| User Dashboard selected | `Add`, `Edit`, `Delete`, `Arrange` all enabled; check icon shown before each menu item |
| Too many dashboards to display inline | Shows `…` link; clicking `…` reveals all dashboards in a dropdown |
| Click a different dashboard | That dashboard opens and becomes highlighted |

---

## 2. Actions

### 2.1 Add Dashboard

- **Trigger:** Select `Add` from the Dashboard Configuration menu.
- **Check:** `New Dashboard` dialog opens.

#### 2.1.1 New Dashboard Dialog

**Pre-conditions:** New Dashboard dialog is open

_Initial load:_
- Name field: enabled, empty; shows warning `Please enter a name`
- Description field: enabled, empty
- Select Dashboard pane: loads `My Reports` folder + all dashboards and folders containing a dashboard
- Compose Dashboard checkbox: enabled, unchecked by default

_Name validation:_

| Input | Expected Result |
|-------|-----------------|
| Valid: `0–9`, `a–z`, `A–Z`, Chinese, `A@$&-+_` | Accepted |
| Empty / null | Warning: `Please enter a name`; OK button disabled |
| Special chars: `` ~`!#%^*()=[]\{}|;':"<>?,./ `` | Warning: `Name is not allowed to contain special characters` |
| Duplicate name | Error dialog on OK click: `The dashboard name is a duplicate!` |

_Description:_ Any character accepted.

_Select Dashboard:_

| Condition | Expected Result |
|-----------|-----------------|
| Too many dashboards | Vertical scrollbar on Select Dashboard pane |
| Long dashboard name | Horizontal scrollbar on Select Dashboard pane |
| Expand / collapse folders | Works correctly |
| No dashboard selected, or only a folder selected | OK button disabled |
| Select dashboard in root path | Can be selected |
| Select dashboard in a folder | Can be selected |
| Select dashboard in `My Reports` folder | Can be selected |

_Compose Dashboard:_

| State | Expected Result |
|-------|-----------------|
| Checked on | Select Dashboard pane becomes disabled; clicking OK opens Composer to create a compose dashboard |
| Checked off (default) | Select Dashboard pane is enabled; selected dashboard is used |

_Dialog buttons:_

| Button | Expected Result |
|--------|-----------------|
| OK | Dashboard added; appears on Dashboard tab |
| Cancel | Dialog closes; no dashboard created |

---

### 2.2 Edit Dashboard (User Dashboard Only)

- **Trigger:** Click a User Dashboard → select `Edit` from the Dashboard Configuration menu.
- **Check:** `Edit Dashboard` dialog opens.

**Pre-conditions:** `Edit Dashboard` dialog is open for a User Dashboard

_Dialog load:_
- Shows current name and description
- Currently bound dashboard is highlighted in the Select Dashboard pane
- Compose Dashboard checkbox: enabled, unchecked

| Action | Expected Result |
|--------|-----------------|
| Change name | Dashboard name updated |
| Change bound dashboard — same scope | Dashboard changed correctly |
| | **Sync check:** Verify reload on both EM side and Portal side `*` |
| Change bound dashboard — different scope (global ↔ user) | `*` |
| Check on `Compose Dashboard` | Opens Composer; compose dashboard can be created successfully |

`*` _Marker present in source Excel; meaning unspecified. Verify behavior on both EM and Portal sides._

---

### 2.3 Delete Dashboard (User Dashboard Only)

- **Trigger:** Click a User Dashboard → select `Delete` from the Dashboard Configuration menu.
- **Check:** Confirm dialog appears.

| Confirm Action | Expected Result |
|----------------|-----------------|
| Click OK | Dashboard deleted from Portal, EM, and the Arrange Dashboards dialog; the first remaining dashboard becomes selected and highlighted |
| Click Cancel | Dashboard not deleted; still shown on Portal and EM |

---

### 2.4 Arrange Dashboard

- **Trigger:** Select `Arrange` from the Dashboard Configuration menu.
- **Check:** `Arrange Dashboards` dialog opens.

#### 2.4.1 Arrange Dashboards Dialog

**Pre-conditions:** `Arrange Dashboards` dialog is open

_Always present:_ `Enable All`, `Disable All`, `OK`, and `Cancel` buttons are enabled.

_Load states:_

| Condition | Expected Result |
|-----------|-----------------|
| No dashboards exist | Empty dashboard list |
| 1 dashboard | Loaded with `Enable=true` (checked); both up and down icons disabled |
| 2 dashboards | Up icon disabled on first; down icon disabled on last |
| More dashboards | Both icons enabled on middle items; vertical scrollbar if list is long |
| Dashboard with `Enable=false` | Both up and down icons disabled after that item |
| Long dashboard name | Horizontal scrollbar |

_Enable interactions:_

> **Note:** Dashboards with `Enable=false` are displayed after all `Enable=true` dashboards. Changing Enable value affects display order within the dialog.

| Action | Expected Result |
|--------|-----------------|
| Check off `Enable` on a dashboard | Dashboard moves to last row; its up and down icons become disabled |
| Check on `Enable` on a dashboard | Dashboard moves to last enabled row; up icon becomes enabled |
| Click `Disable All` | All `Enable` options set to false; all up/down icons disabled |
| Click `Enable All` | All `Enable` options set to true; icons update correctly |
| Drag to change order | Order updated in dialog only; other values unchanged |
| Click OK | Dialog closes; Enable state and order applied |
| Click Cancel | Dialog closes; no changes applied |

#### 2.4.2 Arrange Apply — Portal Effects

| Action | Expected Result |
|--------|-----------------|
| Disable all dashboards | All dashboards hidden on Portal Dashboard tab |
| Enable all dashboards | All dashboards shown on Portal Dashboard tab |
| Check off `Enable` on a dashboard | Dashboard hidden on Portal |
| | **Note:** When `security=false`, this does **not** affect the EM-side `Enable` option |
| Check on `Enable` on a dashboard | Dashboard shown on Portal |
| Change dashboard order | Order updated on Portal Dashboard tab AND on EM Arrange page |

---

### 2.5 Dashboard Actions

#### 2.5.1 Open Dashboard / Dashboard Tab

| Action | Expected Result |
|--------|-----------------|
| Switch to Dashboard tab | First dashboard selected and highlighted |
| Click a different dashboard | That dashboard opens and becomes highlighted |
| Open a dashboard whose bound asset no longer exists | Error dialog: `sheet not found` |

#### 2.5.2 Dashboard Toolbar

**Pre-conditions:** A dashboard is open in Portal

All toolbar actions must work correctly:

| Action |
|--------|
| Previous page |
| Next page |
| Edit |
| Refresh |
| Email |
| Schedule |
| Print |
| Save snapshot |
| Zoom in |
| Zoom out |
| Bookmarks |
| Full screen |

---

## Bug Summary

| Bug | Description |
|-----|-------------|
| #69468 | User dashboard bound to private asset — EM shows only current user's private assets; cross-org case follows same restriction |
