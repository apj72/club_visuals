import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

from library_catalog import LibraryCatalog
import server


class CatalogueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.catalogue = LibraryCatalog(self.root / 'catalog.json')

    def tearDown(self):
        self.temp.cleanup()

    def test_shared_tags_persist_and_other_entries_survive(self):
        self.catalogue.update('first.mp4', {'themes': ['Psychedelic', 'psychedelic'], 'colours': ['Blue'], 'types': ['3D animation']})
        self.catalogue.update('second.mp4', {'themes': ['Animals'], 'reviewed': False})
        saved = LibraryCatalog(self.catalogue.path).read()
        self.assertEqual(saved['first.mp4']['themes'], ['Psychedelic'])
        self.assertEqual(saved['first.mp4']['colours'], ['Blue'])
        self.assertTrue(saved['first.mp4']['reviewed'])
        self.assertFalse(saved['second.mp4']['reviewed'])

    def test_invalid_tags_and_corrupt_file_do_not_overwrite_data(self):
        for invalid in ({'themes': 'blue'}, {'types': ['x'*41]}, {'notes': 'x'*301}, {'reviewed': 'false'}, {'colours': ['']}, {'themes': ['x']*13}):
            with self.assertRaises(ValueError):
                self.catalogue.update('clip.mp4', invalid)
        self.catalogue.path.write_text('broken JSON')
        with self.assertRaises(ValueError):
            self.catalogue.update('clip.mp4', {'themes': ['Abstract']})
        self.assertEqual(self.catalogue.path.read_text(), 'broken JSON')

    def test_http_tag_edits_are_visible_to_another_client(self):
        (self.root / 'clip.mp4').write_bytes(b'fixture')
        with patch.object(server, 'get_download_dir', lambda: self.root), patch.object(server, 'LIBRARY_CATALOG', self.catalogue):
            httpd = server.ThreadedHTTPServer(('127.0.0.1', 0), server.Handler)
            threading.Thread(target=httpd.serve_forever, daemon=True).start()
            origin = f'http://127.0.0.1:{httpd.server_port}'
            def save(data):
                request = urllib.request.Request(origin+'/api/library-catalog', data=json.dumps(data).encode(), headers={'Content-Type':'application/json'})
                return urllib.request.urlopen(request)
            try:
                with save({'filename':'clip.mp4', 'themes':['Abstract'], 'colours':['Purple'], 'types':['3D animation'], 'source':'forged'}) as response:
                    self.assertTrue(json.load(response)['ok'])
                with urllib.request.urlopen(origin+'/api/videos') as response:
                    data = json.load(response)
                    self.assertEqual(data[0]['catalog']['themes'], ['Abstract'])
                    self.assertEqual(data[0]['catalog']['source'], 'manual')
                with urllib.request.urlopen(origin+'/api/library-catalog') as response:
                    self.assertEqual(json.load(response)['videos']['clip.mp4']['colours'], ['Purple'])
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    save({'filename':'../missing.mp4', 'themes':['Wrong']})
                self.assertEqual(caught.exception.code, 400)
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == '__main__':
    unittest.main()
