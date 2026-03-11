# subjectAreas分析流程

## 第一阶段：找到 Intent 相关逻辑进行分析

```plaintext
你现在是一个资深 AI 测试架构师。
请帮我简单分析当前assistent项目里subjectAreas相关的prompt以及核心代码逻辑
验证以下能力：
1. Module 识别正确
2. SubModule 识别正确
3. explicitly_mentioned 判断正确
4. Prompt 规则是否生效
5. Code 层增强逻辑是否正确
最后请输出为结构化 Markdown，保存到本地，方便我做测试分析文档。
```

## 第二阶段：让 claude生成 case

```plaintext
你是一名 AI 测试工程师。

根据以上对 Module / SubModule 识别规则的分析，
生成一组回归测试用例，用于验证 subjectAreas prompt 是否能正确识别：
- module
- subModule
- explicitly_mentioned

要求：
1. 只有用户问题（User Query）使用英文，其余内容使用中文。
2. 每个测试用例包含以下字段：
   * CaseID
   * 场景/类别
   * contextType
   * User Query
   * 预期 module
   * 预期 subModule
   * explicitly_mentioned
   * 设计意图
3. explicitly_mentioned 判断规则：
   - 用户问题中明确出现 module 或 submodule 名称 → true
   - 仅通过语义推断得到 → false
4. 对于explicitly_mentioned=false，预期结果要最终Enhanced后的结果
5. case要求：
  - 每个 case 尽量只验证一个规则
  - 每条规则只保留一个最具代表性的 case
  - 删除冗余 case
  - 保证高覆盖率
   
6. 所有测试用例放在一个 Markdown 表格中输出，输出保存到md文件

表格格式：
| CaseID | 场景/类别 | User Query | 预期 module | 预期 subModule | explicitly_mentioned | 设计意图
```

## 第三阶段：让 claude review case

```plaintext
请对当前测试集进行优化，在保证高覆盖率的前提下减少冗余 case。
要求：
1. 先检查现有测试用例是否缺少关键识别场景，例如：
   - module 与 subModule 同时被用户显式提到
   - module 显式提到但 subModule 需要语义推断
   - 多 subModule 同时出现或冲突
   - 无法识别 module/subModule 的 fallback 场景  
   如缺失请补充必要测试用例。

2. 删除冗余 case：
   - 多个 case 仅关键词不同但验证的是同一规则
   - 多个 case 触发相同识别逻辑

3. 优化原则：
   - 每个 case 尽量只验证一个规则
   - 每条规则只保留一个最具代表性的 case
   - 保留复杂规则、例外规则、历史 bug 回归 case

输出：
- 优化后的测试用例表（保持原表结构）
- 说明新增和删除的 case 及原因
- 输出保存到md文件

目标：生成一个高质量、低冗余的回归测试集
```