# Copilot Chat Conversation Export: StyleBI Feature #70565 测试分析报告

**User:** @agilegao
**Thread URL:** https://github.com/copilot/c/bce63498-958d-441c-9033-fd0424b20ef0

## @agilegao

## Copilot

我来分析这个 StyleBI Feature #70565 的测试场景。

首先，让我**验证输入信息的完整性**：  🔴 **测试-分析**：ok

✅ 知识库文档：`dashboard-chartshape-knowledge.md` - 完整  
✅ Feature 需求：PDF文件（InetSoft Issue Tracking）- 完整  
✅ PR 链接：https://github.com/inetsoft-technology/stylebi/pull/2777 - 完整  
✅ PR 状态：已合并（merged）  

**输入验证通过**。现在进行分析。

---

# 分析报告：Feature #70565 - Chart Shape SVG Support

## 第一部分：Requirement Summary（需求概要）  🔴 **测试-分析**：ok，简洁也覆盖全

**核心目标**：
- 扩展 Chart Shape 功能，在现有的 JPG / PNG / GIF 格式基础上，**新增 SVG 文件格式支持**
- 使用户能够使用矢量图形（SVG）作为图表数据点的自定义标记

**用户价值**：
- SVG 格式具有可缩放、高清晰度的特点，相比位图格式（JPG/PNG）在放大时保持清晰度
- 满足对图表可视化品质有较高要求的用户需求

**Feature 类型**：
- **Data I/O + Rendering**（涉及文件格式支持和图表渲染）

---

## 第二部分：Implementation Change（变更分析）  🔴 **测试-分析**：ok，简洁也覆盖全

基于 PR #2777 的描述和 PDF 信息：

**核心变更**：
- 在 Shape 上传和处理流程中新增 SVG 格式验证与存储支持
- 修改 Chart Shape Editor，允许用户选择上传 SVG 文件
- 扩展 Shape 渲染引擎，在图表中正确解析并渲染 SVG 图形
- 存储层面支持 SVG 文件在系统内容仓库中的持久化

**目标覆盖度**：
✅ 完全覆盖 Feature 需求（已合并状态表明实现完成）

**行为变化对比表**：

