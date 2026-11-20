"""Verify the default editor, compatibility links and resident-engine contracts."""
import importlib.util
from pathlib import Path
import threading
import unittest
import urllib.request
from unittest.mock import patch
import json

spec = importlib.util.spec_from_file_location('redesign_launch', Path(__file__).with_name('launch.py'))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class PresentationRoutes(unittest.TestCase):
    handler = launcher.v1.Handler
    @classmethod
    def setUpClass(cls):
        cls.httpd = launcher.v1.ThreadedHTTPServer(('127.0.0.1', 0), cls.handler)
        cls.origin = f'http://127.0.0.1:{cls.httpd.server_port}'
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.httpd.shutdown()
        cls.httpd.server_close()

    def get(self, path):
        with urllib.request.urlopen(self.origin + path, timeout=5) as response:
            return response.read()

    def test_classic_and_resident_engine_are_byte_identical(self):
        expected = launcher.v1.HTML_FILE.read_bytes()
        for path in ('/classic', '/classic/?remote=1', '/?host=1', '/index.html?host=1'):
            with self.subTest(path=path):
                self.assertEqual(self.get(path), expected)

    def test_output_and_controller_documents_are_original(self):
        for path, source in (('/output', 'output.html'), ('/effects', 'effects.html'), ('/vfx', 'vfx.html')):
            with self.subTest(path=path):
                self.assertEqual(self.get(path), (launcher.ROOT / source).read_bytes())

    def test_redesign_is_original_document_with_only_presentation_injection(self):
        variant = self.get('/?remote=1').decode()
        variant = variant.replace('<html lang="en" class="redesign">', '<html lang="en">', 1)
        variant = variant.replace('<link id="redesignStyles" rel="stylesheet" href="/redesign/style.css">', '', 1)
        variant = variant.replace('<script src="/redesign/presentation.js"></script>', '', 1)
        variant = variant.replace('<script src="/redesign/transition-preview.js"></script>', '', 1)
        variant = variant.replace('<script src="/redesign/show-models.js"></script><script src="/redesign/show-builder.js"></script>', '', 1)
        variant = variant.replace('<link rel="stylesheet" href="/redesign/show-builder.css">', '', 1)
        self.assertEqual(variant, launcher.v1.HTML_FILE.read_text())

    def test_resident_engine_cannot_accidentally_load_the_skin(self):
        self.assertEqual(self.get('/redesign?host=1'), launcher.v1.HTML_FILE.read_bytes())

    def test_assets_are_explicit_and_renderer_is_original(self):
        self.assertEqual(self.get('/redesign/presentation.js'), (launcher.ASSETS / 'presentation.js').read_bytes())
        self.assertEqual(self.get('/redesign/style.css'), (launcher.ASSETS / 'style.css').read_bytes())
        self.assertEqual(self.get('/redesign/transition-preview.js'), (launcher.ASSETS / 'transition-preview.js').read_bytes())
        for name in ('show-models.js', 'show-builder.js', 'show-builder.css'):
            self.assertEqual(self.get('/redesign/' + name), (launcher.ASSETS / name).read_bytes())
        self.assertEqual(self.get('/vfx_engine.js'), (launcher.ROOT / 'vfx_engine.js').read_bytes())

    def test_ipad_links_offer_the_new_ui_with_the_actual_port(self):
        with patch('network_links.local_addresses', return_value=[{'interface':'en0', 'address':'192.168.2.10'}]):
            result = json.loads(self.get('/api/ipad-links'))
        self.assertEqual(result['addresses'][0]['urls']['redesign'],
                         f'http://192.168.2.10:{self.httpd.server_port}/?remote=1')

    def test_all_editor_entry_points_are_the_same(self):
        expected = self.get('/')
        for path in ('/index.html', '/?remote=1', '/redesign', '/redesign/'):
            with self.subTest(path=path):
                self.assertEqual(self.get(path), expected)

    def test_old_bookmarks_redirect_and_preserve_parameters(self):
        # urllib follows redirects, so inspect the actual final URL as well.
        with urllib.request.urlopen(self.origin + '/redesign/?remote=1&view=quad') as response:
            self.assertEqual(response.geturl(), self.origin + '/?remote=1&view=quad')
            self.assertIn(b'class="redesign"', response.read())

    def test_startup_identity_marks_complete_application(self):
        self.assertEqual(json.loads(self.get('/api/app-info')),
                         {'interface': 'default', 'version': '2.0.2'})


class CompatibilityLauncherRoutes(PresentationRoutes):
    handler = launcher.RedesignHandler


if __name__ == '__main__':
    unittest.main()
