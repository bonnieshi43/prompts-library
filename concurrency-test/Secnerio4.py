from locust import HttpUser, TaskSet, task, between
import random
import time
import base64


def encode_string(s: str) -> str:
    b = s.encode("utf-8")
    return base64.b64encode(b).decode("utf-8")


def pick_first(d: dict, keys):
    for k in keys:
        if isinstance(d, dict) and d.get(k) is not None:
            return d.get(k)
    return None


def is_export_done(payload: dict) -> bool:
    status = str(payload.get("status") or payload.get("state") or "").upper()
    if status in {"DONE", "COMPLETED", "FINISHED", "SUCCESS", "SUCCEEDED"}:
        return True
    if payload.get("completed") is True or payload.get("done") is True:
        return True
    if payload.get("success") is True and (payload.get("progress") in (100, "100")):
        return True
    return False


class InetsoftViewsheetExportTasks(TaskSet):
    """
    Scenario 3: Viewsheet 打开 + 导出（同步/异步）混合压测

    - 低/中频：POST   /api/public/viewsheets/open
    - 中频：   GET    /api/public/viewsheets/open/{id}/export/{format}
    - 中频：   GET    /api/public/viewsheets/open/{id}/async-export/{format}
               + GET  /api/public/viewsheets/exports/{exportId}
               + GET  /api/public/viewsheets/exports/{exportId}/content
               + DELETE /api/public/viewsheets/exports/{exportId}  （可选清理导出记录）
    - 低频：   DELETE /api/public/viewsheets/open/{id}              （可选关闭 viewsheet 实例）
    """

    assets = [
        ("1^128^__NULL__^Examples/Census^host-org", 2),
        ("1^128^__NULL__^Examples/Call Center Monitoring^host-org", 3),
        ("1^128^__NULL__^Examples/Construction Dashboard^host-org", 2),
        ("1^128^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^128^__NULL__^Examples/Return Analysis^host-org", 1),
        ("1^128^__NULL__^Examples/Sales Summary^host-org", 1),
    ]

    identifier = None
    asset = None
    exports_since_open = 0

    def _pick_asset(self):
        return random.choices(
            [a[0] for a in self.assets],
            weights=[a[1] for a in self.assets],
            k=1,
        )[0]

    def _open_viewsheet(self) -> bool:
        self.asset = self._pick_asset()
        body = {"asset": self.asset}

        resp = self.client.post(
            "/api/public/viewsheets/open",
            json=body,
            headers=self.user.headers,
        )

        if resp.status_code == 201:
            try:
                self.identifier = resp.json().get("identifier")
                self.exports_since_open = 0
                return self.identifier is not None
            except ValueError:
                self.identifier = None
                return False

        self.identifier = None
        return False

    @task(2)
    def open_viewsheet_low_freq(self):
        """
        低/中频打开 viewsheet：
        - 若没有 identifier，则必须打开一次
        - 若已有，则小概率重新打开，模拟 tab 抖动
        """
        if self.identifier is None or random.random() < 0.05:
            ok = self._open_viewsheet()
            if not ok:
                return

            time.sleep(random.uniform(0.5, 2))

    @task(4)
    def sync_export(self):
        """
        同步导出：GET /export/{format}
        """
        if self.identifier is None:
            ok = self._open_viewsheet()
            if not ok:
                return

        file_types = ["PDF", "EXCEL", "POWERPOINT"]
        fmt = random.choice(file_types)

        resp = self.client.get(
            f"/api/public/viewsheets/open/{self.identifier}/export/{fmt}",
            headers=self.user.headers,
        )

        if resp.status_code != 200:
            # 如果 open 实例已失效，重置，下次再重开
            if resp.status_code in (404, 410):
                self.identifier = None
            return

        self.exports_since_open += 1
        time.sleep(random.uniform(0.5, 2))

    @task(3)
    def async_export_flow(self):
        """
        异步导出全链路：
        1) async-export
        2) poll exports/{id}
        3) exports/{id}/content
        4) 可选 delete exports/{id}
        """
        if self.identifier is None:
            ok = self._open_viewsheet()
            if not ok:
                return

        file_types = ["PDF", "EXCEL", "POWERPOINT"]
        fmt = random.choice(file_types)

        export_id = None

        # 1) 创建异步导出任务
        with self.client.get(
            f"/api/public/viewsheets/open/{self.identifier}/async-export/{fmt}",
            headers=self.user.headers,
            catch_response=True,
        ) as resp:
            if resp.status_code not in (200, 201, 202):
                resp.failure(f"async-export failed: {resp.status_code} {resp.text}")
                return

            try:
                payload = resp.json()
                export_id = pick_first(
                    payload,
                    ["id", "identifier", "exportId", "exportID", "taskId", "taskID"],
                )
            except ValueError:
                export_id = None

            if not export_id:
                export_id = resp.headers.get("x-export-id") or resp.headers.get(
                    "X-Export-Id"
                )

            if not export_id:
                resp.failure("async-export missing export id")
                return

            resp.success()

        time.sleep(random.uniform(0.5, 1.5))

        # 2) 轮询导出状态
        max_polls = 10
        poll_interval_s = random.uniform(0.8, 1.5)
        done = False

        for _ in range(max_polls):
            with self.client.get(
                f"/api/public/viewsheets/exports/{export_id}",
                headers=self.user.headers,
                catch_response=True,
            ) as st:
                if st.status_code != 200:
                    st.failure(f"poll export status failed: {st.status_code} {st.text}")
                    time.sleep(poll_interval_s)
                    continue

                try:
                    payload = st.json()
                except ValueError:
                    payload = {}

                if is_export_done(payload):
                    done = True
                    st.success()
                    break

                st.success()

            time.sleep(poll_interval_s)

        if not done:
            return

        # 3) 下载导出内容
        with self.client.get(
            f"/api/public/viewsheets/exports/{export_id}/content",
            headers=self.user.headers,
            catch_response=True,
        ) as content:
            if content.status_code != 200:
                content.failure(
                    f"download export content failed: {content.status_code} {content.text}"
                )
                return
            content.success()

        self.exports_since_open += 1
        time.sleep(random.uniform(0.5, 2))

        # 4) 可选清理 export 记录（避免堆太多）
        if random.random() < 0.5:
            self.client.delete(
                f"/api/public/viewsheets/exports/{export_id}",
                headers=self.user.headers,
            )

    @task(1)
    def list_open_and_bookmark_light(self):
        """
        轻量补充：
        - 列出 open viewsheets
        - 查询 bookmark（如果有当前 asset）
        """
        self.client.get("/api/public/viewsheets/open", headers=self.user.headers)

        if self.asset:
            bkid = encode_string(self.asset)
            self.client.get(
                f"/api/public/viewsheets/bookmarks/{bkid}",
                headers=self.user.headers,
            )

    @task(1)
    def close_viewsheet_optional(self):
        """
        可选清理：关闭 open viewsheet 实例，避免长时间压测时实例无限堆积

        触发条件：
        - 已有有效 identifier
        - 导出次数达到一定阈值后（例如 >= 10）
        - 再加一层随机概率，避免所有用户同时 close
        """
        if self.identifier is None:
            return

        if self.exports_since_open < 10:
            return

        if random.random() < 0.2:
            self.client.delete(
                f"/api/public/viewsheets/open/{self.identifier}",
                headers=self.user.headers,
            )
            self.identifier = None
            self.asset = None
            self.exports_since_open = 0


class ProductAPIUser(HttpUser):
    tasks = [InetsoftViewsheetExportTasks]
    wait_time = between(1, 5)

    def on_start(self):
        resp = self.client.post(
            "/api/public/login",
            json={"username": "admin", "orgID": "host-org", "password": "admin"},
        )

        if resp.status_code == 200:
            try:
                token = resp.json().get("token")
                self.headers = {"x-inetsoft-api-token": token}
            except ValueError:
                self.headers = {}
        else:
            self.headers = {}


if __name__ == "__main__":
    import os

    os.system("locust -f Secnerio4.py")
