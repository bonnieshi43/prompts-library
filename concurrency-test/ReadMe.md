# 环境准备

## 安装 Python 和 Locust
1. 请确保已安装 Python（建议使用 3.7 及以上版本）。
2. 安装 Locust 性能测试工具。在命令行输入：

   ```bash
   pip install locust
   ```

## 启用 Security和准备环境

导入 'Import CaseEnv.zip' 到 host org

根据执行场景创建相应用户：

- 执行 Scenario1.py - Scenario5.py 时：需要在 host-org 创建 user ci1，并授予 Org Admin role

- 执行 multi_org 相关的 py case 时：

- 创建 org-ci1（clone host-org）/ ci1（success123），授予 ci1（Org Admin）role

- 创建 org-ci2（clone host-org）/ ci2（success123），授予 ci2（Org Admin）role

- 执行 Scenario_multi_org_with_shared_assets.py case 时：需要在 EM properties 

  中配置"security.exposedefaultorgtoall=true"



---

# 如何执行脚本

如果已使用 pip 安装 Locust，可以直接运行性能测试脚本：

```bash
python -m locust -f Secnario1.py
```

> 说明：将上述命令在终端中执行，将启动 Locust 并加载 `Secnario1.py` 测试场景。



