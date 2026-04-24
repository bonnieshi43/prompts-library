# Presentation 功能测试点（完整版）

> 模块版本：14.0  
> 最后更新：2026-04-23  
> 测试范围：EM > Settings > Presentation 下所有功能，及多租户组织隔离行为

---

## 1. General Format（日期时间格式）

### 测试点 GF-001：组织级日期格式覆盖 Global 设置
- **功能描述**：验证 Organization 级别的日期/时间格式能正确覆盖 Global 设置，并影响所有相关界面。
- **作用域**：Host-Org ✅ / Other Org ✅（两者属性一致）
- **优先级**：P0
- **关联配置**：`format.date`, `format.time`, `format.date.time`  
  组织存储格式：`inetsoft.org.<orgId>.format.date` 等
- **前置条件**：
  - 启用 Multi-Tenancy
  - Global 设置：`format.date = yyyy-MM-dd`
  - 组织 A 设置：`format.date = MM/dd/yyyy`
- **测试步骤**：
  1. 登录组织 A 的 EM/Portal
  2. 检查 **Setting > Content** 中的日期显示
  3. 检查 **Repository** 中报表/工作表的 “Create By” / “Modified By” 列
  4. 检查 **Schedule** 中 “Next Run Starting” / “Task Condition Time”
  5. 检查 **Viewsheet** 中日期类型列的值
  6. 检查 **Worksheet** 中日期类型列的显示及输入（输入匹配格式的日期应成功，不匹配应报错）
  7. 检查 **Import&Export** 界面的最后修改时间
  8. 检查 **Audit** 相关时间字段（注意 Bug #65842：time range slider 不应用，可标记为第三方组件问题）
- **预期结果**：所有检查点的时间均显示为 `MM/dd/yyyy` 格式，Global 设置不影响组织 A。
- **特殊性/注意事项**：
  - 时间格式若以 `a` 结尾（12小时制），Schedule 任务条件输入需使用 AM/PM
- **关联测试**：可结合 Schedule 模块测试时间格式对任务条件的影响

### 测试点 GF-002：时间格式影响 Schedule 12/24小时制
- **功能描述**：验证时间格式字符串是否包含 `a` 会影响 Schedule 任务条件输入时钟制式。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：`format.time`, `schedule.time.12hours`（间接）
- **前置条件**：设置 `format.time = h:mm a`（12小时制）
- **测试步骤**：
  1. 进入 Schedule > 新建任务 > 设置时间条件
  2. 输入类似 `02:30 PM` 的时间
  3. 保存并查看任务的下次运行时间
  4. 改 `format.time = HH:mm`（24小时制），重复步骤 1-3
- **预期结果**：12小时制下可以输入带 AM/PM 的时间，24小时制下只能输入 00-23 小时。
- **特殊性**：若 `format.time` 不以 `a` 结尾，则系统强制使用 24 小时制输入。
- **关联测试**：可结合组织级日期格式覆盖（General Format）及 Schedule 时间设置一起测试

---

## 2. Export Menu（导出菜单选项）

### 测试点 EXP-001：导出选项配置对 Viewsheet 工具栏的影响
- **功能描述**：控制 Viewsheet 工具栏中导出按钮的下拉菜单项（Excel, PDF, PNG, CSV, PowerPoint, HTML, Snapshot 等）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P0
- **关联配置**：`vsexport.menu.options`（全局），组织级为 `inetsoft.org.<orgId>.vsexport.menu.options`
- **前置条件**：登录相应组织的 EM
- **测试步骤**：
  1. EM > Settings > Presentation > Export Menu，勾选部分选项（例如只保留 Excel, PDF）
  2. 点击 Apply
  3. 打开任意 Viewsheet，点击工具栏的“导出”按钮，查看下拉菜单
  4. 在 Email 对话框（通过邮件发送）和 Schedule 任务中检查导出格式选项
  5. 将 Snapshot 设为 false，验证 Email/Schedule 中不显示 Snapshot 选项（应如此）
  6. 将所有选项设为 false，点击 Apply，观察 Viewsheet 工具栏是否隐藏整个导出按钮（实际应为所有选项重新勾选上？Excel 备注：Set all option as false 后 all option will be check on —— 可能是个特殊规则）
