"""Default editor routes shared by the standard and compatibility launchers."""
import json
from pathlib import Path
import urllib.parse
from show_library import ShowLibrary, LibraryConflict

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / 'ui-redesign'
SHOW_LIBRARY = ShowLibrary(ROOT / 'show_models.json')


class EditorRoutesMixin:
    supports_redesign = True

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
        if path == '/api/app-info':
            self.send_json_response({'interface': 'default', 'version': '2.0.2'})
        elif path in ('/redesign', '/redesign/'):
            query_string = urllib.parse.urlsplit(self.path).query
            self.send_response(302)
            self.send_header('Location', '/' + ('?' + query_string if query_string else ''))
            self.send_header('Content-Length', '0')
            self.end_headers()
        elif path in ('/classic', '/classic/'):
            self.serve_html()
        elif path in ('/', '/index.html') and query.get('host') != ['1']:
            self.serve_editor()
        elif path == '/api/show-library':
            try:
                self.send_json_response(self.get_show_library().read())
            except (ValueError, OSError):
                self.send_show_error(500, 'Could not read the saved show library. Download your draft before retrying.')
        elif path in ('/redesign/style.css', '/redesign/presentation.js', '/redesign/transition-preview.js', '/redesign/show-models.js', '/redesign/show-builder.js', '/redesign/show-builder.css'):
            name = path.rsplit('/', 1)[1]
            self.send_asset((ASSETS / name).read_bytes(), 'text/css' if name.endswith('.css') else 'text/javascript')
        else:
            super().do_GET()

    def get_show_library(self):
        return SHOW_LIBRARY

    def serve_editor(self):
        source = (ROOT / 'index.html').read_text()
        source = source.replace('<html lang="en">', '<html lang="en" class="redesign">', 1)
        source = source.replace('</head>', '<link id="redesignStyles" rel="stylesheet" href="/redesign/style.css"><link rel="stylesheet" href="/redesign/show-builder.css"></head>', 1)
        source = source.replace('</body>', '<script src="/redesign/presentation.js"></script><script src="/redesign/transition-preview.js"></script><script src="/redesign/show-models.js"></script><script src="/redesign/show-builder.js"></script></body>', 1)
        self.send_asset(source.encode(), 'text/html; charset=utf-8')

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
            self.send_json_response(self.get_show_library().save(payload))
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
