"""Control a dedicated Chromium playout window through its local DevTools socket.

Only the app's separate browser profile is controlled; personal browser windows
and profiles are never attached to or restarted. No third-party Python modules.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import threading
import time
import urllib.parse
import urllib.request


class MacOutput:
    def __init__(self, root, port):
        self.root = Path(root)
        self.url = f'http://localhost:{port}/output?managed=1'
        self.profile = self.root / '.runtime' / 'playout-browser'
        self.process = None
        self.lock = threading.Lock()
        self.cached = {'connected': False, 'fullscreen': False}
        self.checked = 0

    def _socket_url(self):
        lines = (self.profile / 'DevToolsActivePort').read_text().splitlines()
        return f'ws://127.0.0.1:{int(lines[0])}{lines[1]}'

    @staticmethod
    def _read(sock, count):
        result = b''
        while len(result) < count:
            part = sock.recv(count - len(result))
            if not part:
                raise ConnectionError('Mac output connection closed')
            result += part
        return result

    def _call(self, method, params=None):
        url = urllib.parse.urlsplit(self._socket_url())
        with socket.create_connection((url.hostname, url.port), timeout=3) as sock:
            key = base64.b64encode(os.urandom(16)).decode()
            request = (f'GET {url.path} HTTP/1.1\r\nHost: {url.hostname}:{url.port}\r\n'
                       f'Upgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\n'
                       'Sec-WebSocket-Version: 13\r\n\r\n')
            sock.sendall(request.encode())
            header = b''
            while not header.endswith(b'\r\n\r\n'):
                header += self._read(sock, 1)
                if len(header) > 16384:
                    raise ConnectionError('Invalid output handshake')
            accept = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest())
            if b' 101 ' not in header.split(b'\r\n')[0] or accept not in header:
                raise ConnectionError('Mac output handshake failed')
            payload = json.dumps({'id': 1, 'method': method, 'params': params or {}}).encode()
            mask = os.urandom(4)
            prefix = bytes([0x81, 0x80 | len(payload)]) if len(payload) < 126 else bytes([0x81, 0xFE]) + struct.pack('!H', len(payload))
            sock.sendall(prefix + mask + bytes(byte ^ mask[i % 4] for i, byte in enumerate(payload)))
            while True:
                first, second = self._read(sock, 2)
                size = second & 127
                if size == 126:
                    size = struct.unpack('!H', self._read(sock, 2))[0]
                elif size == 127:
                    size = struct.unpack('!Q', self._read(sock, 8))[0]
                if size > 16 * 1024 * 1024:
                    raise ConnectionError('Output response too large')
                data = self._read(sock, size)
                if first & 15 == 8:
                    raise ConnectionError('Output socket closed')
                if first & 15 != 1:
                    continue
                result = json.loads(data)
                if result.get('id') == 1:
                    if 'error' in result:
                        raise RuntimeError(result['error'].get('message', 'Output command failed'))
                    return result.get('result', {})

    def _window(self):
        targets = self._call('Target.getTargets')['targetInfos']
        target = next((target for target in targets if target['type'] == 'page' and target['url'] == self.url), None)
        if not target:
            raise RuntimeError('Dedicated Mac output window is closed')
        return {**self._call('Browser.getWindowForTarget', {'targetId': target['targetId']}), 'targetId': target['targetId']}

    def _ensure_open(self):
        try:
            return self._window()
        except (OSError, ValueError, RuntimeError, ConnectionError, StopIteration):
            pass
        browser = next((path for path in (
            '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge') if Path(path).is_file()), None)
        if not browser:
            raise RuntimeError('Install Brave, Chrome, or Edge on the Mac for remote fullscreen.')
        self.profile.mkdir(parents=True, exist_ok=True)
        self.process = subprocess.Popen([browser, f'--user-data-dir={self.profile}', '--remote-debugging-port=0',
            '--remote-debugging-address=127.0.0.1', '--no-first-run', '--no-default-browser-check',
            '--autoplay-policy=no-user-gesture-required', f'--app={self.url}'],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            try:
                return self._window()
            except (OSError, ValueError, RuntimeError, ConnectionError):
                time.sleep(.2)
        raise RuntimeError('Mac playout window did not start. Check the Mac browser installation.')

    def open(self):
        with self.lock:
            window = self._ensure_open()
            self._call('Target.activateTarget', {'targetId': window['targetId']})
            self.cached = {'connected': True, 'fullscreen': window['bounds']['windowState'] == 'fullscreen'}
            self.checked = time.monotonic()
            return dict(self.cached)

    def set_fullscreen(self, enabled):
        with self.lock:
            window = self._ensure_open()
            desired = 'fullscreen' if enabled else 'normal'
            self._call('Browser.setWindowBounds', {'windowId': window['windowId'], 'bounds': {'windowState': desired}})
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:
                bounds = self._call('Browser.getWindowBounds', {'windowId': window['windowId']})['bounds']
                if bounds['windowState'] == desired:
                    self.cached = {'connected': True, 'fullscreen': enabled}
                    self.checked = time.monotonic()
                    return self.cached
                time.sleep(.15)
            raise RuntimeError('Mac window did not confirm fullscreen state.')

    def status(self):
        with self.lock:
            if time.monotonic() - self.checked > 1:
                try:
                    window = self._window()
                    self.cached = {'connected': True, 'fullscreen': window['bounds']['windowState'] == 'fullscreen'}
                except (OSError, ValueError, RuntimeError, ConnectionError):
                    self.cached = {'connected': False, 'fullscreen': False}
                self.checked = time.monotonic()
            return dict(self.cached)
