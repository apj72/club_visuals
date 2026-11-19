"""Verify effect/logo layering, independent reflection playback and new animation.

Generated videos and temporary metadata only; no physical camera is accessed.
"""
import base64
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1=launch.v1;root=Path(tempfile.mkdtemp(prefix='club-vfx-layers-'))
for name in ('media','thumbs','playlists','presets','previews','clips'):(root/name).mkdir()
ffmpeg=v1.find_working_ffmpeg()
for name,source in [('background','color=c=blue:size=640x360:rate=30:duration=12'),('reflection','color=c=red:size=640x360:rate=30:duration=12'),('pattern','testsrc2=size=640x360:rate=30:duration=12')]:
    subprocess.run([ffmpeg,'-v','error','-y','-f','lavfi','-i',source,'-c:v','libx264','-pix_fmt','yuv420p',str(root/'media'/(name+'.mp4'))],check=True)
config=root/'config.json';config.write_text(json.dumps({'download_dir':str(root/'media'),'instagram_clip_dir':str(root/'clips')}))
v1.CONFIG_FILE=config;v1.THUMB_DIR=root/'thumbs';v1.PLAYLIST_DIR=root/'playlists';v1.VIDEO_PRESET_DIR=root/'presets';v1.LIBRARY_ORDER_FILE=root/'order.json';v1.LIBRARY_CATALOG=v1.LibraryCatalog(root/'catalog.json')
v1.VIDEO_CUES=v1.VideoCues(root/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(root/'previews',v1.find_working_ffmpeg);launch.SHOW_LIBRARY=launch.ShowLibrary(root/'models.json')
class Output:
    def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler);threading.Thread(target=httpd.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE',root,flush=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(viewport={'width':1440,'height':1050});errors=[]
        def error(e):errors.append(str(e));print('PAGE ERROR',e,flush=True)
        context.on('page',lambda page:page.on('pageerror',error))
        page=context.new_page();page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate("showVideo('background.mp4',{type:'cut'})");page.wait_for_function('video.readyState>=2&&currentFilename==="background.mp4"')
        page.evaluate('setLoopMode(1)')
        page.locator('summary').filter(has_text='Colour, VFX').click()
        with page.expect_popup() as opened:page.locator('#logo3dBtn').click()
        popup=opened.value;popup.wait_for_load_state('domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
        page.wait_for_function('vfxEngine?.logoSurfaceReady')
        page.evaluate("setVfxLogo3d({motion:0,rotX:0,rotY:0,rotZ:0,quality:'balanced',scale:.55})")
        # Camera and tunnel select a background effect without replacing the object.
        for scene in ('4','7'):
            popup.locator('#scene').select_option(scene)
            assert page.evaluate('vfxState.enabled&&vfxState.logoEnabled&&vfxState.baseEnabled')
            assert popup.locator('#logo3dControls').is_visible()
            popup.locator('#videoLayerBtn').click();assert page.evaluate('vfxState.enabled&&vfxState.logoEnabled&&!vfxState.baseEnabled')
            popup.locator('#videoLayerBtn').click();assert page.evaluate('vfxState.enabled&&vfxState.logoEnabled&&vfxState.baseEnabled')
        popup.locator('#scene').select_option('4');popup.locator('#videoLayerBtn').click();popup.locator('#logoLayerBtn').click()
        assert not page.evaluate('vfxState.enabled') and not popup.is_closed()
        popup.locator('#videoLayerBtn').click();assert page.evaluate('vfxState.enabled&&vfxState.scene===4&&!vfxState.logoEnabled')
        popup.locator('#logoLayerBtn').click();assert page.evaluate('vfxState.logoEnabled')
        # Small deterministic GPU frame proves both composited layers are visible.
        gpu=page.evaluate('''() => {
          window.testCanvas=document.createElement('canvas');testCanvas.width=480;testCanvas.height=270;
          window.testEngine=new VfxEngine(testCanvas);
          window.blue=document.createElement('canvas');blue.width=480;blue.height=270;blue.getContext('2d').fillStyle='blue';blue.getContext('2d').fillRect(0,0,480,270);
          window.red=document.createElement('canvas');red.width=480;red.height=270;red.getContext('2d').fillStyle='red';red.getContext('2d').fillRect(0,0,480,270);
          window.mask=document.createElement('canvas');mask.width=160;mask.height=90;mask.getContext('2d').fillStyle='white';mask.getContext('2d').fillRect(0,0,80,90);
          testEngine.setLogo3d({...vfxState.logo3d,backdrop:'black'});testEngine.setMotionMask({image:mask,version:1});
          return true;
        }''')
        page.wait_for_function('testEngine.logoSurfaceReady')
        assert page.evaluate('''() => {const c=testEngine.logoSource;return new Set(VfxEngine.letterPhases(c.width,c.height,c.getContext('2d').getImageData(0,0,c.width,c.height).data)).size;}''')==8
        def render(scene=7,logo=True):return page.evaluate('''([scene,logo])=>{
          testEngine.render(blue,{enabled:true,scene,baseEnabled:true,logoEnabled:logo,intensity:1,feedback:0,motion:{mode:'video',strength:1}});
          const gl=testEngine.gl,p=new Uint8Array(480*270*4);gl.readPixels(0,0,480,270,gl.RGBA,gl.UNSIGNED_BYTE,p);
          let right=0,left=0,red=0;for(let y=0;y<270;y++)for(let x=0;x<480;x++){const i=(y*480+x)*4;
            if(p[i]+p[i+1]+p[i+2]>40){if(x>=240)right++;else left++;}if(p[i]>p[i+2]+30)red++;}
          return {right,left,red,error:gl.getError(),image:testCanvas.toDataURL().split(',')[1]};}''',[scene,logo])
        camera_base=render(7,False);camera_logo=render(7,True)
        assert camera_base['right']<1000 and camera_logo['right']>camera_base['right']+100,camera_logo
        assert camera_logo['left']>480*270*.4 and camera_logo['error']==0, {k:v for k,v in camera_logo.items() if k!='image'}
        (root/'camera-and-logo.png').write_bytes(base64.b64decode(camera_logo['image']))
        page.evaluate('''() => {const c=blue.getContext('2d');for(let x=0;x<480;x+=20){c.fillStyle=`hsl(${x},100%,50%)`;c.fillRect(x,0,20,270);}}''')
        plain=render(-1,False);tunnel_base=render(4,False);tunnel_logo=render(4,True);assert tunnel_logo['error']==0
        assert plain['image']!=tunnel_base['image']
        assert tunnel_base['image']!=tunnel_logo['image']
        (root/'tunnel-and-logo.png').write_bytes(base64.b64decode(tunnel_logo['image']))
        page.evaluate("blue.getContext('2d').fillStyle='blue';blue.getContext('2d').fillRect(0,0,480,270)")
        print('PASS independent layer controls, camera + logo and tunnel + logo GPU pixels',flush=True)
        # Red video lights the object while blue remains the background.
        popup.locator('#logoLayerBtn').click();assert page.evaluate('vfxState.enabled&&!vfxState.logoEnabled&&vfxState.baseEnabled')
        popup.locator('#logoLayerBtn').click();popup.locator('#scene').select_option('-1')
        popup.locator('#reflectionSourceControls summary').click();popup.locator('#reflectionVideo').select_option('reflection.mp4')
        page.wait_for_function('reflectionVideo.frame()!==null')
        assert page.evaluate('currentFilename')=='background.mp4'
        page.evaluate('testEngine.setReflectionSource(red,true)');reflected=render(-1,True)
        assert reflected['red']>500 and reflected['left']>480*270*.4,reflected
        (root/'independent-reflection.png').write_bytes(base64.b64decode(reflected['image']))
        popup.locator('#reflectionPlay').click();time=page.evaluate('reflectionVideo.video.currentTime')
        page.wait_for_timeout(250);assert abs(page.evaluate('reflectionVideo.video.currentTime')-time)<.03
        assert page.evaluate('!video.paused')
        popup.locator('#reflectionPlay').click();page.wait_for_function('(t)=>Math.abs(reflectionVideo.video.currentTime-t)>.1',arg=time)
        source_url=page.evaluate('reflectionVideo.video.src')
        page.evaluate("showVideo('pattern.mp4',{type:'cut'})");page.wait_for_function('video.readyState>=2&&currentFilename==="pattern.mp4"')
        assert page.evaluate('reflectionVideo.video.src')==source_url
        assert page.evaluate('vfxState.logo3d.reflectionSource.filename')=='reflection.mp4'
        page.evaluate("showVideo('background.mp4',{type:'cut'})");page.wait_for_function('video.readyState>=2&&currentFilename==="background.mp4"')
        print('PASS different background/reflection videos and independent reflection transport',flush=True)
        # Per-letter depth and fly camera are driven by the same pausable clock.
        editor=popup.locator('.logo-motion-editor')
        editor.locator('summary').filter(has_text='Pulsing snake').click();editor.locator('[data-dynamics="snake.enabled"]').check()
        assert page.evaluate('vfxState.logo3d.snake.enabled')
        movement=page.evaluate('''() => {
          const gl=testEngine.gl;const image=()=>{testEngine.render(blue,{scene:6,intensity:1,feedback:0});return testCanvas.toDataURL();};
          testEngine.setLogo3d({...vfxState.logo3d,backdrop:'black',animationClock:{time:0,startedAt:Date.now(),playing:false}});const first=image();
          testEngine.setLogo3d({animationClock:{time:1,startedAt:Date.now(),playing:false}});const second=image();
          return {changed:first!==second,amplitude:testEngine.lastLogoDynamics.amplitude,error:gl.getError()};
        }''')
        assert movement['changed'] and movement['amplitude']>.1 and movement['error']==0,movement
        popup.locator('#logoMotionPlay').click();page.wait_for_function('VfxEngine.animationSeconds(vfxState.logo3d)>.25');popup.locator('#logoMotionPlay').click()
        phase=page.evaluate('renderVfxFrame();vfxEngine.lastLogoDynamics.phase');page.wait_for_timeout(180)
        assert page.evaluate('renderVfxFrame();vfxEngine.lastLogoDynamics.phase')==phase
        editor.locator('summary').filter(has_text='Fly along').click();editor.locator('[data-dynamics="fly.enabled"]').check()
        fly=page.evaluate('''() => {
          testEngine.setLogo3d({snake:{enabled:false},fly:{enabled:true,speed:.5,distance:.3},animationClock:{time:1,startedAt:Date.now(),playing:false}});
          testEngine.render(blue,{scene:6,intensity:1,feedback:0});const gl=testEngine.gl,p=new Uint8Array(480*270*4);gl.readPixels(0,0,480,270,gl.RGBA,gl.UNSIGNED_BYTE,p);
          let ink=0,edge=0;for(let y=0;y<270;y++)for(let x=0;x<480;x++){const i=(y*480+x)*4;if(p[i]+p[i+1]+p[i+2]>40){ink++;if(y<2||y>267||x<2||x>477)edge++;}}
          return {ink,edge,image:testCanvas.toDataURL().split(',')[1],error:gl.getError()};
        }''')
        assert fly['ink']>480*270*.3 and fly['edge']>100 and fly['error']==0, {k:v for k,v in fly.items() if k!='image'}
        (root/'fly-along-closeup.png').write_bytes(base64.b64decode(fly['image']))
        print('PASS snake depth wave, pause and full-frame fly-along closeups',flush=True)
        # Saved cues retain the two layers, independent video and both animations.
        popup.locator('#scene').select_option('4')
        cue=page.evaluate('currentPlayerCue()')
        assert cue['effect']=='scene-4' and cue['logoLayer']['snake']['enabled'] and cue['logoLayer']['fly']['enabled']
        assert cue['logoLayer']['reflectionSource']['filename']=='reflection.mp4'
        page.locator('.rd-nav [data-screen=playlist]').click();page.locator('#timelineAddCurrent').click()
        page.wait_for_function('plPlaylist.entries.length===1')
        page.locator('#plName').fill('Layered Version1');page.evaluate('savePlaylist()')
        stored=json.loads(next((root/'playlists').glob('*.json')).read_text())['entries'][0]['cues'][0]
        assert stored['logoLayer']['snake']['enabled'] and stored['logoLayer']['fly']['enabled']
        assert stored['logoLayer']['reflectionSource']['filename']=='reflection.mp4'
        page.evaluate('setTimelinePlayhead(1)');page.evaluate('setTimelinePlayhead(2)')
        assert abs(page.evaluate('vfxState.logo3d.animationClock.time')-2)<.02
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        page.locator('.rd-nav [data-screen=prepare]').click()
        page.evaluate('(cue)=>applyPlaylistCue(cue,1,false)',cue)
        assert page.evaluate('vfxState.scene===4&&vfxState.baseEnabled&&vfxState.logoEnabled')
        host=context.new_page();host.goto(origin+'/?host=1',wait_until='domcontentloaded');host.wait_for_function('hostClaimed')
        output=context.new_page();output.goto(origin+'/output?monitor=1',wait_until='domcontentloaded')
        page.evaluate('sendMacCommand("take",{scene:previewScene()})')
        host.wait_for_function('vfxState.logoEnabled&&vfxState.baseEnabled&&vfxState.scene===4&&reflectionVideo.frame()!==null')
        output.wait_for_function('vfxState.logoEnabled&&vfxState.baseEnabled&&vfxState.scene===4&&reflectionVideo.frame()!==null')
        assert host.evaluate('vfxState.logo3d.snake.enabled&&vfxState.logo3d.fly.enabled')
        # Actual MP4 capture includes the background, independent red reflections
        # and moving snake geometry; a portrait logo export keeps the fly camera.
        page.bring_to_front()
        page.locator('.rd-nav [data-screen=capture]').click()
        page.evaluate("setVfxLogo3d({fly:{enabled:false},snake:{enabled:true,speed:.5,depth:.7,pulse:.6},animationClock:{time:0,startedAt:Date.now(),playing:true}})")
        page.locator('#captureFormat').evaluate('(s)=>{s.value="9x16";s.dispatchEvent(new Event("change",{bubbles:true}));}')
        page.locator('#captureDuration').fill('.8');page.locator('#captureAction').click()
        page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")&&!instagramCaptureBusy',timeout=60000)
        filename=page.locator('#captureDownload').get_attribute('download');path=root/'clips'/filename
        def decode(path,time):
            return subprocess.check_output([ffmpeg,'-v','error','-ss',str(time),'-i',str(path),'-vf','scale=108:192','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        first=decode(path,.2);second=decode(path,.6)
        red_count=sum(first[i]>70 and first[i]>first[i+2]+30 for i in range(0,len(first),3))
        blue_count=sum(first[i+2]>70 and first[i+2]>first[i]+30 for i in range(0,len(first),3))
        assert red_count>50 and blue_count>100,(red_count,blue_count)
        assert sum(abs(a-b)>12 for a,b in zip(first,second))>100
        subprocess.run([ffmpeg,'-v','error','-y','-ss','0.2','-i',str(path),'-frames:v','1',str(root/'combined-recording.png')],check=True)
        page.evaluate("setVfxLogo3d({snake:{enabled:false},fly:{enabled:true,speed:.05,distance:.3},animationClock:{time:10,startedAt:Date.now(),playing:false}})")
        popup.locator('#logoPortraitRender').click()
        page.wait_for_function('logoRenderEngine?.logoSurfaceReady')
        page.locator('#captureRestartLogo').uncheck();page.locator('#captureDuration').fill('.6');page.locator('#captureAction').click()
        page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")&&!instagramCaptureBusy',timeout=60000)
        filename=page.locator('#captureDownload').get_attribute('download');path=root/'media'/filename
        data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(path)]))['streams'][0]
        assert (data['width'],data['height'])==(1080,1920)
        closeup=decode(path,.1)
        assert sum(closeup[i]+closeup[i+1]+closeup[i+2]>50 for i in range(0,len(closeup),3))>108*192*.3
        subprocess.run([ffmpeg,'-v','error','-y','-ss','0.1','-i',str(path),'-frames:v','1',str(root/'fly-recording.png')],check=True)
        page.evaluate("chooseReflectionVideo('missing.mp4')")
        page.wait_for_function('getReflectionVideoStatus().message.includes("unavailable")')
        page.locator('#captureAction').click();page.wait_for_function('document.getElementById("captureStatus").textContent.includes("selected reflection video")')
        assert not page.evaluate('instagramRecorder')
        assert not errors,errors
        browser.close();print('PASS saved composition, Mac take, clean output and real combined/portrait MP4 exports. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
