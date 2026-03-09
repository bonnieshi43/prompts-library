---
doc_type: feature-test-doc
product: StyleBI
module: Chart

feature_id: 70565
feature_name: Chart Shape SVG Support

issue_link: http://173.220.179.100/issues/70565
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2777

assignee: Stephen Webster
target_version: stylebi-1.1.0

last_updated: 2026-03-09
---

# 1 Feature Summary

Feature #70565 新增 **SVG 格式 Chart Shape 支持**。

当前 Chart Shape 仅支持：

- JPG
- PNG
- GIF

该 Feature 扩展 Shape 支持：

- SVG 文件上传
- SVG Shape 存储
- SVG 在 Chart 中渲染
- SVG 在导出场景中的支持

用户可以使用 **SVG 矢量图形作为 Chart 数据点 Shape**，在放大图表时仍保持清晰。

涉及模块：

- Chart Module
- Dashboard / Worksheet
- Export Module
- Content Repository

---

# 2 Test Focus

只测试 **关键路径**。

## P0 - Core Path

- SVG 文件上传
- SVG Shape 在 Chart 中渲染
- SVG Shape 存储和刷新
- SVG 安全验证（script injection）
- 旧版本报表兼容

## P1 - Functional Path

- SVG 与 PNG/JPG Shape 混用
- Dashboard 过滤后 SVG 刷新
- Chart Drill 操作
- SVG 导出（PDF / PNG / Excel）
- 多组织 Shape 访问权限

## P2 - Extended Path

- SVG 文件大小限制
- 复杂 SVG 渲染性能
- 浏览器兼容性
- SVG 文件格式验证

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|---|---|---|---|---|---|
| TC70565-1 | SVG Upload | Chart Editor → Upload SVG shape | SVG 上传成功并出现在 Shape 库 | | |
| TC70565-2 | SVG Render | 在 Point Chart 使用 SVG Shape | 数据点正确显示 SVG | | |
| TC70565-3 | SVG Persistence | 保存 Dashboard 并刷新 | SVG Shape 正常加载 | | |
| TC70565-4 | SVG Script Security | 上传含 script 的 SVG | 系统拒绝或清理 script | | |
| TC70565-5 | SVG + PNG Mixed | 同一 Chart 混用 SVG 和 PNG | 两种 Shape 正常渲染 | | |
| TC70565-6 | Filter Refresh | Dashboard 应用过滤 | SVG Shape 同步刷新 | | |
| TC70565-7 | Drill Down | Chart drill 操作 | SVG Shape 正常更新 | | |
| TC70565-8 | Export PDF | 导出 Dashboard 为 PDF | SVG Shape 正确显示 | | |
| TC70565-9 | Export PNG | 导出 PNG | SVG 被正确栅格化 | | |
| TC70565-10 | Export Excel | 导出 Excel | Chart 图像正确 | | |
| TC70565-11 | Large SVG Upload | 上传超大 SVG 文件 | 超限文件被拒绝 | | |
| TC70565-12 | Complex SVG | 使用复杂 SVG | Chart 渲染性能正常 | | |
| TC70565-13 | Browser Compatibility | Chrome / Firefox / Safari | SVG 渲染一致 | | |
| TC70565-14 | Upgrade Compatibility | 打开旧版本 Dashboard | JPG/PNG Shape 正常 | | |
| TC70565-15 | Multi Org Isolation | Org-A 上传 Shape | Org-B 不可见 | | |
| TC70565-16 | Global Shape | Admin 上传 Global Shape | 所有 Org 可见 | | |
| TC70565-17 | Fake SVG Upload | PNG 重命名为 SVG | 系统拒绝或报错 | | |

---

# 4 Special Testing

仅当 Feature 涉及时执行。

## Security

验证 SVG 是否存在安全风险：

- SVG script injection
- XSS payload
- 恶意 SVG 文件上传

## Performance

测试复杂 SVG 渲染性能：

- 1000+ datapoints Chart
- SVG filter / gradient / path

## Compatibility

浏览器兼容性：

- Chrome
- Firefox
- Safari
- Edge

## 本地化

验证：

- 上传错误提示
- 文件类型提示
- UI 文本是否正确

## script

验证脚本逻辑：

shape.format == 'SVG'

相关脚本逻辑是否支持 SVG。

## 文档/API

验证：

- 文档是否更新 Shape 支持格式
- API 上传是否支持 SVG

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- Chart Rendering
- Dashboard
- Worksheet
- Export
- Shape Library
- Content Repository

需要回归：

- PNG/JPG Shape 渲染
- Chart Shape Mapping
- Dashboard Export
- Shape Library

---

# 6 Bug List

| Bug ID | Type | Description | Status |
|---|---|---|---|
| 60339 | Related | custom shape cannot add svg type file | Closed |
| 73980 | Related | delete shape portal and composer inconsistent | Rejected |
| 74029 | Related | upload invalid svg shows broken image | New |
| 74031 | Related | upload some svg image shows empty | Resolved |
| 74034 | Related | default size svg cannot apply | Rejected |