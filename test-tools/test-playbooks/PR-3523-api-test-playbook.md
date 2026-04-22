# PR 3523 API 测试手册

## 目标
1.验证 Bug #74659 / PR 3523：在保存调度任务时，服务端必须强制校验 `SCHEDULE_OPTION` 权限。

2.作为以后api测试的参考

本文档记录了如何通过 EM 保存接口复现并验证修复效果：

- `POST /sree/api/em/schedule/task/save`

主要验证点：
- 如果用户被拒绝了某个 `SCHEDULE_OPTION` 子资源，例如 `saveToDisk`、`emailDelivery`、`notificationEmail`、`startTime` 或 `timeRange`，那么当构造一个包含该受限选项的保存请求时，服务端应该拒绝该请求，而不是允许保存。

本文档只举例`saveToDisk` option，其他是一个原理

---

## 测试前置条件

在执行 API 测试前，请确保满足以下条件：

1. 本地服务已启动，地址为 `http://localhost:8080/sree`。
2. 有一个有效的测试用户，例如：
   - 用户名：`june`
   - 密码：`Admin1234!`
3. 测试用户有权限访问调度器，并且至少可以编辑一个调度任务。
4. 在 EM 安全设置中，针对该用户或该用户所属角色，显式拒绝某个目标权限，例如：
   - `SCHEDULE_OPTION -> saveToDisk`
5. 先在 UI 中创建一个已有任务，例如 `Task1`。
   - `save` 接口更适合用于编辑已有任务，不建议把它当作本测试的“新建任务”入口。
6. 在浏览器中打开该任务页面，以便后续直接复制真实 payload 和请求头。

---

## 需要验证什么

### 修复后的预期行为
如果提交的 payload 中包含了用户无权使用的 `SCHEDULE_OPTION`，服务端应当返回错误并拒绝保存。

### 表示 bug 仍然存在的失败特征
- 构造的保存请求返回 `HTTP 200`
- 受限选项最终仍然被保存进任务中

### 表示修复不完整的特征
- 请求返回 `HTTP 200`
- 受限选项虽然没有真正保存进去，但服务端也没有返回错误，而是静默忽略或移除

---

## 第 1 步：获取 API Token

使用登录接口获取 token。

```bash
curl -X POST "http://localhost:8080/sree/api/public/login" -H "Content-Type: application/json" -d "{\"username\":\"june\",\"password\":\"Admin1234!\"}"
```

把返回结果中的 token 保存下来。

后续常见用法：
- Header：`X-Inetsoft-Api-Token: <TOKEN>`

注意：
对 EM 的保存接口来说，单独使用 token 往往还不够。实际测试中，还需要浏览器会话 cookie 和 XSRF 相关请求头，才能避免 `302` 重定向，并真正命中保存逻辑。

---

## 第 2 步：在 UI 中准备权限测试场景

在 Enterprise Manager 中：

1. 进入安全设置。
2. 对测试用户所属角色拒绝一个调度选项权限，例如：
   - `saveToDisk`
3. 使用目标用户登录。
4. 打开 schedule task 界面。
5. 确认被限制的选项在 UI 中确实被隐藏或禁用。

这一步是为了先确认：前端展示层的权限控制已经生效，然后再继续验证服务端保存时是否也做了权限校验。

---

## 第 3 步：创建或选择一个已有任务

先在 UI 中创建一个普通任务，例如 `Task1`。

重要说明：
保存接口依赖 `oldTaskName` 来更新已有任务，因此直接拿已有任务来测试最方便。

实际 payload 中可能会看到如下名字：
- `Task1`
- `june~;~host-org:Task1`，这是带 owner / org 信息的完整任务名

---

## 第 4 步：在浏览器中抓一个真实的保存请求

通过浏览器 DevTools 抓一个合法的保存请求。

### 浏览器操作步骤
1. 打开 EM 中该任务的编辑页面。
2. 打开开发者工具。
3. 切换到 `Network` 标签页。
4. 在 UI 中正常保存一次任务。
5. 找到请求：
   - `/sree/api/em/schedule/task/save`
6.复制它的 Request Payload
7.在这个 payload 基础上，把你被禁止的 option 塞进去（前边的步骤可以先不禁止option，然后这里就可以直接拷贝了，后边在禁止）

这是最可靠的做法，因为请求 JSON 里包含多态字段，字段名和结构必须和后端期望完全一致，手工猜很容易出错。

---

## 第 5 步：复制真实 payload 并保存到本地

把从浏览器复制出来的请求体保存为本地 JSON 文件，例如：

- `C:\Users\Administrator\payload-saveToDisk.json`