- **预期结果**：
  - 勾选的格式出现在导出菜单中，未勾选的不出现
  - Snapshot 只在 Viewsheet 导出对话框出现，不在 Email/Schedule 中出现
  - 全部取消时，系统自动全选（业务规则）
- **特殊性/注意事项**：
  - Bug #65417：组织级存储格式前缀 `inetsoft.org.` 需正确
  - Snapshot 选项在 Email/Schedule 中强制隐藏（与配置无关）
- **关联测试**：无

---

## 3. Look & Feel（外观）

### 测试点 LF-001：Logo 上传与应用
- **功能描述**：自定义 Portal 左上角的 Logo 图片。
- **作用域**：Host-Org ✅ / Other Org ✅（需开启属性 `portal.customLogo.enabled=true`）
- **优先级**：P1
- **关联配置**：`portal.customLogo.enabled`；文件存储于 `portal/logo.jpg` 等
- **前置条件**：在 `defaults.properties` 或 EM 中添加 `portal.customLogo.enabled=true`
- **测试步骤**：
  1. EM > Settings > Presentation > Look & Feel > Logo
  2. 选择 “Custom”，上传 `.png`, `.jpg`, `.bmp`, `.gif` 文件
  3. 点击 Apply，刷新 Portal 页面，观察左上角
  4. 上传 `.svg` 或非图片文件
- **预期结果**：
  - 支持的格式显示新 Logo
  - `.svg` 不支持，显示原 Logo 或无变化
  - 非图片文件可以选择，但 Apply 后不会生效（界面无变化）
- **特殊性/注意事项**：
  - 重启 EM 后，上传的文件会被重命名为 `logo.jpg` 存储在 `portal/` 目录下
  - 需在不同浏览器验证（Chrome, Edge, Firefox, IE）
- **关联测试**：可结合 Favicon 上传功能一起测试，同属 Portal 品牌化配置

### 测试点 LF-002：Favicon 上传与应用
- **功能描述**：自定义浏览器标签页图标（favicon）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：无独立属性，文件存储于 `portal/favicon.ico` 或类似
- **测试步骤**：
  1. EM > Settings > Presentation > Look & Feel > Favicon
  2. 选择 Custom，上传 `.png`, `.jpg`, `.bmp` 文件（不支持 `.svg`, `.gif`）
  3. 点击 Apply，刷新 Portal 页面，查看浏览器标签页图标
  4. 上传非图片文件
- **预期结果**：
  - 标签页图标更新为上传图片
  - 不支持格式无变化
  - 非图片文件不生效
- **特殊性/注意事项**：
  - 必须测试 Chrome, Edge, Firefox, IE 等浏览器（兼容性差异）
  - 文件最终存储为 `portal/favicon.jpg` 等
- **关联测试**：可结合 Logo 上传功能一起测试，同属 Portal 品牌化配置

### 测试点 LF-003：Sort Repository Tree（升序/降序）
- **功能描述**：控制 Repository 树状目录的排序方式。
- **作用域**：Host-Org ✅ / Other Org ❌（仅 Host-Org 支持）
- **优先级**：P2
- **关联配置**：可能存储于 `repository.sort.order`
- **前置条件**：登录 Host-Org 的 EM
- **测试步骤**：
  1. EM > Settings > Presentation > Look & Feel > Sort Repository Tree
  2. 选择 Ascending，点击 Apply
  3. 打开 Portal > Repository，观察文件夹/报表的排序（A→Z）
  4. 切换为 Descending，刷新页面，验证顺序（Z→A）
- **预期结果**：排序顺序按选择正确变化。
- **特殊性**：其他组织不显示此选项。
- **关联测试**：无

