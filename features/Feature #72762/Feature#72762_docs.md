---
doc_type: feature-test-doc
product: <你的产品名：StyleBI 或其他>
module: Input Components
feature_id: #74041
feature: 输入组件可配置 input label 与 spacing（TextInput/Combobox/Slider/Spinner）
issue_link: [http://173.220.179.100/issues/72762]
pr_link: [[https://github.com/inetsoft-technology/stylebi/pull/2699]]
Assignee: Franky Pan
last_updated: 2026-03-12
version: stylebi-1.1.0
---

# 1 Feature Summary

为 TextInput、Combobox、Slider 和 Spinner 组件新增 input label 功能与 spacing/padding 可控配置，避免标签文本因空间不足被截断，提升 UI 可用性与美观。解决标签因长度/空间有限被截断的问题，支持组件间距灵活配置。

---

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 配置正常 label 与 spacing，label 展示完整，不被截断
- 输入组件 label 与控件排版无错位

## P1 - Functional Path

- 边界情况：label为空、超长、特殊字符
- 多对象交互：页面多组件并列/嵌套场景 label 排版
- UI行为：label padding 不同取值（0px、5px、20px、异常值）

## P2 - Extended Path

- 性能：大表单场景 label + spacing 配置响应是否流畅
- 兼容性：历史页面升级后显示、移动端兼容

---

# 3 Test Scenarios

| ID        | Scenario                | Steps                                                               | Expected                                      | Result | Notes         |
| --------- | ----------------------- | ------------------------------------------------------------------- | --------------------------------------------- | ------ |--------------|
| TC74041-1 | label 正常配置展示      | 新增四类输入组件，label 设短文本                                    | label 展示完整                                | Pass   |              |
| TC74041-2 | label 超长文本展示      | label 配置超长文本                                                  | label 不被截断，UI自适应                      | Fail   | Bug #74050    |
| TC74041-3 | label 空白展示           | label 配置为空                                                      | label 区域为空，UI正常                        | Pass   |              |
| TC74041-4 | label 特殊字符           | label 配置特殊字符（@#￥%……）                                       | label 展示正常                                | Pass   |              |
| TC74041-5 | padding 异常值           | padding 配置负数/极大值                                             | UI合理降级、提示或不影响排版                  | Fail   | Bug #74045    |
| TC74041-6 | 多组件场景排版           | 页面并列多控件设置不同 label/padding                                | 排版、间距一致性，无错位                      | Fail   | Bug #74048    |
| TC74041-7 | 状态同步                 | label 配置修改后控件显示、数据状态同步                              | 显示及时更新、数据一致                        | Fail   | Bug #74044    |
| TC74041-8 | 控件脚本支持/导出        | 表单脚本引用、导出 label 属性                                        | 数据脚本/导出与UI一致                         | Fail   | Bug #74042    |
| TC74041-9 | 历史页面回归             | 升级后旧页面无 label 配置展示、混合配置                              | 排版无异常，交互正常                          | Pass   | 默认为false   |
| TC74041-10| 多语言场景               | 切换多语言环境，label 展示与自适应                                  | 多语言文本展示正常，不被截断                  | Pass   | 语言无需关注  |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security
无需特殊安全测试

## Performance
大表单快速操作下 label/spacing 配置无明显性能退化

## Compatibility
多浏览器、移动端兼容性

## 本地化
多语言展示场景

## script
表单脚本及导出支持 label 属性

## 文档/API
文档属性说明同步新增 label 及 spacing 参数

---

# 5 Regression Impact（回归影响）

可能受影响模块：TextInput / Combobox / Slider / Spinner / Form组件 / Dashboard / Dataset / Export / MV 等其他模块

---

# 6 Bug List

| Bug ID   | Description                                   | Status    |
| -------- | --------------------------------------------- | --------- |
| #74045   | padding 异常值处理不合适                      | Closed      |
| #74050   | label 超长文本显示异常                        | Closed      |
| #74048   | 多组件 label 行为不一致                       | Closed      |
| #74044   | label 修改后 position 内容丢失                 | Closed     |
| #74042   | script 不支持 label 属性                      | Resolved      |
| #74043   | format 等设置下 label 不应用                   | Resolved      |

---
