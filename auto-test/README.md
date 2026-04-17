# 自动化测试（auto-test）

本目录汇总仓库内**自动化测试**相关约定与资源。当前各阶段成熟度不同，见下文「测试阶段」。

---

## 测试阶段

| 阶段 | 说明 | 状态 |
|------|------|------|
| **1. 纯 Java 单元测试** | 后端 / 共享 Java 模块的单测与约定 | **待建设（TODO）** |
| **2. 前端 Unit Case 集成测试** | 以前端组件为主的**集成向**单测，见 `front-end-testing/` | **进行中** |
| **3. E2E 测试** | 端到端（浏览器 / 真实链路）自动化 | **待建设（TODO）** |

---

## 阶段 2：前端 Unit Case 集成测试

### 定位

- **front-end 的 unit case** 主要面向**前端的集成测试**：在可控环境下渲染组件、模拟用户操作与网络，验证**场景级行为**与契约，而不是盲目堆覆盖率。
- 用例设计以**场景（Scenario / Group）**、**风险等级（Risk）** 等维度驱动，优先覆盖高价值路径与回归敏感点。

### 技术栈

| 用途 | 选型 |
|------|------|
| 组件与交互测试 | **ATL（Angular Testing Library）** |
| HTTP / API 模拟 | **MSW（Mock Service Worker）** |

约定：**组件级集成测试**统一采用 **ATL + MSW**，不在此类用例中混用其它 UI 测试库或随意 `HttpClientTestingModule` 手写桩（与主提示词中的迁移要求一致）。

### 与 Service 层测试的分工

- 若 **component 中强依赖 service**（复杂 HTTP、路由、多分支副作用等），在补全组件集成测试的同时，对 **service 本身** 可单独补充 **纯 Jest** 的单元测试（不绑 ATL），专注方法契约、分支与错误路径。
- 生成与分析 service 测试时可参考 `front-end-testing/prompts/service-unit-test-generation-prompt.md` 中的步骤（先分析职责与风险，再写 `describe` / `it`，`it` 标题可用 `[Risk N]` 区分优先级）。

### 提示词与文档（`front-end-testing/prompts/`）

| 文件 | 作用 |
|------|------|
| `Front end testing scenario-v5.md` | **主提示词**：用户目标 → 契约扫描 → 风险筛选 → 场景与输出表；日常生成 unit case **以 v5 为准**（若团队已切到 v6，则以当前约定版本为准）。 |
| `Front end testing scenario-v6.md` | 与 v5 同系列的主流程变体，按需选用。 |
| `unit-test-techniques-supplement.md` | **补充索引**：按 Technique ID / 清单按需检索，配合主提示词使用，**不替代**主流程。 |
| `service-unit-test-generation-prompt.md` | **Service 单测**生成：先读实现、再标 Risk、再写纯 Jest 用例。 |

---

## 目录结构（当前）

```
auto-test/
├── README.md                 # 本说明
└── front-end-testing/
    └── prompts/              # 前端集成测试 / Service 单测 的提示词与补充材料
        ├── Front end testing scenario-v5.md
        ├── Front end testing scenario-v6.md
        ├── unit-test-techniques-supplement.md
        └── service-unit-test-generation-prompt.md
```

后续若补充 **Java 单测** 或 **E2E** 的脚本、配置与文档，建议在本 README 的「测试阶段」表中更新链接与状态。

---

## 后续规划（TODO 摘要）

1. **纯 Java 单元测试**：目录、构建约定、CI 接入方式待定义。  
2. **E2E**：选型（如 Playwright / Cypress 等）、环境与流水线待定义。  
3. 本 README 随 `auto-test/` 实际内容迭代更新。
