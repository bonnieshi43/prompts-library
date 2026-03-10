---
doc_type: feature-test-doc
product: StyleBI
module: <module-name>
feature_id: <Feature ID>
feature: <Feature Title>
pr_link: <PR URL>
Assignee: <Assignee>
last_updated: <YYYY-MM-DD>
version: <Product Version>
---

# 1 Feature Summary

简要说明 Feature 的目标和新增的能力

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

核心功能

## P1 - Functional Path

- 边界情况
- 多对象交互
- UI行为

## P2 - Extended Path

- 性能
- 兼容性

---

# 3 Test Scenarios

| ID        | Scenario   | Steps      | Expected | Result | Notes   |
| --------- | ---------- | ---------- | -------- | ------ | ------- |
| TC70565-1 | SVG upload | 上传svg      | 上传成功     | Pass   |         |
| TC70565-2 | SVG render | chart使用svg | 显示正常     | Fail   | shape错位 |
| TC70565-3 | SVG export | 导出pdf      | svg正常    | Pass   |         |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
## Performance
## Compatibility
## 本地化
## script
## 文档/API

---

# 5 Regression Impact（回归影响）

可能受影响模块：Chart / Dashboard / Dataset / Export / MV 等其他模块

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|---|

---

