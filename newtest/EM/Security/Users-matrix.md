---
module: Security Provider - User/Group/Role Management
source: SecurityProvider_Manual.xlsx
Excel-path: two-phase (primary + supplementary)
last-updated: 2026-04-29
---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | 47 |
| Kept P1 | 18 |
| Kept P2 | 6 |
| Needs clarification | 2 |

## Feature Summary

User/Group/Role management is the core of the security module, controlling identity authentication, resource access permissions, and system administration capabilities. Primary users include system administrators, organization administrators, and regular users. Core business objects include User, Group, Role, Provider, and Organization. In multi-tenant scenarios, user identities are isolated across different Providers and Organizations, and the permission inheritance chain (User > Group > Role) determines the final access control.

## Rules & Notes

### Business Rules
- **Provider Types**: Primary Provider allows full edit of users/groups/roles; non-Primary Providers only enable "Add Administrator Permissions" pane, other UI is disabled
- **Permission Inheritance Priority**: User > Group > Role — higher priority takes effect when multiple levels set Theme
- **System Administrator**: Users with this role have all permissions, and the last System Admin cannot be removed
- **Default Role**: Roles with Default=true (e.g., Everyone) are automatically added to new users' Roles pane
- **Deletion Constraints**: Cannot delete groups containing users; cannot delete yourself; cannot delete the last System Admin
- **Login As**: Requires `login.loginAs=on` and user has System Admin role or explicit permission

### Security & Multi-Tenancy (if applicable)
- **security=false:** Not applicable to this module
- **security=true:** Permission system enabled, roles/admin permissions take effect
- **multi-tenant:** Resource isolation across organizations. **Additional validation (from reference file)**: Organization administrator users cannot see System Administrator users when logging into EM; they can only see users in their current organization; organization administrators can see functions open to the organization

### Known Risks / Special Cases
- **Bug #53382** — Theme Combobox issue when creating users via GUI
- **Bug #47909** — Designer role inheriting Administrator role permission issue
- **Bug #65638** — Organization Roles remove issue
- **Bug #65775** — Organization group administrator role issue
- **Bug #65305 / #67707** — Organization clone functionality
- **Feature #50844** — Associate different themes with users/roles
- **Feature #68934** — Global organization shared viewsheets

## Scenario Overview

| ID | Priority | Area | Scenario | Key Business Assertion |
|----|----------|------|----------|----------------------|
| TC-001 | P1 | Provider | Permission restrictions on non-Primary Provider | Under non-Primary Provider, user/group/role UI is read-only, only admin permissions editable |
| TC-002 | P1 | Provider | Full CRUD on Primary Provider | Users/groups/roles can be created, edited, deleted under Primary Provider |
| TC-003 | P1 | User | Delete last System Administrator | Operation blocked, system retains at least one System Admin |
| TC-004 | P1 | User | Delete group containing users | Operation blocked, prompt to clear group members first |
| TC-005 | P1 | User | Active state controls login | Users with Active=false cannot log into any entry point |
| TC-006 | P1 | Permission | Role inheritance chain | Role's "Inherit from" correctly passes permissions |
| TC-007 | P1 | Permission | Default Role auto-assignment | New users automatically receive Everyone role |
| TC-008 | P1 | Theme | Theme priority override | User theme overrides Group, Group overrides Role |
| TC-009 | P1 | Cross-Module | User edits sync across EM/Portal | User info modified in EM takes effect in Portal |
| TC-010 | P1 | Multi-Tenancy | User isolation across organizations | Organization users can only see their own org's users/groups/roles |
| TC-011 | P1 | Multi-Tenancy | Organization administrator role | Organization admins cannot see System Admin |
| TC-012 | P1 | Login As | System Admin logs in as another user | Actions executed as target user after login |
| TC-013 | P1 | Resource | Resource availability after renaming org ID | Resources remain accessible without loss |
| TC-014 | P1 | Clone | Organization cloning | Identities, resources, permissions fully copied after clone |
| TC-015 | P2 | User | Password complexity validation | Passwords <8 chars or without letters/numbers rejected |
| TC-016 | P2 | User | Duplicate name detection | Cannot create duplicate user/group/role names |
| TC-017 | P2 | User | Multiple email management | Multiple emails split by comma, test email sent to all |
| TC-018 | P2 | Bug | Designer inherits Admin role permissions | Designer role user gains System Admin capabilities |
| TC-019 | P2 | Bug | Organization ID editing after clone | Cloned organization can normally modify ID and name |
| TC-020 | P2 | Feature | Global organization shared viewsheets | Other organizations can read-only access Host Org viewsheets |

