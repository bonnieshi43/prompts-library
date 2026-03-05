from locust import HttpUser, TaskSet, task, between
import random
import time
import base64

def encodeString(strs):
    byte = strs.encode('utf-8')
    bkid = base64.b64encode(byte)

    return bkid.decode('utf-8')

class InetsoftDashboardTasks(TaskSet):
    assets = [
        ("1^128^__NULL__^Examples/Census^host-org", 2),
        ("1^128^__NULL__^Examples/Call Center Monitoring^host-org", 3),
        ("1^128^__NULL__^Examples/Construction Dashboard^host-org", 2),
        ("1^128^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^128^__NULL__^Examples/Return Analysis^host-org", 1),
        ("1^128^__NULL__^Examples/Sales Summary^host-org", 1)
        # 你可以添加更多的 asset 值及其权重
    ]
    identifier = None  # 初始化 identifier

    @task(3)
    def openDashboards(self):
        self.asset = random.choices([asset[0] for asset in self.assets], weights=[asset[1] for asset in self.assets], k=1)[0]
        vs = {"asset": self.asset}

        # print(self.user.headers)
        response = self.client.post("/api/public/viewsheets/open", json=vs, headers=self.user.headers)

        time.sleep(random.uniform(1, 5))  # 随机等待 1 到 5 秒钟

        print(f"Opened viewsheet with asset: {self.asset}, status code: {response.status_code}")

        if response.status_code == 201:
            response_dict = response.json()
            self.identifier = response_dict.get("identifier")
        else:
            print(f"Failed to open viewsheet: {response.text}")

    @task(1)
    def exportDashboard(self):
        if self.identifier is None:
            print("Identifier is not set. Skipping exportDashboard task.")
            return

        file_types = ["PDF", "EXCEL", "POWERPOINT"]
        selected_file_type = random.choice(file_types)

        response = self.client.get(f"/api/public/viewsheets/open/{self.identifier}/export/{selected_file_type}", headers=self.user.headers)

        print(f"Export viewsheet with asset: {self.asset}, status code: {response.status_code}")
        if response.status_code != 200:
            print(f"Failed to export viewsheet: {response.text}")

    @task(1)
    def getDashboardBK(self):
        if self.identifier is None:
            print("Identifier is not set. Skipping getDashboardBK task.")
            return

        bkid = encodeString(self.asset)

        response = self.client.get(f"/api/public/viewsheets/bookmarks/{bkid}", headers=self.user.headers)

        # print(f"Get viewhsheet bookmarks with asset: {self.asset}, status code: {response.status_code}")

        if response.status_code != 200:
            print(f"Failed to get viewsheet bookmarks: {response.text}")


class InetsoftWSTasks(TaskSet):
    worksheets = [
        ("1^2^__NULL__^Examples/Call Center Monitoring^host-org", 2),
        ("1^2^__NULL__^Examples/Census Data", 1),
        ("1^2^__NULL__^Examples/Construction Data", 2),
        ("1^2^__NULL__^Examples/Hurricane^host-org", 1),
        ("1^2^__NULL__^Examples/Order Details^host-org", 3),
        ("1^2^__NULL__^Examples/Sales Revenue^host-org", 1)
        # 你可以添加更多的 asset 值及其权重
    ]
    wsIdentifier = None  # 初始化 wsIdentifier

    @task(2)
    def openWS(self):
        self.asset = random.choices([ws[0] for ws in self.worksheets], weights=[ws[1] for ws in self.worksheets], k=1)[0]
        self.ws = {"asset": self.asset}


        response = self.client.post("/api/public/worksheets/open", json=self.ws, headers=self.user.headers)

        time.sleep(random.uniform(1, 5))  # 随机等待 1 到 5 秒钟

        print(f"Opened worksheet with asset: {self.asset}, status code: {response.status_code}")

        if response.status_code == 201:
            response_dict = response.json()
            self.wsIdentifier = response_dict.get("identifier")
        else:
            print(f"Failed to open worksheet: {response.text}")

    @task(1)
    def getWSData(self):
        if self.wsIdentifier is None:
            print("WS Identifier is not set. Skipping getWSData task.")
            return

        response = self.client.get(f"/api/public/worksheets/open/{self.wsIdentifier}/data", headers=self.user.headers)

        # print(f"Get WS data with asset: {self.asset}, status code: {response.status_code}")
        if response.status_code != 200:
            print(f"Failed to get ws data: {response.text}")


class ProductAPIUser(HttpUser):
    tasks = [(InetsoftDashboardTasks, 3), (InetsoftWSTasks, 1)]
    #tasks = [InetsoftWSTasks]
    wait_time = between(1, 5)  # 用户之间的等待时间

    def on_start(self):
        """
        on_start 方法在每个用户开始执行任务之前调用一次。
        这里我们用它来生成 token
        """

        response = self.client.post("/api/public/login", json={"username": "admin", "orgID": "host-org", "password": "admin"})
        #response = self.client.post("/api/public/login", json={"username": "ci1", "orgID": "host-org", "password": "success123"})

        if response.status_code == 200:
            try:
                token = response.json().get("token")
                print(f"====={token}===")
                self.headers = {"x-inetsoft-api-token": token}
            except ValueError as e:
                print(f"Failed to decode JSON response: {e}")

        else:
            print(f"Failed to login: {response.status_code}, {response.text}")


if __name__ == "__main__":
    import os
    os.system("locust -f Secnario1.py")