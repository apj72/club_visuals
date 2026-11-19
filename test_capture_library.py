"""Capture imports preserve exports, avoid duplicate copies and reject unsafe names."""
from pathlib import Path
import tempfile
import unittest
from capture_library import import_capture, list_captures


class CaptureLibraryTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.clips = self.root / 'clips'; self.clips.mkdir()
        self.library = self.root / 'library'
        self.name = 'instagram_9x16_20261116_235951_411938000.mp4'
        self.source = self.clips / self.name
        self.source.write_bytes(b'exported video')

    def test_import_retains_original_and_is_idempotent(self):
        result = import_capture(self.clips, self.library, self.name)
        destination = self.library / result['filename']
        self.assertTrue(result['added'])
        self.assertEqual(destination.read_bytes(), self.source.read_bytes())
        self.assertEqual(import_capture(self.clips, self.library, self.name), {**result, 'added': False})
        self.assertEqual(len(list(self.library.iterdir())), 1)

    def test_same_folder_import_and_listing(self):
        result = import_capture(self.clips, self.clips, self.name)
        self.assertTrue(result['added'])
        self.assertEqual([p['filename'] for p in list_captures(self.clips)], [self.name])
        self.assertTrue((self.clips / result['filename']).is_file())

    def test_existing_different_video_is_preserved(self):
        self.library.mkdir()
        destination = self.library / ('capture_' + self.name)
        destination.write_bytes(b'existing video')
        with self.assertRaises(FileExistsError): import_capture(self.clips, self.library, self.name)
        self.assertEqual(destination.read_bytes(), b'existing video')
        self.assertEqual(self.source.read_bytes(), b'exported video')

    def test_unsafe_names_and_missing_files_are_rejected(self):
        for name in ('../' + self.name, str(self.source), 'video.mp4', 'instagram_bad.webm', None, ''):
            with self.subTest(name=name), self.assertRaises(ValueError):
                import_capture(self.clips, self.library, name)
        with self.assertRaises(FileNotFoundError):
            import_capture(self.clips, self.library, 'instagram_missing.mp4')

    def test_symlink_sources_and_targets_are_rejected(self):
        outside = self.root / 'outside.mp4'; outside.write_bytes(b'outside')
        alias = self.clips / 'facebook_alias.mp4'; alias.symlink_to(outside)
        self.assertNotIn(alias.name, [p['filename'] for p in list_captures(self.clips)])
        with self.assertRaises(FileNotFoundError): import_capture(self.clips, self.library, alias.name)
        self.library.mkdir()
        (self.library / ('capture_' + self.name)).symlink_to(outside)
        with self.assertRaises(FileExistsError): import_capture(self.clips, self.library, self.name)
        self.assertEqual(outside.read_bytes(), b'outside')

    def test_missing_clip_folder_has_empty_list(self):
        self.assertEqual(list_captures(self.root / 'missing'), [])


if __name__ == '__main__': unittest.main()
