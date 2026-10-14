"""Check that Library ordering survives reloads and handles new/deleted videos."""

import json
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path

import server


def test_library_order():
    original_download_dir = server.get_download_dir
    original_order_file = server.LIBRARY_ORDER_FILE
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        videos = root / "videos"
        videos.mkdir()
        for name in ("first.mp4", "second.mp4", "third.mp4", "instagram_export.mp4"):
            (videos / name).write_bytes(b"fixture")
        server.get_download_dir = lambda: videos
        server.LIBRARY_ORDER_FILE = root / "library_order.json"
        httpd = server.ThreadedHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{httpd.server_port}"

        def filenames():
            with urllib.request.urlopen(origin + "/api/videos") as response:
                return [video["filename"] for video in json.load(response)]

        def save(order):
            request = urllib.request.Request(
                origin + "/api/library-order", data=json.dumps({"order": order}).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            return urllib.request.urlopen(request)

        try:
            assert set(filenames()) == {"first.mp4", "second.mp4", "third.mp4"}
            with save(["third.mp4", "first.mp4", "second.mp4"]) as response:
                assert json.load(response)["ok"] is True
            assert filenames() == ["third.mp4", "first.mp4", "second.mp4"]
            assert json.loads(server.LIBRARY_ORDER_FILE.read_text()) == filenames()

            (videos / "new.mp4").write_bytes(b"new")
            assert filenames() == ["third.mp4", "first.mp4", "second.mp4", "new.mp4"]
            with save(["new.mp4", "third.mp4", "first.mp4", "second.mp4"]):
                pass
            assert filenames()[0] == "new.mp4"

            for invalid in (["missing.mp4"], ["first.mp4", "first.mp4"],
                            ["instagram_export.mp4"]):
                try:
                    save(invalid)
                    assert False, f"Accepted invalid order: {invalid}"
                except urllib.error.HTTPError as error:
                    assert error.code == 400

            request = urllib.request.Request(origin + "/api/video/first.mp4", method="DELETE")
            with urllib.request.urlopen(request) as response:
                assert json.load(response)["ok"] is True
            assert "first.mp4" not in filenames()
            assert "first.mp4" not in json.loads(server.LIBRARY_ORDER_FILE.read_text())
        finally:
            httpd.shutdown()
            httpd.server_close()
            server.get_download_dir = original_download_dir
            server.LIBRARY_ORDER_FILE = original_order_file
