"""Check status, assignee, and dependency updates from the viewer."""

import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
from urllib.error import HTTPError
from urllib.request import Request, urlopen


root = Path(__file__).parents[1]
with TemporaryDirectory() as temp:
    directory = Path(temp) / ".tickets"
    directory.mkdir()
    (directory / "task.md").write_text("---\nid: task\nstatus: open\ndeps: [dep]\n---\n# Task\n")
    (directory / "dep.md").write_text("---\nid: dep\nstatus: open\ndeps: []\n---\n# Dependency\n")
    env = {**os.environ, "TICKETS_DIR": str(directory), "TK_SCRIPT": str(root / "ticket")}
    server = subprocess.Popen([sys.executable, str(root / "plugins/ticket-view"), "--no-open"],
                              cwd=temp, env=env, stdout=subprocess.PIPE, text=True)
    try:
        url = server.stdout.readline().strip().removeprefix("Ticket view: ")
        assert url.startswith("http://127.0.0.1:")

        def post(path, data):
            request = Request(url + path, data=json.dumps(data).encode(),
                              headers={"Content-Type": "application/json", "Origin": url}, method="POST")
            try:
                with urlopen(request) as response:
                    return response.status, json.load(response)
            except HTTPError as error:
                return error.code, json.load(error)

        def set_status(ticket_id, expected, status):
            return post("/api/status", {"id": ticket_id, "expectedStatus": expected, "status": status})

        def set_assignee(ticket_id, expected, name):
            return post("/api/assignee", {"id": ticket_id, "expectedAssignee": expected, "name": name})

        def dependency(source, target, action):
            return post("/api/dependency", {"from": source, "to": target, "action": action})

        assert set_status("task", "open", "ready") == (200, {"status": "ready"})
        assert "status: ready" in (directory / "task.md").read_text()
        assert set_status("task", "open", "closed")[0] == 409
        assert set_status("task", "ready", "done")[0] == 400
        assert set_status("task", "ready", "in_progress")[0] == 400
        assert "status: ready" in (directory / "task.md").read_text()
        (directory / "dep.md").write_text((directory / "dep.md").read_text().replace("status: open", "status: done"))
        assert set_status("task", "ready", "in_progress") == (200, {"status": "in_progress"})
        assert "status: in_progress" in (directory / "task.md").read_text()
        assert set_status("task", "in_progress", "partially_implemented") == (200, {"status": "partially_implemented"})
        assert "status: partially_implemented" in (directory / "task.md").read_text()
        assert set_status("task", "partially_implemented", "in_progress") == (200, {"status": "in_progress"})
        assert set_assignee("task", "", "Agent") == (200, {"assignee": "Agent"})
        assert "assignee: Agent" in (directory / "task.md").read_text()
        assert set_assignee("task", "", "Byron Wall")[0] == 409
        assert set_assignee("task", "Agent", "Byron Wall") == (200, {"assignee": "Byron Wall"})
        assert "assignee: Byron Wall" in (directory / "task.md").read_text()
        assert set_assignee("task", "Byron Wall", "Bad\nName")[0] == 400
        assert set_assignee("task", "Byron Wall", "") == (200, {"assignee": ""})
        assert "assignee:" not in (directory / "task.md").read_text()
        assert "# Task" in (directory / "task.md").read_text()
        assert dependency("task", "dep", "add")[0] == 409
        assert (directory / "dep.md").read_text().split("deps: ")[1].startswith("[]")
        assert dependency("dep", "task", "add")[0] == 409
        assert dependency("dep", "task", "remove") == (200, {"from": "dep", "to": "task", "action": "remove"})
        assert "deps: []" in (directory / "task.md").read_text()
        assert dependency("dep", "task", "remove")[0] == 409
        assert dependency("task", "dep", "add") == (200, {"from": "task", "to": "dep", "action": "add"})
        assert "deps: [task]" in (directory / "dep.md").read_text()
        assert dependency("dep", "task", "add")[0] == 409
        assert dependency("task", "dep", "remove")[0] == 200
        assert dependency("dep", "task", "add")[0] == 200
        assert "deps: [dep]" in (directory / "task.md").read_text()
        assert dependency("task", "task", "add")[0] == 400
        assert dependency("missing", "task", "add")[0] == 404
    finally:
        server.terminate()
        server.wait(timeout=5)

print("ticket view updates: ok")
