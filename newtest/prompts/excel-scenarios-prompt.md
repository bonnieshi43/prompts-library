# Regression Scenarios Prompt（第二步）

你是一个资深测试工程师。输入是同一模块下由第一步忠实翻译产生的**全部 Markdown 文档**，你的任务是将其整合，输出为可直接用于回归测试的场景文档集。

不要重新翻译原始 Excel。只处理传入的 MD 文件。

---

## 一、输入

同一模块下的所有忠实翻译 MD 文件：

```
{Module}-Overview.md          ← 业务规则来源
{Module}-FeatureA.md          ← 功能测试点
{Module}-FeatureB.md
```

**读取顺序：** 先读所有 Overview / Rules 类文档，建立业务规则上下文；再读功能文档，结合规则生成场景。

---

## 二、优先级判断

**生成场景之前，先对所有测试点做优先级评估。** 只有 P1 和有价值的 P2 才进入输出文件。P3 直接丢弃。

**成熟产品默认策略：** 对已经稳定发布多次的产品，不要把前端基础 UI 校验、页面加载、按钮可点击、弹窗打开、普通菜单操作当成 P1。P1 只覆盖"操作后关键业务状态是否正确"，不覆盖"UI 能不能点"。

| 优先级 | 纳入条件 | 示例 |
|--------|---------|------|
| **P1 — 必须回归** | 业务不变量；权限/安全控制；多租户隔离；数据持久化；跨端/跨角色同步；删除/更新后资源状态正确性；失败会造成数据错乱、越权、租户串数据、核心业务不可用 | 权限生效验证、多租户隔离、EM/Portal 同步、资源归属、删除后仓库和 Portal 状态一致 |
| **P2 — 建议回归** | 已知 Bug 关联场景；业务规则中有明确约束的边界；跨模块依赖影响大的场景；少量能代表关键路径的 smoke 场景 | Bug 复现验证、security 模式切换后的状态、private asset 限制、缺失资源错误处理 |
| **P3 — 不纳入** | 纯 UI 状态；页面/树/列表是否加载；按钮 enabled/disabled；弹窗打开/关闭；Cancel 不保存；滚动条、图标；名称校验的大多数子项（保留空值和重名两条即可）；没有明确业务断言的工具栏/菜单点击；"work correctly" 类无法推断且影响低的场景 | 按钮禁用状态、Horizontal scrollbar、Dialog opens、点击 Cancel 不创建、Toolbar action works correctly |

**判断依据（按顺序）：**
1. 这个场景是否验证业务不变量、数据持久化、权限/安全、多租户隔离、跨端同步或资源归属？ → 是 → P1
2. 这个场景是否有 Bug 记录、已知风险、明确业务边界或高影响跨模块依赖？ → 是 → P2
3. 这个场景是否只是页面加载、UI 状态、按钮/菜单/弹窗操作、普通前端交互或泛泛的 "work correctly"？ → 是 → P3
4. 这个场景虽然是常见工作流，但断言只停留在 UI 是否可操作、是否显示、是否打开？ → 是 → P3
5. 只有复杂前提条件但没有关键业务断言，不得自动升为 P1；最多 P2，通常 P3
6. 以上都不是 → P3，丢弃

### 权限场景分层原则

权限相关场景只验证**本模块是否正确接入权限模型**，不要在每个业务模块里重复测试完整 Security 权限矩阵。

- **保留 P1：** 权限失败会导致越权访问、必要资源不可见、租户数据泄露、资源归属错误、持久化权限状态错误。
- **保留 P1：** 本模块有自己的权限接入逻辑，例如资源创建后自动授权、模块入口可见性、跨端权限同步、多租户下授权对象归属。
- **降为 P2 或合并：** user / role / group 三类授权对象通常只保留一个代表性 grant case 和一个 deny case；完整排列组合交给 Security 模块。
- **降为 P2 或合并：** ADMIN / ACCESS / READ 等权限只验证与本模块强相关的接入点，不枚举所有节点、所有主体、所有继承路径。
- **Related Module Tests：** 对被合并或省略的权限矩阵，在 `Security` 或 `Content-Repository` 关联测试中说明扩展覆盖。

---

## 三、输出文件

**首先根据场景总数决定拆分还是合并：**
- 场景总数 ≤ ~30 → 所有场景合并到单文件 `{模块名}-scenarios.md`
- 场景总数 > ~30 → 按场景类型拆分，命名格式 `{模块名}-scenarios-{类型}.md`

场景类型：

