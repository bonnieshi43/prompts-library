from locust import HttpUser, TaskSet, task, between
import random
import time


class InetsoftWorksheetHotDataTasks(TaskSet):

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
        
        if self.ws_identifier is None or random.random() < 0.05:
            ok = self._open_ws()
            if not ok:
                return

            time.sleep(random.uniform(0.5, 2))

    @task(10)
    def get_ws_data_hot(self):
        """
        High-frequency data pulling:
        - If open is not successful, open first
        - Pull data multiple times consecutively to simulate continuous user
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
            if resp.status_code in (404, 410):
                self.ws_identifier = None
            return

        self.data_reads_since_open += 1

        # After each data fetch, add a very short random pause to better simulate the rhythm of a real user.
        time.sleep(random.uniform(0.1, 0.6))

    @task(1)
    def get_ws_open_status_light(self):
        """
        Lightweight addition: Query open worksheet status (optional)
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
            json={"username": "ci1", "orgID": "host-org", "password": "success123"},
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