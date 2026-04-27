# BI 平台 E2E 转换：功能分类与挑战分析

## 功能分类总览

根据 `legacy-tests.md` 中 135 个候选文件，按功能域划分为 10 大类型：

| # | 功能类型 | 代表文件 | 估算 case 数 |
|---|---------|---------|------------|
| 1 | Dashboard / Viewsheet 交互 | VS-Assembly、VS-AssemblyAction | ~2,500 |
| 2 | Worksheet 数据准备 | Worksheet/Docs | ~700 |
| 3 | EM 系统配置 | manage/EM/Setting | ~400 |
| 4 | 权限与安全 | manage/Security | ~750 |
| 5 | 调度任务 | manage/Scheduler | ~235 |
| 6 | 数据源与连接器 | sree/DataSource、TabularSparkData | ~300 |
| 7 | 数据建模（LM / VPM） | DataSource/Matrix/Logical Model、VPM | ~120 |
| 8 | 审计与监控 | manage/EM/Audit、Monitor | ~260 |
| 9 | 多租户与组织 | Security/Organization | ~130 |
| 10 | SSO / 自助注册 / 本地化 | SSO、Signup、Localization | ~100 |

---

## 各类型详细分析

---

### 1. Dashboard / Viewsheet 交互类

**覆盖范围**：Chart、Filter、Form、Table、Crosstab、Freehand Table、Output、Annotation、Bookmark、Highlight、Hyperlink、Drill、Layout

#### 验证方式
- **UI 断言**：元素可见性、文本内容、属性值 → Playwright 原生支持
- **视觉断言**：`toHaveScreenshot()` → 图表渲染、格式效果、CSS 样式
- **数据断言**：表格行数、单元格内容 → `locator("td").nth(n).textContent()`
- **交互反馈**：选中状态、展开/折叠、联动过滤 → 状态类 + aria 属性

#### 前置条件处理
- 绝大多数需要 **Assets ZIP**（含 Viewsheet 资源）
- 数据绑定测试需要 **Database SQL**（PostgreSQL 容器）+ **Setup Script**（创建数据源）
- 资源路径通常在 Excel 中明确写出，ZIP 查找策略已在阶段1提示词中定义

#### 转换难点
- **拖拽操作**（DND binding）：Playwright `dragAndDrop` 对某些 Angular CDK 拖拽实现不可靠，需要 `_REQUIRES_HUMAN_:` 或录制后验证
- **Chart 区域交互**（刷选 Brush、Zoom、Region）：需要精确坐标，依赖截图 + Canvas 断言
- **颜色/格式验证**：CSS 颜色值需与应用渲染一致，截图断言更可靠
- **矩阵 Excel**：1 个网格可能含 100+ 行 → 阶段0结构化时需完整保留所有行

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| 拖拽 binding 步骤 | 用 `playwright codegen` 录制，写入 `_RECIPES.md` |
| 图表"显示正确"等视觉断言 | 改为 `Assert (screenshot):`，首次运行自动生成基线 |
| 无法找到 locator 的 Canvas 元素 | 标记 `_REQUIRES_HUMAN_:`，说明元素结构 |
| 需要的 Assets ZIP 不存在 | 人工导出 Viewsheet 资源包 |

---

### 2. Worksheet 数据准备类

**覆盖范围**：表创建/编辑、Join、条件过滤、Group/Aggregate、表达式列、文件上传、变量表

#### 验证方式
- **UI 状态**：工具栏按钮状态、节点树展开
- **数据结果**：预览表格中的行数、列名、聚合值
- **条件生效**：过滤后行数变化（`locator("tbody tr")` count）

#### 前置条件处理
- 需要 **Database SQL** + **Setup Script**（创建 JDBC 数据源）
- 文件上传测试：需要将测试文件放入 Assets ZIP 并在 Groovy 脚本中预置

