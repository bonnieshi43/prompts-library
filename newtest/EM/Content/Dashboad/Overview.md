---
module: Content-Dashboard / Overview
last-updated: 2026-04-27
related: Content-Repository, Security, Multi-Tenancy
---

> **See also:** This file contains the global business rules and context for all Dashboard tests.
> Refer to [Content-Dashboard-GlobalDashboard.md](Content-Dashboard-GlobalDashboard.md) and
> [Content-Dashboard-UserPortalDashboard.md](Content-Dashboard-UserPortalDashboard.md) for test details.

---

## Dashboard Types

There are two types of dashboards, created through different paths:

| Type | Created Via | Managed By |
|------|-------------|------------|
| **Global Dashboard** | `EM → Content → Repository → Portal Dashboard → New Dashboard` | Site Admin / Org Admin / user with valid EM + Portal Dashboard Tab permission |
| **User Dashboard** | Portal → Dashboard tab → Add | The individual user; editable by Site Admin / Org Admin in EM |

---

## Global Dashboard Rules

### 1. Who Can Create

- **Site Admin** — creates for Host-Org or for other orgs via Org filter
- **Org Admin** — creates for their own org
- **User with valid permission** — must have both EM permission and Portal Dashboard Tab permission

### 2. Non-Multitenant Behavior

| security | Visibility Rule |
|----------|----------------|
| `false` | Global dashboards are shown in Portal by default (`Enable=true` by default) |
| `true` | User must have both dashboard resource access AND dashboard access permission enabled |

> **Note:** When a user with EM + Portal Tab permission creates a global dashboard, they automatically receive access permission on it. Other users must be granted access via `Dashboard Configuration → Arrange`.

### 3. Multitenant Behavior

- **Site Admin via Org filter**: dashboard resource and access permission must belong to the target org's admin, not Host-Org.

> **Bug #69387** — Dashboard created by Site Admin after switching org via Org filter: resource and access permission are incorrectly assigned to Host-Org instead of the target org's admin.

- **Org Admin or internal user creating a dashboard**: the owner is the currently logged-in user.

### 4. Clone Org — Dashboard State Rules

When cloning an org:
- Dashboard **resources** are cloned.
- Dashboard **Enable state** (per logged-in user) is **not** cloned — the cloned org's Enable state is independently managed by its Org Admin.
- After the Org Admin configures Enable state, it must remain in sync with what Site Admin sees under that org via Org filter.

> **Bug #69347** — Clone org: user Enable state default behavior. *(Dependent on Bug #69387 being fixed first.)*

### 5. Global Dashboard Portal Display Rules

- All edits to Global Dashboards are done in EM only.
- In Portal, Global Dashboards have **read-only** access — they cannot be edited or deleted by the end user.

---

## User Dashboard Rules

### 1. Storage Path

| Condition | Storage Location |
|-----------|-----------------|
| `security=false` | Stored under `anonymous` user folder |
| `security=true`, non-multitenant | Stored in Host-Org user folder |
| `security=true`, multitenant | Stored in the corresponding org's user portal dashboard tab user folder |

### 2. Edit Access

User dashboards can be edited from three places:
1. Site Admin in EM
2. Org Admin in EM
3. The user themselves in Portal

Changes must stay in sync across all three.

### 3. Private Asset Restriction

When a user dashboard is bound to a private asset:
- In EM, only the **currently logged-in user's** private assets are visible.
- Other users' dashboards show an empty bound dashboard in the edit binding panel.
- This restriction exists to prevent assigning private assets you don't own to another user's dashboard, even if you have content repository read permission.

> **Bug #69468** — Cross-org case: user dashboard bound to a private dashboard also follows this restriction (same rule applies).

### 4. User Dashboard Pane — Testable Operations

- Dashboard Display (visibility in Portal)
- Add Dashboard
- Edit Dashboard: change name, description, bound dashboard
  > **Note:** Scope matters — user-scope dashboard vs global-scope dashboard are different; verify correct scope is available in the selection.
- Arrange Dashboard:
  - `Enable` option controls **portal display only**, does not affect EM-side `Enable` or Security settings; does affect the EM Arrange page display order.
  - Dashboard order change affects **both** Portal and EM sides.
- Delete Dashboard
- Dashboard toolbar actions

---

## Special Note — Security Switching

Frequently switching `security` between `true` and `false` can cause dashboard display (`Enable` value) inconsistencies. This is a low-priority edge case since frequent toggling has no practical use.

> **Low priority:** Security on/off switching tests are not blocking. Verify only basic behavior; do not treat minor state inconsistencies here as blocking bugs.

---

## Bug Summary

| Bug | Description |
|-----|-------------|
| #69387 | Site Admin switching org via Org filter — dashboard resource/access assigned to wrong org |
| #69347 | Clone org — user Enable state handling (depends on #69387) |
| #69468 | User dashboard bound to private asset — private asset visibility restriction across orgs |
