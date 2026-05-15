# 测试文档: Feature #70565 - Chart Shape SVG Support

---
doc_type: feature-test-doc
product: StyleBI
module: chart
feature_id: 70565
feature: Chart Shape SVG Support
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2777
Assignee: Stephen Webster
last_updated: 2026-03-18
version: stylebi-1.1.0

---

## 1 Feature Summary

| 项目 | 内容 |
|------|------|
| **核心目标** | 扩展 Chart Shape 功能，在现有的 JPG/PNG/GIF 格式基础上，**新增 SVG 文件格式支持**，使用户能够使用矢量图形作为图表数据点的自定义标记 |
| **用户价值** | SVG 格式具有可缩放、高清晰度的特点，相比位图格式在放大时保持清晰度，满足对图表可视化品质有较高要求的用户需求 |

---

## 2 Test Focus

### P0 - Core Path
- SVG 文件上传、存储、加载、渲染完整流程
- SVG 在 Point Chart 中的基础显示
- SVG 文件格式验证

### P1 - Functional Path
- 边界情况：空文件、无效文件、大文件
- 异常输入：伪造的 SVG 文件
- UI 状态变化：上传错误提示、本地化
- 图表交互：过滤、钻取、brush、exclude、zoom

### P2 - Extended Path (按需测试)
- 性能：复杂 SVG 批量渲染
- 兼容性：跨浏览器渲染差异
- 安全：恶意脚本防护
- 导出：PDF/PNG/Excel 导出

---

## 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
|----|----------|-------|----------|--------|-------|
| **P0** |
| TC70565-1 | **SVG 文件基础上传和渲染** | 1. 打开 Dashboard → Point Chart → Edit Shape<br>2. 选择 Add Shape，上传标准 SVG 文件<br>3. 验证上传成功提示<br>4. 在 Shape 库中确认 SVG 显示<br>5. 应用该 Shape 到图表<br>6. 保存并刷新 Dashboard<br>7. 验证数据点显示为 SVG 图形 | ✅ 上传成功，无错误提示<br>✅ Shape 库显示 SVG，有预览<br>✅ 图表中数据点显示清晰矢量图形<br>✅ 刷新后 SVG 正常显示 | | 来源：分析MD Scenario 1 |
| TC70565-2 | **SVG 文件格式验证** | 1. 准备标准 SVG 文件<br>2. 准备 PNG 文件重命名为 .svg<br>3. 准备纯文本文件重命名为 .svg<br>4. 分别尝试上传 | ✅ 标准 SVG 正常上传<br>✅ 伪造 SVG 被拒绝或渲染时明确提示<br>✅ 无图表崩溃 | | 来源：分析MD Scenario 11<br>🔴 Bug #74029 |
| **P1** |
| TC70565-3 | **SVG 空/无效文件上传** | 1. 上传空 SVG 文件<br>2. 上传内容无效的 SVG 文件<br>3. 观察系统响应 | ✅ 上传被拒绝或显示明确错误<br>✅ 后台无异常报错 | | 来源：分析MD 🔴 标注<br>🔴 Bug #74029, #74104 |
| TC70565-4 | **SVG 与位图混用渲染一致性** | 1. 在 Chart Editor 中设置 Shape Mapping<br>2. 部分数据点使用 SVG，部分使用 PNG<br>3. 保存并刷新图表<br>4. 放大/缩小图表验证两种格式显示 | ✅ SVG 和 PNG 都正确显示，无混乱<br>✅ 放大时 SVG 保持清晰，PNG 像素化<br>✅ 图表性能正常 | | 来源：分析MD Scenario 3<br>🔴 Bug #74078 |
| TC70565-5 | **图表过滤/钻取后 SVG 动态刷新** | 1. 应用包含 SVG Shape 的图表<br>2. 执行 brush 操作<br>3. 执行 exclude 操作<br>4. 执行 drill down 操作<br>5. 执行 zoom 操作 | ✅ 图表数据和 SVG Shape 同步刷新<br>✅ 无闪烁或加载延迟<br>✅ 新数据中 SVG Shape 正确显示 | | 来源：分析MD Scenario 6<br>🔴 Bug #74065, #74066 |
| TC70565-6 | **SVG 颜色/大小调整** | 1. 应用 SVG Shape 到图表<br>2. 调整 Shape 颜色<br>3. 调整 Shape 大小<br>4. 验证显示效果 | ✅ 颜色调整正确应用<br>✅ 大小调整正确应用 | | 来源：知识库稳定性要求<br>🔴 Bug #74034 |
| TC70565-7 | **上传错误提示本地化** | 1. 切换系统语言为非英文<br>2. 上传无效 SVG 文件<br>3. 观察错误提示语言 | ✅ 错误提示使用当前系统语言 | | 来源：分析MD 🔴 标注<br>🔴 Bug #74154 |
| **P2** |
| TC70565-8 | **SVG 安全性 - 恶意脚本检测** | 1. 准备含 JavaScript 的 SVG 文件<br>2. 尝试上传<br>3. 若上传成功，验证图表渲染 | ✅ 系统拒绝上传或显示安全警告<br>✅ 或自动清理脚本标签<br>✅ 无 XSS 弹窗 | | 来源：分析MD Scenario 2<br>🔴 Bug #74068 (Rejected) |
| TC70565-9 | **复杂 SVG 渲染性能** | 1. 准备含复杂路径/滤镜的 SVG<br>2. 应用到含 1000+ 数据点的 Chart<br>3. 记录加载时间<br>4. 与 PNG 对比<br>5. 验证交互响应 | ✅ 加载时间可接受 (<2s)<br>✅ 交互流畅，无卡顿<br>✅ 内存/CPU 占用正常 | | 来源：分析MD Scenario 7 |
| TC70565-10 | **浏览器兼容性** | 1. 在 Chrome/Firefox/Safari/Edge 中打开同一 Dashboard<br>2. 截图对比 SVG 渲染效果<br>3. 验证交互功能 | ✅ 各浏览器渲染一致或差异可接受<br>✅ 基础特性在所有浏览器正确显示<br>✅ 交互功能正常工作 | | 来源：分析MD Scenario 8 |
| TC70565-11 | **SVG 在图表导出中的表现** | 1. 导出包含 SVG Shape 的图表为 PDF<br>2. 导出为 PNG<br>3. 导出为 Excel<br>4. 验证导出文件中 SVG 显示 | ✅ PDF 中 SVG 正确渲染<br>✅ PNG 中 SVG 正确栅格化<br>✅ Excel 中图表图像正确 | | 来源：分析MD Scenario 5 |
| TC70565-12 | **SVG Shape 组织隔离** | 1. Org-A 上传组织级别 SVG<br>2. Org-B 用户访问 Org-A 的 Shape<br>3. 系统管理员上传全局 SVG<br>4. 各组织用户访问全局 Shape | ✅ Org-B 无法访问 Org-A Shape<br>✅ 全局 Shape 所有组织可见<br>✅ 无跨组织数据泄露 | | 来源：分析MD Scenario 10 |
| TC70565-13 | **SVG 显示完整性** | 1. 上传各种复杂 SVG 图形<br>2. 应用到图表<br>3. 验证 SVG 是否完整显示 | ✅ SVG 图形完整显示，无裁切<br>✅ 复杂图形元素正常渲染 | | 来源：PDF Bug列表<br>🔴 Bug #74156 |

