"""Integration checks for isolation and additive routes, in a child process."""
import pytest
import json
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request
import urllib.error

ROOT = Path(__file__).parent


@pytest.mark.parametrize("playout", [False, True])
def test_read_only_trial_and_legacy_routes(tmp_path, playout):
    data = tmp_path / 'data'
    runtime = tmp_path / 'runtime'
    (data / 'media').mkdir(parents=True)
    media = data / 'media/fixture.mp4'
    media.write_bytes(b'original fixture')
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    process = subprocess.Popen([sys.executable, 'scripts/run-ui-preview.py',
        '--port', str(port), '--data-root', str(data), '--runtime-root', str(runtime)] + (['--enable-playout'] if playout else []),
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    base = f'http://127.0.0.1:{port}'

    def request(path, method='GET', body=None):
        req = urllib.request.Request(base+path, data=body, method=method)
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    try:
        for _ in range(100):
            if process.poll() is not None:
                raise AssertionError(process.stderr.read().decode())
            try:
                if request('/api/ui-preview-info')[0] == 200:
                    break
            except OSError:
                time.sleep(.05)
        else:
            raise AssertionError('Server failed to start')
        assert request('/')[1] == (ROOT/'index.html').read_bytes()
        assert request('/?host=1')[1] == (ROOT/'index.html').read_bytes()
        assert request('/output')[1] == (ROOT/'output.html').read_bytes()
        assert request('/ui-v2/')[0] == 200
        assert request('/ui-v2/app.js?v=1')[0] == 200
        assert request('/ui-v2/?host=1')[0] == 400
        assert request('/ui-v2/../../.cookies.txt')[0] == 404
        assert json.loads(request('/api/videos')[1])[0]['filename'] == 'fixture.mp4'
        before = (data/'config.json').read_bytes()
        for path in ['/api/config','/api/library-catalog','/download','/api/convert'] + ([] if playout else ['/api/output-window','/api/control-session']):
            assert request(path, 'POST', b'{}')[0] == 403
        assert request('/api/video/fixture.mp4', 'DELETE')[0] == 403
        assert request('/api/browse?path=/')[0] == 403
        if playout:
            code, body = request('/api/control-session', 'POST', b'{"action":"claim","id":"test-controller"}')
            assert code == 200 and json.loads(body)['allowed']
            code, _ = request('/api/remote-status', 'POST', b'{"role":"host","id":"test-host"}')
            assert code == 200
            assert json.loads(request('/api/remote-status')[1])['host']['connected']
            code, _ = request('/api/remote-command', 'POST', b'{"id":"test-command","action":"stop","controllerId":"test-controller"}')
            assert code == 200
            assert request('/api/remote-command', 'POST', b'{"id":"stale","action":"stop","controllerId":"wrong"}')[0] == 423
        assert media.read_bytes() == b'original fixture'
        assert (data/'config.json').read_bytes() == before
        (data/'media/escape.mp4').symlink_to(ROOT/'index.html')
        assert request('/video/escape.mp4')[0] == 403
    finally:
        process.terminate()
        process.wait(timeout=5)


def test_production_port_refused(tmp_path):
    result = subprocess.run([sys.executable, 'scripts/run-ui-preview.py', '--port','8008',
        '--data-root',str(tmp_path/'data'),'--runtime-root',str(tmp_path/'runtime')],
        cwd=ROOT, capture_output=True)
    assert result.returncode == 2
    assert b'other than 8008' in result.stderr
