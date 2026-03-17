
doc_type: feature-test-doc
product: StyleBI
module: Composer / Properties / Script Pane
feature_id: 72691
feature: Feature #72691 Script editor opens to bottom of script
pr_link: https://github.com/inetsoft-technology/stylebi/pull/2294
Assignee: Franky Pan 
last_updated: 2026-03-10
version: 14.0
---

# 1 Feature Summary

该 Feature 解决「组件脚本较长需要滚动时，关闭并重新打开 Properties → Script tab，脚本编辑器默认停在脚本底部」的问题。  
新增能力：通过系统属性 `script.cursor.top` 控制脚本面板打开/重开时的默认定位策略：
- `true`：打开时将光标定位到脚本顶部（line=0, ch=0），期望用户看到脚本开头。
- `false`（defaults.properties 默认）：保既有行为（打开时光标置底）。

> 注：PR 可见信息显示主要通过 `setCursor` 控制光标位置；是否稳定带动“视口滚动到顶部”需通过测试验证。

# 2 Test Focus

只列 **必须测试的路径**（与本次 PR 改动直接相关）

## P0 - Core Path

1. `script.cursor.top=true` 时：长脚本 + 按需求复现路径“关闭并重新打开 Properties → Script tab”后，编辑器应展示脚本顶部（首行可见），且无回跳。
2. `script.cursor.top=true` 时：**首次进入 Script tab（缓存未命中/刷新页面后）**也必须置顶（防止异步配置读取时序导致首次仍置底）。

## P1 - Functional Path

1. `script.cursor.top=false`（默认）时：长脚本重开仍稳定置底，且无 setCursor 越界/报错（回归保护）。
2. 边界脚本内容在 `true/false` 两种配置下都不应异常：
   - 空脚本
   - 单行脚本
   - 末尾带换行（最后一行为空行）
3. 后端配置读取接口异常时的可用性与降级：
   - `/api/composer/viewsheet/script-cursor-top` 返回 401/403/500 或网络失败时，Script pane 仍可打开可编辑，行为可预测（通常回落默认策略），且不阻塞渲染。

## P2 - Extended Path

1. 兼容性：至少覆盖 Chrome / Edge 下的置顶行为一致性（焦点与滚动不抖动、不跳动）。
2. 轻量性能关注：打开 Script tab 时额外发起一次配置读取请求（首次/缓存未命中）；验证不会导致明显打开延迟或重复请求风暴（同页面多次打开/多个脚本窗格）。

---

# 3 Test Scenarios

| ID | Scenario | Steps | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| TC72691-1 | 配置开启：重开脚本面板应置顶（核心验收） | 1) 设置 `script.cursor.top=true` 2) 在组件 Script 中创建 200+ 行脚本并滚动到底部/中部 3) 关闭 Properties（或按产品定义的“reopen”方式）4) 再次打开 Properties → Script tab | 首行可见；视口在顶部附近；光标在 (0,0) 或首行区域；无“先到顶再跳到底”闪动 |  | 重点观察 scroll 是否真的回到顶部（不仅是 cursor） |
| TC72691-2 | 配置开启：首次进入（缓存未命中）也必须置顶 | 1) `script.cursor.top=true` 2) 刷新浏览器/新会话 3) 直接打开 Properties → Script tab（确保第一次触发配置读取） | 第一次进入即在顶部；不需要第二次打开才生效 |  | 覆盖“异步 subscribe 太晚导致仍按默认 false 置底”的风险 |
| TC72691-3 | 默认/关闭配置：置底行为回归稳定 | 1) `script.cursor.top=false` 或不配置 2) 创建长脚本 3) 关��并重开 Script tab | 最后几行可见；光标在最后可编辑位置；控制台无异常（尤其是 setCursor 行号/列号越界） |  | 注意 CodeMirror 行号 0-based，避免 off-by-one |
| TC72691-4 | 边界：空脚本（true/false） | 1) 分别在 `script.cursor.top=true` 与 `false` 下 2) Script 内容为空 3) 重开 Script tab | 不报错；`true` 时光标在起始；`false` 时也不应越界导致异常 |  | 验证 setCursor 的健壮性 |
| TC72691-5 | 边界：单行脚本（true/false） | 1) 分别在 `true/false` 下 2) 输入单行脚本 3) 重开 Script tab | `true`：光标在行首；`false`：光标在行尾；视口稳定 |  | 覆盖 last line length 计算差异 |
| TC72691-6 | 边界：末尾换行导致最后一行为空行（true/false） | 1) 脚本内容以换行结尾（例如 `print(1)\n`）2) 重开 Script tab | 不报错；`false` 置底时光标落在最后可编辑位置（允许在空行，但不能越界） |  | 容易触发“最后一行长度=0”的边界 |
| TC72691-7 | 接口失败：配置读取 401/403/500 的降级 | 1) 通过代理/Mock/权限账号使 `GET /api/composer/viewsheet/script-cursor-top` 失败 2) 打开 Properties → Script tab | Script pane 可用且可编辑；无页面崩溃/阻塞；行为降级可预测（通常回落默认） |  | 关注控制台错误是否影响用户操作、是否需要产品侧静默处理 |
| TC72691-8 | 兼容性：Chrome/Edge 置顶一致性 | 1) 在 Chrome、Edge 分别执行 TC72691-1 与 TC72691-2 | 两浏览器均首行可见、无抖动/跳动 |  | 若支持 Firefox/Safari，可扩展覆盖 |
| TC72691-9 | 多次打开/多脚本窗格：请求与行为稳定 | 1) 同页面连续多次打开/关闭 Script tab（或多个组件脚本）2) 观察网络请求与定位结果 | 行为稳定；不出现重复请求风暴；打开无明显延迟增长 |  | 覆盖前端 service 缓存与多实例交互 |

---

# 4 Special Testing

## Compatibility

- Chrome / Edge：验证“置顶”是否同时带动视口滚动到顶部、焦点行为是否导致跳动。
- 若产品支持更多浏览器（Firefox/Safari），建议至少补测一次核心场景 TC72691-1。

## 文档/API

- 配置项说明：`script.cursor.top` 的默认值、作用范围（仅 Composer viewsheet script pane？还是所有脚本编辑器？）、生效方式（是否需重启）需在发布说明或配置文档中可检索。
- API 行为：`GET /api/composer/viewsheet/script-cursor-top` 在未登录/权限不足时的返回码与前端降级策略应一致。

---

# 5 Regression Impact（回归影响）

可能受影响模块：

- Composer（Properties / Script Tab / Script Pane）
- UI 编辑器通用能力（若 ScriptPane 组件被复用到其他脚本入口）
- 系统配置与部署（defaults.properties 新增 key；环境覆盖配置策略）

---

# 6 Bug List

| Bug ID | Description | Status |
| --- | --- | --- |
| Bug #74071 | <stateless-sessions-Feature #72691> When changing script.cursor.top, the server needs to be restarted for the change to take effect. | Closed |
| Bug #74075 | <stateless-sessions-Feature #72691> When script.cursor.top is set on an organization, copying the organization and restarting the server causes the property to be lost in the copied organization. | Closed |
| Bug #74077 | <stateless-sessions-Feature #72691> When script.cursor.top is set to true, it is not applied to the script in the Dashboard Options dialog. | Resolved |
| Bug #74081 | <stateless-sessions-Feature #72691> When switching tabs, the cursor does not appear in the Script tab. | Resolved |
| Bug #74084 | <stateless-sessions-Feature #72691>when set script.cursor.top is true,it haven't applied on formula editor dialog in worksheet |Resolved |
