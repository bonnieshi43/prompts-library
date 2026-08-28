# PR #4137 需求测试分析报告

> Feature: #72759 — Warn admins of scheduled-task impact when deleting a user or group
> 分析依据：`requirement_clarify.md` 分析框架 + Feature #72759 需求描述 + PR #4137 描述与代码 diff（`4137.diff.txt`）
> 相关知识库文档：`claude/scheduler.md`、`claude/org-security.md`（用于校验是否破坏既有 `identityRemoved()` 行为）

---

## ⚠️ Input Validation（输入完整性说明）

- **Feature 需求文档**：已提供（#72759 描述），信息完整，明确指出多租户场景下的数据泄露风险背景。
- **PR Title / Description**：已提供，包含 Summary / Backend / Frontend / Behavior notes / Testing 五部分，与代码 diff 高度吻合，可作为本次分析的权威依据。
- **PR diff 内容**：完整（文件已在前一轮分析中读取，无截断标记）。
- 本次分析已按 Feature → PR 实现 → Knowledge 的顺序重新核对，之前一版（无 Feature/PR 描述时基于代码反推）的部分推测已被本轮确认或修正，修正点见下文标注。

---

## 第一部分：Requirement Summary（需求概要）

- **核心目标**：管理员在 Security 中删除用户时，该用户拥有的计划任务会被删除；若该用户（或用户组）被设置为某任务的 "Execute As" 执行身份，该任务的 Execute As 会被重置为任务 Owner。在多租户场景下，若任务 Owner 与被删除的 Execute As 用户分属不同组织/租户，任务重置后会以 Owner 所在组织身份运行，导致该组织下的其他用户收到本应属于原 Execute As 用户所在组织的数据。本 Feature 要求在删除前给出预警，让管理员知悉哪些任务会被删除、哪些任务的 Execute As 会被重置，避免删除后需要逐一手工核查每个任务的执行身份/组织是否正确。
- **用户价值**：
  1. 防止误删用户导致计划任务被静默删除。
  2. 防止 Execute As 被静默重置后引发**跨租户数据泄露**（多租户核心安全风险）。
  3. 将"删除后需人工逐个核查 Execute As 是否被重置、重置后组织是否正确"的被动补救流程，转变为"删除前主动预警、管理员知情后决策"。
- **Feature 类型**：安全 / 多租户数据隔离风险预警 + UI 交互增强 + 只读后端 API。

**重要澄清**：本 Feature 的诉求是"**警示**"（"We should show a warning ... so admin users are aware"），而不是自动修正 Execute As 或阻止删除——管理员仍需在删除后手动更正受影响任务的 Execute As。PR 的实现与该诉求完全一致（纯提示性，不改变任何既有删除/重置逻辑）。

---

## 第二部分：Implementation Change（变更分析）

### 核心变更

- **`ScheduleManager.getIdentityRemovalImpact(identity, provider)`（新增，只读）**：与既有 `identityRemoved()` 的匹配逻辑保持镜像一致（PR 描述原文："mirroring the matching in identityRemoved so the two stay in sync"），统计该身份拥有（owner）的任务与作为 "Execute As" 的任务，但不做任何修改。**组织解析直接取自身份自身的 `orgID`**（`identityID.orgID`）。
- **`IdentityService.getDeleteTaskImpacts(...)`（新增）**：对每个待删除身份聚合结果、去重，并**排除同时被 owner 命中的 execute-as 任务**（因为这类任务会被整体删除，不需要再提示"重置"）。每次查询都包裹在 `OrganizationManager.runInOrgScope(targetOrg, ...)` 中执行——PR 说明此举是必需的，因为 **任务的 Execute As 身份是在当前组织上下文中从安全 provider 懒加载解析的**（"task identities are looked up from the security provider under the current org context on load"），所以站点/主机管理员跨组织删除时，必须先切到目标身份所在组织的上下文，才能正确重新解析出该任务的执行身份。权限校验与实际删除接口使用相同的 per-identity ADMIN 权限门控。
- **`RoleController`**：新增 `POST /api/em/security/user/delete-identities/{provider}/affected-tasks`，返回 `DeleteIdentitiesTaskImpactResponse { ownedTasks, executeAsTasks }`。
- **新增两条本地化文案**：`em.security.delete.ownedTasksWarning`、`em.security.delete.executeAsTasksWarning`。
- **前端 `UsersSettingsViewComponent.delete()`**：预取任务影响信息并追加到既有确认框中；任一环节出错（网络/接口异常）均**回退为原始确认框，不阻断删除**；仅当选中对象包含 USER 或 GROUP 时才发起预检，纯 Role/Organization 选择时跳过。
- **Behavior notes（PR 原文确认）**：
  - 仅 USER 和 GROUP 的删除会触发该预警；Role 与 Organization 的删除不受 owner/execute-as 清理逻辑影响，也不产生任务预警。
  - **纯增量变更**：新增了一个只读端点和响应模型，未修改任何既有 API、序列化格式或实际删除路径本身。

