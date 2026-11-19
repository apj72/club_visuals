"""Browser regression for shared video ordering and folder reloads.

Uses isolated media/metadata and headless Chrome; never contacts the live server.
Run: python3 ui-redesign/check_library.py (developer Playwright required).
"""
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading

import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-library-check-'))
for name in ('media', 'thumbnails', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
source = min(v1.source_video_files(), key=lambda path: path.stat().st_size)

def add(name, modified):
    path = root / 'media' / name
    shutil.copyfile(source, path)
    os.utime(path, (modified, modified))

add('a-old.mp4', 1000)
add('z-new.mp4', 3000)
add('m-middle.mp4', 2000)
manual = ['a-old.mp4', 'm-middle.mp4', 'z-new.mp4']
config = root / 'config.json'
config.write_text(json.dumps({'download_dir': str(root / 'media')}))
v1.CONFIG_FILE = config
v1.THUMB_DIR = root / 'thumbnails'
v1.PLAYLIST_DIR = root / 'playlists'
v1.VIDEO_PRESET_DIR = root / 'presets'
v1.LIBRARY_ORDER_FILE = root / 'order.json'
v1.LIBRARY_ORDER_FILE.write_text(json.dumps(manual))
v1.LIBRARY_CATALOG = v1.LibraryCatalog(root / 'catalog.json')
v1.PREVIEW_CACHE = v1.PreviewCache(root / 'previews', v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = launch.ShowLibrary(root / 'models.json')
class Output:
    def status(self):
        return {'connected': False, 'fullscreen': False}
v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin + '/redesign#library', wait_until='domcontentloaded')
        page.wait_for_function('videoListCache.length === 3 && !!document.getElementById("sbGenerate")')
        def cards():
            return page.locator('#libraryGrid > .library-item').evaluate_all('(nodes) => nodes.map(n => n.dataset.filename)')
        def dropdown():
            return page.locator('.pl-video-option').evaluate_all('(nodes) => nodes.map(n => n.dataset.filename)')
        def choose(value):
            page.locator('#catalogSort').evaluate('(s, value) => {s.value=value;s.dispatchEvent(new Event("change", {bubbles:true}));}', value)
        newest = list(reversed(manual))
        assert cards() == dropdown() == newest
        page.evaluate('openAutoLibraryEditor()')
        assert page.locator('.auto-library-row span').all_text_contents() == ['z-new', 'm-middle', 'a-old']
        page.evaluate('document.getElementById("autoLibraryDialog").close()')
        page.evaluate('openTransitionAudition()')
        assert page.locator('#transitionAuditionTo option').evaluate_all('(nodes) => nodes.map(n => n.value)') == newest
        page.evaluate('closeTransitionAudition()')
        page.evaluate('openTagManager()')
        page.wait_for_function('tmState.snapshot.revision !== null')
        assert page.locator('.tm-video-info h3').all_text_contents() == [Path(name).stem for name in newest]
        page.evaluate('tagManager.close()')
        # A folder rescan preserves the current player and unsaved playlist.
        page.evaluate('plPlaylist.entries.push({video:"a-old.mp4", duration:{mode:"seconds",value:7}})')
        before = page.evaluate('({filename:currentFilename, src:video.src, entries:JSON.stringify(plPlaylist.entries)})')
        add('my-edit.mp4', 4000)
        page.locator('.rd-library-toolbar [data-reload-library]').click()
        page.wait_for_function('document.getElementById("libraryReloadStatus").textContent.includes("4 videos")')
        assert cards() == dropdown() == ['my-edit.mp4', *newest]
        assert page.evaluate('({filename:currentFilename, src:video.src, entries:JSON.stringify(plPlaylist.entries)})') == before
        assert page.evaluate('orderedLibraryVideos().map(v=>v.filename)') == cards()
        page.locator('.rd-nav [data-screen=builder]').click()
        assert page.locator('.sb-field select').evaluate_all('(nodes) => { const picks=nodes.filter(n=>[...n.options].some(o=>o.value==="my-edit.mp4")); return picks.length > 0 && picks.every(n=>n.options[1].value==="my-edit.mp4"); }')
        choose('manual')
        assert cards() == dropdown() == [*manual, 'my-edit.mp4']
        assert json.loads(v1.LIBRARY_ORDER_FILE.read_text()) == manual
        choose('name')
        assert cards() == dropdown() == sorted([*manual, 'my-edit.mp4'])
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('videoListCache.length === 4')
        assert page.evaluate('librarySort') == 'name'
        assert cards() == dropdown() == sorted([*manual, 'my-edit.mp4'])
        choose('newest')
        page.locator('.rd-nav [data-screen=library]').click()
        page.locator('#catalogSearch').fill('my-edit')
        page.locator('.rd-library-toolbar [data-reload-library]').click()
        page.wait_for_function('!libraryReloadPromise')
        assert page.locator('#catalogSearch').input_value() == 'my-edit'
        page.locator('#catalogClear').click()
        assert page.evaluate('librarySort') == 'newest'
        page.wait_for_function('document.querySelector("#catalogSort + .rd-select-trigger").textContent.includes("Newest first")')
        page.screenshot(path=str(root / 'library-desktop.png'))
        page.set_viewport_size({'width': 768, 'height': 1024})
        page.screenshot(path=str(root / 'library-ipad.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # Failed reload keeps the last good list and permits a retry.
        page.route('**/api/videos', lambda route: route.fulfill(status=500, body='{}'))
        page.locator('.rd-library-toolbar [data-reload-library]').click()
        page.wait_for_function('document.getElementById("libraryReloadStatus").textContent.startsWith("Could not")')
        assert len(cards()) == 4
        page.unroute('**/api/videos')
        for path in (root / 'media').glob('*.mp4'):
            path.unlink()
        page.locator('.rd-library-toolbar [data-reload-library]').click()
        page.wait_for_function('document.getElementById("libraryReloadStatus").textContent.includes("0 videos")')
        assert cards() == dropdown() == []
        assert page.locator('.rd-library-toolbar [data-reload-library]').is_visible()
        add('returned.mp4', 5000)
        page.locator('.rd-library-toolbar [data-reload-library]').click()
        page.wait_for_function('videoListCache.length === 1')
        assert cards() == dropdown() == ['returned.mp4']
        assert not errors, errors
        browser.close()
        print(f'PASS: shared ordering, persistence, reload, preview/playlist preservation, errors and empty folder. Screenshots: {root}')
finally:
    httpd.shutdown()
    httpd.server_close()
