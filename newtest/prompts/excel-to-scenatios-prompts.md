# Excel → High-Value E2E Scenarios Prompt (Universal)

从碎片化、表格化的 Excel 测试点中，**重构**出高价值、可执行、低冗余的 E2E 场景，并确保每条业务规则都有 P1/P2 场景覆盖。

---

## 一、输入分析与决策树

### Step 1: 复杂度检测（仅记录，不阻断）

检测以下特征（任一项为 Yes 则复杂）：

| 特征 | 检测规则 | Yes/No |
|------|---------|--------|
| 外部引用 | 含「请看」「refer to」+ 其他文件名 | [ ] |
| 层级嵌套 | 缩进表示父子关系 | [ ] |
| Bug/Feature 标注 | 含 `Bug #/Feature #` 或 `#Bug` | [ ] |
| 跨组件同步 | 同时涉及 EM、Portal| [ ] |
| 安全变体 | 含 security / multi-tenant / org | [ ] |

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

## 二、场景类型识别与优先级

### Step 1: 场景类型判定

从 Excel 测试点识别场景类型，决定处理策略：

| 类型 | 特征 | 处理 | 默认优先级 |
|------|------|------|------------|
| **权限控制** | 角色/权限/grant/deny/clone organizstion| **移交 Security 模块** | - |
| **多租户隔离** | 组织 | **按规则保留组织功能通路，权限部分移交** | - |
| **纯 UI** | 滚动条、拖拽、排序、悬浮效果、对话框动画 | **丢弃** | - |
| **纯前端校验** | 密码长度、邮箱格式（仅前端提示） | **丢弃** | - |
| **业务边界** | 特殊字符/空值/重名/超长（后端拒绝且无业务影响） | **丢弃** | - |
| **Bug/Feature** | Bug/Feature #标注 | 尝试融入主线场景，标注 `(fixes #Bug)` | - |
| **CRUD** | 创建/修改/删除 + 影响其他模块 | 保留，合并为业务叙事 | P1 |
| **跨模块同步** | EM/Portal/Composer间数据一致 | 保留 | P1 |
| **状态持久化** | 状态持久化（刷新/重登后仍生效） | 保留 | P1 |
| **删除级联** | 删除、cascade、阻止删除、依赖检查 | 保留 | P1 |


### Step 1.5: Security Domain Boundary（优先过滤）


**此规则在 Step 1 之后、Step 2 之前执行，优先级高于 Bug/Feature 融入。**

**核心原则：** 当前模块只测试自己的功能行为，不测试其他模块的职责。

**判断标准：**
> 问自己：「这个测试点的**核心验证对象**是什么？」
> 
> | 核心验证对象 | 处理 |
> |--------------|------|
> | 当前模块的业务功能/状态/数据 | ✅ 保留 |
> | 谁能做什么（权限/角色/归属） | ❌ 移交 Security 模块 |
> | 谁能看到什么（可见性/访问控制） | ❌ 移交 Security 模块 |
> | 租户的权限隔离 | ❌ 移交 Security 模块 |
> | Clone organization（任何涉及 clone 的场景） | ❌ 移交 Security 模块 |

**关键词快速判断：**

| 出现以下关键词 | 不代表自动移交，需判断核心验证对象 |
|--------------|----------------------------------|
| `security=` | 如果验证对象是「状态变化」→ 保留；如果是「谁能切换/谁能操作类」→ 移交 |
| `permission` / `grant` / `deny` / `ACCESS` | 通常核心验证对象是权限 → 移交 |
|`Clone` / `Multi-Tenant` | 如果涉及 `clone organization` / `资源归属` / `权限状态` → 移交 Security 模块；纯功能通路验证（如 dashboard 在 clone 后资源存在）→ 保留并标注 |

**边界不清时的处理：**
- 标记 `[BOUNDARY_UNKNOWN]` 
- 输出到 `Clarification Needed`，由用户确认归属模块


### Step 2: Bug/Feature 融入规则

当检测到 Bug/Feature 标注（`Bug #`、`Feature #`、`#Bug`、`#Feature`）时：

