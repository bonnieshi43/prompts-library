# Excel → Markdown 测试点文档转换 Prompt

你是一个资深测试工程师，将附件的 Excel 测试矩阵转换为结构化 Markdown 文档，供人工阅读和 AI 生成测试场景使用。

---

## 一、输入处理

### 多 Sheet 命名
每个 sheet 独立输出为一个 Markdown 文件：
- 格式：`{Excel文件名}-{Sheet名简化}.md`
- 简化规则：移除括号及其内容，空格转连字符，保留原有连字符
- 示例：`Feature Detail(v2)` → `ModuleName-FeatureDetail.md`

---

## 二、提取原则

### 提取什么
- **功能描述**：该功能的用途和作用域（适用角色、位置、模式）
- **前置条件**：环境配置、所需数据、登录角色
- **测试步骤与预期结果**：核心操作路径和可验证的输出
- **路径与规则**：Excel 中出现的 UI 导航路径、存储路径、业务规则、跨组件同步规则 — **完整保留**
- **Bug**：用 `> **Bug #XXXXX**` 标注，有则标，无则省略
- **关联关系**：功能间的依赖，有则列出

### 忽略什么
- 纯 UI 本地化验证（按钮文字、标签翻译）
- 通用浏览器兼容性列表
- 显而易见的交互（"点击后有反应"）
- 重复的公共前置条件（在章节开头统一说明）

### 名词处理
以下名词保持原样不翻译：StyleBI、Repository、Schedule、Composer、Portal、EM、Studio、Site Admin、Org Admin、Host-Org

---

## 三、输出格式

### 文档头
```
---
module: {Excel文件名} / {Sheet名}
last-updated: YYYY-MM-DD
related: [关联模块，无则写 none]
---
```

### 文档结构
按需选用以下章节，顺序固定：

1. **Overview / Rules**（sheet 含总结性规则时使用）— 保留原有编号和层级，路径用代码格式
2. **Pre-conditions & Environment**（公共前置条件）— 环境配置、所需角色、所需数据
3. **测试场景章节**（按 Excel 原有章节结构和编号组织）

### 测试场景格式

**矩阵型**（Excel 为条件-结果网格）：

```markdown
#### [章节编号] [功能名称]

**Pre-conditions:** [环境状态]; [登录角色]

| Condition / Action | Expected Result |
|--------------------|-----------------|
| [条件或操作]        | [预期结果]       |
```

**步骤型**（Excel 为顺序操作列表）：

```markdown
#### [章节编号] [场景名称]

**Pre-conditions:** [环境状态]

1. [操作步骤]
2. **Assert:** [验证点]
```

### Bug 标注
```markdown
> **Bug #XXXXX** — [一句话说明影响范围和现象]
```

---

## 四、特殊结构处理（按需）

遇到下列情况时才应用对应规则：

| 规则 | 触发条件 |
|------|---------|
| A. 层级嵌套 | 多列合并单元格形成父子条件结构 |
| B. 内联注释 | 单元格内容以 `//` 开头 |
| C. 跨组件同步验证 | 预期结果要求同时验证多个端/组件 |
| D. 规则类 Sheet | Sheet 以业务规则/说明为主，无标准测试行 |
| E. 规则与测试关联 | 测试章节对应 Overview 中明确的业务规则 |
| F. Trigger/Check 结构 | Excel 使用"Trigger + Check"二元格式 |
| G. 未知标记符 | 单元格出现 `*` 等标记且无图例说明 |

---

### A. 层级嵌套

多列合并单元格形成的父子条件，**不要铺平为单层表格**，用嵌套标题 + 子表格还原层级：

```markdown
**[父级条件]:**

_[子级条件]:_

| [变量] | Expected Result |
|--------|-----------------|
| [值1]  | [结果1]          |
| [值2]  | [结果2]          |
```

超过 3 层时改用缩进 bullet list。

---

### B. 内联注释

`//` 开头的内容是行为约束或补充说明，转为 blockquote 紧跟对应测试点：

- 一般说明 → `> **Note:** [内容]`
- 范围限制（`//Note: only support X, not Y`）→ `> **Scope:** [内容]`
- 低优先级说明 → `> **Low priority:** [内容]`

---

### C. 跨组件同步验证

预期结果涉及多端同步时，显式标出：

```markdown
| [操作] | [直接结果] |
|        | **Sync check:** Verify [组件A] and [组件B] reflect the change |
```

步骤型中单独列一行：`N. **Sync check:** Verify [组件A] and [组件B] are consistent.`

---

### D. 规则类 Sheet

- 规则完整表述只写在该 Sheet 的 MD 中
- 其他 Sheet 的 MD 头部加引用：`> **See also:** [filename.md] for rules and context.`

---

### E. 规则与测试关联

测试章节对应明确业务规则时，在测试用例前内联精简摘要：

```markdown
#### [章节编号] [功能名称]

**Business Rule:** [一到两句话描述核心约束，让读者无需查阅 Overview 即可理解断言依据]

| Condition | Expected Result |
|-----------|-----------------|
```

规则 MD 保留全文背景；测试 MD 只内联精简摘要。无显式规则的纯 UI 验证章节不需要此行。

---

### F. Trigger/Check 结构

```markdown
- **Trigger:** [触发操作路径]
- **Check:** [验证结果]
```

---

### G. 未知标记符

含义不明的标记保留为脚注：

```markdown
| [操作] | [结果] `*` |

`*` _Marker present in source Excel; meaning unspecified._
```
