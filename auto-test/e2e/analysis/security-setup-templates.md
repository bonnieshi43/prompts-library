# 优先级2：Groovy DSL 权限配置标准模板

## 目标

为权限与安全类 E2E 测试提供可复用的 Setup Script 模板，覆盖：
- 组织（Organization）创建与管理
- 用户（User）创建与管理
- 角色（Role）创建与管理
- 组（Group）创建与管理
- Action 权限授予（如 AccessPortal、CreateViewsheet）
- Resource 权限授予（如特定 Viewsheet、数据源、文件夹）

---

## 需要做的事情

### 1. 了解现有 DSL 入口

Setup Script 通过以下结构调用安全 API：

```groovy
inetsoft {
   connect {
      path "http://localhost:8080"
      username "admin"
      password "Admin1234!"

      connect {
         security {
            // 在这里调用 SecurityClientService 的方法
         }
      }
   }
}
```

`SecurityClientService` 已有完整的 CRUD 方法：
- `setSecurityEnabled(boolean)`
- `createUser(SecurityUser)` / `updateUser` / `deleteUser`
- `createGroup(SecurityGroup)` / `updateGroup` / `deleteGroup`
- `createRole(SecurityRole)` / `updateRole` / `deleteRole`
- `createOrganization(SecurityOrganization, copyFromOrgID)` / `updateOrganization` / `deleteOrganization`
- `setPermission(ResourcePermission)` / `createGrant` / `updateGrant` / `deleteGrant`

DSL builder 已在 `Security.groovy` 中定义（`securityUser {}`、`securityGroup {}`、`securityRole {}`、`securityOrganization {}`、`resourcePermission {}`、`permissionGrant {}`）。

---

### 2. 需要编写的模板文件

在 `e2e/specs/browser/` 下新建 `_SECURITY_TEMPLATES.md`，收录以下常用片段：

| 模板名称 | 内容 |
|---------|------|
| Enable Security | 启用 security，设置 admin 密码 |
| Create User | 创建用户，指定密码、角色、所属组 |
| Create Group | 创建组，指定成员用户、父组、角色 |
| Create Role | 创建角色，指定继承角色 |
| Create Organization | 创建组织，指定成员、管理员身份 |
| Grant Action Permission | 给角色/用户授予 Action 权限（AccessPortal 等） |
| Grant Resource Permission | 给角色/用户授予特定资源权限（READ/WRITE/DELETE） |
| Multi-user Session | 创建两个不同权限的用户供多 browser context 测试 |
| VPM Scope User | 创建带有 VPM scope 绑定的受限用户 |
| Org Admin User | 在指定组织内创建 Org Admin 用户 |

---

### 3. 需要确认的信息

在编写模板前，需要确认以下内容：

**Action 权限类型枚举**：系统支持哪些 Action 名称（如 `AccessPortal`、`CreateViewsheet`、`AccessEM` 等），需要查阅 `ResourceType` 或相关常量定义。

**Resource 路径格式**：不同资源类型的路径格式，例如：
- Viewsheet：`/viewsheet/global/FolderName/VSName`
- 数据源：`/datasource/DataSourceName`
- 文件夹：`/folder/FolderName`

**多租户 orgID 规则**：创建组织内用户时 `orgID` 字段的填写规则，以及 site admin 和 org admin 的区别。

---

### 4. 需要验证的 DSL 覆盖范围

根据 `Security.groovy` 现有 builder，以下字段已支持：

| 实体 | 已支持字段 |
|------|-----------|
| User | name, orgID, alias, locale, theme, active, emails, groups, roles, password, adminIdentities |
| Group | name, orgID, theme, parentGroups, memberUsers, memberGroups, roles, adminIdentities |
| Role | name, orgID, description, theme, assignedUsers, assignedGroups, inheritedRoles, adminIdentities |
| Organization | name, id, locale, theme, memberUsers, memberGroups, roles, adminIdentities, defaultPassword |
| ResourcePermission | resource, resourceType, grants |
| PermissionGrant | identityID, type (ROLE/GROUP/USER), actions |

**需要确认**：`AdminIdentities`（管理员身份）的 `users/groups/roles/organizations` 字段在哪些场景下需要填写。

---

### 5. 输出物

| 文件 | 说明 |
|------|------|
| `e2e/specs/browser/_SECURITY_TEMPLATES.md` | 模板库，供 AI 生成规范时引用 |
| `e2e/tests/resources/security-base-setup.groovy` | 可选：最小化通用 setup（启用 security + 创建 admin），供其他脚本 include |