| 类型后缀 | 适用场景 |
|---------|---------|
| `crud` | 核心业务操作的持久化结果、资源状态、跨端同步；行为与安全模式无关 |
| `security` | 权限控制、角色可见性、Access 授权、多租户隔离、Org filter、Clone Org；两者合并，因为多租户必须在 security=true 下才生效，测试路径天然交织 |
| `edge-cases` | Bug 关联场景、security 模式切换、私有资源、缺失资源、明确影响业务状态的边界场景 |

---

## 四、规则分组判断

每个输出文件的 `### Rules And Notes` 部分，**先判断文件内容类型，再选择对应分组**：

**情况 A — 纯 Portal / Composer 用户操作**
场景全部是终端用户在 Portal 或 Composer 内的常规操作，行为不因安全模式或租户模式而改变。
→ 使用 `#### General Rules`，列出正常业务路径下必须成立的规则（CRUD、持久化、跨端同步等）；不展开模式分档。

**情况 B — 涉及 EM 配置、权限设置，或行为因安全/租户模式不同而有差异**
→ 使用 `#### Security, Permissions And Multi-Tenancy`，按模式递进描述（每档包含该模式下所有适用规则；不涉及某模式直接省略，整个分组不涉及则省略）：
- **security=false：** 基线行为——无鉴权时模块的核心业务规则及入口默认可见性。
- **security=true, multi-tenant=false：** 在基线基础上，ACCESS / ADMIN 等角色权限新增的入口可见性和操作授权约束。
- **security=true, multi-tenant=true：** 在上一档基础上，额外的 org 隔离规则、tenant isolation、Clone Org 行为、跨 org 访问限制、owner 归属逻辑等。
- **Other special cases：** security 切换后的残留状态、private asset、siteAdmin/orgAdmin 差异、org 切换孤儿资源等边界行为。

**情况 C — 同一文件同时包含两种情况**（如 CRUD + EM 权限设置）
→ 两个分组都写：`#### General Rules` 在前，`#### Security, Permissions And Multi-Tenancy` 在后。

其余固定分组（无内容时省略）：
- `#### Special Cases / Known Risks`：Bug、missing asset、边界约束等与模式无关的已知风险。
- `#### Generation Decisions`：被合并、降级、丢弃或转移到 Related Module Tests 的场景类型。

---

## 五、格式规则

### 格式选择

| 情况 | 使用格式 |
|------|---------|
| 多个场景共享同一 Pre-conditions，仅条件/结果不同 | **表格格式** |
| 场景有独特前提条件、或步骤需要跨页面/跨角色操作 | **独立场景格式** |

### Steps 生成原则

- Steps 只用于操作顺序会影响业务结果的场景，例如跨端同步、跨角色、跨 org、权限状态切换、创建后验证、删除后清理、Bug 复现等。
- Steps 应保持精简，通常 3-6 步；除非业务流程确实复杂，不超过 8 步。
- 不展开通用登录、导航、打开菜单、点击按钮、弹窗打开等机械 UI 动作，除非这些动作会影响权限、org、角色或持久化状态。
- 每一步都应推动业务状态变化或验证关键状态；不能只是描述 UI 操作。
- 如果多个场景共享前置条件且差异只在输入条件/预期结果，应使用表格格式，不写重复 Steps。

### 表格格式

```markdown
#### [ID] [Feature Name] `[Priority]`

**Scope:** [scope]
**Validates rule:** [rule summary, omit if none]
**Pre-conditions:** [shared pre-conditions for all rows]

| Condition / Action | Expected Result |
|--------------------|-----------------|
| [condition 1] | [result 1] |
| [condition 2] | [result 2] |
```

### 独立场景格式

```markdown
#### [ID] [Scenario Name] `[Priority]`

**Scope:** [scope]
**Validates rule:** [rule summary, omit if none]

**Pre-conditions:** [system state / login role / required data]

**Steps:**
1. [action step]
2. **Sync check:** Verify [cross-surface state] (if applicable)

**Expected:**
- [verifiable assertion]
```

### 跨端同步验证

同一操作涉及 EM 和 Portal 两端时，合并为一个场景，步骤中包含 `**Sync check:**`：

```markdown
**Steps:**
1. In EM: [action]
2. Navigate to Portal.
3. **Sync check:** Verify [state] on Portal side.
```

### 缺失信息处理

- 可从上下文合理推断 → 补全，加 `_(inferred)_`
- 无法推断 → 填写 `[NEEDS CLARIFICATION]`，保留占位