### 测试点 LF-004：Default Dashboard CSS
- **功能描述**：为所有 Viewsheet 设置全局自定义 CSS 样式。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：文件存储于 `portal/format.css`
- **测试步骤**：
  1. 准备一个 `.css` 文件（如改变报表背景色）
  2. EM > Settings > Presentation > Look & Feel > Default Dashboard CSS
  3. 选择 Custom，上传该 CSS 文件
  4. 点击 Apply，打开任意 Viewsheet，查看样式是否应用
  5. 上传非 `.css` 文件
- **预期结果**：所有 Viewsheet 应用自定义样式；非 CSS 文件不生效。
- **特殊性**：重启后文件重命名为 `format.css` 存储。
- **关联测试**：无

### 测试点 LF-005：Default Font（自定义字体）
- **功能描述**：为整个产品（包括 Studio、Composer、Portal）设置默认字体，支持 TTF/EOT/WOFF 等格式，并支持字体粗细（font-weight）、样式（font-style）。
- **作用域**：Host-Org ✅ / Other Org ❌
- **优先级**：P1
- **关联配置**：字体文件上传，无独立属性
- **前置条件**：准备好 `.ttf` 字体文件
- **测试步骤**：
  1. EM > Settings > Presentation > Look & Feel > Fonts
  2. 选择 Custom，输入 Font Face Identifier（例如 "MyCustomFont"）
  3. 上传 TTF 文件（必须指定 TTF，否则 OK 按钮不可用）
  4. 设置 Font Weight（如 bold）和 Font Style（italic/oblique）
  5. 点击 Apply，刷新整个应用（可能需要清除浏览器缓存）
  6. 检查 Adhoc、Composer、Studio 中的字体是否变为自定义字体
  7. 编辑字体，更换文件，验证通知提示：“User fonts were updated, need clear browser cache to load the new latest fonts!”
- **预期结果**：产品所有文本使用自定义字体，粗细/斜体生效；更新后提示清除缓存。
- **特殊性/注意事项**：
  - Bug #56961 可作为参考
  - Feature #56765 在 v13.6 增加了字体样式控制
- **关联测试**：可结合 Custom Shapes 文件上传功能一起测试，两者都涉及文件资源的上传与存储

### 测试点 LF-006：Custom Shapes（上传与组织隔离规则）
- **功能描述**：允许组织或个人上传自定义图片作为图表中的形状（shape），并支持按组织隔离存储和加载。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：无独立属性，通过文件系统存储（`portal/shapes` 和 `portal/<orgId>/shapes`）
- **前置条件**：登录 Site Admin 或 Organization Admin
- **测试步骤**：
  1. **Global 上传**：以 Site Admin 登录，EM > Look & Feel > Add Shapes，上传 shapes（支持单个文件、多文件、文件夹），存储于 `portal/shapes`
  2. **组织上传**：以 Organization Admin 登录，上传 shapes，存储于 `portal/<orgId>/shapes`
  3. **优先级验证**：组织 A 同时拥有 global 和自己的 shapes 时，图表 shape 选择器中只显示组织的 shapes（不显示 global 的）
  4. **回退机制**：删除组织 A 的 `shapes` 文件夹后，图表 shape 选择器应显示 global shapes
  5. **删除功能**：在 EM 端 Custom Shapes 对话框中，支持删除组织自己的 shapes（global shapes 不可删除）
- **预期结果**：
  - 上传成功，文件存储路径正确
  - 组织 shape 优先，无组织 shape 时回退到 global
  - 删除操作仅影响本组织，不影响其他组织或 global
- **特殊性/注意事项**：
  - Reset to Default 操作会清空所有 shapes（包括 global 和组织），但此问题已知且标记 ignore（Bug #66149）
  - 删除 shape 功能是 StyleBI 新加（em 端支持 delete shape）
  - Feature #64800 引入
- **关联测试**：可结合 Default Font 文件上传功能一起测试，两者都涉及文件资源的上传与存储。Reset to Default 行为存在已知问题（Bug #66149）

