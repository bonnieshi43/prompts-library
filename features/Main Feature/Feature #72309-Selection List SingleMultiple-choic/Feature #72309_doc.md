---
doc_type: feature-test-doc
Product: StyleBI  
Module: Selection List  
Feature ID: 72309 
Feature: make single selection easier in selection list
PR Link: https://github.com/inetsoft-technology/stylebi/pull/2119
Assignee: Franky Pan 
Last Updated: 2026-03-17  
Version: stylebi-1.1.0 
---

# 1 Feature Summary

**核心目标**：  
为 Selection List 增加“一步单选能力”，通过 quick-switch（单选/多选快速切换），实现用户无需先清空再选择。

**用户价值**：  
- 操作从“两步 → 一步”，提升效率  
- 减少 Dashboard 刷新次数（避免 double trigger）  
- 提供更直观的交互（hover 按钮 / long-press）

---

# 2 Test Focus

## P0 - Core Path

- quick-switch 单次操作完成单选
- single / multi 模式切换正确
- selection 状态一致（无残留）
- Dashboard 仅触发一次刷新
- mobile long-press 触发正确
- long-press 后 click 不重复触发

## P1 - Functional Path

- alt-click 与 quick-switch 行为一致性（Bug #74176）
- hover 按钮显示与布局问题（Bug #74106 / #74107）
- switching=true vs 普通 click 行为差异
- Tree 不支持 quick-switch（Bug #74178）
- toggleFolder 与 selection 交互
- touchmove / touchcancel 边界
- viewer / preview / composer 模式差异
- max-mode 限制（mobile）
- 多选状态切换清理

👉 **新增覆盖（原未覆盖）**
- submitOnChange + quick-switch 组合（Bug #74159）
- single selection 模式下 quick-switch 行为一致性

## P2 - Extended Path （按需测试）

- Performance（刷新次数、事件次数）
- Compatibility（老报表默认值）
- Script/API（Bug #74181）
- Localization（文案）
- 文档一致性（Documentation #74055）

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|----|----------|-------|----------|--------|------|
| TC-QS-01 | 基础 quick-switch 单选 | 多选 → 点击 quick-switch | 切换 single，仅选当前项 | Pass | 核心功能 |
| TC-QS-02 | 模式切换正确性 | single↔multi 切换 | anchor 正确 | Pass | |
| TC-QS-03 | switching vs click | label vs 按钮点击 | switching 不触发 selectRegion | Pass | |
| TC-QS-04 | alt-click 冲突 | alt-click vs quick-switch | 行为一致 | Fail | Bug #74176 |
| TC-QS-05 | Tree 不支持 | Tree 中操作 | 无 UI / 不生效 | Fail | Bug #74178 |
| TC-QS-06 | hover 按钮显示 | hover / scroll / resize | 正常显示不重叠 | Fail | Bug #74106/#74107 |
| TC-QS-07 | mobile long-press | 长按 >500ms | 触发 quick-switch | Pass | |
| TC-QS-08 | long-press click 抑制 | long-press 后释放 | 不重复触发 | Pass | |
| TC-QS-09 | touch 边界 | touchmove/cancel | 状态正常恢复 | Pass | |
| TC-QS-10 | toggleFolder 冲突 | long-press + folder click | 不误触发展开 | Pass | |
| TC-QS-11 | Dashboard 刷新 | 对比两步 vs quick-switch | 仅一次刷新 | Pass | |
| TC-QS-12 | 配置持久化 | 保存/加载 | 默认 false，配置正确 | Pass | |
| TC-QS-13 | 上下文控制 | viewer/preview/composer | 仅 viewer/preview 生效 | Pass | |
| TC-QS-14 | mobile max-mode | 非 max-mode / max-mode | 行为符合限制 | Pass | |
| TC-QS-15 | 多选边界清理 | 多选 → quick-switch | 无残留 | Pass | |
| TC-QS-16 | submitOnChange 组合 | 开启 submitOnChange + quick-switch | 仅触发一次提交 | Fail | Bug #74159 |
| TC-QS-17 | single selection 模式 | 已是 single → quick-switch | 行为一致无异常 | Pass | 补充覆盖 |

---

# 4 Special Testing

## Security
无特殊安全风险

## Performance
- 验证 quick-switch 是否减少 refresh 次数（1 vs 2）
- 检查是否存在重复事件触发

## Compatibility
- 老报表未配置 quickSwitchAllowed → 默认 false
- Tree 行为保持不变

## 本地化
- 校验：
  - single.switch
  - multi.switch
  - tooltip 文案

## script
- quickSwitchAllowed 是否支持脚本读写（Bug #74181）

## 文档/API
- Selection List 文档是否更新（Documentation #74055）

## 配置检查
- 默认值 = false
- XML 序列化/反序列化正确

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- Selection List（核心）
- Selection Tree（行为差异）
- Dashboard（刷新逻辑）
- Parameter / submitOnChange
- Mobile 交互层
- Event handling（click / touch）

---

# 6 Bug List

| Bug ID | Description | Status |
|--------|------------|--------|
| 74176 | alt-click 与 quick-switch 行为不一致 | Open |
| 74178 | Selection Tree 未支持 quick-switch | Open |
| 74106 | hover 按钮显示重叠 | Open |
| 74107 | hover UI 异常 | Open |
| 74159 | submitOnChange 与 quick-switch 冲突 | Open |
| 74181 | script 不支持 quickSwitchAllowed | Open |
| 74055 | 文档未更新 | Open |
| 73960 | label is longer can't click| Open |
---