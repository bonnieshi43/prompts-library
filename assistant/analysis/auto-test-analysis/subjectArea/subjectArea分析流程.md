# 检索策略分析流程

## 第一步：分析规则

````
我现在需要你帮我对 SubjectArea 识别的规则做系统性分析，用于后续生成测试用例
请你输出一份“完整、结构化、可测试”的分析文档

【测试用例目标】
后续所有测试用例的目标是验证以下的输出是否正确：
module: <ModuleName>
subModule: <subModuleName>
explicitly_mentioned: <true|false>

因此，在分析过程中，你要围绕“如何验证 module / subModule / explicitly_mentioned 的正确性”

【分析目标】
分析SubjectArea 识别规则，确保后续可以基于你的分析生成高覆盖率测试用例。

1. 模块识别规则
    - 每个 module以及subModule 的识别依据 （要覆盖到每一个subModule）
    - 容易混淆的边界（例如 table vs crosstab vs freehand table）
2. explicitly_mentioned 判定规则
    - 什么情况是 true
    - 什么情况是 false
3.其他所有跟测试用例目标相关的规则
4.code层的增强逻辑

最后请输出为结构化 Markdown，保存到本地，方便我做测试分析文档。
````
---

## 第二步：生成测试 case

````
基于上面的分析文档，帮我生成一批高质量测试用例：

要求：
1. 覆盖
- 所有测试维度
- 所有的subModule
- 如果最后走了增强逻辑，则subject area只输出Enhanced SubjectAreas 结果
- 覆盖不同的contextType: dashboard、worksheet、freehand、table、chart、crosstab、portal、em、scheduleTask

2.每个case包含：
- caseID
- 用户问题
- contextType
- 预期subject area
  module:
  subModule:
  explicitly_mentioned:
- 实际意图（说明具体验证的哪一个规则）

3.当测试 explicitly_mentioned = true 时，每个 case 只能包含一个显式触发信号（如 module 名称或 module-exclusive concept）。禁止多个显式信号同时出现，以避免测试结果不可归因。比如测试union，就不要出现worksheet

4.英文case占比80%

5. 所有的case显示在一个表格中,输出保存到md文件
````
