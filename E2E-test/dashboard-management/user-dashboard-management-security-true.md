# User Dashboard Management (Security=true)

**Docs source:** `Dashboard-E2E-Scenarios.md`

## Prerequisites

- **Assets ZIP:** `user-dashboard-management-security-true-assets.zip`
  - Global viewsheet `Dashboard/Global VS` with visible content `Global VS Content`
  - User viewsheet for `dashboard_user` named `Dashboard/My User VS` with visible content `My User VS Content`
  - `_REQUIRES_HUMAN_`: No ZIP file was found. Produce the assets above and place the ZIP beside this spec.
- **Setup Script:** `user-dashboard-management-security-true-setup.groovy`
  - Enable security
  - Disable multi-tenancy
  - Import `user-dashboard-management-security-true-assets.zip`
  - Create user `dashboard_user` / `Dashboard1234!` with Portal dashboard create permission
  - Ensure `dashboard_user` can open EM Content > Repository to verify saved location
  - `_REQUIRES_HUMAN_`: No setup script exists yet. Produce a Groovy setup script that configures this runtime state.

## Cases Overview

| Test | Action | Result |
|------|--------|--------|
| Test1 | User Dashboard CRUD from Portal | Appears under `User Dashboard/<username>` in EM and is deletable |
| Test2 | Edit User Dashboard VS across scopes | Can bind global VS and user-scope VS and syncs |

## Fixtures

### PortalUserDashboardSecurityTrueWorkspace
- Application is running with security enabled and multi-tenancy disabled
- User `dashboard_user` is logged into Portal
- User opens `/app/portal/tab/dashboard`
- **[Wait for dashboard tab model to load]**

### EmUserDashboardSecurityTrueWorkspace
- Application is running with security enabled and multi-tenancy disabled
- User `dashboard_user` is logged into EM
- User opens `/em/settings/content/repository`
- **[Wait for repository tree and dashboard editor to load]**

## Test1: User Dashboard – full CRUD from Portal

**URL:** `/app/portal/tab/dashboard`
**Page Object:** `DashboardTabComponent`

### Given
- [PortalUserDashboardSecurityTrueWorkspace]

### When
- User opens `Dashboard Configuration`
- User clicks `Add`
- User enters dashboard name `My Dashboard {timestamp}`
- User selects viewsheet `Dashboard/Global VS`
- User clicks `OK`
- User opens `Dashboard Configuration` > `Edit`
- User changes name to `My Dashboard Renamed {timestamp}`
- User clicks `OK`
- User opens `Dashboard Configuration` > `Delete`
- User confirms delete
- User opens EM `/em/settings/content/repository`
- User navigates to `User Dashboard/dashboard_user`

### Then
- **Assert:** After create, Portal Dashboard tab contains `My Dashboard {timestamp}`
- **Assert:** After rename, Portal Dashboard tab contains `My Dashboard Renamed {timestamp}`
- **Assert:** After delete, Portal Dashboard tab does not contain `My Dashboard Renamed {timestamp}`
- **Assert:** EM repository tree under `User Dashboard/dashboard_user` does not contain `My Dashboard Renamed {timestamp}`

## Test2: Edit User Dashboard VS across scopes

**URL:** `/app/portal/tab/dashboard`
**Page Object:** `EditDashboardDialog`

### Given
- [PortalUserDashboardSecurityTrueWorkspace]
- A user dashboard `Scope Switch Dashboard` exists (create it if missing) and is selectable

### When
- User selects `Scope Switch Dashboard`
- User opens `Dashboard Configuration` > `Edit`
- User selects global viewsheet `Dashboard/Global VS`
- User clicks `OK`
- User opens `Dashboard Configuration` > `Edit`
- User selects user-scope viewsheet `Dashboard/My User VS`
- User clicks `OK`

### Then
- **Assert:** Selecting `Scope Switch Dashboard` displays `My User VS Content`
- **Assert:** No permission error is shown during the two edits
