# Dashboard Management (Security=true)

**Docs source:** `Dashboard-E2E-Scenarios.md`

## Prerequisites

- **Assets ZIP:** `dashboard-management-security-true-assets.zip`
  - At least 3 global dashboards under `Portal Dashboard`:
    - `Dash A` bound to `Dashboard/VS A`
    - `Dash B` bound to `Dashboard/VS B`
    - `Dash C` bound to `Dashboard/VS C`
  - Global viewsheets with visible content:
    - `Dashboard/VS A` shows text `VS A Content`
    - `Dashboard/VS B` shows text `VS B Content`
    - `Dashboard/VS C` shows text `VS C Content`
  - `_REQUIRES_HUMAN_`: No ZIP file was found. Produce the assets above and place the ZIP beside this spec.
- **Setup Script:** `dashboard-management-security-true-setup.groovy`
  - Enable security
  - Disable multi-tenancy
  - Import `dashboard-management-security-true-assets.zip`
  - Create user `dash_admin` / `Dashboard1234!` with EM Content > Repository permission and Portal Dashboard Tab permission
  - `_REQUIRES_HUMAN_`: No setup script exists yet. Produce a Groovy setup script that configures this runtime state.

## Cases Overview

| Test | Action | Result |
|------|--------|--------|
| Test1 | Create Global Dashboard with valid VS in EM | Dashboard created, auto-opened, visible in EM tree and Portal |
| Test2 | Edit Global Dashboard name/description/VS in EM | Changes sync to Portal immediately |
| Test3 | Delete Global Dashboard in EM | Removed from EM tree, Portal tab and Arrange dialog |
| Test4 | Reorder Global Dashboards in EM Arrange pane | Portal dashboard dropdown order matches |

## Fixtures

### EmSecurityTrueDashboardWorkspace
- Application is running with security enabled and multi-tenancy disabled
- Assets from `dashboard-management-security-true-assets.zip` are imported
- User `dash_admin` is logged into EM at `/em/settings/content/repository`
- User navigates the repository tree to `Portal Dashboard`
- **[Wait for repository tree and dashboard editor to load]**

### PortalSecurityTrueDashboardWorkspace
- Application is running with security enabled and multi-tenancy disabled
- User `dash_admin` is logged into Portal
- User opens `/app/portal/tab/dashboard`
- **[Wait for dashboard tab model to load]**

## Test1: Create Global Dashboard with valid VS

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsPageComponent`

### Given
- [EmSecurityTrueDashboardWorkspace]
- Global viewsheet `Dashboard/VS A` exists and is selectable in the dashboard editor

### When
- User selects the `Portal Dashboard` node
- User clicks `New Dashboard`
- User enters dashboard name `Dashboard {timestamp}`
- User selects viewsheet `Dashboard/VS A`
- User clicks `Apply`
- User opens Portal `/app/portal/tab/dashboard`
- User selects dashboard `Dashboard {timestamp}`

### Then
- **Assert:** EM repository tree contains `Dashboard {timestamp}` under `Portal Dashboard`
- **Assert:** Selecting `Dashboard {timestamp}` in Portal displays `VS A Content`

## Test2: Edit Global Dashboard name, description, and VS

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsViewComponent`

### Given
- [EmSecurityTrueDashboardWorkspace]
- Global dashboard `Dash A` exists under `Portal Dashboard`

### When
- User selects `Dash A`
- User changes `Name` to `Dash A Updated`
- User changes `Description` to `Updated description {timestamp}`
- User changes selected viewsheet to `Dashboard/VS B`
- User clicks `Apply`
- User opens Portal `/app/portal/tab/dashboard`
- User selects dashboard `Dash A Updated`

### Then
- **Assert:** EM repository tree contains `Dash A Updated` and no longer contains `Dash A`
- **Assert:** Portal Dashboard tab contains `Dash A Updated`
- **Assert:** Portal dashboard tooltip or accessible description contains `Updated description {timestamp}`
- **Assert:** Selecting `Dash A Updated` displays `VS B Content`

## Test3: Delete Global Dashboard

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsPageComponent`

### Given
- [EmSecurityTrueDashboardWorkspace]
- Global dashboard `Dash C` exists under `Portal Dashboard`

### When
- User selects `Dash C`
- User clicks delete action
- User confirms delete
- User opens Portal `/app/portal/tab/dashboard`
- User opens `Dashboard Configuration` > `Arrange`

### Then
- **Assert:** EM repository tree no longer contains `Dash C`
- **Assert:** Portal Dashboard tab does not contain `Dash C`
- **Assert:** Arrange dashboard dialog does not list `Dash C`

## Test4: Reorder Global Dashboards

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsViewComponent`

### Given
- [EmSecurityTrueDashboardWorkspace]
- Global dashboards `Dash A Updated` (or `Dash A`) and `Dash B` exist and are visible in Portal

### When
- User opens the `Arrange` pane for `Portal Dashboard`
- User moves `Dash B` to the top position
- User clicks `Apply`
- User opens Portal `/app/portal/tab/dashboard`

### Then
- **Assert:** Portal dashboard dropdown order shows `Dash B` before `Dash A Updated` (or `Dash A`)
