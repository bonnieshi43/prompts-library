from locust import HttpUser, TaskSet, task, between
import random
import time


class InetsoftWorksheetHotDataTasks(TaskSet):
    """
    Scenario 2: 已打开 worksheet 的高频 data 读取压测

    - 低频：POST /api/public/worksheets/open
    - 高频：GET  /api/public/worksheets/open/{id}/data
    - 可选：DELETE /api/public/worksheets/open/{id}（避免 open 实例无限累积）
    """

    worksheets = [
        ("1^2^__NULL__^Examples/Call Center Monitoring^host-org", 2),
        ("1^2^__NULL__^Examples/Census Data", 1),
        ("1^2^__NULL__^Examples/Construction Data", 2),
        ("1^2^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^2^__NULL__^Examples/Order Details^host-org", 3),
        ("1^2^__NULL__^Examples/Sales Revenue^host-org", 1),
    ]

    ws_identifier = None
    asset = None
    data_reads_since_open = 0

    def _pick_asset(self):
        return random.choices(
            [ws[0] for ws in self.worksheets],
            weights=[ws[1] for ws in self.worksheets],
            k=1,
        )[0]

    def _open_ws(self) -> bool:
        self.asset = self._pick_asset()
        body = {"asset": self.asset}

        resp = self.client.post("/api/public/worksheets/open", json=body, headers=self.user.headers)

        if resp.status_code == 201:
            try:
                self.ws_identifier = resp.json().get("identifier")
                self.data_reads_since_open = 0
                return self.ws_identifier is not None
            except ValueError:
                self.ws_identifier = None
                return False

        self.ws_identifier = None
        return False

    @task(1)
    def open_ws_low_freq(self):
        """
        低频 open：
        - 如果还没有 ws_identifier，就 open 一次
        - 如果已经有了，则随机小概率重新 open，制造“打开抖动”
        """
        if self.ws_identifier is None or random.random() < 0.05:
            ok = self._open_ws()
            if not ok:
                return

            time.sleep(random.uniform(0.5, 2))

    @task(10)
    def get_ws_data_hot(self):
        """
        高频 data 拉取：
        - 如果没 open 成功，先 open
        - 连续多次拉取 data，模拟用户不断刷新/翻页/交互
        """
        if self.ws_identifier is None:
            ok = self._open_ws()
            if not ok:
                return

        resp = self.client.get(
            f"/api/public/worksheets/open/{self.ws_identifier}/data",
            headers=self.user.headers,
        )

        if resp.status_code != 200:
            # 如果 open 实例已过期/被清理，重开一次
            if resp.status_code in (404, 410):
                self.ws_identifier = None
            # 其它错误保留现场（便于观察错误比率）
            return

        self.data_reads_since_open += 1

        # 每次 data 拉取后做一个很短的随机停顿，更贴近真实用户节奏
        time.sleep(random.uniform(0.1, 0.6))

    @task(1)
    def get_ws_open_status_light(self):
        """
        轻量补充：查询 open worksheet 状态（可选）
        """
        if self.ws_identifier is None:
            return

        resp = self.client.get(
            f"/api/public/worksheets/open/{self.ws_identifier}",
            headers=self.user.headers,
        )

        if resp.status_code != 200 and resp.status_code in (404, 410):
            self.ws_identifier = None

    @task(1)
    def close_ws_optional(self):
        """
        可选清理：避免 open 实例无限堆积
        - 只在已经读取了一定次数 data 后，随机小概率触发 close
        """
        if self.ws_identifier is None:
            return

        if self.data_reads_since_open < 20:
            return

        if random.random() < 0.15:
            self.client.delete(
                f"/api/public/worksheets/open/{self.ws_identifier}",
                headers=self.user.headers,
            )
            self.ws_identifier = None
            self.asset = None
            self.data_reads_since_open = 0


class ProductAPIUser(HttpUser):
    tasks = [InetsoftWorksheetHotDataTasks]
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

    os.system("locust -f Scenario3.py")