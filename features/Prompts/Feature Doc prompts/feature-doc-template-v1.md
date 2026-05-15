---

doc_type: feature-test-doc
product: StyleBI
module: <module-name>
Feature_id: <Feature ID>
Feature: <Feature Title>
pr_link: <PR URL>
Assignee: <Assignee>
last_updated: <YYYY-MM-DD>
version: <Product Version>

---

# 输入与生成规则

请基于以下材料生成测试文档：
- 【Feature PDF】需求描述及相关Issue
- 【分析MD】含 🔴 标注 / 写未覆盖 / Test Result的测试分析
- 【知识库】相关文档（如有）

生成规则:
1. **从PDF提取**：核心目标、用户价值、所有Bug列表（标注New/Request Feedback状态）
2. **从分析MD提取**：所有 🔴 标注（测试分析/Test Result/未覆盖）、场景、风险识别
3. **从知识库提取**：扩展场景、模块影响
4. **合并覆盖**：同一场景多个来源时取并集，用Notes列注明来源
5. **Bugs**：自动将New/Request Feedback的Bug添加到第3节并生成对应TC-notes

---

# 1 Feature Summary

**核心目标**：简要说明 Feature 的目标和新增的能力
**用户价值**：简要说明解决用户什么问题

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

核心功能

## P1 - Functional Path

- 边界情况
- 异常输入
- 多对象交互
- UI状态变化

## P2 - Extended Path （按需测试）

- 性能
- 兼容性
- 安全

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| **P0** |
| TC-1 | | | | | |
| TC-2 | | | | | |
| **P1** |
| TC-3 | | | | | |
| TC-4 | | | | | |
| **P2** |
| TC-5 | | | | | |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
## Performance
## Compatibility
## 本地化
## script
## 文档/API
## 配置检查

---

# 5 Regression Impact（回归影响）

可能受影响模块：Chart / Dashboard / Dataset / Export / MV 等其他模块

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|---|

---