### 测试点 LF-007：User Format（自定义数字格式）
- **功能描述**：允许用户上传 XML 定义的自定义数字格式（如 halfK, halfM, halfB）。
- **作用域**：Host-Org ✅ / Other Org ❌
- **优先级**：P2
- **关联配置**：上传 `userformat.xml` 文件
- **前置条件**：准备一个符合 schema 的 XML 文件
- **测试步骤**：
  1. EM > Settings > Presentation > Look & Feel > User Format
  2. 点击 Add user format，上传 XML 文件
  3. 重启服务器（Excel 中说明需要重启）
  4. 在报表或 Viewsheet 中，对数值字段应用自定义格式（如 suffix="halfK"）
- **预期结果**：数值显示为自定义格式（如 3000 显示为 3 halfK）。
- **特殊性/注意事项**：
  - 上传的文件会覆盖同名内容（XML 名称决定）
  - 使用客户不多，一般由 Site Admin 统一管理
- **关联测试**：无

---

## 4. Welcome Page（欢迎页）

### 测试点 WP-001：None 模式（默认）
- **功能描述**：设置 Portal 登录后默认显示的欢迎页面为默认报表列表页。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **前置条件**：EM > Settings > Presentation > Welcome Page
- **测试步骤**：
  1. 选择 "None"，点击 Apply
  2. 访问 `http://ip:port/sree/app/portal/tab/report`
- **预期结果**：加载默认的报表/仪表板列表页，无自定义内容。
- **特殊性**：无

### 测试点 WP-002：URI 模式
- **功能描述**：通过外部 URL 或内部相对路径设置欢迎页。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P0
- **前置条件**：同上
- **测试步骤**：
  1. 选择 "URI"，输入 `http://www.baidu.com`，点击 Apply
  2. 访问 Portal 首页，观察是否跳转到百度
  3. 输入相对路径 `/sree/app/viewer/view/1%5E128%5E__NULL__%5EExamples/Census`
  4. 输入空值或无效 URI（如 `null`）
- **预期结果**：
  - 外部 URL 正常加载
  - 内部路径加载指定的 Viewsheet
  - 空值时提示警告：`Please specify a valid URI for the welcome page.`
- **特殊性**：内部 URI 需确保资源存在且有权限。
- **关联测试**：无

### 测试点 WP-003：Resource 模式
- **功能描述**：使用 classpath 中的静态 HTML 文件作为欢迎页。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P2
- **前置条件**：将 `WelcomePage.html` 放入应用 classpath（如 `sree/WEB-INF/classes`）
- **测试步骤**：
  1. 选择 "Resource"，输入 `/WelcomePage.html`
  2. 点击 Apply，访问 Portal 首页
  3. 输入不存在的资源路径（如 `/notexist.html`）
- **预期结果**：
  - 正常加载 HTML 内容
  - 资源不存在时提示：`Please specify a valid resource for welcome page.`
- **特殊性**：HTML 中的相对路径需注意基准。
- **关联测试**：无

---

## 5. Login Banner（登录页底部横幅）

### 测试点 LB-001：文本模式横幅
- **功能描述**：在登录页面底部显示自定义文本（支持多行、特殊字符）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **前置条件**：启用 Security，进入 EM > Settings > Presentation > Login Banner
- **测试步骤**：
  1. 选择 Text，输入单行文本 `test123中文@#$%^&*(`
  2. 点击 Apply，登出系统，查看登录页底部
  3. 输入多行文本（如 `1,a\n2b\n3C`），查看显示是否保留换行
  4. 输入空或 null，查看底部是否为空
- **预期结果**：
  - 单行文本正确显示
  - 多行文本保留换行格式
  - 空值时底部无内容（或默认无）
- **特殊性**：仅影响 Portal 登录页，不影响已登录界面。
- **关联测试**：可结合 HTML 模式横幅功能一起测试，两者都是配置登录页底部横幅的不同方式

### 测试点 LB-002：HTML 模式横幅
- **功能描述**：允许使用 HTML 代码自定义登录页底部内容。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **前置条件**：同上
- **测试步骤**：
  1. 选择 HTML，输入 `<img src='https://www.baidu.com/img/bd_logo1.png' alt="test">`
  2. 输入 `<font size=6 color=ff0000><b>red bold</b></font><br>`
  3. 输入 `<a href="http://www.baidu.com" target=_blank>link</a><br>`
  4. 点击 Apply，登出，查看登录页底部渲染效果
