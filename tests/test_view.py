"""Small check for the ticket format consumed by the viewer."""

from pathlib import Path
from tempfile import TemporaryDirectory
import runpy


tickets_from = runpy.run_path(str(Path(__file__).parents[1] / "plugins/ticket-view"))["tickets_from"]

with TemporaryDirectory() as root:
    folder = Path(root)
    (folder / "epic.md").write_text(
        "---\nid: epic\ntype: epic\nstatus: open\ndeps: []\n---\n# My epic\n"
    )
    (folder / "task.md").write_text(
        "---\nid: task\nstatus: ready\nparent: epic\ndeps: [first, second]\n"
        "custom-field: kept\n---\n# A task\n\nFull ticket text\n"
    )
    epic, task = tickets_from(folder)
    assert epic["type"] == "epic"
    assert task["title"] == "A task"
    assert task["deps"] == ["first", "second"]
    assert task["parent"] == "epic"
    assert task["metadata"]["custom-field"] == "kept"
    assert "Full ticket text" in task["body"]

print("ticket view parser: ok")
