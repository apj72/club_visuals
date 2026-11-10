import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from unittest.mock import patch

from library_catalog import LibraryCatalog, CatalogConflict
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

    def test_rename_merges_labels_and_undo_restores_exact_entries(self):
        self.catalogue.update('a.mp4', {'themes':['Portrait','People'],'colours':['Blue'],'notes':'Keep this note','reviewed':True})
        self.catalogue.update('b.mp4', {'themes':['portrait'],'types':['3D animation'],'reviewed':False})
        original=self.catalogue.read()
        revision=self.catalogue.snapshot()['revision']
        result=self.catalogue.manage({'action':'rename','field':'themes','tag':'Portrait','newTag':'people','expectedRevision':revision},{'a.mp4','b.mp4'})
        self.assertEqual(result['changed'],2)
        for entry in self.catalogue.read().values():self.assertEqual(entry['themes'],['People'])
        self.assertEqual(self.catalogue.read()['a.mp4']['notes'],'Keep this note')
        self.assertTrue(self.catalogue.read()['a.mp4']['reviewed'])
        self.assertTrue(self.catalogue.snapshot()['undoAvailable'])
        self.catalogue.manage({'action':'undo','expectedRevision':result['revision']},{'a.mp4','b.mp4'})
        self.assertEqual(self.catalogue.read(),original)
        self.assertFalse(self.catalogue.snapshot()['undoAvailable'])

    def test_stale_edits_and_stale_undo_do_not_overwrite_corrections(self):
        self.catalogue.update('a.mp4',{'themes':['Abstract']})
        stale=self.catalogue.snapshot()['revision']
        self.catalogue.update('a.mp4',{'themes':['Animals']},expected_revision=stale)
        original=self.catalogue.path.read_bytes()
        with self.assertRaises(CatalogConflict):self.catalogue.update('a.mp4',{'themes':['Wrong']},expected_revision=stale)
        with self.assertRaises(CatalogConflict):self.catalogue.manage({'action':'undo','expectedRevision':stale},{'a.mp4'})
        self.assertEqual(self.catalogue.path.read_bytes(),original)

    def test_bulk_failure_is_atomic_and_does_not_change_undo(self):
        self.catalogue.update('a.mp4',{'themes':['One']})
        self.catalogue.update('b.mp4',{'themes':[str(i) for i in range(12)]})
        snapshot=self.catalogue.snapshot();original=self.catalogue.path.read_bytes()
        with self.assertRaises(ValueError):self.catalogue.manage({'action':'bulk','mode':'add','field':'themes','tag':'Extra','filenames':['a.mp4','b.mp4'],'expectedRevision':snapshot['revision']},{'a.mp4','b.mp4'})
        self.assertEqual(self.catalogue.path.read_bytes(),original)
        self.assertEqual(self.catalogue.snapshot()['undoLabel'],snapshot['undoLabel'])

    def test_remove_is_scoped_to_category_and_current_library(self):
        for name in ('a.mp4','b.mp4','deleted.mp4'):self.catalogue.update(name,{'themes':['Blue'],'colours':['Blue'],'notes':'Keep'})
        result=self.catalogue.manage({'action':'delete','field':'colours','tag':'blue','expectedRevision':self.catalogue.snapshot()['revision']},{'a.mp4','b.mp4'})
        self.assertEqual(result['changed'],2)
        self.assertEqual(self.catalogue.read()['a.mp4']['themes'],['Blue'])
        self.assertEqual(self.catalogue.read()['a.mp4']['colours'],[])
        self.assertEqual(self.catalogue.read()['deleted.mp4']['colours'],['Blue'])

    def test_bulk_review_and_removal_preserve_unselected_videos(self):
        for name in ('a.mp4','b.mp4'):self.catalogue.update(name,{'themes':['Abstract'],'reviewed':False})
        self.catalogue.manage({'action':'review','reviewed':True,'filenames':['a.mp4'],'expectedRevision':self.catalogue.snapshot()['revision']},{'a.mp4','b.mp4'})
        self.assertTrue(self.catalogue.read()['a.mp4']['reviewed'])
        self.assertFalse(self.catalogue.read()['b.mp4']['reviewed'])
        self.catalogue.manage({'action':'bulk','mode':'remove','field':'themes','tag':'Abstract','filenames':['a.mp4'],'expectedRevision':self.catalogue.snapshot()['revision']},{'a.mp4','b.mp4'})
        self.assertEqual(self.catalogue.read()['a.mp4']['themes'],[])
        self.assertEqual(self.catalogue.read()['b.mp4']['themes'],['Abstract'])

    def test_legacy_catalogue_loads_with_revision_zero(self):
        self.catalogue.path.write_text(json.dumps({'version':1,'videos':{'a.mp4':{'themes':['Abstract']}}}))
        self.assertEqual(self.catalogue.snapshot()['revision'],0)
        self.catalogue.manage({'action':'rename','field':'themes','tag':'Abstract','newTag':'Geometric','expectedRevision':0},{'a.mp4'})
        self.assertEqual(self.catalogue.snapshot()['revision'],1)

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
                    snapshot=json.load(response)
                    self.assertEqual(snapshot['videos']['clip.mp4']['colours'], ['Purple'])
                request=urllib.request.Request(origin+'/api/library-catalog/manage',data=json.dumps({'action':'rename','field':'colours','tag':'Purple','newTag':'Blue','expectedRevision':snapshot['revision']}).encode(),headers={'Content-Type':'application/json'})
                with urllib.request.urlopen(request) as response:self.assertEqual(json.load(response)['changed'],1)
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    save({'filename':'clip.mp4','colours':['Wrong'],'expectedRevision':snapshot['revision']})
                self.assertEqual(caught.exception.code,409)
                self.assertIn('another screen',json.load(caught.exception)['error'])
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    save({'filename':'../missing.mp4', 'themes':['Wrong']})
                self.assertEqual(caught.exception.code, 400)
            finally:
                httpd.shutdown()
                httpd.server_close()


if __name__ == '__main__':
    unittest.main()
