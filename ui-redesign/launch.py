#!/usr/bin/env python3
"""Redesigned editor and show recipe routes over shared V1 playback."""
import argparse
from pathlib import Path
import sys
import urllib.parse
import json

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
import server as v1

ASSETS = Path(__file__).resolve().parent
sys.path.insert(0, str(ASSETS))
from show_store import ShowLibrary, LibraryConflict

SHOW_LIBRARY = ShowLibrary(ROOT / 'show_models.json')


class RedesignHandler(v1.Handler):
    supports_redesign = True

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path in ('/redesign', '/redesign/'):
            if urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query).get('host') == ['1']:
                self.send_response(302)
                self.send_header('Location', '/?host=1')
                self.end_headers()
                return
            source = v1.HTML_FILE.read_text()
            source = source.replace('<html lang="en">', '<html lang="en" class="redesign">', 1)
            source = source.replace('</head>', '<link id="redesignStyles" rel="stylesheet" href="/redesign/style.css"></head>', 1)
            source = source.replace('</body>', '<script src="/redesign/presentation.js"></script></body>', 1)
            source = source.replace('</body>', '<script src="/redesign/transition-preview.js"></script></body>', 1)
            source = source.replace('</body>', '<script src="/redesign/show-models.js"></script><script src="/redesign/show-builder.js"></script></body>', 1)
            source = source.replace('</head>', '<link rel="stylesheet" href="/redesign/show-builder.css"></head>', 1)
            self.send_asset(source.encode(), 'text/html; charset=utf-8')
        elif path == '/api/show-library':
            try:
                self.send_json_response(SHOW_LIBRARY.read())
            except (ValueError, OSError):
                self.send_show_error(500, 'Could not read the saved show library. Download your draft before retrying.')
        elif path in ('/redesign/style.css', '/redesign/presentation.js', '/redesign/transition-preview.js', '/redesign/show-models.js', '/redesign/show-builder.js', '/redesign/show-builder.css'):
            name = path.rsplit('/', 1)[1]
            self.send_asset((ASSETS / name).read_bytes(), 'text/css' if name.endswith('.css') else 'text/javascript')
        else:
            super().do_GET()

    def do_POST(self):
        if urllib.parse.urlsplit(self.path).path != '/api/show-library':
            return super().do_POST()
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 4_000_000:
                raise ValueError('Show library must be under 4 MB')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Invalid show library')
            self.send_json_response(SHOW_LIBRARY.save(payload))
        except LibraryConflict as error:
            self.send_show_error(409, str(error))
        except (ValueError, TypeError) as error:
            self.send_show_error(400, str(error))
        except OSError:
            self.send_show_error(500, 'Could not save the show library')

    def send_show_error(self, status, message):
        content = json.dumps({'error': message}).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(content))
        self.end_headers()
        self.wfile.write(content)

    def send_asset(self, content, content_type):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', len(content))
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        self.wfile.write(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=v1.PORT)
    parser.add_argument('--bind', default='0.0.0.0')
    args = parser.parse_args()
    # All V1 routes, state and data are handled by one server instance.
    v1.MAC_OUTPUT = v1.MacOutput(ROOT, args.port)
    if not v1.CONFIG_FILE.exists():
        v1.save_config({'download_dir': './downloads'})
    v1.get_download_dir().mkdir(parents=True, exist_ok=True)
    for directory in (v1.THUMB_DIR, v1.PLAYLIST_DIR, v1.VIDEO_PRESET_DIR):
        directory.mkdir(exist_ok=True)
    try:
        httpd = v1.ThreadedHTTPServer((args.bind, args.port), RedesignHandler)
    except OSError as error:
        parser.exit(1, f'Cannot listen on {args.port}: {error}\nStop the existing server before launching this one. V1 files are unchanged.\n')
    print(f'Redesigned UI: http://localhost:{args.port}/redesign', flush=True)
    print(f'Original V1:   http://localhost:{args.port}/', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()
