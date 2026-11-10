"""Safari byte-range delivery and actual VP9 -> H.264 preview conversion."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

import server
from media_preview import PreviewCache


class MediaDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'clip.mp4').write_bytes(b'0123456789')
        self.download_patch = patch.object(server, 'get_download_dir', lambda: self.root)
        self.download_patch.start()
        self.httpd = server.ThreadedHTTPServer(('127.0.0.1', 0), server.Handler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.origin = f'http://127.0.0.1:{self.httpd.server_port}'

    def tearDown(self):
        self.httpd.shutdown()
        self.httpd.server_close()
        self.download_patch.stop()
        self.temp.cleanup()

    def test_safari_initial_probe_and_seek_ranges(self):
        for value, expected, content_range in (
                ('bytes=0-1', b'01', 'bytes 0-1/10'),
                ('bytes=6-', b'6789', 'bytes 6-9/10'),
                ('bytes=-3', b'789', 'bytes 7-9/10'),
                ('bytes=8-99', b'89', 'bytes 8-9/10')):
            request = urllib.request.Request(self.origin + '/video/clip.mp4', headers={'Range': value})
            with urllib.request.urlopen(request) as response:
                self.assertEqual(response.status, 206)
                self.assertEqual(response.headers['Content-Range'], content_range)
                self.assertEqual(int(response.headers['Content-Length']), len(expected))
                self.assertEqual(response.read(), expected)

    def test_complete_download_and_invalid_ranges(self):
        with urllib.request.urlopen(self.origin + '/video/clip.mp4') as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.read(), b'0123456789')
        for value in ('bytes=10-', 'bytes=8-2', 'bytes=-0', 'bytes=-', 'bytes=0-1,5-6'):
            request = urllib.request.Request(self.origin + '/video/clip.mp4', headers={'Range': value})
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(request)
            self.assertEqual(caught.exception.code, 416)
            self.assertEqual(caught.exception.headers['Content-Range'], 'bytes */10')

    def test_cached_preview_ranges_and_path_validation(self):
        cache = PreviewCache(self.root, lambda: None)
        name = 'a' * 64 + '.mp4'
        (self.root / name).write_bytes(b'abcdefghij')
        with patch.object(server, 'PREVIEW_CACHE', cache):
            request = urllib.request.Request(self.origin + '/preview-video/' + name, headers={'Range': 'bytes=0-1'})
            with urllib.request.urlopen(request) as response:
                self.assertEqual(response.status, 206)
                self.assertEqual(response.read(), b'ab')
            with self.assertRaises(urllib.error.HTTPError) as caught:
                urllib.request.urlopen(self.origin + '/preview-video/clip.mp4')
            self.assertEqual(caught.exception.code, 404)


class PreviewConversionTests(unittest.TestCase):
    def test_actual_vp9_conversion_is_cached_and_preserves_original(self):
        ffmpeg = server.find_working_ffmpeg()
        if not ffmpeg:
            self.skipTest('ffmpeg unavailable')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source = root / 'vp9.mp4'
            subprocess.run([ffmpeg, '-nostdin', '-v', 'error', '-f', 'lavfi', '-i',
                'testsrc2=size=120x160:rate=12', '-t', '0.5', '-c:v', 'libvpx-vp9',
                '-pix_fmt', 'yuv420p', str(source)], check=True, timeout=20)
            original = hashlib.sha256(source.read_bytes()).hexdigest()
            cache = PreviewCache(root / 'cache', lambda: ffmpeg)
            deadline = time.monotonic() + 30
            result = cache.request(source)
            while not result.get('ready') and not result.get('error') and time.monotonic() < deadline:
                time.sleep(.1)
                result = cache.request(source)
            self.assertTrue(result.get('ready'), result)
            self.assertEqual(cache.request(source), result)
            info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                'stream=codec_name,pix_fmt', '-of', 'json', result['path']]))
            self.assertEqual(info['streams'][0]['codec_name'], 'h264')
            self.assertEqual(info['streams'][0]['pix_fmt'], 'yuv420p')
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), original)


if __name__ == '__main__':
    unittest.main()
