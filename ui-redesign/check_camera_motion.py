"""Exercise camera permission, motion rendering, recording and Mac/output masks.

Uses simulated browser cameras and temporary generated media, never real cameras.
"""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1=launch.v1
root=Path(tempfile.mkdtemp(prefix='club-camera-motion-'))
for folder in ('media','thumbs','playlists','presets','previews','clips'): (root/folder).mkdir()
subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-f','lavfi','-i','color=c=blue:size=640x360:rate=30:duration=8','-c:v','libx264','-pix_fmt','yuv420p',str(root/'media'/'fixture.mp4')],check=True)
config=root/'config.json';config.write_text(json.dumps({'download_dir':str(root/'media'),'instagram_clip_dir':str(root/'clips')}))
v1.CONFIG_FILE=config;v1.THUMB_DIR=root/'thumbs';v1.PLAYLIST_DIR=root/'playlists';v1.VIDEO_PRESET_DIR=root/'presets';v1.LIBRARY_ORDER_FILE=root/'order.json'
v1.LIBRARY_CATALOG=v1.LibraryCatalog(root/'catalog.json');v1.VIDEO_CUES=v1.VideoCues(root/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(root/'previews',v1.find_working_ffmpeg)
launch.SHOW_LIBRARY=launch.ShowLibrary(root/'models.json')
class Output:
    def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE',root,flush=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--use-fake-device-for-media-stream'])
        context=browser.new_context(viewport={'width':1440,'height':1050},permissions=['camera'])
        errors=[];writes=[]
        def page_error(error):
            errors.append(str(error)); print('PAGE ERROR', error, flush=True)
        context.on('page',lambda page:page.on('pageerror',page_error))
        context.on('request',lambda r:writes.append(r.post_data_json) if r.method=='POST' and r.url==origin+'/api/state' else None)
        page=context.new_page();page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.locator('summary').filter(has_text='Colour, VFX').click()
        with page.expect_popup() as opened:page.locator('#cameraMotionBtn').click()
        popup=opened.value;popup.wait_for_load_state('domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
        # Explicit permission denial leaves the video usable and the camera stopped.
        page.evaluate('''() => {window.nativeCamera=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
          navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException('denied','NotAllowedError'));}''')
        popup.locator('#cameraConnect').click()
        popup.wait_for_function('document.getElementById("cameraStatus").textContent.includes("permission denied")')
        assert not page.evaluate('getCameraMotionStatus().connected')
        page.evaluate('() => {navigator.mediaDevices.getUserMedia=window.nativeCamera;}')
        popup.locator('#cameraConnect').click();page.wait_for_function('getCameraMotionStatus().connected&&vfxState.enabled&&vfxState.scene===7')
        page.wait_for_function('cameraMotion.version>5')
        assert page.evaluate('cameraMotion.stream.getAudioTracks().length')==0
        page.evaluate('window.oldCameraTracks=cameraMotion.stream.getTracks()')
        popup.locator('#cameraConnect').click();page.wait_for_function('oldCameraTracks.every(t=>t.readyState==="ended")')
        assert not page.evaluate('vfxState.enabled')
        print('PASS camera permission denial, real media API connection and track release',flush=True)
        # A deterministic canvas camera allows exact still/movement/mirror tests.
        page.evaluate('''() => {
          const c=document.createElement('canvas');c.width=160;c.height=90;window.simX=20;window.simMoving=false;
          const ctx=c.getContext('2d');window.simDraw=()=>{ctx.fillStyle='black';ctx.fillRect(0,0,160,90);ctx.fillStyle='white';
            ctx.fillRect(simMoving?55+Math.sin(performance.now()/140)*35:simX,28,16,30);};
          simDraw();window.simTimer=setInterval(simDraw,30);
          navigator.mediaDevices.getUserMedia=async()=>c.captureStream(20);
        }''')
        popup.locator('#cameraConnect').click();page.wait_for_function('getCameraMotionStatus().connected')
        page.evaluate('setCameraMotion({mirror:false,delay:.1,trails:0,compensate:false})')
        page.wait_for_function('cameraMotion.processor.history.length>=3')
        assert page.evaluate('cameraMotion.processor.energy')==0
        def pixels(target=page):return target.evaluate('''() => {
          renderVfxFrame();const gl=vfxEngine.gl,w=vfxCanvas.width,h=vfxCanvas.height,p=new Uint8Array(w*h*4);
          gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);let lit=0,red=0,blue=0;
          for(let i=0;i<p.length;i+=4){if(p[i]+p[i+1]+p[i+2]>40)lit++;red=Math.max(red,p[i]);blue=Math.max(blue,p[i+2]);}
          return {lit,red,blue,total:w*h,error:gl.getError()};}''')
        assert pixels()['lit']==0
        page.evaluate('window.simMoving=true');page.wait_for_function('cameraMotion.processor.energy>.02')
        image=pixels();assert image['lit']>100 and image['lit']<image['total']*.5 and image['red']<10 and image['blue']>100 and image['error']==0,image
        assert popup.locator('#feedback').is_disabled() and popup.locator('#vfxPulseBtn').is_disabled()
        popup.locator('#enableBtn').click();assert not page.evaluate('vfxState.enabled')
        assert page.evaluate('getCameraMotionStatus().connected')
        popup.locator('#enableBtn').click();assert page.evaluate('vfxState.enabled&&vfxState.scene===7')
        assert all(message['type']=='cameraMotionFrame' for message in writes),writes
        page.screenshot(path=str(root/'movement-filled-video.png'));popup.screenshot(path=str(root/'camera-controls.png'),full_page=True)
        assert popup.evaluate('document.documentElement.scrollWidth<=innerWidth')
        mask_lit=image['lit']
        popup.locator('#cameraMode').select_option('glow');image=pixels();assert image['lit']>max(mask_lit*2,image['total']*.5),image
        popup.locator('#cameraMode').select_option('distort');assert pixels()['error']==0
        distortion=page.evaluate('''() => {
          const source=document.createElement('canvas');source.width=320;source.height=180;
          const ctx=source.getContext('2d');for(let x=0;x<320;x++){ctx.fillStyle=x%16<8?'white':'black';ctx.fillRect(x,0,1,180);}
          const gl=vfxEngine.gl;
          const read=()=>{const p=new Uint8Array(320*180*4);gl.readPixels(0,0,320,180,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;};
          vfxEngine.setMotionMask({image:null,version:-1});vfxEngine.render(source,vfxState);const baseline=read();
          vfxEngine.setMotionMask(cameraMotion.frame());vfxEngine.render(source,vfxState);const moved=read();
          let changed=0;for(let i=0;i<moved.length;i+=4)if(Math.abs(moved[i]-baseline[i])>20)changed++;
          renderVfxFrame();return changed;
        }''')
        assert distortion>100,distortion
        popup.locator('#cameraMode').select_option('video')
        print('PASS static suppression, video-filled motion, glow and distortion rendering',flush=True)
        page.evaluate('activateLogo3d()');page.wait_for_function('vfxEngine.logoSurfaceReady')
        assert page.evaluate('vfxState.scene===7&&vfxState.baseEnabled&&vfxState.logoEnabled&&getCameraMotionStatus().connected')
        assert pixels()['lit']>100
        page.evaluate('setLogoLayerEnabled(false)')
        assert page.evaluate('vfxState.enabled&&vfxState.scene===7&&!vfxState.logoEnabled&&vfxState.baseEnabled')
        # Freeze movement, then step on the left: mirroring must move its mask right.
        page.evaluate('window.simMoving=false;window.simX=20;resetCameraMotion()')
        page.wait_for_function('cameraMotion.processor.history.length>=3')
        page.evaluate('window.simX=30');page.wait_for_function('cameraMotion.processor.energy>.02')
        centre='''() => {const p=cameraMotion.processor.mask;let x=0,s=0;for(let i=0;i<160*90;i++){x+=(i%160)*p[i*4];s+=p[i*4];}return x/s/160;}'''
        assert page.evaluate(centre)<.4
        page.evaluate('setCameraMotion({mirror:true})');page.wait_for_function('cameraMotion.processor.history.length>=3')
        page.evaluate('window.simX=40');page.wait_for_function('cameraMotion.processor.energy>.02')
        assert page.evaluate(centre)>.6
        page.evaluate('window.simMoving=true;setCameraMotion({trails:.5})')
        # Cue snapshots preserve settings but do not store camera IDs or frames.
        cue=page.evaluate('currentPlayerCue()');assert cue['effect']=='camera' and cue['cameraMotion']['mirror'] is True
        assert 'sourceId' not in cue['cameraMotion']
        page.evaluate('(cue)=>applyPlaylistCue(cue)',cue)
        assert page.evaluate('vfxState.scene===7&&vfxState.motion.sourceId===cameraMotion.id')
        # Mac take copies only the source ID; subsequent small masks arrive via SSE.
        host=context.new_page();host.goto(origin+'/?host=1',wait_until='domcontentloaded');host.wait_for_function('hostClaimed')
        output=context.new_page();output.goto(origin+'/output?monitor=1',wait_until='domcontentloaded')
        page.evaluate('sendMacCommand("take",{scene:previewScene()})')
        host.wait_for_function('vfxState.enabled&&vfxState.scene===7&&cameraMotion.frame().image')
        output.wait_for_function('vfxState.enabled&&vfxState.scene===7&&cameraMotion.frame().image&&video.readyState>=2')
        assert host.evaluate('cameraMotion.stream===null')
        assert pixels(host)['lit']>100
        snapshot=page.request.get(origin+'/api/state-snapshot').json()
        assert not any(item['type']=='cameraMotionFrame' for item in snapshot)
        # A different private editor cannot replace the selected camera source.
        selected=host.evaluate('vfxState.motion.sourceId')
        page.request.post(origin+'/api/state',data={'type':'cameraMotionFrame','sourceId':'unrelated-camera','seq':99999,'image':None})
        assert host.evaluate('vfxState.motion.sourceId')==selected
        print('PASS mirroring, saved settings, private preview, Mac take and clean-output motion',flush=True)
        # Existing capture records the motion result as an ordinary social MP4.
        page.bring_to_front()
        page.wait_for_function('cameraMotion.processor.energy>.02')
        page.locator('.rd-nav [data-screen=capture]').click();page.locator('#captureDuration').fill('.8')
        page.locator('#captureAction').click();page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")',timeout=60000)
        name=page.locator('#captureDownload').get_attribute('download');assert (root/'clips'/name).is_file()
        frame=subprocess.check_output([v1.find_working_ffmpeg(),'-v','error','-ss','0.3','-i',str(root/'clips'/name),'-vf','scale=108:135','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        blue=sum(frame[i+2]>50 and frame[i]<20 for i in range(0,len(frame),3));assert 10<blue<108*135*.8,blue
        page.locator('.rd-nav [data-screen=prepare]').click()
        page.evaluate('disconnectCameraMotion()');host.wait_for_function('!cameraMotion.frame().image')
        assert not page.evaluate('getCameraMotionStatus().connected')
        assert pixels(host)['lit']==0
        # Stop/reset cannot leave a frozen remote silhouette.
        assert not errors,errors
        browser.close();print('PASS motion capture MP4, disconnect clearing and no page errors. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
