# Excel → High-Value E2E Scenarios Prompt (Universal)

从碎片化、表格化的 Excel 测试点中，**重构**出高价值、可执行、低冗余的 E2E，覆盖 P1/P2 场景。

---

## 一、输入分析与决策树

### Step 1: 输入特征检测 → 路由

扫描 Excel，按以下规则路由到对应处理步骤，**每条特征独立判断，不互斥**：

| 特征 | 检测规则 | 命中时执行 |
|------|---------|-----------|
| 外部引用 | 含「请看」「refer to」+ 其他文件名 | → Step 2 |
| Bug/Feature 标注 | 含 `Bug #` / `Feature #` / `#Bug` / `#Feature` | → Step 3 |
| 两套代码 | 含 `两套代码` / `two codebases` / `各自实现` / `#dual-codebase` | → Step 1.5.3 |
| 安全 / 多租户变体 | 含 security / multi-tenant / org | → Step 1.5 |
| 跳过标记 | 含「不需要测试」「skip」「意义不大」「optional」 | → Step 1.5.1 |
| 缺少预期结果 | 有操作行但无预期结果列 | → Step 1.5.2 |

未命中任何特征时，直接进入 Step 4（场景类型识别）。


### Step 1.5: Environment-Based Scenario Organization

**核心原则：** 按三个环境分别组织场景，每个环境的场景独立、不混合。

**环境定义与覆盖策略：**

| 环境 | 覆盖策略 | 优先级 | 说明 |
|------|---------|--------|------|
| **security=true** | 完整 CRUD + 差异验证 | P1 | 主测试环境，覆盖所有通用行为 |
| **security=false** | **仅差异验证**（Enabled 行为、存储位置、默认可见性） | P2 | 相同行为不重复测试 |
| **multi-tenant** | 完整 CRUD + 跨组织隔离验证 | P1 | 验证多租户环境下基础功能正常，不测试 clone org / 组织权限 |

**环境标签：** 每个场景标题后必须标注 `[env: security=false]` / `[env: security=true]` / `[env: multi-tenant]`。若无环境依赖，标注 `[env: none]`。

**不混合原则：**
- ❌ 禁止在一个场景中切换 security 值
- ❌ 禁止在一个场景中混合单租户和多租户操作

**排除：**
- 在同一个场景内动态切换 security 模式的测试（此类行为依赖不稳定的中间状态，不产生可验证断言）
- 多租户特有操作：clone org、org filter 切换组织、跨组织权限分配（标注在 Related Module Tests）

### Step 1.5.1: Explicit Skip Detection

检测 Excel 单元格中是否包含以下关键词（不区分大小写），命中则不生成场景，计入 **Filtering Summary** 的 Discarded 计数，**不写入 Clarification Needed**：

| 关键词 | 处理 |
|--------|------|
| "不需要测试" / "no need to test" | 跳过，Filtering Summary 注明原因 |
| "跳过" / "skip" | 跳过，Filtering Summary 注明原因 |
| "意义不大" / "not meaningful" | 跳过，Filtering Summary 注明原因 |
| "视情况" + "不必须" / "optional" | 标注为 P3，不生成，Filtering Summary 注明原因 |


### Step 1.5.2: 缺少预期结果检测

若某行描述了操作（创建/编辑/删除/绑定/排序/查看）但无预期结果（列为空，或无"应该/验证/预期"等关键词）：

- **可推断的常规操作**（如"保存"、"创建"、"删除"）：自动推断预期结果（如"保存成功，数据生效"），写入 `## Clarification Needed` 并提示完善 Excel matrix
- **不可推断的模糊操作**（如"点击特殊按钮"、"执行自定义脚本"）：移入 `## Clarification Needed`

**例外：** 同一操作在其他行已有预期结果 → 跳过，不重复记录。

**写入 `## Clarification Needed` 格式：**
- Item: {操作描述}
- Location: {sheet / 单元格}
- Issue: "Missing expected result"


### Step 1.5.3: Two-Codebase Detection

**目的：** 检测模块是否使用两套独立代码（EM 和 Portal 各自实现），决定 CRUD 测试策略。

**触发条件：** Excel 中检测到以下任一信号（不区分大小写）：
- 含 `两套代码` / `two codebases` / `各自实现` / `EM和Portal代码不同`
- 含 `#dual-codebase` 标记
- 用户显式指定（通过输入变量 `Force-Two-Codebase: [module names]`）

