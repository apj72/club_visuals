#!/usr/bin/env python3
"""Tests for Club Visuals server endpoints and frontend rendering."""

import json
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.error

PORT = 8009
BASE_URL = f"http://127.0.0.1:{PORT}"
server_proc = None


def start_server():
    global server_proc
    env = {"PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"}
    server_proc = subprocess.Popen(
        [sys.executable, "server.py"],
        env={**env, "PORT": str(PORT)},
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    time.sleep(1.5)


def stop_server():
    global server_proc
    if server_proc:
        server_proc.terminate()
        server_proc.wait()
        server_proc = None


def get(path):
    return urllib.request.urlopen(f"{BASE_URL}{path}", timeout=5)


def get_json(path):
    res = get(path)
    return json.loads(res.read())


def post_json(path, data):
    body = json.dumps(data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    res = urllib.request.urlopen(req, timeout=5)
    return json.loads(res.read())


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    msg = f"  [{status}] {name}"
    if detail and not condition:
        msg += f" -- {detail}"
    print(msg)
    return condition


def test_html_endpoints():
    print("\n--- HTML Endpoints ---")
    passed = 0
    total = 0

    total += 1
    res = get("/")
    html = res.read().decode()
    if check("GET / returns 200", res.status == 200):
        passed += 1

    total += 1
    if check("HTML contains video-stage", "video-stage" in html):
        passed += 1

    total += 1
    if check("HTML contains CC button", 'onclick="toggleCaption()"' in html):
        passed += 1

    total += 1
    if check("HTML contains refresh button", 'onclick="refreshView()"' in html):
        passed += 1

    total += 1
    if check("HTML contains Record button", 'onclick="toggleRecording()"' in html):
        passed += 1

    total += 1
    if check("HTML contains caption-overlay div", 'id="captionOverlay"' in html):
        passed += 1

    total += 1
    if check("HTML contains broadcastState function", "function broadcastState" in html):
        passed += 1

    total += 1
    if check("HTML contains drawCompositeFrame function", "function drawCompositeFrame" in html):
        passed += 1

    total += 1
    if check("HTML contains getMetadata function", "function getMetadata" in html):
        passed += 1

    total += 1
    if check("HTML contains bounce loop mode", "loopMode" in html and "bounceReversing" in html):
        passed += 1

    total += 1
    if check("HTML contains loop mode labels", "LOOP_LABELS" in html):
        passed += 1

    total += 1
    if check("HTML contains showCaptionForVideo", "function showCaptionForVideo" in html):
        passed += 1

    total += 1
    if check("HTML contains rec timer", "formatRecTime" in html):
        passed += 1

    total += 1
    if check("Tabs are sticky", "position: sticky" in html and "tab-bar" in html):
        passed += 1

    total += 1
    if check("HTML contains deleteVideo function", "function deleteVideo" in html):
        passed += 1

    total += 1
    if check("HTML contains delete button class", "delete-btn" in html):
        passed += 1

    total += 1
    if check("HTML contains generatePlaylist function", "async function generatePlaylist" in html):
        passed += 1

    total += 1
    if check("HTML contains auto-gen form", 'id="autoGenForm"' in html):
        passed += 1

    total += 1
    if check("HTML contains Auto button", "toggleAutoGen()" in html):
        passed += 1

    total += 1
    res = get("/output")
    output_html = res.read().decode()
    if check("GET /output returns 200", res.status == 200):
        passed += 1

    total += 1
    if check("Output page contains EventSource", "EventSource" in output_html):
        passed += 1

    total += 1
    if check("Output page contains state-stream", "state-stream" in output_html):
        passed += 1

    total += 1
    if check("Output page has no sidebar", "right-col" not in output_html):
        passed += 1

    return passed, total


def test_view_mode_logic():
    print("\n--- View Mode Logic (frontend JS) ---")
    passed = 0
    total = 0

    res = get("/")
    html = res.read().decode()

    total += 1
    if check("Dual mode CSS rule exists", ".video-wrap.dual .video-stage .video-clone { display: block" in html):
        passed += 1

    total += 1
    if check("Octo mode CSS rule exists", ".video-wrap.octo .video-stage .video-clone { display: block" in html):
        passed += 1

    total += 1
    if check("Clone CSS default is display:none", ".video-stage .video-clone { display: none" in html):
        passed += 1

    total += 1
    if check("setViewModeTo adds dual class", "videoWrap.classList.add(name)" in html):
        passed += 1

    total += 1
    if check("buildClones creates canvas elements", "document.createElement('canvas')" in html):
        passed += 1

    total += 1
    if check("startRenderLoop draws to clones", "drawImage(video, 0, 0, vw, vh)" in html):
        passed += 1

    total += 1
    if check("Dual builds 1 clone", "viewMode === 1 && video.src) buildClones(1)" in html):
        passed += 1

    total += 1
    if check("Octo builds 7 clones", "viewMode === 2 && video.src) buildClones(7)" in html):
        passed += 1

    total += 1
    clone_count = html.count("buildClones(1)")
    octo_count = html.count("buildClones(7)")
    if check(
        "Clone counts consistent",
        clone_count >= 2 and octo_count >= 2,
        f"buildClones(1) appears {clone_count}x, buildClones(7) appears {octo_count}x",
    ):
        passed += 1

    return passed, total


def test_api_endpoints():
    print("\n--- API Endpoints ---")
    passed = 0
    total = 0

    total += 1
    videos = get_json("/api/videos")
    if check("GET /api/videos returns list", isinstance(videos, list)):
        passed += 1

    total += 1
    if videos:
        v = videos[0]
        if check("Video entry has filename", "filename" in v, str(v.keys())):
            passed += 1
    else:
        if check("Video list is empty (no downloads)", True):
            passed += 1

    total += 1
    config = get_json("/api/config")
    if check("GET /api/config returns dict", isinstance(config, dict)):
        passed += 1

    total += 1
    if check("Config has download_dir", "download_dir" in config):
        passed += 1

    total += 1
    playlists = get_json("/api/playlists")
    if check("GET /api/playlists returns list", isinstance(playlists, list)):
        passed += 1

    total += 1
    try:
        metadata = get_json("/api/metadata/nonexistent.mp4")
        if check("GET /api/metadata for missing file returns empty", metadata == {}):
            passed += 1
    except Exception as e:
        check("GET /api/metadata for missing file", False, str(e))

    total += 1
    try:
        browse = get_json("/api/browse?path=~")
        if check("GET /api/browse returns dirs", "current" in browse and "dirs" in browse):
            passed += 1
    except Exception as e:
        check("GET /api/browse", False, str(e))

    return passed, total


def test_delete_video():
    print("\n--- Delete Video ---")
    passed = 0
    total = 0

    import tempfile
    import server as srv
    dl = srv.get_download_dir()
    dl.mkdir(parents=True, exist_ok=True)

    test_mp4 = dl / "test_delete_me.mp4"
    test_info = dl / "test_delete_me.info.json"
    test_thumb = srv.THUMB_DIR / "test_delete_me.jpg"
    test_mp4.write_bytes(b"fake mp4")
    test_info.write_text('{"channel":"tester"}')
    srv.THUMB_DIR.mkdir(exist_ok=True)
    test_thumb.write_bytes(b"fake jpg")

    total += 1
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/video/{urllib.parse.quote('test_delete_me.mp4')}",
            method="DELETE",
        )
        res = urllib.request.urlopen(req, timeout=5)
        result = json.loads(res.read())
        if check("DELETE /api/video returns ok", result.get("ok") is True):
            passed += 1
    except Exception as e:
        check("DELETE /api/video responds", False, str(e))

    total += 1
    if check("Video file deleted", not test_mp4.exists()):
        passed += 1

    total += 1
    if check("Info JSON deleted", not test_info.exists()):
        passed += 1

    total += 1
    if check("Thumbnail deleted", not test_thumb.exists()):
        passed += 1

    total += 1
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/video/nonexistent.mp4",
            method="DELETE",
        )
        urllib.request.urlopen(req, timeout=5)
        check("DELETE nonexistent returns 404", False, "expected error")
    except urllib.error.HTTPError as e:
        if check("DELETE nonexistent returns 404", e.code == 404):
            passed += 1

    return passed, total


