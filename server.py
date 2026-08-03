#!/usr/bin/env python3

import json
import os
import re
import subprocess
import time
import urllib.parse
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from socketserver import ThreadingMixIn


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

PORT = 8008
BASE_DIR = Path(__file__).parent
THUMB_DIR = BASE_DIR / "thumbnails"
PLAYLIST_DIR = BASE_DIR / "playlists"
COOKIE_JAR = BASE_DIR / ".cookies.txt"
COOKIE_MAX_AGE = 3600
HTML_FILE = BASE_DIR / "index.html"
OUTPUT_FILE = BASE_DIR / "output.html"
CONFIG_FILE = BASE_DIR / "config.json"
STATE_CLIENTS = []
STATE_LOCK = threading.Lock()


def load_config():
    defaults = {"download_dir": "./downloads"}
    if CONFIG_FILE.exists():
        try:
            data = json.loads(CONFIG_FILE.read_text())
            defaults.update(data)
        except Exception:
            pass
    return defaults


def save_config(config):
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def get_download_dir():
    raw = load_config()["download_dir"]
    p = Path(raw)
    if not p.is_absolute():
        p = BASE_DIR / p
    return p.resolve()


def refresh_cookies():
    try:
        subprocess.run(
            ["yt-dlp", "--cookies-from-browser", "brave",
             "--cookies", str(COOKIE_JAR),
             "--skip-download", "https://www.instagram.com/"],
            capture_output=True, timeout=15,
        )
    except Exception as e:
        print(f"Cookie export failed: {e}")


