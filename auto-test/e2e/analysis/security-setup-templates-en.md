# Priority 2: Groovy DSL Security Configuration Templates

## Goal

Provide reusable Setup Script templates for security and permission E2E tests, covering:
- Organization creation and management
- User creation and management
- Role creation and management
- Group creation and management
- Action permission grants (e.g. AccessPortal, CreateViewsheet)
- Resource permission grants (e.g. specific Viewsheets, data sources, folders)

---

## What Needs to Be Done

### 1. Understand the Existing DSL Entry Point

Setup Scripts call the security API using the following structure:

```groovy
inetsoft {
   connect {
      path "http://localhost:8080"
      username "admin"
      password "Admin1234!"

      connect {
         security {
            // call SecurityClientService methods here
         }
      }
   }
}
```

`SecurityClientService` already exposes a full set of CRUD methods:
- `setSecurityEnabled(boolean)`
- `createUser(SecurityUser)` / `updateUser` / `deleteUser`
- `createGroup(SecurityGroup)` / `updateGroup` / `deleteGroup`
- `createRole(SecurityRole)` / `updateRole` / `deleteRole`
- `createOrganization(SecurityOrganization, copyFromOrgID)` / `updateOrganization` / `deleteOrganization`
- `setPermission(ResourcePermission)` / `createGrant` / `updateGrant` / `deleteGrant`

DSL builders are already defined in `Security.groovy`: `securityUser {}`, `securityGroup {}`, `securityRole {}`, `securityOrganization {}`, `resourcePermission {}`, `permissionGrant {}`.

---

### 2. Template File to Write

Create `_SECURITY_TEMPLATES.md` under `e2e/specs/browser/` containing the following reusable snippets:

| Template Name | Content |
|---------------|---------|
| Enable Security | Enable security and set admin password |
| Create User | Create a user with password, roles, and group membership |
| Create Group | Create a group with member users, parent groups, and roles |
| Create Role | Create a role with inherited roles |
| Create Organization | Create an organization with members and admin identities |
| Grant Action Permission | Grant action permissions to a role/user (AccessPortal, etc.) |
| Grant Resource Permission | Grant READ/WRITE/DELETE on a specific resource to a role/user |
| Multi-user Session | Create two users with different permissions for multi-browser-context tests |
| VPM Scope User | Create a restricted user with a VPM scope binding |
| Org Admin User | Create an Org Admin user within a specific organization |

---

### 3. Information to Confirm Before Writing Templates

**Action permission type enum**: Which action names the system supports (e.g. `AccessPortal`, `CreateViewsheet`, `AccessEM`). Check `ResourceType` or related constant definitions.

**Resource path format**: The path format for each resource type, for example:
- Viewsheet: `/viewsheet/global/FolderName/VSName`
- Data source: `/datasource/DataSourceName`
- Folder: `/folder/FolderName`

**Multi-tenant orgID rules**: How the `orgID` field should be populated when creating users inside an organization, and the distinction between site admin and org admin.

---

### 4. DSL Coverage to Verify

Based on the existing builders in `Security.groovy`, the following fields are already supported:

| Entity | Supported Fields |
|--------|-----------------|
| User | name, orgID, alias, locale, theme, active, emails, groups, roles, password, adminIdentities |
| Group | name, orgID, theme, parentGroups, memberUsers, memberGroups, roles, adminIdentities |
| Role | name, orgID, description, theme, assignedUsers, assignedGroups, inheritedRoles, adminIdentities |
| Organization | name, id, locale, theme, memberUsers, memberGroups, roles, adminIdentities, defaultPassword |
| ResourcePermission | resource, resourceType, grants |
| PermissionGrant | identityID, type (ROLE/GROUP/USER), actions |

**To confirm**: In which scenarios the `AdminIdentities` fields (`users`, `groups`, `roles`, `organizations`) need to be populated.

---

### 5. Deliverables

| File | Description |
|------|-------------|
| `e2e/specs/browser/_SECURITY_TEMPLATES.md` | Template library referenced by the AI when generating specs |
| `e2e/tests/resources/security-base-setup.groovy` | Optional: minimal shared setup (enable security + create admin) that other scripts can include |