def test_sse_state():
    print("\n--- SSE State Sync ---")
    passed = 0
    total = 0

    total += 1
    received = []

    def listen_sse():
        try:
            res = urllib.request.urlopen(f"{BASE_URL}/api/state-stream", timeout=5)
            data = b""
            while True:
                chunk = res.read(1)
                if not chunk:
                    break
                data += chunk
                if b"\n\n" in data:
                    lines = data.decode().split("\n\n")
                    for line in lines[:-1]:
                        if line.startswith("data:"):
                            received.append(json.loads(line[5:].strip()))
                    data = lines[-1].encode()
                if len(received) >= 1:
                    break
        except Exception:
            pass

    t = threading.Thread(target=listen_sse, daemon=True)
    t.start()
    time.sleep(0.5)

    post_json("/api/state", {"type": "loadVideo", "filename": "test.mp4"})
    t.join(timeout=3)

    if check(
        "SSE receives state broadcast",
        len(received) > 0 and received[0].get("type") == "loadVideo",
        f"received: {received}",
    ):
        passed += 1

    return passed, total


def test_recording_endpoint():
    print("\n--- Recording/Convert Endpoint ---")
    passed = 0
    total = 0

    total += 1
    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/convert",
            data=b"not-a-real-webm",
            headers={"Content-Type": "video/webm", "Content-Length": "15"},
        )
        res = urllib.request.urlopen(req, timeout=10)
        result = json.loads(res.read())
        if check(
            "POST /api/convert handles bad input gracefully",
            "ok" in result,
            str(result),
        ):
            passed += 1
    except Exception as e:
        check("POST /api/convert responds", False, str(e))

    return passed, total


def test_cache_headers():
    print("\n--- Cache Headers ---")
    passed = 0
    total = 0

    total += 1
    res = get("/")
    cc = res.headers.get("Cache-Control", "")
    if check("index.html has no-cache header", "no-cache" in cc, f"got: {cc}"):
        passed += 1

    total += 1
    res = get("/output")
    cc = res.headers.get("Cache-Control", "")
    if check("output.html has no-cache header", "no-cache" in cc, f"got: {cc}"):
        passed += 1

    return passed, total


def main():
    # Use test port to avoid conflicting with running server
    import server as srv
    original_port = srv.PORT
    srv.PORT = PORT

    print(f"Starting test server on port {PORT}...")

    from http.server import HTTPServer

    test_server = srv.ThreadedHTTPServer(("127.0.0.1", PORT), srv.Handler)
    thread = threading.Thread(target=test_server.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.5)

    total_passed = 0
    total_tests = 0

    for test_fn in [
        test_html_endpoints,
        test_view_mode_logic,
        test_api_endpoints,
        test_delete_video,
        test_sse_state,
        test_recording_endpoint,
        test_cache_headers,
    ]:
        p, t = test_fn()
        total_passed += p
        total_tests += t

    print(f"\n{'='*40}")
    print(f"Results: {total_passed}/{total_tests} passed")
    if total_passed == total_tests:
        print("All tests passed!")
    else:
        print(f"{total_tests - total_passed} test(s) failed")

    test_server.shutdown()
    srv.PORT = original_port
    return 0 if total_passed == total_tests else 1


if __name__ == "__main__":
    sys.exit(main())
