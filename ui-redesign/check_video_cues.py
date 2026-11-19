"""Exercise real cue-range playback against generated temporary media.

Run with developer Playwright and Chrome: python3 ui-redesign/check_video_cues.py
"""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-cues-check-'))
for name in ('media', 'thumbs', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i',
    'testsrc2=size=320x180:rate=30:duration=12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', str(root / 'media' / 'fixture.mp4')], check=True)
config = root / 'config.json'
config.write_text(json.dumps({'download_dir': str(root / 'media')}))
v1.CONFIG_FILE = config
v1.THUMB_DIR = root / 'thumbs'
v1.PLAYLIST_DIR = root / 'playlists'
v1.VIDEO_PRESET_DIR = root / 'presets'
v1.LIBRARY_ORDER_FILE = root / 'order.json'
v1.LIBRARY_CATALOG = v1.LibraryCatalog(root / 'catalog.json')
v1.VIDEO_CUES = v1.VideoCues(root / 'cues')
v1.PREVIEW_CACHE = v1.PreviewCache(root / 'previews', v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = launch.ShowLibrary(root / 'models.json')
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
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors = []
        page.on('pageerror', lambda error: errors.append(error.stack or str(error)))
        page.goto(origin + '/redesign#prepare', wait_until='domcontentloaded')
        page.wait_for_function('video.readyState >= 2 && !document.getElementById("videoCueSave").disabled')
        page.evaluate('video.pause()')
        # Mark In/Out from the actual source playhead.
        page.evaluate('video.currentTime = 2')
        page.wait_for_function('!video.seeking')
        page.locator('#videoCueMarkIn').click()
        page.evaluate('video.currentTime = 3')
        page.wait_for_function('!video.seeking')
        page.locator('#videoCueMarkOut').click()
        page.locator('#videoCueName').fill('Short loop')
        page.locator('#videoCueSave').click()
        page.wait_for_function('document.getElementById("videoCueStatus").textContent.startsWith("Range saved")')
        assert page.evaluate('sourceRange') == {'start': 2, 'end': 3}
        # Restart is a real seek to the virtual In point, retaining transport.
        page.evaluate("video.currentTime=2.7;setVfxLogo3d({animationClock:{time:5,startedAt:Date.now(),playing:false}});window.logoBeforeRestart=JSON.stringify(vfxState.logo3d.animationClock)")
        page.wait_for_function('!video.seeking')
        page.locator('#restartVideoBtn').click()
        page.wait_for_function('!video.seeking&&Math.abs(video.currentTime-2)<.02')
        assert page.evaluate('video.paused&&JSON.stringify(vfxState.logo3d.animationClock)===logoBeforeRestart')
        page.locator('#videoCuePreview').click()
        page.wait_for_function('video.currentTime>2.6&&!video.paused')
        page.locator('#restartVideoBtn').click()
        page.wait_for_function('video.currentTime<2.3&&!video.paused')
        page.evaluate('video.pause();setPlaybackRange(null);video.currentTime=5')
        page.wait_for_function('!video.seeking')
        page.locator('#restartVideoBtn').click()
        page.wait_for_function('!video.seeking&&video.currentTime<.02&&video.paused')
        page.evaluate('setPlaybackRange({start:2,end:3},true)')
        page.locator('#videoCuePreview').click()
        page.wait_for_function('video.currentTime > 2.65 && !video.paused')
        page.wait_for_function('video.currentTime < 2.3 && !video.paused')
        page.evaluate('video.pause()')
        assert page.evaluate('currentPlayerLayout().sourceRange') == {'start': 2, 'end': 3}
        # A second named range, and update/delete semantics.
        page.locator('#videoCueIn').fill('6')
        page.locator('#videoCueOut').fill('7')
        page.locator('#videoCueName').fill('Ending')
        page.locator('#videoCueSave').click()
        page.wait_for_function('document.getElementById("videoCueStatus").textContent.startsWith("Range saved")')
        assert len(v1.VIDEO_CUES.read('fixture.mp4')['ranges']) == 2
        page.locator('#videoCueOut').fill('7.5')
        page.locator('#videoCueUpdate').click()
        page.wait_for_function('document.getElementById("videoCueStatus").textContent.startsWith("Range saved")')
        assert v1.VIDEO_CUES.read('fixture.mp4')['ranges'][1]['sourceRange']['end'] == 7.5
        # Save layout and playlist snapshots with the cue bounds intact.
        page.locator('summary').filter(has_text='Saved layouts').click()
        page.locator('#videoPresetName').fill('Ending layout')
        page.get_by_role('button', name='Save layout', exact=True).click()
        page.wait_for_function('document.getElementById("videoPresetStatus").textContent.startsWith("Saved")')
        assert json.loads(next((root / 'presets').glob('*.json')).read_text())['presets'][0]['sourceRange'] == {'start': 6, 'end': 7.5}
        page.evaluate('selectVideo(currentFilename, false); fillPlaylistLayoutFields(currentPlayerLayout()); addEntry()')
        assert page.evaluate('plPlaylist.entries[0].sourceRange') == {'start': 6, 'end': 7.5}
        page.locator('.rd-nav [data-screen=playlist]').click()
        page.wait_for_function('document.getElementById("insSourceRange").options.length >= 3')
        assert page.locator('#insCueIn').input_value() == '6'
        assert page.locator('#insCueOut').input_value() == '7.5'
        assert page.evaluate('playlistEntrySeconds({sourceRange:{start:2,end:3},duration:{type:"loops",value:2},loopMode:1,speed:.5},12)') == 4
        # Two virtual clips of the same physical file advance and loop independently.
        page.evaluate('''() => {
          stopPlaylist();
          const base = {video:'fixture.mp4',view:'single',preset:1,loopMode:1,speed:1,zoom:1,panX:0,panY:0,transition:{type:'cut'}};
          plPlaylist={name:'Cue test',entries:[
            {...base,sourceRange:{start:2,end:3},duration:{type:'loops',value:2}},
            {...base,sourceRange:{start:6,end:7},duration:{type:'loops',value:1}}]};
          plLoopPlaylist=false; renderPlaylistEntries(); return startPlaylist();
        }''')
        page.wait_for_function('plEntryIdx === 1 && video.currentTime >= 6 && video.currentTime < 7')
        page.wait_for_function('!plPlaying')
        assert 6.8 < page.evaluate('video.currentTime') <= 7.05
        # Seeking the second loop uses In + the local loop offset.
        page.evaluate('() => { renderPlaylistEntries(); return setTimelinePlayhead(1.5); }')
        assert abs(page.evaluate('video.currentTime') - 2.5) < .08
        # Seeked playback counts only the remaining loops.
        page.evaluate('startPlaylist(1.5)')
        page.wait_for_function('plEntryIdx === 1', timeout=2500)
        page.evaluate('stopPlaylist()')
        page.locator('#plName').fill('Cue range playlist')
        page.evaluate('savePlaylist()')
        assert json.loads(next((root / 'playlists').glob('*.json')).read_text())['entries'][0]['sourceRange'] == {'start': 2, 'end': 3}
        # Applying a saved range in the playlist inspector snapshots its times.
        page.evaluate('plPreviewIdx=0; renderTimelineInspector()')
        page.wait_for_function('document.getElementById("insSourceRange").options.length >= 3')
        page.locator('#insSourceRange').evaluate('(s)=>{s.value=JSON.stringify({start:6,end:7.5});s.dispatchEvent(new Event("change",{bubbles:true}));}')
        page.wait_for_function('plPlaylist.entries[0].sourceRange.start === 6')
        assert page.evaluate('plPlaylist.entries[0].sourceRange') == {'start': 6, 'end': 7.5}
        page.locator('.rd-nav [data-screen=prepare]').click()
        # Once stops at Out and Play restarts at In.
        page.evaluate('setPlaybackRange({start:6,end:6.5},true); setLoopMode(0); video.play()')
        page.wait_for_function('video.paused && video.currentTime > 6.45')
        page.locator('#playBtn').click()
        page.wait_for_function('!video.paused && video.currentTime < 6.3')
        page.evaluate('video.pause()')
        # Scrubbing before In cannot make playback escape the active section.
        page.evaluate('video.currentTime = 1')
        page.wait_for_function('!video.seeking')
        page.locator('#playBtn').click()
        page.wait_for_function('video.currentTime >= 6 && video.currentTime < 6.5')
        page.evaluate('video.pause()')
        # Invalid input does not corrupt saved metadata.
        page.locator('#videoCueName').fill('Invalid range')
        page.locator('#videoCueIn').fill('9')
        page.locator('#videoCueOut').fill('8')
        page.locator('#videoCueSave').click()
        page.wait_for_function('document.getElementById("videoCueStatus").textContent.includes("Out time")')
        assert len(v1.VIDEO_CUES.read('fixture.mp4')['ranges']) == 2
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('document.getElementById("videoCueSelect").options.length === 4')
        assert page.evaluate('sourceRange') is None
        first = v1.VIDEO_CUES.read('fixture.mp4')['ranges'][0]
        page.locator('#videoCueSelect').evaluate('(s,id)=>{s.value=id;s.dispatchEvent(new Event("change",{bubbles:true}));}', first['id'])
        page.evaluate('video.pause()')
        page.wait_for_function('document.querySelector("#videoCueSelect + .rd-select-trigger").textContent.includes("Short loop")')
        page.locator('#videoCueName').scroll_into_view_if_needed()
        page.screenshot(path=str(root / 'cue-ranges-desktop.png'))
        page.set_viewport_size({'width': 834, 'height': 1194})
        page.locator('.rd-inspector-toggle').click()
        page.locator('#videoCueName').scroll_into_view_if_needed()
        page.screenshot(path=str(root / 'cue-ranges-ipad.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        # Deleting a saved range leaves playlist snapshots intact.
        ending = v1.VIDEO_CUES.read('fixture.mp4')['ranges'][1]
        page.locator('#videoCueSelect').evaluate('(s,id)=>{s.value=id;s.dispatchEvent(new Event("change",{bubbles:true}));}', ending['id'])
        page.locator('#videoCueDelete').click()
        page.wait_for_function('document.getElementById("videoCueStatus").textContent.startsWith("Saved range deleted")')
        assert len(v1.VIDEO_CUES.read('fixture.mp4')['ranges']) == 1
        saved = json.loads(next((root / 'playlists').glob('*.json')).read_text())
        assert saved['entries'][1]['sourceRange'] == {'start': 6, 'end': 7}
        page.locator('#videoCueSelect').evaluate('(s,id)=>{s.value=id;s.dispatchEvent(new Event("change",{bubbles:true}));}', first['id'])
        original=browser.new_page()
        original.on('pageerror',lambda error:errors.append(error.stack or str(error)))
        original.goto(origin+'/',wait_until='domcontentloaded')
        original.wait_for_function('video.readyState>=2')
        original.evaluate('video.pause();setPlaybackRange({start:6,end:9});video.currentTime=8;setLayout(3);applyZoomPan(.5,.2,.1)')
        original.wait_for_function('!video.seeking')
        original.locator('#restartVideoBtn').click()
        original.wait_for_function('!video.seeking&&Math.abs(video.currentTime-6)<.02')
        assert original.evaluate('video.paused&&viewMode===3&&tileZoom===.5&&tilePanX===.2')
        # A reversing bounce is active playback, even though the video decoder is paused.
        original.evaluate('''async()=>{setLoopMode(2);video.pause();bounceFrames=[await createImageBitmap(video)];bounceReversing=true;stopRenderLoop();}''')
        original.locator('#restartVideoBtn').click()
        original.wait_for_function('!bounceReversing&&!video.paused&&video.currentTime>=6&&video.currentTime<6.5')
        original.evaluate('''()=>{
          const clip={video:'fixture.mp4',view:'single',preset:1,loopMode:1,speed:1,zoom:1,panX:0,panY:0,sourceRange:{start:2,end:5},transition:{type:'cut'},duration:{type:'seconds',value:2},cues:[{at:.9,effect:'scene-4'}]};
          plPlaylist={name:'Restart schedule',entries:[clip,{...clip,sourceRange:{start:6,end:9}}]};plLoopPlaylist=false;return startPlaylist();
        }''')
        original.wait_for_function('video.currentTime>3.2&&plEntryIdx===0&&vfxState.scene===4')
        original.locator('#restartVideoBtn').click()
        original.wait_for_function('video.currentTime<2.3&&plEntryIdx===0&&!vfxState.enabled')
        original.wait_for_timeout(1000)
        assert original.evaluate('plPlaying&&plEntryIdx===0&&plLoopCount===0')
        original.wait_for_function('plEntryIdx===1')
        original.evaluate('stopPlaylist()')
        original.close()
        # A generated-show clip can select and save the same source range.
        definitions = page.evaluate("""() => {
          const library = ShowModels.defaults();
          library.models.forEach(m => { m.minutes = 1; });
          library.profiles.forEach(p => { p.avoidRepeat = 0; p.reviewedOnly = false; p.themes = []; p.colours = []; p.types = []; });
          return library;
        }""")
        response = page.request.post(origin + '/api/show-library', data={'revision': 0, 'library': definitions})
        assert response.ok
        builder = browser.new_page(viewport={'width': 1440, 'height': 1050})
        builder.on('pageerror', lambda error: errors.append(error.stack or str(error)))
        builder.goto(origin + '/redesign#builder', wait_until='domcontentloaded')
        builder.locator('#sbGenerate').click()
        builder.wait_for_function('document.getElementById("sbReviewSourceRange")?.options.length >= 2')
        builder.locator('#sbReviewSourceRange').evaluate('(s)=>{s.value=JSON.stringify({start:2,end:3});s.dispatchEvent(new Event("change",{bubbles:true}));}')
        builder.wait_for_function('plPlaylist.entries[0].sourceRange?.start === 2')
        builder.locator('#sbReviewApply').click()
        builder.get_by_role('button', name='Save as new playlist', exact=True).click()
        builder.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved a new playlist")')
        editions = [json.loads(path.read_text()) for path in (root / 'playlists').glob('*.json')]
        assert any(data.get('generation') and data['entries'][0].get('sourceRange') == {'start': 2, 'end': 3} for data in editions)
        builder.close()
        # Real Mac take plus clean-output SSE and reconnect snapshot.
        scene = page.evaluate('() => { setLoopMode(1); return previewScene(); }')
        engine = browser.new_page()
        engine.on('pageerror', lambda error: errors.append(error.stack or str(error)))
        engine.goto(origin + '/?host=1', wait_until='domcontentloaded')
        engine.wait_for_function('hostClaimed && videoListCache.length === 1')
        output = browser.new_page()
        output.on('pageerror', lambda error: errors.append(error.stack or str(error)))
        output.goto(origin + '/output?monitor=1', wait_until='domcontentloaded')
        engine.evaluate('(scene)=>runMacCommand({action:"take",scene})', scene)
        output.wait_for_function('video.readyState>=2 && sourceRange?.start===2')
        assert output.evaluate('sourceRange') == {'start': 2, 'end': 3}
        output.wait_for_function('video.currentTime > 2.65')
        output.wait_for_function('video.currentTime < 2.3')
        output.reload(wait_until='domcontentloaded')
        output.wait_for_function('video.readyState>=2 && sourceRange?.start===2')
        assert 2 <= output.evaluate('video.currentTime') <= 3.1
        engine.evaluate('video.pause();video.currentTime=2.8;restartVideo()')
        output.wait_for_function('video.paused&&!video.seeking&&Math.abs(video.currentTime-2)<.03')
        assert engine.evaluate('video.paused&&Math.abs(video.currentTime-2)<.03')
        assert not errors, errors
        browser.close()
        print('PASS: cue marking, named ranges, persistence, saved layouts, playlist snapshots, loop/once boundaries, offsets, Mac take and clean-output replay. Screenshots:', root)
finally:
    httpd.shutdown()
    httpd.server_close()