#### 转换难点
- **Join 配置**：需要拖拽连线，同 DND 问题
- **表达式编辑器**：大量输入操作 + 语法验证，步骤细碎
- **结果数据验证**：Excel 中通常只写"显示正确结果"，需要人工确认期望值

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| Join 拖拽连线 | `playwright codegen` 录制 |
| 期望数据值未写明 | 人工补充具体期望值到规范中 |
| 文件上传资源 | 将测试文件打包进 Assets ZIP |

---

### 3. EM 系统配置类

**覆盖范围**：General Settings、License Key、Presentation（主题）、Content（Repository、Export/Import、Storage、Drivers）、Properties、Logs

#### 验证方式

EM 配置验证分两层：

**第一层：配置页面本身**
- 输入字段保存后再打开仍显示正确值 → `toHaveValue()`
- 保存成功提示 → `getByText("Saved successfully")`
- 校验错误提示 → `toHaveText("Invalid value")`

**第二层：配置实际生效（跨页面验证）**
- **Session timeout 配置** → 等待超时后访问，验证被重定向到登录页
- **主题/Logo 配置** → 在 Portal 页验证 CSS 变量或 Logo 图片 src
- **Repository 显示设置** → 切换到 Portal 验证树结构变化
- **Storage 后端配置** → 创建资源再重启，验证资源持久化
- **许可证** → 验证功能开关状态（某功能是否可用）

```markdown
## Test: Changing session timeout takes effect

### Given
- EM General Settings page is open (`/app/em/settings/general`)

### When
- User sets session timeout to 1 minute
- User clicks Save

### Then
- **Assert:** Success toast is visible
- **[Wait 65 seconds]**  ← 实际等待，或用 API 模拟 session 过期
- **Assert:** Portal redirects to login page when accessed
```

> **关键点**：大多数 EM 设置测试需要在两个页面上分别断言，Given/When 在 EM，部分 Then 跳转到 Portal 验证。

#### 前置条件处理
- EM 始终需要登录（即使全局 security disabled）
- 可用 Fixture `EMLoggedInAsAdmin` 统一处理
- License Key 测试：需要在 `.env` 中准备测试用 key

#### 转换难点
- **配置生效时机**：部分配置即时生效，部分需要重启或清缓存 → Excel 中未标注，需要人工判断
- **主题测试**：CSS 变量值验证或截图比对
- **存储驱动上传**：文件上传操作

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| 配置是否需要重启才生效 | 查阅代码确认，在规范中注明 |
| Session timeout 验证 | 等待时间过长（>60s），建议改为 API 调用 invalidate session |
| License key 合法性测试 | 需要准备特定类型测试 key |
| 存储后端切换验证 | 依赖 Docker 配置，需要多后端参数化 |

---

### 4. 权限与安全类

**覆盖范围**：Action Permission、Resource Permission、Data Source Permission、Security Provider（LDAP/DB）、用户/组/角色管理

#### 验证方式

权限验证必须**以被测用户身份访问**，验证是否能看到 / 操作对应资源：

```
Admin Session → 创建用户 + 配置权限
        ↓
User Session  → 访问受限资源 → Assert: 403 / 元素不可见 / 菜单缺失
```

Playwright 支持多 Browser Context 实现多用户会话：

```typescript
const adminCtx = await browser.newContext();
const userCtx  = await browser.newContext();
const adminPage = await adminCtx.newPage();
const userPage  = await userCtx.newPage();
// 分别登录不同账户，独立 session
```

#### 前置条件处理 — 用户/权限能否一并处理？

**可以全自动处理**，通过 Setup Script（Groovy DSL）：

```groovy
// spec-setup.groovy 示例
security {
    enable()
    user("analyst") {
        password "Analyst1234!"
        role "Analyst"
    }
    role("Analyst") {
        grant action: "AccessPortal"
        deny  resource: "/viewsheet/global/Finance/**"
    }
}
```

