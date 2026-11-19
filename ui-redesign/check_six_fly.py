"""Audition saved looks using isolated media, clocks and GPU contexts."""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-six-fly-'))
for name in ('media', 'thumbs', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
for name, source in [('background', 'color=c=blue:size=320x180:rate=30:duration=6'), ('reflection', 'color=c=red:size=320x180:rate=30:duration=6')]:
    subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', source, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(root / 'media' / (name + '.mp4'))], check=True)
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
library = json.loads(subprocess.check_output(['node', '-e', 'process.stdout.write(JSON.stringify(require("./ui-redesign/show-models.js").defaults()))'], cwd=v1.BASE_DIR))
library['bricks'][0]['steps'][0]['effects'] = [
    {'at': 0, 'seconds': 8, 'effect': 'logo', 'orientation': 'top-bottom', 'reflectionSource': {'filename': 'reflection.mp4', 'speed': 1}, 'snake': {'enabled': True}},
    {'at': 10, 'seconds': 8, 'effect': 'scene-4', 'logoLayer': {'effect': 'text', 'text': 'PREVIEW', 'reflectionSource': {'filename': 'reflection.mp4', 'speed': 1}}}]
launch.SHOW_LIBRARY.save({'revision': 0, 'library': library})

class Output:
    def status(self): return {'connected': False, 'fullscreen': False}

v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE', root, flush=True)
try:
    import base64
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(viewport={'width':1440,'height':1050});errors=[]
        context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(error.stack or str(error))))
        page=context.new_page()
        def reveal(control):
            control.evaluate("e=>{for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;}")
            if not control.is_visible() and page.locator('.rd-inspector-toggle').is_visible():page.locator('.rd-inspector-toggle').click()
        def inside(menu):
            bounds=menu.bounding_box();viewport=page.viewport_size
            assert bounds and bounds['x']>=0 and bounds['y']>=0 and bounds['x']+bounds['width']<=viewport['width']+1 and bounds['y']+bounds['height']<=viewport['height']+1,(bounds,viewport)
            assert menu.evaluate("e=>e.matches(':popover-open')")
        for url in ('/redesign#prepare','/'):
            page.goto(origin+url,wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
            for w,h in [(1440,1050),(834,1194),(390,844)]:
                page.set_viewport_size({'width':w,'height':h})
                reveal(page.locator('#loopBtn'));page.locator('#loopBtn').click();inside(page.locator('#playbackMenu'))
                page.locator('#playbackMenu [data-mode="1"]').click()
                assert page.evaluate('loopMode===1&&!document.getElementById("playbackMenu").classList.contains("open")')
                reveal(page.locator('#viewBtn'));page.locator('#viewBtn').click();inside(page.locator('#layoutMenu'))
                page.locator('#layoutMenu [data-mode="5"]').click()
                page.wait_for_function('viewMode===5&&clones.length===6')
                assert page.evaluate('''()=>{const boxes=clones.map(c=>c.getBoundingClientRect());return boxes.slice(0,3).every(b=>Math.abs(b.top-boxes[0].top)<2)&&boxes.slice(3).every(b=>b.top>boxes[0].top+boxes[0].height-2)&&boxes[1].left>boxes[0].left&&boxes[2].left>boxes[1].left;}''')
                if url.startswith('/redesign'):page.wait_for_function('document.querySelectorAll(".rd-pattern").length===32')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            page.set_viewport_size({'width':1440,'height':1050})
            page.evaluate('setConfig(27);applyZoomPan(.5,.2,.1);video.pause()')
            assert page.evaluate('clones.every((c,i)=>c.style.transform===CONFIGS[26][SIX_POS_MAP[i]])')
            page.evaluate("document.getElementById('videoPresetName').value='Six panels';saveCurrentVideoPreset()")
            page.wait_for_function('videoPresetCache.get(currentFilename)?.some(p=>p.view==="six")')
            page.evaluate("switchTab('playlist');plPlaylist={name:'Six panels',entries:[{video:'background.mp4',view:'six',preset:27,loopMode:1,speed:1,zoom:.5,panX:.2,panY:.1,duration:{type:'seconds',value:6},transition:{type:'cut'},cues:[normalisePlaylistCue({at:0,effect:'logo',fly:{enabled:true,angle:45}})]}]};plSlug='';renderPlaylistEntries();openPlaylistCueEditor(0)")
            editor=page.locator('#playlistCueList .logo-motion-editor');reveal(editor.locator('[data-dynamics="fly.angle"]'))
            angle=editor.locator('[data-dynamics="fly.angle"]');assert angle.input_value()=='45'
            angle.fill('30');angle.press('Tab');assert angle.evaluate('e=>e.checkValidity()')
            assert page.evaluate('plPlaylist.entries[0].cues[0].fly.angle')==30
            page.evaluate("closePlaylistCueEditor();document.getElementById('plName').value='Six panels';savePlaylist()")
            saved=json.loads((root/'playlists'/'six-panels.json').read_text())
            assert saved['entries'][0]['view']=='six' and saved['entries'][0]['cues'][0]['fly']['angle']==30
            print('PASS 6x grids/patterns/presets/playlist storage and on-screen Playback/Layout menus',url,flush=True)
        page.goto(origin+'/redesign#builder',wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for();page.locator('[data-builder-tab=bricks]').click()
        layout=page.locator('.sb-brick-editor select[aria-label="Layout"]').first
        layout.locator('..').locator('.rd-select-trigger').click()
        page.locator('.rd-select-menu:visible').get_by_role('option',name='6× · six tiles',exact=True).click()
        assert page.locator('.sb-step.selected .sb-layout-icon > span').count()==6
        page.locator('#sbSave').click();page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')
        assert json.loads((root/'models.json').read_text())['library']['bricks'][0]['steps'][0]['view']=='six'
        # Compare real GPU renders at straight-on and oblique angles.
        page.evaluate('''()=>{window.flyCanvas=document.createElement('canvas');window.flyEngine=new VfxEngine(flyCanvas);window.light=document.createElement('canvas');light.width=640;light.height=360;const c=light.getContext('2d');const g=c.createLinearGradient(0,0,640,360);g.addColorStop(0,'white');g.addColorStop(.5,'#d55');g.addColorStop(1,'#45f');c.fillStyle=g;c.fillRect(0,0,640,360);flyEngine.setLogo3d({backdrop:'black',motion:0,quality:'balanced'});}''')
        page.wait_for_function('flyEngine.logoSurfaceReady')
        frames=page.evaluate('''()=>[0,45].map(angle=>{
          flyEngine.setLogo3d({fly:{enabled:true,speed:.1,distance:.7,angle},animationClock:{time:5,startedAt:Date.now(),playing:false}});
          flyEngine.render(light,{scene:6,intensity:1,feedback:0});const gl=flyEngine.gl,p=new Uint8Array(640*360*4);gl.readPixels(0,0,640,360,gl.RGBA,gl.UNSIGNED_BYTE,p);
          let ink=0,hash=0;for(let i=0;i<p.length;i+=4){if(p[i]+p[i+1]+p[i+2]>40)ink++;hash=(hash+p[i]*(i+1)+p[i+2]*(i+3))%1000000007;}
          return {angle,ink,hash,uniform:gl.getUniform(flyEngine.logoProgram,flyEngine.logoUniforms.logoFlyAngle),error:gl.getError(),image:flyCanvas.toDataURL().split(',')[1]};
        })''')
        assert all(f['ink']>2000 and f['error']==0 for f in frames),[{k:v for k,v in f.items() if k!='image'} for f in frames]
        assert frames[0]['hash']!=frames[1]['hash'] and abs(frames[1]['uniform']-.785398)<.0001
        for frame in frames:(root/f'fly-{frame["angle"]}.png').write_bytes(base64.b64decode(frame['image']))
        page.evaluate('flyEngine.dispose()')
        # A real six-panel Mac take renders the same 3-column by 2-row structure.
        page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate("setLayout(5);setConfig(27);applyZoomPan(.5,0,0);setVfxState({enabled:false})")
        host=context.new_page();host.goto(origin+'/?host=1',wait_until='domcontentloaded');host.wait_for_function('hostClaimed')
        output=context.new_page();output.goto(origin+'/output?monitor=1',wait_until='domcontentloaded')
        page.evaluate('sendMacCommand("take",{scene:previewScene()})')
        host.wait_for_function('viewMode===5&&clones.length===6&&video.readyState>=2')
        output.wait_for_function('viewMode===5&&clones.length===6&&video.readyState>=2')
        assert output.evaluate('clones.every((c,i)=>c.style.transform===CONFIGS[26][SIX_POS_MAP[i]])')
        output.screenshot(path=str(root/'six-output.png'))
        page.bring_to_front();page.goto(origin+'/',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2');page.evaluate('setLayout(5)')
        page.evaluate('togglePreviewFullscreen()');page.locator('#loopBtn').click();inside(page.locator('#playbackMenu'));page.keyboard.press('Escape');page.keyboard.press('Escape')
        assert not errors,errors
        browser.close();print('PASS GPU oblique fly-along, saved angle, six-panel Mac/clean output and fullscreen menu. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
