---
module: Security Provider - User/Group/Role Management
source: SecurityProvider_Manual.xlsx
path: two-phase
complexity-score: 8
last-updated: 2026-04-28
---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | 47 |
| Kept P1 | 12 |
| Kept P2 | 6 |
| Needs clarification | 1 |

## Feature Summary

This feature manages users, groups, and roles across security providers (Primary LDAP/Database/Custom). Primary problems: (1) UI behavior changes based on provider's primary status, (2) permission inheritance via groups/roles works across components (EM/Portal/Studio), (3) multi-tenancy toggles organizational isolation. Core objects are User, Group, Role, Permissions.

## Rules & Notes

### Business Rules
- **Provider primary status:** Only primary provider allows full edit pane; non-primary disables New/Delete and most UI, leaving only Administrator Permissions pane.
- **Delete constraints:** Cannot delete last system admin user, cannot delete your own logged-in user, cannot delete group containing users—users must be removed first.
- **Role defaults:** `Default=true` role auto-assigns to new users (Everyone). `System Administrator=true` grants full system access (EM/Portal/Studio).
- **Role inheritance:** `Inherit from` grants all permissions from ancestor roles (e.g., Designer inheriting Administrator).
- **Themes:** Priority User > Group > Role. LDAP/Database/Custom providers apply default only; GUI-created users have full Theme combobox.
- **Login As:** Requires `login.loginAs=on` and either System Administrator role or Manage permission on target user + explicit loginas action grant.

### Security & Multi-Tenancy 
- **security=false:** Login As invisible, users manage only primary provider, groups/roles load across providers.
- **security=true:** Login As visible for qualified users, Administrator Permissions pane controls who can manage whom.
- **multi-tenant (disabled):** No org info required for LDAP/database/custom; no org-specific actions loaded (e.g., no presentation org settings).
- **multi-tenant (enabled):** Refer to Organization_security.xlsx—org isolation enforced.

### Known Risks / Special Cases
- Bug #53382: Theme combobox bug when creating user via GUI.
- Bug #47909: Role inheritance previously failed to grant permissions (fixed).
- Special characters allowed: `$&_-+.@'` for user alias; groups/roles also allow `()`.
- Password rule: ≥8 chars, must include ≥1 number + ≥1 letter or non-alphanumeric.
- Duplicate email check across both main field and dialog.

## Scenario Overview

| ID | Priority | Area | Scenario | Key Business Assertion |
|----|----------|------|----------|----------------------|
| TC-001 | P1 | Provider | Non‑primary provider restricts user/group/role edits | Users created in primary provider, not non‑primary |
| TC-002 | P1 | Permission | Role inheritance grants permissions cascade | Inheritor role gets ancestor's full permissions |
| TC-003 | P1 | Delete | Can't delete last system administrator | Delete blocked with error message |
| TC-004 | P1 | Delete | Can't delete group containing users | Delete blocked, requires user removal first |
| TC-005 | P1 | Cross‑component | Login As preserves target user's data ownership | Assets saved as target user, visible to target but not admin |
| TC-006 | P1 | Permission | System Administrator role grants full access | User can log into EM/Portal with all tabs enabled |
| TC-007 | P1 | Theme | Theme priority User > Group > Role | Highest‑priority theme setting applied at login |
| TC-008 | P1 | Multi‑tenant | Org isolation for primary vs non‑primary | Org‑specific actions load only when multi‑tenancy enabled |
| TC-009 | P2 | Validation | Name & email duplicate + special char handling | Duplicate rejected, allowed special chars accepted |
| TC-010 | P2 | Login As | Login As invisible with security=false / incorrect password | UI hides when condition fails |
| TC-011 | P2 | Sync | Group‑member bidirectional sync | Adding group to user updates user in group's Members |
| TC-012 | P2 | Email | Multi‑email via comma + delete from either pane syncs both | Emails list stays consistent across UI |

## Scenarios

#### TC-001 Non‑primary provider restricts user/group/role edits `P1`

**Scope:** User tab in EM, provider selection
**Validates rule:** Non‑primary provider → New/Delete disabled, only Administrator Permissions pane enabled.

**Pre-conditions:**
- Two providers configured: Primary (e.g., Database) and Non‑primary (e.g., LDAP)
- EM logged in as admin (System Administrator role)

**Steps:**
1. In EM, open Security → Users. Switch provider selector to **Non‑primary** provider.
2. Verify New User/Group/Role buttons are **disabled** (grayed out).
3. Select any existing user from the tree (loaded from this provider).
4. **Check edit pane:** Verify only "Administrator Permissions" pane has enabled controls; all other panes (Roles, Member Of, etc.) are disabled.
5. Verify Delete button is **disabled** even after selecting a node.
6. Switch provider selector to **Primary** provider.
7. Verify New User/Group/Role buttons are **enabled**.
8. Select any user and verify edit pane is fully editable.

**Expected:**
- Non‑primary provider restricts user/group/role lifecycles (create, edit, delete) but allows permission management.
- Primary provider allows full management.