- **预期结果**：HTML 被浏览器正确解析（图片、红色粗体文字、超链接）。
- **特殊性**：需防范 XSS，但本功能为管理端配置，风险可控。
- **关联测试**：可结合文本模式横幅功能一起测试，两者都是配置登录页底部横幅的不同方式

---

## 6. Portal Integration（门户集成）

### 测试点 PI-001：Portal Tools 可见性控制
- **功能描述**：控制 Portal 顶部工具栏中的 Help、Home、Preferences、Logout、Search 等图标是否显示。
- **作用域**：Host-Org ✅ / Other Org ❌（其他组织不支持 Portal Tools 配置）
- **优先级**：P1
- **关联配置**：属性可能为 `portal.tools.help` 等
- **前置条件**：登录 Host-Org 的 EM
- **测试步骤**：
  1. EM > Settings > Presentation > Portal Integration > Portal Tools
  2. 将 Help 设为 False，其他保留 True
  3. 点击 Apply，刷新 Portal 页面，观察右上角图标
  4. 依次将 Home、Preferences、Logout、Search 设为 False，观察变化
  5. 将 Search 设为 False，验证 Repository 中的搜索框消失
- **预期结果**：对应的图标/功能被隐藏。
- **特殊性**：Search 依赖于归档配置；Preferences/Logout 通过点击账号头像出现。
- **关联测试**：可结合 Portal Tabs 管理功能一起测试，两者都属于 Portal 集成配置

### 测试点 PI-002：Portal Tabs 管理（增删改查及排序）
- **功能描述**：允许添加自定义标签页（Tab），并管理其可见性、顺序、编辑、删除。
- **作用域**：Host-Org ✅ / Other Org ❌
- **优先级**：P1
- **前置条件**：登录 Host-Org 的 EM
- **测试步骤**：
  1. 点击 Add Tab，输入 Tab 名称和 URL（如 `https://www.example.com`），OK 可用，点击 Apply
  2. 在 Portal 页面顶部看到新增的 Tab，点击可跳转
  3. 对自定义 Tab 进行移动（up/down）、编辑、删除、可见/不可见操作
  4. 验证默认 Tab（Dashboard, Repository）只支持 move up/down，不支持编辑/删除
  5. 验证第一个自定义 Tab 不能 up，最后一个不能 down，中间可上下
- **预期结果**：所有操作符合 UI 规则，Portal 侧 Tab 顺序、可见性同步更新。
- **特殊性**：Bug #27879 可能影响 Tab 显示（已修复）。
- **关联测试**：可结合 Portal Tools 可见性功能一起测试，两者都属于 Portal 集成配置

### 测试点 PI-003：Custom Loading Text & Home Link
- **功能描述**：自定义 Portal 加载时的提示文字，以及点击 Home 图标时的跳转链接。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P2
- **前置条件**：登录相应组织的 EM
- **测试步骤**：
  1. Custom Loading Text：输入 `Please wait, the application is loading`，点击 Apply，刷新 Portal，观察加载时的提示
  2. Home Link：输入 `https://www.google.com`，点击 Apply，在 Portal 中点击 Home 图标，验证跳转
- **预期结果**：加载文字和 Home 链接按配置生效。
- **特殊性**：Feature #65018 引入。
- **关联测试**：无

---

## 7. Time Settings（时间设置）

### 测试点 TS-001：Week Start Day（周起始日）
- **功能描述**：设置日历、图表、交叉表等组件的每周起始日（影响周汇总等）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P2
- **关联配置**：`week.start.day`（可能）
- **前置条件**：登录 EM > Presentation > Time Settings
- **测试步骤**：
  1. 将 Week Start Day 设置为 Monday
  2. 打开一个包含日期组件的仪表板，按周分组，查看周一是否作为第一天
  3. 切换为 Sunday，再次验证
