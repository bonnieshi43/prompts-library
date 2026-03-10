# features/ 使用说明（Feature 测试分析 → 最终测试文档）

本目录用于沉淀 **Feature 的测试分析过程** 与 **最终可执行测试文档**，并形成可复用的工作流（SOP）。

---

## 目录结构约定

- **Feature 文件夹**：`features/Feature #<id>/`
  - 示例：`features/Feature #72694/`
- **最终测试文档模板**：`features/feature-doc-template-v2.md`
- **Feature 列表**：`features/feature list.md`

---

## 输出物命名建议（强烈建议统一）

在 `features/Feature #<id>/` 下建议至少保留：

- **测试分析（原始分析稿）**：`F<id>-需求分析.md`（或 `F<id>-test-analysis.md`）
- **逐条验证/带结论的测试分析稿**：在原始分析稿中直接用 🔴 标记补充结论（见下文）
- **最终测试文档**：`F<id>-doc.md` / `F<id>-doc.md`（以实际模板输出为准）
- **必要的专项拆解用例**：如 `F<id>-Axis-ChartType-Cases.md`
- **Bug 证据/来源**：如从 Issue Tracking 导出的 PDF（例如 `Feature #72694_ ... .pdf`）

---

## 标记规范：逐条验证（必须）

对“测试分析 md 文档”的每个关键点/风险点/结论，必须逐条验证并记录结果，统一使用：

`🔴 **测试-分析**：<你的结论/现象/限制/关联 bug>`

建议写法：

- **明确结论**：ok / 不支持 / 需要禁用 / 可忽略 / 未复现（含条件）
- **写触发条件**：chart type、single vs separated、是否 second axis、多绑定方式等
- **写关联问题**：Bug/Issue 编号（如 `#74046`）与简短现象

> 例：`🔴 **测试-分析**：single chart + X:1D+2M 无 second axis，多次设置后轴乱（Issue #74046）`

---

## 标准流程（SOP）

### 1) 用 Prompt 生成“测试分析”md（从 Copilot / 浏览器）

- **Prompt 来源**：使用 `\prompts\feature-analysis\generic` 下的 **两个版本 prompt**（按团队约定选用/对比）。
- **Copilot 设置**：
  - 指定 **repository**
  - 指定 **知识库（knowledge base）**
- **当知识库不存在/不完整时**：
  - 在 prompt 中提供你已知的 **所有 doc URL**（产品文档、API 文档、PR、Issue、设计稿等）
  - 让 AI 生成一份“测试分析”的 md 文档（包含风险点、关键路径、边界、回归影响、建议用例）

**输出**：`features/Feature #<id>/F<id>-需求分析.md`（或同等命名）

---

### 2) 对测试分析逐条验证并补充 🔴 标记

- 打开上一步生成的 md
- 逐条验证（功能/边界/兼容性/脚本/本地化/导出等）
- 将结论写回原文，使用 `🔴 **测试-分析**：` 标记
- **必要时做专项拆解**（核心复杂点单独拆一份可执行用例）
  - 典型例子：按 Chart Type / Axis Type 分类的用例集  
    例如 `F72694-Axis-ChartTYpe-Cases.md`

**输出**：
- 在 `F<id>-需求分析.md` 中沉淀验证结论（带 🔴 标记）
- 可能新增专项用例拆解文件（如 `F<id>-Axis-ChartType-Cases.md`）

---

### 3) 需求分析完成后：让 AI 填充模板生成最终测试文档

- 输入：第 2 步完成的分析稿（含 🔴 标记）+ 专项拆解用例（如有）
- 目标：将“与测试有关的内容”填充到：
  - `features/feature-doc-template-v2.md`
- 生成 Feature 的最终测试文档（放在 `features/Feature #<id>/` 下）

**输出**：`features/Feature #<id>/F<id>-doc.md`（或 `F<id>-doc2.md`）

例如:
```prompt
读取@features/Feature #72694/F72694-Axis-ChartTYpe-Cases.md @features/Feature #72694/F72694-需求分析-v2.md 这两个文件的内容,特别是使用🔴 **测试-分析**：标记的. 

将与测试有关的内容填入@features/Feature #72694/F#72694-doc.md 
```

---

### 4) 若存在 Bug：用 PDF/Issue 列表更新到最终文档的 Bug List

- 若 Issue Tracking 提供 PDF（或导出的列表）：
  - 让 AI 从 PDF 的 **Related issues / Subtasks** 提取 bug 编号、标题、状态、日期
  - 追加/更新到最终测试文档末尾的 **Bug List**（保持表格一致）

**输出**：最终测试文档中的 Bug List 完整且与来源一致（含状态/日期/简述）。

---

### 5) 必要时保留所有测试用例并存成 zui

当 Feature 的测试用例量大、回归价值高、或需要跨版本复用时：

- 保留所有测试 case（可从最终文档/专项拆解中汇总）
- 输出为 `zui`（按团队约定格式/目录放置）

> 注：若当前仓库对 `zui` 的存放路径/命名有统一规范，请在此 README 后续补充一节“zui 规范”，并按规范落地。

---

## 推荐检查清单（写完文档后自检）

- 是否所有关键结论都用 `🔴 **测试-分析**：` 标记并可追溯？
- P0 是否覆盖：勾选/取消、回显、持久化/round-trip？
- 是否覆盖：多绑定、多轴/secondary axis、single vs separated、脚本优先级、本地化、导出？
- Bug List 是否与 PDF/Issue Tracking 一致（编号/状态/日期）？