| Before Behavior | After Behavior | Risk Level |
|---|---|---|
| Shape 格式：JPG/PNG/GIF 仅 | Shape 格式：JPG/PNG/GIF/**SVG** | Medium |
| 上传时文件类型限制：不接受 .svg | 上传时文件类型限制：**接受 .svg** | Medium |
| SVG 渲染：不支持 | SVG 渲染：**支持** | High |
| Shape 大小展示：位图固定分辨率 | Shape 大小展示：**矢量可无限缩放** | High |
| 跨浏览器兼容性：位图渲染一致 | 跨浏览器兼容性：**SVG 渲染可能差异** | Medium |

---

## 第三部分：Risk Identification（风险识别）  🔴 **测试-分析**：ok，简洁也覆盖我们考虑有限的。

| # | 风险点 | 风险类型 | 说明 |
|---|---|---|---|
| 1 | **SVG 恶意脚本注入** | **Security** | SVG 可内嵌 JavaScript，若未进行内容清理，可能导致 XSS 攻击 |
| 2 | **SVG 文件大小无限制** | **Performance** | 未定义 SVG 文件大小限制，可能导致上传超大文件影响系统 |
| 3 | **SVG 复杂渲染性能** | **Rendering** | 复杂 SVG（大量路径、滤镜、阴影）在图表中批量渲染时可能卡顿 |
| 4 | **SVG 在导出场景的支持** | **Data Consistency** | 图表导出为 PDF/Image 时，SVG Shape 的渲染结果是否正确保留 |
| 5 | **浏览器兼容性差异** | **Compatibility** | SVG 的渐变、滤镜等高级特性在不同浏览器中渲染结果可能不同 |
| 6 | **存储和加载一致性** | **Data Consistency** | SVG 文件上传→存储→加载→显示全链路是否稳定 |
| 7 | **与现有 Shape 的交互** | **Cross-Module** | 同一图表中混用 JPG/PNG 和 SVG Shape，是否存在冲突或渲染不一致 |
| 8 | **Dashboard 过滤、钻取后 SVG 刷新** | **Functional** | 图表数据变化（过滤/钻取）后，SVG Shape 是否正确刷新或保持一致 |
| 9 | **从低版本升级时的兼容性** | **Compatibility** | 低版本报表中的 Shape 在新版本中是否正确识别和加载 |

---

## 第四部分：Test Design（测试策略设计） 🔴 **测试-分析**：ok，易读也基本覆盖

**核心验证点**：
1. SVG 文件能否正确上传、存储、加载、渲染到图表中
2. SVG 与位图格式混用时的行为一致性
3. SVG 内容安全性（防止恶意脚本）
4. 图表常见操作（过滤、钻取、导出）对 SVG Shape 的影响
5. 不同浏览器下 SVG 的渲染一致性

**高风险路径**：
- Path 1：**SVG 文件上传 → Shape 库存储 → 图表编辑器选用 → 图表渲染** 
- Path 2：**图表数据变化（过滤/钻取）→ SVG Shape 动态刷新**
- Path 3：**图表导出（PDF/Image/Excel）→ SVG Shape 导出结果**
- Path 4：**SVG 文件大小、复杂度极限情况 → 系统稳定性**
- Path 5：**恶意 SVG（含脚本） → 安全防护**

**波及模块**：
- ✅ Chart Module（核心受影响）
- ✅ Dashboard / Worksheet（Shape 使用场景）
- ✅ Export Module（PDF/Image/Excel导出）
- ✅ Content Repository（文件存储）
- ✅ Admin / Settings（Shape 管理）
- ✅ Security / Auth（权限和安全） 🔴 **测试-分析**：可忽略

**专项检查**：
- **脚本兼容性**：若 UI 中有 Script 逻辑依赖 Shape 类型判断（如 `if shape.format == 'PNG'`），需验证是否需要扩展支持 'SVG'  🔴 **测试-分析**：本身不支持，所以可忽略
- **向后兼容**：已发布报表中的 JPG/PNG Shape 在新版本中是否仍正常显示 🔴 **测试-分析**：可忽略
- **文档一致性**：Shape 支持格式的官方文档是否已更新  
  - 🔴 **Test Result**：报Documentation #74082

---

## 第五部分：Key Test Scenarios（核心测试场景）

### **Scenario 1：SVG 文件基础上传和渲染**   🔴 **测试-分析**：ok，比较详细，步骤也比较详细

**Scenario Objective**：
验证标准 SVG 文件能否完整地上传到系统、存储并在图表中正确渲染。

**Risk Level**：
🔴 **High** - 这是 Feature 的基础功能，任何破缺都会导致功能不可用

**Scenario Description**：
在 Dashboard 中的 Point Chart 图表编辑器内，上传一个标准 SVG 文件作为 Shape，验证文件是否被正确保存和应用到数据点。

**Pre-condition**：
- 用户已登录
- Dashboard 已创建
- Point Chart 已配置并有数据绑定
- 准备标准 SVG 文件（例如 star.svg，尺寸 50×50px）

**Key Steps**：
1. 打开 Dashboard → 选择 Point Chart → 右键选择 "Edit Shape" 或进入 Chart Editor
2. 在 Shape Editor 中选择 "Add Shape" 或上传功能
3. 选择本地 SVG 文件（star.svg）并上传
4. 验证上传进度和成功提示
5. 确认 SVG 显示在 Shape 库列表中
6. 在图表中应用该 SVG Shape
7. 保存图表并刷新 Dashboard
8. 验证数据点上展示的是 SVG 图形（非损坏图标）

**Expected Result**：
- ✅ SVG 文件上传成功，无错误提示
- ✅ Shape 库中显示该 SVG，文件信息完整（名称、大小、预览缩略图）
- ✅ 图表中数据点显示为 SVG 渲染的矢量图形，清晰可见
- ✅ 刷新后 SVG 仍正确显示，无加载延迟或闪烁

**Risk Covered**：
- ✅ SVG 格式支持（核心功能）
- ✅ 文件上传流程
- ✅ 存储持久化
- ✅ 基础渲染

🔴 **Test Result**：fail
- upload some svg image, show empty（Bug #74031）

---

### **Scenario 2：SVG 安全性 - 恶意脚本检测**  🔴 **测试-分析**：我们之前测试方式很容易忽略的，需执行验证

**Scenario Objective**：
验证系统能否检测和防止含有 JavaScript 脚本的恶意 SVG 文件上传，防止 XSS 攻击。

**Risk Level**：
🔴 **High** - 安全风险，可能导致数据泄露或用户会话劫持

**Scenario Description**：
尝试上传一个含有内嵌 JavaScript 代码的 SVG 文件，验证系统的防护机制。

**Pre-condition**：
- 用户已登录（拥有 Shape 上传权限）
- 准备恶意 SVG 文件，例如：
```xml
<svg>
  <script>alert('XSS Attack');</script>
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>
```

**Key Steps**：
1. 进入 Dashboard → Chart Editor → Shape Upload
2. 尝试上传包含脚本的 SVG 文件
3. 观察系统响应

**Expected Result**：
- ✅ 系统拒绝上传，显示明确的安全警告（如"SVG 文件包含不安全内容"）
- ✅ 或者系统接受上传但自动清理 SVG 中的脚本标签
- ✅ 图表中渲染的 SVG 不执行任何 JavaScript，仅显示图形部分
- ✅ 无 XSS 弹窗或其他恶意行为

**Risk Covered**：
- ✅ SVG 恶意脚本注入风险
- ✅ 系统安全防护

🔴 **Test Result**：fail
- The SVG file contains malicious code that was able to be uploaded successfully（Bug #74068）

---

### **Scenario 3：SVG 与位图混用 - 渲染一致性**    >🔴 **测试-分析**：覆盖到chart结构还不错

**Scenario Objective**：
验证同一图表中同时使用 SVG 和 PNG/JPG Shape 时，渲染结果的一致性和稳定性。

**Risk Level**：
🟠 **Medium** - 混合场景下的边界情况，可能导致渲染不一致

**Scenario Description**：
在单个 Point Chart 中，将部分数据点设为 SVG Shape，另一部分设为 PNG Shape，验证两种格式的协同渲染。

**Pre-condition**：
- Dashboard 和 Point Chart 已配置
- 有多个数据维度/分组字段
- 已上传 SVG 文件和 PNG 文件

**Key Steps**：
1. 在 Chart Editor 中编辑 Shape Mapping 规则：
   - 数据维度 A（如 Category='Type1'）→ 使用 SVG Shape
   - 数据维度 B（如 Category='Type2'）→ 使用 PNG Shape
2. 保存图表并刷新
3. 验证图表中不同类别的数据点
4. 调整图表缩放（放大/缩小）
5. 验证两种 Shape 的显示效果

**Expected Result**：
- ✅ SVG 和 PNG Shape 都正确显示，无混乱或重叠
- ✅ 放大时 SVG 保持清晰，PNG 可能出现像素化（符合预期）
- ✅ 图表性能正常，无卡顿或加载延迟

**Risk Covered**：
- ✅ 混合格式渲染一致性
- ✅ 渲染性能

🔴 **Test Result**：fail
- add and apply shape， background server pop up error（Bug #74078）

---

### **Scenario 4：SVG 大小极限 - 文件上传限制**   🔴 **测试-分析**：ok

**Scenario Objective**：
验证系统对 SVG 文件大小的限制，防止超大文件上传导致系统资源耗尽。

**Risk Level**：
🟠 **Medium** - 资源消耗风险

**Scenario Description**：
尝试上传不同大小的 SVG 文件，包括极限情况。

**Pre-condition**：
- 已知系统的 SVG 文件大小限制（从配置或文档中获取，假设为 10MB）
- 准备不同大小的 SVG 文件：
  - 正常：100KB
  - 中等：5MB
  - 超限：20MB

**Key Steps**：
1. 依次尝试上传各大小的 SVG 文件
2. 记录上传结果和系统反应时间
3. 若上传成功，验证图表中的渲染时间和内存占用

**Expected Result**：
- ✅ 小于限制的 SVG 正常上传
- ✅ 超过限制的 SVG 被拒绝，显示错误提示（如"文件过大，请选择小于 10MB 的文件"）
- ✅ 系统内存和 CPU 占用在正常范围内，无明显峰值

**Risk Covered**：
- ✅ SVG 文件大小无限制风险
- ✅ 系统性能和稳定性

🔴 **Test Result**：未验证
- 需要等其他bug改了，验证大的svg情况
---

### **Scenario 5：SVG 在图表导出中的表现**   🔴 **测试-分析**：覆盖了导出

**Scenario Objective**：
验证包含 SVG Shape 的图表在导出为不同格式（PDF、PNG、Excel）时，SVG 是否被正确处理。

**Risk Level**：
🟠 **Medium** - 导出是常见功能，任何破缺会影响用户体验

**Scenario Description**：
创建包含 SVG Shape 的图表，分别导出为 PDF、PNG、Excel，验证 SVG 在各种格式中的呈现。

**Pre-condition**：
- Dashboard 中存在使用 SVG Shape 的 Point Chart
- 图表有样本数据

**Key Steps**：
1. 在 Dashboard 中右键选择图表 → "Export"
2. 选择导出格式：PDF
3. 完成导出并打开 PDF 文件
4. 验证 SVG Shape 在 PDF 中的显示
5. 重复步骤 2-4，分别测试 PNG 导出和 Excel 导出

**Expected Result**：
- ✅ PDF 导出：SVG 正确渲染为矢量或位图，清晰可见
- ✅ PNG 导出：SVG 被正确栅格化为位图，质量良好
- ✅ Excel 导出：图表作为图像嵌入，SVG Shape 正确显示
- ✅ 导出文件大小在预期范围内

**Risk Covered**：
- ✅ SVG 在导出场景的支持（跨功能模块）
- ✅ 数据一致性

🔴 **Test Result**：pass

---

### **Scenario 6：图表过滤/钻取后 SVG 动态刷新**   🔴 **测试-分析**：覆盖了关联模块，拿到了知识库（根据描述优化了知识库）

**Scenario Objective**：
验证当图表数据因用户过滤/钻取/brush/zoom/exclue/show enlarge等操作而变化时，SVG Shape 是否正确刷新和更新。

**Risk Level**：
🟠 **Medium** - 常见用户交互，破缺会导致数据和视觉不同步

**Scenario Description**：
在 Dashboard 中对使用 SVG Shape 的图表应用钻取/钻取/brush/zoom/exclue/show enlarge等操作，验证数据和 Shape 的同步更新。

**Pre-condition**：
- Dashboard 中存在使用 SVG Shape 的 Point Chart
- Chart 上操作钻取/钻取/brush/zoom/exclue/show enlarge等操作
- 图表有多个数据维度

**Key Steps**：
1. 初始化 Dashboard，查看图表中的 SVG Shape
2. 应用操作钻取/钻取/brush/zoom/exclue/show enlarge等操作
3. 验证图表数据和 SVG Shape 是否同步刷新
4. 验证刷新过程中是否出现闪烁或加载延迟
5. 验证钻取后的新数据中的 SVG Shape 是否正确显示

**Expected Result**：
- ✅ 应用过一些操作后，图表数据和 SVG Shape 同时刷新，保持同步
- ✅ 无异步加载导致的数据-UI 不一致
- ✅ 刷新动画流畅，无卡顿
- ✅ 所有操作正确，SVG Shape 适应新数据

**Risk Covered**：
- ✅ SVG 动态刷新的功能正确性
- ✅ 数据一致性
- ✅ Dashboard 与 Chart 的交互一致性

🔴 **Test Result**: fail（优化了知识库）
- do brush actions, svg shape color is not rightly（Bug #74065）
- do exclude/drill/exclude/datatipview actions, svg shape can't be exclude （Bug #74066）

---

### **Scenario 7：复杂 SVG 渲染性能**  🔴 **测试-分析**：覆盖了性能

**Scenario Objective**：
验证包含复杂路径、滤镜、阴影等高级特性的 SVG 在图表中批量渲染时的性能表现。

**Risk Level**：
🟠 **Medium** - 性能风险，可能导致界面卡顿

**Scenario Description**：
使用复杂 SVG（如多层路径、渐变、滤镜）和大量数据点，验证图表的渲染性能。

**Pre-condition**：
- 准备复杂 SVG 文件（如含有多条贝塞尔曲线、滤镜效果的图形）
- Point Chart 配置有 1000+ 数据点

**Key Steps**：
1. 上传复杂 SVG 到系统
2. 将其应用到包含大量数据点的 Chart
3. 打开 Dashboard 并记录首次加载时间（从浏览器开发者工具的 Performance 标签）
4. 与使用简单 PNG 的相同图表对比加载时间
5. 验证交互响应速度（如鼠标悬停、缩放）

**Expected Result**：
- ✅ 图表加载时间在可接受范围内（建议 <2s）
- ✅ 交互响应流畅，无明显卡顿
- ✅ 浏览器内存占用在正常范围内，无内存泄漏迹象
- ✅ CPU 占用不超过预期阈值

**Risk Covered**：
- ✅ SVG 复杂渲染性能风险
- ✅ 系统性能和可用性

🔴 **Test Result**：未验证
- 需要等其他bug改了，验证性能

---

### **Scenario 8：浏览器兼容性 - SVG 渲染差异**    🔴 **测试-分析**：覆盖了兼容和渲染

**Scenario Objective**：
验证 SVG Shape 在不同浏览器中的渲染一致性，特别是高级 SVG 特性（如滤镜、渐变）的兼容性。

**Risk Level**：
🟠 **Medium** - 跨浏览器兼容性问题可能影响部分用户

**Scenario Description**：
在多个主流浏览器中打开包含 SVG Shape 的 Dashboard，对比渲染结果。

**Pre-condition**：
- 准备标准 SVG 文件（包含基础和高级特性）
- 测试环境覆盖主流浏览器：Chrome、Firefox、Safari、Edge

**Key Steps**：
1. 在每个浏览器中打开相同的 Dashboard
2. 截图记录 SVG Shape 的渲染效果
3. 对比各浏览器中的渲染差异
4. 验证交互功能（如悬停提示、点击事件）

**Expected Result**：
- ✅ 所有浏览器中 SVG 渲染结果一致或差异在可接受范围内
- ✅ 基础 SVG 特性（颜色、形状、尺寸）在所有浏览器中正确显示
- ✅ 交互功能在所有浏览器中正常工作

**Risk Covered**：
- ✅ 浏览器兼容性差异风险
- ✅ 跨浏览器一致性

🔴 **Test Result**：pass
- default size of svg can't apply（不支持）
- 主流浏览器pass

---

### **Scenario 9：系统升级后的向后兼容性**  🔴 **测试-分析**：覆盖了BC

**Scenario Objective**：
验证低版本 StyleBI 中创建的报表在升级到新版本后，如果其中包含 JPG/PNG Shape，是否仍正确加载和显示。

**Risk Level**：
🔴 **High** - 升级后的兼容性破缺会导致用户数据不可用

**Scenario Description**：
从低版本（不支持 SVG）升级到新版本（支持 SVG），验证已有报表的正常工作。

**Pre-condition**：
- 低版本数据库备份包含使用 JPG/PNG Shape 的 Dashboard
- 新版本已安装并完成升级迁移

**Key Steps**：
1. 升级系统到新版本
2. 打开低版本创建的 Dashboard
3. 验证图表中的 JPG/PNG Shape 是否正确加载和显示
4. 尝试编辑这些 Shape（如调整大小、替换）
5. 验证是否能新增 SVG Shape

**Expected Result**：
- ✅ 低版本的 JPG/PNG Shape 正确加载，无损坏或丢失
- ✅ 编辑和替换操作正常工作
- ✅ 可以新增 SVG Shape 而不影响既有 Shape

**Risk Covered**：
- ✅ 从低版本升级时的兼容性风险
- ✅ 数据迁移一致性

🔴 **Test Result**： ignore

---

### **Scenario 10：SVG Shape 在全局 vs 组织级别的隔离**  🔴 **测试-分析**：获取了知识库，很好的覆盖了知识库的组织和global

**Scenario Objective**：
验证在多组织或多用户场景下，上传到全局和组织级别的 SVG Shape 是否被正确隔离和访问控制。

**Risk Level**：
🟠 **Medium** - 多租户隔离风险

**Scenario Description**：
在多组织环境中，Org-A 上传的 SVG Shape 不应被 Org-B 访问；全局 Shape 应对所有组织可见。

**Pre-condition**：
- 系统配置支持多组织
- 两个组织（Org-A、Org-B）已创建
- 各组织有对应的管理员和普通用户

**Key Steps**：
1. 以 Org-A 管理员身份上传 SVG Shape 到组织级别
2. 以 Org-B 管理员身份尝试访问 Org-A 的 Shape
3. 验证是否能看到 Org-A 的 Shape（应该看不到）
4. 以系统管理员身份上传 SVG Shape 到全局
5. 以 Org-A 和 Org-B 的用户身份验证是否都能访问全局 Shape

**Expected Result**：
- ✅ Org-B 用户无法访问 Org-A 的 Shape，系统显示"无权限"或 Shape 不显示
- ✅ 全局 Shape 对所有组织用户可见
- ✅ 无跨组织数据泄露

**Risk Covered**：
- ✅ 多租户隔离风险
- ✅ 权限和安全管理

🔴 **Test Result**： pass
---

### **Scenario 11：SVG 文件格式验证**  🔴 **测试-分析**：覆盖了异常和边界测试

**Scenario Objective**：
验证系统能否正确识别和验证 SVG 文件格式，拒绝伪造的 SVG 文件（如重命名后的 PNG）。

**Risk Level**：
🟡 **Low** - 边界情况，但仍需覆盖

**Scenario Description**：
尝试上传不同形式的文件，测试系统的格式验证机制。

**Pre-condition**：
- 准备以下文件：
  - 标准 SVG 文件（.svg）
  - PNG 文件重命名为 .svg（mock）
  - 纯文本文件重命名为 .svg（mock）

**Key Steps**：
1. 分别尝试上传各文件
2. 验证系统的接受/拒绝行为

**Expected Result**：
- ✅ 标准 SVG 正常上传
- ✅ 伪造的 SVG（如重命名的 PNG）被拒绝或上传后在渲染时出现明确错误提示
- ✅ 无损坏的图表或崩溃

**Risk Covered**：
- ✅ 文件格式验证的严密性

🔴 **Test Result**： fail
- upload svg(empty/invalid), show broken image and pop up error on background server（Bug #74029）

---

**报告完成**。如需详细的测试用例脚本、自动化脚本框架或特定浏览器/版本的测试矩阵，请提出。
