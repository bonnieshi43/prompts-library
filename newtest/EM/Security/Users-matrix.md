---

## module: Security Provider (User/Role/Group Management)
source: SecurityProvider_Manual.xlsx
Excel-path: direct
last-updated: 2026-04-30

## Filtering Summary


| Category               | Count |
| ---------------------- | ----- |
| Discarded UI scenarios | 47    |
| Kept P1                | 12    |
| Kept P2                | 6     |
| Needs clarification    | 2     |


## Feature Summary

This module manages users, groups, and roles within a BI platform's security provider (LDAP, Database, Custom, Primary). Primary providers allow full CRUD on identities; non-primary providers are view-only except for administrator permissions. The feature enforces role-based access control (RBAC), multi-tenancy isolation when enabled, theme inheritance (User > Group > Role), and "Login As" impersonation for system administrators.

## Rules & Notes

### Business Rules

- **R1 (Provider Type):** Only the Primary provider allows creation/deletion/editing of users/groups/roles. Non-primary providers are read-only except for assigning administrator permissions.
- **R2 (System Administrator):** A user with the System Administrator role has all permissions. The last System Administrator cannot be deleted.
- **R3 (Default Role):** When Default=true on a role, it is auto-assigned to every new user.
- **R4 (Group Deletion):** A group containing users cannot be deleted until all users are removed.
- **R5 (Self-Deletion):** A user cannot delete their own active EM session identity.
- **R6 (Theme Priority):** User theme > Group theme > Role theme. Default theme means fallback to next level.
- **R7 (Role Inheritance):** A role inheriting from another role grants all permissions of the parent role.
- **R8 (Active Flag):** Active=false prevents login to EM, Portal, and Studio.

### Security & Multi-Tenancy (if applicable)

- **security=false (login.loginAs=off):** Login As feature invisible regardless of role.
- **security=true (login.loginAs=on):** Login As visible only to users with System Administrator role OR users explicitly granted the loginas permission on action->loginas.
- **multi-tenant (disabled baseline):** No organization isolation. All providers (LDAP, Database, Custom) configured without org info.
- **multi-tenant (enabled):** Referenced in Organization_security.xlxs – not covered here.

## Scenario Overview


