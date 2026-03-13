---
doc_type: feature-test-doc
product: StyleBI
module: Freehand Table
feature_id: 71122
feature: Freehand Table公式自动提示（dimmed Formula field）
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2784
Assignee: Stephen Webster
last_updated: 2026-03-12
version: stylebi-1.1.0
---


# 1 Feature Summary

**核心目标**：在 Freehand Table 中展示每个单元格默认公式（dimmed Formula field），辅助用户理解和调整公式配置。
**用户价值**：解决用户在将普通 Table 转换为 Freehand Table 时无法直观查看各单元格代表的公式的问题，提高可编辑性与操作透明度。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 普通 Table 转换为 Freehand Table，所有单元格显示 dimmed Formula field，内容与实际公式一致且只读。

## P1 - Functional Path

- 边界情况：空字段、无效/异常公式、复杂结构。
- 异常输入：输入包含空值、无效公式时公式提示表现。
- 多对象交互：Table、Formula Table 等多种类型表转为 Freehand Table。
- UI状态变化：公式提示展示、只读权限、遮挡等变化。

## P2 - Extended Path （按需测试）

- 性能：批量转换、大表渲染性能。
- 兼容性：不同浏览器、不同分辨率下公式展示表现。
- 安全：公式内容不包含敏感数据，符合权限要求。

---

# 3 Test Scenarios

| ID        | Scenario                                    | Steps                                                         | Expected                               | Result | Notes               |
|-----------|---------------------------------------------|--------------------------------------------------------------|----------------------------------------|--------|---------------------|
| TC70565-1 | Table转Freehand Table公式提示               | 普通Table转Freehand Table，检查公式提示                      | 所有单元格显示dimmed Formula field，内容与公式一致 | Pass   | table/crosstab均正常|
| TC70565-2 | 边界条件公式提示                             | 空字段、无效公式、复杂Formula表转Freehand Table               | 空字段标准提示，错误无异常，复杂公式显示准确         | Pass   | field自动生成，无错误|
| TC70565-3 | 跨模块/多类型表转换公式提示                  | 普通Table、Formula Table、Style Studio生成表转Freehand Table  | 公式提示一致，兼容无异常                        | Pass   | 兼容性验证通过      |
| TC70565-4 | Help/API文档同步                             | 检查Help、API页面有“公式提示”描述                            | 文档描述准确，操作说明完整                       | Pass   | 文档需重新截图      |
| TC70565-5 | 多语言/UI本地化兼容性                        | 英文/中文切换、不同分辨率浏览器渲染公式提示                   | 本地化内容正确，渲染无异常                       | Pass   | 工具栏无需调整      |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
- 验证公式内容不包含敏感数据，无权限泄露风险。

## Performance
- 验证批量导入、大表渲染无明显性能延迟。

## Compatibility
- 浏览器（Chrome/Edge）、不同分辨率均能正确渲染。

## 本地化
- 多语环境下公式提示文本准确显示。

## script
- 公式字段涉及脚本组件，需验证Auto-complete、语法高亮。

## 文档/API
- Help/API同步包含新功能介绍。

## 配置检查
- 无特殊配置变更。

---

# 5 Regression Impact（回归影响）

可能受影响模块：Chart / Dashboard / Dataset / Export / MV / Style Studio / Formula Table 等其他模块

---

# 6 Bug List（feature功能很简单无重大缺陷，报了freehand本身的问题）

| Bug ID      | Description                | Status    |
|-------------|---------------------------|-----------|
| N/A         | 当前未发现重要缺陷         | Closed    |

---