Groovy DSL（`shell/src/main/groovy/inetsoft/shell/dsl`）支持：
- 启用/禁用 security
- 创建 user / group / role
- 分配 action permission（AccessPortal、CreateViewsheet 等）
- 分配 resource permission（特定 viewsheet、数据源）

**限制**：
- LDAP / 外部 Security Provider 配置无法通过 Groovy 完成，需要 `_REQUIRES_HUMAN_:`
- 复杂的 Admin Permission 继承链需要验证 Groovy DSL 是否全覆盖

#### 转换难点
- **权限矩阵极大**：Security_Manual.xlsx 有 267 个 case，大量参数化行
- **结果判断多样**：有些是"菜单不显示"，有些是"403 页面"，有些是"内容为空"
- **顺序依赖**：必须先创建用户权限（Setup Script），再以该用户身份测试

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| LDAP/外部 Provider 配置 | 需要真实 LDAP 服务，标记 `_REQUIRES_HUMAN_:` |
| Groovy DSL 不支持的权限类型 | 人工编写 Setup Script 或通过 EM UI 设置 |
| 权限生效需要重新登录 | 在规范中明确注明需要重新创建 user session |
| 数据行列权限（VPM）的数据验证 | 见第7类 |

---

### 5. 调度任务类

**覆盖范围**：Task 创建/编辑/删除、Trigger 类型（时间/完成条件）、Action 类型（Viewsheet/MV/Backup/Burst/Email）、执行历史、Data Cycle

#### 验证方式

调度测试分两个层面：

**配置层（可全自动）**：
- 任务创建后出现在任务列表 → `getByRole("row", { name: "MyTask" })`
- 触发器配置正确显示 → 字段值断言
- 任务启用/禁用状态 → 开关状态断言

**执行层（部分需人工）**：
- 立即触发执行：可通过 EM "Run Now" 按钮触发，然后轮询执行历史
- Email Action 执行结果：Playwright 无法收邮件 → `_REQUIRES_HUMAN_:`
- Burst 分发结果：同上
- MV 生成结果：可通过 MV 管理页或 API 验证

```markdown
### Then
- **Assert:** Task "DailyReport" appears in task list
- **Assert:** Task status shows "Scheduled"
- User clicks "Run Now" on the task
- **[Wait for network idle, timeout: 30000ms]**
- **Assert:** Execution history shows latest run with status "Completed"
  - _REQUIRES_HUMAN_: Verify email was actually received if this is an email-type task
```

#### 前置条件处理
- 需要 Setup Script 创建任务依赖资源（Viewsheet、数据源）
- Email 任务：需要 EM 邮件服务器配置（Setup Script 或 compose 中配置 mock SMTP）
- 可考虑引入 **MailHog**（mock SMTP 服务）加入 Docker Compose，实现邮件验证全自动化

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| Email/Burst 执行结果验证 | 引入 MailHog，或标记 `_REQUIRES_HUMAN_:` |
| 时间触发任务（定时执行） | 无法在 E2E 中真实等待，改为"Run Now"触发 |
| Data Cycle 两阶段完成条件 | 复杂，建议拆分为配置验证 + 执行验证两个测试 |

---

### 6. 数据源与连接器类

**覆盖范围**：JDBC 数据源创建、Tabular 数据源（REST/Text/OneDrive/Azure Blob/InfluxDB 等）、连接测试、数据源树

#### 验证方式
- **连接配置 UI**：字段填写、保存 → UI 断言
- **连接测试**：点击"Test Connection"按钮，验证成功提示
- **元数据浏览**：展开数据源树，验证表/字段出现

#### 前置条件处理
- **JDBC 数据源**：使用 `compose.pg-db.yaml` 启动 PostgreSQL 容器，连接地址固定
- **Tabular 数据源（本地文件类）**：文件放入 Assets ZIP 预置
- **第三方 REST 连接器**（GitHub、Salesforce 等 60+ 个）：全部需要真实 API Key → **全部标记跳过或 `_REQUIRES_HUMAN_:`**

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| 第三方 REST 连接器 | 跳过或提供沙箱 API Key |
| OneDrive / Azure Blob OAuth 认证 | 需要 OAuth 授权流 → Playwright 难以处理 redirect，标记 `_REQUIRES_HUMAN_:` |
| 连接失败场景（错误密码等）| 可全自动，直接填错误值验证错误提示 |

