"""End-to-end Show Builder rehearsal with temporary metadata and real media links.

No running server or saved user playlists are touched. Requires Playwright and
Chrome, as do the other developer-only browser rehearsals in this directory.
"""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading

sys.path.insert(0, str(Path(__file__).resolve().parent))
import launch
from show_store import ShowLibrary

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-show-builder-check-'))
for directory in ('media', 'thumbs', 'playlists', 'presets', 'previews', 'screenshots'):
    (root / directory).mkdir()
sources = list(v1.get_download_dir().glob('*.mp4'))[:16]
if len(sources) < 8:
    raise SystemExit('This rehearsal needs at least eight local videos.')
for source in sources:
    (root / 'media' / source.name).symlink_to(source)
    thumb = v1.THUMB_DIR / (source.stem + '.jpg')
    if thumb.exists():
        (root / 'thumbs' / thumb.name).symlink_to(thumb.resolve())
config = root / 'config.json'
config.write_text(json.dumps({'download_dir': str(root / 'media')}))
v1.CONFIG_FILE = config
v1.THUMB_DIR = root / 'thumbs'
v1.PLAYLIST_DIR = root / 'playlists'
v1.VIDEO_PRESET_DIR = root / 'presets'
v1.LIBRARY_ORDER_FILE = root / 'order.json'
v1.LIBRARY_CATALOG = v1.LibraryCatalog(root / 'catalog.json')
for i, source in enumerate(sources):
    v1.LIBRARY_CATALOG.update(source.name, {'themes': ['Abstract' if i % 2 else 'Nature'], 'colours': ['Cyan'], 'types': ['Animation'], 'reviewed': True})
