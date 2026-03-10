---

doc_type: feature-test-doc
product: StyleBI
module: Chart

feature_id: 70565
feature_name: Chart Shape SVG Support

issue_link: [http://173.220.179.100/issues/70565](http://173.220.179.100/issues/70565)
pr_link: [https://github.com/inetsoft-technology/stylebi/pull/2777](https://github.com/inetsoft-technology/stylebi/pull/2777)

assignee: Stephen Webster
target_version: stylebi-1.1.0

## last_updated: 2026-03-09

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


| ID         | Scenario       | Steps                                                     | Expected                                       | Result  | Notes                                                                      |
| ---------- | -------------- | --------------------------------------------------------- | ---------------------------------------------- | ------- | -------------------------------------------------------------------------- |
| TC70565-1  | SVG 基础上传与渲染    | 1. 在 Point Chart 编辑器中上传标准 SVG 2. 应用到图表 3. 保存并刷新 Dashboard | 1. 上传成功，Shape 库有预览 2. 图表数据点正确显示矢量图形 3. 刷新后显示正常 | Fail    | upload some svg image, show empty (Bug #74031)                             |
| TC70565-2  | 无效 SVG 文件处理    | 上传空文件或无效格式的 SVG                                           | 系统拒绝上传或显示明确错误提示，后台无报错                          | Fail    | upload svg(empty/invalid), show broken image and pop up error (Bug #74029) |
| TC70565-3  | SVG 默认大小       | 上传 SVG 后直接应用到图表，不调整大小                                     | SVG 按合理默认尺寸显示，不出现过大或过小                         | Fail    | default size of svg can't apply (Bug #74034)                               |
| TC70565-4  | SVG 安全性 - 恶意脚本 | 上传含 `<script>alert('XSS')</script>` 的 SVG                 | 系统拒绝上传/清理脚本，图表中无弹窗                             | Fail    | SVG file contains malicious code uploaded successfully（Bug #74068）         |
| TC70565-5  | SVG 与位图混用      | 1. 同一图表中为不同数据类别分别设置 SVG 和 PNG 2. 缩放图表                     | 1. 两种格式正确显示，无冲突 2. 放大时 SVG 清晰，PNG 像素化          | Fail    | add and apply shape, background server pop up error（Bug #74078）            |
| TC70565-6  | 图表导出           | 1. 含 SVG 的图表导出为 PDF 2. 导出为 PNG 3. 导出为 Excel               | 所有导出格式中 SVG 正确呈现                               | Pass    |                                                                            |
| TC70565-7  | 图表交互后刷新        | 1. 对含 SVG 的图表进行刷选 2. 进行排除/钻取/查看数据提示                       | 1. 刷选后 SVG 颜色正确更新 2. 排除操作能隐藏对应 SVG 点           | Fail    | brush颜色错误；exclude操作失效（Bug #74066，Bug #74077）                               |
| TC70565-8  | 浏览器兼容性         | 在 Chrome/Firefox/Safari/Edge 中打开含 SVG 的 Dashboard         | 渲染结果一致，交互功能正常                                  | Pass    | 主流浏览器pass                                                                  |
| TC70565-9  | 多租户隔离          | 1. Org-A 上传组织级 SVG 2. Org-B 访问 3. 管理员上传全局 SVG             | Org-B 看不到 Org-A 的 SVG；全局 SVG 都可见               | Pass    |                                                                            |
| TC70565-10 | 复杂 SVG 性能      | 1. 上传含复杂路径/滤镜的 SVG 2. 应用到含 1000+ 数据点的图表                   | 加载时间 <2s，交互流畅无卡顿                               | Pending | 需等基础bug修复后验证                                                               |
| TC70565-11 | 文件大小限制         | 上传 100KB / 5MB / 20MB 的 SVG                               | 小于限制的正常上传，超限的被拒绝                               | Pending | 需等基础bug修复后验证                                                               |


---

# 4 Special Testing

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

- 暂不涉及

## script

- 脚本依赖检查：Shape 类型判断相关的 UI 脚本（本版本暂不涉及）

## 文档/API

- 文档更新：Shape 支持格式的官方文档需更新包含 SVG (已报 Documentation #74082)

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


| Bug ID | Type    | Description                                                                     | Status   |
| ------ | ------- | ------------------------------------------------------------------------------- | -------- |
| 60339  | Related | custom shape cannot add svg type file                                           | Closed   |
| 73980  | Related | delete shape portal and composer inconsistent                                   | Rejected |
| 74029  | Related | upload invalid svg shows broken image                                           | Resolved |
| 74031  | Related | upload some svg image shows empty                                               | Resolved |
| 74034  | Related | do brush actions, svg shape color is not rightly                                | Rejected |
| 74065  | Related | do brush actions, svg shape color is not rightly                                | New      |
| 74066  | Related | do exclude actions, svg shape can't be exclude                                  | New      |
| 74067  | Related | do drill down filter, result is wrong                                           | New      |
| 74068  | Related | The SVG file contains malicious code that was able to be uploaded successfully. | New      |
| 74078  | Related | add and apply shape， background server pop up error                             | New      |
| 74080  | Related | tooltip of upload shape is wrong                                                | New      |
| 74082  | Related | The type of "upload shape" needs to be updated.                                 | New      |


