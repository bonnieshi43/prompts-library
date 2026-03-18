---
doc_type: feature-test-doc
product: StyleBI
module: Viewsheet / Input Components
feature_id: #58617
feature: Combobox Query Date Format
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2779
Assignee: Stephen Webster
last_updated: 2026-03-12
version: stylebi-1.1.0
---

# 1 Feature Summary

**核心目标**  
为 **Date 类型 Combobox** 提供一个可配置的 **Query Param 日期格式**，允许用户在 *Properties → Data tab* 指定发送到 Query 的日期字符串格式。

默认情况下系统使用 `yyyy-MM-dd`，该 Feature 允许用户自定义，例如：

- `MM-dd-yyyy`
- `yy-MM-dd`
- `yyyy/M/d`

**用户价值**

解决以下问题：

- 避免用户必须通过 **Script 手动格式化日期**
- 支持 **API / JSON Query 对日期格式的严格要求**
- 降低脚本维护成本，提高 Query 参数可控性

---

# 2 Test Focus

只列 **必须测试路径**

## P0 - Core Path

核心功能：

- Combobox 启用 **Format Date Values Sent to Query**
- Query Param 按 **指定 Pattern 输出**
- 取消勾选后恢复 **默认 `yyyy-MM-dd`**
- UI → Backend → Query Param **端到端链路验证**

---

## P1 - Functional Path

功能路径验证：

- **不同日期格式**
  - `yy-MM-dd`
  - `yyyy/M/d`
  - `MM-DD-YYYY`
  - `yyyy-MMM-dd`

- **不同分隔符**
  - `dd.MM.yyyy`
  - `yyyy, MM ,d`
  - `yy:MM:dd`
  - `yyyy MM dd`

- **非法 Pattern**
  - `yyyy-MM`
  - `MM-dd`
  - `yyyy-dd`
  - `yyyy-MM-dd HH:mm`
  - `EEE, MMM d yyyy`
  - `yyyy_MM_dd`
  - `yyyy|MM|dd`

- **需要补齐 Pattern**
  - `y-MM-dd`
  - `yyy-MM-dd`
  - `yyyy-MM-ddd`

- **UI 状态变化**
  - 勾选/取消勾选 toggle
  - Pattern 输入框显示/隐藏
  - Invalid Date Format 提示

- **变量来源差异**
  - VariableAssembly
  - merged variable list

---

## P2 - Extended Path （按需测试）

扩展路径：

- **Timezone 行为**
  - 选择 timezone → 浏览器日期
  - 不选择 timezone → 服务器日期

- **兼容旧资产**
  - 老 viewsheet 未包含该属性
  - 默认仍为 `yyyy-MM-dd`

- **异常回退行为**
  - 非法 pattern 不保存
  - UI Warning 提示

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| TC58617-1 | Enable Query Date Format | 勾选 Format Date Values Sent to Query 并输入 `MM-dd-yyyy` | Query 参数格式为 `01-04-2022` | Pass | |
| TC58617-2 | Disable Query Date Format | 取消勾选 Format Date Values Sent to Query | Query 参数恢复 `2022-01-04` | Pass | |
| TC58617-3 | Default Behavior | 不启用该功能 | Query 参数保持 `yyyy-MM-dd` | Pass | 回归验证 |
| TC58617-4 | Different Date Format | 输入 `yy-MM-dd` | 输出 `22-01-04` | Pass | |
| TC58617-5 | Slash Separator | 输入 `yyyy/M/d` | 输出 `2022/1/4` | Pass | |
| TC58617-6 | Dot Separator | 输入 `dd.MM.yyyy` | 输出 `04.01.2022` | Pass | |
| TC58617-7 | Colon Separator | 输入 `yy:MM:dd` | 输出 `22:01:04` | Pass | |
| TC58617-8 | Invalid Pattern | 输入 `yyyy-MM` | UI 提示 Invalid Date Format | Pass | Bug #74085 |
| TC58617-9 | Invalid Pattern | 输入 `yyyy-MM-dd HH:mm` | UI 提示 Invalid Date Format | Pass | 不支持时间 |
| TC58617-10 | Unsupported Separator | 输入 `yyyy|MM|dd` | UI 提示 Invalid Date Format | Pass | |
| TC58617-11 | Pattern Padding | 输入 `y-MM-dd` | 自动补齐或提示 | Pass | |
| TC58617-12 | Pattern Padding | 输入 `yyy-MM-dd` | 自动补齐或提示 | Pass | |
| TC58617-13 | Pattern Overflow | 输入 `yyyy-MM-ddd` | UI 提示格式错误 | Pass | |
| TC58617-14 | Toggle State Clean | 启用格式→保存→取消启用 | Query 参数恢复默认 | Pass | 清理 stale format |
| TC58617-17 | Timezone Enabled | 选择 timezone | Query 日期按浏览器时间 | Pass | |
| TC58617-18 | Timezone Disabled | 不选择 timezone | Query 日期按服务器时间 | Pass | |

---

# 4 Special Testing

仅当 Feature 需要测试时执行。

## Security

无特殊安全风险。

---

## Performance

日期格式转换为 **轻量级格式化操作**，对 Query 性能影响可忽略。

---

## Compatibility

需要验证：

- **旧 Viewsheet 加载**
- 未配置 `dateFormatPattern` 的资产
- 默认行为稳定为 `yyyy-MM-dd`

---

## 本地化

验证：

- `MMM` 月份名称是否受 Locale 影响
- 非英文环境是否正常解析

---

## Script

Feature 设计目标：

- **替代 Script 手动格式化**

需要验证：

- 启用 Feature 时 Script 不再需要处理日期格式。

---

## 文档/API

建议在用户文档补充：

- 支持的 **Date Pattern**
- 不支持 **Time Pattern**

---

## 配置检查

确认以下配置正确保存：

- `queryDateFormat`
- `dateFormatPattern`

并在 XML 中正确写入。

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- Viewsheet Input Components
- VariableTable
- Query Parameter Generation
- XUtil.replaceVariable
- Composer UI

需要重点验证：

- 未启用 Feature 时原逻辑不变
- 非 Date 类型变量不受影响

---

# 6 Bug List

| Bug ID | Description | Status |
|---|---|---|
| Bug #74085 | When input invalid format in **Format Date Values Sent to Query**, the invalid value shouldn't be saved | Resolved |
| Bug #74089 | Add script support for new property **"Format Date Values Sent to Query"** | New |
| Bug #74091 | When format is `yyyy-MMM-dd` in **Format Date Values Sent to Query**, the parameter is wrong | New |
| Bug #74113 | When **Format Date Values Sent to Query = true** and type is not **Date**, console shows warning | New |