**触发后场景分配规则（交叉测试策略）：**

| CRUD 操作 | 覆盖要求 | Sync check 方向 |
|-----------|---------|----------------|
| Create / Edit | EM 端和 Portal 端**各至少作为主操作端一次**；可根据 Excel 测试点密度合并或拆分，但不得遗漏任何一端的写路径 | 主操作端执行 → 另一端读验证 |
| Delete | 任一端执行即可 | 执行端 → 另一端确认消失 |
| EM-only feature | 纯 EM 场景，无需 Sync check | — |
| Portal-only feature | 纯 Portal 场景，无需 Sync check | — |
| 跨模块同步 | 不单独生成，内嵌在对应 CRUD 场景的 Sync check 步骤中 | — |

**场景标题格式：** 标题前加数据流方向前缀 `[EM→Portal]` 或 `[Portal→EM]`。

---

### Step 2: 外部引用处理

当检测到外部引用（含 `请看`、`refer to`、`see` + 其他文件名/路径）时：

**决策规则：**
- 主文件 = 当前输入的 Excel
- 引用文件 = 匹配到的外部文件名
- **策略**：引用文件**不生成独立场景**，仅作为主文件相关场景的**补充检查点**

**不补充的内容：**
- 引用文件中与主文件主题词无关的场景
- 引用文件中的独立功能（除非主文件明确要求）
- 引用文件中的基础 CRUD 测试点

---

### Step 3: Bug/Feature 融入规则

当检测到 Bug/Feature 标注（`Bug #`、`Feature #`、`#Bug`、`#Feature`）时：

**融入策略：**
1. 判断该 Bug/Feature 是否属于**主线业务流程**或**核心差异行为**
2. 若属于 → 融入相关主线场景，在步骤或断言后标注 `(Bug #XXXXX)` 或 `(Feature #XXXXX)`
3. 若不属于（独立边缘场景）→ **不保留**

**禁止：** 为每个 Bug 单独创建场景（除非无法融入任何主线场景）

---

### Step 4: 场景类型识别与优先级

从 Excel 测试点识别场景类型，决定处理策略：

| 类型 | 特征 | 处理 | 默认优先级 |
|------|------|------|------------|
| **CRUD（核心）** | 创建/编辑/删除/排序/绑定 Viewsheet | 保留 | P1 |
| **跨模块同步** | EM/Portal/Composer间数据一致 | 保留，合并到对应 CRUD 场景中 | P1 |
| **状态持久化** | 状态持久化（刷新/重登后仍生效） | 保留 | P1 |
| **删除级联** | 删除、cascade、阻止删除、依赖检查 | 保留 | P1 |
| **环境差异** | security=true 与 false 的行为差异 | 生成差异验证场景，标注 `[env-diff]` | P1 |
| **权限控制** | permission/grant/deny/clone organization /ACCESS 权限分配/ Security tab 操作 | **不生成场景**，标注在 Related Module Tests 中 | - |
| **多租户管理操作** | clone organization / 跨组织权限分配（非数据可见性验证） | **不生成独立场景**，标注在 Related Module Tests 中；org 内数据隔离 / 可见性验证属于正常 multi-tenant CRUD，归入 Step 1.5 的 Env: multi-tenant 区 | - |
| **纯 UI** | 滚动条、拖拽、排序、悬浮效果、对话框动画 | **丢弃** | - |
| **纯前端校验** | 密码长度、邮箱格式（仅前端提示） | **丢弃** | - |
| **业务边界** | 特殊字符/空值/重名/超长（后端拒绝且无业务影响） | **丢弃** | - |

**两套代码时的特殊处理（触发 Step 1.5.3 后）：**

| 类型 | 默认处理 | 触发两套代码后 |
|------|---------|---------------|
| **CRUD** | 合并同步验证 | 完全按 Step 1.5.3 交叉测试策略 |
| **多租户** | 正常生成 | 同上，EM 和 Portal 独立写路径各自通过交叉策略覆盖 |

---

### Step 5: 场景命名标注

每个场景标题后标注类型标签：

