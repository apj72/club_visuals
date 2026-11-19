"""Model library persistence and concurrent Mac/iPad saves use temporary data."""
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch
import launch
from show_store import ShowLibrary


class ShowStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='club-show-store-')
        self.store = ShowLibrary(Path(self.temp.name) / 'models.json')
        self.patch = patch.object(launch, 'SHOW_LIBRARY', self.store)
        self.patch.start()
        self.httpd = launch.v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
        self.origin = f'http://127.0.0.1:{self.httpd.server_port}'
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.library = {'version': 1, 'bricks': [{'id': 'brick', 'name': 'Mirror'}], 'models': [{'id': 'show', 'name': 'Three hours'}], 'profiles': [{'id': 'dj', 'name': 'DJ One'}]}

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.patch.stop()
        self.temp.cleanup()

    def request(self, data=None):
        req = urllib.request.Request(self.origin + '/api/show-library', data=None if data is None else json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=5) as response:
            return json.load(response)

    def test_shared_library_survives_restart_without_writing_playlists(self):
        self.assertEqual(self.request(), {'revision': 0, 'library': None})
        result = self.request({'revision': 0, 'library': self.library})
        self.assertEqual(result['revision'], 1)
        self.assertEqual(ShowLibrary(self.store.path).read(), result)
        self.assertEqual(list(Path(self.temp.name).iterdir()), [self.store.path])

    def test_stale_screen_gets_conflict_and_saved_changes_survive(self):
        first = self.request({'revision': 0, 'library': self.library})
        self.library['profiles'][0]['name'] = 'Another DJ'
        with self.assertRaises(urllib.error.HTTPError) as error:
            self.request({'revision': 0, 'library': self.library})
        self.assertEqual(error.exception.code, 409)
        self.assertIn('another screen', json.load(error.exception)['error'])
        self.assertEqual(self.request(), first)

    def test_malformed_library_is_rejected_without_creating_file(self):
        for data in ({}, {'revision': 0, 'library': {'version': 999}}, {'revision': 0, 'library': {**self.library, 'models': 'wrong'}}):
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.request(data)
            self.assertEqual(error.exception.code, 400)
        self.assertFalse(self.store.path.exists())

    def test_concurrent_first_save_has_only_one_winner(self):
        results = []
        def save():
            try:
                results.append(self.request({'revision': 0, 'library': self.library})['revision'])
            except urllib.error.HTTPError as error:
                results.append(error.code)
        threads = [threading.Thread(target=save) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        self.assertCountEqual(results, [1, 409])


if __name__ == '__main__':
    unittest.main()