---

### 7. 数据建模类（Logical Model / Physical View / VPM）

**覆盖范围**：Logical Model 实体/属性/关系、Physical View 表/Join、VPM 行列权限条件

#### 验证方式

这类测试验证链最长，分三层：

```
EM 配置（LM/VPM）→ Worksheet/Portal 查询 → 数据结果验证
```

**配置层**（可自动）：
- 实体创建后出现在 LM 树中
- Join 路径配置正确显示
- VPM 条件表达式文本正确

**查询生效层**（需数据）：
- 打开 Worksheet，绑定 LM 字段，预览数据
- VPM 行权限：以受限用户查询，验证返回行数减少
- VPM 列权限：验证特定字段不在结果中

#### 前置条件处理
- 必须有 **Database SQL**（真实数据）
- 必须有 **Setup Script**（创建数据源 + 加载 LM）
- VPM 验证需要安全用户（Setup Script 创建用户 + 配置 VPM scope）

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| LM 自动 Join 路径验证 | 需要数据实际查询后对比 SQL，部分用截图 |
| VPM 行过滤效果验证 | 需要知道"受限用户应看到多少行"，人工补充期望值 |
| 别名/循环 Join 检测 | 逻辑复杂，部分需要 `_REQUIRES_HUMAN_:` |

---

### 8. 审计与监控类

**覆盖范围**：Audit 各报表（登录历史、导出历史、调度历史、书签历史等）、Monitor（集群状态、内存/CPU）

#### 验证方式
- **审计报表**：先触发事件（登录、导出等），再在 EM Audit 页验证记录出现
- **筛选/搜索**：在审计报表中输入条件，验证结果过滤
- **Monitor**：验证指标数值存在（不验证精确值，验证格式和范围）

```
Test: Export action appears in Export History

Given:
  Admin logs into Portal, opens viewsheet, clicks Export → PDF

When:
  Admin navigates to EM → Audit → Export History

Then:
  Assert: Table contains row with username "admin" and action "Export"
  Assert: Timestamp is within last 5 minutes
```

#### 前置条件处理
- **顺序依赖**：事件触发 → 审计记录产生，需用 `## Test Order` 保证顺序
- 审计数据存储有延迟（异步），需要适当等待（`waitForResponse` 或 `waitForLoadState`）

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| 指标数值精确断言 | 改为范围断言（>0，格式正确）而非精确值 |
| 多节点集群 Monitor | 单节点 Docker 环境下部分监控指标不显示 |
| 审计延迟超过 Playwright 等待 | 增加 polling 等待或延长 timeout |

---

### 9. 多租户与组织类

**覆盖范围**：Organization 创建/删除、组织级 Security Provider、组织用户数/行列数限制、组织级 CSS/主题

#### 验证方式
- 创建 Org 后出现在组织列表
- 切换到该 Org 上下文，验证隔离性（另一个 Org 的资源不可见）
- 限制数值配置后，超出限制时提示错误

#### 前置条件处理
- Setup Script 可创建组织（需确认 Groovy DSL 是否支持多租户 API）
- 多用户多组织测试：需要多个 Browser Context 同时运行

#### 半人工介入点
| 情形 | 介入内容 |
|------|---------|
| Groovy DSL 不支持组织创建 | 通过 EM UI 操作并记录步骤，或调用 REST API |
| 跨组织隔离验证 | 需要两个用户分别属于不同 Org，Browser Context 并行 |
| 组织级存储后端 | 依赖多后端 Docker 配置 |

---

### 10. SSO / 自助注册 / 本地化类

