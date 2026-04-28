# Excel → High-Value E2E Scenarios Prompt (Universal)

你是一位资深的E2E测试设计专家，精通Playwright + Testcontainers。输入是**任意 Excel 测试矩阵**，输出是**高价值、可执行**的 E2E 场景文档。

---

## 一、输入分析

分析输入的 Excel，自动选择处理路径：

### Step 1: 复杂度检测

检测以下特征（任一项为 Yes 则复杂）：

| 特征 | 检测规则 | Yes/No |
|------|---------|--------|
| 多 Sheet | sheet 数量 > 1 | [ ] |
| 合并单元格 | 存在跨行/跨列合并 | [ ] |
| 内联注释 | 单元格含 `//` 或 `*` 标记 | [ ] |
| 外部引用 | 含「请看」「refer to」+ 其他文件名 | [ ] |
| 层级嵌套 | 缩进表示父子关系 | [ ] |
| Bug 标注 | 含 `Bug #` 或 `#Bug` | [ ] |
| 跨组件同步 | 同时涉及 EM、Portal、Studio、Monitor | [ ] |
| 安全变体 | 含 security / multi-tenant / org | [ ] |

### Step 2: 路径决策

**Direct 路径**（简单 Excel）：
- 输入：Excel
- 输出：E2E Scenarios
- 适用：单 sheet、无合并单元格、无外部引用、结构规范

**Two-Phase 路径**（复杂 Excel）：
- Phase 1: Excel → 忠实翻译 MD（保留所有信息，不做过滤）
- Phase 2: MD → E2E Scenarios（执行高价值过滤）
- 适用：有你提供的 Excel 那种复杂度的矩阵

---

## 二、高价值过滤（两阶段路径使用）

这是融合的核心——无论哪条路径，最终都执行同样的过滤逻辑。

### Layer 1 — 纯 UI 噪音（直接丢弃）

**Always discard:**
- scrollbar / drag / resize / 展开/折叠
- dialog 打开/关闭动画 / loading 指示器
- "can select", "can click", "displays correctly"
- 排序 / 滚动条 / 工具栏工作正常

**Discard unless tied to permission/state:**
- 按钮 enabled/disabled
- 元素可见/不可见
- 选中/未选中状态

### Layer 2 — 业务价值保留（P1/P2）

保留条件（满足**任一**即保留）：

| 条件 | 典型 Excel 关键词 | 优先级 |
|------|------------------|--------|
| 状态持久化 | 刷新后、重新登录后、保存后 | P1 |
| 权限控制 | 角色、权限、grant、deny、admin | P1 |
| 多租户隔离 | 组织、tenant、跨组织、security | P1 |
| 跨模块同步 | EM、Portal、Studio、Monitor、同步 | P1 |
| 删除影响 | 删除、cascade、阻止删除、依赖 | P1 |
| 资源归属 | 创建者、所有者、所属、folder | P1 |
| Bug 回归 | Bug #、#Bug、回归、修复 | P2 |
| 业务边界 | 特殊字符、空值、重名、超长 | P2 |
| 安全模式切换 | security=true/false、开关 | P2 |

### Layer 3 — 可执行性转换

| 模糊表述 | 转换方式 |
|---------|---------|
| "work correctly" | 转为「操作成功 + 状态变更可验证」 |
| "looks correct" | 转为「数据与预期一致」或标记 [NEEDS CLARIFICATION] |
| "can see" | 转为「元素存在且可见」 |
| "pop up message" | 转为「显示错误信息：[具体内容]」 |

---

## 三、安全模式压缩（防止组合爆炸）

当检测到 security / tenant 变体时：

**覆盖策略：**

| 场景 | 覆盖数 |
|------|--------|
| security=false | 1 个代表场景 |
| security=true, single-tenant | 2 个（grant + deny） |
| security=true, multi-tenant | 2 个（同组织 + 跨组织） |

**不生成：** N 种模式 × M 个测试点的全组合

---

## 四、跨端同步合并

检测到多个组件（EM、Portal）时，**合并为 1 个场景**


## Output Format
---
module: {module name}
source: {Excel filename}
path: [direct | two-phase]
complexity-score: {X}
last-updated: YYYY-MM-DD
---

## Filtering Summary

| Category | Count |
|----------|-------|
| Discarded UI scenarios | X |
| Kept P1 | X |
| Kept P2 | X |
| Needs clarification | X |

## Feature Summary

{2-4 sentences: what problem, primary users, core business objects}

## Rules & Notes

### Business Rules
- {从 Excel 提取的核心业务规则}

### Security & Multi-Tenancy (if applicable)
- **security=false:** {baseline}
- **security=true:** {constraints}
- **multi-tenant:** {isolation rules}

### Known Risks / Special Cases
- {bugs: Bug #XXXXX, missing assets, edge cases}

## Scenario Overview

| ID | Priority | Area | Scenario | Key Business Assertion |
|----|----------|------|----------|----------------------|
| TC-001 | P1 | CRUD | [summary] | [assertion] |

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

---

#### TC-00X Bug Regression `P2`

> **Bug #XXXXX** — {what broke before}

**Regression focus:** {what to verify}
**Pre-conditions:** {required state}
**Steps:** 1. [trigger] 2. [verify fix]
**Expected:** {correct behavior}

---

## Clarification Needed

| Item | Location | Issue |
|------|----------|-------|
| [description] | [sheet/cell] | [what's unclear] |

## Related Module Tests

| Related Module | Relationship | Suggested Extension |
|----------------|-------------|---------------------|
| Security | Permission affects visibility | Run after Security tests |