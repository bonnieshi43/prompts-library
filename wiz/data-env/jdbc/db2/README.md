# DB2 WIZ 测试库启动说明

该目录用于通过 Docker 启动一个本地 DB2 测试库，并自动初始化表结构和 CSV 数据。


## 启动数据库

在当前目录执行：

```bash
docker compose up -d
```

DB2 首次启动会比较慢，等待容器健康检查通过后即可连接使用。

## 连接信息

- Host: `localhost`
- Port: `50000`
- Database: `ANNTEST`
- User: `db2inst1`
- Password: `test123456`
- Schema: `DB2INST1`

## 常用命令

查看容器状态：

```bash
docker ps --filter name=db2-annotation-test
```

查看启动日志：

```bash
docker logs db2-annotation-test --tail 200
```

进入容器：

```bash
docker exec -it db2-annotation-test bash
```

在容器内连接数据库：

```bash
su - db2inst1
db2 connect to ANNTEST
```

停止数据库：

```bash
docker compose down
```

停止并清空数据库数据卷：

```bash
docker compose down -v
```


## 目录说明

- `docker-compose.yml`: DB2 容器配置
- `init-db.sh`: 容器初始化脚本
- `init.sql`: 建表和基础初始化 SQL
- `load_data.sql`: 导入 CSV 数据
- `data/`: 初始化用 CSV 文件