- **预期结果**：周分组依据设置的正确起始日。
- **特殊性**：若未设置，则根据用户 locale 决定。
- **关联测试**：无

### 测试点 TS-002：Schedule Time 12 Hours
- **功能描述**：决定 Schedule 任务条件输入时间是否使用 12 小时制（AM/PM）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：`schedule.time.12hours`（默认 false）
- **前置条件**：同上
- **测试步骤**：
  1. 勾选 Schedule Time 12 Hours（设为 true），点击 Apply
  2. 进入 Schedule > 新建任务，设置时间条件，观察输入框是否允许 AM/PM
  3. 取消勾选，再次检查
- **预期结果**：勾选时支持 12 小时制，否则 24 小时制。
- **关联测试**：可结合 General Format 中时间格式对 Schedule 的影响一起测试

---

## 8. Dashboard Toolbar（仪表板工具栏按钮可见性）

### 测试点 DT-001：单个/多个按钮可见性控制
- **功能描述**：控制 Viewsheet 工具栏上各个按钮（Back, Previous, Next, Edit, Refresh, Email, Social Sharing, Schedule, Export, Import, Print, Zoom, Full Screen, Close, Bookmark）的显示/隐藏。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P0
- **关联配置**：每个按钮对应一个属性，如 `viewsheet.toolbar.back.visible`；若全部 false 则属性 `Viewsheet Toolbar Hidden=true`
- **前置条件**：登录 EM > Presentation > Dashboard Toolbar
- **测试步骤**：
  1. 将某个按钮（如 Email）设为 False，点击 Apply
  2. 打开任意 Viewsheet，检查工具栏是否缺少该按钮
  3. 将多个按钮设为 False，验证
  4. 将所有按钮设为 False，点击 Apply，查看整个工具栏是否隐藏
  5. 将 Back 设为 False，打开一个通过链接跳转的 Viewsheet，验证 Back 按钮不出现
- **预期结果**：按钮按配置显示/隐藏；全部隐藏时工具栏整体消失。
- **特殊性**：Issue #27924 要求 Zoom in/out 也可被控制（v12.3+）。
- **关联测试**：可结合 Dashboard Settings 中的 Drill Tabs Top 功能一起测试（下钻仪表板的布局受工具栏显隐影响），也可结合 Social Sharing 功能测试（社交分享按钮属于工具栏的一部分）

---

## 9. Dashboard Settings（仪表板全局设置）

### 测试点 DS-001：Enable Dashboard
- **功能描述**：控制 Portal 左侧导航栏中“仪表板”菜单是否可用。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **前置条件**：EM > Presentation > Dashboard Settings
- **测试步骤**：
  1. 将 Enable Dashboard 设为 False，点击 Apply
  2. 刷新 Portal，查看左侧导航栏是否还有 Dashboard 图标
  3. 设为 True，恢复显示
- **预期结果**：False 时 Dashboard 菜单隐藏，不可访问。
- **关联测试**：无

### 测试点 DS-002：Dashboard Tabs Top
- **功能描述**：控制普通仪表板（非下钻）的选项卡位置（顶部或底部）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：`dashboard.tabs.top`（默认 true）
- **前置条件**：同上
- **测试步骤**：
  1. 保持 Dashboard Tabs Top = True，打开一个带多个选项卡的仪表板，观察选项卡在顶部
  2. 改为 False，刷新，选项卡移至底部
- **预期结果**：选项卡位置按配置变化。
- **关联测试**：可结合 Drill Tabs Top 功能一起测试，两者都是控制选项卡位置

