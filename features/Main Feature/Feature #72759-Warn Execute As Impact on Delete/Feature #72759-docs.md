---
doc_type: feature-test-doc
product: StyleBI
module: scheduler-security
feature_id: 72759
feature: Feature #72759 Warn admins of scheduled-task impact when deleting a user or group
pr_link: TBD (PR #4137 — repo/URL not confirmed from source material)
Assignee: TBD
last_updated: 2026-07-10
version: TBD
---

# 1 Feature Summary

**核心目标**：管理员在 Security 中删除用户/用户组前，提前预警其名下将被删除的计划任务，以及会因该身份被设为 "Execute As" 而被重置为 Owner 的任务，避免删除后才发现级联影响。
**用户价值**：
1. 防止误删用户导致计划任务被静默删除。
2. 防止 Execute As 被静默重置后引发**跨租户数据泄露**（多租户场景下任务 Owner 与 Execute As 分属不同组织时，重置后任务会以 Owner 组织身份运行，可能向错误组织的用户暴露数据）。
3. 将"删除后逐一人工核查 Execute As 是否被重置"的被动补救流程，转变为"删除前主动预警、管理员知情后决策"。

> 澄清：本 Feature 只要求"警示"，不自动修正 Execute As 或阻止删除；管理员仍需删除后手动更正受影响任务。PR #4137 的实现为纯只读/提示性变更，未改动既有删除/重置逻辑。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 删除拥有计划任务的用户时，确认框正确展示"将被删除"的任务列表
- **跨租户场景下删除 Execute As 用户**：预警内容（将被重置的任务）与删除后 Scheduler 中真实发生的变化完全一致（Feature 核心安全诉求，PR 自述该路径自动化覆盖最弱）

## P1 - Functional Path

- 任务同时命中 Owner 与 Execute As 时的去重（只在"将被删除"列表出现一次，不重复出现在"将被重置"列表）
- 删除用户组（Group）时的 Execute As 预警（Feature 原文只提 user，PR 主动扩展到 Group）
- 删除 Role / Organization 时不触发任务影响预检，确认框保持原始通用文案
- 跨组织同名任务的组织后缀消歧展示
- 预检接口失败（网络异常/超时）时，删除流程回退为原始确认框且不被阻塞

## P2 - Extended Path （按需测试）

- 安全：无权限管理的身份被批量选中删除时，预警列表不泄露其名下任务信息
- 兼容性：小屏幕/移动端下确认弹窗（宽度由 350px 增至 500px）正常展示、可滚动、不裁剪

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC72759-1 | 删除拥有计划任务的用户时展示任务删除预警 | 1. Security 用户管理页面勾选拥有计划任务的用户 2. 点击"删除" | 确认框展示该用户拥有的任务名称列表；确认删除后任务确实被移除 | TBD | 默认行为变化、数据一致性 |
| TC72759-2 | 跨租户场景下删除 Execute As 用户的重置预警与实际结果一致性（最高优先级） | 1. 任务 Owner 属于组织A，Execute As 为组织B某用户 2. 站点管理员登录 EM 进入组织B用户页面，勾选该用户点击删除 3. 记录确认框中"Execute As 将被重置"任务列表 4. 确认删除 5. 核实该任务 Execute As 是否重置为组织A的 Owner，且后续以组织A身份运行 | 确认框提示的任务与实际发生重置的任务完全一致；不出现遗漏或多报 | TBD | 多租户数据泄露核心缓解点；PR 自述该路径缺少 provider 级自动化测试覆盖，需重点人工验证 `OrganizationManager.runInOrgScope` 是否正确生效 |
| **P1** |
| TC72759-3 | 任务同时命中"拥有"和"Execute As"时不重复展示 | 1. 某任务的 Owner 与 Execute As 均为待删除用户 2. 选中该用户点击删除 | 确认框只在"将被删除"列表展示该任务，不在"Execute As 重置"列表重复出现 | TBD | 数据一致性、边界条件 |
| TC72759-4 | 删除用户组时的 Execute As 预警（范围扩展点） | 1. 某任务的 Execute As 设置为一个用户组 2. 勾选该组点击删除 | 确认框仅展示"Execute As 将被重置"提示；不出现"任务将被删除"提示（组不能拥有任务） | TBD | Feature 原文仅提及 user，PR 主动扩展覆盖 Group，需专门验证 |
| TC72759-5 | 删除角色/组织时跳过任务影响预检 | 1. 角色管理页面勾选一个角色（或组织管理页面勾选一个组织） 2. 点击"删除" | 确认框展示原始通用确认文案，宽度保持 350px，不发起任务影响查询请求 | TBD | 回归风险、边界条件；确认范围收敛正确 |
| TC72759-6 | 跨组织同名任务的消歧展示 | 1. 至少两个组织下存在同名计划任务 2. 站点管理员删除在其中一个组织拥有/被设为 Execute As 的用户 | 预警列表中该任务名称附带组织标识；若任务仅存在于单一组织则不显示组织后缀 | TBD | 跨模块交互、边界条件 |
| TC72759-7 | 预检接口失败时删除流程的容错处理 | 1. 勾选拥有计划任务的用户点击删除 2. 模拟任务影响查询请求返回错误（如 500/超时） | 确认框仍正常弹出（展示原始通用确认文案，不含任务警告），管理员可继续确认并完成删除 | TBD | 异常路径为设计预期行为，非缺陷，需确认降级路径本身工作正常 |
| **P2** |
| TC72759-8 | 无权限管理的用户被批量选中删除时不泄露任务信息 | 1. 受限管理员对部分待删除身份无 ADMIN 权限 2. 勾选包含无权限用户的多个身份点击删除 | 预警列表仅展示有权限身份关联的任务；无权限身份的任务信息不出现在列表中，且对该身份的实际删除应被权限系统拒绝 | TBD | 安全性、越权信息泄露风险 |
| TC72759-9 | 小屏幕/移动端下确认弹窗的展示 | 1. 缩小浏览器窗口至移动端宽度或使用移动设备访问 EM 2. 勾选拥有多个计划任务的用户点击删除 | 确认框自适应屏幕宽度，内容可通过滚动完整查看，不出现文本截断或按钮遮挡 | TBD | 渲染/UI 行为变化、跨设备兼容性 |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
- 验证 `getDeleteTaskImpacts` 对每个身份复用与实际删除相同的 ADMIN 权限校验，确认无权限身份不会通过预检接口被探测出所属任务名称（见 TC72759-8）

## Performance
- 无专项性能要求（纯只读预检查询）；如站点身份/任务数量巨大，可抽样验证预检请求响应时间是否明显拖慢删除确认框弹出速度

## Compatibility
- 小屏幕/移动端下确认弹窗展示与滚动（见 TC72759-9）

## 本地化
- 新增两条 properties 文案 `em.security.delete.ownedTasksWarning`、`em.security.delete.executeAsTasksWarning` 需在所有支持语言下验证翻译准确性及弹窗排版（长文本换行/溢出）

## script
- 无新增可脚本化 UI 组件，跳过

## 文档/API
- 新增只读端点 `POST /api/em/security/user/delete-identities/{provider}/affected-tasks`，属于既有删除确认框的行为增强而非全新入口；建议核对管理员帮助文档中"删除用户/组"及"多租户 Execute As"相关章节是否需要补充说明

## 配置检查
- 无 `SreeEnv` 配置项变更，跳过

---

# 5 Regression Impact（回归影响）

可能受影响模块：
- **Scheduler（核心）**：任务 CRUD、Execute As 重置、运行身份归属
- **Security / Users**：`IdentityService` 删除主流程（`identityRemoved()`）
- **多租户 Org 管理**：`OrganizationManager.runInOrgScope`，跨组织身份解析
- **权限系统**：`SECURITY_USER` / `SECURITY_GROUP` 的 ADMIN 权限判定

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| — | 本次分析（`4137-需求分析报告.md`）未提及关联的 New / Request Feedback 状态 Bug；如 Feature PDF 中包含 Bug 列表，请补充 | — |

---