建议做法是：
以浏览器里正常请求的 payload 为基础，只修改与受限选项相关的字段，不要整份 JSON 从零手写。

### 示例：用于测试 `saveToDisk` 的 payload 特征
测试 `saveToDisk` 时，通常要关注这些字段：

- `saveToServerEnabled: true`
- `saveFormats`
- `filePaths`
- `serverFilePaths`

测试中使用过的一份示例结构如下：

```json
{
  "taskName": "Task1",
  "oldTaskName": "june~;~host-org:Task1",
  "conditions": [
    {
      "label": "TimeCondition: 01:30:00(中国标准时间), every 1 day(s)",
      "conditionType": "TimeCondition",
      "hour": 1,
      "minute": 30,
      "second": 0,
      "hourEnd": 1,
      "minuteEnd": 30,
      "secondEnd": 0,
      "dayOfMonth": 0,
      "dayOfWeek": -1,
      "weekOfMonth": -1,
      "date": 0,
      "timeZone": "Asia/Shanghai",
      "timeZoneLabel": null,
      "timeZoneOffset": 0,
      "dateEnd": 0,
      "type": 1,
      "interval": 1,
      "hourlyInterval": -1,
      "weekdayOnly": false,
      "monthlyDaySelected": false,
      "daysOfWeek": [],
      "monthsOfYear": [],
      "timeRange": null
    }
  ],
  "actions": [
    {
      "label": "New Action",
      "actionType": "ViewsheetAction",
      "actionClass": "GeneralActionModel",
      "htmlMessage": true,
      "sheet": "1^128^__NULL__^Examples/Call Center Monitoring^host-org",
      "bookmarks": [
        {
          "readOnly": true,
          "name": "(Home)",
          "type": 1,
          "owner": {
            "name": "june",
            "orgID": "host-org",
            "label": "june(host-org)",
            "labelWithCaretDelimiter": "june^host-org"
          },
          "label": "(Home)(june)",
          "defaultBookmark": null,
          "currentBookmark": null,
          "tooltip": ""
        }
      ],
      "saveToServerEnabled": true,
      "saveMatchLayout": true,
      "saveExpandSelections": false,
      "saveOnlyDataComponents": false,
      "saveFormats": ["0"],
      "filePaths": ["aa"],
      "serverFilePaths": [
        {
          "path": "aa",
          "useCredential": false,
          "secretId": "",
          "username": "",
          "password": "",
          "ftp": false,
          "oldFormat": -1
        }
      ]
    }
  ],
  "options": {
    "enabled": true,
    "deleteIfNotScheduledToRun": false,
    "startFrom": 0,
    "stopOn": 0,
    "adminName": null,
    "organizationID": "host-org",
    "securityEnabled": true,
    "selfOrg": false,
    "users": [],
    "groups": [],
    "locale": null,
    "locales": [],
    "owner": "june",
    "description": null,
    "timeZone": null,
    "idName": null,
    "idType": 0,
    "idAlias": null,
    "ownerAlias": "june"
  }
}
```

---

## 第 6 步：从浏览器抓完整请求头

重要：
对于这个接口，只有尽量模拟真实浏览器请求时，测试才更稳定。

在本次测试中，除了 API token 外，通常还需要这些 header：

- `X-Requested-With: XMLHttpRequest`
- `X-XSRF-Token: <value>`
- `Cookie: SESSION=<...>; XSRF-TOKEN=<...>`
- `Origin: http://localhost:8080`
- `Referer: http://localhost:8080/sree/em/settings/schedule/tasks/...`
- `X-Inetsoft-Api-Token: <TOKEN>`

示例格式：

```bash
-H "X-Requested-With: XMLHttpRequest" \
-H "X-XSRF-Token: <XSRF_TOKEN>" \
-H "Cookie: SESSION=<SESSION_ID>; XSRF-TOKEN=<XSRF_TOKEN>" \
-H "Origin: http://localhost:8080" \
-H "Referer: http://localhost:8080/sree/em/settings/schedule/tasks/..." \
-H "X-Inetsoft-Api-Token: <TOKEN>"
```

如果缺少这些 header，请求可能会返回 `302`，表示并没有真正进入保存逻辑。

---

## 第 7 步：发送构造后的保存请求

使用从浏览器复制下来的 header，再加上本地保存的 payload 文件，发送 crafted save request。(直接截图扔给AI)

### 示例命令

