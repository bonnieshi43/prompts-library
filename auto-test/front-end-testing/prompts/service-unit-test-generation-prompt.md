# Service Unit Test Generation Prompt

为 Angular service 生成测试前，**先分析再写代码**，按以下步骤进行。

---

## Step 1：读懂实现

- 这个 service 的职责是什么？
- 公开方法的入参、出参、副作用各是什么？
- 依赖哪些外部服务？
- 哪些方法有返回值（可断言），哪些是 `void`（只能验证副作用）？
- 哪些方法有条件分支（if / switch / 三元）？

---

## Step 2：场景层分析

> 适用于有 HTTP 调用、对话框交互、路由跳转、状态变更的方法

对每个候选方法问三个问题：

**用户想做什么？** 用一句话描述用户意图。

**实现了什么？** 发了哪个请求、请求体从哪来、成功/失败各做了什么。

**两者是否一致？** URL 是否正确、错误分支是否都处理、副作用是否在正确时机触发。

> 如果方法是 `void` 且依赖多个串联对话框回调，标记为**跳过**，留给组件集成测试。

### 风险标注

识别出每条测试点后，标注 `[Risk N]`：

| 等级 | 含义 | 是否生成 |
|---|---|---|
| **Risk 3** | 静默失败、错误分支、多条件分支的关键路径、数据损坏、安全相关 | 必须 |
| **Risk 2** | happy path、URL/请求体正确性、成功后副作用、重要契约 | 每个场景至少 1 条 |
| **Risk 1** | 与已有 case 高度相似的参数变体、可从 happy path 直接推导的情况 | 跳过 |

**分析输出格式：**
```
方法：updateAuthenticationProvider
  [Risk 2] 新增：POST 到 ADD URL，成功后导航到列表页，body 包含正确 model
  [Risk 3] URL 路由：name 非空时用 EDIT URL + name（关键条件分支）
  [Risk 3] 失败：catchError → snackBar 触发，不导航
```

**生成规则：**
- 一个场景方法对应**一个 `describe` + 1～3 个 `it`**，按 Risk 3 → Risk 2 顺序排列
- 同一个 `it` 内可以有多个检查点（用 `// (a)` `// (b)` 标注），当它们共同描述同一场景的完整结果时
- `it()` 字符串以 `[Risk N]` 开头，方便在测试报告中区分优先级

---

## Step 3：纯逻辑层分析

> 适用于无副作用的转换函数、工具方法、数据映射

除了验证正常行为，**重点找实现没覆盖的情况**，逐项检查：

| 检查项 | 关注点 |
|---|---|
| null / undefined | 是否崩溃还是返回安全默认值 |
| 空值 / 空集合 | `""` / `[]` 的边界行为 |
| 单元素 | 循环、join、split 在只有一项时是否正确 |
| 重复值 | 去重逻辑是否真的生效 |
| 特殊字符 | 分隔符、空格出现在数据内部时的处理 |
| 方法名语义 | 命名暗示的契约是否被满足（如 `getDistinct` 是否真去重）|

同样标注 `[Risk N]`，Risk 1 跳过。同类边界合并进同一个 `it`。

**生成规则：** 一个纯逻辑方法对应 **2～4 个 `it`**，按 Risk 3 → Risk 2 顺序排列。

---

## Step 4：识别 KEY contracts 和 Design gaps

在写代码前，额外整理两项：

**KEY contracts**：哪些行为是调用方依赖的不变式？（用于写文件头注释）

**Design gaps**：哪些情况实现没有处理，但不值得为此写测试？（记录到文件头，不生成 case）

**已知 bug**：哪些边界输入会导致运行时错误或错误结果？用 `it.failing()` 记录，附触发路径说明。Angular 项目中 zone.js 会重写全局 `it` 和 `test`，导致 `.failing` 属性丢失；需从 `@jest/globals` 导入原始 `it`：
```ts
import { it as jestIt } from "@jest/globals";
jestIt.failing("...", () => { ... });
```

---

## Step 5：生成测试代码

按以下规范生成：

**文件头注释结构（必须包含）：**
```ts
/**
 * XxxService — unit tests
 *
 * Risk-first coverage (N groups, M cases):
 *   Group 1 [Risk 3, 3, 2] — methodName (3 cases)
 *   Group 2 [Risk 2, 2]    — anotherMethod (2 cases)
 *
 * Confirmed bugs (it.failing — remove wrapper once fixed):
 *   - 描述 bug，或写 none
 *
 * KEY contracts:
 *   - 列出关键不变式
 *
 * Design gaps:
 *   - 列出不测的情况及原因
 */
```

**其他规范：**
- 每个 Group（= 一个方法）前用分隔注释，`describe()` 字符串 = 方法名，`it()` 字符串以 `[Risk N]` 开头：
  ```ts
  // ---------------------------------------------------------------------------
  // Group 1 [Risk 3, 3, 2] — methodName
  // ---------------------------------------------------------------------------
  describe("methodName", () => {
    it("[Risk 3] should ... when ...", () => { ... });
    it("[Risk 3] should NOT ... when ...", () => { ... });
    it("[Risk 2] should ... on success", () => { ... });
  });
  ```
- `// 🔁 Regression-sensitive: 原因` 注释**仅用于 Risk 3 的 `it`**，或 Risk 2 中回归风险从测试名称无法直接看出的情况；Risk 2 的常规 happy-path 跳过
- 多检查点用 `// (a)` `// (b)` 在 `it` 内标注
- **框架**：优先使用最适合当前层次的框架，不做强制规定
- **不生成**：`void` + 多层串联对话框的方法；Risk 1 case
