# E2E 转换优先模块选择分析

## 选模块的判断标准

选模块要同时满足：
1. **覆盖尽可能多的技术模式**（Setup Script、多用户 Session、参数化、异步等待…）
2. **前置依赖少**（不依赖外部 API Key、不需要真实邮件）
3. **Excel 结构有代表性**（matrix、case、多 sheet 都要有）
4. **规模适中**（太大太复杂会让第一次跑通变成灾难）
5. **回归价值高**（功能出问题会直接影响用户或核心工作流）

---

## 各功能域模块优先级

### EM 端

EM 模块按回归优先级从高到低排列：

| 模块 | Case数 | 回归优先级 | 推荐阶段 | 理由 |
|------|--------|-----------|---------|------|
| `Content-Repository.xlsx` | ~73 | **极高** | 第一批 | 资产权限/重命名/删除 — 坏了用户看不到 Dashboard |
| `Content-Export&Import.xlsx` | ~112 | **极高** | 第一批 | 核心部署工作流 — 坏了无法迁移资产 |
| `Monitor.xlsx` | ~57 | **高** | 第一批 | 运维必看；无外部依赖，易于全自动 |
| `Content-Dashboard.xlsx` | ~59 | **高** | 第二批 | 全局默认 Dashboard — 影响所有 Portal 用户首页 |
| `Content.xlsx` | ~42 | **高** | 第二批 | 存储后端/Driver 上传 — 基础设施层 |
| `Presentation_Matrix.xlsx` | ~70 | 中 | 第二批 | 主题/品牌视觉，截图回归 |
| `LicenseKey.xlsx` | ~50 | 中 | 第三批 | 需要特殊测试 Key，自动化有限 |
| `General.xlsx` | ~22 | **低** | 不推荐 | 站点 URL/Cookie 等基础配置，极少回归 |
| `Properties.xlsx` | ~30 | 低 | 不推荐 | JVM/缓存参数，极少改动 |

**不建议现阶段选的 EM 模块：**

| 模块 | 原因 |
|------|------|
| `Audit_Function.xlsx`（~172 case） | 需要其他功能先产生事件，适合在其他模块跑通后作为集成验证 |
| `Audit_Organization.xlsx` | 依赖多租户环境，复杂度高 |
| `Logs/TestCase.xlsx` | 日志级别配置，回归价值低 |

---

### Portal 段

*(待补充)*

---

### 数据源 / DB 段

*(待补充)*

---

### Worksheet 段

*(待补充)*

---

### Dashboard / Viewsheet 段

*(待补充)*

---

## 推荐首批转换模块（4个，按顺序执行）

基于回归价值 + 技术模式覆盖综合评估，替换原方案中的 `General.xlsx` 和 `Schedule-Settings.xlsx`：

### 第1个：`manage/EM/Monitor/Monitor.xlsx`
**~57 case，matrix 格式（Monitor + Summary 两个 sheet）**

**为什么选**：
- 全部只读断言，**零外部依赖**，最适合验证整条 Stage 0→5 流水线
- 运维高频使用，回归价值高
- 覆盖新技术模式：**动态数值范围断言**（CPU/内存用 `> 0` 而非精确值）

**会遇到的技术问题**：
- 集群节点数、内存/CPU 指标是动态值 → 改为范围断言（`expect(value).toBeGreaterThan(0)`）
- Summary sheet 的 performance 图表验证 → 截图断言

**人工介入点**：确认单节点 Docker 环境下哪些监控指标不显示（多节点专属指标标记 skip）

---

### 第2个：`manage/EM/Setting/Content/Content-Repository.xlsx`
**~73 case，matrix 格式（4 个 sheet）**

**为什么选**：
- **回归价值最高的 EM 模块**：资产可见性 + 权限控制 — 直接影响用户能否访问 Dashboard
- 4 个 sheet 结构，验证阶段0多 sheet 提取能力
- 覆盖新技术模式：**Assets ZIP 预置 + 上下文菜单操作 + 权限分配断言**
- 与 Security 模块互补：Security 验证"能否登录"，Repository 验证"登录后能操作什么"

**会遇到的技术问题**：

| 问题 | 处理方式 |
|------|---------|
| 需要预置资产（Viewsheet/Folder） | Assets ZIP 包含测试用资产 |
| 上下文菜单操作（右键） | `locator.click({ button: 'right' })` + 等待菜单出现 |
| 权限修改后验证生效 | 新 BrowserContext 以受限用户访问验证 |
| Data Space sheet 涉及存储配置 | 可拆分为独立规范文件 |

**人工介入点**：准备 Assets ZIP（包含测试用 Viewsheet 和 Folder）

---

### 第3个：`manage/Scheduler/Case/Schedule_Case.xlsx`
**~42 case，case 格式（顺序步骤，343 行）**

**为什么选**：
- 覆盖完整任务生命周期：创建 → 启用 → 触发执行 → 验证历史
- 覆盖新技术模式：**Setup Script（Groovy 创建资源）+ 异步执行等待**
- Case 格式（顺序步骤）与前两个模块的 matrix 格式形成对比，验证阶段0两种提取路径

