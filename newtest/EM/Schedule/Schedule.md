---
module: Scheduler
source: Schedule.xlsx
Excel-path: direct
last-updated: 2026-05-28

---

## Filtering Summary

| Category                    | Count |
|-----------------------------|-------|
| Discarded UI scenarios      | 12    |
| Kept P1                     | 34    |
| Kept P2                     | 7     |
| Needs clarification         | 3     |
| P3 Manual-Only Test Points  | 9     |

---

## Feature Summary

The Scheduler module allows administrators and users to automate report/dashboard delivery via scheduled tasks with conditions (Daily/Weekly/Monthly/Hourly/Run Once/Chained) and actions (Dashboard delivery, Backup, Batch). Both EM and Portal provide independent code implementations of nearly identical scheduling UIs; all functionality must be verified on both sides. Schedule Settings (global configuration including email server, time ranges, server save paths) affect all task execution behavior.

---

## Manual Testing Summary

> 手工测试执行指引。详细场景见下方 Scenarios，本部分仅提供方向和重点。

### 核心规则 (一句话理解)

- **EM Task** = 管理员在 EM 创建，Portal 按权限显示（仅显示当前用户的 task）
- **Portal Task** = 用户在 Portal 创建，EM 按权限显示（admin 可见所有）
- **security=true** → EM 加载 task owner 有权限的所有 task；Portal 仅加载当前 user 的 task
- **security=false** → 所有 user 共享 task，需验证基础 CRUD 和 batch/chained action load

### 测试重点 (按优先级)

