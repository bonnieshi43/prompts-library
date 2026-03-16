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


class MultiOrgWithSharedAssetsTasks(TaskSet):
    org_assets = {
        "org-ci1": [
            (
                "1^128^__NULL__^Examples/Census^org-ci1",
                "1^2^__NULL__^Examples/Census Data^org-ci1",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Call Center Monitoring^org-ci1",
                "1^2^__NULL__^Examples/Call Center Monitoring^org-ci1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Construction Dashboard^org-ci1",
                "1^2^__NULL__^Examples/Construction Data^org-ci1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Hurricane^org-ci1",
                "1^2^__NULL__^Examples/Hurricane^org-ci1",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Return Analysis^org-ci1",
                "1^2^__NULL__^Examples/Order Details^org-ci1",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Sales Summary^org-ci1",
                "1^2^__NULL__^Examples/Sales Revenue^org-ci1",
                2,
            ),
        ],
        "org-ci2": [
            (
                "1^128^__NULL__^Examples/Census^org-ci2",
                "1^2^__NULL__^Examples/Census Data^org-ci2",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Call Center Monitoring^org-ci2",
                "1^2^__NULL__^Examples/Call Center Monitoring^org-ci2",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Construction Dashboard^org-ci2",
                "1^2^__NULL__^Examples/Construction Data^org-ci2",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Hurricane^org-ci2",
                "1^2^__NULL__^Examples/Hurricane^org-ci2",
                1,
            ),
            (
                "1^128^__NULL__^Examples/Return Analysis^org-ci2",
                "1^2^__NULL__^Examples/Order Details^org-ci2",
                2,
            ),
            (
                "1^128^__NULL__^Examples/Sales Summary^org-ci2",
                "1^2^__NULL__^Examples/Sales Revenue^org-ci2",
                2,
            ),
        ],
    }

    shared_assets = [
        ("1^128^__NULL__^Examples/Sales Summary^host-org", 2),
        ("1^128^__NULL__^Examples/Construction Dashboard^host-org", 2),
        ("1^128^__NULL__^Examples/Census^host-org", 1),
        ("1^128^__NULL__^Examples/Call Center Monitoring^host-org", 2),
        ("1^128^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^128^__NULL__^Examples/Return Analysis^host-org", 2),
        ("1^128^__NULL__^Examples/Projection^host-org", 1),
    ]

    vs_identifier = None
    ws_identifier = None
    current_vs_asset = None
    current_ws_asset = None
    current_asset_source = None  # "org" 或 "shared"

    @task(TASK_WEIGHT_OPEN)
    def open_viewsheet_and_worksheet(self):
        org_id = getattr(self.user, "org_id", None)

        use_shared = random.random() < 0.3

        if use_shared:
            # open shared assets
            self.current_asset_source = "shared"
            pair = random.choices(
                self.shared_assets,
                weights=[p[1] for p in self.shared_assets],
                k=1,
            )[0]
            self.current_vs_asset = pair[0]
            self.current_ws_asset = None
        else:
            # Open asset
            self.current_asset_source = "org"
            pairs = self.org_assets.get(org_id)
            if not pairs:
                pairs = next(iter(self.org_assets.values()))

            pair = random.choices(
                pairs,
                weights=[p[2] for p in pairs],
                k=1,
            )[0]
            self.current_vs_asset = pair[0]
            self.current_ws_asset = pair[1]

        # 1.Open Viewsheet
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
            return

        time.sleep(random.uniform(0.3, 1.0))

        if self.current_asset_source == "org" and self.current_ws_asset:
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
                self.ws_identifier = None

        time.sleep(random.uniform(0.5, 1.5))

    @task(TASK_WEIGHT_GET_DATA)
    def get_worksheet_data(self):
        if not self.ws_identifier:
            self.open_viewsheet_and_worksheet()
            if not self.ws_identifier:
                return

        resp = self.client.get(
            f"/api/public/worksheets/open/{self.ws_identifier}/data",
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        # If the instance is cleaned up/expired, it will be reset and reopened next time.
        if resp.status_code in (404, 410):
            self.ws_identifier = None
            self.vs_identifier = None
            self.current_asset_source = None

        time.sleep(random.uniform(0.2, 0.8))

    @task(TASK_WEIGHT_BOOKMARK)
    def get_viewsheet_bookmark(self):

        if not self.current_vs_asset:
            return

        bkid = encode_string(self.current_vs_asset)
        resp = self.client.get(
            f"/api/public/viewsheets/bookmarks/{bkid}",
            headers=self.user.headers,
            timeout=REQUEST_TIMEOUT,
        )

        if resp.status_code in (404, 410):
            pass

        time.sleep(random.uniform(0.2, 0.7))

    @task(TASK_WEIGHT_CLOSE)
    def close_optional(self):
        if random.random() > 0.2:
            return

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
        self.current_asset_source = None


class MultiOrgWithSharedAssetsUser(HttpUser):

    tasks = [MultiOrgWithSharedAssetsTasks]
    wait_time = between(1, 5)

    org_accounts = [
        ("org-ci1", "ci1", "success123", 1),
        ("org-ci2", "ci2", "success123", 1),
    ]

    def on_start(self):
        # startup to prevent all users from opening simultaneously and causing server-side lock contention/deadlock.
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

        print(
            f"[LOGIN] org={self.org_id}, user={self.username}, status={resp.status_code}"
        )

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

    os.system("locust -f Scenario_multi_org_with_shared_assets.py")