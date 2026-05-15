# Dashboard Management (Security=false)

**Docs source:** `Dashboard-E2E-Scenarios.md`

## Prerequisites

- **Assets ZIP:** `dashboard-management-security-false-assets.zip`
  - A global viewsheet `Dashboard/Public VS` with visible content text `Public VS Content`
  - A global dashboard `Public Toggle Dashboard` bound to `Dashboard/Public VS`, enabled
  - `_REQUIRES_HUMAN_`: No ZIP file was found. Produce the assets above and place the ZIP beside this spec.
- **Setup Script:** `dashboard-management-security-false-setup.groovy`
  - Disable security
  - Disable multi-tenancy
  - Import `dashboard-management-security-false-assets.zip`
  - Ensure site admin can open EM Content > Repository
  - `_REQUIRES_HUMAN_`: No setup script exists yet. Produce a Groovy setup script that configures this runtime state.

## Cases Overview

| Test | Action | Result |
|------|--------|--------|
| Test1 | User creates User Dashboard in Portal | Dashboard stored under `User Dashboard/anonymous` |
| Test2 | Site admin toggles Enabled on a global dashboard in EM | Portal visibility follows Enabled exactly |

## Fixtures

### EmSecurityFalseWorkspace
- Application is running with security disabled and multi-tenancy disabled
- Assets from `dashboard-management-security-false-assets.zip` are imported
- Site admin opens EM at `/em/settings/content/repository`
- **[Wait for repository tree and dashboard editor to load]**

### PortalSecurityFalseWorkspace
- Application is running with security disabled and multi-tenancy disabled
- User opens Portal at `/app/portal/tab/dashboard`
- **[Wait for dashboard tab model to load]**

## Test1: Default storage location for User Dashboard when security=false

**URL:** `/app/portal/tab/dashboard`
**Page Object:** `EditDashboardDialog`

### Given
- [PortalSecurityFalseWorkspace]

### When
- User opens `Dashboard Configuration`
- User clicks `Add`
- User enters dashboard name `Anon Dashboard {timestamp}`
- User selects any viewsheet `Dashboard/Public VS`
- User clicks `OK`
- Site admin opens EM `/em/settings/content/repository`
- Site admin navigates to `User Dashboard/anonymous`

### Then
- **Assert:** EM repository tree under `User Dashboard/anonymous` contains `Anon Dashboard {timestamp}`

## Test2: Enabled checkbox controls Portal visibility when security=false

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsViewComponent`

### Given
- [EmSecurityFalseWorkspace]
- Global dashboard `Public Toggle Dashboard` exists and is enabled

### When
- Site admin selects `Portal Dashboard/Public Toggle Dashboard`
- Site admin unchecks `Enabled`
- Site admin clicks `Apply`
- User opens Portal `/app/portal/tab/dashboard`
- Site admin re-opens EM and re-checks `Enabled`
- Site admin clicks `Apply`
- User reloads Portal `/app/portal/tab/dashboard`

### Then
- **Assert:** After disabling, Portal Dashboard tab does not contain `Public Toggle Dashboard`
- **Assert:** After re-enabling, Portal Dashboard tab contains `Public Toggle Dashboard`
- **Assert:** Selecting `Public Toggle Dashboard` displays `Public VS Content`