| ID     | Priority | Area                          | Scenario                                                                         | Key Business Assertion                                                                                          |
| ------ | -------- | ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| TC-001 | P1       | CRUD + Permission             | Create user with System Admin role and verify full access                        | New System Admin can log into EM/Portal/Studio and see all tabs                                                 |
| TC-002 | P1       | CRUD + Sync                   | Create group, add user, assign role, verify cross-pane sync                      | User appears in group's Members pane; group appears in user's Member Of pane; role appears in user's Roles pane |
| TC-003 | P1       | Permission + Delete           | Delete System Admin user protection                                              | Cannot delete last System Admin; cannot delete self                                                             |
| TC-004 | P1       | Provider Isolation            | Non-Primary provider (LDAP) restricts edits                                      | LDAP user/group/role is view-only; only Add Administrator Permissions is enabled                                |
| TC-005 | P1       | Feature (Theme)               | Theme inheritance priority (User > Group > Role)                                 | User's theme applies; fallback to Group then Role when theme=Default                                            |
| TC-006 | P1       | Permission + Login As         | System Admin impersonates another user and performs actions                      | All actions execute as target user (Account shows target, saved artifacts under target's scope)                 |
| TC-007 | P1       | Permission + Role Inheritance | Role inherits from System Administrator                                          | Inheriting role grants System Admin permissions (EM/Portal access)                                              |
| TC-008 | P2       | CRUD + Email                  | Add multiple emails via dialog and test mail                                     | All recipients receive test email; emails sync between main field and dialog                                    |
| TC-009 | P2       | State + Active                | Disable user account and verify login rejection                                  | Active=false user cannot log into EM, Portal, or Studio                                                         |
| TC-010 | P2       | Permission + Login As         | Non-System Admin with explicit loginas permission can impersonate managed users  | User with loginas permission on action->loginas sees Login As option and can impersonate                        |
| TC-011 | P1       | Multi-Tenant                  | Multi-tenancy disabled baseline: configure LDAP/Database/Custom without org info | Providers save successfully without organization field                                                          |
| TC-012 | P2       | Bug Regression                | Bug #53382 – Theme combobox missing for LDAP/Database/Custom users               | Theme applied as default theme; combobox not shown                                                              |


## Scenarios

#### TC-001 Create System Administrator user with full access `P1` `[CRUD]` `[Permission]`

**Scope:** User creation, role assignment, permission validation across EM/Portal/Studio
**Validates rule:** R2, R3

**Pre-conditions:** Logged into EM as admin (Primary provider, security enabled)

**Steps:**

1. Navigate to User tab → click New User
2. Enter name `sysadmin_test`
3. Check Change Password → set `Test123!`
4. In Roles pane → Add Role → select Administrator
5. Click Apply → OK
6. Log out of EM
7. Log into EM as `sysadmin_test` with password `Test123!`
8. Log into Portal as `sysadmin_test`
9. Log into Studio as `sysadmin_test`

**Expected:**

- User created successfully with Administrator role assigned
- `sysadmin_test` can log into EM and sees all administration tabs
- `sysadmin_test` can log into Portal and see all tabs enabled
- `sysadmin_test` can log into Studio and sees datasource, worksheet, library
- **(implements Feature #50844 indirectly via role permissions)**

---

#### TC-002 Create group, add user, assign role with cross-pane sync `P1` `[CRUD]` `[Cross-Module]`

**Scope:** User, Group, Role creation and bidirectional synchronization
**Validates rule:** R1 (Primary provider edit rights)

**Pre-conditions:** Logged into EM as admin, Primary provider selected, no pre-existing test data

**Steps:**

1. Create new group `TestGroup` → Apply
2. Create new user `TestUser` → Apply
3. Select `TestGroup` → Members pane → Add User → select `TestUser` → OK → Apply
4. Select `TestUser` → Member Of pane → verify `TestGroup` appears
5. Create new role `TestRole` → Apply
6. Select `TestUser` → Roles pane → Add Role → select `TestRole` → OK → Apply
7. Select `TestRole` → Assigned to pane → verify `TestUser` appears

**Expected:**

- Group creation, user creation, role creation all succeed
- User appears in group's Members pane
- Group appears in user's Member Of pane
- Role appears in user's Roles pane
- User appears in role's Assigned to pane

---

#### TC-003 System Administrator deletion protection `P1` `[Permission]`

**Scope:** Delete validation rules for admin users and groups with members
**Validates rule:** R2, R4, R5

**Pre-conditions:** Logged into EM as admin, at least two System Administrators exist (e.g., admin + another), a non-empty group exists

**Steps:**

1. Select the last System Administrator user (admin may be the only one if no second created) – attempt to delete
2. Log in as a non-admin user (if available) or create a test user, log in as that user, then attempt to delete that same user from a different session
3. Select a group that contains at least one user → click Delete

**Expected:**

- Step 1: Popup error: "Cannot delete selected identities. The last system administrator cannot be removed."
- Step 2: Popup error: "Cannot delete yourself." (when attempting to delete own logged-in identity)
- Step 3: Popup error: "Cannot remove a group containing user(s). Please remove all users from group first."

---

#### TC-004 Non-Primary provider (LDAP) restricts edit capabilities `P1` `[Multi-Tenant]`

**Scope:** Provider isolation – Primary vs non-Primary behavior
**Validates rule:** R1

**Pre-conditions:** Multiple providers configured (Primary + LDAP), logged into EM as admin

**Steps:**

1. In User tab Provider dropdown, select a non-Primary provider (e.g., LDAP)
2. Observe New User/Group/Role buttons
3. Select an existing user from LDAP provider
4. Attempt to edit user fields (Alias, Email, Locale, Theme)
5. Verify Delete button state
6. Check Administrator Permissions pane

**Expected:**

- New User/Group/Role buttons: **disabled**
- Delete button: **disabled** (when LDAP user selected)
- Edit pane: only properties pane (basic info) is enabled; all other UI (Member Of, Roles except Administrator Permissions) is **disabled**
- Administrator Permissions pane: **Add button enabled**, Remove button disabled until selection
- **(validates referenced Organization_Properties.xls behavior without generating separate scenarios)**

---

#### TC-005 Theme inheritance priority: User > Group > Role `P1` `[Feature]`

**Scope:** Theme assignment and priority resolution across identities
**Validates rule:** R6

**Pre-conditions:** Three custom themes exist: ThemeA, ThemeB, ThemeC. Default theme exists. Logged into EM as admin.

**Steps:**

1. Create role `ThemeRole` → set Theme = ThemeC → Apply
2. Create group `ThemeGroup` → set Theme = ThemeB → Apply
3. Create user `ThemeUser` → set Theme = ThemeA → Apply
4. Add `ThemeUser` to `ThemeGroup`
5. Add `ThemeGroup` to `ThemeRole` (or assign `ThemeRole` to `ThemeGroup`)
6. Log into Portal as `ThemeUser` → verify applied theme
7. Change `ThemeUser` theme to Default → re-login → verify theme
8. Change `ThemeGroup` theme to Default → re-login → verify theme

**Expected:**

- Step 6: Portal shows **ThemeA** (User theme wins)
- Step 7: Portal shows **ThemeB** (Group theme applies because User theme = Default)
- Step 8: Portal shows **ThemeC** (Role theme applies because User = Default, Group = Default)

---

#### TC-006 System Admin impersonates another user (Login As) with full audit `P1` `[Permission]` `[Cross-Module]`

**Scope:** Login As feature – EM, Portal, Studio, Monitor, Audit
**Validates rule:** Security (login.loginAs=on), R2

**Pre-conditions:** `login.loginAs=on` in sree.properties, logged into EM as System Admin (user1), target user (user0) exists

**Steps:**

1. In EM, click User Options → Login As → select `user0` → Login
2. In Portal, click Account → verify username
3. Create a new worksheet → save to user scope
4. Create a new schedule task
5. In EM, open Monitor/Dashboards/Open Dashboards → check User column
6. Open Audit/Logon Errors → verify entries
7. Change password for `user0`
8. Log out, then log in as `user0` with new password
9. Check Server log for user context

**Expected:**

- Portal Account shows **user0** (not user1)
- New worksheet saved under `user0` folder in EM → Report → User
- Schedule task owner = `user0`
- Monitor shows `user0` as user
- Audit Logon Errors shows `user0` (not user1)
- Password successfully changed and works for `user0`
- Server log entries reference `user0`

---

#### TC-007 Role inheritance grants System Administrator permissions `P1` `[Permission]`

**Scope:** Role inheritance from System Administrator role
**Validates rule:** R7

**Pre-conditions:** Logged into EM as admin, System Administrator role exists

**Steps:**

1. Create new role `InheritedAdmin`
2. In Inherit From pane → Add Role → select Administrator role → OK → Apply
3. Create new user `InheritUser` → set password → Assign `InheritedAdmin` role → Apply
4. Log out of EM
5. Log into EM as `InheritUser`
6. Log into Portal as `InheritUser`
7. Log into Studio as `InheritUser`

**Expected:**

- `InheritedAdmin` role inherits all permissions of Administrator role
- `InheritUser` can log into EM successfully
- `InheritUser` can log into Portal with all tabs enabled
- `InheritUser` can log into Studio and see datasource, worksheet, library
- **(fixes Bug #47909)**

---

#### TC-008 Add multiple emails via Select Emails dialog and test mail delivery `P2` `[CRUD]`

**Scope:** Email address management and mail test
**Validates rule:** Multiple email format (comma-separated), test mail delivery

**Pre-conditions:** Mail server configured, SMTP working

**Steps:**

1. Create new user → Email Addresses field → click Select Emails icon
2. In dialog, input `user1@test.com, user2@test.com` → Add Email
3. Verify both appear in Emails list
4. Click OK → return to main Email Addresses field (comma-separated)
5. Click Test Mail icon → verify recipients receive mail
6. Delete one email from main field → open Select Emails dialog → verify email removed from list

**Expected:**

- Multiple addresses parsed and added correctly
- Test mail sent to all email addresses
- Deletion syncs between main field and dialog

---

#### TC-009 Disable user account and verify login rejection `P2` `[State]`

**Scope:** Active flag behavior across EM, Portal, Studio
**Validates rule:** R8

**Pre-conditions:** Test user `DisableUser` exists with password, active=true

**Steps:**

1. Log into EM as admin
2. Select `DisableUser` → uncheck Active checkbox → Apply
3. Attempt to log into EM as `DisableUser`
4. Attempt to log into Portal as `DisableUser`
5. Attempt to log into Studio as `DisableUser`
6. Return to EM, re-enable Active → Apply
7. Attempt login again

**Expected:**

- Steps 3-5: Login rejected (invalid credentials or account disabled)
- Step 7: Login successful for all three interfaces

---

#### TC-010 Non-System Admin with explicit loginas permission can impersonate managed users `P2` `[Permission]`

**Scope:** Granular Login As permission without full System Admin role
**Validates rule:** Security (login.loginAs=on), "user1 can manage user0"

**Pre-conditions:** `login.loginAs=on`, user0 exists, user1 does NOT have System Admin role but has administrator permission over user0 and has loginas permission on action->loginas

**Steps:**

1. Log into EM as user1
2. Check User Options for "Login As" option
3. If visible, select user0 and impersonate
4. Verify same cross-pane checks as TC-006 (account name, saved artifacts, audit logs)

**Expected:**

- Login As option is **visible** (not just for System Admins)
- Impersonation works and all actions execute as user0
- Confirms that loginas permission is sufficient regardless of System Admin role

---

#### TC-011 Multi-Tenancy disabled: configure providers without organization info `P1` `[Multi-Tenant]`

**Scope:** Baseline provider configuration when Multi-Tenancy is disabled
**Validates rule:** Multi-tenancy disabled = organization field not required

**Pre-conditions:** Multi-Tenancy setting = disabled

**Steps:**

1. Navigate to Security Provider configuration
2. Configure an LDAP provider (bind DN, URL, search base)
3. Do NOT provide any organization information
4. Save configuration
5. Repeat for Database provider, Custom provider

**Expected:**

- All three providers save successfully without organization field
- System does not prompt for organization information
- **(Baseline confirmation; full multi-tenant scenarios are in Organization_security.xlxs as referenced)**

---

#### TC-012 Bug Regression: Theme combobox missing for LDAP/Database/Custom users `P2` `[Bug Regression]`

> **Bug #53382** — Theme combobox was not shown when creating/editing users from LDAP, Database, or Custom providers.

**Regression focus:** Verify that for non-Primary providers, theme combobox is hidden (as designed for read-only users) and default theme is applied silently.

**Pre-conditions:** Non-Primary provider (e.g., LDAP) configured and selected in User tab

**Steps:**

1. In User tab with LDAP provider selected, edit an existing user
2. Observe the Theme combobox visibility
3. Log into Portal as that LDAP user
4. Observe applied theme

**Expected:**

- Theme combobox is **not visible** in edit pane for LDAP/Database/Custom providers
- Portal displays **default theme** for the user
- Correct behavior: combobox should not appear; default theme applied automatically

## Uncovered Rules

> The following rules have no P1/P2 scenario coverage. P3 rules (UI/format validation) are discarded.


| Rule ID | Rule Description                                      | Priority | Reason / Suggested Fix                                                                                                                   |
| ------- | ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| R-009   | Duplicate name validation on user/group/role creation | P3       | Discarded – pure frontend validation (popup "Duplicate name found!"); no backend business rule violation without API test                |
| R-010   | Special character validation for Name/Alias fields    | P3       | Discarded – UI format validation; backend likely accepts via escaped input. Not a boundary condition with business impact                |
| R-011   | Login As failure logging in Failed Logins audit       | P3       | Discarded – referenced in Excel but marked "not recorded when login as user name error"; negation test without clear acceptance criteria |


## Clarification Needed


| Item                            | Location                                                                         | Issue                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider order sorting          | OverView-rapid testing, row "2.sort by provider order"                           | No acceptance criteria provided for "provider order" – does it mean alphabetical, creation order, or configurable priority? Impacts TC-004 provider dropdown validation.                  |
| Multi-Tenancy enabled reference | OverView-rapid testing, row "enabled Multi-Tenancy,请看Organization_security.xlxs" | External file not provided. Baseline scenarios assume multi-tenancy disabled. Full isolation testing (cross-org user visibility, org-scoped roles) cannot be performed without that file. |


## Related Module Tests


| Related Module                 | Relationship             | Suggested Extension                                                                                          |
| ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Organization_security.xlxs     | Multi-tenancy isolation  | Run TC-001 through TC-010 with multiple orgs: verify users see only same-org identities and roles            |
| Login / Authentication         | Login As and Active flag | Run TC-006 and TC-009 after Login module to ensure session handling and password policies are respected      |
| Report / Worksheet / Dashboard | Permission propagation   | Run TC-001/TC-007 after Content module to verify System Admin / inherited roles can access all content items |