### 测试点 DS-003：Drill Tabs Top（Feature #72761）
- **功能描述**：控制下钻仪表板（drill dashboard）的选项卡位置（顶部或底部）。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P0
- **关联配置**：`dashboard.tabs.top`（注意与 DS-002 共用同一属性？Excel 中明确区分了两个选项，实际可能共用 `dashboard.tabs.top`，但 UI 上分开）
- **前置条件**：同上，勾选 “Drill Tabs Top”
- **测试步骤**：
  1. 勾选 Drill Tabs Top = True，点击 Apply
  2. 打开一个包含下钻链接的仪表板，点击下钻，观察新开的仪表板选项卡位置（应在顶部）
  3. 切换不同选项卡，检查内容区是否被遮挡
  4. 隐藏工具栏（通过权限或脚本），再次下钻，检查顶部偏移量正确
  5. 多层下钻（A→B→C），所有选项卡均在顶部，切换/关闭正常
  6. 在 Composer 中预览，选项卡位置应与运行时一致
  7. 导出 PDF/Excel，内容不应包含选项卡控件
  8. 在 iframe 中嵌入仪表板，滚动高度计算正确
  9. 移动端触摸滑动选项卡正常
- **预期结果**：所有场景下选项卡位置按配置生效，无布局异常。
- **特殊性/注意事项**：
  - 若工具栏隐藏，顶部偏移仅等于选项卡高度（无工具栏高度）
  - 不支持脚本动态修改 `drillTabsTop`
- **关联测试**：可结合 Dashboard Tabs Top 功能一起测试（两者都是控制选项卡位置），也可结合 Dashboard Toolbar 功能测试（工具栏显隐会影响下钻仪表板的顶部布局偏移量计算）

---

## 10. PDF Settings（PDF 生成设置）

### 测试点 PDF-001：压缩选项（Compress Text / Compress Image / ASCII Only）
- **功能描述**：控制生成的 PDF 文件是否压缩文本/图像，以及是否使用 ASCII 编码。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **前置条件**：EM > Presentation > PDF Settings
- **测试步骤**：
  1. 保持所有压缩选项为默认（Text true, Image true, ASCII false），导出包含大量文本和图表的报表为 PDF，记录文件大小
  2. 将 Compress Text 设为 false，其他不变，再次导出同样报表，对比文件大小（应更大）
  3. 将 Compress Image 设为 false，对比文件大小
  4. 将 ASCII Only 设为 true，导出 PDF，对比文件大小（应更大，且内容可能变成纯 ASCII）
- **预期结果**：压缩选项影响 PDF 文件大小；ASCII Only 影响字符编码。
- **特殊性**：需在 Save as PDF、Email、Schedule、Export 等所有产生 PDF 的场景验证。
- **关联测试**：无

### 测试点 PDF-002：字体选项（Map Symbols, Embed CMap/Font, CID/AFM Path）
- **功能描述**：控制 PDF 中符号映射、字体嵌入及 CID/AFM 字体路径，影响非拉丁字符显示。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：`pdf.map.symbols`, `pdf.embed.cmap`, `pdf.embed.font`, `pdf.cidfont.path`, `pdf.afmfont.path`
- **前置条件**：准备一个包含日文/中文的仪表板
- **测试步骤**：
  1. 设置 Embed CMap = false, Embed Font = false, CID Font Path 指向系统字体目录（如 `c:/windows/fonts`）
  2. 导出 PDF，在 Firefox 中打开查看日文字符是否正常显示（Chrome 可能乱码）
  3. 添加自定义 CID 字体（如 KozMinProVI-Regular）和 TrueType 字体映射，再次导出，检查显示
  4. 将 Embed CMap 和 Embed Font 设为 true，导出 PDF，检查在 Chrome 中是否显示正常
- **预期结果**：字体映射正确时，非拉丁字符在 PDF 中可读；嵌入后跨平台显示一致。
- **特殊性/注意事项**：
  - Bug #72081：CIDFont 路径下 Cmap 必须与 CIDFont 同层
  - Linux 区分大小写，路径名必须精确
- **关联测试**：可结合 Font Mapping 字体映射功能一起测试

### 测试点 PDF-003：其他选项（Open Bookmark/Thumbnail, Embed PDF, Keep Hyperlinks）
- **功能描述**：控制 PDF 打开时左侧面板显示书签/缩略图，是否在浏览器中内嵌显示，以及超链接是否保留。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P2
- **前置条件**：同上
- **测试步骤**：
  1. 选择 Open Bookmark First，导出 PDF，打开时左侧应显示书签面板
  2. 选择 Open Thumbnail First，左侧显示缩略图
  3. 选择 None，仅显示 PDF 内容
  4. 设置 Embed PDF in Browser = true，在浏览器中打开导出的 PDF（应内嵌显示）
  5. 设为 false，点击 PDF 链接应下载文件
  6. Keep Hyperlinks in PDF = true，PDF 中的超链接可点击；false 时无链接
