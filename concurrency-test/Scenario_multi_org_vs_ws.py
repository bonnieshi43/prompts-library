from locust import HttpUser, TaskSet, task, between
import random
import time
import base64

REQUEST_TIMEOUT = 30
USER_STAGGER_MAX = 2.0
CLOSE_DELAY_BETWEEN_DELETES = 0.3
TASK_WEIGHT_OPEN = 2
TASK_WEIGHT_GET_DATA = 5
TASK_WEIGHT_BOOKMARK = 1
TASK_WEIGHT_CLOSE = 1


def encode_string(s: str) -> str:
    b = s.encode("utf-8")
    return base64.b64encode(b).decode("utf-8")


class MultiOrgVSAndWSTasks(TaskSet):

    org_assets = {
        "organization0": [
            (
                "1^128^__NULL__^Examples/Census^organization0",
                "1^2^__NULL__^Examples/Census Data^organization0",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Call Center Monitoring^organization0",
                "1^2^__NULL__^Examples/Call Center Monitoring^organization0",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Construction Dashboard^organization0",
                "1^2^__NULL__^Examples/Construction Data^organization0",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Hurricane^organization0",
                "1^2^__NULL__^Examples/Hurricane^organization0",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Return Analysis^organization0",
                "1^2^__NULL__^Examples/Order Details^organization0",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Sales Summary^organization0",
                "1^2^__NULL__^Examples/Sales Revenue^organization0",
                2,
            ),
        ],
        "organization1": [
            (
                "1^128^__NULL__^Examples/Census^organization1",
                "1^2^__NULL__^Examples/Census Data^organization1",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Call Center Monitoring^organization1",
                "1^2^__NULL__^Examples/Call Center Monitoring^organization1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Construction Dashboard^organization1",
                "1^2^__NULL__^Examples/Construction Data^organization1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Hurricane^organization1",
                "1^2^__NULL__^Examples/Hurricane^organization1",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Return Analysis^organization1",
                "1^2^__NULL__^Examples/Order Details^organization1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Sales Summary^organization1",
                "1^2^__NULL__^Examples/Sales Revenue^organization1",
                2,
            ),
        ],
    }

    vs_identifier = None
    ws_identifier = None
    current_vs_asset = None
    current_ws_asset = None

    @task(TASK_WEIGHT_OPEN)
    def open_viewsheet_and_worksheet(self):

        org_id = getattr(self.user, "org_id", None)
        pairs = self.org_assets.get(org_id)
        if not pairs:
            pairs = next(iter(self.org_assets.values()))

        # 按权重随机选择一对 VS + WS
        pair = random.choices(
            pairs,
            weights=[p[2] for p in pairs],
            k=1,
        )[0]

        self.current_vs_asset = pair[0]
        self.current_ws_asset = pair[1]

        # 1. 打开 Viewsheet（带超时，避免长时间占锁）
        vs_body = {"asset": self.current_vs_asset}
        vs_resp = self.client.post(
            "/api/public/viewsheets/open",
            json=vs_body,
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        if vs_resp.status_code == 201:
            try:
                vs_json = vs_resp.json()
                self.vs_identifier = vs_json.get("identifier")
            except ValueError:
                self.vs_identifier = None
        else:
            # 打开失败则直接返回，交给下次循环重试
            return

        time.sleep(random.uniform(0.3, 1.0))

        # 2. 打开 Worksheet（带超时）
        ws_body = {"asset": self.current_ws_asset}
        ws_resp = self.client.post(
            "/api/public/worksheets/open",
            json=ws_body,
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        if ws_resp.status_code == 201:
            try:
                ws_json = ws_resp.json()
                self.ws_identifier = ws_json.get("identifier")
            except ValueError:
                self.ws_identifier = None
        else:
            # worksheet 打不开也不影响其它用户/org，直接返回
            return

        time.sleep(random.uniform(0.5, 1.5))

    @task(TASK_WEIGHT_GET_DATA)
    def get_worksheet_data(self):
        """
        高频：在已打开的 worksheet 上拉取数据
        """
        if not self.ws_identifier:
            # 如果还没打开成功，就先尝试走一遍 open 链路
            self.open_viewsheet_and_worksheet()
            if not self.ws_identifier:
                return

        resp = self.client.get(
            f"/api/public/worksheets/open/{self.ws_identifier}/data",
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        # 如果实例被清理/过期，则重置，下次会重新打开
        if resp.status_code in (404, 410):
            self.ws_identifier = None
            self.vs_identifier = None

        time.sleep(random.uniform(0.2, 0.8))

    @task(TASK_WEIGHT_BOOKMARK)
    def get_viewsheet_bookmark(self):
        """
        轻量：当前 viewsheet 对应的 bookmark 读取
        """
        if not self.current_vs_asset:
            return

        bkid = encode_string(self.current_vs_asset)
        resp = self.client.get(
            f"/api/public/viewsheets/bookmarks/{bkid}",
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        # 如果 bookmark 失败一般不影响主链路，这里只做轻量访问
        if resp.status_code in (404, 410):
            # 资产不存在或 bookmark 关闭，可以忽略
            pass

        time.sleep(random.uniform(0.2, 0.7))

    @task(TASK_WEIGHT_CLOSE)
    def close_optional(self):

        if random.random() > 0.2:
            return

        # 先关 worksheet，间隔后再关 viewsheet（顺序固定，避免多用户锁顺序不一致导致死锁）
        if self.ws_identifier:
            self.client.delete(
                f"/api/public/worksheets/open/{self.ws_identifier}",
                headers=self.user.headers,
                timeout=REQUEST_TIMEOUT,
            )
            self.ws_identifier = None
            time.sleep(CLOSE_DELAY_BETWEEN_DELETES)

        if self.vs_identifier:
            self.client.delete(
                f"/api/public/viewsheets/open/{self.vs_identifier}",
                headers=self.user.headers,
                timeout=REQUEST_TIMEOUT,
            )
            self.vs_identifier = None

        self.current_vs_asset = None
        self.current_ws_asset = None


class MultiOrgUser(HttpUser):
    """
    Multi-org 用户：
    - 每个 Locust 虚拟用户在 on_start 时随机选择一个 org（organization0 / organization1）
    - 用该 org 登录，后续请求都携带对应 token
    """

    tasks = [MultiOrgVSAndWSTasks]
    wait_time = between(1, 5)

    org_accounts = [
        ("organization0", "user0", "success123", 1),
        ("organization1", "user1", "success123", 1),
    ]

    def on_start(self):
        # 错峰启动，避免所有用户同一时刻打满 open 导致服务端锁争用/死锁
        time.sleep(random.uniform(0, USER_STAGGER_MAX))

        org_id, username, password, _ = random.choices(
            self.org_accounts,
            weights=[o[3] for o in self.org_accounts],
            k=1,
        )[0]

        self.org_id = org_id
        self.username = username
        self.password = password

        resp = self.client.post(
            "/api/public/login",
            json={"username": self.username, "orgID": self.org_id, "password": self.password},
        )

        # 调试输出，便于确认登录是否成功、401 是否来自登录失败
        print(f"[LOGIN] org={self.org_id}, user={self.username}, status={resp.status_code}, body={resp.text}")

        if resp.status_code == 200:
            try:
                token = resp.json().get("token")
                self.headers = {"x-inetsoft-api-token": token}
            except ValueError as e:
                print(f"[LOGIN] Failed to parse login JSON for org={self.org_id}: {e}")
                self.headers = {}
        else:
            self.headers = {}


if __name__ == "__main__":
    import os

    os.system("locust -f Scenario5_multi_org_vs_ws.py")