v1.PREVIEW_CACHE = v1.PreviewCache(root / 'previews', v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = ShowLibrary(root / 'models.json')

class Output:
    def status(self):
        return {'connected': False, 'fullscreen': False}

v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
print('FIXTURE', root, 'PORT', httpd.server_port, flush=True)

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 1100})
    errors = []
    def browser_error(e):
        context = page.evaluate('({viewMode, type:typeof viewMode, workspace:document.body.dataset.workspace})')
        errors.append((e.stack or str(e)) + '\n' + json.dumps(context))
    page.on('pageerror', browser_error)
    def wait_review():
        page.wait_for_function('''() => {
            const text = document.getElementById('sbReviewStatus')?.textContent || '';
            return text.startsWith('Paused') || text.startsWith('Could not') || text.startsWith('Preview unavailable');
        }''', timeout=15000)
        status = page.locator('#sbReviewStatus').inner_text()
        assert status.startswith('Paused'), (status, errors, page.evaluate('({ready:video.readyState,src:video.src,filename:currentFilename,timeline:timelineStatus.textContent,workspace:document.body.dataset.workspace})'))
    def set_range(selector, value):
        page.locator(selector).evaluate('(e,value) => {e.value=value;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}', str(value))
    origin = f'http://127.0.0.1:{httpd.server_port}'
    page.goto(origin + '/redesign#builder', wait_until='domcontentloaded')
    page.locator('#sbGenerate').wait_for()
    page.wait_for_function('document.getElementById("showBuilder").textContent.includes("eligible videos")')
    page.screenshot(path=str(root / 'screenshots' / 'assembly-desktop.png'))
    assert page.evaluate('document.body.dataset.workspace') == 'builder'
    assert not errors, errors

    # Add a brick with real drag/drop, swap it, and persist the reusable library.
    page.locator('.sb-brick[data-brick="peak"]').drag_to(page.locator('.sb-section').first)
    assert page.locator('.sb-section').first.locator('.sb-placement').count() == 2
    page.locator('.sb-section').first.locator('select[aria-label="Swap brick"]').last.select_option('close', force=True)
    page.locator('#sbSave').click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')
    assert json.loads((root / 'models.json').read_text())['library']['models'][0]['sections'][0]['bricks'] == ['opening', 'close']

    page.locator('#sbGenerate').click()
    page.get_by_role('button', name='Save as new playlist', exact=True).wait_for()
    assert '3:00:00' in page.locator('.sb-summary').inner_text()
    page.get_by_role('button', name='Save as new playlist', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved a new playlist")')
    paths = list((root / 'playlists').glob('*.json'))
    assert len(paths) == 1
    first_show = json.loads(paths[0].read_text())
    assert sum(e['duration']['value'] for e in first_show['entries']) == 10800
    page.screenshot(path=str(root / 'screenshots' / 'generated-desktop.png'))

    # Scrub and edit directly in the generated show, with the real private player.
    first_path = paths[0]
    page.locator('#sbReviewTime').fill('0:16.370'); page.locator('#sbReviewTime').press('Tab')
    wait_review()
    assert page.evaluate('document.body.dataset.workspace') == 'builder'
    assert page.evaluate('viewMode') == 1
    assert page.locator('#sbShowReview .player-section').is_visible()
    page.locator('#sbShowReview').evaluate('(e) => { const root = document.getElementById("showBuilder"); root.scrollTop += e.getBoundingClientRect().top - root.getBoundingClientRect().top; }')
    page.screenshot(path=str(root / 'screenshots' / 'show-playhead-desktop.png'))
    # Play from a nonzero playhead and adjust the mirror crop without reloading.
    page.locator('#sbReviewPlay').click()
    page.wait_for_function('plPlaying && !video.paused', timeout=15000)
    page.wait_for_function('Number(document.getElementById("sbShowPlayhead").value) > 16.7')
    token = page.evaluate('videoLoadToken')
    set_range('#sbReview-panY', .65)
    assert page.evaluate('tilePanY') == .65
    assert page.evaluate('videoLoadToken') == token
    assert page.evaluate('plPlaying && !video.paused')
    assert page.locator('#sbReviewApply').is_enabled()
    page.locator('#sbReviewPlay').click(); wait_review()
    paused = page.locator('#sbReviewTime').input_value()
    assert paused != '0:00.000'
    # Reset abandons the preview; Apply is the only route into the saved show.
    page.locator('#sbReviewReset').click(); wait_review()
    assert page.evaluate('tilePanY') == 0
    assert page.locator('#sbReviewApply').is_disabled()
    token = page.evaluate('videoLoadToken')
    set_range('#sbReview-zoom', 1.5)
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
    before_image = page.evaluate('clones[0].toDataURL()')
    pan = page.locator('#sbReview-panY')
    pan.scroll_into_view_if_needed()
    pan.evaluate('(e) => {window.testPanControl=e;}')
    bounds = pan.bounding_box()
    page.mouse.move(bounds['x'] + bounds['width'] * .5, bounds['y'] + bounds['height'] / 2)
    page.mouse.down(); page.mouse.move(bounds['x'] + bounds['width'] * .8, bounds['y'] + bounds['height'] / 2, steps=10); page.mouse.up()
    assert page.evaluate('testPanControl.isConnected && testPanControl === document.getElementById("sbReview-panY")')
    assert page.evaluate('tilePanY') > .4
    set_range('#sbReview-panY', .35)
    page.wait_for_function('clones[0].toDataURL() !== ' + json.dumps(before_image))
    assert page.evaluate('videoLoadToken') == token
    assert page.locator('#sbReviewApply').is_enabled()
    # Saving while changes are only a preview is blocked, rather than saving old settings.
    page.get_by_role('button', name='Save as new playlist', exact=True).click()
    assert 'Apply or Reset' in page.locator('#sbStatus').inner_text()
    assert len(list((root / 'playlists').glob('*.json'))) == 1
    page.locator('#sbReviewTime').fill('0:16.370'); page.locator('#sbReviewTime').press('Tab'); wait_review()
    page.locator('#sbReviewPlay').click()
    page.wait_for_function('plPlaying && !video.paused')
    page.locator('#sbReviewApply').click()
    page.wait_for_function('plPlaying && !video.paused && document.getElementById("sbReviewApply")?.disabled')
    page.locator('#sbReviewPlay').click(); wait_review()
    assert page.evaluate('plPlaylist.entries[0].layoutCues[0].panY') == .35
    assert page.locator('#sbReviewApply').is_disabled()
    page.locator('#sbReviewTime').fill('0:16.370'); page.locator('#sbReviewTime').press('Tab'); wait_review()
    page.locator('#sbReviewPlay').click(); page.wait_for_function('plPlaying && !video.paused')
    set_range('#sbReview-panY', -.5)
    page.locator('#sbReviewReset').click()
    page.wait_for_function('plPlaying && !video.paused && tilePanY === .35 && document.getElementById("sbReviewApply")?.disabled')
    page.locator('#sbReviewPlay').click(); wait_review()
    page.locator('#sbShowReview').evaluate('(e) => { const root = document.getElementById("showBuilder"); root.scrollTop += e.getBoundingClientRect().top - root.getBoundingClientRect().top; }')
    page.screenshot(path=str(root / 'screenshots' / 'show-live-controls.png'))
    page.locator('#sbReviewLayout').select_option('octo', force=True)
    page.locator('#sbReviewApply').click()
    wait_review()
    assert page.evaluate('plPlaylist.entries[0].layoutCues[0].view') == 'octo'
    assert page.evaluate('plPlaylist.entries[0].view') == 'quad'
    assert page.evaluate('viewMode') == 4
    replacement = next(s.name for s in sources if s.name != first_show['entries'][0]['video'])
    page.locator('#sbReviewVideo').select_option(replacement, force=True)
    set_range('#sbReviewLength', 45)
    assert '3:00:00' in page.locator('.sb-summary').inner_text()
    page.locator('#sbReviewApply').click()
    wait_review()
    assert '3:00:15' in page.locator('.sb-summary').inner_text()
    page.locator('#sbReviewTime').fill('0:40'); page.locator('#sbReviewTime').press('Tab'); wait_review()
    assert page.evaluate('plPreviewIdx') == 0
    assert page.evaluate('viewMode') == 4
    page.get_by_role('button', name='Save as new playlist', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved a new playlist")')
    edited_path = next(p for p in (root / 'playlists').glob('*.json') if p not in paths)
    edited = json.loads(edited_path.read_text())
    assert edited['entries'][0]['video'] == replacement
    assert edited['entries'][0]['duration']['value'] == 45
    assert edited['entries'][0]['layoutCues'][0]['view'] == 'octo'
    assert edited['entries'][0]['layoutCues'][0]['panY'] == .35
    assert edited['generation']['sections'][0]['end'] == 1215
    page.locator('#sbReviewUndo').click()
    assert '3:00:00' in page.locator('.sb-summary').inner_text()

    # Restore the saved initial edition, then drag across hours and seek exactly.
    page.locator('#sbResume').select_option(first_path.stem, force=True)
    page.get_by_role('button', name='Load edition', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Loaded a saved edition")')
    # Offset playback carries on across a clip boundary and schedules a layout cue
    # at its remaining offset, rather than restarting the clip's cue clock at zero.
    page.locator('#sbReviewTime').fill('0:29'); page.locator('#sbReviewTime').press('Tab'); wait_review()
    page.locator('#sbReviewPlay').click()
    page.wait_for_function('plPlaying && plEntryIdx === 1', timeout=12000)
    page.locator('#sbReviewPlay').click(); wait_review()
    page.locator('#sbReviewTime').fill('0:14.5'); page.locator('#sbReviewTime').press('Tab'); wait_review()
    page.locator('#sbReviewPlay').click()
    page.wait_for_function('plPlaying && viewMode === 1', timeout=5000)
    page.locator('#sbReviewPlay').click(); wait_review()
    page.locator('#sbShowPlayhead').scroll_into_view_if_needed()
    bar = page.locator('#sbShowPlayhead').bounding_box()
    page.mouse.move(bar['x'] + 2, bar['y'] + bar['height'] / 2); page.mouse.down()
    page.mouse.move(bar['x'] + bar['width'] * .8, bar['y'] + bar['height'] / 2, steps=12); page.mouse.up()
    page.wait_for_function('Number(document.getElementById("sbShowPlayhead").value) > 8000')
    page.locator('#sbReviewTime').fill('0:16.370'); page.locator('#sbReviewTime').press('Tab')
    wait_review()
    page.locator('#sbReviewTrack').focus(); page.keyboard.press('ArrowRight')
    assert page.locator('#sbReviewTime').input_value() == '0:17.370'
    # No preview action may publish to Mac playout.
    assert not v1.STATE_SNAPSHOT
    paths = list((root / 'playlists').glob('*.json'))

    # Keep the opening, make a second DJ and regenerate the other sections.
    page.get_by_text('Keep this section exactly when regenerating', exact=True).first.locator('input').check()
    page.locator('[data-builder-tab="profiles"]').click()
    page.get_by_role('button', name='+ New DJ', exact=True).click()
    page.locator('#sbDJName').fill('DJ Beta'); page.locator('#sbDJName').press('Tab')
    page.locator('#sbBrandText').fill('DJ BETA'); page.locator('#sbBrandText').press('Tab')
    page.get_by_label('Preferred themes · comma separated', exact=True).fill('Abstract')
    page.get_by_label('Preferred themes · comma separated', exact=True).press('Tab')
    page.get_by_role('button', name='Save library', exact=True).last.click()
    page.locator('[data-builder-tab="generated"]').click()
    page.locator('#sbSeed').fill('second-dj'); page.locator('#sbSeed').press('Tab')
    page.locator('#sbGenerate').click()
    page.get_by_role('button', name='Save as new playlist', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved a new playlist")')
    paths2 = list((root / 'playlists').glob('*.json'))
    second_path = next(p for p in paths2 if p not in paths)
    second_show = json.loads(second_path.read_text())
    n = first_show['generation']['sections'][0]['entryCount']
    assert second_show['entries'][:n] == first_show['entries'][:n]
    assert second_show['entries'][n:] != first_show['entries'][n:]
    allowed = {source.name for i, source in enumerate(sources) if i % 2}
    assert all(e['video'] in allowed for e in second_show['entries'][n:])
    assert any(c.get('text') == 'DJ BETA' for e in second_show['entries'][n:] for c in e['cues'])

    # Open the compiled result in the real editor and audition a timed layout cue.
    page.get_by_role('button', name='Open in playlist editor', exact=True).click()
    page.wait_for_function('document.body.dataset.workspace === "playlist"')
    assert page.evaluate('plPlaylist.entries.length') == len(second_show['entries'])
    page.evaluate('setTimelinePlayhead(16.37)')
    assert page.evaluate('viewMode') == 1  # opening: 4x -> 2x at 15s
    assert page.evaluate('video.currentTime') >= 0

    # Fast runtime rehearsal proves composition events preserve the source clock
    # and are cancelled when stopping. Observe the same broadcast used by output.
    page.evaluate('''() => {
      stopPlaylist();
      window.testSource = video.currentSrc;
      window.testLayoutMessages = [];
      window.testLayoutClock = null;
      const originalView = setViewModeTo;
      window.testOriginalView = originalView;
      setViewModeTo = mode => {
        const before = video.currentTime, token = videoLoadToken, source = video.src;
        originalView(mode);
        if (mode === 1) window.testLayoutClock = {before, after:video.currentTime, token, afterToken:videoLoadToken, source, afterSource:video.src};
      };
      const original = broadcastState;
      window.testBroadcast = original;
      broadcastState = message => { testLayoutMessages.push(message); original(message); };
      plPlaylist = {name:'timed layout test', entries:[{
        video:videoListCache[0].filename,view:'quad',preset:15,loopMode:1,speed:1,
        duration:{type:'seconds',value:5}, transition:{type:'cut'}, cues:[],
        layoutCues:[{at:0.8,view:'dual',preset:7,zoom:1,panX:0,panY:0}]
      }]};
      startPlaylist();
    }''')
    page.wait_for_function('viewMode === 1 && plPlaying', timeout=5000)
    clock = page.evaluate('testLayoutClock')
    assert clock['before'] == clock['after'] and clock['token'] == clock['afterToken'] and clock['source'] == clock['afterSource'], clock
    assert page.evaluate('testLayoutMessages.some(m => m.type === "setView" && m.mode === 1)')
    page.evaluate('() => { stopPlaylist(); broadcastState = testBroadcast; setViewModeTo = testOriginalView; }')

    # Capture the existing editor choreography into a new reusable brick.
    page.locator('.rd-nav [data-screen="builder"]').click()
    page.locator('[data-builder-tab="bricks"]').click()
    page.get_by_role('button', name='Capture playlist clips as brick', exact=True).click()
    page.get_by_role('button', name='Create brick', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Captured")')
    assert page.get_by_label('Brick name', exact=True).input_value() == 'timed layout test brick'
    page.locator('#sbSave').click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')

    # Both landscape and portrait retain reachable controls and bounded page width.
    for name, width, height in [('ipad-landscape', 1194, 834), ('ipad-portrait', 834, 1194), ('phone', 390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        page.locator('[data-builder-tab="assemble"]').click()
        page.screenshot(path=str(root / 'screenshots' / (name + '.png')))
        assert page.evaluate('document.documentElement.scrollWidth') <= width, (name, page.evaluate('document.documentElement.scrollWidth'))
        assert page.locator('#sbGenerate').is_visible()
        page.locator('[data-builder-tab="generated"]').click()
        page.locator('#sbReviewTime').fill('0:16.370'); page.locator('#sbReviewTime').press('Tab')
        wait_review()
        page.locator('#sbShowReview').evaluate('(e) => { const root = document.getElementById("showBuilder"); root.scrollTop += e.getBoundingClientRect().top - root.getBoundingClientRect().top; }')
        page.screenshot(path=str(root / 'screenshots' / ('show-playhead-' + name + '.png')))
        assert page.evaluate('document.documentElement.scrollWidth') <= width
        assert page.locator('#sbShowReview .player-section').is_visible()

    # A fresh page reads the shared library and resumes a saved version.
    page.set_viewport_size({'width': 1600, 'height': 1100})
    page.reload(wait_until='domcontentloaded')
    page.locator('#sbGenerate').wait_for()
    page.locator('[data-builder-tab="generated"]').click()
    page.locator('#sbResume').select_option(second_path.stem, force=True)
    page.get_by_role('button', name='Load edition', exact=True).click()
    page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Loaded a saved edition")')
    assert 'DJ Beta' in page.locator('.sb-generated').inner_text()
    assert not errors, errors
    print('PASS: play/pause from playhead, clip-boundary playback, offset layout cues, real pointer-drag sliders, pixel-visible Y changes without reload, Apply/Reset while playing, pending-save protection, show editing, responsive layouts, storage and prior workflows.', flush=True)
    browser.close()
httpd.shutdown(); httpd.server_close()
print('SCREENSHOTS', root / 'screenshots', flush=True)