- **预期结果**：各选项按描述生效。
- **特殊性**：需测试不同浏览器（Chrom, Edge, Firefox, IE）对 Embed PDF 的支持。
- **关联测试**：无

---

## 11. Font Mapping（字体映射）

### 测试点 FM-001：添加/编辑/删除 TrueType 和 CID 字体映射
- **功能描述**：允许将系统字体或 CID 字体映射到报表中使用的逻辑字体，用于 PDF 导出和打印。
- **作用域**：Host-Org ✅ / Other Org ❌
- **优先级**：P1
- **前置条件**：EM > Presentation > Font Mapping
- **测试步骤**：
  1. 点击 Add，选择 True Type Font，输入字体名称（如 `Monospaced`），点击 OK
  2. 添加 CID Font，输入名称（如 `KozMinProVI-Regular`）
  3. 在列表中选中一个字体，点击 Edit，修改映射，Apply
  4. 选中多个字体，点击 Delete，确认删除
  5. 测试递归扫描：指定一个包含子文件夹的父文件夹路径（如 `/usr/share/fonts`），应能递归找到所有 `.ttf`
- **预期结果**：字体映射增删改查正常；递归扫描在 Linux/Windows 均有效。
- **特殊性/注意事项**：
  - Feature #39523 增加递归扫描
  - 映射后需结合 PDF 导出验证
- **关联测试**：可结合 PDF Settings 中的字体选项（PDF-002）一起测试

---

## 12. Data Source Type Visibility（数据源类型可见性）

### 测试点 DST-001：通过 visible/hidden 属性控制数据源类型列表
- **功能描述**：控制在 Portal 中创建数据源时，哪些数据源类型（JDBC, Oracle, MongoDB 等）可见。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P1
- **关联配置**：`visible.datasource.types`, `hidden.datasource.types`
- **前置条件**：EM > Presentation > Data Source Type Visibility
- **测试步骤**：
  1. 设置 `visible.datasource.types=JDBC,Oracle`（仅显示 JDBC 和 Oracle）
  2. 点击 Apply，进入 Portal > 创建数据源，查看类型列表
  3. 设置 `hidden.datasource.types=MongoDB,Elasticsearch`（隐藏这两种）
  4. 若同时出现在 visible 和 hidden 中，则 hidden 优先（不显示）
  5. 若不设置或为空，则显示所有已安装插件的数据源类型
- **预期结果**：数据源类型列表按配置过滤。
- **特殊性/注意事项**：
  - 该配置不影响 Studio（Bug #44104）
  - 若插件未安装，即使配置了 visible 也不会显示
- **关联测试**：无

---

## 13. Social Sharing（社交分享）

### 测试点 SS-001：社交分享按钮显示与配置
- **功能描述**：控制 Viewsheet 工具栏中的社交分享按钮（如分享到 Facebook, Twitter 等）的可用性。
- **作用域**：Host-Org ✅ / Other Org ✅
- **优先级**：P2
- **关联配置**：可能与 `social.sharing.enabled` 相关
- **前置条件**：EM > Presentation > Social Sharing
- **测试步骤**：
  1. 默认情况下，检查 Viewsheet 工具栏是否有社交分享按钮
  2. 在 EM 中关闭 Social Sharing，Apply，刷新 Viewsheet，验证按钮消失
  3. 开启后，点击分享按钮，检查弹窗中是否包含预期的社交平台
- **预期结果**：按钮按配置显示/隐藏，点击后分享功能正常。
- **特殊性**：Excel 中未给出详细步骤，按常规理解。
- **关联测试**：可结合 Dashboard Toolbar 功能一起测试（社交分享按钮属于工具栏