# 为什么需要两步转换

## 问题的本质

第一步 prompt 做的是**忠实翻译**：Excel 的结构是什么，MD 就是什么。
Excel 的结构问题会原封不动地继承到 MD，进而影响回归场景的质量。

```
Excel（结构差）→ 忠实翻译 → MD（结构同样差）→ AI 生成回归场景（质量差）
```

---

## Excel 常见结构问题（以 Content-Dashboard.xlsx 为例）

### 1. 粒度不一致

同一份 Excel 里，不同功能点的描述粒度差异极大：

- `Name validation` — 有详细的多条子用例，每条有明确的输入和预期结果
- `Dashboard toolbar actions` — 只列了 12 个动作名 + "work correctly"，没有触发条件，没有具体断言

AI 遇到后者时无法知道该验证什么、断言什么。

### 2. 作用域边界模糊

`Edit Dashboard (Global AND User)` 合并在一起描述，没有分开说明两种情况下的行为差异。
AI 不知道哪些字段对 Global Dashboard 和 User Dashboard 是相同的，哪些是不同的。

### 3. 规则与测试没有对齐

Overview 里定义了业务规则（如 Clone Org 行为），但测试 sheet 里只有部分场景被覆盖，
有些规则根本没有对应的测试点。规则的覆盖缺口不可见。

### 4. 模糊的预期结果

- `*` 标记含义不明
- "viewsheet changed right"、"work correctly" 等表述过于主观
- AI 无法从这类描述生成可执行的断言

---

## 为什么不在第一步直接修复

| 方案 | 优点 | 缺点 |
|------|------|------|
| 忠实翻译（当前第一步） | 可溯源、可审计、原始内容保留完整 | 继承 Excel 结构缺陷 |
| 翻译时同步重构（一步到位） | 输出直接可用 | 失去与原始 Excel 的对应关系；AI 推断内容无法与原始来源区分 |
| 两步走（推荐） | 两个产物各有用途；优化层可单独审查和调整 | 多一个步骤 |

忠实翻译保留了与原始 Excel 的对应关系，便于后续变更时追溯和重跑。
优化层专门处理质量问题，产出可直接用于生成回归测试的场景文档。

---

## 两步转换流程

```
Excel
  │
  ▼ 第一步 prompt（excel-convert-prompt.md）
忠实翻译 MD（*-Overview.md / *-GlobalDashboard.md / *-UserPortalDashboard.md）
  │   ↑ 可溯源、可审计
  │
  ▼ 第二步 prompt（excel-scenarios-prompt.md）
回归场景 MD（*-scenarios.md）
  │   ↑ 粒度一致、作用域明确、断言完整、规则覆盖可见
  │
  ▼ 后续：AI 生成 E2E 测试代码
```

---

## 第二步的核心任务

1. **补全触发条件和断言** — 将 "work correctly" 类描述扩展为明确的 Trigger + Assert 对
2. **拆分作用域** — 将 "Global AND User" 合并描述拆为独立场景，明确各自边界
3. **归一化粒度** — 所有场景统一到同一详细程度，可直接生成测试代码
4. **标出规则覆盖缺口** — 对没有测试覆盖的 Business Rule 生成占位场景或明确标记
