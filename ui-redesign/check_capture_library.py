"""Check capture reuse through the shared and redesigned UI with isolated media."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-capture-library-'))
for folder in ('media', 'clips', 'thumbs', 'previews', 'presets', 'playlists'):
    (root / folder).mkdir()
subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i',
                'testsrc2=size=320x240:rate=30:duration=4', '-c:v', 'libx264', '-pix_fmt',
                'yuv420p', str(root / 'media' / 'source.mp4')], check=True)
name = 'instagram_9x16_20261116_235951_411938000.mp4'
shutil.copyfile(root / 'media' / 'source.mp4', root / 'clips' / name)
config = root / 'config.json'; config.write_text(json.dumps({'download_dir': str(root/'media'), 'instagram_clip_dir': str(root/'clips')}))
v1.CONFIG_FILE = config; v1.THUMB_DIR = root/'thumbs'; v1.PLAYLIST_DIR = root/'playlists'; v1.VIDEO_PRESET_DIR = root/'presets'
v1.LIBRARY_ORDER_FILE = root/'order.json'; v1.LIBRARY_CATALOG = v1.LibraryCatalog(root/'catalog.json')
v1.VIDEO_CUES = v1.VideoCues(root/'cues'); v1.PREVIEW_CACHE = v1.PreviewCache(root/'previews', v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = launch.ShowLibrary(root/'models.json')
class Output:
    def status(self): return {'connected': False, 'fullscreen': False}
v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE', root, flush=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        errors = []
        for url in ('/redesign#capture', '/'):
            page = browser.new_page(viewport={'width':1440, 'height':1050})
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.goto(origin+url, wait_until='domcontentloaded')
            page.wait_for_function('video.readyState>=2')
            if url == '/': page.evaluate('toggleInstagramCapturePanel()')
            page.wait_for_function('(name)=>[...document.getElementById("captureLibrarySelect").options].some(o=>o.value===name)', arg=name)
            page.locator('#captureLibrarySelect').evaluate('(select,name)=>{select.value=name;select.dispatchEvent(new Event("change",{bubbles:true}));}', name)
            if url.startswith('/redesign'):
                # The original export is not implicitly included.
                assert page.evaluate('videoListCache.length') == 1
            page.evaluate('plPlaylist.entries.push({video:"source.mp4",duration:{mode:"seconds",value:7}})')
            before = page.evaluate('({file:currentFilename,token:videoLoadToken,playlist:JSON.stringify(plPlaylist.entries)})')
            page.locator('#captureLibraryAdd').click()
            page.wait_for_function('document.getElementById("captureLibraryStatus").textContent.includes("capture_instagram_")')
            assert page.evaluate('({file:currentFilename,token:videoLoadToken,playlist:JSON.stringify(plPlaylist.entries)})') == before
            imported = 'capture_'+name
            assert page.evaluate('(name)=>videoListCache.some(v=>v.filename===name)', imported)
            assert page.evaluate('orderedLibraryVideos()[0].filename') == imported
            assert page.locator('.pl-video-option').evaluate_all('(nodes)=>nodes.some(n=>n.dataset.filename==="'+imported+'")')
            assert (root/'clips'/name).read_bytes() == (root/'media'/imported).read_bytes()
            page.locator('#captureLibraryAdd').click()
            page.wait_for_function('document.getElementById("captureLibraryStatus").textContent.startsWith("Already in the library")')
            assert len(list((root/'media').glob('capture_*.mp4'))) == 1
            assert page.request.get(origin+'/video/'+imported).status == 200
            assert page.request.post(origin+'/api/library/import-capture', data={'filename':'../'+name}).status == 400
            assert page.request.post(origin+'/api/library/import-capture', data={'filename':'instagram_missing.mp4'}).status == 404
            if url.startswith('/redesign'):
                # New captures become selectable immediately after actual conversion.
                page.locator('#captureDuration').fill('.6')
                page.locator('#captureAction').click()
                page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")', timeout=60000)
                filename = page.locator('#captureDownload').get_attribute('download')
                assert page.locator('#captureLibrarySelect').input_value() == filename
                assert not page.locator('#captureLibraryAdd').is_disabled()
                # Refresh also finds an externally saved earlier capture.
                extra = 'facebook_1x1_older.mp4'; shutil.copyfile(root/'media'/'source.mp4', root/'clips'/extra)
                page.locator('#captureLibraryRefresh').click()
                page.wait_for_function('(name)=>[...document.getElementById("captureLibrarySelect").options].some(o=>o.value===name)', arg=extra)
                assert page.locator('#captureLibrarySelect').input_value() == filename
                page.screenshot(path=str(root/'capture-reuse.png'))
            page.close()
        assert not errors, errors
        browser.close()
        print('PASS existing/new capture reuse, duplicate protection, shared pickers, preview/playlist preservation and original exports. Artifacts:', root)
finally:
    httpd.shutdown(); httpd.server_close()