### 目标覆盖度（逐项对比 Feature #72759 需求点）

| Feature 需求点（原文依据） | 是否覆盖 | 说明 |
|---|---|---|
| 用户拥有的任务会被删除（既有行为） | ✅（既有行为，本次仅新增可见性） | `ownedTasks` |
| 用户被设为 Execute As 时任务会重置为 Owner（既有行为） | ✅（既有行为，本次仅新增可见性） | `executeAsTasks` |
| 多租户下 Execute As 重置可能导致任务以错误租户运行、向其他用户泄露数据 | ✅ 以预警方式覆盖 | Feature 明确只要求"warning"，未要求自动修正，PR 完全对齐 |
| 让管理员在删除前知晓哪些任务会被删除 / 哪些任务 Execute As 会被重置 | ✅ | 确认框展示两类列表 |
| （隐含）管理员仍需删除后手动修正受影响任务 | ✅ 未被自动化，符合 Feature 描述的现状 | PR 明确声明纯提示性，不改变实际删除/重置逻辑 |
| Feature 原文仅提及"user"，PR 将预警范围扩展到 Group 删除 | ✅ 属于合理扩展 | Group 可作为 Execute As，PR 主动补充覆盖，需要专门测试验证 |
| 通知列表（notification）清理是否一并提示 | ❌ 未覆盖 | `identityRemoved` 中还会做通知列表清理，本次预警不包含此项，PR 描述未提及，超出本 Feature 范围，非缺陷 |

### 行为变化对比表

| Before Behavior | After Behavior | Risk |
|---|---|---|
| 删除用户/组仅显示通用确认文案 "Are you sure you want to delete the selected item(s)?" | 删除前查询受影响任务，确认框中列出将被删除的任务、Execute As 将被重置的任务 | 低（UI 增强，纯提示） |
| 管理员无法提前知晓删除会级联删除任务 | 明确列出即将被删除的任务名 | 中（防误删；任务数量多时列表展示需验证） |
| Execute As 重置对管理员不可见，需删除后自行排查 | 删除前明确提示，并说明将重置为 Owner 身份运行 | 中高（多租户数据泄露的核心缓解点，需重点验证跨组织场景的准确性） |
| 无额外网络请求 | 删除前新增一次预检请求；失败时静默回退为原始确认框 | 中（请求失败=预警"消失"，但删除仍可继续，与设计一致，非缺陷，但需向测试/文档说明该降级行为是预期设计） |
| 实际删除/重置逻辑（`identityRemoved`） | **未变化**（PR 明确"纯增量"，未触碰删除路径） | 低（回归风险主要集中在新增的预检只读路径，而非既有删除逻辑） |

---

## 第三部分：Risk Identification（风险识别）

