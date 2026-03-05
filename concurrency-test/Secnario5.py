from locust import HttpUser, TaskSet, task, between
import random
import time


class InetsoftOpenCloseChurnTasks(TaskSet):
    """
    Scenario 4: 会话/实例抖动（Open/Close Churn）压测

    Viewsheet:
    - POST   /api/public/viewsheets/open
    - GET    /api/public/viewsheets/open
    - DELETE /api/public/viewsheets/open/{id}

    Worksheet:
    - POST   /api/public/worksheets/open
    - GET    /api/public/worksheets/open
    - DELETE /api/public/worksheets/open/{id}
    """

    # 每个用户最多持有多少个 open 实例（避免堆积）
    max_open_viewsheets = 3
    max_open_worksheets = 3

    viewsheets = [
        ("1^128^__NULL__^Examples/Census^host-org", 2),
        ("1^128^__NULL__^Examples/Call Center Monitoring^host-org", 3),
        ("1^128^__NULL__^Examples/Construction Dashboard^host-org", 2),
        ("1^128^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^128^__NULL__^Examples/Return Analysis^host-org", 1),
        ("1^128^__NULL__^Examples/Sales Summary^host-org", 1),
    ]

    worksheets = [
        ("1^2^__NULL__^Examples/Call Center Monitoring^host-org", 2),
        ("1^2^__NULL__^Examples/Census Data", 1),
        ("1^2^__NULL__^Examples/Construction Data", 2),
        ("1^2^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^2^__NULL__^Examples/Order Details^host-org", 3),
        ("1^2^__NULL__^Examples/Sales Revenue^host-org", 1),
    ]

    open_vs_ids = None
    open_ws_ids = None

    def on_start(self):
        self.open_vs_ids = []
        self.open_ws_ids = []

    def _pick_weighted(self, items):
        return random.choices(
            [i[0] for i in items],
            weights=[i[1] for i in items],
            k=1,
        )[0]

    def _open_viewsheet(self):
        asset = self._pick_weighted(self.viewsheets)
        resp = self.client.post(
            "/api/public/viewsheets/open",
            json={"asset": asset},
            headers=self.user.headers,
        )
        if resp.status_code == 201:
            try:
                identifier = resp.json().get("identifier")
            except ValueError:
                identifier = None
            if identifier:
                self.open_vs_ids.append(identifier)
                # 控制列表长度
                if len(self.open_vs_ids) > self.max_open_viewsheets:
                    self.open_vs_ids.pop(0)
        return resp.status_code

    def _close_viewsheet(self):
        if not self.open_vs_ids:
            return None
        identifier = random.choice(self.open_vs_ids)
        resp = self.client.delete(
            f"/api/public/viewsheets/open/{identifier}",
            headers=self.user.headers,
        )
        # 无论成功与否都从本地移除，避免一直卡住同一个 id
        try:
            self.open_vs_ids.remove(identifier)
        except ValueError:
            pass
        return resp.status_code

    def _open_worksheet(self):
        asset = self._pick_weighted(self.worksheets)
        resp = self.client.post(
            "/api/public/worksheets/open",
            json={"asset": asset},
            headers=self.user.headers,
        )
        if resp.status_code == 201:
            try:
                identifier = resp.json().get("identifier")
            except ValueError:
                identifier = None
            if identifier:
                self.open_ws_ids.append(identifier)
                if len(self.open_ws_ids) > self.max_open_worksheets:
                    self.open_ws_ids.pop(0)
        return resp.status_code

    def _close_worksheet(self):
        if not self.open_ws_ids:
            return None
        identifier = random.choice(self.open_ws_ids)
        resp = self.client.delete(
            f"/api/public/worksheets/open/{identifier}",
            headers=self.user.headers,
        )
        try:
            self.open_ws_ids.remove(identifier)
        except ValueError:
            pass
        return resp.status_code

    @task(3)
    def open_churn(self):
        """
        以“开”为主的 churn：当持有的 open 实例不足上限时补齐；
        当达到上限时，先关一个再开一个，保持抖动。
        """
        # Viewsheet churn
        if len(self.open_vs_ids) >= self.max_open_viewsheets:
            self._close_viewsheet()
            time.sleep(random.uniform(0.1, 0.4))
        self._open_viewsheet()

        time.sleep(random.uniform(0.2, 0.8))

        # Worksheet churn
        if len(self.open_ws_ids) >= self.max_open_worksheets:
            self._close_worksheet()
            time.sleep(random.uniform(0.1, 0.4))
        self._open_worksheet()

        time.sleep(random.uniform(0.2, 0.8))

    @task(2)
    def list_open_refresh(self):
        """
        模拟用户刷新/恢复 tab：频繁 list open
        """
        self.client.get("/api/public/viewsheets/open", headers=self.user.headers)
        time.sleep(random.uniform(0.1, 0.5))
        self.client.get("/api/public/worksheets/open", headers=self.user.headers)
        time.sleep(random.uniform(0.1, 0.6))

    @task(3)
    def close_churn(self):
        """
        以“关”为主的 churn：随机关闭若干已打开实例
        """
        if self.open_vs_ids and random.random() < 0.8:
            self._close_viewsheet()
        time.sleep(random.uniform(0.1, 0.6))

        if self.open_ws_ids and random.random() < 0.8:
            self._close_worksheet()
        time.sleep(random.uniform(0.1, 0.8))


class ProductAPIUser(HttpUser):
    tasks = [InetsoftOpenCloseChurnTasks]
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

    os.system("locust -f Secnario5.py")