**会遇到的技术问题**：

| 问题 | 处理方式 |
|------|---------|
| 任务执行是异步的 | 点击"Run Now"后 polling 执行历史，加 30s timeout |
| Email Action 验证 | 通过 MailHog API 读取收件箱 |
| MV 生成类 Task | 此阶段跳过，仅测 Viewsheet/Backup 类型 |
| 资源前置（Viewsheet） | Assets ZIP + Setup Script 创建数据源 |

**人工介入点**：补充 Assets ZIP（包含调度用的 Viewsheet）、确认 Groovy 可创建数据源

---

### 第4个：`manage/Security/Matrix/SecurityProvider_Manual.xlsx`
**~121 case，5 个 sheet（Enable Security / provider config / user / edit permission pane…）**

**为什么选**：
- 覆盖最核心的安全模式：**Groovy 开启 security + 多 BrowserContext 双用户验证**
- 5 个 sheet，全面验证阶段0多 sheet 提取与拆分能力
- 建立完整的权限测试模板，后续所有权限类模块直接复用

**会遇到的技术问题**：

| 问题 | 处理方式 |
|------|---------|
| 同一文件部分测试需 security 开启、部分需关闭 | 拆分为两个规范文件（`-with-security.md` / `-no-security.md`） |
| 多用户验证需要并发 session | Playwright `browser.newContext()` 双 Context |
| LDAP provider 配置 | 跳过，标记 `_REQUIRES_HUMAN_:` |
| 用户/权限前置 | Groovy 权限模板（需先建立模板库） |

**人工介入点**：建立 Groovy 权限配置模板、确认 DSL 支持哪些权限类型

---

## 4个模块覆盖的技术模式总览

| 技术模式 | Monitor | Content-Repository | Scheduler Case | Security Provider |
|---------|:-------:|:-----------------:|:--------------:|:-----------------:|
| EM 登录 Fixture | ✓ | ✓ | ✓ | ✓ |
| 只读 UI 断言 | ✓ | ✓ | - | - |
| 动态数值范围断言 | ✓ | - | - | - |
| 上下文菜单操作 | - | ✓ | - | - |
| Assets ZIP | - | ✓ | ✓ | - |
| 参数化测试 | - | ✓ | ✓ | ✓ |
| Setup Script（Groovy） | - | - | ✓ | ✓ |
| 异步执行等待 | - | - | ✓ | - |
| MailHog 邮件验证 | - | - | ✓ | - |
| 多 BrowserContext | - | ✓ | - | ✓ |
| 多 sheet Excel 提取 | ✓ | ✓ | - | ✓ |
| 截图断言 | ✓ | - | - | - |

4 个模块覆盖全部核心技术模式，后续各功能域模块碰到的问题均是这 4 个的变体。

---

## 开始转换前需先完成的事项

在进入 Excel 转换流程前，先把以下 3 件事做好，否则到阶段3/4 会卡住：

### 1. 创建 `compose.mailhog.yaml`
影响模块：第3个（Scheduler Case）

```yaml
services:
  mailhog:
    image: mailhog/mailhog:latest
    ports:
      - "1025"   # SMTP 端口（应用发信）
      - "8025"   # Web UI / REST API（Playwright 读信）
```

Setup Script 中将应用邮件服务器指向 MailHog：

```groovy
properties {
    set "mail.smtp.host", "mailhog"
    set "mail.smtp.port", "1025"
}
```

### 2. 建立 Groovy 权限配置模板 `_SECURITY_TEMPLATES.md`
影响模块：第4个（Security Provider）

收录常用片段：启用 security、创建用户/角色、分配 action permission、分配 resource permission。
详见 `functional-category-analysis.md` — 优先级2 章节。

### 3. 在 `_RECIPES.md` 补充 EM 登录 Recipe
影响模块：全部 4 个

```markdown
## Log in to Enterprise Manager

1. User navigates to `/app/em`
2. **[Wait for login page]**
3. User enters "admin" into username field (`getByLabel("User Name")`)
4. User enters "Admin1234!" into password field (`getByLabel("Password")`)
5. User clicks "Sign In" (`getByRole("button", { name: "Sign In" })`)
6. **[Wait for EM dashboard to load]** (`waitForURL("**/em/**")`)
```

---

## 暂不推荐的模块

| 模块 | 原因 |
|------|------|
| `General.xlsx`（~22 case） | 回归优先级低，基础配置极少变动 |
| `Schedule-Settings.xlsx`（~35 case） | 技术模式已被其他模块覆盖，回归价值一般 |
| `Security_Manual.xlsx`（~267 case） | 规模太大，适合在第4个模块跑通后再处理 |
| `Schedule.xlsx`（~141 case） | 包含 Burst/MV 类型，依赖更多基础设施 |
| `Organization_Security.xlsx` | 多租户复杂度高，需先验证单租户场景 |
| `Audit_Function.xlsx`（~172 case） | 依赖其他功能先产生事件，应在其他模块跑通后作为集成验证 |
