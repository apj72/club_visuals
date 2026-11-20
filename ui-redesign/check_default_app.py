"""Check promoted homepage against the real standard handler and isolated data."""
from pathlib import Path
import sys
import threading

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'showcase'))
from runtime import fixture
import editor_routes
from show_library import ShowLibrary
from playwright.sync_api import sync_playwright

v1, old_httpd, _, work = fixture()
old_httpd.shutdown()
old_httpd.server_close()
# Use the standard server handler, including its shared model library.
editor_routes.SHOW_LIBRARY = ShowLibrary(work / 'models.json')
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), v1.Handler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
v1.Handler.log_message = lambda *args: None
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin + '/redesign?test=promotion#playlist', wait_until='domcontentloaded')
        page.wait_for_function('document.body.dataset.workspace === "playlist"')
        assert page.url == origin + '/?test=promotion#playlist', page.url
        page.evaluate('loadPlaylistBySlug("version1-showcase-signal-to-spectacle-12min")')
        page.wait_for_function('plPlaylist.entries.length > 10')
        page.evaluate('setTimelinePlayhead(25, {transitionPreview:false})')
        page.wait_for_function('video.readyState >= 2')
        assert page.evaluate('viewMode') == 2  # Opening showcase's authored three-panel section.
        # The repaired ripple uses original footage, so each mode has exactly
        # the requested number of canvas tiles, without a baked three-up image.
        page.evaluate('setTimelinePlayhead(167, {transitionPreview:false})')
        assert page.evaluate('currentFilename') == 'Video by test23rdmay_DesPIdUsisv.mp4'
        for mode,count in ((0,0),(1,2),(2,3),(3,4),(5,6),(4,8)):
            page.evaluate('(mode)=>setViewModeTo(mode)',mode)
            assert page.locator('#videoStage > .video-clone').count()==count
            assert page.locator('#videoStage > video:visible').count()==(1 if mode==0 else 0)
        page.evaluate('setTimelinePlayhead(25, {transitionPreview:false})')
        page.locator('#playBtn').click()
        page.wait_for_function('plPlaying && timelineTime > 25.2')
        page.locator('#playBtn').click()
        paused = page.evaluate('timelineTime')
        page.wait_for_timeout(300)
        assert not page.evaluate('plPlaying')
        assert abs(page.evaluate('timelineTime') - paused) < .05
        page.locator('#previewFullscreenBtn').click()
        page.wait_for_function('!!document.fullscreenElement || videoWrap.classList.contains("preview-fullscreen")')
        page.evaluate('togglePreviewFullscreen()')
        page.wait_for_function('!document.fullscreenElement && !videoWrap.classList.contains("preview-fullscreen")')
        for workspace in ('prepare', 'library', 'auto', 'capture', 'settings', 'builder'):
            page.locator(f'.rd-nav [data-screen={workspace}]').click()
            page.wait_for_function('(key)=>document.body.dataset.workspace===key', arg=workspace)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), workspace
        saved = page.evaluate('''async()=>{
            const existing=await (await fetch('/api/show-library')).json();
            const r=await fetch('/api/show-library',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(existing)});
            if(!r.ok)throw new Error(await r.text());return r.json();
        }''')
        assert saved['revision'] == 2
        page.goto(origin + '/?host=1', wait_until='domcontentloaded')
        assert not page.locator('#redesignStyles').count()
        assert not page.locator('.rd-nav').count()
        page.goto(origin + '/classic', wait_until='domcontentloaded')
        assert not page.locator('#redesignStyles').count()
        assert not errors, errors
        browser.close()
    print('PASS default server: bookmark/hash redirect, full playlist play/pause, preview fullscreen, all workspaces, shared model save, engine and classic fallback; isolated data:', work)
finally:
    httpd.shutdown()
    httpd.server_close()