```bash
curl.exe -i -X POST "http://localhost:8080/sree/api/em/schedule/task/save" -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -H "X-XSRF-Token: <XSRF_TOKEN>" -H "Cookie: SESSION=<SESSION_ID>; XSRF-TOKEN=<XSRF_TOKEN>" -H "Origin: http://localhost:8080" -H "Referer: http://localhost:8080/sree/em/settings/schedule/tasks/june~~_3b~~~host-org:Task1?path=%2F" -H "X-Inetsoft-Api-Token: <TOKEN>" --data-binary "@C:\Users\Administrator\payload-saveToDisk.json"
```

### 成功请求特征

```text
HTTP/1.1 200
X-Frame-Options: SAMEORIGIN
Content-Type: application/json
Transfer-Encoding: chunked
Date: Wed, 22 Apr 2026 06:00:20 GMT
```

如果用户已经被拒绝 `saveToDisk`，而该请求仍返回 `200`，这已经是一个很强的信号，说明服务端可能仍在接受受限选项。

---

## 第 8 步：再次读取任务，确认是否真的被保存

不要只看状态码，一定要把任务重新读出来，确认受限选项是否真的持久化了。

### 示例命令

```bash
curl.exe "http://localhost:8080/sree/api/em/schedule/edit?taskName=june~;~host-org%3ATask1" -H "X-Requested-With: XMLHttpRequest" -H "X-XSRF-Token: <XSRF_TOKEN>" -H "Cookie: SESSION=<SESSION_ID>; XSRF-TOKEN=<XSRF_TOKEN>" -H "X-Inetsoft-Api-Token: <TOKEN>"
```

### 对 `saveToDisk` 场景，重点检查这些字段

- `saveToServerEnabled`
- `saveFormats`
- `filePaths`
- `serverFilePaths`

如果这些字段在保存后仍然存在，说明 bug 仍可复现。

---

## 可选：只快速查看 HTTP 状态码

如果只想快速确认状态码，可以使用：

```bash
curl.exe -s -o NUL -w "HTTP %{http_code}\n" -X POST "http://localhost:8080/sree/api/em/schedule/task/save" -H "Content-Type: application/json" -H "X-Requested-With: XMLHttpRequest" -H "X-XSRF-Token: <XSRF_TOKEN>" -H "Cookie: SESSION=<SESSION_ID>; XSRF-TOKEN=<XSRF_TOKEN>" -H "Origin: http://localhost:8080" -H "Referer: http://localhost:8080/sree/em/settings/schedule/tasks/june~~_3b~~~host-org:Task1?path=%2F" -H "X-Inetsoft-Api-Token: <TOKEN>" --data-binary "@C:\Users\Administrator\payload-saveToDisk.json"
```

---

## 常见问题与说明

### 1. 返回 `HTTP 302`
通常表示请求没有复用真实浏览器登录上下文。
常见原因：
- 缺少 session cookie
- 缺少 XSRF 相关请求头
- 仅有 token 不足以访问该 EM 接口

### 2. 没看到响应体，无法判断是否成功
使用 `-i` 或 `-w "HTTP %{http_code}\n"` 查看实际状态码。

### 3. save 接口是编辑，不是创建
`/api/em/schedule/task/save` 更适合针对已有任务测试，因为 payload 依赖 `oldTaskName`。

### 4. 关于 payload 的最佳实践
尽量不要从零手写整份 JSON。
正确方式是：
- 先在浏览器里抓一份正常请求
- 再只修改与受限选项相关的字段

---

## 建议测试矩阵

用同样的方法重复测试以下受限子资源：

1. `saveToDisk`
   - payload 中包含 `saveToServerEnabled`、`saveFormats`、`serverFilePaths`
2. `emailDelivery`
   - payload 中包含收件人、主题、正文、格式等邮件发送字段
3. `notificationEmail`
   - payload 中包含通知邮件相关字段
4. `startTime`
   - payload 中提交 `TimeCondition.AT`
5. `timeRange`
   - payload 中提交 `timeRange`

每一项都建议记录：
- 被拒绝的权限
- crafted payload 中涉及的字段
- save API 返回状态码
- 返回体内容
- 读回任务后的实际状态
- 最终结论（pass/fail）

---

## 结果判定标准

### Fail：bug 仍然存在
- payload 中包含受限选项
- save 请求返回 `200`
- 重新读取任务后，受限选项仍然存在

### Partial / Incomplete Fix：修复不完整
- payload 中包含受限选项
- save 请求返回 `200`
- 受限选项没有持久化，但服务端也没有返回错误

### Pass：修复通过
- payload 中包含受限选项
- 服务端明确拒绝请求并返回错误
- 重新读取任务后，受限选项没有被保存

### 实际测试结果

请求返回 HTTP 200,但是受限选项并没有真正保存进去，服务端也没有返回错误，而是静默忽略或移除
我觉得也可以接受，看美国最后bug是否feedback

---
