---
doc_type: feature-test-doc
product: StyleBI
module: chart
feature_id: 74102
feature: Feature #74102 Bar chart rounded corners
pr_link: https://github.com/inetsoft-technology/stylebi/pull/3047
Assignee: Franky Pan
last_updated: 2026-03-13
version: stylebi-1.1.0
---


# 1 Feature Summary

**核心目标**：  
为 Bar Chart（柱状图）引入圆角效果，使样式更符合现代 Material 3/AI 设计规范，支持端圆角/全角圆角，并覆盖 Auto/Inverter Chart、Chart 类型切换、多样式、属性组合、Script 和 Bar 区域选择。

**用户价值**：  
- 提升图表视觉柔和度和现代感。  
- 灵活控制圆角样式，提高可读性与 UI 一致性。  
- 保证老报表兼容性和导出/嵌入场景一致性。  

---

# 2 Test Focus

## P0 - Core Path

核心功能：  
- `cornerRadius` 与 `roundAllCorners` 属性生效  
- 端圆角与全角圆角渲染  
- 水平 & 纵向柱状图圆角显示  
- 堆叠柱状图顶端圆角  

## P1 - Functional Path

- Auto / Inverter Chart 圆角显示（Bug #74166）  
- Chart 类型切换后圆角保持或重置  
- Multi-style 圆角显示  
- 属性组合（Glossy / Shadow / Gradient）对圆角影响  
- Script 设置 `cornerRadius` / `roundAllCorners`（Bug #74168）  
- Bar 区域选择（Brush / Highlight）圆角交互  
- 异常输入：非法数值、缺失值、超出范围  
- UI 面板显示、默认值与本地化  

## P2 - Extended Path （按需测试）

- 导出 PNG/PDF 保留圆角  
- Embed 场景兼容  
- 性能：大量 Bar 渲染  
- 安全：Script 场景不抛异常  
- 兼容性：老报表加载、不同浏览器  

---

# 3 Test Scenarios

| ID         | Scenario                          | Steps                                         | Expected                     | Result | Notes        |
|-----------|-----------------------------------|-----------------------------------------------|-------------------------------|--------|--------------|
| TC74166-1 | Auto / Inverter Chart 圆角        | 新建 Auto / Inverter Chart，设置 cornerRadius=0.3, roundAllCorners=true | 圆角显示正确                 |        | Bug #74166   |
| TC74167-1 | 导出 PNG/PDF                        | 设置圆角，导出 PNG/PDF                        | 导出图与渲染一致             |        | Bug #74167   |
| TC74168-1 | Script 场景                        | Script 设置 cornerRadius=0.3, roundAllCorners=false | 属性生效                     |        | Bug #74168   |
| TC-R1     | 无圆角配置的旧图                    | 加载老版本无圆角报表                          | 柱状图保持直角               |        | 默认行为兼容 |
| TC-R2     | cornerRadius=0                     | 设置 cornerRadius=0，渲染柱状图               | 无圆角                       |        |              |
| TC-R3     | 端圆角 vs 全角圆角                 | 设置 roundAllCorners=true/false，渲染对比     | 端圆角/全角圆角显示正确      |        |              |
| TC-R4     | 水平柱状图圆角                     | 新建水平 Bar Chart，设置圆角组合              | 左右方向圆角显示符合预期      |        |              |
| TC-R5     | 堆叠柱状图顶部圆角                 | 多 series 堆叠图                              | 顶端圆角，中间直角           |        | Bug #74164   |
| TC-R6     | Chart 类型切换                     | Bar → Line → Bar                               | 圆角保持或重置               |        |              |
| TC-R7     | Multi-style 圆角                   | 多 series 样式组合                             | 圆角显示正确                 |        |              |
| TC-R8     | 属性组合验证                        | Glossy / Shadow / Gradient + 圆角             | 圆角显示正确                 |        |              |
| TC-R9     | 属性面板输入约束                     | 输入非法值（>0.5、负数、非数字）             | 弹 warning，渲染直角         |        |              |
| TC-R10    | Bar 区域选择                        | Brush / Highlight 圆角显示                     | 圆角显示不破坏交互           |        |              |
| TC-R11    | 默认行为兼容                        | 无配置时加载报表                               | 默认 0.3 圆角生效            |        |              |
| TC-R12    | UI / 本地化                        | 面板显示、默认值、本地化标签                   | 显示正确                     |        |              |
---

# 4 Special Testing

## Security
- Script 场景不抛异常  
- 外部 embed 场景安全访问

## Performance
- 大量 Bar 渲染性能测试

## Compatibility
- 老报表、跨浏览器渲染  
- API embed 场景验证

## 本地化
- UI 面板及 tooltip 标签  

## Script
- Script 设置属性生效，异常处理  

## 文档/API
- 属性文档正确，API 示例生效  

## 配置检查
- XML/JSON 属性解析正确  
- 默认值同步  
- 输入范围限制（0~0.5）  

---

# 5 Regression Impact（回归影响）

可能受影响模块：Chart / Dashboard / Dataset / Export / MV / Script / Embed  

---

# 6 Bug List

| Bug ID   | Description                                         | Status |
|----------|-----------------------------------------------------|--------|
| Bug #74164 | 堆叠柱状图中间圆角不支持                             | Open   |
| Bug #74166 | Auto / Inverter Chart 圆角显示异常                  | Open   |
| Bug #74167 | PNG/PDF 导出未保留圆角                              | Open   |
| Bug #74168 | Script 设置圆角属性无效                              | Open   |