#### SSO（SSOTesting.xlsx）
- **验证**：浏览器 redirect 到 IdP 登录页，登录后回跳并完成 session
- **难点**：需要真实 SAML/OAuth IdP（Keycloak、Okta 等）
- **结论**：**全部标记 `_REQUIRES_HUMAN_:`**，或搭建 mock IdP（Keycloak Docker）

#### 自助注册（Signup）
- 邮件验证环节：引入 MailHog 可实现自动化
- Google OAuth：需真实 Google 账号 → `_REQUIRES_HUMAN_:`

#### 本地化（Localization）
- 切换 locale → 验证日期/数字格式渲染
- 法语日期格式：`locator(".date-field").toHaveText("25 avril 2026")`
- **相对简单**，大部分可全自动化

---

## 跨类型通用挑战汇总

| 挑战 | 影响类型 | 解决方案 |
|------|---------|---------|
| **拖拽操作（DND）** | Chart binding、Worksheet Join | `playwright codegen` 录制后写入 `_RECIPES.md` |
| **异步等待** | 调度执行、审计延迟、数据加载 | `waitForResponse`、`waitForLoadState`、polling |
| **邮件验证** | Scheduler Email、Signup 验证码 | 引入 MailHog mock SMTP 到 `compose.yaml` |
| **外部 OAuth/SSO** | SSO、OneDrive、Google | 搭建 Keycloak mock 或全部 `_REQUIRES_HUMAN_:` |
| **第三方 API 凭证** | 60+ REST 连接器 | 全部跳过，记录到 `_SKIPPED.md` |
| **视觉/渲染验证** | Chart、CSS、主题 | `toHaveScreenshot()` 截图对比 |
| **配置生效时机** | EM Settings | 代码确认后在规范中注明是否需要重启 |
| **用户/权限创建** | Security、多租户 | Groovy Setup Script（可全自动） |
| **真实数据验证** | VPM、Worksheet、LM | Database SQL + 明确期望值（需人工补充） |

---

## 各类型半人工介入程度评估

| 类型 | 自动化率估算 | 主要人工介入点 |
|------|------------|--------------|
| Dashboard / Viewsheet 交互 | ~85% | 拖拽录制、缺失 Assets ZIP |
| Worksheet 数据准备 | ~75% | Join 拖拽、期望数据值补充 |
| EM 系统配置 | ~80% | 配置生效时机判断、跨页面验证路径 |
| 权限与安全 | ~70% | LDAP Provider、复杂权限继承链 |
| 调度任务 | ~65% | 邮件验证（需 MailHog）、执行时机 |
| 数据源与连接器 | ~50% | 大量第三方连接器需真实 Key |
| 数据建模（LM/VPM） | ~60% | 数据验证期望值、复杂 Join 路径 |
| 审计与监控 | ~80% | 异步延迟、精确指标值 |
| 多租户与组织 | ~65% | Groovy DSL 覆盖度、跨 Org 验证 |
| SSO / 自助注册 | ~30% | 外部 IdP、OAuth 流程 |
| 本地化 | ~90% | 几乎全自动 |

---

## 优先建立的三个通用基础设施

以下三项是横跨多个功能类型的共用能力，应在正式转换 Excel 前优先落地，避免在大量规范中重复写 `_REQUIRES_HUMAN_:`。

---

### 优先级1：引入 MailHog（Mock SMTP）

**解决问题**：调度 Email Action 验证、自助注册邮件验证码、分享邮件发送

**影响类型**：调度任务、自助注册、Sharing 功能

**实施方式**：在 `tests/resources/` 新增 `compose.mailhog.yaml`：