def get_cookie_args():
    if not COOKIE_JAR.exists() or (
        time.time() - COOKIE_JAR.stat().st_mtime > COOKIE_MAX_AGE
    ):
        refresh_cookies()
    if COOKIE_JAR.exists():
        return ["--cookies", str(COOKIE_JAR)]
    return ["--cookies-from-browser", "brave"]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {args[0]}")

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.serve_html()
        elif self.path == "/output":
            self.serve_output()
        elif self.path == "/api/state-stream":
            self.state_stream()
        elif self.path.startswith("/video/"):
            self.serve_video()
        elif self.path.startswith("/thumbnail/"):
            self.serve_thumbnail()
        elif self.path == "/api/videos":
            self.list_videos()
        elif self.path == "/api/playlists":
            self.list_playlists()
        elif self.path == "/api/config":
            self.get_config()
        elif self.path.startswith("/api/metadata/"):
            self.get_metadata()
        elif self.path.startswith("/api/browse"):
            self.browse_dirs()
        elif self.path.startswith("/api/playlist/"):
            self.get_playlist()
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == "/api/state":
            self.update_state()
        elif self.path == "/download":
            self.handle_download()
        elif self.path == "/api/config":
            self.update_config()
        elif self.path == "/api/convert":
            self.handle_convert()
        elif self.path.startswith("/api/playlist/"):
            self.save_playlist()
        else:
            self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/video/"):
            self.delete_video()
        elif self.path.startswith("/api/playlist/"):
            self.delete_playlist()
        else:
            self.send_error(404)

    def serve_html(self):
        content = HTML_FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(content))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)

    def serve_output(self):
        if not OUTPUT_FILE.exists():
            self.send_error(404, "output.html not found")
            return
        content = OUTPUT_FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(content))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(content)

    def state_stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        with STATE_LOCK:
            STATE_CLIENTS.append(self.wfile)
        try:
            while True:
                time.sleep(1)
                self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with STATE_LOCK:
                if self.wfile in STATE_CLIENTS:
                    STATE_CLIENTS.remove(self.wfile)

    def update_state(self):
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length))
        msg = f"data: {json.dumps(data)}\n\n".encode()
        dead = []
        with STATE_LOCK:
            for client in STATE_CLIENTS:
                try:
                    client.write(msg)
                    client.flush()
                except Exception:
                    dead.append(client)
            for d in dead:
                STATE_CLIENTS.remove(d)
        self.send_json_response({"ok": True})

    def serve_video(self):
        filename = urllib.parse.unquote(self.path[len("/video/"):])
        safe_name = Path(filename).name
        filepath = get_download_dir() / safe_name

        if not filepath.exists():
            self.send_error(404, "Video not found")
            return

        size = filepath.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Length", size)
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()

        with open(filepath, "rb") as f:
            while chunk := f.read(65536):
                self.wfile.write(chunk)

    def list_videos(self):
        dl = get_download_dir()
        dl.mkdir(parents=True, exist_ok=True)
        videos = []
        for f in sorted(dl.glob("*.mp4"), key=os.path.getmtime, reverse=True):
            stat = f.stat()
            entry = {
                "filename": f.name,
                "size": stat.st_size,
                "modified": stat.st_mtime,
            }
            info_path = dl / (f.stem + ".info.json")
            if info_path.exists():
                try:
                    meta = json.loads(info_path.read_text())
                    entry["uploader"] = meta.get("channel", "")
                except Exception:
                    pass
            videos.append(entry)
        self.send_json_response(videos)

    def get_metadata(self):
        filename = urllib.parse.unquote(self.path[len("/api/metadata/"):])
        safe_name = Path(filename).name
        stem = Path(safe_name).stem
        info_path = get_download_dir() / f"{stem}.info.json"
        if not info_path.exists():
            self.send_json_response({})
            return
        try:
            raw = json.loads(info_path.read_text())
            self.send_json_response({
                "channel": raw.get("channel", ""),
                "uploader": raw.get("uploader", ""),
                "description": raw.get("description", ""),
                "webpage_url": raw.get("webpage_url", ""),
                "upload_date": raw.get("upload_date", ""),
                "duration": raw.get("duration"),
            })
        except Exception:
            self.send_json_response({})

    def serve_thumbnail(self):
        filename = urllib.parse.unquote(self.path[len("/thumbnail/"):])
        safe_name = Path(filename).name
        video_path = get_download_dir() / safe_name

        if not video_path.exists():
            self.send_error(404, "Video not found")
            return

        THUMB_DIR.mkdir(exist_ok=True)
        thumb_name = video_path.stem + ".jpg"
        thumb_path = THUMB_DIR / thumb_name

        if not thumb_path.exists():
            try:
                subprocess.run([
                    "ffmpeg", "-y", "-i", str(video_path),
                    "-vframes", "1", "-ss", "0.5",
                    "-vf", "scale=320:-1",
                    "-q:v", "4",
                    str(thumb_path),
                ], capture_output=True, timeout=10)
            except Exception:
                self.send_error(500, "Thumbnail generation failed")
                return

        if not thumb_path.exists():
            self.send_error(500, "Thumbnail generation failed")
            return

        data = thumb_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "image/jpeg")
        self.send_header("Content-Length", len(data))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(data)

    def list_playlists(self):
        PLAYLIST_DIR.mkdir(exist_ok=True)
        playlists = []
        for f in sorted(PLAYLIST_DIR.glob("*.json")):
            try:
                data = json.loads(f.read_text())
                playlists.append({"slug": f.stem, "name": data.get("name", f.stem)})
            except Exception:
                pass
        self.send_json_response(playlists)

    def get_playlist(self):
        slug = urllib.parse.unquote(self.path[len("/api/playlist/"):])
        safe = Path(slug).name
        filepath = PLAYLIST_DIR / f"{safe}.json"
        if not filepath.exists():
            self.send_error(404, "Playlist not found")
            return
        self.send_json_response(json.loads(filepath.read_text()))

    def save_playlist(self):
        slug = urllib.parse.unquote(self.path[len("/api/playlist/"):])
        safe = Path(slug).name
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length))
        PLAYLIST_DIR.mkdir(exist_ok=True)
        (PLAYLIST_DIR / f"{safe}.json").write_text(json.dumps(data, indent=2))
        self.send_json_response({"ok": True})

    def delete_video(self):
        filename = urllib.parse.unquote(self.path[len("/api/video/"):])
        safe_name = Path(filename).name
        dl = get_download_dir()
        video_path = dl / safe_name
        if not video_path.exists():
            self.send_error(404, "Video not found")
            return
        video_path.unlink()
        info_path = dl / (video_path.stem + ".info.json")
        if info_path.exists():
            info_path.unlink()
        thumb_path = THUMB_DIR / (video_path.stem + ".jpg")
        if thumb_path.exists():
            thumb_path.unlink()
        self.send_json_response({"ok": True})

    def delete_playlist(self):
        slug = urllib.parse.unquote(self.path[len("/api/playlist/"):])
        safe = Path(slug).name
        filepath = PLAYLIST_DIR / f"{safe}.json"
        if filepath.exists():
            filepath.unlink()
        self.send_json_response({"ok": True})

    def browse_dirs(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        raw = params.get("path", [str(Path.home())])[0]
        target = Path(raw).expanduser().resolve()
        if not target.is_dir():
            target = Path.home()
        dirs = []
        try:
            for entry in sorted(target.iterdir(), key=lambda e: e.name.lower()):
                if entry.name.startswith("."):
                    continue
                if entry.is_dir():
                    dirs.append(entry.name)
        except PermissionError:
            pass
        parent = str(target.parent) if target != target.parent else None
        self.send_json_response({
            "current": str(target),
            "parent": parent,
            "dirs": dirs,
        })

    def get_config(self):
        self.send_json_response(load_config())

    def update_config(self):
        length = int(self.headers.get("Content-Length", 0))
        data = json.loads(self.rfile.read(length))
        config = load_config()
        if "download_dir" in data:
            raw = data["download_dir"].strip()
            if not raw:
                self.send_json_response({"ok": False, "error": "Path cannot be empty"})
                return
            config["download_dir"] = raw
        save_config(config)
        dl = get_download_dir()
        dl.mkdir(parents=True, exist_ok=True)
        self.send_json_response({"ok": True, "resolved": str(dl)})

    def handle_download(self):
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length))
        url = body.get("url", "").strip()

        if not url or "instagram.com" not in url:
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "close")
            self.end_headers()
            self.send_sse({"status": "error", "message": "Invalid Instagram URL."})
            return

        dl = get_download_dir()
        dl.mkdir(parents=True, exist_ok=True)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()

        self.send_sse({"status": "progress", "message": "Starting yt-dlp..."})

        cookie_args = get_cookie_args()
        cmd = [
            "yt-dlp",
            "--no-warnings",
            "--newline",
            *cookie_args,
            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "--write-infojson",
            "-o", str(dl / "%(title).80s_%(id)s.%(ext)s"),
            "--print", "after_move:filename",
            url,
        ]

        try:
            proc = subprocess.Popen(
                cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
            )

            final_filename = None
            for line in proc.stdout:
                line = line.strip()
                if not line:
                    continue

                if line.startswith("[download]") and "%" in line:
                    match = re.search(r"(\d+\.?\d*)%", line)
                    if match:
                        self.send_sse({"status": "progress", "message": f"Downloading... {match.group(1)}%"})
                elif line.startswith("[Merger]"):
                    self.send_sse({"status": "progress", "message": "Merging audio and video..."})
                elif line.startswith(str(dl)):
                    final_filename = Path(line).name

            proc.wait()

            if proc.returncode == 0 and final_filename:
                self.send_sse({"status": "done", "filename": final_filename})
            elif proc.returncode == 0:
                files = sorted(dl.glob("*.mp4"), key=os.path.getmtime, reverse=True)
                if files:
                    self.send_sse({"status": "done", "filename": files[0].name})
                else:
                    self.send_sse({"status": "error", "message": "Download completed but no file found."})
            else:
                self.send_sse({"status": "error", "message": "Download failed. The content may require login."})

        except FileNotFoundError:
            self.send_sse({"status": "error", "message": "yt-dlp not found. Install it with: brew install yt-dlp"})
        except Exception as e:
            self.send_sse({"status": "error", "message": str(e)})

    def handle_convert(self):
        length = int(self.headers.get("Content-Length", 0))
        dl = get_download_dir()
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        webm_path = dl / f"recording_{timestamp}.webm"
        mp4_path = dl / f"recording_{timestamp}.mp4"

        with open(webm_path, "wb") as f:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(65536, remaining))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)

        try:
            result = subprocess.run([
                "ffmpeg", "-y", "-i", str(webm_path),
                "-c:v", "libx264", "-preset", "fast",
                "-crf", "23", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "128k",
                str(mp4_path),
            ], capture_output=True, timeout=600)

            webm_path.unlink(missing_ok=True)

            if result.returncode == 0 and mp4_path.exists():
                self.send_json_response({"ok": True, "filename": mp4_path.name})
            else:
                err = result.stderr.decode()[-200:] if result.stderr else "unknown"
                self.send_json_response({"ok": False, "error": f"ffmpeg failed: {err}"})
        except Exception as e:
            webm_path.unlink(missing_ok=True)
            self.send_json_response({"ok": False, "error": str(e)})

    def send_sse(self, data):
        msg = f"data: {json.dumps(data)}\n\n"
        self.wfile.write(msg.encode())
        self.wfile.flush()

    def send_json_response(self, data):
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    if not CONFIG_FILE.exists():
        save_config({"download_dir": "./downloads"})
    get_download_dir().mkdir(parents=True, exist_ok=True)
    THUMB_DIR.mkdir(exist_ok=True)
    PLAYLIST_DIR.mkdir(exist_ok=True)
    print("Exporting cookies from Brave...")
    refresh_cookies()
    server = ThreadedHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Club Visuals running at http://localhost:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