**融入策略：**
1. 判断该 Bug/Feature 是否属于**主线业务流程**
2. 若属于 → 融入相关主线场景，在步骤或断言后标注 `(fixes Bug #XXXXX)` 或 `(implements Feature #XXXXX)`
3. 若不属于（独立边缘场景）→ **不保留**（Bug regression 不单独生成场景）

**禁止：**
- 为每个 Bug 单独创建场景（除非无法融入任何主线场景）
- 在场景中只验证「Bug 不再出现」而不验证正确的业务行为

### Step 3: 场景命名标注

每个场景标题后标注类型标签：

| 标签 | 含义 |
|------|------|
| `[CRUD]` | 创建/读取/更新/删除核心流程 |
| `[Cross-Module]` | 跨模块数据同步 |
| `[Multi-Tenant]` | 多租户操作 |
| `[Feature]` | 可配置 Feature |

---

## 三、高价值过滤

### Layer 1 — 纯 UI 噪音（直接丢弃）

**Always discard:**
- scrollbar / drag / resize / 展开/折叠
- dialog 打开/关闭动画 / loading 指示器
- "can select", "can click", "displays correctly"，"pop up prompts"
- 排序 / 滚动条 / 工具栏工作正常

**Discard unless tied to permission/state:**
- 按钮 enabled/disabled（除非验证权限）
- 元素可见/不可见（除非验证权限）
- 选中/未选中状态（除非验证状态持久化）

---

## 四、关联验证（轻量级）

不强制要求每个 CUD 操作都有关联验证，但鼓励在以下情况添加：

| 操作 | 建议验证点 |
|------|-----------|
| 创建用户/组/角色 | 验证在列表中出现 + 相关引用处可见 |
| 修改权限 | 验证实际权限生效（登录后访问资源） |
| 删除资源 | 验证在所有引用处消失 |

**格式：** 需要关联验证时，使用 `**Verify:**` 标注

---

## 五、规则覆盖检查（轻量级）

### Step 1: 规则提取

从 Excel 中提取以下类型的规则：
- 数据约束（唯一性、必填）
- 状态流转条件
- 权限规则（谁能做什么）
- 级联规则（删除影响）

**不提取**：UI 布局规则、纯前端校验规则。

---

## 六、安全模式压缩

当检测到 security / tenant 变体时：

**覆盖策略：**

| 场景 | 覆盖数 |
|------|--------|
| security=false | 1 个代表场景 |
| security=true, single-tenant |  1 个（仅 grant，不生成 deny 单独场景） |

**[MODIFIED] 排除：**
- 频繁切换 `security=false → true → false` 的验证路径
- 如果 Excel 中明确写了「这种行为并没有很大意义」或类似表述，则不生成相关场景

**不生成：** N 种模式 × M 个测试点的全组合

---

## 七、跨端同步合并

检测到多个组件（EM、Portal）时，**合并为 1 个场景**


## Output Format

**Language:** English

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

## Rules & Notes

### Business Rules
- {从 Excel 提取的核心业务规则}

### Security & Multi-Tenancy (if applicable)
- **security=false:** {baseline}
- **security=true:** {constraints}
- **multi-tenant:** {isolation rules}

---

## Scenario Overview

| ID | Priority | Area | Scenario | Key Business Assertion |
|----|----------|------|----------|----------------------|
| TC-001 | P1 | CRUD | [summary] | [assertion] |

---

## Scenarios

#### TC-001 Scenario Name `P1`

**Scope:** {module boundary}
**Validates rule:** {business rule reference}

**Pre-conditions:** {system state / login role / required data}

**Steps:**
1. [action with clear business impact]
2. **Sync check:** [if cross-component]

**Expected:**
- [verifiable business assertion]

#### TC-00X Bug Regression `P2`

> **Bug #XXXXX** — {what broke before}

**Regression focus:** {what to verify}
**Pre-conditions:** {required state}
**Steps:** 1. [trigger] 2. [verify fix]
**Expected:** {correct behavior}

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
| [description] | [sheet/cell] | [what's unclear] |

---

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Permission affects visibility | Run after Security tests |

---