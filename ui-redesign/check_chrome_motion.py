"""Real WebGL and workflow checks for reflective objects over black.

Uses only generated temporary media/metadata. Requires developer Playwright,
Chrome and ffmpeg. Run: python3 ui-redesign/check_chrome_motion.py
"""
import json
import base64
import sys
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-chrome-check-'))
for name in ('media', 'thumbs', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i',
    'testsrc2=size=640x360:rate=30:duration=12', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(root / 'media' / 'fixture.mp4')], check=True)
config = root / 'config.json'; config.write_text(json.dumps({'download_dir': str(root / 'media')}))
v1.CONFIG_FILE = config
v1.THUMB_DIR = root / 'thumbs'; v1.PLAYLIST_DIR = root / 'playlists'; v1.VIDEO_PRESET_DIR = root / 'presets'
v1.LIBRARY_ORDER_FILE = root / 'order.json'; v1.LIBRARY_CATALOG = v1.LibraryCatalog(root / 'catalog.json')
v1.VIDEO_CUES = v1.VideoCues(root / 'cues'); v1.PREVIEW_CACHE = v1.PreviewCache(root / 'previews', v1.find_working_ffmpeg)
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
        def error(e): errors.append(e.stack or str(e))
        page.on('pageerror', error)
        page.goto(origin + '/redesign#prepare', wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        page.evaluate('''() => {
          window.testSource = document.createElement('canvas'); testSource.width=480; testSource.height=270;
          window.testTarget = document.createElement('canvas'); window.testEngine = new VfxEngine(testTarget);
          window.testState={scene:6,intensity:.7,feedback:.9,bass:0,hit:0};
          testEngine.setLogo3d({backdrop:'black',motion:0,scale:.35,rotY:-20});
          window.paintTestSource = colour => { const c=testSource.getContext('2d');c.fillStyle=colour;c.fillRect(0,0,480,270); };
          window.readTestPixels = () => { const gl=testEngine.gl,p=new Uint8Array(480*270*4);testEngine.render(testSource,testState);gl.readPixels(0,0,480,270,gl.RGBA,gl.UNSIGNED_BYTE,p);return p; };
          paintTestSource('#ff2626');
        }''')
        page.wait_for_function('testEngine.logoSurfaceReady')
        stats = page.evaluate('''() => {
          const red=readTestPixels();paintTestSource('#264dff');const blue=readTestPixels();
          let changed=0,ink=0,outside=0;const pose=testEngine.lastObjectPose;
          const bounds=VfxEngine.projectedBounds(pose,VfxEngine.rotationMatrix(pose,0),testEngine.logoAspect,480/270);
          for(let y=0;y<270;y++)for(let x=0;x<480;x++) {
            const i=(y*480+x)*4,lit=blue[i]+blue[i+1]+blue[i+2];
            if(lit>5)ink++;
            if(Math.abs(red[i]-blue[i])+Math.abs(red[i+1]-blue[i+1])+Math.abs(red[i+2]-blue[i+2])>20)changed++;
            if((x/480<bounds[0]-.01||x/480>bounds[2]+.01||y/270<bounds[1]-.01||y/270>bounds[3]+.01)&&lit)outside++;
          }
          testEngine.setLogo3d({backdrop:'video'});readTestPixels();testEngine.setLogo3d({backdrop:'black'});
          const isolated=readTestPixels(); const corners=[0,479,(269*480),(270*480-1)].map(i=>[...isolated.slice(i*4,i*4+3)]);
          return {changed,ink,outside,corners,error:testEngine.gl.getError()};
        }''')
        assert stats['changed'] > 500 and stats['ink'] > 500, stats
        assert stats['outside'] == 0 and all(pixel == [0, 0, 0] for pixel in stats['corners']), stats
        assert stats['error'] == 0, stats
        print('GPU reflection and black backdrop', stats, flush=True)
        # Independent hidden-video motion changes reflection, not the object pose.
        sweep = page.evaluate('''() => {
          paintTestSource('#38bcff');
          testEngine.setLogo3d({backdrop:'black',motion:0,animation:{enabled:true,path:'still',duration:8,loop:false,sourceMotion:'left-right'}});
          const frames=[0,4,8].map(time=>{testEngine.setLogo3d({animationClock:{time,startedAt:Date.now(),playing:false}});return {pixels:readTestPixels(),pose:{...testEngine.lastObjectPose}};});
          let change=0,ends=0;for(let i=0;i<frames[0].pixels.length;i+=4){
            for(let c=0;c<3;c++){change+=Math.abs(frames[0].pixels[i+c]-frames[1].pixels[i+c]);ends+=Math.abs(frames[0].pixels[i+c]-frames[2].pixels[i+c]);}}
          return {change,ends,samePose:['x','y','scale','rotX','rotY','rotZ'].every(key=>frames[0].pose[key]===frames[1].pose[key])};
        }''')
        assert sweep['change'] > 10000 and sweep['ends'] == 0 and sweep['samePose'], sweep
        # A fixed authored time produces the same frame when rendered again.
        deterministic = page.evaluate('''() => {
          testEngine.setLogo3d({animation:{enabled:true,path:'orbit',duration:12,turnX:360,turnY:360,turnZ:360},animationClock:{time:3,startedAt:Date.now(),playing:false}});
          const first=readTestPixels(),second=readTestPixels();return first.every((v,i)=>v===second[i]);
        }''')
        assert deterministic
        page.locator('summary').filter(has_text='Colour, VFX').click()
        with page.expect_popup() as popup:
            page.locator('#reflectionLogoBtn').click()
        controller = popup.value; controller.on('pageerror', error)
        controller.wait_for_load_state('domcontentloaded')
        editor = controller.locator('.logo-motion-editor')
        assert editor.locator('[data-motion=backdrop]').input_value() == 'black'
        page.wait_for_function('vfxEngine?.logoSurfaceReady && vfxFrameReady')
        source_token = page.evaluate('videoLoadToken')
        editor.locator('[data-motion=preset]').select_option('orbit')
        assert page.evaluate('vfxState.logo3d.animation.turnX') == 360
        assert page.evaluate('vfxState.logo3d.animation.turnY') == 360
        assert page.evaluate('vfxState.logo3d.animation.turnZ') == 360
        editor.locator('[data-motion=path]').select_option('custom')
        dot = editor.locator('circle[data-point="1"]'); dot.scroll_into_view_if_needed()
        bounds = editor.locator('svg').bounding_box(); handle = dot.bounding_box()
        controller.mouse.move(handle['x'] + handle['width']/2, handle['y'] + handle['height']/2)
        controller.mouse.down(); controller.mouse.move(bounds['x'] + bounds['width']*.7, bounds['y'] + bounds['height']*.55, steps=6); controller.mouse.up()
        point = page.evaluate('vfxState.logo3d.animation.points[1]')
        assert abs(point['x']-.7) < .02 and abs(point['y']-.45) < .02, point
        assert page.evaluate('videoLoadToken') == source_token
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        editor.locator('[data-transport=pause]').click()
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is True
        editor.locator('[data-transport=pause]').click()
        paused = page.evaluate('vfxState.logo3d.animationClock')
        assert paused['playing'] is False
        editor.locator('[data-transport=restart]').click()
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is True
        # The compositor used for recording contains black outside the logo.
        comp = page.evaluate('''() => {
          video.pause();videoTransition.cancel();setVfxAnimationTime(3,false);renderVfxFrame();
          const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
          const c=canvas.getContext('2d');drawCompositeFrame(canvas,c);
          return {corners:[[0,0],[639,0],[0,359],[639,359]].map(p=>[...c.getImageData(...p,1,1).data].slice(0,3)),caption:getComputedStyle(captionOverlay).visibility};
        }''')
        assert all(pixel == [0,0,0] for pixel in comp['corners']), comp
        assert comp['caption'] == 'hidden', comp
        page.evaluate('setVfxAnimationTime(0,false)')
        page.screenshot(path=str(root / 'chrome-on-black-editor.png'))
        editor.locator('svg').scroll_into_view_if_needed()
        controller.screenshot(path=str(root / 'chrome-motion-controls.png'))
        # Add current view serializes the choreography into the playlist cue.
        authored = page.evaluate('currentPlayerCue()')
        page.locator('.rd-nav [data-screen=playlist]').click()
        page.locator('#timelineAddCurrent').click()
        page.wait_for_function('plPlaylist.entries.length === 1')
        assert page.evaluate('plPlaylist.entries[0].cues[0].backdrop') == 'black'
        assert page.evaluate('plPlaylist.entries[0].cues[0].animation.points') == authored['animation']['points']
        page.locator('#plName').fill('Chrome motion rehearsal'); page.evaluate('savePlaylist()')
        saved = json.loads(next((root / 'playlists').glob('*.json')).read_text())
        assert saved['entries'][0]['cues'][0]['animation'] == authored['animation']
        # Scrubbing within the same cue changes the pose and holds that time.
        page.evaluate('setTimelinePlayhead(2)')
        assert page.evaluate('vfxState.logo3d.animationClock.time') == 2
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        pose_a = page.evaluate('() => {renderVfxFrame();return vfxEngine.lastObjectPose;}')
        page.evaluate('setTimelinePlayhead(6)')
        pose_b = page.evaluate('() => {renderVfxFrame();return vfxEngine.lastObjectPose;}')
        assert pose_a != pose_b
        # Script editor retains authored paths even if only intensity is edited.
        page.evaluate('openPlaylistCueEditor(0)')
        assert page.locator('#playlistCueList .logo-motion-editor').count() == 1
        page.evaluate('closePlaylistCueEditor()')
        # A scene take carries the current phase into the real Mac engine/output.
        scene = page.evaluate('previewScene()')
        engine = browser.new_page(); engine.on('pageerror', error)
        engine.goto(origin + '/?host=1', wait_until='domcontentloaded')
        engine.wait_for_function('hostClaimed && videoListCache.length===1')
        output = browser.new_page(viewport={'width':960,'height':540}); output.on('pageerror', error)
        output.goto(origin + '/output?monitor=1', wait_until='domcontentloaded')
        engine.evaluate('(scene)=>runMacCommand({action:"take",scene})', scene)
        output.wait_for_function('vfxEngine?.logoSurfaceReady && vfxState.logo3d.backdrop==="black"')
        assert output.evaluate('vfxState.logo3d.animation') == scene['vfx']['logo3d']['animation']
        assert output.evaluate('vfxState.logo3d.animationClock.playing') is False
        assert output.evaluate('vfxState.logo3d.animationClock.time') >= 6
        output_stats = output.evaluate('''() => {
          renderOutputVfx();const gl=vfxEngine.gl,p=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,p);
          return {corner:[...p].slice(0,3),hidden:getComputedStyle(captionOverlay).visibility,error:gl.getError()};
        }''')
        assert output_stats['corner'] == [0,0,0] and output_stats['hidden'] == 'hidden' and output_stats['error'] == 0, output_stats
        output.screenshot(path=str(root / 'chrome-on-black-output.png'))
        output.reload(wait_until='domcontentloaded')
        output.wait_for_function('vfxEngine?.logoSurfaceReady && vfxState.logo3d.backdrop==="black"')
        assert output.evaluate('vfxState.logo3d.animation') == authored['animation']
        assert not errors, errors
        if '--demo' in sys.argv:
            for extra in (controller, engine, output): extra.close()
            page.evaluate('setVfxState({enabled:false})')
            demos = {
                'chrome-reflections-only': {'scale': .44, 'seconds': 6, 'animation': {'enabled': True, 'path': 'still', 'duration': 6}},
                'chrome-logo-choreography': {'scale': .22, 'seconds': 8, 'animation': {'enabled': True, 'path': 'figure8', 'duration': 8, 'spanX': .8, 'spanY': .6, 'turnX': 360, 'turnY': 360, 'turnZ': 360, 'zoomMin': .75, 'zoomMax': 1.25}},
                'chrome-hidden-video-sweep': {'scale': .44, 'seconds': 8, 'animation': {'enabled': True, 'path': 'still', 'duration': 8, 'loop': False, 'sourceMotion': 'left-right'}}
            }
            page.evaluate('testSource.width=960; testSource.height=540')
            for name, config in demos.items():
                frames = root / name; frames.mkdir()
                for index in range(config['seconds'] * 15):
                    data = page.evaluate("""({config,index}) => {
                      const time=index/15,c=testSource.getContext('2d'),w=testSource.width,h=testSource.height;
                      const gradient=c.createLinearGradient(0,0,w,h);
                      gradient.addColorStop(0,'#070d30');gradient.addColorStop(.25,'#3a6ad8');gradient.addColorStop(.5,'#bcecff');gradient.addColorStop(.7,'#9f46c8');gradient.addColorStop(1,'#101525');
                      c.fillStyle=gradient;c.fillRect(0,0,w,h);
                      for(let i=0;i<5;i++) {
                        c.save();c.translate(w*.5+Math.sin(time*.8+i*1.5)*w*.5,h*.5);c.rotate(Math.sin(time*.35+i)*.45);
                        const light=c.createLinearGradient(-w*.16,0,w*.16,0);light.addColorStop(0,'#fff0');light.addColorStop(.5,i%2?'#e7f8ffaa':'#57b4ffcc');light.addColorStop(1,'#fff0');
                        c.fillStyle=light;c.fillRect(-w*.16,-h,w*.32,h*2);c.restore();
                      }
                      testEngine.setLogo3d({kind:'logo',backdrop:'black',skin:'chrome',quality:'high',roughness:.14,reflection:1,environment:1,exposure:1,x:.5,y:.5,scale:config.scale,rotX:0,rotY:-20,rotZ:0,motion:0,animation:config.animation,animationClock:{time,startedAt:Date.now(),playing:false}});
                      testEngine.render(testSource,testState);return testTarget.toDataURL('image/png').split(',')[1];
                    }""", {'config': config, 'index': index})
                    (frames / f'frame-{index:04d}.png').write_bytes(base64.b64decode(data))
                subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-framerate', '15', '-i', str(frames / 'frame-%04d.png'), '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(root / (name + '.mp4'))], check=True)
                (root / (name + '.png')).write_bytes((frames / 'frame-0020.png').read_bytes())
                print('DEMO', root / (name + '.mp4'), flush=True)
        browser.close()
        print('PASS: WebGL black isolation, live video reflection, hidden source sweep, deterministic multi-axis motion, custom path drag, recording, cue storage/scrubbing and Mac output/snapshot. Artifacts:', root)
finally:
    httpd.shutdown(); httpd.server_close()
