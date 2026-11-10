"""Exercise remote routing, host ownership, and reconnect safety over HTTP."""
import json
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

import server


class RemoteControlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.httpd = server.ThreadedHTTPServer(('127.0.0.1', 0), server.Handler)
        cls.origin = f'http://127.0.0.1:{cls.httpd.server_port}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def setUp(self):
        with server.STATE_LOCK:
            server.REMOTE_STATUS.clear()
            server.STATE_SNAPSHOT.clear()
            server.CONTROL_SESSION.update(owner=None, seen=0, revoked=set())

    def post(self, path, data):
        request = urllib.request.Request(self.origin + path, data=json.dumps(data).encode(),
                                        headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=3) as response:
            return json.load(response)

    def get(self, path):
        with urllib.request.urlopen(self.origin + path, timeout=3) as response:
            return response.read()

    def test_engine_pages_and_script(self):
        self.assertIn(b'isMacEngine', self.get('/?host=1'))
        self.assertIn(b'macEnginePanel', self.get('/output'))
        self.assertIn(b'PRIVATE PREVIEW', self.get('/remote_control.js'))

    def test_fullscreen_controls_mac_window_without_browser_gesture(self):
        with patch.object(server.MAC_OUTPUT, 'set_fullscreen', return_value={'connected': True, 'fullscreen': True}) as control:
            result = self.post('/api/output-window', {'enabled': True})
            self.assertTrue(result['fullscreen'])
            control.assert_called_once_with(True)
        with patch.object(server.MAC_OUTPUT, 'set_fullscreen', side_effect=RuntimeError('Mac window unavailable')):
            with self.assertRaises(urllib.error.HTTPError) as caught:
                self.post('/api/output-window', {'enabled': False})
            self.assertEqual(caught.exception.code, 503)
            self.assertEqual(json.load(caught.exception)['error'], 'Mac window unavailable')

    def test_remote_handover_does_not_silently_reclaim_after_mac_exit(self):
        first = self.post('/api/control-session', {'action': 'heartbeat', 'id': 'ipad'})
        self.assertTrue(first['allowed'])
        self.assertEqual(json.loads(self.get('/api/remote-status'))['control']['owner'], 'ipad')
        self.post('/api/control-session', {'action': 'release'})
        for _ in range(2):
            state = self.post('/api/control-session', {'action': 'heartbeat', 'id': 'ipad'})
            self.assertFalse(state['remote'])
            self.assertFalse(state['allowed'])
        self.assertTrue(self.post('/api/control-session', {'action': 'claim', 'id': 'ipad'})['allowed'])

    def test_disconnected_tablet_releases_mac_and_second_tablet_waits(self):
        self.post('/api/control-session', {'action': 'heartbeat', 'id': 'ipad'})
        second = self.post('/api/control-session', {'action': 'heartbeat', 'id': 'second'})
        self.assertFalse(second['allowed'])
        server.CONTROL_SESSION['seen'] -= 9
        self.assertFalse(json.loads(self.get('/api/remote-status'))['control']['remote'])
        self.assertTrue(self.post('/api/control-session', {'action': 'heartbeat', 'id': 'second'})['allowed'])

    def test_commands_follow_control_owner_and_reject_revoked_controller(self):
        self.post('/api/remote-status', {'role': 'host', 'id': 'engine'})
        self.post('/api/control-session', {'action': 'heartbeat', 'id': 'ipad'})
        command = {'action': 'stop', 'id': 'stop-1'}
        with self.assertRaises(urllib.error.HTTPError) as caught:
            self.post('/api/remote-command', command)
        self.assertEqual(caught.exception.code, 423)
        self.assertTrue(self.post('/api/remote-command', {**command, 'controllerId': 'ipad'})['ok'])
        self.post('/api/control-session', {'action': 'release'})
        with self.assertRaises(urllib.error.HTTPError) as caught:
            self.post('/api/remote-command', {**command, 'controllerId': 'ipad'})
        self.assertEqual(caught.exception.code, 423)
        self.assertTrue(self.post('/api/remote-command', command)['ok'])

    def test_output_can_be_opened_from_locked_mac_without_changing_fullscreen(self):
        self.post('/api/control-session', {'action': 'heartbeat', 'id': 'ipad'})
        with patch.object(server.MAC_OUTPUT, 'open', return_value={'connected': True, 'fullscreen': True}) as open_window:
            with patch.object(server.MAC_OUTPUT, 'set_fullscreen') as fullscreen:
                result = self.post('/api/output-window', {'operation': 'open'})
                self.assertTrue(result['fullscreen'])
                open_window.assert_called_once()
                fullscreen.assert_not_called()
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    self.post('/api/output-window', {'enabled': False})
                self.assertEqual(caught.exception.code, 423)

    def test_offline_and_expired_host_reject_commands(self):
        command = {'action': 'stop', 'id': 'one'}
        for expired in (False, True):
            if expired:
                server.REMOTE_STATUS['host'] = {'id': 'old', 'seen': time.time() - 10}
            with self.assertRaises(urllib.error.HTTPError) as caught:
                self.post('/api/remote-command', command)
            self.assertEqual(caught.exception.code, 409)

    def test_single_host_and_takeover(self):
        self.post('/api/remote-status', {'role': 'host', 'id': 'first'})
        with self.assertRaises(urllib.error.HTTPError) as caught:
            self.post('/api/remote-status', {'role': 'host', 'id': 'second'})
        self.assertEqual(caught.exception.code, 409)
        server.REMOTE_STATUS['host']['seen'] -= 10
        self.post('/api/remote-status', {'role': 'host', 'id': 'second'})
        status = json.loads(self.get('/api/remote-status'))
        self.assertTrue(status['host']['connected'])
        self.assertEqual(status['host']['id'], 'second')

    def test_command_delivery_is_live_and_never_replayed(self):
        self.post('/api/remote-status', {'role': 'host', 'id': 'mac'})
        stream = urllib.request.urlopen(self.origin + '/api/state-stream', timeout=3)
        try:
            self.post('/api/remote-command', {'action': 'stop', 'id': 'stop-1'})
            line = stream.readline()
            while not line.startswith(b'data: '):
                line = stream.readline()
            command = json.loads(line[6:])
            self.assertEqual(command['hostId'], 'mac')
            self.assertEqual(command['id'], 'stop-1')
            self.post('/api/state', {'type': 'outputFullscreen', 'enabled': True})
            self.assertEqual(json.loads(self.get('/api/state-snapshot')), [])
        finally:
            stream.close()

    def test_reconnect_restores_latest_transport_and_discards_old_seek(self):
        for command in ({'type': 'loadVideo', 'filename': 'a.mp4'},
                        {'type': 'play'}, {'type': 'seek', 'time': 12},
                        {'type': 'pause'}, {'type': 'loadVideo', 'filename': 'b.mp4'},
                        {'type': 'play'}):
            self.post('/api/state', command)
        snapshot = json.loads(self.get('/api/state-snapshot'))
        self.assertEqual(snapshot, [{'type': 'loadVideo', 'filename': 'b.mp4'}, {'type': 'play'}])


if __name__ == '__main__':
    unittest.main()