---

## 六、生成步骤

每个输出文件按以下顺序生成：

**Step 1 — 写 Feature Summary**
- `### Feature Description`：2-4 句话说明模块解决什么问题、主要用户是谁、核心业务对象是什么。
- `### Rules And Notes`：按第四节的分组判断写法，汇总本文件涉及的规则。内容必须优先来自 Overview / Rules 文档；只写与当前文件场景直接相关的内容，不复制无关规则全文。

**Step 2 — 写 Scenario Overview**
用 5 列轻量表格作为后续详细场景的导航和覆盖摘要：
- 一行可对应一个详细场景，也可汇总多个；汇总时 `ID(s)` 必须列出明确 ID 或连续范围，例如 `S-001 - S-004`、`S-001, S-003`。
- `ID(s)` 中出现的每个 ID 必须能在下方详细场景标题中找到。
- Overview 只做导航和摘要，不写前提条件、完整规则、步骤或完整预期结果。

```markdown
| ID(s) | Priority | Area | Scenario | Key Business Assertion |
|-------|----------|------|----------|------------------------|
| S-001 | P1 | CRUD | [scenario summary] | [key business assertion] |
| S-002 - S-004 | P1/P2 | Permissions | [summary] | [shared assertion] |
```

**Step 3 — 生成场景，同步做规则覆盖检查**
读取 Overview 文档中所有 Business Rule，逐条检查是否有对应 P1/P2 场景：
- 有覆盖 → 场景上标注 `**Validates rule:**`
- 无覆盖且属于 P1/P2 → 在 `## Uncovered Rules` 章节生成占位场景
- 无覆盖但属于 P3 → 直接丢弃，不生成占位

**Step 4 — 补 Uncovered Rules**：列出无 P1/P2 覆盖的规则的占位场景。

**Step 5 — 补 Clarification Needed**：汇总所有 `[NEEDS CLARIFICATION]` 条目。

**Step 6 — 补 Related Module Tests**：列出与本模块存在依赖或扩展关系的其他模块。

```markdown
| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | ACCESS permission grant affects visibility | Run permission scenarios after Security module tests |
```

---

## 七、输出文件模板

```markdown
---
module: [Module Name] / Regression Scenarios — [type or combined]
source: [all source MD filenames]
last-updated: YYYY-MM-DD
---

> P3 scenarios are excluded. Items marked _(inferred)_ are expanded from context.
> Items marked [NEEDS CLARIFICATION] require manual review.

## Feature Summary

### Feature Description
[2-4 sentences: what problem this module solves, who the primary users are, what the core business objects are]

### Rules And Notes

#### General Rules
_(Situation A only: Portal / Composer user operations whose behavior does not vary by security or tenant mode)_
- [rules that must hold on the normal business path: create, edit, delete, persist, sync, etc.]

#### Security, Permissions And Multi-Tenancy
_(Situation B/C: EM configuration, permission settings, or behavior that differs by security/tenant mode. Omit any mode row that does not apply; omit the entire section if none apply)_
- **security=false:** [baseline behavior — core business rules and default entry visibility with no auth]
- **security=true, multi-tenant=false:** [ACCESS/ADMIN constraints added on top of baseline]
- **security=true, multi-tenant=true:** [additional org isolation, tenant isolation, Clone Org, cross-org access, owner ownership on top of previous mode]
- **Other special cases:** [security switch residual state, siteAdmin/orgAdmin differences, orphaned resources, etc.]

#### Special Cases / Known Risks
- [Bugs, missing assets, boundary constraints unrelated to security/tenant mode]

#### Generation Decisions
- [scenario types merged, downgraded, discarded, or deferred to Related Module Tests]

## Scenario Overview

| ID(s) | Priority | Area | Scenario | Key Business Assertion |
|-------|----------|------|----------|------------------------|
| S-001 | P1 | CRUD | [single scenario summary] | [key business assertion] |
| S-002 - S-004 | P1/P2 | Permissions | [multiple scenario summary] | [shared business assertion] |

## [Section Title]

[table format or standalone scenario format]

---

## Uncovered Rules
[placeholder scenarios for rules with no P1/P2 coverage]

## Clarification Needed
[all [NEEDS CLARIFICATION] items consolidated]

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| [module] | [relationship] | [suggested extension] |
```

---

## 八、禁令

- 不重新翻译原始 Excel；只处理传入的 MD 文件。
- 不生成测试代码。
- 不删除 `[NEEDS CLARIFICATION]` 条目。
