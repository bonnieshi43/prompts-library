# 环境准备

## 安装 Python 和 Locust
1. 请确保已安装 Python（建议使用 3.7 及以上版本）。
2. 安装 Locust 性能测试工具。在命令行输入：

   ```bash
   pip install locust
   ```

## 启用 Security和准备环境
- 新建组织 `org-ci1/ci1`，并赋予org admin role
- 新建组织 `org-ci2/ci2`，并同样赋予org admin role
- 新建用户'ci1',并赋予org admin role
- 导入'Import ExamplesNoDB.zip '到host org

---

# 如何执行脚本

如果已使用 pip 安装 Locust，可以直接运行性能测试脚本：

```bash
python -m locust -f Secnario1.py
```

> 说明：将上述命令在终端中执行，将启动 Locust 并加载 `Secnario1.py` 测试场景。