| 优先级 | 测试方向 | 关键验证点 |
|--------|----------|-----------|
| P1 | 完整 CRUD (security=true) | 创建/编辑/删除/移动 task 后，EM ↔ Portal 两端同步 |
| P1 | 全类型 Condition | Daily/Weekly/Monthly/Hourly/Run Once/Chained，重点 time zone 和 start time |
| P1 | Dashboard Action | Email Delivery/Save to Disk/Notification，注意 format 和 bookmark 组合 |
| P1 | Data Cycle CRUD | 创建/编辑/删除 cycle，含 notification 和 security tab |
| P1 (多租户) | Org 隔离 | Site admin 切换 org 操作 task；clone org 后 task 可运行 |
| P2 | security=false 差异 | 基础 task CRUD 和 chained/batch action load (bug#67741, bug#67777) |

### 容易出问题的地方 (测试时重点关照)

1. **Start Time + Time Zone 组合**：切换 condition 类型后 time zone 需恢复默认值；EM/Portal 保存后重新打开需保持一致 (bug#68809, bug#55813)
2. **Show Server Time Zone (Portal)**：切换此选项会改变 time zone combobox 状态，影响其他 task condition；需验证 check on/off 转换正确
3. **Hourly/Run Once condition 来回切换**：容易丢失 start time 或 end time 数据 (#69420, #69200, #69174, #69269)
4. **Batch/Backup action task 在 Portal 不显示**：在 EM 创建含 batch/backup action 的 task 后，Portal task 列表不应出现该 task
5. **Internal task 限制**：Asset File Backup 可编辑 condition 和 option，但 Action tab 和 Name 字段禁用；Balance Tasks 和 Update Asset Dependencies 只能 enable/disable
6. **Clone Org 后 task 可运行**：time range task 不会被 clone（normal org 不支持 time range）

### 必做联动模块测试

| 联动模块 | 测试场景 | 最少用例数 |
|----------|----------|-----------|
| Security / 权限 | Schedule Options 权限控制 action 显示 | 2 |
| Organization / Switch Org | Site admin 切换 org 后 new/edit task | 2 |
| Organization / Clone Org | Clone org 后 task 被 clone，验证可执行 | 1 |
| MV / Data Cycle | Cycle 与 MV 关联，删除被使用的 cycle 报错 | 1 |
| Simple Schedule | Portal/Composer 触发 simple schedule | 1 |

---

## Environment Differences

| Behavior | security=true | security=false | multi-tenant |
|----------|--------------|----------------|--------------|
| EM task loading | All tasks user has permission for owner | All tasks | Tasks within own org |
| Portal task loading | Only current user's tasks | All tasks | Only current user's org tasks |
| Batch/Backup action | EM only, Portal hides tasks with these | EM only | EM only |
| Internal tasks | EM only (with Internal Schedule Tasks permission) | EM only | EM only (site admin) |
| Show Server Time Zone | Portal only | Portal only | Portal only |
| Share Tasks Between Users in Same Group | Visible in settings | Hidden | Within org only |
| Settings page | Site admin + org admin | N/A | Site admin only |
| Status page | Site admin (unless CloudRunner configured) | N/A | Site admin only |

---

## Scenario Overview

### Env: security=true (完整 CRUD + 差异验证)

| ID | Priority | Scenario | Key Business Assertion |
|----|----|----------|----------------------|
| TC-001 | P1 | Task CRUD via EM — create/edit/move/delete with Portal sync `[CRUD][Cross-Module]` | Task state consistent across EM and Portal after every operation |
| TC-002 | P1 | Task CRUD via Portal — create/edit/delete with EM sync `[CRUD][Cross-Module]` | EM reflects Portal changes; Portal condition description updates on change |
| TC-003 | P1 | Daily Condition — EM create → Portal sync → Portal re-edit → EM sync `[CRUD][Cross-Module]` | Start time, time zone, interval/weekdays saved and synced correctly |
| TC-004 | P1 | Weekly Condition — Portal create → EM sync → EM re-edit → Portal sync `[CRUD][Cross-Module]` | Days of week selection, N-week interval preserved across sides |
| TC-005 | P1 | Monthly Condition — EM create → Portal sync → Portal re-edit → EM sync `[CRUD][Cross-Module]` | Day-of-month and Week-of-month selection preserved; months list correct |
| TC-006 | P1 | Hourly Condition — Portal create → EM sync → EM re-edit → Portal sync `[CRUD][Cross-Module]` | Start/end time validation; days of week; no data loss on round-trip |
| TC-007 | P1 | Run Once Condition — EM create → Portal sync `[CRUD][Cross-Module]` | One-time execution with correct date/time; 'Delete if not scheduled to run again' behavior |
| TC-008 | P1 | Chained Condition — Portal create → EM sync; cascade delete blocked `[CRUD][Cross-Module]` | Chained task triggers after parent completes; delete blocked with error |
| TC-009 | P1 | Dashboard Action — Email Delivery: EM create → Portal sync → Portal re-edit → EM sync `[CRUD][Cross-Module]` | To/CC/BCC addresses, subject, format, bookmark saved; task executes and delivers |
| TC-010 | P1 | Dashboard Action — Save to Disk: Portal create → EM sync → EM re-edit → Portal sync `[CRUD][Cross-Module]` | Server save path applied; file saved correctly on execution |
| TC-011 | P1 | Dashboard Action — Notification of Task Status: EM create → Portal sync `[CRUD][Cross-Module]` | Notification emails sent on success/failure per 'Notify only if failed' setting |
| TC-012 | P1 | Multi-Condition + Multi-Action task (CRUD) `[CRUD][Cross-Module]` | Multiple conditions and actions save/load correctly on both sides |
| TC-013 | P1 | Highlight Alert — variable/field/expression; multiple highlights on one assembly `[CRUD]` | Alert triggers action only under selected highlight conditions |
| TC-014 | P1 | Batch Action — EM only: create, edit, delete; task hidden in Portal `[CRUD]` | Batch action loads correct tasks; Portal does not display task |
| TC-015 | P1 | Backup Action — EM only: create, edit, delete; task hidden in Portal `[CRUD]` | Backup action loads org-scoped assets; Portal does not display task |
| TC-016 | P1 | Folder CRUD — new/edit/delete/move folders; admin-only restriction `[CRUD][Cross-Module]` | Non-admin cannot create folders; drag-move works; folder with tasks moves tasks |
| TC-017 | P1 | Run Now / Stop Now task execution `[CRUD]` | Task can be manually started/interrupted; correct errors when scheduler stopped or task disabled |
| TC-018 | P1 | Disable / Enable task — strikethrough display; blocked operations `[CRUD][Cross-Module]` | Disabled task shows strikethrough on both sides; Run Now blocked with message |
| TC-019 | P1 | Time Zone in condition — change zone, save, reopen; EM/Portal sync `[CRUD][Cross-Module]` | Time converted to equivalent in new zone; task list schedule column updates (bug#55733, bug#55723) |
| TC-020 | P1 | Internal Tasks (EM) — Asset File Backup editability; Balance Tasks restrictions `[CRUD]` | Asset File Backup allows condition/option edit only; Balance Tasks cannot be edited/moved/deleted (Disable/Enable only) |
| TC-021 | P1 | Distribution Chart (EM) — week/day/hour drill-down; task list filter by bar `[CRUD]` | Chart counts correct by condition type; chart updates after add/edit/delete task |
| TC-022 | P1 | Data Cycle CRUD — create/edit/delete with MV dependency check `[CRUD]` | Cycle with MV dependency cannot be deleted; rename blocked if used by MV |
| TC-023 | P1 | Data Cycle Notification — Start/Completion/Failure/Threshold emails `[CRUD]` | Emails sent with correct subject/content per notification type |
| TC-024 | P1 | Simple Schedule — trigger from Portal toolbar, verify task created in Schedule tab `[CRUD][Cross-Module]` | Bookmark, format, condition correctly reflected in generated task; task runs successfully |
| TC-038 | P1 | Creation Parameters — parameterized VS in Dashboard action: add/edit/delete params; Dynamic Dates expression; EM↔Portal sync `[CRUD][Cross-Module]` | Parameters set in Creation Parameters tab override VS defaults at task execution; sync correctly across sides |
| TC-039 | P2 | Batch Action — Parameters: Embedded Mode UI `[CRUD]` | Embedded checkbox gates edit access; dialog chain (Parameters Table → Edit Parameters Dialog → Add Parameter Dialog) and all CRUD operations correct |
| TC-040 | P2 | Batch Action — Parameters: Query Mode UI `[CRUD]` | Query dropdown loads only worksheets with tables; Parameters section maps VS parameters to query columns; config persists after save/reopen |
| TC-041 | P2 | Execute As — Permission Enforcement and VPM `[CRUD]` | Execute As user with no read permission → task fails with access denied; VPM applied to Execute As user, not task owner |
| TC-042 | P2 | Task Options — Owner Field Admin Change `[CRUD]` `[Cross-Module]` | EM admin can reassign task owner; Portal Owner field always disabled showing current user |

### Env: security=false (仅差异验证)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC-026 | P2 | Task basic CRUD in no-security mode (EM + Portal) `[CRUD][env-diff]` | Tasks visible to all users; basic create/edit/delete/move works on both sides (bug#67741, bug#67777) |
| TC-027 | P2 | Chained condition load/save in no-security mode `[CRUD][env-diff]` | Chained condition references and saves correctly without security (bug#67741) |
| TC-028 | P2 | Batch action task load/save in no-security mode (EM) `[CRUD][env-diff]` | Batch action loads and saves tasks correctly without security (bug#67777) |

### Env: multi-tenant (完整 CRUD)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC-029 | P1 | Site admin creates/edits/deletes tasks for another org via org switch `[CRUD][Multi-Tenant]` | Task owner defaults to first org admin; tasks isolated per org |
| TC-031 | P1 | Internal tasks visible only to site admin; org users cannot see them `[Multi-Tenant]` | Internal tasks absent from org user's task list on both EM and Portal |
| TC-032 | P1 | Task data isolation between two orgs — org A tasks not visible to org B `[Multi-Tenant]` | Org B user cannot see or access org A tasks via URL or list |

### Schedule Settings (placed last per Rule S-3)

| ID | Priority | Scenario                                                                                                                                 | Key Business Assertion |
|----|----------|------------------------------------------------------------------------------------------------------------------------------------------|----------------------|
| TC-025 | P1 | Schedule Settings — Share Tasks Between Users in Same Group — enable setting, verify visibility and edit rules `[Feature][Cross-Module]` | Users in same group see shared tasks; 'Edit By Owner Only' restricts editing |
| TC-033 | P1 | Schedule Settings — Scheduler Options: toggle each option, verify impact on task actions `[CRUD]`                                        | Notification Email/Save to Disk/Email Delivery/Enable Email Browser each control corresponding action visibility |
| TC-034 | P1 | Schedule Settings — Notification: configure failure/down alerts, verify emails sent `[CRUD]`                                             | Emails sent to configured addresses with correct subject/message on task failure and scheduler down |
| TC-035 | P1 | Schedule Settings — Time Ranges: add/edit/delete ranges; apply to task condition `[CRUD]`                                                | Time range appears in task Daily/Weekly/Monthly condition; default ranges persist after restart |
| TC-036 | P1 | Schedule Settings — Server Save Paths: add/edit/delete local and FTP paths; apply to Save to Disk action `[CRUD]`                        | Task saves report to correct path; editing label/path updates task action display |
| TC-037 | P1 | Schedule Settings — Scheduler Status: Start/Stop/Restart; Run Now blocked when stopped `[CRUD]`                                          | Status transitions correct; thread dump and heap dump generated; settings warning shown on Apply |

---

## Scenarios

### Env: security=true

---

#### TC-001 Task CRUD via EM with Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** EM Scheduler Tasks Tab ↔ Portal Schedule Tab

**Validates rule:** EM and Portal run independent code; all CRUD operations must be mirrored; auto-refresh keeps both sides in sync

**Pre-conditions:** security=true; logged in as admin on both EM and Portal; scheduler running

**Steps:**
1. In EM > Scheduler > Tasks Tab, click the folder dropdown and select "New Folder"; name it "TestFolder_TC001".
2. Inside "TestFolder_TC001", create a new task "Task_TC001" with a Daily condition (default start time) and a Dashboard action (select any available dashboard).
3. Save the task and verify it appears in EM task list under "TestFolder_TC001".
4. **Sync check:** Portal Schedule tab — task "Task_TC001" is visible in the task list.
5. In EM, click the task name link to edit; change the task name to "Task_TC001_Edited" and save.
6. **Sync check:** Portal Schedule tab — task name updated to "Task_TC001_Edited"; Portal "Schedule" column reflects updated condition.
7. In EM, select the task and click "Move Task"; move it to the root Tasks node.
8. **Sync check:** Portal — task now appears at root level.
9. In EM, select the task and click "Delete"; confirm the dialog "Are you sure you want to delete this schedule?".
10. **Sync check:** Portal — "Task_TC001_Edited" is no longer visible.
11. In EM, delete "TestFolder_TC001".

**Expected:**
- Folder and task create/edit/move/delete all succeed in EM without errors.
- Portal reflects every change without manual refresh (auto-refresh mechanism working).
- Confirm dialog text matches "Are you sure you want to delete this schedule?".

---

#### TC-002 Task CRUD via Portal with EM Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Portal Schedule Tab ↔ EM Scheduler Tasks Tab

**Validates rule:** Portal changes propagate to EM; Portal condition description (Schedule column) updates when task condition changes

**Pre-conditions:** security=true; logged in as admin; scheduler running

**Steps:**
1. In Portal > Schedule tab, click the Edit button to create a new task "Task_TC002" with a Daily condition and a Dashboard action (select any available dashboard).
2. Save and verify task appears in Portal task list.
3. **Sync check:** EM Scheduler Tasks Tab — "Task_TC002" is visible.
4. In Portal, click the Edit button for "Task_TC002"; change the task name to "Task_TC002_Edited".
5. Save and verify Portal shows updated name.
6. **Sync check:** EM — task name updated to "Task_TC002_Edited".
7. In Portal, edit the task again; change the condition to Weekly (select at least one day of week); save.
8. **Sync check:** Portal "Schedule" column — condition description shows "Weekly"; EM condition updated accordingly.
9. In Portal, click "Delete" next to the task and confirm deletion.
10. **Sync check:** EM — "Task_TC002_Edited" is no longer in the task list.

**Expected:**
- Task creates/edits/deletes successfully in Portal.
- EM reflects all name changes and condition description changes.
- When no changes are made, Portal shows "Task saved successfully." but Save button behavior reflects no-change state.

---

#### TC-003 Daily Condition — EM Create → Portal Sync → Portal Re-edit → EM Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Daily type; EM ↔ Portal

**Validates rule:** Daily condition (Start Time, Time Zone, Interval, Weekdays) saves and syncs correctly; switching condition type resets time zone/start time to default

**Pre-conditions:** security=true; admin login on both EM and Portal; scheduler running; server timezone = UTC (Coordinated Universal Time)

**Steps:**
1. In EM, create task "Task_Daily_TC003"; select Daily condition.
2. Set Start Time to 08:00; set Time Zone to "(UTC+08:00) China Standard Time"; set Interval to 2.
3. Verify Time Zone is enabled (Start Time is selected, Show Server Time Zone is off).
4. Save and verify EM task list shows correct Next Run Starting time.
5. **Sync check:** Portal — "Task_Daily_TC003" visible; "Schedule" column shows Daily condition info including the set time.
6. In Portal, click Edit on "Task_Daily_TC003"; switch condition type to Weekly, then switch back to Daily.
7. Verify: Time Zone reverts to local timezone; Start Time reverts to default (01:30); Show Server Time Zone reverts to unchecked. (Bug #55813)
8. Re-set Start Time to 09:00; set Time Zone to "server time zone"; save.
9. **Sync check:** EM — opens task edit; Start Time and Time Zone values match Portal-saved values.
10. Clean up: delete "Task_Daily_TC003".

**Expected:**
- Switching condition type resets time zone, start time, and Show Server Time Zone to defaults.
- Time Zone is only editable when Start Time is selected and Show Server Time Zone is off.
- EM and Portal show consistent condition values after save/reopen.

---

#### TC-004 Weekly Condition — Portal Create → EM Sync → EM Re-edit → Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Weekly type; Portal ↔ EM

**Validates rule:** Weekly N-week interval and day-of-week selection persist; interval > 1 produces soft count in distribution chart

**Pre-conditions:** security=true; admin login on both sides; scheduler running

**Steps:**
1. In Portal, create task "Task_Weekly_TC004"; select Weekly condition.
2. Set N-week interval to 2; select days: Monday, Wednesday, Friday; set Start Time to 10:00.
3. Verify warning "Must select at least one day." disappears after selecting days.
4. Save and verify Portal task list shows updated schedule description.
5. **Sync check:** EM — "Task_Weekly_TC004" visible; opens edit pane and verifies interval=2, days=Mon/Wed/Fri, start time=10:00.
6. In EM, change interval to 1 and add Thursday to the selected days; save.
7. **Sync check:** Portal — "Schedule" column reflects updated condition (1-week interval, Mon/Wed/Thu/Fri).
8. In Portal, edit task and click "Deselect All"; verify warning "Must select at least one day." appears.
9. Re-select all days (click "Select All"); verify button toggles to "Clear All"; save.
10. Clean up: delete "Task_Weekly_TC004".

**Expected:**
- N-week interval and day selection saved and synced correctly.
- Warning appears when no days selected, preventing save.
- "Select All" / "Clear All" button toggles correctly.

---

#### TC-005 Monthly Condition — EM Create → Portal Sync → Portal Re-edit → EM Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Monthly type; EM ↔ Portal

**Validates rule:** Day-of-Month vs Week-of-Month radio selection; months selection; all fields persist across EM/Portal

**Pre-conditions:** security=true; admin login on both sides; scheduler running

**Steps:**
1. In EM, create task "Task_Monthly_TC005"; select Monthly condition.
2. Select "Day of Month" radio button; choose "15th"; select months: January, March, June, December; set Start Time to 06:00.
3. Save and verify EM shows task.
4. **Sync check:** Portal — "Task_Monthly_TC005" visible; opens edit and confirms Day of Month=15th, months=Jan/Mar/Jun/Dec, Start Time=06:00.
5. In Portal, switch to "Week of Month" radio; select WeekOfMonth="2nd", DayOfWeek="Tuesday"; save.
6. Verify in Portal edit page: "Week of Month" radio selected; Day of Month field disabled; Week of Month enabled with correct values.
7. **Sync check:** EM — Week of Month=2nd Tuesday; Day of Month radio unselected.
8. Clean up: delete "Task_Monthly_TC005".

**Expected:**
- Day-of-Month and Week-of-Month are mutually exclusive.
- Months list (January–December) with multi-select works; warning shown if no months selected.
- All values persist and sync correctly.

---

#### TC-006 Hourly Condition — Portal Create → EM Sync → EM Re-edit → Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Hourly type; Portal ↔ EM

**Validates rule:** Hourly requires start/end time range; Start Time < End Time enforced; N-hour input validation; days of week required; round-trip without data loss (Bug #69420, #69200, #69174, #69269)

**Pre-conditions:** security=true; admin login on both sides; user has "Start Time" permission in Schedule Options

**Steps:**
1. In Portal, create task "Task_Hourly_TC006"; select Hourly condition.
2. Set Start Time to 08:00 (start of range), End Time to 17:00; set N-hour interval to 2; select days: Monday–Friday.
3. Verify start time < end time → no warning; set Start Time = End Time → verify warning "The start time needs to be before the end time.".
4. Fix Start Time back to 08:00; set Time Zone to server timezone; save.
5. **Sync check:** EM — opens task; start=08:00, end=17:00, interval=2, days=Mon–Fri, time zone=server timezone.
6. In EM, change interval to 3 and add Saturday; save.
7. **Sync check:** Portal — "Schedule" column shows Hourly with updated settings; opens edit and confirms interval=3, Saturday selected.
8. In Portal, switch condition type to Daily then back to Hourly; verify start time, end time, time zone reset to defaults.
9. Re-enter Hourly settings; save.
10. Clean up: delete "Task_Hourly_TC006".

**Expected:**
- Start time ≥ end time triggers validation error.
- All Hourly fields persist and sync.
- Switching away and back to Hourly resets fields to defaults.
- No data loss or corruption on round-trip (guards against Bug #69420 family).

---

#### TC-007 Run Once Condition — EM Create → Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Run Once type; EM ↔ Portal

**Validates rule:** Run Once executes exactly once at the specified date/time; "Delete if not scheduled to run again" removes task after execution; time zone persists

**Pre-conditions:** security=true; admin login on both sides; scheduler running

**Steps:**
1. In EM, create task "Task_RunOnce_TC007"; select Run Once condition.
2. Set Start Time to a time 2–3 minutes in the future; select today's date; set Time Zone to server timezone.
3. Enable option "Delete if not scheduled to run again" in the Options tab.
4. Save task; verify EM shows task with Next Run Status = "Pending".
5. **Sync check:** Portal — task visible; Schedule column shows "Run Once" condition with the set time.
6. Wait for scheduled execution time; verify task runs (Last Run Status = Finished).
7. Verify task is automatically deleted from both EM and Portal after execution (due to "Delete if not scheduled to run again").

**Expected:**
- Run Once task executes exactly once at the specified time.
- Task deleted from both sides automatically when "Delete if not scheduled to run again" is enabled.
- Portal shows "Not scheduled" for Next Run Status after execution if task still exists.

---

#### TC-008 Chained Condition — Portal Create → EM Sync; Cascade Delete Blocked `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Condition tab, Chained type; EM ↔ Portal

**Validates rule:** Chained task triggers after parent task completes; parent task cannot be deleted while chained task depends on it; dependency cycle detection

**Pre-conditions:** security=true; admin login on both sides; at least one existing task "ParentTask" with a scheduled condition

**Steps:**
1. In Portal, create task "Task_Chained_TC008"; select Chained condition.
2. In the "Run After" dropdown, select "ParentTask"; verify dropdown lists all tasks current user has permission for, ordered by name.
3. Verify attempting to create a cycle (selecting self or creating circular dependency) shows error "Dependency cycle found!".
4. Save "Task_Chained_TC008" successfully.
5. **Sync check:** EM — task visible; opens edit and confirms Run After = "ParentTask"; Next Run Status shows "Wait for trigger".
6. In EM, attempt to delete "ParentTask"; verify error: "Could not remove task ParentTask! Another task depends on it."
7. Delete "Task_Chained_TC008" first; then successfully delete "ParentTask".
8. Verify in EM task list that both tasks are removed.

**Expected:**
- Chained task shows "Wait for trigger" in Next Run Status (not a scheduled time).
- Parent task cannot be deleted while a chained dependency exists.
- After removing chained task, parent can be deleted.
- Dependency cycle detection shows appropriate error.

---

#### TC-009 Dashboard Action — Email Delivery: EM Create → Portal Sync → Portal Re-edit → EM Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Action tab, Dashboard > Deliver to Emails; EM ↔ Portal

**Validates rule:** Email delivery action fields (To/CC/BCC, subject, format, bookmark) persist; Sender/From controlled by em.mail.defaultEmailFromSelf; multiple bookmarks supported (Bug #46380); HTML does not support multiple bookmarks

**Pre-conditions:** security=true; admin login on both sides; email server configured in EM Settings; at least one dashboard with bookmarks available; task "Task_Email_TC009" has a Daily condition

**Steps:**
1. In EM, create task "Task_Email_TC009" with Daily condition; in Action tab, select action type "Dashboard".
2. Select a dashboard with multiple bookmarks; add 2 bookmarks to the bookmark selection.
3. Enable "Deliver to Emails"; set To: a valid email address; set Subject: "Test Email {0} generated at {1,date}"; select format "PDF"; enable "Match Layout".
4. Enable "Notification of Task Status"; enter a valid notification email; check on "Notify only if failed".
5. check on "Include Link" checkbox
6. Save task.
7. **Sync check:** Portal — "Task_Email_TC009" visible; opens edit; verifies dashboard selected, bookmarks listed, To email, subject, format=PDF all match.
8. In Portal, change To email to a second valid address; change format to "Excel"; save.
9. **Sync check:** EM — To email and format updated to new values.
10. Clean up: delete "Task_Email_TC009".

**Expected:**
- All Deliver to Emails fields persist and sync across EM and Portal.
- Subject with parameters `{0}` (dashboard name) and `{1,date}` resolves correctly in sent email.
- "Match Layout" and "Expand Components" are not applicable for HTML/CSV format (grayed out when HTML selected).
- "Export All Tabbed Tables" only applicable for Excel format.

---

#### TC-010 Dashboard Action — Save to Disk: Portal Create → EM Sync → EM Re-edit → Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Action tab, Dashboard > Save to Server; Portal ↔ EM

**Validates rule:** Save to Disk uses server save paths defined in Settings; file suffix pattern applied to generated filename; FTP and local path interoperability

**Pre-conditions:** security=true; admin login on both sides; at least one local server save path and one FTP save path configured in Schedule Settings; task condition: Daily

**Steps:**
1. In Portal, create task "Task_SaveDisk_TC010" with Daily condition; in Action tab, select Dashboard action.
2. Select a dashboard; enable "Enable Save to Server"; choose a local server save path from the dropdown; set filename; select format "PDF".
3. Save task.
4. **Sync check:** EM — "Task_SaveDisk_TC010" visible; opens edit; confirms save path, filename, format match.
5. In EM, change the save path to the FTP path; save.
6. **Sync check:** Portal — Save to Server location shows FTP path.
7. Clean up: delete "Task_SaveDisk_TC010".

**Expected:**
- Save to Disk fields (path, filename, format) persist and sync.
- FTP and local path can be switched without error.

---

#### TC-011 Dashboard Action — Notification of Task Status: EM Create → Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Action tab, Notification of Task Status section; EM ↔ Portal

**Validates rule:** Notification email sent on task completion; "Notify only if failed" controls whether email sent on success; "Include Link" adds dashboard URL to email body

**Pre-conditions:** security=true; admin login on both sides; email server configured; user with email address exists; task "Task_Notify_TC011" has Daily condition and Dashboard action

**Steps:**
1. In EM, create task "Task_Notify_TC011"; enable "Notification of Task Status".
2. Enter a valid email in the Notify field; verify "Browse Email" button visible (Enable Email Browser = on in Settings).
3. Click "Browse Email" → "Select Emails" dialog opens; select a user with a mail address from the Users Tree; verify user's email address appears in the Notify field.
4. Enable "Notify only if failed" checkbox.
5. Enable "Include Link" checkbox.
6. Save task.
7. **Sync check:** Portal — "Task_Notify_TC011" visible; opens edit; Notify email present; "Notify only if failed" and "Include Link" checked.
8. Clean up: delete "Task_Notify_TC011".

**Expected:**
- "Notify only if failed" suppresses email on success; sends email on failure.
- "Include Link" includes dashboard hyperlink in email body.
- Browse Email dialog filters to users with email addresses only.

---

#### TC-012 Multi-Condition + Multi-Action Task CRUD `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — multiple conditions and actions in one task; EM ↔ Portal

**Validates rule:** A task can have multiple conditions and multiple actions; all combinations save and reload correctly; distribution chart counts each condition separately

**Pre-conditions:** security=true; admin login on both sides; multiple dashboards available

**Steps:**
1. In EM, create task "Task_Multi_TC012".
2. Add two conditions: Daily (08:00) and Weekly (Monday, 09:00).
3. Add two actions: Dashboard A with Email Delivery; Dashboard B with Save to Disk.
4. Save and verify EM shows task with multiple conditions/actions.
5. **Sync check:** Portal — task visible; opens edit; both conditions and both actions present.
6. In Portal, delete one condition (Daily); save.
7. **Sync check:** EM — only Weekly condition remains.
8. Verify distribution chart in EM updates: Daily condition removed from count.
9. Clean up: delete "Task_Multi_TC012".

**Expected:**
- Multiple conditions and actions save/load without data loss on both sides.
- Distribution chart updates correctly when conditions are added or removed.
- Deleting a condition/action in Portal is reflected in EM after sync.

---

#### TC-013 Highlight Alert — Variable/Field/Expression; Multiple Highlights `P1` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Action tab, Dashboard action > Alter > Highlight Alert

**Validates rule:** "Alter" section appears only when selected dashboard has highlights; alert triggers action only when specified highlight conditions are met; variable/field/expression alert types supported; multiple highlights on one assembly

**Pre-conditions:** security=true; admin login; a dashboard with multiple highlight conditions (variable, field, expression types) configured on at least one assembly; task with Dashboard action

**Steps:**
1. In EM, create task "Task_Alert_TC013"; select Dashboard action; choose the dashboard with highlights.
2. Verify "Alter" section appears; observe "Execute action only under selected highlight conditions" is unchecked by default.
3. Enable the "Alter" checkbox; expand to see highlight conditions (variable type, field type, expression type).
4. Select a variable-type highlight condition; save task.
5. **Sync check:** Portal — task visible; opens edit; Alter section present; selected highlight condition preserved.
6. In Portal, add a field-type and an expression-type highlight condition; save.
7. **Sync check:** EM — all three highlight conditions selected.
8. Clean up: delete "Task_Alert_TC013".

**Expected:**
- "Alter" section only displays when dashboard has highlights.
- Multiple highlight conditions can be selected.
- Variable, field, and expression types all supported.

---

#### TC-014 Batch Action — EM Only; Hidden in Portal `P1` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Action tab, Batch type (EM only)

**Validates rule:** Batch action only available in EM; tasks with batch action are invisible in Portal task list; batch action loads only tasks current user has permission for within same org

**Pre-conditions:** security=true; admin login on EM; at least 2 other tasks exist; Portal logged in as same user

**Steps:**
1. In EM, create task "Task_Batch_TC014"; select Batch action.
2. Verify the batch task list loads all dashboard action tasks the current user has permission for (ordered by name).
3. Select 1 tasks for the batch; save.
4. Verify "Task_Batch_TC014" appears in EM task list.
5. **Sync check:** Portal — "Task_Batch_TC014" is **NOT** visible in the Portal task list (tasks with batch action hidden in Portal).
6. In EM, edit the task and modify the batch task selection; save.
7. Verify the updated selection is saved and the task still does not appear in Portal.
8. Delete the task in EM; verify it disappears from EM.

**Expected:**
- Batch action option only available in EM action type selection.
- Portal does not display tasks containing batch action.
- Batch task list respects org-scoped permission.

---

#### TC-015 Backup Action — EM Only; Hidden in Portal `P1` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Action tab, Backup type (EM only)

**Validates rule:** Backup action only available in EM; tasks with backup action hidden in Portal; backup action loads org-scoped assets only

**Pre-conditions:** security=true; admin login; assets exist within the org

**Steps:**
1. In EM, create task "Task_Backup_TC015"; select Backup action.
2. Verify backup asset list loads only assets within the current organization.
3. Select one or more assets; save.
4. Verify task appears in EM.
5. **Sync check:** Portal — "Task_Backup_TC015" is **NOT** visible.
6. In EM, edit task and change asset selection; save.
7. Delete task; clean up.

**Expected:**
- Backup action option only available in EM.
- Portal does not display tasks with backup action.
- Asset list scoped to current org.

---

#### TC-016 Folder CRUD — New/Edit/Delete/Move; Admin-Only Restriction `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Tasks Tab — folder operations; EM and Portal

**Validates rule:** Only users with Administrator role can create/edit/delete/move folders; move folder supports drag only; when folder with tasks is moved, tasks move with it; duplicate folder name shows warning

**Pre-conditions:** security=true; admin user and a non-admin user; scheduler running

**Steps:**
1. In EM (as admin), create folder "Folder_TC016" at root level.
2. Create subfolder "SubFolder_TC016" inside "Folder_TC016".
3. Create a task inside "SubFolder_TC016".
4. Verify dropdown menu: when "Folder_TC016" selected: New Folder enabled, Edit Folder enabled, Delete Folder enabled.
5. Verify Tasks node selected: Edit Folder invisible, Delete Folder invisible.
6. Try to create another folder with name "Folder_TC016" at root; verify warning "Duplicate Name".
7. Edit "Folder_TC016" → rename to "Folder_TC016_Renamed"; verify name change reflected immediately.
8. Drag "SubFolder_TC016" (with its task) to root level; verify task also moved to root.
9. **Sync check:** Portal — folder structure reflects new layout; task accessible.
10. Log in as non-admin user in EM; verify "New Folder", "Edit Folder", "Delete Folder" options are not available.
11. Log in as non-admin user in Portal; verify same folder restriction applies.
12. Clean up: delete folders and task.

**Expected:**
- Only admin can create/edit/delete/move folders on both EM and Portal.
- Duplicate folder name warning displayed.
- Moving folder with tasks moves all contained tasks.
- Edit folder with no change shows "Name is unchanged".

---

#### TC-017 Run Now / Stop Now Task Execution `P1` `[env: security=true]` `[CRUD]`

**Scope:** Tasks Tab — Run Now / Stop Now actions; EM and Portal

**Validates rule:** Run Now starts task immediately; Stop Now interrupts running task; errors shown when scheduler stopped or task disabled; behavior consistent on EM and Portal

**Pre-conditions:** security=true; admin login; scheduler running; a task with a long-running action (or simulate with a batch that runs multiple tasks)

**Steps:**
1. In EM, select a task; click "Run Now"; verify task starts (Last Run Status = Running).
2. Click "Stop Now" while task is running; verify task is interrupted (Last Run Status = Interrupted).
3. **Sync check:** Portal — reflects Interrupted status.
4. Disable the task; click "Run Now"; verify error: "Cannot start disabled task {taskname}".
5. Stop the scheduler (from Schedule Settings > Status); click "Run Now" on any task; verify error: "The task cannot be run because the Scheduler has not been started by the administrator."
6. Restart the scheduler; verify Run Now works again.
7. Repeat steps 1–3 from Portal side.

**Expected:**
- Run Now starts task; Stop Now interrupts it; statuses sync between EM and Portal.
- Proper error messages when scheduler is stopped or task is disabled.

---

#### TC-018 Disable / Enable Task `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Tasks Tab — Disable/Enable action; EM and Portal

**Validates rule:** Disabled task shows strikethrough name; Run Now blocked for disabled task; multiple selection with internal task/cycle disables the Disable/Enable action

**Pre-conditions:** security=true; admin login on both sides

**Steps:**
1. In EM, select a defined task (not internal) and click "Disable"; verify task name shows strikethrough.
2. **Sync check:** Portal — task name shows strikethrough.
3. Click "Run Now" on the disabled task; verify error "Cannot start disabled task {taskname}".
4. Click "Enable" on the task; verify strikethrough removed on both EM and Portal.
5. In EM, select multiple tasks including one internal task (e.g., Asset File Backup) and one defined task; verify the "Disable/Enable" button is disabled (mixture rule).
6. Select only defined tasks (no internal, no cycle); verify "Disable/Enable" is enabled.

**Expected:**
- Disabled task shows strikethrough on both sides.
- Run Now blocked for disabled tasks.
- Mixture selection (including internal or cycle) disables the batch Disable/Enable action.

---

#### TC-019 Time Zone in Condition — Change Zone, Save, Reopen; EM/Portal Sync `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Time Zone combobox in all condition types; EM ↔ Portal

**Validates rule:** Changing time zone converts existing time to equivalent in new zone; save and reopen retains time zone selection; task list schedule column updates (Bug #55733); multiple schedule/condition tree updates (Bug #55723); 12-hour display controlled by schedule.time.12-hours property

**Pre-conditions:** security=true; admin login on both sides; server timezone ≠ local timezone (e.g., server=UTC, client=UTC+8); schedule.time.12-hours=false (default)

**Steps:**
1. In EM, create task "Task_TZ_TC019" with Daily condition, Start Time = 10:00, Time Zone = local timezone.
2. Change Time Zone to "Coordinated Universal Time (UTC)"; verify Start Time converts to the UTC equivalent (e.g., 02:00 if local is UTC+8).
3. Verify "after start time, shows the country's time zone" label.
4. Save task; verify EM task list "Next Run Starting" column updated (Bug #55733).
5. Close and reopen task; verify Start Time and Time Zone match saved values.
6. In EM, add a second condition (Weekly); open the multiple schedule dialog; verify condition time zone displays correctly (Bug #55723).
7. **Sync check:** Portal — opens edit; verifies Start Time and Time Zone identical to EM values; Show Server Time Zone = unchecked.
8. In Portal, check "Show Server Time Zone"; verify: time zone combobox disabled; start time display changes to server timezone equivalent; "server time zone (server time zone)" label shown after start time.
9. Save and reopen in Portal; verify Time Zone choice reverts to default (local) but Show Server Time Zone still checked.
10. **Sync check:** EM — task condition reflects server timezone usage.
11. Clean up: delete "Task_TZ_TC019".

**Expected:**
- Time Zone change converts start time to equivalent in new zone.
- Show Server Time Zone disables the Time Zone combobox and converts display to server time.
- After save/reopen, time zone choice reverts to default item per spec.
- EM and Portal show consistent timezone behavior.

---

#### TC-020 Internal Tasks (EM) — Asset File Backup Editability; Balance Tasks Restrictions `P1` `[env: security=true]` `[CRUD]`

**Scope:** Tasks Tab — Internal tasks: Asset File Backup, Balance Tasks, Update Asset Dependencies; EM only

**Validates rule:** Internal tasks not displayed in Portal; Asset File Backup allows condition and option editing only; Balance Tasks and Update Asset Dependencies: only Disable/Enable allowed; Balance Tasks distributes time-range tasks uniformly

**Pre-conditions:** security=true; admin login on EM; scheduler running; at least one time-range task exists

**Steps:**
1. In EM task list, verify internal tasks are present: Asset File Backup (disabled by default, editable), Balance Tasks (enabled by default), Update Asset Dependencies.
2. Click "Asset File Backup" name link to edit; verify "Actions" tab is disabled; "Name" field is disabled; Condition tab and Options tab are editable.
3. Verify Asset File Backup default timezone is "(UTC-04:00) Eastern Daylight Time" (server-created, cannot get local timezone).
4. Edit the condition (change start time); save; verify the task saves successfully.
5. Click "Balance Tasks" edit; verify it is enabled by default and cannot be edited (all fields read-only/disabled).
6. Attempt to delete "Balance Tasks" via task list; verify Move and Delete buttons are disabled for Balance Tasks.
7. Verify "Update Asset Dependencies" similarly has Disable/Enable action only.
8. **Sync check:** Portal — none of the internal tasks appear in Portal task list.
9. Create multiple time-range tasks; verify Balance Tasks may redistribute their "Next Run Starting" times to spread within the time range.

**Expected:**
- Internal tasks only visible in EM.
- Asset File Backup: condition and option editable; Action tab and Name disabled.
- Balance Tasks and Update Asset Dependencies: only enable/disable allowed.
- Portal shows none of the internal tasks.

---

#### TC-021 Distribution Chart (EM) — Week/Day/Hour Drill-Down; Task List Filter `P1` `[env: security=true]` `[CRUD]`

**Scope:** Tasks Tab Part II — Distribution Chart; EM only

**Validates rule:** Chart counts hard/soft based on condition type; chained/run-once not counted; clicking bar filters task list; chart updates when tasks are added/edited/deleted

**Pre-conditions:** security=true; admin login; tasks with Daily (weekdays), Weekly (interval>1), Monthly, Hourly, Chained conditions exist

**Steps:**
1. In EM Tasks Tab, navigate to Distribution Chart section (EM only).
2. Verify default view shows "Distribution (Week)" with Y-axis "Day" (Sunday to Saturday).
3. Verify hard count rules: Daily/weekdays = Mon–Fri hard; Daily/every 1 = each day hard; Weekly/interval=1 = hard for selected days; Hourly = hard for selected days.
4. Verify soft count rules: Weekly/interval>1 = soft for selected days; Monthly/day-of-month = soft; Monthly/week-of-month = soft.
5. Verify chained condition tasks are NOT counted in the distribution.
6. Click a day bar (e.g., Monday); verify title changes to "Distribution (Monday)"; Y-axis changes to Hour (00:00–23:59); task list filters to tasks running that day.
7. Click an hour bar; verify title changes to "Distribution (hour)"; Y-axis changes to Minute; task list shows tasks for that hour.
8. Click "Back Link"; verify return to previous chart level and task list restored.
9. Create a new Daily task (hard count); verify chart bar increases.
10. Delete that task; verify chart bar decreases.

**Expected:**
- Chart levels: Week → Day → Hour (with back link).
- Task list in chart mode filters to tasks relevant to selected time unit.
- Hard/soft count rules correctly applied per condition type.
- Chained and run-once tasks not counted.
- Chart updates in real time when tasks are added/edited/deleted.

---

#### TC-022 Data Cycle CRUD — Create/Edit/Delete with MV Dependency Check `P1` `[env: security=true]` `[CRUD]`

**Scope:** Data Cycles Tab — Cycle list, Cycle define, Name/Condition/Options/Security

**Validates rule:** Cycle used by MV cannot be deleted or renamed; new cycle grants permission to creator; condition refers to Task Define sheet for Daily/Weekly/Monthly/Hourly types (Feature #17966)

**Pre-conditions:** security=true; admin login; at least one MV associated with a data cycle

**Steps:**
1. In EM Data Cycles Tab, click "New Cycle"; verify edit page opens with Condition tab.
2. Set cycle name "Cycle_TC022_Delete"; set Daily condition; save.
3. In cycle list, verify "Cycle_TC022_Delete" appears with condition display.
4. Click the cycle name link; edit name and condition; save; verify updates.
5. Click "Delete" on the cycle; verify confirm dialog: "Are you sure you want to delete the following item(s): Cycle_TC022_Delete" (Feature #17966). Click OK.
6. Verify cycle deleted successfully.
7. Create another cycle "Cycle_TC022_MV" and associate it with an MV.
8. Attempt to delete "Cycle_TC022_MV"; verify error: "Could not remove cycles: Cycle_TC022_MV! There are dependent reports."
9. Attempt to rename "Cycle_TC022_MV"; verify warning: "Could not rename this cycle since materialized view uses it."
10. Verify Security tab of new (non-MV) cycle 'Cycle_TC022_Delete': access is granted to the creator by default. (Note: MV Cycle type defaults to "Deny access to all users" — this differs from a regular new cycle.)
11. In Portal, verify Data Cycle tab shows associated cycle in task list (mv cycle display correct condition).

**Expected:**
- Cycle CRUD works for cycles not used by MV.
- Cycle used by MV: delete and rename both blocked with appropriate errors.
- Security tab defaults correctly; permissions can be changed.
- Sort by Name (ascending/descending) works in cycle list.

---

#### TC-023 Data Cycle Notification — Start/Completion/Failure/Threshold Emails `P1` `[env: security=true]` `[CRUD]`

**Scope:** Data Cycles Tab — Cycle Options tab, notification configuration

**Validates rule:** Notification emails sent with correct subject/content for each event type; Threshold validation enforced (Feature #8742)

**Pre-conditions:** security=true; admin login; email server configured; a cycle that can be triggered

**Steps:**
1. Create cycle "Cycle_Notify_TC023"; in Options tab, enable "Notification of Cycle Start" → enter valid email → save.
2. Enable "Notification of Cycle Completion" → enter same email.
3. Enable "Notification of Cycle Failure" → enter same email.
4. Enable "Notification of Cycle Threshold Exceeded" → enter email; set Threshold to 5 (seconds).
5. Verify Threshold validation: set to 0 → warning "Threshold must be a positive integer number."; set to null → warning "Threshold is empty!"; set to 5 → OK.
6. Save cycle.
7. Manually trigger the cycle (Run Now); after completion, verify:
   - Start email sent with subject "The cycle 'Cycle_Notify_TC023' has started". (P3 - manual verification)
   - Completion email sent with subject "The cycle 'Cycle_Notify_TC023' has completed". (P3 - manual verification)
   - If execution exceeds 5 seconds, Threshold email sent with subject "The cycle 'Cycle_Notify_TC023' has exceeded the threshold: '5' seconds". (P3 - manual verification)
8. Cause the cycle to fail; verify Failure email sent with subject "Cycle 'Cycle_Notify_TC023' failed" and content includes the failure reason (issue #35319). (P3 - manual verification)
9. Clean up.

**Expected:**
- Each notification type independently controlled.
- Enabling a notification type shows the "Email addresses" field.
- Threshold validation: must be positive integer.
- Exact email subjects:
  - Start: "The cycle 'name' has started"
  - Completion: "The cycle 'name' has completed"
  - Failure: "Cycle 'name' failed" (failure reason in email content)
  - Threshold Exceeded: "The cycle 'name' has exceeded the threshold: 'N' seconds"

---

#### TC-024 Simple Schedule — Trigger from Portal Toolbar; Verify Task Created `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Simple Schedule — triggered from Portal toolbar or Composer preview toolbar

**Validates rule:** Simple schedule creates a scheduled task in the Schedule tab; action/condition/bookmark values from the dialog are correctly mapped to the task definition; task is runnable

**Pre-conditions:** security=true; user login on Portal; a viewsheet open in Portal; email server configured

**Steps:**
1. Open a viewsheet in Portal; click the "Schedule" toolbar button to open the Simple Schedule dialog. (Alternative trigger: open viewsheet in Composer preview mode and click the "Schedule" toolbar button — same dialog.)
2. Verify default state: "Create New Bookmark" enabled and checked on (security=true); "Use Current Bookmark" disabled and unchecked; Type Radio = Daily selected.
3. Enter bookmark name (default = current timestamp); select format (PDF); enter To email address; set Daily condition start time.
4. Switch to Weekly condition: select days Mon/Wed; verify "Please use the checkboxes to select days of the week." warning when none selected; click "Select All" → all days selected, button label changes to "Clear All".
5. Switch to Monthly condition: verify default radio = "Day of Month" selected; choose Day of Month = 15th. Verify "Week of Month" radio can be selected, disabling Day of Month field.
6. Complete the dialog by clicking Finish/OK.
7. **Sync check:** Portal Schedule tab — a new task appears named after the viewsheet (e.g., "vsname"); action type = Dashboard; bookmark, format, To email all match dialog settings.
8. **Sync check:** EM Tasks Tab — task visible; opens edit; all settings confirmed.
9. Run task (Run Now); verify Last Run Status = Finished (email sent to configured address - P3 manual).
10. Clean up: delete the simple schedule task.

**Expected:**
- Simple schedule creates task with correct action type (Dashboard), bookmark, format, email.
- Condition type (Daily/Weekly/Monthly) with configured values maps correctly to task condition.
- Task is immediately runnable.
- Simple Schedule conditions (Daily/Weekly/Monthly) do not display server time zone information (no "Show Server Time Zone" option — differs from full task condition UI).
- If viewsheet has parameters open when scheduled, parameters are preserved in task action.

---

#### TC-025 Share Tasks Between Users in Same Group `P1` `[env: security=true]` `[Feature]` `[Cross-Module]`

**Scope:** Schedule Settings — Scheduler Options > Share Tasks Between Users in Same Group; EM and Portal

**Validates rule:** When enabled, users in the same group can see each other's tasks; "Edit By Owner Only" restricts editing to task owner; group membership follows bookmark share-to-same-group rules (parent-child group hierarchy)

**Pre-conditions:** security=true; at least two users (UserA, UserB) in the same group; each user has a task; "Share Tasks Between Users in Same Group" = ON; scheduler running

**Steps:**
1. In Schedule Settings, verify "Share Tasks Between Users in Same Group" is checked ON; "Edit By Owner Only" is visible.
2. Log in as UserA in Portal; create task "TaskA_TC025" with Daily condition.
3. Log in as UserB in Portal; verify "TaskA_TC025" is visible in UserB's task list (same group sharing).
4. As UserB, attempt to click Edit on "TaskA_TC025":
   - If "Edit By Owner Only" = OFF: edit succeeds; changes saved.
   - If "Edit By Owner Only" = ON: task is read-only for UserB; cannot edit.
5. Verify UserB cannot access "TaskA_TC025" via direct URL when not in the same group (access control enforced).
6. In Schedule Settings, uncheck "Share Tasks Between Users in Same Group".
7. Log in as UserB in Portal; verify "TaskA_TC025" is no longer visible.
8. Clean up.

**Expected:**
- Shared tasks visible to same-group users when option is ON.
- "Edit By Owner Only" controls whether non-owner in same group can edit.
- Turning off sharing immediately hides other users' tasks.

---

#### TC-038 Creation Parameters — Parameterized VS in Dashboard Action `P1` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Dashboard action, Creation Parameters tab; EM ↔ Portal

**Validates rule:** When the selected VS has parameters, the Creation Parameters tab lists them (Name/Value/Data Type); admin can Add/Edit/Delete/Clear All; expression type with Dynamic Dates keywords supported (Feature #59803); null values display as `__NULL__`; parameters sync across EM and Portal

**Pre-conditions:** security=true; admin login on both sides; a VS with at least 2 parameters (one Date type, one String type) exists; task "Task_Params_TC038" has a Daily condition and Dashboard action using that VS

**Steps:**
1. In EM, create task "Task_Params_TC038"; in Action tab, select Dashboard action; choose the VS that has parameters.
2. Navigate to the "Creation Parameters" tab; verify:
   - Info message shows "Required Parameters: `<paraName1>`, `<paraName2>`" for required parameters.
   - Parameter table columns: Name, Value, Data Type, Action.
   - VS parameters and their default values are pre-populated.
3. Click "Add"; in the Add Parameter dialog:
   - Name field auto-suggests names from the VS parameter list.
   - Set Type = String; enter a Value; click OK.
   - Verify parameter appears in the table.
4. Click Edit on the parameter; change the Value; click OK; verify value updated.
5. Click "Add" again; add a Date-type parameter; use the date selector to pick a date; verify date appears in Value column.
6. For the Date parameter, switch Value Type to "Expression"; verify formula editor opens automatically; enter Dynamic Dates keyword `_TODAY`; verify formula editor has Dynamic Dates tree on left.
7. Save task.
8. **Sync check:** Portal — "Task_Params_TC038" visible; opens edit; Creation Parameters tab shows same parameters with same names, types, and values.
9. In Portal, edit one parameter value; save.
10. **Sync check:** EM — parameter value updated to new value.
11. In EM, click "Clear All" in Creation Parameters; confirm dialog "Are you sure you want to delete all the selected parameters?"; verify all parameters removed from table.
12. Clean up: delete "Task_Params_TC038".

**Expected:**
- Creation Parameters tab only appears when the selected VS has parameters.
- Add/Edit/Delete/Clear All operations save correctly and sync between EM and Portal.
- Expression type opens formula editor with Dynamic Dates keywords; `_TODAY` and other keywords resolve to the correct date at execution time.
- Null VS parameter value displays as `__NULL__` in the table.
- Duplicate parameter name: EM shows "Press OK again to replace the existing parameter"; Portal shows "replace the existing parameter: name".

---

---

#### TC-039 Batch Action — Parameters: Embedded Mode UI `P2` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Batch action (EM only), Parameters section, Embedded mode

**Validates rule:** Three-level dialog chain (Embedded Parameters Dialog → Edit Parameters Dialog → Add Parameter Dialog) behaves correctly; row IDs re-number on delete; duplicate parameter name triggers replace-confirm; parameter name choices are scoped to the selected VS task (Feature #41395)

**Pre-conditions:** EM; security=true; a Batch task with a dashboard task selected in "Select Schedule Task"; the selected dashboard task has at least 2 defined parameters

**Steps:**
1. Open the Batch task → Parameters section → check **Embedded** on → click Edit → **Embedded Parameters Dialog** opens.
2. Click **Add** → Edit Parameters Dialog opens empty. Add two parameter items (different names, values, types) → OK → new row appears in Parameters table with correct summary info.
3. Select the row → click **Edit** → Edit Parameters Dialog opens **pre-filled** with the exact items saved in step 2.
4. Add 3 rows total. Delete **Row 2** → verify remaining rows re-number: former Row 3 becomes **Row 2** (no gaps).
5. In Edit Parameters Dialog: add a parameter item with a name already in the table → **confirm-replace dialog** appears → confirm → existing item is replaced, no duplicate remains.
6. Open **Add Parameter Dialog** → verify the parameter name dropdown lists **only** the parameters defined in the selected VS of task (no extras, no missing).
7. Click **Clear All** in Edit Parameters Dialog → all items removed. Click **Clear All** in Embedded Parameters Dialog → all rows removed.

**Expected:**
- Edit (existing row) opens pre-filled with correct data.
- Delete causes sequential row IDs to re-number without gaps.
- Duplicate name in Edit Parameters Dialog triggers a replace-confirm; no duplicate entries after confirming.
- Add Parameter Dialog name dropdown exactly matches the selected VS task's parameter set.
- Clear All at each dialog level clears only that level's data.

---

#### TC-040 Batch Action — Parameters: Query Mode UI `P2` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Batch action (EM only), Parameters section, Query mode

**Validates rule:** Query dropdown excludes worksheets with no tables (Bug #45912, rejected — by design); Parameters section auto-maps to primary query columns; changing query updates column info; config persists after save/reopen

**Pre-conditions:** EM; security=true; a Batch task with a dashboard task selected; environment has: a global WS with tables, a private WS with tables, and a WS with only grouping/variables (no tables)

**Steps:**
1. Parameters section → check **Query** on → click Edit → Query Parameters panel opens. Click the **Query** dropdown.
2. Verify dropdown includes global worksheets with tables and private worksheets with tables. Verify the WS that has only grouping/variables and no tables is **absent** (Bug #45912 — excluded by design).
3. Select a worksheet → verify **Parameters** section loads all parameters of the selected VS in task; each parameter's column info is auto-populated from the worksheet's **primary query**.
4. Select a specific table (non-root) from the Query dropdown → verify column info updates to reflect that table's columns.
5. For one parameter, change Query to a different table → column info updates. Set Query to **None** → column info clears for that parameter.
6. Edit a parameter's **Value** mapping → change accepted. Click **Clear All** → all parameter-to-column mappings cleared.
7. Re-configure 2 parameters with query mappings. Save task. Reopen → Query checkbox remains checked; query selection and value mappings are preserved.

**Expected:**
- Worksheets with no tables are absent from the Query dropdown.
- Selecting a worksheet auto-populates parameters from VS task + column info from primary query.
- Selecting a specific table overrides primary-query column info for that parameter.
- Setting Query to None clears that parameter's column info.
- Configuration persists correctly after save and reopen.

---

#### TC-041 Execute As — Permission Enforcement and VPM `P4` `[env: security=true]` `[CRUD]`

**Scope:** Task Define — Options tab, Execute As field

**Validates rule:** Task runs under the identity of the Execute As user; if Execute As user lacks read permission on the dashboard or bookmark, task fails; VPM is applied based on Execute As user, not the task owner

**Pre-conditions:** security=true; admin owns the task; user-limited has no read permission on the target dashboard; user-vpn is subject to VPM row-level filtering; email server configured

**Steps:**
1. New task → Dashboard action → select a dashboard. Options tab → Execute As → select user-limited (no read permission on the dashboard).
2. Run Now → verify task **fails**; Last Run Status shows an access denied / "Read access denied" error. Click error link → stacktrace confirms permission failure.
3. Grant user-limited read permission on the dashboard. Run Now again → task succeeds; email delivered.
4. Remove Execute As (leave blank). Run Now → task runs as task owner (admin); full unfiltered data in output.

**Expected:**
- Execute As user with no dashboard read permission → task fails with access denied.
- VPM applied to Execute As user identity; task owner's permissions do not override.
- Removing Execute As reverts to task owner identity.

---

#### TC-042 Task Options — Owner Field Admin Change `P2` `[env: security=true]` `[CRUD]` `[Cross-Module]`

**Scope:** Task Define — Options tab, Owner field; EM ↔ Portal

**Validates rule:** In EM with security=true, admin can change task Owner to any user; in Portal, Owner field is always disabled and shows only the current user; non-admin EM users cannot change owner

**Pre-conditions:** security=true; admin login; user-B exists in the system; task "TestOwner" created by admin

**Steps:**
1. EM → edit "TestOwner" → Options tab → verify **Owner** field is **enabled**, showing admin.
2. Click Owner dropdown → verify all users in the system are listed.
3. Change Owner to user-B. Save.
4. Reopen "TestOwner" → verify Owner field shows user-B.
5. **Sync check:** Portal → login as user-B → Scheduler → verify "TestOwner" appears in user-B's task list.
6. **Sync check:** Portal → login as admin → verify "TestOwner" no longer appears in admin's own task list (now owned by user-B).
7. Portal → login as user-B → edit "TestOwner" → Options tab → verify **Owner** field is **disabled** (read-only), showing "user-B".
8. EM: login as non-admin user who owns a task → Owner field shows current user but is **disabled** (non-admins cannot change owner).

**Expected:**
- EM admin can reassign task owner via Owner dropdown.
- After reassignment, task appears in new owner's Portal view and disappears from previous owner's Portal view.
- Portal Owner field is always disabled regardless of role.
- Non-admin users in EM cannot change owner.

---

### Env: security=false

---

#### TC-026 Task Basic CRUD in No-Security Mode (EM + Portal) `P2` `[env: security=false]` `[CRUD]` `[env-diff]`

**Scope:** Tasks Tab — basic CRUD in no-security environment; EM and Portal

**Validates rule:** In no-security mode, tasks visible to all users without permission check; basic create/edit/delete/move works on both EM and Portal; User column hidden in task list (Bug #67741, Bug #67777)

**Pre-conditions:** security=false (no security); admin login on EM and Portal; scheduler running

**Steps:**
1. In EM, verify the "User" column is **not visible** in the task list (User column only visible when security=true).
2. In EM, create task "Task_NoSec_TC026" with Daily condition and Dashboard action; save.
3. **Sync check:** Portal — task visible (all tasks displayed regardless of owner).
4. In Portal, create task "Task_NoSec_Portal_TC026"; verify it appears in EM without restriction.
5. In EM, edit "Task_NoSec_TC026" (change name); save.
6. **Sync check:** Portal — updated name reflected.
7. Move task to a different folder in EM; verify Portal reflects new location.
8. Delete "Task_NoSec_TC026" in Portal; verify removed from EM.
9. Clean up remaining tasks.

**Expected:**
- "User" column hidden in no-security mode on both EM and Portal.
- All tasks visible to all users.
- Basic CRUD operations work correctly on both sides.

---

#### TC-027 Chained Condition Load/Save in No-Security Mode `P2` `[env: security=false]` `[CRUD]` `[env-diff]`

**Scope:** Task Define — Chained condition; security=false

**Validates rule:** Chained condition correctly loads and saves task dependencies in no-security environment (Bug #67741)

**Pre-conditions:** security=false; two tasks exist; scheduler running

**Steps:**
1. In EM (no security), create task "Task_Chained_NoSec_TC027".
2. Select Chained condition; verify "Run After" dropdown loads all other tasks.
3. Select a parent task; save; verify condition saved.
4. Reopen task; verify chained condition still shows the selected parent task.
5. **Sync check:** Portal — opens edit; chained condition loads correctly; "Run After" displays the parent task name.
6. In Portal, change the parent task reference to a different task; save.
7. **Sync check:** EM — chained condition updated to new parent.
8. Verify delete cascade: attempt to delete parent task → error "Could not remove task...! Another task depends on it."
9. Clean up.

**Expected:**
- Chained condition loads and saves correctly in no-security mode.
- Cascade delete protection works in no-security mode.

---

#### TC-028 Batch Action Task Load/Save in No-Security Mode `P2` `[env: security=false]` `[CRUD]` `[env-diff]`

**Scope:** Task Define — Batch action; security=false

**Validates rule:** Batch action loads and saves task list correctly in no-security environment (Bug #67777); task still hidden in Portal

**Pre-conditions:** security=false; multiple tasks exist in EM; scheduler running

**Steps:**
1. In EM (no security), create task "Task_Batch_NoSec_TC028"; select Batch action.
2. Verify batch task dropdown loads all available tasks (no permission filter in no-security).
3. Select 2–3 tasks for the batch; save.
4. Reopen the task; verify all selected tasks are still listed in the batch action.
5. **Sync check:** Portal — "Task_Batch_NoSec_TC028" is **NOT** visible (tasks with batch action hidden in Portal regardless of security mode).
6. Edit the batch task selection in EM; save; verify updated selection on reopen.
7. Clean up.

**Expected:**
- Batch action loads all tasks in no-security mode.
- Selected tasks persist after save/reopen.
- Task with batch action remains hidden in Portal even in no-security mode.

---

### Env: multi-tenant

---

#### TC-029 Site Admin Creates/Manages Tasks for Another Org via Org Switch `P1` `[env: multi-tenant]` `[CRUD]` `[Multi-Tenant]`

**Scope:** Tasks Tab — org-switching task management; EM and Portal

**Validates rule:** Site admin can view and manage tasks for any org via org filter switch; new tasks created for another org default owner = first org admin; tasks stored per org; org users cannot see other orgs' tasks

**Pre-conditions:** multi-tenant; site admin login; at least 2 orgs (OrgA, OrgB) each with an org admin user; scheduler running

**Steps:**
1. In EM (as site admin), use the org filter to switch to "OrgB".
2. Create task "Task_OrgB_TC029" with Daily condition and Dashboard action (only OrgB dashboards load).
3. Verify task owner defaults to the first user with "Organization Administrator" role in OrgB.
4. Save and verify task appears in EM under OrgB context.
5. **Sync check:** Log in as OrgB admin in Portal — "Task_OrgB_TC029" is visible.
6. **Sync check:** Log in as OrgA user in Portal — "Task_OrgB_TC029" is **NOT** visible.
7. Switch site admin to OrgA; edit an OrgA task; verify OrgB tasks not visible in OrgA context.
8. Delete "Task_OrgB_TC029" as site admin; verify removed from OrgB Portal.

**Expected:**
- Tasks are org-isolated: OrgA users cannot see OrgB tasks.
- Site admin can create/edit/delete tasks for any org via org switch.
- New task owner defaults to first org admin of the target org.

---

#### TC-031 Internal Tasks Visible Only to Site Admin `P1` `[env: multi-tenant]` `[Multi-Tenant]`

**Scope:** Tasks Tab — internal task visibility in multi-tenant environment

**Validates rule:** Internal tasks (Asset File Backup, Balance Tasks, Update Asset Dependencies) are only visible to site admin; org users see only their own tasks; site admin switching to another org can still see internal tasks

**Pre-conditions:** multi-tenant; site admin and an org admin from OrgA; scheduler running

**Steps:**
1. In EM as site admin (host org), verify internal tasks visible: Asset File Backup, Balance Tasks, Update Asset Dependencies.
2. Site admin switches to OrgA; verify internal tasks still visible.
3. Log in as OrgA org admin in EM; verify internal tasks are **NOT** visible.
4. Log in as OrgA user in Portal; verify internal tasks are **NOT** visible.
5. **Sync check:** Back as site admin; internal tasks accessible and editable as expected.

**Expected:**
- Internal tasks visible only to site admin (both in host org and when switched to other orgs).
- Org admin and regular org users cannot see internal tasks.

---

#### TC-032 Task Data Isolation Between Orgs `P1` `[env: multi-tenant]` `[Multi-Tenant]`

**Scope:** Tasks Tab — cross-org data isolation

**Validates rule:** Tasks, folders, and bookmarks in Dashboard actions only load org-scoped data; email select dialog loads only org users; chained condition "Run After" loads only same-org tasks

**Pre-conditions:** multi-tenant; OrgA and OrgB each have tasks, users, and dashboards; scheduler running

**Steps:**
1. In EM as OrgA admin, open task edit; verify "Dashboard" action dropdown only shows OrgA dashboards.
2. Verify "Bookmark" dropdown only shows bookmarks from OrgA dashboards.
3. In Notification email selector, verify only OrgA users appear in the user list.
4. In Chained condition "Run After" dropdown, verify only OrgA tasks appear.
5. In Batch action, verify only OrgA tasks appear.
6. Repeat steps 1–4 as OrgB admin to confirm symmetric isolation.

**Expected:**
- All task-related dropdowns (dashboard, bookmark, email users, chained tasks, batch tasks) are scoped to current org.
- Direct URL access to another org's task is blocked.

---

### Schedule Settings (placed last per Rule S-3)

---

#### TC-033 Schedule Settings — Scheduler Options: Toggle Each Option `P1` `[env: security=true]` `[CRUD]`

**Scope:** Schedule Settings — Scheduler Options section

**Validates rule:** Each option in Scheduler Options controls specific action visibility in task definition; Share Tasks and Edit By Owner Only work together; warning shown on Apply (requires restart)

**Pre-conditions:** security=true; admin login on EM; scheduler running

**Steps:**
1. In EM Schedule Settings > Scheduler Options, note current state of all toggles.
2. Uncheck "Notification Email"; click Apply; verify warning "The new setting will be applied after restart the scheduler."; restart scheduler.
3. Open task edit in EM and Portal; verify "Enable Notification of Task Status" is **NOT** displayed.
4. Re-enable "Notification Email"; restart scheduler; verify "Enable Notification of Task Status" reappears.
5. Uncheck "Save to Disk"; restart; verify "Enable Save to Server" not displayed in task action.
6. Uncheck "Email Delivery"; restart; verify "Enable Deliver to Emails" not displayed.
7. Uncheck "Enable Email Browser"; restart; verify "Select Emails" button not displayed in both EM and Portal task notification (Bug #29635).
8. Re-enable all options; restart scheduler.
9. Check "Share Tasks Between Users in Same Group"; verify "Edit By Owner Only" becomes visible.
10. Click "Reset"; verify all settings revert to last applied state.

**Last step:** Reset all modified Schedule Settings fields to their default values.

**Expected:**
- Each toggle correctly controls action/feature visibility after scheduler restart.
- "Edit By Owner Only" only visible when "Share Tasks" is checked.
- Reset reverts to last applied state (not factory default).
- Warning shown on Apply.

---

#### TC-034 Schedule Settings — Notification: Configure Alerts; Verify Emails `P1` `[env: security=true]` `[CRUD]`

**Scope:** Schedule Settings — Notification section (1.2.x)

**Validates rule:** Notify on Task Failure and Notify on Scheduler Down send emails to configured addresses; email subject and message configurable; Select Emails dialog works correctly

**Pre-conditions:** security=true; admin login; email server configured; scheduler running

**Steps:**
1. In Schedule Settings > Notification, click "Select Emails" (disabled by default → enable "Notify on Task Failure" first to activate).
2. Check "Notify on Task Failure"; verify "Select Emails" button becomes enabled.
3. Click "Select Emails"; in dialog: enter an invalid email address → verify "Invalid email address" warning; enter an already-added email → verify "Email already added" warning; enter a valid email and click add icon → email appears in list.
4. If security=true: verify user list appears; select a user with mail address; verify user's email added to list; search for a user.
5. Click OK; verify email address appears in the outer Notify email field.
6. Enter Subject and Message; click "Test Mail"; verify test email sent with expected format.
7. Check "Notify on Scheduler Down"; enter same email; configure Subject and Message.
8. Apply settings (restart scheduler if prompted).
9. Cause a task failure; verify notification email sent with correct subject/message. (P3 - manual verification)
10. Stop scheduler; verify "Scheduler Down" notification sent. (P3 - manual verification)
11. "Clear Emails" button: verify enabled when email set; clears all emails on click; disabled when email empty.

**Last step:** Reset all modified Schedule Settings fields to their default values.

**Expected:**
- Email selection dialog validates addresses and prevents duplicates.
- Notification emails sent for task failure and scheduler down (per P3 manual verification).
- Test Mail generates correct format email.
- Clear Emails works; Test Mail disabled when no email set.
- In multi-tenant environments, notification email subject includes org name, e.g., "Task user0:Task2 of organization0 organization Failed at 02:31下午 2024-11-26".

---

#### TC-035 Schedule Settings — Time Ranges: Add/Edit/Delete; Apply to Task Condition `P1` `[env: security=true]` `[CRUD]`

**Scope:** Schedule Settings — Time Ranges section (1.3.x)

**Validates rule:** Time ranges appear in task Daily/Weekly/Monthly conditions (not Hourly/Run Once/Chained); default time ranges persist after scheduler restart; user-defined time ranges can be deleted; new time range: default permission = deny all; security tab controls per-user access

**Pre-conditions:** security=true; admin login; scheduler running

**Steps:**
1. In Schedule Settings > Time Ranges, verify default time ranges: Overnight (bold), Morning, Afternoon.
2. Delete "Morning" time range; restart scheduler; verify "Morning" is **restored** (default ranges always reload).
3. Click "Add" → Time Range Dialog opens.
4. In Properties tab: enter name; set Start Time and End Time (valid combination including overnight span); check "Default" → save → verify name appears in bold.
5. Verify duplicate name → warning "That name is already in use"; null name → warning "The name is required".
6. In Security tab: verify new range defaults to "Deny access to all users"; grant READ permission to a specific user role.
7. Save time range; apply settings.
8. Open task edit (Daily condition); enable "Time Ranges" checkbox; verify: Start Time checkbox is deselected; the new time range appears in the dropdown (for user with permission).
9. Log in as a user **without** permission for the time range; in task condition, enable Time Range → verify warning "You do not have permission to use time range in Scheduler."
10. Delete the custom time range; verify removed from task condition dropdown.

**Last step:** Reset all modified Schedule Settings fields to their default values.

**Expected:**
- Default time ranges (Overnight/Morning/Afternoon) restored after restart.
- Time range and Start Time are mutually exclusive (enabling one disables the other).
- Security tab controls which users can use each time range.
- Permission warning shown to users without time range access.

---

#### TC-036 Schedule Settings — Server Save Paths: Add/Edit/Delete; Apply to Save to Disk `P1` `[env: security=true]` `[CRUD]`

**Scope:** Schedule Settings — Server Save Paths section (1.4.x); check both EM and Portal

**Validates rule:** All paths stored under server/files; editing label vs path has different impacts on task actions; FTP/SFTP path creation; overlapping paths rejected; org users can use configured paths (Bug #67750)

**Pre-conditions:** security=true; admin login; an existing task "Task_SavePath_TC036" with Save to Disk action using a path

**Steps:**
1. In Schedule Settings > Server Save Paths, click "Add"; enter label "LocalPath_TC036" and a local server path; save.
2. Verify duplicate label → warning "The label is already in use"; overlapping path → warning "The path is already in use or is a parent or child of existing location".
3. Click "Add" again; enter FTP type path (format: ftp://...); verify "FTP/SFTP" checkbox auto-checks after saving.
4. Click label link for "LocalPath_TC036" to edit; change only the label to "LocalPath_TC036_Renamed".
5. Verify in "Task_SavePath_TC036": Save to Disk location automatically updates to the new label name.
6. Click label link; change only the path.
7. Verify in "Task_SavePath_TC036": location shows empty; path field shows old path.
8. Delete "LocalPath_TC036_Renamed"; verify in task: location shows empty; path field shows old path.
9. Create a new path; assign it to the task; run task (Run Now); verify file saved at the server path. (P3 for local filesystem check)
10. Log in as org user (non-site-admin); verify org user can use the server save path in their task action (Bug #67750).

**Last step:** Reset all modified Schedule Settings fields to their default values.

**Expected:**
- Overlapping paths rejected.
- Editing label only: task action location auto-updates to new label.
- Editing path: task action location becomes empty (path reference broken).
- Deleting path: task action location becomes empty; old path retained in field.
- Org users can use server save paths.

---

#### TC-037 Schedule Settings — Scheduler Status: Start/Stop/Restart; Thread/Heap Dump `P1` `[env: security=true]` `[CRUD]`

**Scope:** Schedule Settings — Status section

**Validates rule:** Scheduler status (Running/Stopped) transitions with correct button state; Run Now blocked when stopped; thread dump generates .txt; heap dump generates .gz with confirmation; normal org users cannot see Status page

**Pre-conditions:** security=true; site admin login; scheduler running

**Steps:**
1. In Schedule Settings > Status, verify initial state: Status=Running; Start=disabled, Stop=enabled, Restart=enabled; "Get Thread Dump" always enabled.
2. Click "Stop"; verify button states: Status=Stopped, Start=enabled, Stop=disabled, Restart=disabled; progress indicator "Stopping…" shown during transition.
3. Attempt "Run Now" on any task; verify error "The task cannot be run because the Scheduler has not been started by the administrator."
4. Click "Start"; verify: status changes to Running; "Starting…" shown during transition; all task operations resume.
5. Click "Restart"; verify status stays Running after restart; "Restarting…" shown; tasks continue normally.
6. Click "Get Thread Dump"; verify a .txt file is downloaded/generated.
7. Click "Get Heap Dump"; verify confirmation warning appears; click "Cancel" → no file generated; click "Get Heap Dump" again → "OK" → .gz file generated.
8. In multi-tenant context: log in as org admin; verify Status page is **NOT** visible (accessible to site admin only, unless CloudRunner configured).

**Last step:** Reset all modified Schedule Settings fields to their default values.

**Expected:**
- Status page only accessible to site admin.
- Start/Stop/Restart transitions correct; buttons enabled/disabled per state.
- Thread dump → .txt; heap dump → .gz (after confirmation).
- "Run Now" blocked when scheduler stopped.

---

## Uncovered Rules

| Rule ID | Rule Description | Priority | Reason / Suggested Fix |
|---------|------------------|----------|------------------------|
| R-001 | schedule.time.12-hours=true: all time displays switch to 12-hour format across EM, Portal, Simple Schedule | P2 | [NEEDS SCENARIO]: Test property change in all.properties; verify AM/PM display in condition start time, task list, and simple schedule |
| R-002 | Save File Suffix pattern: _{0}_{1}, _{0}_{1,date}, _{0}_{1,date,MMM-dd} etc. applied to generated file names | P2 | [NEEDS SCENARIO]: Verify suffix pattern from Schedule Settings applies to Save to Disk and batch task output files |
| R-003 | Distribution Chart: "disabled task should consider in distribute chart" (Bug #28830 rejected) | P3 | Rejected bug — behavior is that disabled tasks ARE counted; no new scenario needed |
| R-004 | FTP and local path mixed usage in Save to Disk action — switch between them within same task | P2 | Partially covered in TC-010; edge case: switching from FTP back to local should not corrupt task |
| R-005 | Anonymous task edited when security enabled → task owner updates to current user | P2 | [NEEDS SCENARIO]: In no-security mode create task; enable security; edit task; verify owner updated to current user |
| R-007 | Start From & Stop On (Options tab) — task not executed before Start From date or after Stop On date | P2 | [NEEDS SCENARIO]: Set Start From = tomorrow and verify task does not run today; set Stop On = yesterday and verify task shows "Not scheduled"; valid range: condition run time between Start From and Stop On → task executes |
| R-008 | Batch action + Chained condition combination — batch task with chained condition should auto-trigger when the "Run After" task completes | P2 | [NEEDS SCENARIO]: Create batch task with chained condition (Run After = TaskA); run TaskA; verify batch task triggers automatically and runs for all parameter tuples |
| R-009 | Simple Schedule bookmark behavior in no-security mode: security=false → "Create New Bookmark" disabled (check off), "Use Current Bookmark" enabled (check on); opposite of security=true | P2 | [NEEDS SCENARIO]: security=false TC-024 variant — verify bookmark option state; verify created task uses current bookmark correctly |

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| CloudRunner status page visibility | organization 规则 sheet, row 14 | "如果配置了cloud runner,则site admin时status page也不显示" — need confirmation: does CloudRunner hide Status from site admin entirely, or does it show a different view? |
| Task owner rule for site admin creation | organization 规则 sheet, rows 28–31 | "c. site admin创建的时候，需要修改owner，如果不修改，看不见或者无法执行，都认为ok" — this means test is inconclusive if task cannot be seen/executed without owner fix; need definitive pass/fail criteria |
| "Delete By Owner Only" vs "Edit By Owner Only" UI label | Schedule Settings sheet, rows 15 and 34 | Row 15 (UI section) calls the control "Delete By Owner Only"; row 34 (Function section) calls it "Edit By Owner Only". TC-033 uses "Delete By Owner Only", TC-025 uses "Edit By Owner Only". Confirm the actual UI label in the current product version. |

---

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security / Actions / Schedule Options | Controls which action types appear in task definition; controls Time Range permission and Internal Schedule Tasks visibility | Run after Security module tests; verify per-user action visibility |
| Security / Internal Schedule Tasks | Permission required to see and use internal tasks | Test deny/grant and verify internal task visibility changes |
| Organization / Org Filter | Site admin switches org to create/edit tasks | Verify task attribution and owner default per org |
| Organization / Clone Org | Cloning copies tasks; time-range tasks excluded | Verify cloned tasks runnable; run after Clone Org tests |
| MV (Materialized View) | Data cycles bound to MV; cycle delete/rename blocked when MV uses it | Run after MV tests to have associated MVs available |
| Portal / Toolbar / Email (CC & BCC) | Task deliver-to-emails CC/BCC refer to Email.xls CC&BCC sheet | Extend TC-009 with CC/BCC coverage from Email matrix |
| Portal / Viewsheet | Simple Schedule triggered from VS toolbar; parameters preserved | Verify parameter-bearing VS creates task with correct creation parameters |
| Security / Execute As | Task Execute As user must have READ permission on the VS and bookmarks used in the action | Verify task fails when Execute As user lacks READ; succeeds when permission granted |

---

## P3 Manual-Only Test Points

> 以下测试点无法通过 Web E2E 框架自动化（框架无法访问本地文件系统或邮件服务器），需人工执行。**不生成对应场景。**

| ID | Test Point | Reason | Related Task/Action |
|----|-----------|--------|---------------------|
| P3-001 | Verify email received after Task Email Delivery action execution contains correct subject, attachment, and body content | Cannot access email server | TC-009, TC-010 — Dashboard Action / Deliver to Emails |
| P3-002 | Verify email received for "Notification of Task Status" (success and failure) contains correct subject and message | Cannot access email server | TC-011 — Notification of Task Status |
| P3-003 | Verify email received for "Notification of Cycle Start/Completion/Failure/Threshold" has correct subject/content | Cannot access email server | TC-023 — Data Cycle Notifications |
| P3-004 | Verify report file saved to local server path (Save to Disk) is complete, non-corrupt, with correct filename using Save File Suffix pattern | Cannot access server local file system | TC-010, TC-036 — Save to Disk / Server Save Paths |
| P3-005 | Verify report file saved to FTP/SFTP path is accessible and complete after task execution | Cannot access remote FTP file system | TC-010, TC-036 — FTP Save Path |
| P3-006 | Verify "Notify on Task Failure" notification email sent to configured address when a task fails | Cannot access email server | TC-034 — Schedule Settings Notification |
| P3-007 | Verify "Notify on Scheduler Down" notification email sent when scheduler is stopped | Cannot access email server | TC-034 — Schedule Settings Notification |
| P3-008 | Verify Simple Schedule task email delivery: recipient receives email with correct vs attachment and subject after task execution | Cannot access email server | TC-024 — Simple Schedule |
| P3-009 | Verify "Auto Stop" behavior in Scheduler Options: when checked ON, scheduler stops automatically when the application server is stopped | Cannot automate server stop/restart cycle in Web E2E framework; must check on product installation package | TC-033 — Schedule Settings Scheduler Options |
