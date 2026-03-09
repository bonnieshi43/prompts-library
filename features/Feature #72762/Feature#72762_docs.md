## doc_type: feature-test-doc

product: StyleBI
module: 前端UI组件
feature_id: 72762
feature_name: 输入标签功能增强
pr_link: [[https://github.com/inetsoft-technology/stylebi/pull/2699]](https://github.com/inetsoft-technology/stylebi/pull/2699])
last_updated: 2026-03-09

# 1 Feature Summary

为 TextInput、Combobox、Slider 和 Spinner 组件新增 input label 属性。目标提升表单组件的信息表达能力及交互性，用户可直观看到输入对象含义，支持 label 显示、隐藏与动态编辑。重点解决控件缺乏标签导致的体验与易用性问题，但目前 label 行为存在边界限制（仅单行、不可自定义位置），部分极端情况尚未覆盖。

# 2 Test Focus

只列 **必须测试的路径**

## P0 - Core Path

- 输入控件新增 label 属性的显示和隐藏功能
- label 与控件状态（enable/disable）同步
- label 对控件布局与排版影响
- label 与历史无label配置兼容性

## P1 - Functional Path

- 超长/特殊字符 label 文本处理与排版
- label 编辑与控件联动（如位置变更导致内容丢失）
- printLayout、导出等场景下 label 显示与隐藏
- label 与 Script、事件接口的一致性（脚本接口同步、事件触发等）
- label 国际化本地化切换
- 多控件组合下 label 联动

## P2 - Extended Path

- 批量控件渲染场景下性能影响
- 主流浏览器与移动端布局表现一致性

---

# 3 Test Scenarios


| ID          | Scenario     | Steps                         | Expected            | Result | Notes               |
| ----------- | ------------ | ----------------------------- | ------------------- | ------ | ------------------- |
| TC-LABEL-1  | Label 显示     | 为4控件添加label，页面加载              | label显示在控件预设位置，UI正常 | Pass   |                     |
| TC-LABEL-2  | Label隐藏/同步状态 | 控件enable/disable切换，观察label表现  | label与控件同步变灰/隐藏     | Fail   | label未同步变灰，已报bug    |
| TC-LABEL-3  | 超长label文本    | 设置超长label文本及特殊字符，页面加载         | UI无溢出，排版合理          | Fail   | 文本处理异常，已报bug        |
| TC-LABEL-4  | Label编辑联动    | 编辑label及其position，观察input内容变化 | content不丢失，脚本自动更新   | Fail   | 编辑导致内容消失，已报bug      |
| TC-LABEL-5  | Label国际化切换   | 切换locale，label观察多语种           | label正确切换，无资源缺失     | Fail   | 本地化资源缺失，已报bug       |
| TC-LABEL-6  | Label导出/打印   | printLayout、导出PDF等操作          | label正确显示/隐藏        | Fail   | printlayout不显示label |
| TC-LABEL-7  | 历史配置兼容回归     | 控件无label场景与旧版比对               | 行为一致，无异常            | Pass   |                     |
| TC-LABEL-8  | 脚本与事件接口      | 脚本API、事件触发验证                  | label同步支持脚本、事件      | Fail   | 接口未同步，已报bug         |
| TC-LABEL-9  | 批量控件性能       | 大表单批量渲染label，动态修改label        | 页面渲染流畅，无性能瓶颈        | Pass   |                     |
| TC-LABEL-10 | 浏览器兼容性       | Chrome、Firefox、Edge、移动端逐一展示   | UI排版一致，交互一致         | Pass   |                     |


---

# 4 Special Testing

## Security

label仅为UI文字，无安全风险

## Performance

批量控件渲染，动态label编辑已覆盖

## Compatibility

主流浏览器与移动端测试通过
老配置兼容测试通过，无历史异常

## 本地化

locale切换存在资源缺失问题，已报bug

## script

label属性未完整同步到脚本API及事件，需重点回归

## 文档/API

label新增接口或属性需同步更新API文档，回归脚本支持

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- 表单编辑与构建
- Dashboard布局
- 导出/打印（PrintLayout/ExportPDF等）
- 脚本自动化与事件检测
- 国际化本地化（Locale切换）

---

# 6 Bug List


| Bug ID     | Description           | Status |
| ---------- | --------------------- | ------ |
| Bug #74052 | label状态未同步变灰          | Open   |
| Bug #74050 | 超长label文本排版异常         | Open   |
| Bug #74044 | label编辑导致内容丢失         | Open   |
| Bug #74051 | label本地化资源缺失          | Open   |
| Bug #74049 | printLayout场景label不显示 | Open   |
| Bug #74042 | label脚本API事件未同步       | Open   |


---