## Scenarios

#### TC-001 Permission restrictions on non-Primary Provider `P1`

**Scope:** Security → Users → Provider selection
**Validates rule:** Non-Primary Provider only allows editing of Administrator Permissions

**Pre-conditions:**
- Multi-Tenancy = disabled (or Primary Provider = database/custom/LDAP)
- User with System Admin permission logged into EM
- Select a non-Primary Provider in Provider dropdown (e.g., LDAP Provider)

**Steps:**
1. In Users Tab Provider dropdown, select a non-Primary Provider
2. Observe the left tree's user/group/role list
3. Select a user and view the edit pane
4. Attempt to click "New User / New Group / New Role" buttons
5. Attempt to fill other fields in the edit pane (e.g., Alias, Email, Locale)

**Expected:**
- User/group/role tree loads correctly (shows current Provider's data)
- "New User / New Group / New Role" buttons are disabled
- In the edit pane, only the "Administrator Permissions" section's Add button is operable; all other inputs/buttons are disabled

---

#### TC-002 Full CRUD operations on Primary Provider `P1`

**Scope:** Security → Users → Primary Provider
**Validates rule:** Users/groups/roles can be fully managed under Primary Provider

**Pre-conditions:**
- Provider = Primary
- User with System Admin permission logged into EM

**Steps:**
1. Click "New User" button, create new user `testuser_e2e`
2. Set user Active=true, fill Alias, select Locale
3. Add Everyone role in "Roles" pane
4. Click Apply to save
5. Refresh Users Tab, verify user appears in tree
6. Select the user, click Delete to remove
7. Refresh to verify user is gone

**Expected:**
- User created successfully, data persisted after Apply
- User still exists after refresh
- After deletion, user no longer appears in tree or login-available list

---

#### TC-003 Delete last System Administrator `P1`

**Scope:** Security → Users → Delete protection
**Validates rule:** Last System Admin cannot be deleted

**Pre-conditions:**
- Only one user (admin) has System Administrator role
- Logged into EM as admin

**Steps:**
1. Select admin user in Users tree
2. Verify user has System Administrator role (shown in Role pane)
3. Click Delete button

**Expected:**
- Delete operation blocked, prompt: "Cannot delete selected identities. The last system administrator cannot be removed."
- admin user still exists in system and can log in normally

---

#### TC-004 Delete group containing users `P1`

**Scope:** Security → Groups → Delete protection
**Validates rule:** Groups containing users cannot be directly deleted

**Pre-conditions:**
- Create a group `group_with_user`
- Add at least one user (e.g., testuser) to the group

**Steps:**
1. Select `group_with_user` in Groups tree
2. Click Delete button
3. Observe system response

**Expected:**
- Delete operation blocked, prompt: "Cannot remove a group containing user(s). Please remove all users from group first."
- Group still exists in tree

---

#### TC-005 Active state controls login capability `P1`

**Scope:** Security → Users → Active attribute
**Validates rule:** Users with Active=false cannot log into EM/Portal/Studio

**Pre-conditions:**
- A non-admin regular user `inactive_user` exists
- Ensure `login.loginAs=off` or user has no Login As permission

**Steps:**
1. Log into EM as admin, edit `inactive_user`
2. Set Active checkbox to false, save
3. Attempt to log into EM as `inactive_user`
4. Attempt to log into Portal as `inactive_user`
5. Return to EM, set Active back to true
6. Attempt login again

**Expected:**
- When Active=false, login to EM/Portal fails (authentication rejected)
- When Active=true, login succeeds

---

#### TC-006 Role inheritance chain `P1`

**Scope:** Security → Roles → Inherit from
**Validates rule:** Inherit from correctly passes permissions

**Pre-conditions:**
- Administrator role exists (has System Admin permission)
- Create a new role `designer_child`

**Steps:**
1. Edit `designer_child` role
2. Add Administrator role in "Inherit from" pane
3. Apply to save
4. Create a new user `child_user`, assign `designer_child` role
5. Log into Portal as `child_user`, check available functions

**Expected:**
- `child_user` gains all permissions of Administrator role
- Can log into EM (System Admin permission) or see all tabs in Portal (depending on actual permission configuration of Administrator role)

---

#### TC-007 Default Role auto-assignment `P1`

**Scope:** Security → Users → New user creation
**Validates rule:** Roles with Default=true are automatically added to new users

**Pre-conditions:**
- Everyone role's Default checkbox = true (default configuration)

**Steps:**
1. Create a new user `default_role_user`, do not manually add any roles
2. After saving, edit the user
3. Check "Roles" pane

**Expected:**
- "Roles" pane shows Everyone role
- Everyone role's Default attribute is true

---

#### TC-008 Theme priority User > Group > Role `P1`

**Scope:** Security → Users/Group/Role → Theme
**Validates rule:** Feature #50844 — Associate different themes

**Pre-conditions:**
- At least 3 different themes exist (ThemeA, ThemeB, ThemeC)
- Create a role `theme_role`, set its Theme = ThemeC
- Create a group `theme_group`, set its Theme = ThemeB
- Create a user `theme_user`, do not set Theme in user properties (set to Default)

**Steps:**
1. Add `theme_user` to `theme_group`
2. Assign `theme_role` to `theme_user`
3. Log into Portal as `theme_user`, check applied theme
4. Edit `theme_user`, set Theme = ThemeA, save
5. Re-login to Portal, check theme again

**Expected:**
- Step 3: User has no self theme → applies Group theme (ThemeB) → if Group has no theme → applies Role theme (ThemeC)
- Step 5: User's self theme takes effect, shows ThemeA
- When `theme_user` has no self theme, no Group theme, no Role theme → applies system default theme

---

#### TC-009 User info modified in EM syncs to Portal `P1`

**Scope:** EM ↔ Portal cross-end sync
**Validates rule:** User info modified in EM takes effect in Portal

**Pre-conditions:**
- User `sync_user` exists

**Steps:**
1. Log into Portal as `sync_user`, record current displayed username/Alias
2. Log out of Portal, log into EM as admin
3. Edit `sync_user`, change Alias to `alias_sync_test`
4. Save, then re-log into Portal as `sync_user`
5. Check user display info in top-right corner
6. Check any other data that should sync (e.g., Locale)

**Expected:**
- Portal displays Alias as `alias_sync_test`
- If Locale was modified, Portal interface language changes accordingly

---

#### TC-010 User isolation across organizations `P1`

**Scope:** Multi-Tenancy → Organization user isolation
**Validates rule:** Organization administrators cannot see System Administrator users

**Pre-conditions:**
- Multi-Tenancy = enabled
- Organizations OrgA and OrgB exist
- User `orgA_user` belongs to OrgA
- User `orgB_user` belongs to OrgB
- `orgA_user` is granted Organization Administrator role for OrgA

**Steps:**
1. Log into EM as `orgA_user`
2. In Users Tab, view user list
3. Attempt to find System Administrator (admin) user
4. Attempt to find OrgB user `orgB_user`
5. Attempt to edit a regular user within OrgA

**Expected:**
- User list only shows OrgA users
- Does not show admin or users from other organizations
- Can normally edit users within OrgA

**Additional validation (from reference file 2.3.1):**
- OrgA administrator can normally create/edit/delete users/groups/roles within OrgA

---

#### TC-011 Organization administrator role cannot see System Admin `P1`

**Scope:** Multi-Tenancy → Organization administrator role
**Validates rule:** Organization administrators cannot see System Administrator users and role

**Pre-conditions:**
- Multi-Tenancy = enabled
- User `org_admin` is assigned Organization Administrator role
- System Administrator (admin) is in Host Organization

**Steps:**
1. Log into EM as `org_admin`
2. Check user list in Users tree
3. Check Roles tree

**Expected:**
- Users tree does not show admin user
- Roles tree may show System Administrator role (but cannot edit) or not show at all (depends on configuration)
- Cannot edit System Administrator role

---

#### TC-012 System Admin logs in as another user `P1`

**Scope:** Security → Login As feature
**Validates rule:** `login.loginAs=on` and user has System Admin role

**Pre-conditions:**
- Set `login.loginAs=on` in `sree.properties`
- User `target_user` exists, has regular user permissions
- User `system_admin` has System Administrator role

**Steps:**
1. Log into EM as `system_admin`
2. Click User Options → Login As
3. Select `target_user`
4. In Portal, perform operations: create personal dashboard, save worksheet to user scope
5. Check User column in audit logs
6. Re-login as `system_admin`, attempt to Login As a non-existent user

**Expected:**
- Login As option visible (when permission conditions met)
- After login, Portal operations execute as `target_user` (resources owned by target_user)
- Audit log User column shows `target_user`
- When logged in as admin, Monitor → Sessions shows logged-in user as `system_admin` (Login As: target_user) or similar format

---

#### TC-013 Resource availability after renaming organization ID `P1`

**Scope:** Multi-Tenancy → Organization rename
**Validates rule:** All settings and resources preserved after orgID rename

**Pre-conditions:**
- Multi-Tenancy = enabled
- Organization OrgOriginal exists, containing:
  - At least one user
  - One dashboard
  - One schedule task
  - One worksheet

**Steps:**
1. Edit OrgOriginal, change orgID to OrgRenamed
2. After saving, log into Portal as a user in this organization
3. Check dashboard list
4. Check scheduler tasks
5. Check worksheet and datasource
6. Click existing hyperlink or embedded viewsheet
7. Attempt to save resources to user scope

**Expected:**
- All resources accessible normally
- Dashboard loads correctly
- Schedule tasks still exist and can execute
- Worksheet/datasource can be opened and edited
- Hyperlink works normally (or resource migration handled correctly)

**Additional validation:** Resources remain available if orgID is changed back to original name

---

#### TC-014 Organization cloning `P1`

**Scope:** Multi-Tenancy → Clone Organization
**Validates rule:** Identities, resources, permissions fully copied after clone

**Pre-conditions:**
- Multi-Tenancy = enabled
- Source organization SourceOrg contains:
  - At least 2 users (different roles)
  - 1 group (containing users)
  - 1 custom role
  - 1 dashboard
  - 1 schedule task
  - Administrator permission settings

**Steps:**
1. In Security → Organizations, click New Organization
2. Select "Clone from existing Org" → choose SourceOrg
3. Set new organization name and ID, save
4. Log into the new organization, verify:
   - User/group/role structure
   - Dashboard list
   - Schedule tasks
   - Permission settings

**Expected:**
- User structure fully copied (usernames same, passwords reset to `success123`)
- Resources fully copied (dashboard, tasks, etc.)
- Permission settings fully copied (admin permissions, role inheritance)
- **Additional validation**: If cloning Host Organization, Administrator role and its inheritance are removed (Bug #67707)

---

#### TC-015 Password complexity validation `P2`

**Scope:** Security → Users → Change Password
**Validates rule:** Password must be at least 8 chars, include numbers and letters/symbols

**Pre-conditions:**
- Create new user `pwd_user`

**Steps:**
1. Edit `pwd_user`, check Change Password
2. Attempt to enter password `123`, Confirm Password `123`
3. Attempt to enter password `abcdefg` (no numbers)
4. Attempt to enter password `abc12345` (meets requirements)

**Expected:**
- `123` → prompt "Password must be at least 8 characters..."
- `abcdefg` → prompt "...must include at least one number..."
- `abc12345` → no prompt, Apply clickable
- After Apply, new password takes effect, login succeeds with new password

---

#### TC-016 Duplicate name detection `P2`

**Scope:** Security → Users/Groups/Roles → Name uniqueness
**Validates rule:** Names are unique within the same Provider

**Pre-conditions:**
- User `existing_user` exists
- Group `existing_group` exists
- Role `existing_role` exists

**Steps:**
1. Attempt to create a new user with Name = `existing_user`
2. Attempt to create a new group with Name = `existing_group`
3. Attempt to create a new role with Name = `existing_role`
4. Attempt to edit an existing user, change Name to an already existing username

**Expected:**
- Each attempt shows error prompt (e.g., "Duplicate name found!")
- Creation/edit blocked until unique name provided

---

#### TC-017 Multiple email management `P2`

**Scope:** Security → Users → Email Addresses
**Validates rule:** Multiple emails supported, test mail sent to all

**Pre-conditions:**
- User `email_user` exists
- Email server configured for test

**Steps:**
1. Edit `email_user`, in Email Addresses field enter `test1@example.com,test2@example.com`
2. Apply and save
3. Click Test Mail icon
4. Attempt to enter duplicate email address
5. Attempt to enter invalid email address

**Expected:**
- Multiple emails saved successfully, separated by comma
- Test Mail sends to all email addresses
- Duplicate email → prompt "Duplicate email addresses"
- Invalid email → prompt "Invalid email address"

---

#### TC-018 Designer inherits Admin role permissions (Bug Regression) `P2`

> **Bug #47909** — Designer role inheriting Administrator role permission issue

**Regression focus:** Designer role correctly inherits Administrator role permissions

**Pre-conditions:**
- Administrator role exists (has System Admin permission)
- Designer role exists

**Steps:**
1. Edit Designer role, add Administrator role to "Inherit from" pane, Apply
2. Create user `designer_user`, assign Designer role
3. Log into EM as `designer_user`
4. Log into Portal as `designer_user`

**Expected:**
- `designer_user` can log into EM (should have System Administrator capabilities)
- `designer_user` can log into Portal and sees appropriate tabs
- Permission inheritance works correctly

---

#### TC-019 Organization ID editing after clone (Bug Regression) `P2`

> **Bug #65384** — Change organization ID & name on cloned organization

**Regression focus:** Cloned organization can normally modify ID and name

**Pre-conditions:**
- Multi-Tenancy = enabled
- Organization cloned from SourceOrg exists (CloneOrg)

**Steps:**
1. Log into EM as System Admin
2. Navigate to Organizations, select CloneOrg
3. Edit organization ID to a new valid value
4. Edit organization name to a new valid value
5. Apply and save
6. Verify CloneOrg still appears in organization list with new ID/name
7. Verify resources within CloneOrg remain accessible

**Expected:**
- ID and name change successfully
- Organization still functional, resources intact
- Users can still log in

---

#### TC-020 Global organization shared viewsheets (Feature) `P2`

> **Feature #68934** — Expose default organization viewsheets to all organizations

**Regression focus:** Other organizations read-only access to Host Org viewsheets when feature enabled

**Pre-conditions:**
- Set `security.exposeDefaultOrgToAll=true` in properties
- Host Organization has at least one viewsheet in Examples folder
- Regular organization OrgA exists with user `orgA_user`

**Steps:**
1. Log into Portal as `orgA_user`
2. Check Repository tree for "Host Organization Global Repository"
3. Locate the Example viewsheet, click to open
4. Attempt to edit the viewsheet
5. Attempt to save as
6. Attempt to move the viewsheet to OrgA folder

**Expected:**
- "Host Organization Global Repository" appears in Repository tree (when org is authorized)
- Viewshed can be opened, displays layout
- Edit/Save As operations may be allowed for layout editing but data not accessible
- Move operation blocked with appropriate prompt
- No menu icons on shared folder items (read-only)

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| Login As UI visible conditions | user sheet, "Login As Property" | Conditions listed: "have security" and "user can manage other user" — what does "have security" mean? Is it a server property or a permission? |
| Shared viewsheet loading for self-organization | Organization_Security.xlsx, sec 6.1 | Conflicting info: says self organization can't load Host Organization Global Repository, but earlier says security.exposeDefaultOrgToAll applies to all orgs. Clarify if self-org is excluded. |

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Permission affects UI visibility and editability | Run before/after permission modification tests |
| Multi-Tenancy | Organizations affect user/group/role scope | Run organization-focused tests after core CRUD |
| Repository/Scheduler | Resources owned by users affected by rename/delete | Run after TC-013, TC-014 |
| Portal | User theme and preferences apply at login | Run theme tests (TC-008) with Portal verification |