---
doc_type: feature-test-doc
product: <product-name>
module: <module-name>          # e.g. Chart / Axis Properties（Portal）
feature_id: <feature-id>
feature: <feature-title>
type: feature-test-spec        # 兼容旧模板字段；如不需要可删除
owner: <owner/team>
assignee: <assignee>
pr_link: <pr-url>
last_updated: <YYYY-MM-DD>
version: <product-version>
---

## 1 Feature Summary

### What / Why

- **Goal**：一句话说明新增能力解决什么问题
- **User entry**：用户入口路径（菜单/右键/对话框/脚本 API）
- **Key behavior**：勾选/配置后发生的可观察变化（渲染/数据/交互）

### Scope & Non-scope

- **In scope**：适用对象/模块/图表类型/场景
- **Out of scope**：明确不支持或不应暴露入口的对象/场景

---

## 2 Functional Rules（规则化描述，避免只写步骤）

> 用“默认 + 变化 + 约束 + 优先级”的方式描述规则，便于写用例和定位回归。

- **Default behavior**：
- **Toggle / config behavior**：
- **Multi-object interaction**（多轴/多绑定/多图/多视图等）：
- **Priority rules**（UI vs Script / 配置覆盖顺序）：
- **Error handling / guardrails**（禁用、灰显、不崩溃、不乱码等）：

---

## 3 Compatibility / Support Matrix（适用性矩阵）

> 建议按“对象类型/子类型 → 是否支持 → 备注/限制”写，快速覆盖边界。

| Object / Type | Subtype / Example | Entry exists? | Supported? | Expected behavior / Notes |
|---|---|---:|---:|---|
|  |  |  |  |  |

---

## 4 Test Focus（只列必须测的路径）

### P0 - Core Path（必测主路径）

- **Core scenario(s)**：
- **Persist & reload**（保存/刷新/导入导出 round-trip）：
- **UI state echo**（对话框回显/禁用/灰显规则）：

### P1 - Functional / Boundary（高风险功能与边界）

- **Multi-binding / multi-axis / mixed modes**：
- **Not supported / negative paths**：
- **Locale**（若有 UI 文案）：

### P2 - Extended（按需抽样）

- **Export / Print / Embedded**：
- **Performance**（如大数据量/多对象）：
- **Backward compatibility**（旧文件/旧脚本/旧配置）：

---

## 5 Test Scenarios（可执行用例表）

> 该表用于落地执行与回归记录；“Expected”写可观察结果；“Notes”记录风险/bug/限制。

| ID | Priority | Scenario | Steps | Expected | Result | Notes (risk/bug/link) |
|---|---|---|---|---|---|---|
| TC<feature>-1 | P0 |  |  |  |  |  |

---

## 6 Special Testing（仅当涉及时填写）

### Security

- 

### Performance

- 

### Compatibility

- **Old config**：
- **Round-trip**：

### Script / Programmatic Support

- **API(s)**：
- **UI vs Script priority**：
- **Gotchas**（e.g. bit-flag 叠加、getter 语义变化）：

### Localization

- **Strings / keys**：
- **Fallback behavior**（无翻译时）：

### Docs / API

- **Doc updates needed**：

---

## 7 Regression Impact（回归影响）

- **Impacted areas**：渲染引擎 / 对话框模型 / 序列化 / 导出 / Dashboard 运行态 等
- **Smoke list**：未开启功能时的默认行为不应变化（列 3-5 个代表性对象）

---

## 8 Bug List

| Bug ID | Description | Status | Link / Notes |
|---|---|---|---|
|  |  |  |  |