---

## 4 Special Testing

| 类型 | 测试项 | 说明 |
|------|--------|------|
| **Security** | 恶意脚本注入 | SVG 内嵌 JavaScript 防护 (Bug #74068 已Rejected，确认不支持脚本执行) |
| **Performance** | 复杂 SVG 批量渲染 | 1000+ 数据点 + 复杂 SVG 性能测试 |
| **Compatibility** | 跨浏览器渲染 | Chrome/Firefox/Safari/Edge 对比测试 |
| **本地化** | 上传错误提示 | 验证非英文环境下提示信息 (Bug #74154) |
| **文档/API** | 支持格式文档 | 官方文档需更新 SVG 支持 (Documentation #74082) |
| **配置检查** | 文件大小限制 | 验证系统对 SVG 文件大小的限制策略 |

---

## 5 Regression Impact

| 可能受影响模块 | 影响说明 |
|----------------|----------|
| **Chart Module** | 核心受影响，Shape 渲染引擎需支持 SVG |
| **Dashboard/Worksheet** | Shape 使用场景 |
| **Export Module** | PDF/PNG/Excel 导出需正确处理 SVG |
| **Content Repository** | SVG 文件存储 |
| **Admin/Settings** | Shape 管理界面 |
| **Enterprise Manager** | 全局 Shape 库管理 |

---

## 6 Bug List

| Bug ID | Description | Status |
|--------|-------------|--------|
| Bug #74029 | when upload svg(empty/invalid), show broken image and pop up error on background server | Closed |
| Bug #74031 | upload some svg image, show empty | Closed |
| Bug #74034 | default size of svg can't apply | Rejected |
| Bug #74065 | do brush actions, svg shape color is not rightly | Closed |
| Bug #74066 | do exclude actions, svg shape can't be exclude | Closed |
| Bug #74067 | do drill down filter, result is wrong | Closed |
| Bug #74068 | The SVG file contains malicious code that was able to be uploaded successfully | Rejected |
| Bug #74078 | add and apply shape， background server pop up error | Closed |
| Bug #74080 | tooltip of upload shape is wrong | Closed |
| **Documentation #74082** | **The type of "upload shape" needs to be updated** | **New** |
| Bug #74092 | some svg images show broken image | Closed |
| Bug #74104 | em side can upload empty svg | Closed |
| Bug #74154 | some prompts no localization | Resolved |
| **Bug #74156** | **Some SVGs cannot be displayed fully** | **Request Feedback** |
| **Bug #74194** | **use svg shape, data tip view is wrong** | **New** |
| **Bug #74195** | **set svg shape, It cannot display that the refresh operation has been completed** | **New** |

**重点关注 New/Request Feedback 状态 Bug:**
- Documentation #74082: 文档需更新支持格式
- Bug #74156: 部分 SVG 无法完整显示
- Bug #74194: SVG Shape 的数据提示视图错误
- Bug #74195: SVG Shape 刷新操作完成显示问题