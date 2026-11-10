"""Verify exported loop frames, including both sides of the repeat boundary."""

import shutil
import subprocess
from io import BytesIO

import pytest

import server


@pytest.fixture
def footage(tmp_path):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        pytest.skip("FFmpeg is required for loop integration tests")
    path = tmp_path / "source.mkv"
    # A changing uniform image makes discontinuities easy to measure. The
    # original last/first frames differ by 119 brightness levels.
    pixels = b"".join(bytes([frame + 30]) * (64 * 48 * 3) for frame in range(150))
    subprocess.run([ffmpeg, "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                    "-s", "64x48", "-r", "30", "-i", "pipe:0", "-c:v", "ffv1",
                    str(path)], input=pixels, check=True)
    return ffmpeg, path


@pytest.mark.parametrize("transition", ["none", *sorted(server.LOOP_TRANSITIONS)])
def test_export_length_and_transition(footage, transition):
    ffmpeg, path = footage
    result = subprocess.run(
        [ffmpeg, "-v", "error", *server.instagram_conversion_args(path, 4, transition, 1),
         "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
        capture_output=True, check=True)
    size = 64 * 48 * 3
    assert len(result.stdout) == 120 * size
    means = [sum(result.stdout[i:i + size]) / size
             for i in range(0, len(result.stdout), size)]
    if transition == "none":
        assert means[-1] - means[0] > 110
    else:
        # Both ends contain the blend, and crossing the file boundary advances
        # by one transition frame. The interior remains the original footage.
        assert abs(means[-1] - means[0]) < 18
        assert abs(means[15] - 60) < 5
        assert abs(means[104] - 149) < 5
    if transition == "fade":
        assert abs(means[0] - 105) < 5
        assert abs(means[-1] - 108) < 5


@pytest.mark.parametrize("transition,seconds", [
    ("unknown", 1), ("fade", float("nan")), ("fade", float("inf")),
    ("fade", 0), ("fade", 11), ("fade", 2.1),
])
def test_reject_invalid_transition(transition, seconds):
    with pytest.raises(ValueError):
        server.instagram_conversion_args("source.webm", 4, transition, seconds)


@pytest.mark.parametrize("transition", [None, "fade", "invalid"])
def test_convert_endpoint(footage, tmp_path, monkeypatch, transition):
    ffmpeg, path = footage
    monkeypatch.setattr(server, "get_instagram_clip_dir", lambda: tmp_path)
    monkeypatch.setattr(server, "find_working_ffmpeg", lambda: ffmpeg)
    body = path.read_bytes()
    handler = server.Handler.__new__(server.Handler)
    handler.headers = {
        "Content-Length": str(len(body)), "X-Recording-Profile": "instagram_1x1",
        "X-Recording-Duration": "4",
    }
    if transition:
        handler.headers.update({"X-Loop-Transition": transition,
                                "X-Loop-Transition-Duration": "1"})
    handler.rfile = BytesIO(body)
    responses = []
    handler.send_json_response = responses.append
    handler.handle_convert()
    assert responses[0]["ok"] == (transition != "invalid")
    assert not list(tmp_path.glob("*.webm"))
    if transition != "invalid":
        output = tmp_path / responses[0]["filename"]
        probe = subprocess.check_output([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_name,nb_frames", "-of", "csv=p=0", str(output)])
        assert probe.strip() == b"h264,120"