| 标签 | 含义 |
|------|------|
| `[CRUD]` | 创建/读取/更新/删除核心流程 |
| `[Cross-Module]` | 跨模块数据同步 |
| `[Multi-Tenant]` | 多租户操作 |
| `[Feature]` | 可配置 Feature |
| `[EM]` | EM 端执行（仅当触发两套代码时使用） |
| `[Portal]` | Portal 端执行（仅当触发两套代码时使用） |
| `[env: security=false]` | 安全关闭环境 |
| `[env: security=true]` | 安全开启环境 |
| `[env: multi-tenant]` | 多租户环境 |

---


## 二、Output Format

**Language:** English

**强制要求：**
1. 每个场景标题后必须标注环境标签 `[env: security=false/true/multi-tenant]` 和类型标签
2. 涉及 EM ↔ Portal 双向操作的场景，步骤中必须包含 `**Sync check:**`
3. Sync check 格式：`**Sync check:** {目标位置} — {预期状态}`
4. 触发两套代码时：EM 和 Portal 交叉验证CURD验证确保两端都覆盖，也需要验证两端同步

---

### 输出结构

所有模块使用统一结构。触发两套代码时，Scenario Overview 和 Scenarios 区域按 Step 1.5.3 交叉测试策略填写，其余区域不变。


```markdown
---
module: {module name}
source: {Excel filename}
Excel-path: [direct | two-phase]
last-updated: YYYY-MM-DD

---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | X |
| Kept P1 | X |
| Kept P2 | X |
| Needs clarification | X |

---

## Feature Summary

{2-4 sentences: what problem, primary users, core business objects}

---

## Manual Testing Summary

> 手工测试执行指引。详细场景见下方 Scenarios，本部分仅提供方向和重点。

### 核心规则 (一句话理解)
{key business rules}

### 测试重点 (按优先级)

| 优先级 | 测试方向 | 关键验证点 |
|--------|----------|-----------|
| P1 | 完整 CRUD | 创建/编辑/删除/排序后，EM + Portal 两端同步 |


### 容易出问题的地方 (测试时重点关照)
{problem areas}

### 必做联动模块测试

| 联动模块 | 测试场景 | 最少用例数 |
|----------|----------|-----------|
| Security / 权限 | security=true 时，对 Global Dashboard 做 grant/deny ACCESS | 2 |

---

## Environment Differences

{security=true vs false differences, if any}

---

## Scenario Overview

### Env: security=true (完整 CRUD + 差异验证)


| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC-001 | P1 | Create {object} | {key assertion} |


### Env: security=false (仅差异验证)

| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|


### Env: multi-tenant (完整 CRUD)


| ID | Priority | Scenario | Key Business Assertion |
|----|----------|----------|----------------------|
| TC-201 | P1 | ... | ... |


---

## Scenarios

### Env: security=true

#### TC-001 Scenario Name `P1`

**Scope:** {module boundary}
**Validates rule:** {business rule reference}

**Pre-conditions:** {system state / login role / required data}

**Steps:**
1. [action with clear business impact]
2. **Sync check:** [if cross-component]

**Expected:**
- [verifiable business assertion]

### Env: security=false

#### TC-00X Scenario Name `P1` `[env: security=false]` `[Feature]`

**Scope:** {module boundary}
**Validates rule:** {behavior difference under security=false}

**Pre-conditions:** security=false, {login role}

**Steps:**
1. [action]
2. **Verify:** [permission effect]

**Expected:**
- [verifiable assertion about visibility]

### Env: multi-tenant

#### TC-00Y Scenario Name `P1` `[env: multi-tenant]` `[Multi-Tenant]`

**Scope:** {cross-org operation}
**Validates rule:** {isolation or cross-org rule}

**Pre-conditions:** multi-tenant environment, {org setup}

**Steps:**
1. [action across orgs]
2. **Sync check:** [other org context]

**Expected:**
- [verifiable assertion about org isolation]

---

## Uncovered Rules

> 以下规则没有对应的 P1/P2 场景覆盖。P3 规则已丢弃。

| Rule ID | Rule Description | Priority | Reason / Suggested Fix |
|---------|------------------|----------|------------------------|
| R-001 | {规则原文} | P2 | [NEEDS SCENARIO]: {minimal suggestion} |

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| {action} | {sheet/cell} | Missing expected result |

---

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Permission affects visibility | Run after Security tests |
| Organization(Clone Org) | Clone org affects | Verify Enable state = false after clone |

---