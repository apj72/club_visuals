#!/usr/bin/env python3
"""Isolated V2 implementation trial with optional native Mac playout.

No production launchers or server files are modified. Saved-content mutations remain blocked. Use --enable-playout to allow
only the existing live command and engine-report endpoints on this instance.
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

CODE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(CODE))
import server

ASSETS = {'/ui-v2/': ('index.html', 'text/html; charset=utf-8'),
          '/ui-v2/app.js': ('app.js', 'text/javascript; charset=utf-8'),
          '/ui-v2/preview.js': ('preview.js', 'text/javascript; charset=utf-8'),
          '/ui-v2/patterns.js': ('patterns.js', 'text/javascript; charset=utf-8'),
          '/ui-v2/remote.js': ('remote.js', 'text/javascript; charset=utf-8'),
          '/ui-v2/style.css': ('style.css', 'text/css; charset=utf-8')}


def no_links(root):
    if root.is_symlink() or any(p.is_symlink() for p in root.rglob('*')):
        raise ValueError('Trial directories must contain copies, not symlinks')


def configure(data, runtime, port, enable_playout=False):
    if not 1 <= port <= 65535 or port == 8008:
        raise ValueError('Choose a valid trial port other than 8008')
    for root in (data, runtime):
        if not root.is_absolute() or root.resolve() != root:
            raise ValueError('Use absolute trial paths without symlink components')
        if root == CODE or root in CODE.parents or CODE in root.parents:
            raise ValueError('Trial data/runtime must be outside the code checkout')
    if data == runtime or data in runtime.parents or runtime in data.parents:
        raise ValueError('Data and runtime roots must be separate')
    # Refuse existing production data directories, even when running a worktree.
    import subprocess
    common = Path(subprocess.check_output(
        ['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'],
        cwd=CODE, text=True).strip()).parent
    protected = [common]
    config = common / 'config.json'
    if config.exists():
        current = json.loads(config.read_text())
        for key in ('download_dir', 'instagram_clip_dir'):
            raw = current.get(key)
            if raw:
                path = Path(raw).expanduser()
                protected.append((path if path.is_absolute() else common / path).resolve())
    for root in (data, runtime):
        for path in protected:
            if root == path or path in root.parents or root in path.parents:
                raise ValueError('Trial roots overlap production paths')
        root.mkdir(parents=True, exist_ok=True)
        if root == data:
            no_links(root)
        else:
            no_links(root / '.runtime' / 'ipad-previews')
            for part in [root / '.runtime', root / '.runtime/playout-browser', root / '.runtime/playout-browser/DevToolsActivePort']:
                if part.is_symlink():
                    raise ValueError('Runtime profile roots and DevTools file must not be symlinks')
    for name in ('media', 'clips', 'thumbnails', 'playlists', 'video_presets'):
        (data / name).mkdir(exist_ok=True)
    expected = {'download_dir': str(data / 'media'),
                'instagram_clip_dir': str(data / 'clips')}
    config = data / 'config.json'
    if config.exists() and json.loads(config.read_text()) != expected:
        raise ValueError('Trial config must point only to its own media/clip directories')
    config.write_text(json.dumps(expected, indent=2))
    server.PORT = port
    for attr, name in [('CONFIG_FILE','config.json'), ('THUMB_DIR','thumbnails'),
                       ('PLAYLIST_DIR','playlists'), ('VIDEO_PRESET_DIR','video_presets'),
                       ('LIBRARY_ORDER_FILE','library_order.json'), ('COOKIE_JAR','.cookies.txt')]:
        setattr(server, attr, data / name)
    server.LIBRARY_CATALOG = server.LibraryCatalog(data / 'library_catalog.json')
    server.PREVIEW_CACHE = server.PreviewCache(runtime / '.runtime/ipad-previews', server.find_working_ffmpeg)
    server.MAC_OUTPUT = server.MacOutput(runtime, port)

    class TrialHandler(server.Handler):
        def do_GET(self):
            try:
                no_links(data)
                no_links(runtime / '.runtime' / 'ipad-previews')
            except ValueError as error:
                self.send_error(403, str(error))
                return
            parsed = urlsplit(self.path)
            if parsed.path in ('/ui-v2', '/ui-v2/') and 'host' in parse_qs(parsed.query):
                self.send_error(400, 'The V2 editor cannot be a live engine')
            elif parsed.path == '/ui-v2':
                self.send_response(302)
                self.send_header('Location', '/ui-v2/' + ('?remote=1' if parse_qs(parsed.query).get('remote') == ['1'] else ''))
                self.end_headers()
            elif parsed.path in ASSETS:
                name, mime = ASSETS[parsed.path]
                body = (CODE / 'ui/v2' / name).read_bytes()
                self.send_response(200)
                self.send_header('Content-Type', mime)
                self.send_header('Content-Length', len(body))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(body)
            elif parsed.path == '/api/ui-preview-info':
                self.send_json_response({'label':'TEST LIBRARY', 'readOnly':True, 'playoutEnabled':enable_playout,
                                         'port':port, 'dataRoot':str(data)})
            elif parsed.path.startswith('/ui-v2/'):
                self.send_error(404)
            elif parsed.path.startswith('/api/browse'):
                self.send_error(403, 'Folder browsing is disabled in this read-only milestone')
            else:
                super().do_GET()

        def do_POST(self):
            try:
                no_links(data)
                no_links(runtime / '.runtime' / 'ipad-previews')
            except ValueError as error:
                self.send_error(403, str(error))
                return
            if enable_playout and self.path in ('/api/control-session', '/api/output-window', '/api/remote-status', '/api/remote-command', '/api/state'):
                return super().do_POST()
            self.send_error(403, 'Read-only trial: saved data and live commands are disabled')

        def do_DELETE(self):
            self.send_error(403, 'Read-only trial: deletion is disabled')

    return TrialHandler


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--enable-playout', action='store_true', help='Allow live commands only on this isolated instance; saved edits remain blocked')
    parser.add_argument('--port', type=int, default=8012)
    parser.add_argument('--bind', choices=['127.0.0.1', '0.0.0.0'], default='127.0.0.1')
    parser.add_argument('--data-root', type=Path, required=True)
    parser.add_argument('--runtime-root', type=Path, required=True)
    args = parser.parse_args()
    try:
        handler = configure(args.data_root, args.runtime_root, args.port, args.enable_playout)
        httpd = server.ThreadedHTTPServer((args.bind, args.port), handler)
    except (ValueError, OSError) as error:
        parser.exit(2, f'Cannot start trial: {error}\n')
    print(f'TEST LIBRARY — SAVED EDITS DISABLED (playout={args.enable_playout})\nData: {args.data_root}\nRuntime: {args.runtime_root}\n'
          f'Open http://localhost:{args.port}/ui-v2/', flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == '__main__':
    main()
