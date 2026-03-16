from locust import HttpUser, TaskSet, task, between
import random
import time
import base64


def encodeString(strs):
    byte = strs.encode('utf-8')
    bkid = base64.b64encode(byte)
    return bkid.decode('utf-8')


class InetsoftVSAndWSTasks(TaskSet):
    vs_ws_pairs = [
        ("1^128^__NULL__^Examples/Census^host-org",
         "1^2^__NULL__^Examples/Census Data", 1),

        ("1^128^__NULL__^Examples/Call Center Monitoring^host-org",
         "1^2^__NULL__^Examples/Call Center Monitoring^host-org", 2),

        ("1^128^__NULL__^Examples/Construction Dashboard^host-org",
         "1^2^__NULL__^Examples/Construction Data", 2),

        ("1^128^__NULL__^Examples/Hurricane^host-org",
         "1^2^__NULL__^Examples/Hurricane^host-org", 1),

        ("1^128^__NULL__^Examples/Return Analysis^host-org",
         "1^2^__NULL__^Examples/Order Details^host-org", 2),

        ("1^128^__NULL__^Examples/Sales Summary^host-org",
         "1^2^__NULL__^Examples/Sales Revenue^host-org", 2),
    ]

    vs_identifier = None
    ws_identifier = None
    current_vs_asset = None
    current_ws_asset = None

    @task(3)
    def open_viewsheet_and_worksheet(self):
        """
        Open a viewsheet, then open the corresponding worksheet.
        """
        pair = random.choices(
            self.vs_ws_pairs,
            weights=[p[2] for p in self.vs_ws_pairs],
            k=1
        )[0]

        self.current_vs_asset = pair[0]
        self.current_ws_asset = pair[1]

        # 1. Open Viewsheet
        vs_body = {"asset": self.current_vs_asset}
        vs_resp = self.client.post(
            "/api/public/viewsheets/open",
            json=vs_body,
            headers=self.user.headers
        )

        print(f"[VS] Open viewsheet asset={self.current_vs_asset}, status={vs_resp.status_code}")

        if vs_resp.status_code == 201:
            try:
                vs_json = vs_resp.json()
                self.vs_identifier = vs_json.get("identifier")
            except ValueError as e:
                print(f"[VS] Failed to parse JSON: {e}")
        else:
            print(f"[VS] Failed to open viewsheet: {vs_resp.text}")

        time.sleep(random.uniform(0.5, 2))

        # 2. Open Worksheet
        ws_body = {"asset": self.current_ws_asset}
        ws_resp = self.client.post(
            "/api/public/worksheets/open",
            json=ws_body,
            headers=self.user.headers
        )

        print(f"[WS] Open worksheet asset={self.current_ws_asset}, status={ws_resp.status_code}")

        if ws_resp.status_code == 201:
            try:
                ws_json = ws_resp.json()
                self.ws_identifier = ws_json.get("identifier")
            except ValueError as e:
                print(f"[WS] Failed to parse JSON: {e}")
        else:
            print(f"[WS] Failed to open worksheet: {ws_resp.text}")

        time.sleep(random.uniform(1, 3))

    @task(2)
    def get_worksheet_data(self):
        """
        After the worksheet is opened, continuously pull data.
        """
        if not self.ws_identifier:
            # If the worksheet hasn't been successfully opened yet, do not pull data for now.
            print("[WS] ws_identifier is None. Skip get_worksheet_data.")
            return

        resp = self.client.get(
            f"/api/public/worksheets/open/{self.ws_identifier}/data",
            headers=self.user.headers
        )

        # print(f"[WS] Get data asset={self.current_ws_asset}, status={resp.status_code}")
        if resp.status_code != 200:
            print(f"[WS] Failed to get data: {resp.status_code}, {resp.text}")

        time.sleep(random.uniform(0.5, 2))

    @task(1)
    def get_viewsheet_bookmark(self):
        """
        Optional scenario: Get bookmarks based on the current viewsheet asset
        """
        if not self.current_vs_asset:
            print("[VS] current_vs_asset is None. Skip get_viewsheet_bookmark.")
            return

        bkid = encodeString(self.current_vs_asset)
        resp = self.client.get(
            f"/api/public/viewsheets/bookmarks/{bkid}",
            headers=self.user.headers
        )

        if resp.status_code != 200:
            print(f"[VS] Failed to get bookmarks: {resp.status_code}, {resp.text}")

        time.sleep(random.uniform(0.5, 2))


class ProductAPIUser(HttpUser):
    tasks = [InetsoftVSAndWSTasks]
    wait_time = between(1, 5)

    def on_start(self):

        resp = self.client.post(
            "/api/public/login",
            json={"username": "ci1", "orgID": "host-org", "password": "success123"}
        )

        if resp.status_code == 200:
            try:
                token = resp.json().get("token")
                print(f"Login success, token={token}")
                self.headers = {"x-inetsoft-api-token": token}
            except ValueError as e:
                print(f"Failed to decode JSON response: {e}")
        else:
            print(f"Failed to login: {resp.status_code}, {resp.text}")


if __name__ == "__main__":
    import os
    os.system("locust -f Secnario2.py")