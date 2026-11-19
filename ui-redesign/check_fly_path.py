"""Audition saved looks using isolated media, clocks and GPU contexts."""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-fly-path-'))
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
        page=context.new_page();page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate('''()=>{
          window.pathCanvas=document.createElement('canvas');window.pathEngine=new VfxEngine(pathCanvas);
          window.light=document.createElement('canvas');light.width=640;light.height=360;const c=light.getContext('2d');
          const g=c.createLinearGradient(0,0,640,360);g.addColorStop(0,'white');g.addColorStop(.5,'#fc8');g.addColorStop(1,'#a8f');c.fillStyle=g;c.fillRect(0,0,640,360);
          window.pathFrame=(time,mode='once',angle=45,orientation='horizontal',width=640,height=360,reverse=false)=>{
            pathEngine.setLogo3d({kind:'logo',orientation,backdrop:'black',motion:0,rotX:0,rotY:0,rotZ:0,quality:'high',snake:{enabled:false},fly:{enabled:true,speed:1,distance:.7,angle,mode,reverse},animationClock:{time,startedAt:Date.now(),playing:false}});
            pathEngine.render(light,{scene:6,intensity:1,feedback:0},{width,height});
            const gl=pathEngine.gl,p=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,p);
            let ink=0,hash=0,left=width,right=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;if(p[i]+p[i+1]+p[i+2]>40){ink++;left=Math.min(left,x);right=Math.max(right,x);}hash=(hash+p[i]*(i+1)+p[i+2]*(i+3))%1000000007;}
            return {time,mode,angle,orientation,width,height,reverse,ink,hash,left,right,error:gl.getError(),pose:pathEngine.lastLogoDynamics,image:pathCanvas.toDataURL().split(',')[1]};
          };
        }''')
        page.wait_for_function('pathEngine.logoSurfaceReady')
        samples=page.evaluate('[0,.1,.22,.5,.82,.9,.98,1,3].map(t=>pathFrame(t))')
        print('GPU PATH',[(s['time'],s['ink'],s['left'],s['right']) for s in samples],flush=True)
        assert 0<samples[0]['ink']<150, samples[0]['ink']
        assert samples[3]['ink']>12000
        assert samples[-2]['ink']==samples[-1]['ink']==0
        assert samples[5]['right']<samples[4]['right']
        for frame in samples:
            assert frame['error']==0
            if frame['time'] in [0,.5,.9,1]:(root/f'flight-{frame["time"]}.png').write_bytes(base64.b64decode(frame['image']))
        variants=page.evaluate('''()=>{
          const samples=[];
          for(const angle of [0,45,75])for(const orientation of ['horizontal','top-bottom','bottom-top'])for(const size of [[640,360],[360,640],[960,240]])for(const reverse of [false,true])samples.push(pathFrame(1,'once',angle,orientation,...size,reverse));
          return samples.map(({image,...s})=>s);
        }''')
        assert all(s['ink']==0 and s['error']==0 for s in variants),[s for s in variants if s['ink'] or s['error']]
        modes=page.evaluate('({repeatA:pathFrame(.45,"repeat").hash,repeatB:pathFrame(1.45,"repeat").hash,bounceA:pathFrame(.35,"bounce").hash,bounceB:pathFrame(1.65,"bounce").hash})')
        assert modes['repeatA']==modes['repeatB'] and modes['bounceA']==modes['bounceB'],modes
        print('PASS tiny distant point, close-up, full departure, all frame shapes/orientations/angles and mode timing',flush=True)
        # Actual saved cue controls retain string modes and compatible loop flags.
        def reveal(control):control.evaluate("e=>{for(let d=e.parentElement;d;d=d.parentElement)if(d.tagName==='DETAILS')d.open=true;}")
        def choose(control,label):
            if page.evaluate('document.documentElement.classList.contains("redesign")'):
                control.locator('..').locator('.rd-select-trigger').click();page.locator('.rd-select-menu:visible').get_by_role('option',name=label,exact=True).click()
            else:control.select_option(label=label)
        for url,slug in [('/redesign#playlist','flight-redesign'),('/','flight-original')]:
            page.goto(origin+url,wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
            page.evaluate('''()=>{switchTab('playlist');plSlug='';plPlaylist={name:'Flight',entries:[{video:'background.mp4',view:'single',preset:1,loopMode:1,speed:1,zoom:1,panX:0,panY:0,duration:{type:'seconds',value:6},transition:{type:'cut'},cues:[normalisePlaylistCue({at:0,effect:'logo',fly:{enabled:true}}),normalisePlaylistCue({at:3,effect:'scene-4',logoLayer:{effect:'logo',fly:{enabled:true}}})]}]};renderPlaylistEntries();openPlaylistCueEditor(0);}''')
            modes=page.locator('#playlistCueList [data-dynamics="fly.mode"]')
            assert modes.count()==2
            for mode,label in [(modes.nth(0),'One way · repeat'),(modes.nth(1),'One way · once')]:reveal(mode);choose(mode,label)
            page.evaluate('(slug)=>{closePlaylistCueEditor();document.getElementById("plName").value=slug;return savePlaylist();}',slug)
            entry=json.loads((root/'playlists'/(slug+'.json')).read_text())['entries'][0]
            assert entry['cues'][0]['fly']['mode']=='repeat' and entry['cues'][0]['fly']['loop'] is True
            assert entry['cues'][1]['logoLayer']['fly']['mode']=='once' and entry['cues'][1]['logoLayer']['fly']['loop'] is False
        page.goto(origin+'/redesign#builder',wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for();page.locator('[data-builder-tab=bricks]').click()
        mode=page.locator('.sb-brick-editor [data-dynamics="fly.mode"]').first;reveal(mode);choose(mode,'One way · repeat')
        page.locator('#sbSave').click();page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')
        assert json.loads((root/'models.json').read_text())['library']['bricks'][0]['steps'][0]['effects'][0]['fly']['mode']=='repeat'
        # Live controller uses the same modes; pause and restart retain separate video transport.
        page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        reveal(page.locator('#logo3dBtn'))
        with page.expect_popup() as opened:page.locator('#logo3dBtn').click()
        popup=opened.value;popup.wait_for_load_state('domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
        mode=popup.locator('[data-dynamics="fly.mode"]');reveal(mode);mode.select_option('once')
        page.wait_for_function('vfxState.logo3d.fly.mode==="once"&&!vfxState.logo3d.fly.loop')
        page.evaluate("setVfxLogo3d({backdrop:'black',motion:0,fly:{enabled:true,speed:1,distance:.7,angle:45,mode:'once'},animationClock:{time:.5,startedAt:Date.now(),playing:false}});setVfxState({enabled:true,scene:6,logoEnabled:true,baseEnabled:false});renderVfxFrame()")
        held=page.evaluate('vfxEngine.lastLogoDynamics.cameraX');page.wait_for_timeout(150)
        assert page.evaluate('renderVfxFrame();vfxEngine.lastLogoDynamics.cameraX')==held
        print('PASS live popup, paused clock, primary/overlay cue persistence and Show Builder mode saving',flush=True)
        # Record the last part of a once-only flight, then decode the empty final frame.
        page.locator('.rd-nav [data-screen=capture]').click()
        page.evaluate("setVfxLogo3d({animationClock:{time:.7,startedAt:Date.now(),playing:false}})")
        page.locator('#captureFormat').evaluate('(s)=>{s.value="logo_16x9";s.dispatchEvent(new Event("change",{bubbles:true}));}')
        page.wait_for_function('logoRenderEngine?.logoSurfaceReady')
        page.locator('#captureRestartLogo').uncheck();page.locator('#captureDuration').fill('.6');page.locator('#captureAction').click()
        page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")&&!instagramCaptureBusy',timeout=60000)
        filename=page.locator('#captureDownload').get_attribute('download');path=root/'media'/filename
        def decode(time):return subprocess.check_output([v1.find_working_ffmpeg(),'-v','error','-ss',str(time),'-i',str(path),'-vf','scale=320:180','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        near,off=decode(.05),decode(.5)
        assert sum(sum(near[i:i+3])>45 for i in range(0,len(near),3))>1000
        assert sum(sum(off[i:i+3])>45 for i in range(0,len(off),3))==0
        assert not errors,errors
        browser.close();print('PASS decoded MP4 completes flight and stays off-screen. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