- **Functional / 数据一致性（最高优先级）**：Execute As 的真实解析依赖"当前组织上下文"（懒加载自安全 provider），`getDeleteTaskImpacts` 通过 `runInOrgScope(targetOrg, ...)` 显式修正这一点。这是本次变更技术复杂度最高、也是 PR 自身测试说明中承认覆盖最弱的部分——**PR 描述明确指出 Execute As 路径未被 provider-less 的单元测试覆盖，仅通过 EM 前端 spec（mock 接口）和手工多租户测试验证**。这意味着"预检结果是否与真实跨组织场景一致"目前缺乏自动化回归保障，需要作为人工测试的重点。
- **Cross-Module / 多租户**：站点管理员跨组织删除用户/组是本 Feature 提出的核心场景，必须验证预警列表与实际删除后 Scheduler 侧的真实变化完全一致。
- **安全性 / 权限**：`getDeleteTaskImpacts` 对每个身份复用与实际删除相同的 ADMIN 权限校验，需验证无权限身份不会通过该预检接口被探测出所属任务名称（越权信息泄露）。
- **边界情况**：任务同时命中 owner 与 execute-as 时的去重逻辑（`executeAsTasks` 排除已在 `ownedTasks` 中的任务）；跨组织同名任务展示时的组织后缀消歧逻辑。
- **异常路径（设计内，非缺陷，但需明确验证）**：预检接口失败时静默回退为无预警的原始确认框，删除仍可继续——这是 PR 明确的设计选择（"不能因为预检失败而阻塞正常删除"），测试需确认这一降级路径本身工作正常，且不应被误判为 bug。
- **回归风险（低）**：PR 声明未改变任何既有 API、序列化格式或删除路径，核心删除/重置逻辑本身回归风险较低，测试重点应放在新增的预检只读路径上。
- **本地化**：新增两条 properties 文案需要多语言验证及弹窗排版检查。

---

## 第四部分：Test Design（测试策略设计）

- **核心验证点**：
  1. 预检展示的 ownedTasks / executeAsTasks 与实际删除后 Scheduler 中真实发生的变化完全一致（尤其是跨组织场景）。
  2. Execute As 的组织上下文重解析（`runInOrgScope`）在站点管理员跨组织删除时正确生效。
  3. 仅 USER/GROUP 触发预检，Role/Organization 不触发。
  4. 预检失败时删除流程不被阻断。
- **高风险路径（优先级从高到低）**：
  1. 站点/主机管理员跨组织删除用户（Execute As 涉及不同租户的任务）——**PR 自述测试覆盖最弱的场景，应作为人工测试第一优先级**。
  2. 用户同时是若干任务的 owner，又是另一些任务的 execute-as（去重逻辑）。
  3. 删除用户组（Group）时的 execute-as 预警（相对 Feature 原文是范围扩展点）。
  4. 批量混合选择（User + Group + Role）删除。
  5. 预检接口异常时的降级与删除连续性。
- **涉及模块回归验证**：Scheduler（任务 CRUD、Execute As 重置、运行身份归属）、Security/Users（IdentityService 删除主流程）、多租户 Org 管理（`OrganizationManager.runInOrgScope`）、权限系统（`SECURITY_USER`/`SECURITY_GROUP` ADMIN 权限）。
- **专项检查**：
  - **本地化**：新增两条 properties 文案需要在所有支持语言下验证翻译准确性及弹窗排版（长文本换行/溢出）。
  - **配置检查**：无 `SreeEnv` 配置项变更，跳过。
  - **脚本兼容**：无新增可脚本化 UI 组件，跳过。
  - **文档一致性**：属于既有删除确认框的行为增强而非全新入口，建议核对管理员帮助文档中"删除用户/组"及"多租户 Execute As"相关章节是否需要补充说明。
- **Mobile 影响检查**：确认框宽度由 350px 增至 500px 且内容列表变长，需在小屏/移动端 EM 界面下验证弹窗展示与滚动。
- **Print Layout / Export 影响检查**：不涉及图表渲染、导出或打印相关代码，无需验证。

---

## 第五部分：Key Test Scenarios（核心测试场景）