---

#### TC-002 Role inheritance grants permissions cascade `P1`

**Scope:** Role tab, Inherit from pane
**Validates rule:** Role inheriting from another role gets all permissions of the ancestor role (Bug #47909 regression).

**Pre-conditions:**
- EM logged in as admin
- Roles exist: Administrator (System Admin=true), Designer, Viewer

**Steps:**
1. Open Security → Roles. Select "Designer" role.
2. In Inherit from pane, click Add → select "Administrator" role → OK → Apply.
3. Create a new user "InheritTester" (in Primary provider) and assign only the "Designer" role (no direct System Administrator).
4. Log out of EM. Log back in as InheritTester.
5. Attempt to navigate: EM → Monitor, Security tabs (should be visible if permissions inherited). Portal → all tabs should be enabled.
6. Optional: Verify InheritTester can see user list (Administrator permission), indicating full inheritance.

**Expected:**
- InheritTester (only Designer role) has Administrator permissions due to inheritance → can access EM Security tab, Monitor, and all Portal tabs.

---

#### TC-003 Cannot delete the last system administrator `P1`

**Scope:** User tab, Delete button on admin user
**Validates rule:** "Cannot delete selected identities. The last system administrator cannot be removed."

**Pre-conditions:**
- Only one System Administrator role exists, assigned to "admin" user.
- Primary provider selected.

**Steps:**
1. In EM, go to Security → Users. Select "admin" user from tree.
2. Click Delete button.
3. Observe error message.

**Expected:**
- Error message displayed: "Cannot delete selected identities. The last system administrator cannot be removed."
- Admin user still exists in tree after operation.

---

#### TC-004 Cannot delete group containing users `P1`

**Scope:** Group tab, Delete button on group with members
**Validates rule:** "Cannot remove a group containing user(s). Please remove all users from group first."

**Pre-conditions:**
- Group "TestGroup" exists with at least one user member (e.g., "testuser1").
- Primary provider selected.

**Steps:**
1. EM → Security → Groups. Select "TestGroup" from tree.
2. Click Delete button.
3. Observe error message.
4. Open TestGroup edit pane → Members pane. Select the user and click Remove → Apply.
5. Delete the group again.

**Expected:**
- First delete attempt fails with group‑contains‑user error message.
- After removing all users, delete succeeds.

---

#### TC-005 Login As preserves target user's data ownership `P1`

**Scope:** Cross‑component: EM login + Portal asset ownership + Monitor/Audit
**Validates rule:** When admin logs in as another user, new assets are owned by target user, not admin.

**Pre-conditions:**
- `login.loginAs=on` in sree.properties
- User "admin" (System Administrator role) and regular user "targetUser" exist.
- EM accessed as admin.

**Steps:**
1. Admin in EM: Click User Options → Login As → Select "targetUser".
2. **Portal action:** Create a new worksheet (WS) "TestWS". Save to user scope (targetUser's personal folder).
3. **EM action:** Return to EM (still as targetUser). Go to Monitor → Users → Sessions — verify user column shows "targetUser".
4. Log out. Log in directly as targetUser (password). Verify "TestWS" appears in Portal → My Worksheets.
5. Log out. Log in as admin. Verify "TestWS" does **not** appear in admin's portal or EM → Report → User → targetUser folder (admin sees the folder but not as own asset).

**Expected:**
- Asset (TestWS) owned by targetUser, visible to targetUser, not visible in admin's personal workspace.
- EM Monitor shows correct login‑as user.

---

#### TC-006 System Administrator role grants full access `P1`

**Scope:** EM + Portal + Studio access
**Validates rule:** User with System Administrator role can do everything.

**Pre-conditions:**
- User "fullAdmin" created, assigned any role with System Administrator=true.
- Password set.

**Steps:**
1. Log into EM as fullAdmin. Verify all top‑level tabs visible: Security, Monitor, Audit, etc.
2. Log into Portal as fullAdmin. Verify all tabs enabled.
3. Log into Studio as fullAdmin. Verify Datasource, Worksheet, Library are visible and editable.

**Expected:**
- Full access in all three interfaces.

---

#### TC-007 Theme priority User > Group > Role `P1`

**Scope:** User login portal appearance, Theme combobox
**Validates rule:** User's own theme overrides group theme, which overrides role theme. Fallback: group theme > role theme > default.

**Pre-conditions:**
- Multi‑theme configured in general settings.
- Themes available: "Light", "Dark", "Corporate".
- GUI‑created user (Theme combobox available). LDAP/Database/Custom users apply default theme only.

**Steps:**
1. Assign Role R1 theme = "Light". Assign Group G1 theme = "Dark". User U1 has no theme (Default).
   - Login as U1 → portal uses Group theme "Dark" because user is default.
2. Assign U1 theme = "Corporate".
   - Login as U1 → portal uses User theme "Corporate" (user overrides group).
3. Clear U1 theme (Default). Remove group theme from G1 (Default). Keep role theme "Light".
   - Login as U1 → portal uses role theme "Light".

**Expected:**
- Priority: User theme > Group theme > Role theme > Default. Works as described.

---

#### TC-008 Org‑specific actions load only when multi‑tenancy enabled `P1`

**Scope:** Action bar, Org settings visibility
**Validates rule:** When Multi‑Tenancy disabled, org‑specific actions (e.g., presentation org settings) are not loaded.

**Pre-conditions:**
- Multi‑Tenancy setting: **disabled**.
- EM logged in as admin.

**Steps:**
1. Navigate to any Security → User/Group/Role edit pane.
2. Inspect action dropdowns/presentation options for any "Organization" or "Org settings" entries.
3. **If possible**: Compare with a system where Multi‑Tenancy is enabled (refer to Organization_security.xlsx) — org actions would appear.

**Expected:**
- No org‑specific actions appear anywhere in UI when Multi‑Tenancy disabled.

---

#### TC-009 Name & email duplicate + special char handling `P2`

**Scope:** User/Group/Role Name field, Email Addresses field
**Validates rule:** Duplicate names rejected; special chars allowed; email duplicates rejected.

**Pre-conditions:**
- Primary provider selected.

**Steps:**
1. **Name duplicate:** Try to create user with name "admin" (existing). Verify pop‑up "Duplicate name found!".
2. **Special chars (allowed):** Create user name "test+user@company" (allowlist: `$&_-+.@'`). Verify success.
3. **Email duplicate:** Edit user, add email "dupe@test.com". Save. Open same user, try to add "dupe@test.com" again (Select Emails → Add Email). Verify "Email already added." pop‑up.
4. **Email comma separate:** In Email Addresses field, type "a@b.com,c@d.com". Save. Open Select Emails dialog — both appear.

**Expected:**
- Duplicate rejection, allowed special chars accepted, email list handles multiple entries.

---

#### TC-010 Login As invisible with security=false or missing permissions `P2`

**Scope:** User Options → Login As menu
**Validates rule:** Login As visible only when `login.loginAs=on` + user is System Administrator (or has manage permission + loginas action) + correct password.

**Pre-conditions:**
- `login.loginAs=off` initially.

**Steps:**
1. EM logged in as admin. Click User Options — verify "Login As" is **invisible**.
2. Set `login.loginAs=on` (restart required). Relog admin. Verify "Login As" now **visible**.
3. Login as a non‑admin user (no System Administrator role). Verify "Login As" **invisible** even with `login.loginAs=on`.
4. As admin, set `login.loginAs=on` but enter incorrect password. Verify login fails entirely (no Login As option at login screen).

**Expected:**
- Visibility strictly tied to config + role + authentication.

---

#### TC-011 Group‑member bidirectional sync `P2`

**Scope:** User edit pane (Member Of) ↔ Group edit pane (Members)
**Validates rule:** Adding group to user also adds user to group's Members list, and vice versa.

**Pre-conditions:**
- User "syncUser" and Group "syncGroup" exist, no memberships yet.

**Steps:**
1. Edit syncUser → Member Of pane → Add Group → select syncGroup → OK → Apply.
2. Open syncGroup edit pane → Members pane. Verify syncUser appears.
3. Back to syncUser → Member Of pane. Remove syncGroup → Apply.
4. Verify syncGroup → Members pane — syncUser removed.
5. Reverse: Edit syncGroup → Members pane → Add User → select syncUser → OK → Apply.
6. Verify syncUser → Member Of pane shows syncGroup.

**Expected:**
- Bidirectional sync works identically regardless of which side initiates.

---

#### TC-012 Email sync between main field and Select Emails dialog `P2`

**Scope:** User email management
**Validates rule:** Adding/deleting email in main field updates dialog, and vice versa.

**Pre-conditions:**
- User "emailUser" exists.

**Steps:**
1. Open emailUser. In Email Addresses main field, type "main1@test.com,main2@test.com" → Apply.
2. Click Select Emails icon. Verify both emails appear in the dialog's list.
3. In dialog, delete "main1@test.com" → OK. Verify main field now shows only "main2@test.com".
4. In main field, delete "main2@test.com" → Apply.
5. Open Select Emails dialog. Verify list empty.

**Expected:**
- Emails list synchronized bidirectionally.

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| Role inheritance transitive chain | user sheet, Role section | Excel mentions "select a role's inherit from designer role" but doesn't specify multi‑level inheritance depth (e.g., Role A inherits from B, B inherits from C). Need to confirm if transitive inheritance is allowed or only direct. |

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Login As based on System Administrator role or manage permission + action grant | Run Login As scenarios after Security permission assignment tests |
| Multi‑Tenancy | Org-specific actions and isolation | Run TC-008 before enabling multi‑tenancy; full org tests in Organization_security.xlsx |
| LDAP Provider | User sync, Theme limitations (no combobox) | Run TC-007 specifically with LDAP‑synced user to verify default theme only |