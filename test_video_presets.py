"""Exercise per-video layout preset storage through the HTTP API."""

import json
import tempfile
import threading
import urllib.error
import urllib.request
from pathlib import Path

import server


def test_video_layout_presets():
    original_download_dir = server.get_download_dir
    original_preset_dir = server.VIDEO_PRESET_DIR
    with tempfile.TemporaryDirectory() as folder:
        root = Path(folder)
        videos = root / "videos"
        videos.mkdir()
        (videos / "fixture.mp4").write_bytes(b"fixture")
        server.get_download_dir = lambda: videos
        server.VIDEO_PRESET_DIR = root / "presets"
        httpd = server.ThreadedHTTPServer(("127.0.0.1", 0), server.Handler)
        thread = threading.Thread(target=httpd.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{httpd.server_port}/api/video-presets/fixture.mp4"
        try:
            origin = f"http://127.0.0.1:{httpd.server_port}"
            with urllib.request.urlopen(origin + "/vfx") as response:
                assert b"Live VFX" in response.read()
            with urllib.request.urlopen(origin + "/assets/version1-logo.png") as response:
                assert response.headers.get_content_type() == "image/png"
                assert response.read(8) == b"\x89PNG\r\n\x1a\n"
            with urllib.request.urlopen(origin + "/assets/version1-hero.svg") as response:
                assert response.headers.get_content_type() == "image/svg+xml"
                assert b"<svg" in response.read(200)
            with urllib.request.urlopen(origin + "/assets/Bungee-Regular.ttf") as response:
                assert response.headers.get_content_type() == "font/ttf"
                assert response.read(4) == b"\x00\x01\x00\x00"
            with urllib.request.urlopen(origin + "/effects") as response:
                assert b"Live VFX on full output" not in response.read()
            with urllib.request.urlopen(url) as response:
                assert json.load(response) == {"video": "fixture.mp4", "presets": []}

            first = {
                "id": "layout-1", "name": "Wide bounce", "view": "octo",
                "preset": 26, "loopMode": 2, "speed": 0.25, "zoom": 2.2,
                "panX": -0.35, "panY": 0.4,
            }
            legacy = {
                **first, "id": "layout-2", "name": "Tight loop",
                "view": "dual", "preset": 5, "loopMode": 1, "zoom": 1.3,
            }
            del legacy["speed"]
            saved = {"presets": [first, legacy]}
            request = urllib.request.Request(
                url, data=json.dumps(saved).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(request) as response:
                assert json.load(response)["ok"] is True
            with urllib.request.urlopen(url) as response:
                loaded = json.load(response)
            expected = [first, {**legacy, "speed": 1.0}]
            assert loaded["presets"] == expected
            with urllib.request.urlopen(url.replace("fixture.mp4", "other.mp4")) as response:
                assert json.load(response)["presets"] == []

            invalid = {"presets": [{**first, "zoom": 12}]}
            request = urllib.request.Request(
                url, data=json.dumps(invalid).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            try:
                urllib.request.urlopen(request)
                assert False, "Invalid zoom was accepted"
            except urllib.error.HTTPError as error:
                assert error.code == 400

            invalid_speed = {"presets": [{**first, "speed": 1.3}]}
            request = urllib.request.Request(
                url, data=json.dumps(invalid_speed).encode(),
                headers={"Content-Type": "application/json"}, method="POST")
            try:
                urllib.request.urlopen(request)
                assert False, "Speed outside 0.25 steps was accepted"
            except urllib.error.HTTPError as error:
                assert error.code == 400
        finally:
            httpd.shutdown()
            httpd.server_close()
            server.get_download_dir = original_download_dir
            server.VIDEO_PRESET_DIR = original_preset_dir