```yaml
# compose.mailhog.yaml
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

Playwright 测试中通过 MailHog REST API 验证邮件内容：

```typescript
// 读取最新一封邮件
const res = await page.request.get(`http://${mailhogHost}:${mailhogPort}/api/v2/messages`);
const { items } = await res.json();
expect(items[0].Content.Headers.Subject[0]).toBe("Scheduled Report");
```

**收益**：调度、注册等约 50+ 个原本需要 `_REQUIRES_HUMAN_:` 的 case 变为全自动。

---

### 优先级2：Groovy DSL 权限配置标准模板

**解决问题**：安全/权限类测试的 Setup Script 编写，所有需要用户、角色、权限前置的 case

**影响类型**：权限与安全（~750 case）、多租户、VPM scope、书签权限、调度权限

**实施内容**：在 `specs/browser/` 下建立 `_SECURITY_TEMPLATES.md`，收录以下常用 Groovy 片段：

```groovy
// 1. 启用 security + 创建基础用户
security {
    enable()
    user("analyst") { password "Analyst1234!"; role "Analyst" }
    user("viewer")  { password "Viewer1234!";  role "Viewer"  }
}

// 2. 分配 Action Permission
permission {
    role("Analyst") {
        grant action: "AccessPortal"
        grant action: "CreateViewsheet"
        deny  action: "AccessEM"
    }
}

// 3. 分配 Resource Permission（特定 Viewsheet）
permission {
    resource("/viewsheet/global/Sales/**") {
        grant role: "Analyst", actions: ["Read"]
        deny  role: "Viewer"
    }
}

// 4. 多租户：创建组织 + 组织管理员
organization("OrgA") {
    admin username: "orgA-admin", password: "Admin1234!"
    maxUsers 50
}
```

**规范写法**：在 `## Prerequisites` 的 `**Setup Script:**` 子弹中引用模板名称，阶段1 AI 生成规范时直接套用：

```markdown
- **Setup Script:** `security-setup.groovy`
  - Enable security (template: Enable Security)
  - Create user `analyst` / `Analyst1234!` with role `Analyst` (template: Create Basic Users)
  - Grant Analyst role AccessPortal + CreateViewsheet (template: Action Permission)
```

**收益**：权限类 Setup Script 由人工逐个编写变为模板组合，大幅降低介入成本。

---

### 优先级3：拖拽操作 Playwright Recipe 库

**解决问题**：Chart Binding DND、Worksheet Join 连线、Freehand Table 字段拖拽

**影响类型**：Chart 数据绑定（~500+ case）、Worksheet（~700 case）、Freehand Table

**实施内容**：在 `specs/browser/_RECIPES.md` 中补充以下 Browser Recipe：

```markdown
## Drag field to chart binding drop zone

**Context:** Chart binding pane is open in the Composer

1. Locate the source field in the data tree (`getByText("{fieldName}")` within `[data-testid="data-tree"]`)
2. Locate the target drop zone (`[data-testid="{dropZoneId}"]`, e.g. `x-field`, `y-field`, `color-field`)
3. Perform drag: `await source.dragTo(target)`
4. **[Wait for binding to update]** (`waitForResponse(/api/vs/binding/)`)
5. **Assert:** Drop zone shows `{fieldName}` (`getByText("{fieldName}")` within the drop zone)
```

```markdown
## Connect two tables in Worksheet (Join)

**Context:** Two tables exist in the Worksheet canvas

1. Hover over source table header until join handle appears (`[data-testid="join-handle"]`)
2. `await joinHandle.dragTo(targetTableHeader)`
3. **[Wait for join dialog]**
4. Select join type from dropdown (`getByLabel("Join Type")`)
5. Select join columns and click OK
```

**实施步骤**：
1. 用 `npx playwright codegen http://localhost:8080/app/composer` 录制一次完整的拖拽过程
2. 提炼为参数化 Recipe（`{fieldName}`、`{dropZoneId}` 作为变量）
3. 写入 `_RECIPES.md`，阶段1 AI 生成规范时直接引用 Recipe 名称而非写 `_REQUIRES_HUMAN_:`

**收益**：Chart、Worksheet、Freehand Table 中大量绑定操作从人工录制变为引用 Recipe，减少约 60% 的拖拽相关 `_REQUIRES_HUMAN_:` 标注。
