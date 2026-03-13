# 环境准备

## 安装 Python 和 Locust
1. 请确保已安装 Python（建议使用 3.7 及以上版本）。
2. 安装 Locust 性能测试工具。在命令行输入：

   ```bash
   pip install locust
   ```

## 启用 Security和准备环境
- 导入'Import CaseEnv.zip'到host org
- In EM setting properties "security.exposedefaultorgtoall=true"
- 创建org-ci1/ci1(success123),授予ci1（Org Admin）角色。
- 创建org-ci2/ci2(success123),授予ci1（Org Admin）角色。
- 在host-org 创建user ci1,授予Org Admin）角色。

---

# 如何执行脚本

如果已使用 pip 安装 Locust，可以直接运行性能测试脚本：

```bash
python -m locust -f Secnario1.py
```

> 说明：将上述命令在终端中执行，将启动 Locust 并加载 `Secnario1.py` 测试场景。



