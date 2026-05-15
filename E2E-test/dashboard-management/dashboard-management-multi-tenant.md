# Dashboard Management (Multi-tenant)

**Docs source:** `Dashboard-E2E-Scenarios.md`

## Prerequisites

- **Assets ZIP:** `dashboard-management-multi-tenant-assets.zip`
  - Organization `OrgA`:
    - global viewsheet `Dashboard/OrgA VS` with content `OrgA VS Content`
    - global dashboard `OrgA Dashboard` bound to `Dashboard/OrgA VS`, enabled
  - Organization `OrgB`:
    - global viewsheet `Dashboard/OrgB VS` with content `OrgB VS Content`
  - `_REQUIRES_HUMAN_`: No ZIP file was found. Produce the assets above and place the ZIP beside this spec.
- **Setup Script:** `dashboard-management-multi-tenant-setup.groovy`
  - Enable security and multi-tenancy
  - Create organizations `OrgA` and `OrgB`
  - Create org admin `orga_admin` / `Dashboard1234!` for `OrgA`
  - Create org admin `orgb_admin` / `Dashboard1234!` for `OrgB`
  - Create site admin with permission to use EM Org Filter
  - Import assets into their organizations
  - `_REQUIRES_HUMAN_`: No setup script exists yet. Produce a Groovy setup script that configures this runtime state.

## Cases Overview

| Test | Action | Result |
|------|--------|--------|
| Test1 | Site admin creates Global Dashboard for OrgB via Org Filter | Dashboard is owned/managed in OrgB, not leaked to OrgA |
| Test2 | Org admin edits own Global Dashboard | Changes only apply within the org |
| Test3 | User Dashboard stored in correct org folder | Each org stores user dashboards under its own user folder |

## Fixtures

### MultiTenantWorkspace
- Application is running with security and multi-tenancy enabled
- Site admin is logged into EM
- **[Wait for EM shell and Org Filter to load]**

## Test1: Site admin creates Global Dashboard for another org

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsPageComponent`

### Given
- [MultiTenantWorkspace]
- Org Filter can switch context

### When
- Site admin switches Org Filter to `OrgB`
- Site admin opens `/em/settings/content/repository`
- Site admin selects `Portal Dashboard`
- Site admin clicks `New Dashboard`
- Site admin enters name `OrgB Created Dashboard {timestamp}`
- Site admin selects viewsheet `Dashboard/OrgB VS`
- Site admin clicks `Apply`
- Site admin logs out
- Org admin `orgb_admin` logs into EM and opens `/em/settings/content/repository`

### Then
- **Assert:** OrgB EM repository tree contains `OrgB Created Dashboard {timestamp}`
- **Assert:** OrgA context does not contain `OrgB Created Dashboard {timestamp}`

## Test2: Org admin edits own Global Dashboard

**URL:** `/em/settings/content/repository`
**Page Object:** `RepositoryDashboardSettingsViewComponent`

### Given
- [MultiTenantWorkspace]

### When
- Site admin switches Org Filter to `OrgA`
- Site admin opens `/em/settings/content/repository`
- Site admin selects `Portal Dashboard/OrgA Dashboard`
- Site admin changes `Name` to `OrgA Dashboard Updated {timestamp}`
- Site admin clicks `Apply`
- Site admin logs out
- Org admin `orga_admin` logs into Portal and opens `/app/portal/tab/dashboard`

### Then
- **Assert:** Portal in OrgA contains `OrgA Dashboard Updated {timestamp}`
- **Assert:** Portal in OrgB does not contain `OrgA Dashboard Updated {timestamp}`

## Test3: User Dashboard stored in correct org folder

**URL:** `/app/portal/tab/dashboard`
**Page Object:** `DashboardTabComponent`

### Given
- Security and multi-tenancy enabled

### When
- Log in as `orga_admin` and create a User Dashboard `OrgA User Dash {timestamp}` bound to `Dashboard/OrgA VS`
- Log in as `orgb_admin` and create a User Dashboard `OrgB User Dash {timestamp}` bound to `Dashboard/OrgB VS`
- Site admin opens EM `/em/settings/content/repository` in OrgA context and checks `User Dashboard/orga_admin`
- Site admin switches Org Filter to OrgB and checks `User Dashboard/orgb_admin`

### Then
- **Assert:** OrgA EM shows `OrgA User Dash {timestamp}` under `User Dashboard/orga_admin`
- **Assert:** OrgB EM shows `OrgB User Dash {timestamp}` under `User Dashboard/orgb_admin`
- **Assert:** OrgA EM does not show `OrgB User Dash {timestamp}`