### 场景 1：删除拥有计划任务的用户时展示任务删除预警
- **Scenario Objective**：验证删除某个用户时，系统能提前告知该用户名下将被一并删除的计划任务。
- **Scenario Description**：管理员在不知情的情况下删除用户，其名下的计划任务会被静默删除，可能造成业务报表/数据流程中断，需要在删除前明确提示。
- **Pre-condition**：目标用户拥有至少一个计划任务。
- **Key Steps**：
  1. 进入 Security 用户管理页面，勾选该用户。
  2. 点击"删除"按钮。
- **Expected Result**：确认框中出现该用户拥有的任务名称列表提示；确认删除后该任务确实被移除。
- **Risk Covered**：默认行为变化、数据一致性。

### 场景 2：跨租户场景下删除 Execute As 用户的重置预警与实际结果一致性（最高优先级）
- **Scenario Objective**：验证当某个任务的 Owner 与 Execute As 用户分属不同组织/租户时，删除该 Execute As 用户前的预警内容与删除后任务真实的执行身份变化完全一致。
- **Scenario Description**：这是本 Feature 要解决的核心安全问题——Execute As 被重置后任务会以 Owner 的租户身份运行，若预警与实际不符，管理员会基于错误信息做出删除决策，导致其组织下的其他用户收到不应属于他们的数据。由于此路径未被自动化单元测试充分覆盖，是本次改动风险最高的场景。
- **Pre-condition**：任务 Owner 属于组织 A，任务的 Execute As 设置为组织 B 的某用户；操作者为可跨组织管理的站点/主机管理员。
- **Key Steps**：
  1. 以站点管理员身份登录 EM，进入组织 B 的用户管理页面。
  2. 勾选该 Execute As 用户，点击"删除"。
  3. 记录确认框中展示的 "Execute As 将被重置" 任务列表。
  4. 确认删除。
  5. 进入该任务所属的计划任务详情，核实 Execute As 是否已重置为组织 A 的 Owner，且任务后续以组织 A 身份运行。
- **Expected Result**：确认框中提示的任务与实际发生重置的任务完全一致；任务的 Execute As 确实被重置为 Owner；不出现遗漏或多报。
- **Risk Covered**：跨模块交互、数据一致性、多租户安全（数据泄露）。

### 场景 3：任务同时命中"拥有"和"Execute As"时不重复展示
- **Scenario Objective**：验证当某任务的 Owner 与 Execute As 恰好都指向待删除用户时，该任务只出现在"将被删除"列表中，不重复出现在"将被重置"列表。
- **Scenario Description**：重复展示同一任务会误导管理员认为存在比实际更多的受影响任务。
- **Pre-condition**：某计划任务的 Owner 和 Execute As 身份为同一个待删除用户。
- **Key Steps**：
  1. 选中该任务的 Owner 用户，点击删除。
- **Expected Result**：确认框只在"将被删除"列表中展示该任务，不在"Execute As 重置"列表中重复出现。
- **Risk Covered**：数据一致性、边界条件。

### 场景 4：删除用户组时的 Execute As 预警（Feature 范围扩展点）
- **Scenario Objective**：验证删除用户组（Group）时，若该组被设为某任务的 Execute As，预警框正确展示"重置"提示；由于组不能拥有任务，不应出现"任务将被删除"提示。
- **Scenario Description**：Feature 原文仅描述"user"场景，PR 主动将预警范围扩展到 Group 删除，需要专门验证这一扩展点是否正确，且不会把不存在的"组拥有任务"错误地展示出来。
- **Pre-condition**：某用户组被设置为任务的 Execute As 身份。
- **Key Steps**：
  1. 在用户组树中勾选该组，点击删除。
- **Expected Result**：确认框仅展示"Execute As 将被重置"提示，不出现"任务将被删除"提示。
- **Risk Covered**：目标覆盖度（范围扩展）、默认行为变化。

