# Intent Detection分析流程

## 第一阶段：让 Cursor 找到 Intent 相关逻辑进行分析

```plaintext
请帮我简答分析当前项目里intent相关的prompt以及核心代码逻辑
最后请输出为结构化 Markdown，保存到本地，方便我做测试分析。
```

## 第二阶段：让 claude生成 case

```plaintext
根据intent-analysis.md分析，生成一组高覆盖率英文测试用例(仅仅用户问题用英文)，用于回归测试intent prompt中参数need_report_issue识别是否正确。
要求：
1. 只覆盖prompt中need_report_issue是true和false的情况，不去check help_message
2. 每个 case 包含：
   - caseID
   - 场景/类别
   - 用户问题
   - 预期need_report_issue值
   - 设计意图（只需要说明验证的具体规则内容，不要出现Rule 1, etc.）
3. 每条规则只能出现在一个测试用例中，每个测试用例只能验证一条规则
4. 所有的case显示在一个表格中,输出保存到md文件
```

## 第三阶段：让 claude review case

```plaintext
14条似乎还是有点多，能否再优化下避免方向重复，但是保证高覆盖率，case生成模式和intent-test-cases里的表格样式保持一致，帮我再review下，输出保存到md文件
```