### 场景 5：删除角色/组织时跳过任务影响预检
- **Scenario Objective**：验证删除角色（Role）或组织（Organization）时，删除确认框保持原有通用提示，不触发计划任务影响预检。
- **Scenario Description**：Feature 与 PR 均明确该预警仅适用于 User/Group，需确保范围收敛正确，不对其他对象类型产生多余请求或误报。
- **Pre-condition**：无。
- **Key Steps**：
  1. 在角色管理页面勾选一个角色（或在组织管理页面勾选一个组织）。
  2. 点击"删除"按钮。
- **Expected Result**：确认框展示原始通用确认文案，宽度保持 350px，不发起任务影响查询请求。
- **Risk Covered**：回归风险、边界条件。

### 场景 6：跨组织同名任务的消歧展示
- **Scenario Objective**：验证多租户场景下，不同组织存在同名计划任务时，预警列表能正确区分各自所属组织。
- **Scenario Description**：站点管理员管理多个组织时，若不显示组织归属，容易将不同组织的同名任务误判为同一个，从而误判影响范围。
- **Pre-condition**：至少两个不同组织下存在同名计划任务，且待删除用户在其中一个组织中拥有该任务或被设为其 Execute As。
- **Key Steps**：
  1. 以站点管理员身份进入用户管理页面，勾选待删除用户，点击删除。
- **Expected Result**：预警列表中该任务名称附带组织标识以区分同名任务；若仅存在于单一组织，则不显示组织后缀。
- **Risk Covered**：跨模块交互、边界条件。

### 场景 7：预检接口失败时删除流程的容错处理
- **Scenario Objective**：验证当任务影响查询请求失败（服务异常、超时）时，删除操作仍可正常继续，不被阻塞。
- **Scenario Description**：预警功能是辅助信息，按设计不应因查询失败而阻止管理员完成正常的删除操作，但需确认这一预期内的降级行为表现正确（回退为原始通用确认框而非报错卡死）。
- **Pre-condition**：模拟任务影响查询接口返回错误。
- **Key Steps**：
  1. 勾选一个拥有计划任务的用户，点击删除。
  2. 此时任务影响查询请求返回错误（如 500 或超时）。
- **Expected Result**：确认框仍正常弹出（展示原始通用确认文案，不含任务警告），管理员可继续确认并完成删除。
- **Risk Covered**：异常路径、设计预期行为验证。

### 场景 8：无权限管理的用户被批量选中删除时不泄露任务信息
- **Scenario Objective**：验证当被删除对象中包含当前管理员无权限管理的用户/组时，预警列表不会展示该用户名下的任务名称。
- **Scenario Description**：若预检接口对无权限对象也返回任务信息，会造成越权的信息泄露（管理员可借助删除操作探测其无权管理的组织/用户下的任务名称）。
- **Pre-condition**：当前管理员对部分待删除身份没有 ADMIN 权限。
- **Key Steps**：
  1. 以受限管理员身份选中包含无权限用户的多个身份，点击删除。
- **Expected Result**：预警列表仅展示有权限身份关联的任务；无权限身份的任务信息不出现在列表中，且对该身份的实际删除应被权限系统拒绝。
- **Risk Covered**：安全性、非法输入。

### 场景 9：小屏幕/移动端下确认弹窗的展示
- **Scenario Objective**：验证在小屏幕设备或窄浏览器窗口下，包含较长任务列表的删除确认框能正常显示不被裁剪。
- **Scenario Description**：确认框宽度从 350px 增至 500px，任务列表较长时在小屏幕下可能超出可视区域，导致管理员无法看清全部风险内容而误操作。
- **Pre-condition**：待删除用户拥有多个计划任务（列表较长）。
- **Key Steps**：
  1. 将浏览器窗口缩小至移动端宽度或使用移动设备访问 EM。
  2. 勾选该用户，点击删除。
- **Expected Result**：确认框自适应屏幕宽度，内容可通过滚动完整查看，不出现文本截断或按钮遮挡。
- **Risk Covered**：渲染/UI 行为变化、跨设备兼容性。
